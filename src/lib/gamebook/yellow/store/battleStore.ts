// src/lib/gamebook/yellow/store/battleStore.ts
//
// Nexus Jaune Éclair — STORE EXTERNE du combat (pattern useSyncExternalStore).
// Le moteur (battle/engine.ts) reste 100% React-free ; ce store est la SEULE
// couche de liaison avec React. L'UI lit l'état via le hook useBattle() et
// déclenche les actions ; elle ne recalcule jamais les règles elle-même.

import { useSyncExternalStore } from "react"
import {
    createBattle,
    resolveTurn,
    type BattleState,
    type PlayerAction,
} from "../battle/engine"
import type { AiLevel } from "../battle/ai"
import type { MonInstance } from "../battle/types"
import { markSeen, markCaught } from "./pokedexStore"
import { getPlayer, setTeam, addCaught, consumeItem, markTrainerDefeated, healAllTeam, spendReps, awardBadge, recordSbireWin, grantReps, addItem } from "./playerStore"
import { SBIRE_REWARD_REPS, SBIRE_REWARD_BALL_ID } from "../data/sbire"
import { getTrainer } from "../data/trainers"
import { SBIRE_TRAINER_ID } from "../data/sbire"
import { toMonInstance } from "../storage/save"
import { evolveTeam } from "../progression/evolveTeam"
import { persistYellowSave, processSaiyanPoints } from "./saveManager"
import { QUOTA_CAPTURE_BONUS } from "../data/captureConfig"
import { moveCostReps, STRUGGLE_INDEX } from "../data/combatCostConfig"
import { battleEnergyCap } from "../data/badges"
import type { EvolutionResult } from "../battle/evolution"

/** Espèce de l'adversaire actif (pour synchroniser le Pokédex). */
function enemyActiveSpeciesId(b: BattleState): string | null {
    const m = b.enemy.team[b.enemy.activeIndex]
    return m ? m.speciesId : null
}

/** Met à jour le Pokédex depuis l'état de combat (vu, et capturé si applicable). */
function syncPokedex(b: BattleState) {
    const sp = enemyActiveSpeciesId(b)
    if (!sp) return
    markSeen(sp)
    if (b.outcome === "caught") markCaught(sp)
}

/** Contexte d'un combat de dresseur (récompense + marquage "battu"). */
interface TrainerContext {
    trainerId: string
    reward: number
}

interface BattleStoreState {
    battle: BattleState | null
    /** Évolutions à jouer (cinématique post-combat). */
    evolutions: EvolutionResult[]
    /** Présent uniquement pendant/juste après un combat de dresseur. */
    trainer: TrainerContext | null
    /** Équipe entièrement K.O. → la carte doit renvoyer le joueur au Centre (soigné). */
    whiteout: boolean
    /** Reps dépensés en attaques DANS le combat courant (cap d'énergie par combat). */
    energySpent: number
    /** Numéro de victoire sur le sbire (1-indexé) à expliquer post-combat ; null sinon. */
    sbireWin: number | null
    /** Message de récompense du sbire (énergie / ball) à afficher avec l'explication ; null sinon. */
    sbireRewardMsg: string | null
}

let storeState: BattleStoreState = { battle: null, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null }
const listeners = new Set<() => void>()

function emit() {
    for (const l of listeners) l()
}

/** Fusionne un patch dans l'état (les champs non fournis sont conservés). */
function setStore(next: Partial<BattleStoreState>) {
    storeState = { ...storeState, ...next }
    emit()
}

// --- Abonnement / lecture (contrat useSyncExternalStore) ---
export function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}

export function getSnapshot(): BattleStoreState {
    return storeState
}

// --- Pont d'ENTRÉES : la coque GameBoy route ses boutons vers le menu de combat ---
export type BattleInput = "up" | "down" | "left" | "right" | "a" | "b"
let battleInputHandler: ((a: BattleInput) => void) | null = null
/** BattleScreen enregistre ici son gestionnaire (curseur) ; null à la sortie. */
export function setBattleInputHandler(fn: ((a: BattleInput) => void) | null) {
    battleInputHandler = fn
}
/** Appelé par YellowDevClient quand un bouton physique est pressé pendant un combat. */
export function dispatchBattleInput(a: BattleInput) {
    battleInputHandler?.(a)
}

// ============================================================
// Actions (mutent l'état via le moteur pur)
// ============================================================

export function startWildBattle(playerTeam: MonInstance[], enemyTeam: MonInstance[], seed: number) {
    // Quota PushQuest du jour atteint → capture facilitée pendant le combat.
    const captureModifier = getPlayer().wildCtx?.quotaReached ? QUOTA_CAPTURE_BONUS : 1
    const battle = createBattle(playerTeam, enemyTeam, { isWild: true, seed, captureModifier })
    syncPokedex(battle) // adversaire "vu" dès la rencontre
    setStore({ battle, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null })
}

export function startTrainerBattle(
    playerTeam: MonInstance[],
    enemyTeam: MonInstance[],
    seed: number,
    opts?: { trainerId?: string; reward?: number; aiLevel?: AiLevel },
) {
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: opts?.aiLevel })
    syncPokedex(battle)
    const trainer = opts?.trainerId ? { trainerId: opts.trainerId, reward: opts.reward ?? 0 } : null
    setStore({ battle, evolutions: [], trainer, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null })
}

/** Énergie de combat : reps déjà dépensés ce combat + plafond (selon badges). */
export function getBattleEnergy(): { spent: number; cap: number } {
    return { spent: storeState.energySpent, cap: battleEnergyCap(getPlayer().badges.length) }
}

/** Coût en reps de l'attaque du Daemon actif (0 si introuvable). */
function moveCostRepsForAction(b: BattleState, moveIndex: number): number {
    const me = b.player.team[b.player.activeIndex]
    const slot = me?.moves[moveIndex]
    if (!me || !slot) return 0
    return moveCostReps(slot.ppMax, me.level)
}

export function submitPlayerAction(action: PlayerAction) {
    const battle = storeState.battle
    if (!battle) return
    // Lancer une Ball consomme l'objet de l'inventaire (réussite ou non).
    if (action.kind === "ball" && !consumeItem(action.itemId)) return
    // Utiliser un objet de soin le consomme aussi.
    if (action.kind === "item" && !consumeItem(action.itemId)) return
    // Attaque normale : coûte des reps (la Charge Désespérée, index sentinelle, est gratuite).
    if (action.kind === "move" && action.moveIndex !== STRUGGLE_INDEX) {
        const cost = moveCostRepsForAction(battle, action.moveIndex)
        if (cost > 0) {
            // Cap d'énergie PAR COMBAT (relevé par les badges d'arène).
            const cap = battleEnergyCap(getPlayer().badges.length)
            if (storeState.energySpent + cost > cap) return // plus d'énergie ce combat (UI grise déjà)
            if (!spendReps(cost)) return                    // solde global insuffisant
            storeState = { ...storeState, energySpent: storeState.energySpent + cost }
        }
    }
    const next = resolveTurn(battle, action)
    syncPokedex(next) // vu (changement d'adversaire) + capturé le cas échéant
    setStore({ battle: next, evolutions: [], trainer: storeState.trainer, whiteout: false })
    if (next.phase === "ended") finishBattle(next)
}

/** Fin de combat : resync équipe (XP/PV/niveaux), capture, évolutions, sauvegarde. */
function finishBattle(b: BattleState) {
    // 1) Resynchronise l'équipe persistante depuis l'état de combat.
    setTeam(b.player.team.map(toMonInstance))

    // 2) Capture → ajoute le sauvage à l'équipe/PC.
    if (b.outcome === "caught") {
        const wild = b.enemy.team[b.enemy.activeIndex]
        if (wild) addCaught(toMonInstance(wild))
    }

    // 2bis) Victoire dresseur : marquage "battu" (la monnaie = reps, gagnée hors combat).
    //       Chef d'arène → badge accordé (augmente cap reps + cap d'énergie + CT débloquées).
    //       CAS SPÉCIAL sbire : récurrent (2×/jour) → on N'enregistre PAS "battu"
    //       (sinon il deviendrait inaffrontable), juste le compteur + l'explication.
    let sbireWin: number | null = null
    let sbireRewardMsg: string | null = null
    if (b.outcome === "win" && storeState.trainer) {
        if (storeState.trainer.trainerId === SBIRE_TRAINER_ID) {
            sbireWin = recordSbireWin()
            // Récompense selon la victoire DU JOUR : 1re → énergie, 2e → ball.
            const todayWins = getPlayer().sbireDefeatsToday
            if (todayWins === 1) {
                const added = grantReps(SBIRE_REWARD_REPS)
                sbireRewardMsg = `⚡ Et tiens, ${added} d'énergie pour ta peine !`
            } else if (todayWins === 2) {
                addItem(SBIRE_REWARD_BALL_ID, 1)
                sbireRewardMsg = `🎁 Et prends donc cette Nexus Ball, tu l'as méritée !`
            }
        } else {
            markTrainerDefeated(storeState.trainer.trainerId)
            const badge = getTrainer(storeState.trainer.trainerId)?.badge
            if (badge) awardBadge(badge)
        }
    }

    // 2ter) Défaite (équipe entièrement K.O.) : on soigne tout de suite et on
    //       signale un "whiteout" → la carte renverra le joueur au Centre.
    const isLose = b.outcome === "lose"
    if (isLose) healAllTeam()

    // 3) Évolutions post-combat (mute l'équipe → re-set pour notifier + Pokédex).
    const team = getPlayer().team
    const evos = evolveTeam(team)
    if (evos.length > 0) {
        for (const e of evos) markCaught(e.toId) // la nouvelle forme entre au Pokédex
        setTeam([...team])
    }
    // Expose les évolutions pour la cinématique post-combat (jouée après "QUITTER").
    setStore({ battle: b, evolutions: evos, trainer: null, whiteout: isLose, sbireWin, sbireRewardMsg })

    // 4) Sauvegarde persistante (DB).
    persistYellowSave()

    // 5) SAIYAN : convertit les niveaux gagnés ce combat en points (règle amende/quota).
    void processSaiyanPoints()
}

export function endBattle() {
    // On garde évolutions + whiteout : ils se jouent une fois le combat quitté.
    setStore({ battle: null, evolutions: storeState.evolutions, trainer: null, whiteout: storeState.whiteout })
}

export function clearEvolutions() {
    setStore({ battle: storeState.battle, evolutions: [], trainer: storeState.trainer, whiteout: storeState.whiteout })
}

/** Consommé par la carte une fois le joueur renvoyé au Centre. */
export function clearWhiteout() {
    setStore({ ...storeState, whiteout: false })
}

/** Consommé par la carte une fois l'explication du sbire affichée. */
export function clearSbireWin() {
    setStore({ ...storeState, sbireWin: null, sbireRewardMsg: null })
}

/** Message de récompense du sbire (lu au moment d'afficher l'explication). */
export function getSbireRewardMsg(): string | null {
    return storeState.sbireRewardMsg
}

// ============================================================
// Hooks de lecture (React) — la référence reste stable entre tours.
// ============================================================

export function useBattle(): BattleState | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().battle,
        () => getSnapshot().battle,
    )
}

export function useEvolutions(): EvolutionResult[] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().evolutions,
        () => getSnapshot().evolutions,
    )
}

export function useWhiteout(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().whiteout,
        () => getSnapshot().whiteout,
    )
}

export function useSbireWin(): number | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().sbireWin,
        () => getSnapshot().sbireWin,
    )
}
