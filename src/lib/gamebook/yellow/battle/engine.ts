// src/lib/gamebook/yellow/battle/engine.ts
//
// Nexus Jaune Éclair — MOTEUR DE TOUR (machine d'état, React-free, déterministe).
// Résout un tour complet : pré-checks de statut → ordre (priorité puis vitesse) →
// exécution des actions (précision, dégâts, effets) → fin de tour (résiduels) →
// KO / changement forcé / issue. Produit une FILE D'ÉVÉNEMENTS que l'UI rejoue.

import type { BattleMon, MonInstance, MajorStatus, MoveData, StageKey } from "./types"
import { neutralStages } from "./types"
import { Rng } from "./rng"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { fullStats, effectiveStat, clampStage } from "./stats"
import { computeDamage, hasStab, critProbabilityGen1 } from "./damage"
import { typeEffectiveness, effectivenessMessage, moveCategory } from "./typeChart"
import * as Status from "./status"
import { accuracyCheck } from "./accuracy"
import { chooseAiAction, type AiLevel } from "./ai"
import { xpForDefeat, applyExp } from "./xp"
import { tryCapture } from "./capture"
import { ballBonusOf, getItem, isGuaranteedBall } from "../data/items"
import { rarityBonusOf } from "../data/captureConfig"
import { STRUGGLE_MOVE_ID, STRUGGLE_INDEX, moveCostReps } from "../data/combatCostConfig"
import { gainEv, signatureStat, EV_YIELD_PER_WIN } from "../data/evConfig"

// ============================================================
// Types d'état & événements
// ============================================================

export type SideId = "player" | "enemy"

export type BattleEvent =
    | { kind: "message"; text: string }
    | { kind: "hp"; side: SideId; hp: number; max: number }
    | { kind: "faint"; side: SideId; name: string }
    | { kind: "status"; side: SideId; status: MajorStatus }
    | { kind: "switchIn"; side: SideId; name: string; teamIndex: number }
    | { kind: "ball"; action: "throw" | "shake" | "result"; shakes?: number; caught?: boolean }
    | { kind: "end"; outcome: Outcome }

export type Outcome = "win" | "lose" | "run" | "caught"

export interface BattleSide {
    team: BattleMon[]
    activeIndex: number
}

export interface BattleState {
    player: BattleSide
    enemy: BattleSide
    isWild: boolean
    aiLevel: AiLevel
    turn: number
    phase: "select" | "ended"
    outcome: Outcome | null
    /** Side devant choisir un remplaçant suite à un KO (sinon null). */
    forcedSwitch: SideId | null
    /** File d'événements du dernier tour résolu (vidée par l'UI). */
    events: BattleEvent[]
    /** État RNG persistant (déterministe / rejouable). */
    seed: number
    /** Bonus situationnel de capture (ex. quota PushQuest atteint). Défaut 1. */
    captureModifier: number
    /** uids des Daemons du joueur qui ont COMBATTU (envoyés au moins une fois) → partage d'XP. */
    participated: string[]
    /** Combat JOUEUR vs JOUEUR : XP attribuée AUX DEUX camps (au vainqueur de chaque KO). */
    pvp: boolean
    /** Budget d'énergie de l'ENNEMI (ACE) : il paie ses attaques, struggle à sec. null = illimité. */
    enemyEnergy: { spent: number; cap: number } | null
}

export type PlayerAction =
    | { kind: "move"; moveIndex: number }
    | { kind: "switch"; teamIndex: number }
    | { kind: "ball"; itemId: string }
    | { kind: "item"; itemId: string }
    | { kind: "run" }

// Action interne résolue pour un camp (le joueur ET l'IA produisent ça).
interface ResolvedAction {
    side: SideId
    kind: "move" | "switch" | "run"
    moveIndex?: number
    teamIndex?: number
}

// ============================================================
// Helpers d'accès
// ============================================================

export function speciesOf(m: MonInstance) {
    const s = getSpecies(m.speciesId)
    if (!s) throw new Error(`Espèce inconnue: ${m.speciesId}`)
    return s
}

export function maxHpOf(m: MonInstance): number {
    return fullStats(m, speciesOf(m)).hp
}

export function displayName(m: MonInstance): string {
    return m.nickname ?? speciesOf(m).name
}

function active(side: BattleSide): BattleMon {
    return side.team[side.activeIndex]
}

function hasAlive(side: BattleSide): boolean {
    return side.team.some((m) => m.currentHp > 0)
}

function firstAliveIndex(side: BattleSide): number {
    return side.team.findIndex((m) => m.currentHp > 0)
}

/** Transforme une instance persistante en combattant runtime (stages neutres). */
export function toBattleMon(inst: MonInstance): BattleMon {
    return { ...inst, stages: neutralStages(), volatiles: {} }
}

// ============================================================
// Création d'un combat
// ============================================================

export function createBattle(
    playerTeam: MonInstance[],
    enemyTeam: MonInstance[],
    opts: { isWild: boolean; seed: number; aiLevel?: AiLevel; captureModifier?: number; pvp?: boolean; enemyEnergyCap?: number },
): BattleState {
    // Le joueur envoie son premier Daemon ENCORE DEBOUT (pas un K.O. en tête de liste).
    const playerStart = playerTeam.findIndex((m) => m.currentHp > 0)
    const enemyStart = enemyTeam.findIndex((m) => m.currentHp > 0)
    const playerStartIdx = playerStart >= 0 ? playerStart : 0
    const leadUid = playerTeam[playerStartIdx]?.uid
    return {
        player: { team: playerTeam.map(toBattleMon), activeIndex: playerStartIdx },
        enemy: { team: enemyTeam.map(toBattleMon), activeIndex: enemyStart >= 0 ? enemyStart : 0 },
        isWild: opts.isWild,
        aiLevel: opts.aiLevel ?? (opts.isWild ? "wild" : "trainer"),
        turn: 1,
        phase: "select",
        outcome: null,
        forcedSwitch: null,
        events: [],
        seed: opts.seed >>> 0,
        captureModifier: opts.captureModifier ?? 1,
        participated: leadUid ? [leadUid] : [],
        pvp: opts.pvp ?? false,
        enemyEnergy: opts.enemyEnergyCap != null ? { spent: 0, cap: opts.enemyEnergyCap } : null,
    }
}

// ============================================================
// Résolution d'un tour
// ============================================================

export function resolveTurn(prev: BattleState, playerAction: PlayerAction): BattleState {
    if (prev.phase === "ended") return prev

    // Clone profond minimal (immutabilité pour le store).
    const state: BattleState = structuredCloneState(prev)
    const rng = new Rng(state.seed)
    const events: BattleEvent[] = []

    // --- Cas spécial : changement forcé après KO (pas un vrai tour) ---
    if (state.forcedSwitch === "player" && playerAction.kind === "switch") {
        doSwitch(state, "player", playerAction.teamIndex!, events)
        state.forcedSwitch = null
        return commit(state, events, rng, prev.turn)
    }

    // --- Fuite (combats sauvages) ---
    if (playerAction.kind === "run") {
        if (!state.isWild) {
            events.push({ kind: "message", text: "On ne fuit pas un combat de Dresseur !" })
            return commit(state, events, rng, prev.turn, /*advance*/ false)
        }
        // Fuite garantie pour l'instant (formule de vitesse → Phase polish).
        events.push({ kind: "message", text: "Tu prends la fuite !" })
        state.phase = "ended"
        state.outcome = "run"
        events.push({ kind: "end", outcome: "run" })
        return commit(state, events, rng, prev.turn, false)
    }

    // --- Lancer une Ball (capture, uniquement en combat sauvage) ---
    if (playerAction.kind === "ball") {
        if (!state.isWild) {
            events.push({ kind: "message", text: "On ne capture pas le Daemon d'un Dresseur !" })
            return commit(state, events, rng, prev.turn, false)
        }
        performCapture(state, playerAction.itemId, events, rng)
        if (state.outcome === "caught") return commit(state, events, rng, prev.turn, false)
        // Capture ratée → l'adversaire prend quand même son tour.
        const ea = chooseEnemyAction(state, rng)
        if (active(state.enemy).currentHp > 0 && ea.kind === "move") {
            performMove(state, "enemy", ea.moveIndex!, events, rng)
            checkFaints(state, events)
        }
        if (state.phase !== "ended") { endOfTurn(state, events, rng); checkFaints(state, events) }
        return commit(state, events, rng, prev.turn, true)
    }

    // --- Utiliser un objet de soin (consomme le tour ; l'adversaire agit ensuite) ---
    if (playerAction.kind === "item") {
        applyItem(state, playerAction.itemId, events)
        const ea = chooseEnemyAction(state, rng)
        if (active(state.enemy).currentHp > 0) {
            if (ea.kind === "switch") doSwitch(state, "enemy", ea.teamIndex!, events)
            else if (ea.kind === "move") { performMove(state, "enemy", ea.moveIndex!, events, rng); checkFaints(state, events) }
        }
        if (state.phase !== "ended") { endOfTurn(state, events, rng); checkFaints(state, events) }
        return commit(state, events, rng, prev.turn, true)
    }

    // --- Construit les actions des deux camps ---
    const enemyAction = chooseEnemyAction(state, rng)
    const playerResolved: ResolvedAction = {
        side: "player",
        kind: playerAction.kind,
        moveIndex: playerAction.kind === "move" ? playerAction.moveIndex : undefined,
        teamIndex: playerAction.kind === "switch" ? playerAction.teamIndex : undefined,
    }

    // Les switchs passent AVANT les attaques.
    const order = orderActions(state, playerResolved, enemyAction, rng)

    for (const act of order) {
        if (state.phase === "ended") break
        // Si l'actif du camp est KO (suite à l'action adverse), il n'agit pas.
        if (active(state[act.side]).currentHp <= 0) continue

        if (act.kind === "switch") {
            doSwitch(state, act.side, act.teamIndex!, events)
        } else if (act.kind === "move") {
            performMove(state, act.side, act.moveIndex!, events, rng)
        }
        checkFaints(state, events)
    }

    // --- Fin de tour : résiduels de statut (ordre vitesse) ---
    if (state.phase !== "ended") {
        endOfTurn(state, events, rng)
        checkFaints(state, events)
    }

    return commit(state, events, rng, prev.turn, true)
}

/**
 * Résolution d'un tour JOUEUR vs JOUEUR : les DEUX actions sont fournies (aucune IA).
 * Convention canonique : côté A = "player" (le challenger), côté B = "enemy" (le défié).
 *
 * ⚠️ RISQUE — DÉTERMINISME : les deux clients doivent appeler cette fonction avec le
 *   MÊME `prev` (même seed) et les MÊMES actions, dans le MÊME ordre. Toute source
 *   d'aléa hors `rng` (seedé) provoquerait une désync. Ne rien ajouter d'impur ici.
 * v1 : uniquement move / switch (ni objet, ni fuite, ni capture en PvP).
 */
export function resolveTurnPvp(prev: BattleState, actionA: PlayerAction, actionB: PlayerAction): BattleState {
    if (prev.phase === "ended") return prev
    const state = structuredCloneState(prev)
    const rng = new Rng(state.seed)
    const events: BattleEvent[] = []

    // Changement forcé après KO : seul le camp concerné rejoue (un switch).
    if (state.forcedSwitch) {
        const side = state.forcedSwitch
        const act = side === "player" ? actionA : actionB
        if (act.kind === "switch") doSwitch(state, side, act.teamIndex!, events)
        state.forcedSwitch = null
        return commit(state, events, rng, prev.turn, false)
    }

    // v1 PvP : seuls move/switch sont relayés ; tout le reste retombe sur "move" idx 0
    // par sécurité (ne devrait jamais arriver — le client ne propose que move/switch).
    const toResolved = (side: SideId, a: PlayerAction): ResolvedAction => ({
        side,
        kind: a.kind === "switch" ? "switch" : "move",
        moveIndex: a.kind === "move" ? a.moveIndex : undefined,
        teamIndex: a.kind === "switch" ? a.teamIndex : undefined,
    })
    const order = orderActions(state, toResolved("player", actionA), toResolved("enemy", actionB), rng)
    for (const act of order) {
        if (state.phase === "ended") break
        if (active(state[act.side]).currentHp <= 0) continue // KO entre-temps → n'agit pas
        if (act.kind === "switch") doSwitch(state, act.side, act.teamIndex!, events)
        else if (act.kind === "move") performMove(state, act.side, act.moveIndex!, events, rng)
        checkFaints(state, events)
    }
    if (state.phase !== "ended") { endOfTurn(state, events, rng); checkFaints(state, events) }
    return commit(state, events, rng, prev.turn, true)
}

// ============================================================
// Ordre des actions : switch > priorité de capacité > vitesse
// ============================================================

function actionPriority(state: BattleState, a: ResolvedAction): number {
    if (a.kind === "switch") return 6 // les switchs passent avant tout
    if (a.kind === "move") {
        if (a.moveIndex === STRUGGLE_INDEX) return getMove(STRUGGLE_MOVE_ID)?.priority ?? 0
        const mon = active(state[a.side])
        const slot = mon.moves[a.moveIndex!]
        const move = slot ? getMove(slot.moveId) : null
        return move?.priority ?? 0
    }
    return 0
}

function effectiveSpeed(mon: BattleMon): number {
    const raw = fullStats(mon, speciesOf(mon)).spe
    return effectiveStat(raw, "spe", mon.stages.spe, mon.status)
}

function orderActions(
    state: BattleState,
    p: ResolvedAction,
    e: ResolvedAction,
    rng: Rng,
): ResolvedAction[] {
    const pp = actionPriority(state, p)
    const ep = actionPriority(state, e)
    if (pp !== ep) return pp > ep ? [p, e] : [e, p]
    const ps = effectiveSpeed(active(state.player))
    const es = effectiveSpeed(active(state.enemy))
    if (ps !== es) return ps > es ? [p, e] : [e, p]
    // Égalité de vitesse → aléatoire (comme dans le jeu).
    return rng.chance(50) ? [p, e] : [e, p]
}

// ============================================================
// Exécution d'une capacité
// ============================================================

function performMove(state: BattleState, side: SideId, moveIndex: number, events: BattleEvent[], rng: Rng) {
    const atkSide = state[side]
    const defSide = state[other(side)]
    const attacker = active(atkSide)
    const defender = active(defSide)
    // moveIndex sentinelle (< 0) = Charge Désespérée (secours gratuit hors slots).
    const isStruggle = moveIndex === STRUGGLE_INDEX
    const slot = isStruggle ? null : attacker.moves[moveIndex]
    const move = isStruggle ? getMove(STRUGGLE_MOVE_ID) : slot ? getMove(slot.moveId) : null
    if (!move) return

    // Budget d'énergie de l'ENNEMI (ACE) : il paie son attaque (sauf Charge Désespérée).
    if (side === "enemy" && state.enemyEnergy && !isStruggle) {
        state.enemyEnergy.spent += moveCostReps(attacker.moves[moveIndex]?.ppMax ?? 5, attacker.level)
    }

    // --- Pré-checks de statut (peut empêcher l'action) ---
    if (!canAct(attacker, events, rng)) return

    // PP illimités : la seule limite est le coût en reps (déduit côté store).
    events.push({ kind: "message", text: `${displayName(attacker)} utilise ${move.name} !` })

    // --- Confusion : risque de se blesser soi-même ---
    if (attacker.volatiles.CONFUSION && attacker.volatiles.CONFUSION > 0) {
        attacker.volatiles.CONFUSION -= 1
        if (attacker.volatiles.CONFUSION <= 0) {
            delete attacker.volatiles.CONFUSION
            events.push({ kind: "message", text: `${displayName(attacker)} n'est plus confus.` })
        } else if (Status.confusionSelfHit(rng)) {
            const selfDmg = confusionDamage(attacker)
            applyDamage(state, side, selfDmg, events)
            events.push({ kind: "message", text: `${displayName(attacker)} est confus ! Il se blesse en se débattant !` })
            return
        }
    }

    // --- Précision ---
    if (!accuracyCheck(move, attacker, defender, rng)) {
        events.push({ kind: "message", text: `${displayName(attacker)} rate son attaque !` })
        return
    }

    // Gen 1 : un move sans puissance est un move de STATUT (effet pur).
    if (move.power <= 0) {
        applyStatusMove(state, side, move, events, rng)
        return
    }

    // --- Capacité offensive (gère multi-hit) ---
    const hits = move.effect?.multiHit ? rng.int(move.effect.multiHit[0], move.effect.multiHit[1]) : 1
    let landed = 0
    let lastEff = 1
    for (let h = 0; h < hits; h++) {
        if (active(defSide).currentHp <= 0) break
        const res = dealMoveDamage(state, side, move, rng, events)
        lastEff = res.typeEff
        if (res.dealt > 0 || res.typeEff > 0) landed++
        // Drain / recul basés sur les dégâts de CE coup.
        if (move.effect?.drainPct && res.dealt > 0) {
            const heal = Math.max(1, Math.floor((res.dealt * move.effect.drainPct) / 100))
            applyHeal(state, side, heal, events)
            events.push({ kind: "message", text: `${displayName(attacker)} récupère de l'énergie !` })
        }
        if (move.effect?.recoilPct && res.dealt > 0) {
            const recoil = Math.max(1, Math.floor((res.dealt * move.effect.recoilPct) / 100))
            applyDamage(state, side, recoil, events)
            events.push({ kind: "message", text: `${displayName(attacker)} est blessé par le contrecoup !` })
        }
    }

    if (lastEff === 0) {
        events.push({ kind: "message", text: "Ça n'affecte pas l'adversaire…" })
        return
    }
    if (hits > 1 && landed > 0) {
        events.push({ kind: "message", text: `Touché ${landed} fois !` })
    }

    // --- Effet secondaire (proba) sur capacité offensive ---
    if (move.effect && active(defSide).currentHp > 0) {
        maybeApplySecondary(state, side, move, events, rng)
    }
}

interface DamageOutcome { dealt: number; typeEff: number }

function dealMoveDamage(state: BattleState, side: SideId, move: MoveData, rng: Rng, events: BattleEvent[]): DamageOutcome {
    const attacker = active(state[side])
    const defender = active(state[other(side)])
    const atkSpecies = speciesOf(attacker)
    const defSpecies = speciesOf(defender)

    const eff = typeEffectiveness(move.type, defSpecies.types)
    if (eff === 0) return { dealt: 0, typeEff: 0 }

    const rawStats = fullStats(attacker, atkSpecies)
    const rawDefStats = fullStats(defender, defSpecies)
    // Gen 1 : catégorie déterminée par le TYPE. Physique → Atq/Déf ; Spécial → Spc/Spc.
    const isPhysical = moveCategory(move.type) === "PHYSICAL"
    const atk = isPhysical
        ? effectiveStat(rawStats.atk, "atk", attacker.stages.atk, attacker.status)
        : effectiveStat(rawStats.spc, "spc", attacker.stages.spc, attacker.status)
    const def = isPhysical
        ? effectiveStat(rawDefStats.def, "def", defender.stages.def, "NONE")
        : effectiveStat(rawDefStats.spc, "spc", defender.stages.spc, "NONE")

    // Crit Gen 1 : probabilité liée à la Vitesse de base de l'attaquant.
    const isCrit = rng.next() < critProbabilityGen1(atkSpecies.baseStats.spe, move.effect?.highCrit)
    const result = computeDamage({
        level: attacker.level,
        power: move.power,
        attack: atk,
        defense: def,
        stab: hasStab(move.type, atkSpecies.types),
        typeEff: eff,
        isCrit,
        randomFactor: rng.damageFactor(),
    })

    applyDamage(state, other(side), result.damage, events)
    if (isCrit) events.push({ kind: "message", text: "Coup critique !" })
    const effMsg = effectivenessMessage(eff)
    if (effMsg) events.push({ kind: "message", text: effMsg })

    return { dealt: result.damage, typeEff: eff }
}

// ============================================================
// Capacités de statut (buff/debuff/soin/statut/volatil)
// ============================================================

function applyStatusMove(state: BattleState, side: SideId, move: MoveData, events: BattleEvent[], rng: Rng) {
    const fx = move.effect
    if (!fx) {
        events.push({ kind: "message", text: "Mais rien ne se passe…" })
        return
    }
    const selfMon = active(state[side])
    const foeMon = active(state[other(side)])

    if (fx.healPct) {
        const heal = Math.floor((maxHpOf(selfMon) * fx.healPct) / 100)
        applyHeal(state, side, heal, events)
        events.push({ kind: "message", text: `${displayName(selfMon)} récupère des PV !` })
    }
    if (fx.statChanges) {
        for (const sc of fx.statChanges) {
            const tgtSide: SideId = sc.target === "self" ? side : other(side)
            applyStatChange(state, tgtSide, sc.stat, sc.stages, events)
        }
    }
    if (fx.inflictStatus) {
        tryInflictStatus(state, other(side), fx.inflictStatus, events, rng)
    }
    if (fx.inflictVolatile) {
        applyVolatile(foeMon, fx.inflictVolatile, rng, events, foeMon)
    }
}

function maybeApplySecondary(state: BattleState, side: SideId, move: MoveData, events: BattleEvent[], rng: Rng) {
    const fx = move.effect!
    const chance = fx.chance ?? 100
    if (!rng.chance(chance)) return
    if (fx.inflictStatus) tryInflictStatus(state, other(side), fx.inflictStatus, events, rng)
    if (fx.inflictVolatile) applyVolatile(active(state[other(side)]), fx.inflictVolatile, rng, events, active(state[other(side)]))
    if (fx.statChanges) {
        for (const sc of fx.statChanges) {
            const tgtSide: SideId = sc.target === "self" ? side : other(side)
            applyStatChange(state, tgtSide, sc.stat, sc.stages, events)
        }
    }
    if (fx.flinch) {
        const foe = active(state[other(side)])
        foe.volatiles.FLINCH = 1
    }
}

function tryInflictStatus(state: BattleState, targetSide: SideId, status: Exclude<MajorStatus, "NONE">, events: BattleEvent[], rng: Rng) {
    const mon = active(state[targetSide])
    if (!Status.canInflictStatus(mon.status, status, speciesOf(mon).types)) return
    mon.status = status
    mon.statusCounter = Status.initialStatusCounter(status, rng)
    events.push({ kind: "status", side: targetSide, status })
    events.push({ kind: "message", text: Status.statusApplyMessage(status, displayName(mon)) })
}

function applyVolatile(mon: BattleMon, vol: NonNullable<MoveData["effect"]>["inflictVolatile"], rng: Rng, events: BattleEvent[], named: BattleMon) {
    if (!vol) return
    if (vol === "CONFUSION") {
        if (mon.volatiles.CONFUSION) return
        mon.volatiles.CONFUSION = rng.int(2, 4)
        events.push({ kind: "message", text: `${displayName(named)} est confus !` })
    } else if (vol === "SEEDED") {
        if (mon.volatiles.SEEDED) return
        mon.volatiles.SEEDED = 1
        events.push({ kind: "message", text: `${displayName(named)} est infecté par des graines !` })
    } else {
        mon.volatiles[vol] = 1
    }
}

function applyStatChange(state: BattleState, side: SideId, stat: StageKey, delta: number, events: BattleEvent[]) {
    const mon = active(state[side])
    const before = mon.stages[stat]
    mon.stages[stat] = clampStage(before + delta)
    const real = mon.stages[stat] - before
    if (real === 0) {
        events.push({ kind: "message", text: `${displayName(mon)} : sa stat ne change plus.` })
        return
    }
    const up = delta > 0
    events.push({ kind: "message", text: `${displayName(mon)} : ${labelStat(stat)} ${up ? "augmente" : "baisse"}${Math.abs(real) >= 2 ? " beaucoup" : ""} !` })
}

// ============================================================
// Pré-checks de statut (le mon peut-il agir ?)
// ============================================================

function canAct(mon: BattleMon, events: BattleEvent[], rng: Rng): boolean {
    if (mon.volatiles.FLINCH) {
        delete mon.volatiles.FLINCH
        events.push({ kind: "message", text: `${displayName(mon)} a peur et ne peut pas agir !` })
        return false
    }
    if (mon.status === "SLEEP") {
        mon.statusCounter -= 1
        if (mon.statusCounter <= 0) {
            mon.status = "NONE"
            events.push({ kind: "message", text: `${displayName(mon)} se réveille !` })
            return true
        }
        events.push({ kind: "message", text: `${displayName(mon)} dort profondément.` })
        return false
    }
    if (mon.status === "FREEZE") {
        if (Status.freezeThaws(rng)) {
            mon.status = "NONE"
            events.push({ kind: "message", text: `${displayName(mon)} dégèle !` })
            return true
        }
        events.push({ kind: "message", text: `${displayName(mon)} est gelé !` })
        return false
    }
    if (mon.status === "PARALYSIS" && Status.paralysisSkips(rng)) {
        events.push({ kind: "message", text: `${displayName(mon)} est paralysé ! Il ne peut pas bouger !` })
        return false
    }
    return true
}

// ============================================================
// Fin de tour : résiduels
// ============================================================

function endOfTurn(state: BattleState, events: BattleEvent[], rng: Rng) {
    void rng
    const order: SideId[] = effectiveSpeed(active(state.player)) >= effectiveSpeed(active(state.enemy))
        ? ["player", "enemy"]
        : ["enemy", "player"]
    for (const side of order) {
        const mon = active(state[side])
        if (mon.currentHp <= 0) continue
        // Statut résiduel
        const res = Status.residualDamage(mon.status, maxHpOf(mon), displayName(mon), mon.statusCounter)
        if (res.damage > 0) {
            applyDamage(state, side, res.damage, events)
            if (res.message) events.push({ kind: "message", text: res.message })
            if (mon.status === "TOXIC") mon.statusCounter += 1
        }
        // Vampigraine (SEEDED) : draine vers l'adversaire
        if (mon.volatiles.SEEDED && mon.currentHp > 0) {
            const drain = Math.max(1, Math.floor(maxHpOf(mon) / 8))
            applyDamage(state, side, drain, events)
            applyHeal(state, other(side), drain, events)
            events.push({ kind: "message", text: `${displayName(mon)} est vidé de son énergie !` })
        }
    }
}

// ============================================================
// PV : dégâts / soin (+ événements hp pour l'UI)
// ============================================================

function applyDamage(state: BattleState, side: SideId, amount: number, events: BattleEvent[]) {
    if (amount <= 0) return
    const mon = active(state[side])
    mon.currentHp = Math.max(0, mon.currentHp - amount)
    events.push({ kind: "hp", side, hp: mon.currentHp, max: maxHpOf(mon) })
}

function applyHeal(state: BattleState, side: SideId, amount: number, events: BattleEvent[]) {
    if (amount <= 0) return
    const mon = active(state[side])
    // Un Daemon K.O. ne peut JAMAIS être soigné/ressuscité (drain Vampigraine, etc.).
    if (mon.currentHp <= 0) return
    const max = maxHpOf(mon)
    mon.currentHp = Math.min(max, mon.currentHp + amount)
    events.push({ kind: "hp", side, hp: mon.currentHp, max })
}

function confusionDamage(mon: BattleMon): number {
    const s = speciesOf(mon)
    const stats = fullStats(mon, s)
    const atk = effectiveStat(stats.atk, "atk", mon.stages.atk, mon.status)
    const def = effectiveStat(stats.def, "def", mon.stages.def, "NONE")
    // Attaque "type ???" puissance 40, sans STAB ni type ni crit.
    return computeDamage({ level: mon.level, power: 40, attack: atk, defense: def, stab: false, typeEff: 1, isCrit: false, randomFactor: 1 }).damage
}

// ============================================================
// Switch / KO / IA
// ============================================================

function doSwitch(state: BattleState, side: SideId, teamIndex: number, events: BattleEvent[]) {
    const s = state[side]
    if (teamIndex < 0 || teamIndex >= s.team.length) return
    if (s.team[teamIndex].currentHp <= 0) return
    if (teamIndex === s.activeIndex) return
    // Réinitialise stages/volatils du sortant.
    const out = s.team[s.activeIndex]
    out.stages = neutralStages()
    out.volatiles = {}
    s.activeIndex = teamIndex
    const incoming = s.team[teamIndex]
    // Le Daemon entrant a "participé" → il partagera l'XP des futurs K.O. (joueur uniquement).
    if (side === "player" && !state.participated.includes(incoming.uid)) {
        state.participated.push(incoming.uid)
    }
    events.push({ kind: "switchIn", side, name: displayName(incoming), teamIndex })
    events.push({ kind: "message", text: side === "player" ? `En avant, ${displayName(incoming)} !` : `L'adversaire envoie ${displayName(incoming)} !` })
    events.push({ kind: "hp", side, hp: incoming.currentHp, max: maxHpOf(incoming) })
}

function checkFaints(state: BattleState, events: BattleEvent[]) {
    for (const side of ["player", "enemy"] as SideId[]) {
        const s = state[side]
        const mon = active(s)
        if (mon.currentHp <= 0 && !(mon as any).__fainted) {
            (mon as any).__fainted = true
            events.push({ kind: "faint", side, name: displayName(mon) })
            events.push({ kind: "message", text: `${displayName(mon)} est K.O. !` })
            // PvP : le camp ADVERSE (celui dont l'actif vient de KO l'autre) gagne l'XP.
            // Solo : seul le joueur gagne l'XP, et seulement quand l'ennemi tombe.
            if (state.pvp) awardExpPvp(state, other(side), events)
            else if (side === "enemy") awardExp(state, events)
        }
    }
    // Issue / changement forcé
    if (!hasAlive(state.enemy)) {
        state.phase = "ended"; state.outcome = "win"
        events.push({ kind: "end", outcome: "win" })
        return
    }
    if (!hasAlive(state.player)) {
        state.phase = "ended"; state.outcome = "lose"
        events.push({ kind: "end", outcome: "lose" })
        return
    }
    // Auto-switch ennemi si son actif est KO
    if (active(state.enemy).currentHp <= 0) {
        doSwitch(state, "enemy", firstAliveIndex(state.enemy), events)
    }
    // Le joueur doit choisir un remplaçant si son actif est KO
    if (active(state.player).currentHp <= 0) {
        state.forcedSwitch = "player"
    }
}

/** Délègue le choix de l'adversaire à l'IA (ai.ts) selon le niveau de difficulté. */
export function chooseEnemyAction(state: BattleState, rng: Rng): ResolvedAction {
    const self = active(state.enemy)
    const foe = active(state.player)
    const choice = chooseAiAction(self, foe, state.enemy.team, state.enemy.activeIndex, state.aiLevel, rng)
    if (choice.kind === "switch" && choice.teamIndex !== undefined) {
        return { side: "enemy", kind: "switch", teamIndex: choice.teamIndex }
    }
    let moveIndex = choice.moveIndex ?? 0
    // Budget d'énergie (ACE) : si l'attaque choisie est inabordable, prendre la
    // meilleure attaque abordable ; à sec → Charge Désespérée (gratuite).
    if (state.enemyEnergy) {
        const remaining = state.enemyEnergy.cap - state.enemyEnergy.spent
        const costOf = (i: number) => moveCostReps(self.moves[i]?.ppMax ?? 5, self.level)
        if (moveIndex < 0 || costOf(moveIndex) > remaining) {
            let best = -1, bestPow = -1
            self.moves.forEach((slot, i) => {
                if (costOf(i) <= remaining) {
                    const p = getMove(slot.moveId)?.power ?? 0
                    if (p > bestPow) { bestPow = p; best = i }
                }
            })
            moveIndex = best >= 0 ? best : STRUGGLE_INDEX
        }
    }
    return { side: "enemy", kind: "move", moveIndex }
}

/**
 * XP attribuée quand l'adversaire actif tombe K.O.
 * PARTAGE : tous les Daemons du joueur ayant COMBATTU ce combat (state.participated)
 * et encore debout reçoivent l'XP. L'EXPÉRIENCE DE COMBAT (EV) reste réservée au
 * Daemon actif (celui qui a porté le coup fatal).
 */
function awardExp(state: BattleState, events: BattleEvent[]) {
    const fainted = active(state.enemy)
    const winner = active(state.player)
    const faintedSp = speciesOf(fainted)
    const gain = xpForDefeat(faintedSp.baseExp, fainted.level, state.isWild)

    // EV uniquement au Daemon actif s'il est encore debout.
    if (winner.currentHp > 0) gainEv(winner, signatureStat(faintedSp), EV_YIELD_PER_WIN)

    for (const mon of state.player.team) {
        if (mon.currentHp <= 0) continue                       // un K.O. ne gagne pas d'XP
        if (!state.participated.includes(mon.uid)) continue    // n'a pas combattu → rien
        const isActive = mon === winner
        const beforeMax = maxHpOf(mon)
        const res = applyExp(mon, gain)
        events.push({ kind: "message", text: `${displayName(mon)} gagne ${gain} points d'Exp !` })
        if (res.toLevel > res.fromLevel) {
            const delta = maxHpOf(mon) - beforeMax
            if (delta > 0) {
                mon.currentHp += delta
                // Seul l'actif a sa barre affichée → on n'émet l'event "hp" que pour lui.
                if (isActive) events.push({ kind: "hp", side: "player", hp: mon.currentHp, max: maxHpOf(mon) })
            }
            events.push({ kind: "message", text: `${displayName(mon)} monte au niveau ${res.toLevel} !` })
            for (const mid of res.learnedMoveIds) {
                events.push({ kind: "message", text: `${displayName(mon)} apprend ${getMove(mid)?.name ?? mid} !` })
            }
            // 4 slots pleins : la capacité est mise en attente. On NOTIFIE le joueur
            // DANS le combat (le remplacement se fera à la fin, sans quitter brusquement).
            for (const mid of res.pendingMoveIds) {
                events.push({ kind: "message", text: `${displayName(mon)} veut apprendre ${getMove(mid)?.name ?? mid}… mais connaît déjà 4 capacités ! (choix à la fin du combat)` })
            }
        }
    }
}

/**
 * XP en PvP : attribuée à l'ACTIF du camp vainqueur quand l'actif adverse tombe.
 * Pas de partage d'équipe (state.participated est joueur-only) → uniquement l'actif
 * qui a porté le coup. Symétrique : marche pour les deux camps.
 */
function awardExpPvp(state: BattleState, winnerSide: SideId, events: BattleEvent[], multiplier = 1) {
    const winner = active(state[winnerSide])
    if (winner.currentHp <= 0) return // double KO → pas d'XP
    const fainted = active(state[other(winnerSide)])
    const faintedSp = speciesOf(fainted)
    const gain = Math.max(1, Math.floor(xpForDefeat(faintedSp.baseExp, fainted.level, false) * multiplier))
    gainEv(winner, signatureStat(faintedSp), EV_YIELD_PER_WIN)
    const beforeMax = maxHpOf(winner)
    const res = applyExp(winner, gain)
    events.push({ kind: "message", text: `${displayName(winner)} gagne ${gain} points d'Exp !` })
    if (res.toLevel > res.fromLevel) {
        const delta = maxHpOf(winner) - beforeMax
        if (delta > 0) {
            winner.currentHp += delta
            events.push({ kind: "hp", side: winnerSide, hp: winner.currentHp, max: maxHpOf(winner) })
        }
        events.push({ kind: "message", text: `${displayName(winner)} monte au niveau ${res.toLevel} !` })
        for (const mid of res.learnedMoveIds) {
            events.push({ kind: "message", text: `${displayName(winner)} apprend ${getMove(mid)?.name ?? mid} !` })
        }
        for (const mid of res.pendingMoveIds) {
            events.push({ kind: "message", text: `${displayName(winner)} veut apprendre ${getMove(mid)?.name ?? mid}… mais connaît déjà 4 capacités ! (choix à la fin du combat)` })
        }
    }
}

/**
 * Issue d'un combat PvP par ABANDON adverse : le camp restant gagne, et reçoit
 * de l'XP (multiplicateur, ex. ×2 en récompense). Renvoie un état "ended" prêt
 * à afficher (avec les messages d'XP/niveau). Pur.
 */
export function applyForfeitWin(
    prev: BattleState,
    winnerSide: SideId,
    opts: { multiplier?: number; headline?: string } = {},
): BattleState {
    const state = structuredCloneState(prev)
    const events: BattleEvent[] = []
    if (opts.headline) events.push({ kind: "message", text: opts.headline })
    awardExpPvp(state, winnerSide, events, opts.multiplier ?? 1)
    state.phase = "ended"
    state.outcome = winnerSide === "player" ? "win" : "lose"
    state.events = events
    return state
}

/** Tentative de capture (combat sauvage). Met outcome = "caught" si réussi. */
function performCapture(state: BattleState, itemId: string, events: BattleEvent[], rng: Rng) {
    const wild = active(state.enemy)
    const sp = speciesOf(wild)
    const res = isGuaranteedBall(itemId)
        ? { caught: true, shakes: 3, value: Infinity }
        : tryCapture(
            {
                catchRate: sp.catchRate, currentHp: wild.currentHp, maxHp: maxHpOf(wild), status: wild.status,
                ballBonus: ballBonusOf(itemId), rarityBonus: rarityBonusOf(sp.rarity), extraBonus: state.captureModifier,
            },
            rng,
        )
    events.push({ kind: "message", text: `Tu lances une ${getItem(itemId)?.name ?? "Ball"} !` })
    events.push({ kind: "ball", action: "throw" })           // la ball file vers le Daemon
    events.push({ kind: "ball", action: "shake", shakes: res.shakes }) // secousses (0..3)
    events.push({ kind: "ball", action: "result", caught: res.caught }) // clic / éclatement
    if (res.caught) {
        state.phase = "ended"
        state.outcome = "caught"
        events.push({ kind: "message", text: `Gagné ! ${displayName(wild)} est capturé !` })
        events.push({ kind: "end", outcome: "caught" })
    } else {
        events.push({ kind: "message", text: `Oh non ! ${displayName(wild)} s'est échappé !` })
    }
}

/** Utilise un objet de soin sur le Daemon actif du joueur (consomme le tour). */
function applyItem(state: BattleState, itemId: string, events: BattleEvent[]) {
    const it = getItem(itemId)
    const mon = active(state.player)
    events.push({ kind: "message", text: `Tu utilises ${it?.name ?? "un objet"} !` })
    if (!it) { events.push({ kind: "message", text: "Mais ça n'a aucun effet…" }); return }

    // Soin de PV
    if (it.category === "HEAL") {
        const amount = it.healHp && it.healHp > 0 ? it.healHp : maxHpOf(mon)
        applyHeal(state, "player", amount, events)
        events.push({ kind: "message", text: `${displayName(mon)} récupère des PV !` })
        return
    }
    // Anti-statut
    if (it.category === "STATUS_HEAL") {
        const cures = it.cures ?? []
        const heals = cures.includes("ALL") || cures.includes(mon.status as never)
        if (mon.status !== "NONE" && heals) {
            mon.status = "NONE"
            mon.statusCounter = 0
            events.push({ kind: "message", text: `${displayName(mon)} n'a plus de problème de statut !` })
        } else {
            events.push({ kind: "message", text: "Mais ça n'a aucun effet…" })
        }
        return
    }
    // Objet X : boost de stat (+ crans) pour le combat
    if (it.category === "BOOST" && it.boostStat) {
        applyStatChange(state, "player", it.boostStat, it.boostStages ?? 1, events)
        return
    }
    events.push({ kind: "message", text: "Mais ça n'a aucun effet ici…" })
}

// ============================================================
// Utilitaires
// ============================================================

function other(side: SideId): SideId {
    return side === "player" ? "enemy" : "player"
}

function labelStat(stat: StageKey): string {
    const map: Record<StageKey, string> = {
        atk: "l'Attaque", def: "la Défense", spc: "le Spécial",
        spe: "la Vitesse", acc: "la Précision", eva: "l'Esquive",
    }
    return map[stat]
}

function commit(state: BattleState, events: BattleEvent[], rng: Rng, prevTurn: number, advance = true): BattleState {
    // Nettoie les marqueurs internes de KO.
    for (const side of ["player", "enemy"] as SideId[]) {
        for (const m of state[side].team) delete (m as any).__fainted
    }
    state.events = events
    state.seed = rng.getState()
    if (advance && state.phase !== "ended") state.turn = prevTurn + 1
    return state
}

function structuredCloneState(s: BattleState): BattleState {
    return {
        ...s,
        player: { activeIndex: s.player.activeIndex, team: s.player.team.map(cloneMon) },
        enemy: { activeIndex: s.enemy.activeIndex, team: s.enemy.team.map(cloneMon) },
        events: [],
        participated: [...s.participated],
        enemyEnergy: s.enemyEnergy ? { ...s.enemyEnergy } : null,
    }
}

function cloneMon(m: BattleMon): BattleMon {
    return {
        ...m,
        ivs: { ...m.ivs },
        moves: m.moves.map((mv) => ({ ...mv })),
        stages: { ...m.stages },
        volatiles: { ...m.volatiles },
    }
}
