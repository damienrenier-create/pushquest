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
    resolveTurnPvp,
    applyForfeitWin,
    type BattleState,
    type BattleEvent,
    type PlayerAction,
    type SideId,
} from "../battle/engine"
import type { AiLevel } from "../battle/ai"
import type { MonInstance } from "../battle/types"
import { markSeen, markCaught } from "./pokedexStore"
import { getPlayer, setTeam, addCaught, consumeItem, markTrainerDefeated, healAllTeam, spendReps, awardBadge, recordSbireWin, grantReps, addItem, recordPvpResult, recordPvpUse, recordAceDefeat, grantCt } from "./playerStore"
import { getCt } from "../data/cts"
import { getMove } from "../data/moves"
import { getSpecies } from "../data/species"
import { SBIRE_REWARD_REPS, SBIRE_REWARD_BALL_ID } from "../data/sbire"
import { ACE_TRAINER_ID, aceReward } from "../data/ace"
import type { BadgeId } from "../data/cts"
import { createMonInstance } from "../battle/factory"
import { getTrainer } from "../data/trainers"
import { SBIRE_TRAINER_ID } from "../data/sbire"
import { toMonInstance } from "../storage/save"
import { evolveTeam } from "../progression/evolveTeam"
import { persistYellowSave, processSaiyanPoints } from "./saveManager"
import { QUOTA_CAPTURE_BONUS } from "../data/captureConfig"
import { moveCostReps, STRUGGLE_INDEX } from "../data/combatCostConfig"
import { battleEnergyCap } from "../data/badges"
import { mpLog } from "../multiplayer/mp"
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
    /** Numéro de victoire sur ACE (1-indexé) → message de récompense post-combat ; null sinon. */
    aceWin: number | null
    aceRewardMsg: string | null
    /** Badge d'arène gagné ce combat (→ notification post-combat) ; null sinon. */
    badgeAwarded: BadgeId | null
    /** Nom de l'attaque de la CT cadeau remise par le boss (notif) ; null sinon. */
    giftCtMove: string | null
    /** Contexte d'un combat JOUEUR vs JOUEUR (null = combat solo classique). */
    pvpCtx: PvpContext | null
}

/** Rôle canonique : A = challenger ("player" canonique), B = défié ("enemy" canonique). */
export type PvpRole = "A" | "B"

interface PvpContext {
    battleId: string
    role: PvpRole
    myUserId: string
    oppUserId: string
    oppNickname: string
    /** N° d'échange (incrémenté à chaque tour résolu) → match des actions relayées. */
    seq: number
    myAction: PlayerAction | null
    oppAction: PlayerAction | null
    /** Issue côté MOI (true=gagné, false=perdu, null=en cours). */
    won: boolean | null
    /** Désynchronisation détectée (checksum divergent) → combat à recharger. */
    desync: boolean
}

let storeState: BattleStoreState = { battle: null, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, badgeAwarded: null, giftCtMove: null, pvpCtx: null }
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
    setStore({ battle, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, badgeAwarded: null, giftCtMove: null })
}

export function startTrainerBattle(
    playerTeam: MonInstance[],
    enemyTeam: MonInstance[],
    seed: number,
    opts?: { trainerId?: string; reward?: number; aiLevel?: AiLevel; enemyEnergyCap?: number },
) {
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: opts?.aiLevel, enemyEnergyCap: opts?.enemyEnergyCap })
    syncPokedex(battle)
    const trainer = opts?.trainerId ? { trainerId: opts.trainerId, reward: opts.reward ?? 0 } : null
    setStore({ battle, evolutions: [], trainer, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, badgeAwarded: null, giftCtMove: null })
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
    return moveCostReps(getMove(slot.moveId)?.power ?? 0, me.level)
}

export function submitPlayerAction(action: PlayerAction) {
    const battle = storeState.battle
    if (!battle) return
    // Combat PvP : chemin réseau dédié (pas d'IA, résolution dual-déterministe).
    if (storeState.pvpCtx) { submitPvpAction(action); return }
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
        if (wild) addCaught(toMonInstance(wild), { quotaReached: getPlayer().wildCtx?.quotaReached })
    }

    // 2bis) Victoire dresseur : marquage "battu" (la monnaie = reps, gagnée hors combat).
    //       Chef d'arène → badge accordé (augmente cap reps + cap d'énergie + CT débloquées).
    //       CAS SPÉCIAL sbire : récurrent (2×/jour) → on N'enregistre PAS "battu"
    //       (sinon il deviendrait inaffrontable), juste le compteur + l'explication.
    let sbireWin: number | null = null
    let sbireRewardMsg: string | null = null
    let aceWin: number | null = null
    let aceRewardMsg: string | null = null
    let badgeAwarded: BadgeId | null = null
    let giftCtMove: string | null = null
    if (b.outcome === "win" && storeState.trainer) {
        if (storeState.trainer.trainerId === ACE_TRAINER_ID) {
            // ACE : sa défaite ratchete son niveau (+2 sur ton meilleur) + mémorise le contre.
            const aceTeam = getPlayer().team
            const best = Math.max(1, ...aceTeam.map((m) => m.level))
            const aceLast = aceTeam[aceTeam.length - 1]
            const aceLastTypes = aceLast ? (getSpecies(aceLast.speciesId)?.types ?? []) : []
            const winNum = recordAceDefeat(best, aceLastTypes, aceLast?.level ?? best)
            const r = aceReward(winNum)
            if (r.itemId) addItem(r.itemId, 1)
            if (r.reps) grantReps(r.reps)
            if (r.gift === "pantheon") {
                const lvls = getPlayer().team.map((m) => m.level)
                const lvl = lvls.length ? Math.min(...lvls) : 5 // niveau du plus faible de l'équipe présente
                addCaught(createMonInstance("pantheon", lvl, { owned: true }))
            }
            if (r.refund) grantReps(storeState.energySpent) // remboursement de l'énergie dépensée
            aceWin = winNum
            aceRewardMsg = r.message
        } else if (storeState.trainer.trainerId === SBIRE_TRAINER_ID) {
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
            const t = getTrainer(storeState.trainer.trainerId)
            if (t?.badge && awardBadge(t.badge)) badgeAwarded = t.badge
            // CT CADEAU remise gratuitement (trophée du boss) + nom pour la notif.
            if (t?.giftCt && grantCt(t.giftCt)) {
                const mvId = getCt(t.giftCt)?.moveId
                giftCtMove = mvId ? (getMove(mvId)?.name ?? null) : null
            }
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
    setStore({ battle: b, evolutions: evos, trainer: null, whiteout: isLose, sbireWin, sbireRewardMsg, aceWin, aceRewardMsg, badgeAwarded, giftCtMove })

    // 4) Sauvegarde persistante (DB).
    persistYellowSave()

    // 5) SAIYAN : convertit les niveaux gagnés ce combat en points (règle amende/quota).
    void processSaiyanPoints()
}

export function endBattle() {
    // On garde évolutions + whiteout : ils se jouent une fois le combat quitté.
    swapCache = { src: null, out: null }
    setStore({ battle: null, evolutions: storeState.evolutions, trainer: null, whiteout: storeState.whiteout, pvpCtx: null })
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

/** Consommé par la carte une fois la récompense d'ACE affichée. */
export function clearAceWin() {
    setStore({ ...storeState, aceWin: null, aceRewardMsg: null, badgeAwarded: null, giftCtMove: null })
}

/** Message de récompense d'ACE (lu au moment d'afficher le dialogue post-combat). */
export function getAceRewardMsg(): string | null {
    return storeState.aceRewardMsg
}

/** Consommé par la carte une fois la notification de badge affichée. */
export function clearBadgeAwarded() {
    setStore({ ...storeState, badgeAwarded: null, giftCtMove: null })
}

/** Nom de l'attaque de la CT cadeau remise par le boss (lu à l'affichage). */
export function getGiftCtMove(): string | null {
    return storeState.giftCtMove
}

// ============================================================
// PvP — combat joueur vs joueur (dual-déterministe, sans serveur d'arbitrage)
// ============================================================
//
// Les 2 clients gardent TOUJOURS le même état CANONIQUE (A="player", B="enemy")
// → clé du déterminisme. Pour l'INVITÉ (role B), useBattle() renvoie une vue
// INVERSÉE (mémoïsée) afin que BattleScreen affiche son équipe en bas sans
// modification. Toute la bascule de perspective est isolée ici.
//
// ⚠️ RISQUE : tout repose sur le fait que les 2 clients appellent resolveTurnPvp
//   avec le MÊME état + les MÊMES actions. Voir note mémoire casino-pvp.

function flipSide(s: SideId): SideId { return s === "player" ? "enemy" : "player" }
function flipOutcome(o: BattleState["outcome"]): BattleState["outcome"] {
    return o === "win" ? "lose" : o === "lose" ? "win" : o
}

function swapEvent(e: BattleEvent): BattleEvent {
    switch (e.kind) {
        case "hp":
        case "faint":
        case "status":
        case "switchIn":
            return { ...e, side: flipSide(e.side) }
        case "end": {
            const o = e.outcome
            return { ...e, outcome: o === "win" ? "lose" : o === "lose" ? "win" : o }
        }
        default:
            return e // message, ball : pas de notion de camp
    }
}

/** Vue inversée d'un état (affichage côté invité B). Pur. */
function swapBattle(b: BattleState): BattleState {
    return {
        ...b,
        player: b.enemy,
        enemy: b.player,
        forcedSwitch: b.forcedSwitch ? flipSide(b.forcedSwitch) : null,
        outcome: flipOutcome(b.outcome),
        events: b.events.map(swapEvent),
    }
}

// Cache de la vue inversée (réf. stable tant que l'état canonique ne change pas →
// requis par useSyncExternalStore).
let swapCache: { src: BattleState | null; out: BattleState | null } = { src: null, out: null }
function getDisplayBattle(): BattleState | null {
    const b = storeState.battle
    if (!b || storeState.pvpCtx?.role !== "B") return b
    if (swapCache.src !== b) swapCache = { src: b, out: swapBattle(b) }
    return swapCache.out
}

function mySide(ctx: PvpContext): SideId { return ctx.role === "A" ? "player" : "enemy" }

/**
 * Empreinte déterministe de l'état canonique (FNV-1a 32 bits) : PV/niveau/statut
 * de chaque Daemon + actif + seed + tour + phase. Identique des 2 côtés tant que
 * la synchro tient. Sert à DÉTECTER une désync (le checksum voyage avec l'action).
 */
function battleChecksum(b: BattleState): number {
    let h = 2166136261 >>> 0
    const add = (n: number) => { h = (h ^ (n >>> 0)) >>> 0; h = Math.imul(h, 16777619) >>> 0 }
    add(b.turn); add(b.phase === "ended" ? 1 : 0); add(b.seed >>> 0)
    for (const side of [b.player, b.enemy]) {
        add(side.activeIndex)
        for (const m of side.team) {
            add(m.currentHp); add(m.level)
            add(m.status === "NONE" ? 0 : m.status.charCodeAt(0))
        }
    }
    return h >>> 0
}

// Pont d'ENVOI : le hook réseau enregistre comment relayer une action (+ checksum).
let pvpSendHandler: ((seq: number, action: PlayerAction, checksum: number) => void) | null = null
export function setPvpSendHandler(fn: ((seq: number, action: PlayerAction, checksum: number) => void) | null) {
    pvpSendHandler = fn
}

/** Démarre un combat PvP (les 2 clients construisent le MÊME état canonique). */
export function startPvpBattle(battle: BattleState, ctx: Omit<PvpContext, "seq" | "myAction" | "oppAction" | "won" | "desync">) {
    swapCache = { src: null, out: null }
    mpLog("battle", "start", { battleId: ctx.battleId, role: ctx.role, checksum: battleChecksum(battle) })
    setStore({
        battle, evolutions: [], trainer: null, whiteout: false, energySpent: 0,
        sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, badgeAwarded: null, giftCtMove: null,
        pvpCtx: { ...ctx, seq: 0, myAction: null, oppAction: null, won: null, desync: false },
    })
}

const PLACEHOLDER_ACTION: PlayerAction = { kind: "move", moveIndex: 0 }

/** Action locale du joueur en PvP (remplace le chemin solo). */
function submitPvpAction(action: PlayerAction) {
    const ctx = storeState.pvpCtx
    const battle = storeState.battle
    if (!ctx || !battle || battle.phase === "ended") return
    if (action.kind !== "move" && action.kind !== "switch") return // v1 : move/switch only
    if (ctx.myAction) return // déjà joué ce tour
    // Changement forcé de l'ADVERSAIRE : je dois attendre (je ne joue pas ce tour).
    if (battle.forcedSwitch && battle.forcedSwitch !== mySide(ctx)) return

    // ÉNERGIE ILLIMITÉE en PvP (combat amical entre joueurs) : aucune déduction de reps ni
    // plafond — toutes les attaques sont jouables sans coût (cohérent avec l'UI canUse=true).

    // Stats PvP : Daemon fétiche + attaque favorite (sur les attaques).
    if (action.kind === "move") {
        const t = battle[mySide(ctx)]
        const meMon = t.team[t.activeIndex]
        if (meMon) recordPvpUse(meMon.speciesId, action.moveIndex >= 0 ? meMon.moves[action.moveIndex]?.moveId : undefined)
    }

    storeState = { ...storeState, pvpCtx: { ...ctx, myAction: action } }
    // Le checksum de l'état COURANT voyage avec l'action → l'adversaire détecte une désync.
    const checksum = battleChecksum(battle)
    mpLog("action↗", { seq: ctx.seq, action, checksum })
    pvpSendHandler?.(ctx.seq, action, checksum)
    emit()
    tryResolvePvp()
}

/** Reçoit l'action de l'adversaire (relayée par le hook réseau). */
export function receivePvpAction(seq: number, action: PlayerAction, checksum?: number) {
    const ctx = storeState.pvpCtx
    const battle = storeState.battle
    if (!ctx || !battle || seq !== ctx.seq) {
        mpLog("action↙", "ignoré (seq périmé)", { seq, attendu: ctx?.seq })
        return
    }
    // ⚠️ Détection de désync : l'adversaire a joué sur un état différent du mien.
    if (typeof checksum === "number") {
        const mine = battleChecksum(battle)
        if (checksum !== mine) {
            mpLog("DÉSYNC", { recu: checksum, mien: mine, seq })
            storeState = { ...storeState, pvpCtx: { ...ctx, desync: true } }
            emit()
            return // on n'applique rien : combat à recharger
        }
    }
    mpLog("action↙", { seq, action })
    storeState = { ...storeState, pvpCtx: { ...ctx, oppAction: action } }
    emit()
    tryResolvePvp()
}

/** Résout le tour dès que les actions nécessaires sont réunies. */
function tryResolvePvp() {
    const ctx = storeState.pvpCtx
    const battle = storeState.battle
    if (!ctx || !battle || battle.phase === "ended") return

    let actionA: PlayerAction, actionB: PlayerAction
    if (battle.forcedSwitch) {
        // Seul le camp forcé rejoue (un switch) ; l'autre n'agit pas ce tour.
        const forcedMine = battle.forcedSwitch === mySide(ctx)
        const forcedAct = forcedMine ? ctx.myAction : ctx.oppAction
        if (!forcedAct) return
        actionA = battle.forcedSwitch === "player" ? forcedAct : PLACEHOLDER_ACTION
        actionB = battle.forcedSwitch === "enemy" ? forcedAct : PLACEHOLDER_ACTION
    } else {
        if (!ctx.myAction || !ctx.oppAction) return
        actionA = ctx.role === "A" ? ctx.myAction : ctx.oppAction
        actionB = ctx.role === "A" ? ctx.oppAction : ctx.myAction
    }

    const next = resolveTurnPvp(battle, actionA, actionB)
    mpLog("resolve", { seq: ctx.seq, turn: next.turn, checksum: battleChecksum(next), phase: next.phase })
    setStore({ battle: next, pvpCtx: { ...ctx, seq: ctx.seq + 1, myAction: null, oppAction: null } })
    if (next.phase === "ended") finishPvpBattle(next)
}

/** Fin de combat PvP : CHAQUE client persiste SON propre camp (XP/KO réels). */
function finishPvpBattle(b: BattleState) {
    const ctx = storeState.pvpCtx
    if (!ctx) return
    const side = mySide(ctx)
    const won = ctx.role === "A" ? b.outcome === "win" : b.outcome === "lose"
    recordPvpResult(won ? "win" : "loss") // réputation

    setTeam(b[side].team.map(toMonInstance))
    const isLose = !won
    const team = getPlayer().team
    const evos = evolveTeam(team)
    if (evos.length > 0) {
        for (const e of evos) markCaught(e.toId)
        setTeam([...team])
    }
    // PvP : le perdant ne va PAS à l'infirmerie (whiteout=false) → il reste où il était pour
    // faciliter la revanche (ses Daemons restent K.O. jusqu'à un vrai passage au Centre).
    setStore({ battle: b, evolutions: evos, whiteout: false, pvpCtx: { ...ctx, won } })
    persistYellowSave()
    void processSaiyanPoints()
}

/** Fin par départ de l'adversaire. `deliberate` distingue un ABANDON volontaire (bouton →
 *  combat VALIDÉ, XP) d'une DÉCONNEXION (bug/réseau → combat ANNULÉ, aucune XP). */
export function pvpForfeit(byMe: boolean, deliberate = true) {
    const ctx = storeState.pvpCtx
    const battle = storeState.battle
    if (!ctx) return
    if (!battle || battle.phase === "ended") { setStore({ pvpCtx: null }); return }
    if (byMe) {
        // Je quitte : équipe mutée NON enregistrée (état d'avant-combat gardé).
        recordPvpResult("forfeit") // réputation : compté comme abandon (+ défaite)
        setStore({ battle: null, pvpCtx: null })
        persistYellowSave()
        return
    }
    // DÉCONNEXION de l'adversaire (non délibérée) → match ANNULÉ : aucune XP, aucun résultat
    // enregistré, je reviens sur la carte. (Évite le jackpot d'XP sur une coupure réseau.)
    if (!deliberate) {
        setStore({ battle: null, pvpCtx: null })
        return
    }
    // ABANDON délibéré → je gagne, je GARDE mon équipe (dégâts réels) et je touche l'XP
    // NORMALE (multiplier 1 : fini le ×2 qui faisait gagner ~7 niveaux d'un coup).
    const side = mySide(ctx)
    const ended = applyForfeitWin(battle, side, { multiplier: 1, headline: `${ctx.oppNickname} a abandonné le combat !` })
    recordPvpResult("win") // réputation
    setTeam(ended[side].team.map(toMonInstance))
    setStore({ battle: ended, pvpCtx: { ...ctx, won: true } })
    persistYellowSave()
    void processSaiyanPoints()
}

// ============================================================
// Hooks de lecture (React) — la référence reste stable entre tours.
// ============================================================

export function useBattle(): BattleState | null {
    // En PvP côté invité (B), renvoie la vue INVERSÉE mémoïsée (cf. getDisplayBattle).
    return useSyncExternalStore(subscribe, getDisplayBattle, getDisplayBattle)
}

/** Contexte PvP courant (null hors PvP). */
export function usePvpCtx(): PvpContext | null {
    return useSyncExternalStore(subscribe, () => getSnapshot().pvpCtx, () => getSnapshot().pvpCtx)
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

export function useAceWin(): number | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().aceWin,
        () => getSnapshot().aceWin,
    )
}

export function useBadgeAwarded(): BadgeId | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().badgeAwarded,
        () => getSnapshot().badgeAwarded,
    )
}
