// src/lib/gamebook/battleState.ts
//
// v4.0 Phase 2.B — État + transitions d'une battle (pures, sans I/O).
//
// Stocké sérialisé en Json dans GamebookProgress.activeBattle, sur le serveur.
// Une seule battle active par user à tout instant.
//
// Les transitions sont des fonctions pures (state, action, rng) → newState.
// Les routes API se contentent de :
//   1. lire activeBattle + Daemon du leader
//   2. appliquer la transition pure
//   3. persister Daemon.currentHp / energySpent / happiness + activeBattle

import type { DaemonType, Morphology } from "./daemon"
import { getAttack, STRUGGLE } from "./attacks"
import {
    computeDamage,
    rollCrit,
    rollHit,
    effectiveEnergyCost,
    typeEffectivenessLabel,
    fleeChance,
    FLEE_HAPPINESS_COST,
    type CombatActor,
} from "./combat"

// ============================================================
// Types
// ============================================================

/** Vue minimaliste d'un acteur côté battle (snapshot au démarrage). */
export interface BattleActor {
    /** Référence DB si c'est un Daemon du joueur ; absent pour les ennemis sauvages. */
    daemonId?: string
    name: string
    type: DaemonType
    morphology: Morphology
    speciesLevel: number
    combatLevel: number
    maxHp: number
    currentHp: number
    // Stats effectives (après bonheur, bonus, items) — snapshot.
    force: number
    vitesse: number
    defense: number
    intelligence: number
    endurance: number
    happiness: number
    critRate: number
    attacksEquipped: string[]
}

export interface BattleEnemy extends BattleActor {
    /** Pour distinguer ennemi sauvage vs PNJ vs rival. Affecte fleeAllowed + récompenses. */
    kind: "wild" | "pnj" | "rival" | "boss"
    /** Si défini, l'ennemi est un PNJ avec une clé identifiante (pour la story). */
    pnjKey?: string
    /** Émoji affiché côté UI (XP_ANIMALS-like). */
    emoji?: string
}

export type BattleLogKind =
    | "info" | "attack" | "damage" | "crit" | "miss"
    | "faint" | "flee_success" | "flee_fail" | "switch"
    | "victory" | "defeat" | "type_label"

export interface BattleLogEntry {
    kind: BattleLogKind
    text: string
}

export interface BattleState {
    /** UUID/cuid local pour le tracking côté client. */
    battleId: string
    startedAt: string
    turn: number
    /** ID du Daemon actif côté joueur (peut switch). */
    playerDaemonId: string
    player: BattleActor
    enemy: BattleEnemy
    log: BattleLogEntry[]
    /** Phase : "playerTurn" = en attente d'une action côté joueur ; "ended" = terminé. */
    phase: "playerTurn" | "ended"
    /** Si phase="ended", indique le résultat. */
    result?: "victory" | "defeat" | "fled"
    /** Récompenses prévues si victoire (snapshotées au démarrage). */
    rewardXp: number
    rewardEnergy: number  // peut être négatif (coût) ou positif (gain reps)
    /** Autorisations contextuelles. */
    fleeAllowed: boolean
}

export type PlayerAction =
    | { kind: "attack"; attackKey: string }
    | { kind: "switch"; daemonId: string }
    | { kind: "flee" }

export interface ApplyActionResult {
    state: BattleState
    /** Effets à persister côté DB (par les routes). */
    playerHpDelta: number
    playerHappinessDelta: number
    energySpentDelta: number  // toujours ≥0
    /** XP gagné à crédit en cas de victoire. */
    xpEarned: number
}

// ============================================================
// Construction d'une battle
// ============================================================

export function buildPlayerActor(d: {
    id: string
    name: string
    type: string
    morphology: string
    speciesLevel: number
    combatLevel: number
    happiness: number
    effectiveStats: { force: number; vitesse: number; defense: number; intelligence: number; endurance: number }
    currentHp: number
    maxHp: number
    critRate: number
    attacksEquipped: string[]
}): BattleActor {
    return {
        daemonId: d.id,
        name: d.name,
        type: d.type as DaemonType,
        morphology: d.morphology as Morphology,
        speciesLevel: d.speciesLevel,
        combatLevel: d.combatLevel,
        maxHp: d.maxHp,
        currentHp: d.currentHp,
        force: d.effectiveStats.force,
        vitesse: d.effectiveStats.vitesse,
        defense: d.effectiveStats.defense,
        intelligence: d.effectiveStats.intelligence,
        endurance: d.effectiveStats.endurance,
        happiness: d.happiness,
        critRate: d.critRate,
        attacksEquipped: d.attacksEquipped,
    }
}

// ============================================================
// Conversion BattleActor → CombatActor (pour les formules combat.ts)
// ============================================================
function toCombatActor(b: BattleActor): CombatActor {
    return {
        name: b.name,
        type: b.type,
        combatLevel: b.combatLevel,
        force: b.force,
        defense: b.defense,
        intelligence: b.intelligence,
    }
}

// ============================================================
// Transitions — action joueur, puis riposte ennemie automatique
// ============================================================

export function applyPlayerAction(
    state: BattleState,
    action: PlayerAction,
    rng: () => number = Math.random,
): ApplyActionResult {
    if (state.phase === "ended") {
        return { state, playerHpDelta: 0, playerHappinessDelta: 0, energySpentDelta: 0, xpEarned: 0 }
    }

    const next: BattleState = {
        ...state,
        log: [...state.log],
        player: { ...state.player },
        enemy: { ...state.enemy },
    }

    let playerHpDelta = 0
    let playerHappinessDelta = 0
    let energySpentDelta = 0
    let xpEarned = 0

    // ============================================================
    // FUITE
    // ============================================================
    if (action.kind === "flee") {
        if (!state.fleeAllowed) {
            next.log.push({ kind: "info", text: "Impossible de fuir ce combat." })
            return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
        }
        const chance = fleeChance(next.player.vitesse, next.enemy.vitesse)
        if (rng() < chance) {
            next.log.push({ kind: "flee_success", text: `${next.player.name} prend ses jambes à son cou !` })
            next.phase = "ended"
            next.result = "fled"
            playerHappinessDelta = -FLEE_HAPPINESS_COST
            return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
        }
        next.log.push({ kind: "flee_fail", text: `${next.player.name} n'arrive pas à fuir.` })
        // L'ennemi attaque sur l'échec de fuite (cf. plus bas)
    }

    // ============================================================
    // SWITCH (Phase 2.B simplifié : pas encore géré, l'API renverra une erreur)
    // ============================================================
    if (action.kind === "switch") {
        next.log.push({ kind: "info", text: "Switch pas encore implémenté." })
        return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
    }

    // ============================================================
    // ATTAQUE
    // ============================================================
    if (action.kind === "attack") {
        const attack = getAttack(action.attackKey)
        if (!attack) {
            next.log.push({ kind: "info", text: "Attaque inconnue." })
            return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
        }
        // Vérifie que l'attaque est bien équipée
        if (!next.player.attacksEquipped.includes(attack.key)) {
            next.log.push({ kind: "info", text: `${attack.name} n'est pas équipée.` })
            return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
        }
        const cost = effectiveEnergyCost(attack, next.player.intelligence)
        energySpentDelta = cost

        // Touche ?
        if (!rollHit(attack.accuracy, rng)) {
            next.log.push({ kind: "attack", text: `${next.player.name} utilise ${attack.name} (−${cost} reps).` })
            next.log.push({ kind: "miss", text: "Mais l'attaque manque sa cible !" })
        } else {
            const isCrit = rollCrit(next.player.critRate, rng)
            const dmg = computeDamage(
                toCombatActor(next.player),
                toCombatActor(next.enemy),
                attack,
                { forceCrit: isCrit, rng },
            )
            next.log.push({ kind: "attack", text: `${next.player.name} utilise ${attack.name} (−${cost} reps).` })
            if (isCrit) next.log.push({ kind: "crit", text: "Coup critique !" })
            const label = typeEffectivenessLabel(dmg.typeMult)
            if (label) next.log.push({ kind: "type_label", text: label })
            next.enemy.currentHp = Math.max(0, next.enemy.currentHp - dmg.damage)
            next.log.push({ kind: "damage", text: `${next.enemy.name} subit ${dmg.damage} dégâts.` })

            // Recoil "Lutte"
            if (attack.special === "recoil25") {
                const recoil = Math.max(1, Math.floor(dmg.damage * 0.25))
                next.player.currentHp = Math.max(0, next.player.currentHp - recoil)
                playerHpDelta -= recoil
                next.log.push({ kind: "damage", text: `${next.player.name} encaisse ${recoil} dégâts en retour.` })
            }
        }

        // Victoire si ennemi à 0 HP
        if (next.enemy.currentHp <= 0) {
            next.log.push({ kind: "faint", text: `${next.enemy.name} est K.O. !` })
            next.log.push({ kind: "victory", text: `Tu remportes le combat. +${next.rewardXp} XP.` })
            next.phase = "ended"
            next.result = "victory"
            xpEarned = next.rewardXp
            return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
        }
    }

    // ============================================================
    // RIPOSTE ENNEMIE (automatique en fin de tour joueur)
    // ============================================================
    enemyAttackTurn(next, rng)
    playerHpDelta += (next.player.currentHp - state.player.currentHp - playerHpDelta) // delta total contre l'init
    if (next.player.currentHp <= 0) {
        next.log.push({ kind: "faint", text: `${next.player.name} est K.O. !` })
        next.log.push({ kind: "defeat", text: "Tu as perdu ce combat." })
        next.phase = "ended"
        next.result = "defeat"
    }

    next.turn += 1
    return { state: next, playerHpDelta, playerHappinessDelta, energySpentDelta, xpEarned }
}

// ============================================================
// Tour ennemi — IA très simple : pick une attaque random parmi ses équipées
// ============================================================
function enemyAttackTurn(state: BattleState, rng: () => number) {
    const equipped = state.enemy.attacksEquipped.length > 0
        ? state.enemy.attacksEquipped
        : ["charge"]
    const pickKey = equipped[Math.floor(rng() * equipped.length)]
    const attack = getAttack(pickKey) ?? STRUGGLE

    if (!rollHit(attack.accuracy, rng)) {
        state.log.push({ kind: "attack", text: `${state.enemy.name} utilise ${attack.name}.` })
        state.log.push({ kind: "miss", text: "Mais l'attaque manque !" })
        return
    }
    const isCrit = rollCrit(state.enemy.critRate, rng)
    const dmg = computeDamage(
        toCombatActor(state.enemy),
        toCombatActor(state.player),
        attack,
        { forceCrit: isCrit, rng },
    )
    state.log.push({ kind: "attack", text: `${state.enemy.name} utilise ${attack.name}.` })
    if (isCrit) state.log.push({ kind: "crit", text: "Coup critique !" })
    const label = typeEffectivenessLabel(dmg.typeMult)
    if (label) state.log.push({ kind: "type_label", text: label })
    state.player.currentHp = Math.max(0, state.player.currentHp - dmg.damage)
    state.log.push({ kind: "damage", text: `${state.player.name} subit ${dmg.damage} dégâts.` })
}
