// src/lib/gamebook/yellow/battle/engine.ts
//
// Nexus Jaune Éclair — MOTEUR DE TOUR (machine d'état, React-free, déterministe).
// Résout un tour complet : pré-checks de statut → ordre (priorité puis vitesse) →
// exécution des actions (précision, dégâts, effets) → fin de tour (résiduels) →
// KO / changement forcé / issue. Produit une FILE D'ÉVÉNEMENTS que l'UI rejoue.

import type { BattleMon, MonInstance, MajorStatus, MoveData, StageKey, PokeType } from "./types"
import { neutralStages } from "./types"
import { Rng } from "./rng"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { fullStats, effectiveStat, clampStage } from "./stats"
import { computeDamage, hasStab, critProbabilityGen1 } from "./damage"
import { heldOutgoingDmgMult, heldIncomingDmgMult, heldEffect } from "../data/heldItems"
import { talentEffect, talentOutgoingDmgMult, talentIncomingDmgMult } from "./talentEffects"
import { typeEffectiveness, effectivenessMessage, moveCategory, resolveAdaptiveStab } from "./typeChart"
import * as Status from "./status"
import { obedienceCap, disobeyChance } from "./obedience"
import { pinchBerry } from "./berries"
import { accuracyCheck } from "./accuracy"
import { chooseAiAction, type AiLevel } from "./ai"
import { xpForDefeat, applyExp } from "./xp"
import { tryCapture } from "./capture"
import { CAPTURE_ESCALATION_PER_ATTEMPT } from "../data/captureConfig"
import { ballBonusOf, getItem, isGuaranteedBall } from "../data/items"
import { STRUGGLE_MOVE_ID, STRUGGLE_INDEX, attackCost, QUOTA_STD } from "../data/combatCostConfig"
import { gainEv, signatureStat, EV_YIELD_PER_WIN } from "../data/evConfig"
import { MISS_CAPTURE_LINES } from "../data/missCaptureLines"

// ============================================================
// Types d'état & événements
// ============================================================

export type SideId = "player" | "enemy"

export type BattleEvent =
    | { kind: "message"; text: string }
    | { kind: "move"; side: SideId; moveId: string }   // attaque lancée → déclenche l'anim FX
    | { kind: "hp"; side: SideId; hp: number; max: number }
    | { kind: "faint"; side: SideId; name: string }
    | { kind: "status"; side: SideId; status: MajorStatus }
    | { kind: "switchIn"; side: SideId; name: string; teamIndex: number }
    | { kind: "ball"; action: "throw" | "shake" | "result" | "miss"; shakes?: number; caught?: boolean }
    | { kind: "end"; outcome: Outcome }

export type Outcome = "win" | "lose" | "run" | "caught" | "enemyfled"

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
    /** COMBAT DE DRESSEUR (flow Game Boy) — l'ENNEMI vient de perdre son Daemon actif et doit en
     *  envoyer un autre. On NE l'envoie PAS tout de suite : le KO est annoncé, le prochain Daemon
     *  adverse est annoncé (teamIndex), et on laisse au joueur une FENÊTRE de changement.
     *  Tant que ce champ est non-null, le combat est en PAUSE sur cette décision (cf. action "stay"
     *  ou "switch"). null hors de ce contexte (sauvage/PvP : pas de fenêtre, cf. checkFaints). */
    enemySendOut: { teamIndex: number } | null
    /** File d'événements du dernier tour résolu (vidée par l'UI). */
    events: BattleEvent[]
    /** État RNG persistant (déterministe / rejouable). */
    seed: number
    /** Bonus situationnel de capture (ex. quota PushQuest atteint). Défaut 1. */
    captureModifier: number
    /** ESCALADE : nb de lancers de Ball RATÉS sur le sauvage courant → chaque échec augmente la proba du
     *  prochain lancer (l'acharnement paie, surtout sur les cibles coriaces). Repart à 0 à chaque combat. */
    captureAttempts: number
    /** uids des Daemons du joueur qui ont COMBATTU (envoyés au moins une fois). */
    participated: string[]
    /** Par ENNEMI (uid) → uids des Daemons joueur qui l'ont AFFRONTÉ. Seuls eux gagnent
     *  SON XP (on ne gagne pas l'XP d'un ennemi qu'on n'a pas affronté → évite l'évo trop rapide). */
    participants: Record<string, string[]>
    /** Combat JOUEUR vs JOUEUR : XP attribuée AUX DEUX camps (au vainqueur de chaque KO). */
    pvp: boolean
    /** Budget d'énergie de l'ENNEMI (ACE) : il paie ses attaques, struggle à sec. null = illimité. */
    enemyEnergy: { spent: number; cap: number } | null
    /** Proba de FUITE (0..100). Dégressive (anti-spam de rencontres) : 100 puis -10 par fuite
     *  consécutive, plancher 30. Calculée par le store et figée pour ce combat. Défaut 100. */
    fleeChance: number
    /** Transitoire : le Daemon JOUEUR a-t-il pu exécuter son action ce tour ? false s'il a été
     *  mis K.O. avant d'agir (adversaire plus rapide) → le store rembourse alors les reps. */
    lastPlayerActed?: boolean
    /** DÉFI CT (labo) : cumul des dégâts INFLIGÉS PAR LE JOUEUR ce combat, par type d'attaque (PvE solo).
     *  Lu en fin de combat (finishBattle) pour alimenter le défi. Absent en PvP. */
    dmgByType?: Partial<Record<PokeType, number>>
    /** STAT de partie : XP de combat cumulée gagnée par l'équipe ce combat (lue en fin de combat). */
    xpGained?: number
    /** ZONE DE COMBAT (Frontier) : objets/soins interdits (« pas de potion ») → le SAC est masqué. */
    noItems?: boolean
    /** Multiplicateur d'XP gagnée (1 = normal ; <1 au Frontier pour limiter le farming). */
    expMult?: number
    /** OBÉISSANCE : nb de badges du joueur, injecté par le store à la création (PvE). Pilote le cap de
     *  niveau au-dessus duquel un Daemon ÉCHANGÉ peut DÉSOBÉIR. Absent → obéissance totale (aucun gate). */
    playerBadgeCount?: number
}

export type PlayerAction =
    | { kind: "move"; moveIndex: number }
    | { kind: "switch"; teamIndex: number }
    | { kind: "ball"; itemId: string }
    | { kind: "item"; itemId: string }
    | { kind: "run" }
    /** Fenêtre d'envoi adverse (combat de Dresseur) : GARDER son Daemon face à l'envoi ennemi. */
    | { kind: "stay" }

// Action interne résolue pour un camp (le joueur ET l'IA produisent ça).
interface ResolvedAction {
    side: SideId
    kind: "move" | "switch" | "run"
    moveIndex?: number
    teamIndex?: number
    /** uid du Daemon pour qui l'action a été choisie (début de tour). Si l'actif a changé
     *  entre-temps (KO + auto-switch), l'action est annulée → pas d'attaque « gratuite ». */
    actorUid?: string
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
    opts: { isWild: boolean; seed: number; aiLevel?: AiLevel; captureModifier?: number; pvp?: boolean; enemyEnergyCap?: number; fleeChance?: number; noItems?: boolean; expMult?: number; playerBadgeCount?: number },
): BattleState {
    // Le joueur envoie son premier Daemon ENCORE DEBOUT (pas un K.O. en tête de liste).
    const playerStart = playerTeam.findIndex((m) => m.currentHp > 0)
    const enemyStart = enemyTeam.findIndex((m) => m.currentHp > 0)
    const playerStartIdx = playerStart >= 0 ? playerStart : 0
    const leadUid = playerTeam[playerStartIdx]?.uid
    const enemyLeadUid = enemyTeam[enemyStart >= 0 ? enemyStart : 0]?.uid
    return {
        player: { team: playerTeam.map(toBattleMon), activeIndex: playerStartIdx },
        enemy: { team: enemyTeam.map(toBattleMon), activeIndex: enemyStart >= 0 ? enemyStart : 0 },
        isWild: opts.isWild,
        aiLevel: opts.aiLevel ?? (opts.isWild ? "wild" : "trainer"),
        turn: 1,
        phase: "select",
        outcome: null,
        forcedSwitch: null,
        enemySendOut: null,
        events: [],
        seed: opts.seed >>> 0,
        captureModifier: opts.captureModifier ?? 1,
        captureAttempts: 0,
        participated: leadUid ? [leadUid] : [],
        participants: enemyLeadUid && leadUid ? { [enemyLeadUid]: [leadUid] } : {},
        pvp: opts.pvp ?? false,
        enemyEnergy: opts.enemyEnergyCap != null ? { spent: 0, cap: opts.enemyEnergyCap } : null,
        fleeChance: opts.fleeChance ?? 100,
        noItems: opts.noItems ?? false,
        expMult: opts.expMult ?? 1,
        playerBadgeCount: opts.playerBadgeCount,
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

    // ============================================================
    // FENÊTRE D'ENVOI ADVERSE (combat de Dresseur — flow Game Boy)
    // ------------------------------------------------------------
    // Le KO adverse a déjà été annoncé + le prochain Daemon ennemi annoncé (checkFaints).
    // On a laissé au joueur le choix : CHANGER (switch) ou RESTER (stay). Quelle que soit
    // sa décision, on fait ENTRER ensuite le Daemon adverse annoncé. Ce n'est PAS un vrai
    // tour (aucune attaque de part ni d'autre) → on n'avance pas le compteur de tour.
    // ============================================================
    if (state.enemySendOut) {
        // 1) Le joueur change AVANT l'entrée adverse — gratuit (face-à-face d'envois, pas de
        //    coup offert : l'ennemi entre lui aussi). Toute autre action ("stay", etc.) = rester.
        if (playerAction.kind === "switch") {
            doSwitch(state, "player", playerAction.teamIndex!, events)
        }
        // Double KO : la décision du joueur consomme aussi son éventuel changement forcé.
        state.forcedSwitch = null
        // 2) L'ennemi envoie le Daemon annoncé (re-vérification de vie par sécurité).
        const planned = state.enemySendOut.teamIndex
        const idx = (state.enemy.team[planned]?.currentHp ?? 0) > 0 ? planned : firstAliveIndex(state.enemy)
        if (idx >= 0) doSwitch(state, "enemy", idx, events)
        state.enemySendOut = null
        // 3) Garde-fou : si le joueur était lui-même K.O. et n'a pas changé (ne devrait pas
        //    arriver — l'UI impose le choix dans ce cas) → on re-déclenche son changement forcé.
        if (active(state.player).currentHp <= 0 && hasAlive(state.player)) state.forcedSwitch = "player"
        return commit(state, events, rng, prev.turn, /*advance*/ false)
    }

    // VERROU DE CHARGE (move à 2 tours) : un Daemon joueur en pleine charge LIBÈRE sa décharge ce
    // tour. EXCEPTION : le joueur peut le RAPPELER (switch) pour ANNULER la charge (choix tactique) ;
    // toute autre action (objet/fuite/autre attaque) est remplacée par la décharge.
    const pCharge = active(state.player).chargingMove
    if (pCharge && state.forcedSwitch !== "player" && playerAction.kind !== "switch") {
        const ci = active(state.player).moves.findIndex((m) => m.moveId === pCharge)
        if (ci >= 0) playerAction = { kind: "move", moveIndex: ci }
        else { const me = active(state.player); me.chargingMove = undefined; me.semiInvuln = undefined } // soupape : move disparu → on déverrouille (symétrie avec chooseEnemyAction)
    }

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
        // Proba de fuite DÉGRESSIVE (anti-spam de rencontres, cf. battleStore). Succès → on file.
        // (Pas de message intermédiaire « Tu prends la fuite » : l'écran de fin affiche déjà
        //  « Tu as pris la fuite. » — un seul temps de validation.)
        if (rng.chance(state.fleeChance)) {
            state.phase = "ended"
            state.outcome = "run"
            events.push({ kind: "end", outcome: "run" })
            return commit(state, events, rng, prev.turn, false)
        }
        // Échec : l'ennemi profite du tour (comme une capture ratée).
        events.push({ kind: "message", text: "Impossible de fuir !" })
        const ea = chooseEnemyAction(state, rng)
        // L'ennemi profite du tour — SAUF s'il dort / est gelé / paralysé / apeuré (canAct, comme la boucle normale).
        if (active(state.enemy).currentHp > 0 && ea.kind === "move" && canAct(active(state.enemy), events, rng)) {
            performMove(state, "enemy", ea.moveIndex!, events, rng)
            checkFaints(state, events)
        }
        if (state.phase !== "ended") { endOfTurn(state, events, rng); checkFaints(state, events) }
        return commit(state, events, rng, prev.turn, true)
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
        // L'ennemi profite du tour — SAUF s'il dort / est gelé / paralysé / apeuré (canAct, comme la boucle normale).
        if (active(state.enemy).currentHp > 0 && ea.kind === "move" && canAct(active(state.enemy), events, rng)) {
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
            // SAUF s'il dort / est gelé / paralysé / apeuré (canAct).
            else if (ea.kind === "move" && canAct(active(state.enemy), events, rng)) { performMove(state, "enemy", ea.moveIndex!, events, rng); checkFaints(state, events) }
        }
        if (state.phase !== "ended") { endOfTurn(state, events, rng); checkFaints(state, events) }
        return commit(state, events, rng, prev.turn, true)
    }

    // "stay" n'a de sens que DANS la fenêtre d'envoi adverse (gérée tout en haut). Hors de ce
    // contexte c'est un no-op sûr (ne devrait jamais arriver — l'UI ne le propose que là).
    if (playerAction.kind === "stay") {
        return commit(state, events, rng, prev.turn, /*advance*/ false)
    }

    // --- Construit les actions des deux camps ---
    const enemyAction = chooseEnemyAction(state, rng)
    enemyAction.actorUid = active(state.enemy).uid
    const playerResolved: ResolvedAction = {
        side: "player",
        kind: playerAction.kind,
        moveIndex: playerAction.kind === "move" ? playerAction.moveIndex : undefined,
        teamIndex: playerAction.kind === "switch" ? playerAction.teamIndex : undefined,
        actorUid: active(state.player).uid,
    }

    // Les switchs passent AVANT les attaques.
    const order = orderActions(state, playerResolved, enemyAction, rng)

    let playerActed = false
    for (const act of order) {
        if (state.phase === "ended") break
        const cur = active(state[act.side])
        // L'actif est KO (action adverse) → il n'agit pas. OU l'actif a été REMPLACÉ depuis le
        // choix d'action (KO + auto-switch en cours de tour) → l'action pré-choisie est annulée,
        // sinon le remplaçant porterait une attaque « gratuite » (bug #10).
        if (cur.currentHp <= 0 || (act.actorUid && cur.uid !== act.actorUid)) continue

        if (act.kind === "switch") {
            doSwitch(state, act.side, act.teamIndex!, events)
        } else if (act.kind === "move") {
            // OBÉISSANCE (PvE only) : un Daemon ÉCHANGÉ (traded), au-dessus du cap lié aux badges, peut DÉSOBÉIR :
            // il ignore l'ordre (tour perdu, MAIS énergie remboursée → playerActed reste false, pas de double peine).
            // RNG seedé ; consommé UNIQUEMENT pour un traded over-cap → resolveTurnPvp intact + RNG inchangé sinon.
            let disobeyed = false
            if (!state.pvp && act.side === "player" && cur.traded === true) {
                const cap = obedienceCap(state.playerBadgeCount ?? 5)
                if (cur.level > cap && rng.chance(disobeyChance(cur.level, cap))) {
                    disobeyed = true
                    events.push({ kind: "message", text: `${displayName(cur)} n'en fait qu'à sa tête et IGNORE ton ordre ! 😾 (pas assez de badges pour le commander)` })
                }
            }
            // Pré-check de statut (peur/sommeil/gel/paralysie) AVANT d'agir : si le Daemon ne peut PAS
            // agir, l'attaque N'A PAS LIEU → playerActed reste false → le store rembourse les reps.
            if (!disobeyed && canAct(cur, events, rng)) {
                if (act.side === "player") playerActed = true
                performMove(state, act.side, act.moveIndex!, events, rng)
            }
        }
        checkFaints(state, events)
    }
    // #4 : le store rembourse les reps si l'attaque du joueur n'est jamais partie (KO avant d'agir).
    state.lastPlayerActed = playerResolved.kind === "move" ? playerActed : true

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
        // DOUBLE-KO : si l'AUTRE camp est lui aussi K.O. (les deux actifs sont tombés le même tour),
        // on enchaîne sur SON changement forcé → chacun choisit, l'un après l'autre (player puis enemy).
        const o = other(side)
        if (active(state[o]).currentHp <= 0 && hasAlive(state[o])) state.forcedSwitch = o
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
        const cur = active(state[act.side])
        if (cur.currentHp <= 0) continue // KO entre-temps → n'agit pas
        if (act.kind === "switch") doSwitch(state, act.side, act.teamIndex!, events)
        // Pré-check de statut (peur/sommeil/gel/paralysie) AVANT d'agir — IDENTIQUE au solo (resolveTurn).
        // SANS ça, en PvP un Daemon endormi/gelé/paralysé/apeuré attaquait quand même (bug). canAct
        // consomme le RNG seedé de la même façon sur les 2 clients → déterminisme/checksum préservés.
        else if (act.kind === "move" && canAct(cur, events, rng)) performMove(state, act.side, act.moveIndex!, events, rng)
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
    // Vive Griffe (objet) OU talent Main leste : X % d'agir en premier à priorité égale (avant le départage à la vitesse).
    const pqc = (heldEffect(active(state.player))?.quickClawPct ?? 0) + (talentEffect(active(state.player))?.quickClawPct ?? 0)
    const eqc = (heldEffect(active(state.enemy))?.quickClawPct ?? 0) + (talentEffect(active(state.enemy))?.quickClawPct ?? 0)
    const pProc = pqc > 0 && rng.chance(pqc)
    const eProc = eqc > 0 && rng.chance(eqc)
    if (pProc !== eProc) return pProc ? [p, e] : [e, p]
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
        state.enemyEnergy.spent += attackCost(getMove(attacker.moves[moveIndex]?.moveId ?? ""), attacker.level, QUOTA_STD)
    }

    // (Pré-checks de statut peur/sommeil/gel/paralysie : faits par l'appelant AVANT performMove,
    //  pour rembourser les reps si l'attaque n'a pas lieu — cf. resolveTurn.)

    // PP illimités : la seule limite est le coût en reps (déduit côté store).
    const fxMoveId = isStruggle ? STRUGGLE_MOVE_ID : (slot?.moveId ?? "")
    events.push({ kind: "message", text: `${displayName(attacker)} utilise ${move.name} !` })
    events.push({ kind: "move", side, moveId: fxMoveId }) // APRÈS le message : l'anim joue, puis les dégâts

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

    // --- TUNNEL : une cible SOUS TERRE (semiInvuln) est INTOUCHABLE → TOUT move la manque (statut compris).
    //     EXCEPTION : un move « coup sûr » (Météores, sureHit) la touche quand même (ignore l'invulnérabilité). ---
    if (defender.semiInvuln && !move.effect?.sureHit) {
        events.push({ kind: "message", text: `${displayName(defender)} est hors d'atteinte : l'attaque le manque !` })
        return
    }

    // --- TUNNEL (dig) : 2 tours avec invulnérabilité. PHASE 1 (creuser) traitée AVANT l'accuracyCheck →
    //     l'enfouissement ne RATE jamais ; PHASE 2 (jaillir) = décharge auto (comme twoTurn), sans jet. ---
    if (move.effect?.dig) {
        if (attacker.chargingMove === (slot?.moveId ?? move.id)) {
            // PHASE 2 : ressort + frappe (power du move). L'invulnérabilité tombe.
            attacker.chargingMove = undefined
            attacker.semiInvuln = undefined
            events.push({ kind: "message", text: `${displayName(attacker)} jaillit du sol !` })
            dealMoveDamage(state, side, move, rng, events)
            return
        }
        // PHASE 1 : creuse et disparaît (INVULNÉRABLE), aucun dégât ce tour.
        attacker.chargingMove = slot?.moveId ?? move.id
        attacker.semiInvuln = true
        events.push({ kind: "message", text: `${displayName(attacker)} creuse un tunnel et disparaît sous terre !` })
        return
    }

    // --- VOL (fly) : jumeau de Tunnel, invulnérabilité AÉRIENNE. PHASE 1 = s'envole (INVULNÉRABLE) ;
    //     PHASE 2 = fond du ciel et frappe (power du move). Météores (sureHit) le touche en vol. ---
    if (move.effect?.fly) {
        if (attacker.chargingMove === (slot?.moveId ?? move.id)) {
            attacker.chargingMove = undefined
            attacker.semiInvuln = undefined
            events.push({ kind: "message", text: `${displayName(attacker)} fond depuis le ciel !` })
            dealMoveDamage(state, side, move, rng, events)
            return
        }
        attacker.chargingMove = slot?.moveId ?? move.id
        attacker.semiInvuln = true
        events.push({ kind: "message", text: `${displayName(attacker)} s'envole haut dans le ciel !` })
        return
    }

    // --- ESSAIM VORACE : lancer un AUTRE move brise la frénésie (le compteur d'essaim retombe à 0). ---
    if (!move.effect?.escalatingDrain) attacker.swarmStacks = 0

    // --- Précision ---
    if (!accuracyCheck(move, attacker, defender, rng)) {
        attacker.swarmStacks = 0 // un raté brise aussi la frénésie de l'Essaim Vorace
        events.push({ kind: "message", text: `${displayName(attacker)} rate son attaque !` })
        return
    }

    // --- Move à 2 TOURS (charge → décharge), ex. Surtension de VOLTA ---
    if (move.effect?.twoTurn) {
        if (attacker.chargingMove === (slot?.moveId ?? move.id)) {
            // PHASE 2 : libération automatique — frappe foudroyante (power 100, coup normal).
            attacker.chargingMove = undefined
            events.push({ kind: "message", text: `${displayName(attacker)} libère sa décharge !` })
            dealMoveDamage(state, side, { ...move, power: 100, effect: undefined }, rng, events)
            return
        }
        // PHASE 1 : décharge faible (power du move) + statChanges (ex. -2 Vitesse), puis on CHARGE.
        const r1 = dealMoveDamage(state, side, move, rng, events)
        if (r1.typeEff > 0 && active(defSide).currentHp > 0 && move.effect.statChanges) {
            for (const sc of move.effect.statChanges) {
                applyStatChange(state, sc.target === "self" ? side : other(side), sc.stat, sc.stages, events)
            }
        }
        attacker.chargingMove = slot?.moveId ?? move.id
        events.push({ kind: "message", text: `${displayName(attacker)} accumule une surtension… elle se libèrera au prochain tour !` })
        return
    }

    // --- DÉGÂTS FIXES (ex. Draco-Rage, Gen 1) : inflige TOUJOURS N PV, indépendamment des stats,
    //     du STAB et du multiplicateur de type. Respecte uniquement l'IMMUNITÉ de type (×0). ---
    if (move.effect?.fixedDamage || move.effect?.fixedDamageLevel) {
        const eff = typeEffectiveness(move.type, speciesOf(defender).types)
        if (eff === 0) {
            events.push({ kind: "message", text: "Ça n'affecte pas l'adversaire…" })
            return
        }
        // Frappe Atlas : dégâts = niveau du lanceur ; sinon dégâts fixes constants (Draco-Rage).
        const amount = move.effect.fixedDamageLevel ? attacker.level : (move.effect.fixedDamage ?? 0)
        const dmg = Math.min(amount, active(defSide).currentHp)
        applyDamage(state, other(side), amount, events)
        events.push({ kind: "message", text: `${displayName(defender)} encaisse ${dmg} PV de dégâts fixes !` })
        return
    }

    // Gen 1 : un move sans puissance est un move de STATUT (effet pur).
    if (move.power <= 0) {
        // BRUME SPORALE (façon Buée Noire) : réinitialise TOUS les changements de stats des 2 camps.
        if (move.effect?.resetStats) {
            active(state.player).stages = neutralStages()
            active(state.enemy).stages = neutralStages()
            events.push({ kind: "message", text: `Un voile de spores dissipe tous les changements de stats !` })
            return
        }
        applyStatusMove(state, side, move, events, rng)
        return
    }

    // --- Capacité offensive (gère multi-hit) ---
    let hits = move.effect?.multiHit ? rng.int(move.effect.multiHit[0], move.effect.multiHit[1]) : 1
    // TALENT Frappe répétée : +5 % de chance d'un coup SUPPLÉMENTAIRE sur les attaques multi-coups.
    const mhBonus = talentEffect(active(state[side]))?.multiHitBonus
    if (move.effect?.multiHit && mhBonus && rng.chance(mhBonus)) hits += 1
    let landed = 0
    let lastEff = 1
    for (let h = 0; h < hits; h++) {
        if (active(defSide).currentHp <= 0) break
        const res = dealMoveDamage(state, side, move, rng, events)
        lastEff = res.typeEff
        if (res.dealt > 0 || res.typeEff > 0) landed++
        // GEL : une attaque de type FEU qui touche DÉGÈLE la cible (façon Gen 1).
        if (move.type === "FEU" && res.dealt > 0 && active(defSide).status === "FREEZE") {
            active(defSide).status = "NONE"
            active(defSide).statusCounter = 0
            events.push({ kind: "message", text: `${displayName(active(defSide))} est dégelé par la chaleur !` })
        }
        // Drain / recul basés sur les dégâts de CE coup.
        if (move.effect?.drainPct && res.dealt > 0) {
            // ESSAIM VORACE : drain CROISSANT (20 + 10×coups consécutifs, plafond 70%) piloté par swarmStacks.
            let pct = move.effect.drainPct
            if (move.effect.escalatingDrain) {
                pct = Math.min(70, 20 + (attacker.swarmStacks ?? 0) * 10)
                attacker.swarmStacks = Math.min((attacker.swarmStacks ?? 0) + 1, 5)
            }
            const heal = Math.max(1, Math.floor((res.dealt * pct) / 100))
            applyHeal(state, side, heal, events)
            events.push({ kind: "message", text: `${displayName(attacker)} récupère de l'énergie !` })
        }
        if (move.effect?.recoilPct && res.dealt > 0) {
            // TALENT Endurant : recul ×0.75 (−¼).
            const recoilMult = talentEffect(attacker)?.recoilMult ?? 1
            const recoil = Math.max(1, Math.floor((res.dealt * move.effect.recoilPct / 100) * recoilMult))
            applyDamage(state, side, recoil, events)
            events.push({ kind: "message", text: `${displayName(attacker)} est blessé par le contrecoup !` })
        }
    }
    // KAMIKAZE (ex. « Détonation » de Bouh) : après les dégâts, l'attaquant ne garde QU'1 PV (au lieu
    // de s'auto-K.O. comme une vraie Destruction) → il reste "systématiquement à 1 PV", prêt à capturer.
    if (move.effect?.selfHpToOne && landed > 0) {
        const self = active(state[side])
        if (self.currentHp > 1) {
            self.currentHp = 1
            events.push({ kind: "hp", side, hp: 1, max: maxHpOf(self) })
            events.push({ kind: "message", text: `${displayName(self)} se disloque dans la déflagration… il ne lui reste qu'1 PV !` })
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

    const rawStats = fullStats(attacker, atkSpecies)
    const rawDefStats = fullStats(defender, defSpecies)
    // TYPE & CATÉGORIE EFFECTIFS. Défaut : ceux du move (Gen 1 : catégorie par TYPE). STAB ADAPTATIF
    // (CT « Apothéose ») : le type devient un type du Daemon ALIGNÉ sur sa MEILLEURE stat offensive, et la
    // catégorie SUIT cette stat → toujours STAB, frappant avec la bonne stat (ex. Feu mais PHYSIQUE).
    let effType = move.type
    let isPhysical = (move.category ?? moveCategory(move.type)) === "PHYSICAL"
    if (move.effect?.adaptiveStab) {
        const adapted = resolveAdaptiveStab(atkSpecies.types, rawStats.atk, rawStats.spc)
        effType = adapted.type
        isPhysical = adapted.isPhysical
    }
    const eff = typeEffectiveness(effType, defSpecies.types)
    if (eff === 0) return { dealt: 0, typeEff: 0 }
    const atk = isPhysical
        ? effectiveStat(rawStats.atk, "atk", attacker.stages.atk, attacker.status)
        : effectiveStat(rawStats.spc, "spc", attacker.stages.spc, attacker.status)
    const def = isPhysical
        ? effectiveStat(rawDefStats.def, "def", defender.stages.def, "NONE")
        : effectiveStat(rawDefStats.spc, "spc", defender.stages.spc, "NONE")

    // Crit Gen 1 : probabilité liée à la Vitesse de base de l'attaquant.
    const critOverride = move.effect?.critChanceForSpecies?.[attacker.speciesId]
    // Lentilscope (objet) OU talent Coup du sort : booste le taux de crit (façon high-crit).
    const scopeLens = !!heldEffect(attacker)?.critStage || !!talentEffect(attacker)?.critStage
    const antiCrit = talentEffect(defender)?.incomingCritMult ?? 1 // talent Sang-froid tactique : −5 % de crit subi
    let isCrit = critOverride !== undefined
        ? rng.next() < critOverride
        : rng.next() < critProbabilityGen1(atkSpecies.baseStats.spe, move.effect?.highCrit || scopeLens) * antiCrit
    // BÉNÉDICTION barman (potion "triple prix", SOLO) : crit GARANTI au prochain coup, puis consommé.
    // Le tirage RNG ci-dessus est conservé (déterminisme intact) ; on ne fait que forcer le résultat.
    if (attacker.nextCritGuaranteed) { isCrit = true; attacker.nextCritGuaranteed = false }
    // TALENT Cuirasse mentale : le 1er coup porté du combat est un critique GARANTI, puis consommé.
    if (talentEffect(attacker)?.guaranteedCritOnce && !attacker.talentCritUsed) { isCrit = true; attacker.talentCritUsed = true }
    const stab = hasStab(effType, atkSpecies.types)
    // OBJET TENU + TALENT : boost de type / réduction phys / bonus conditionnels (STAB, low-HP, super-eff, type principal, crit).
    const tOutCtx = { stab, typeEff: eff, isCrit, moveType: effType, mainType: atkSpecies.types[0], targetHpFrac: defender.currentHp / Math.max(1, maxHpOf(defender)) }
    const itemMult = heldOutgoingDmgMult(attacker, effType) * heldIncomingDmgMult(defender, isPhysical)
        * talentOutgoingDmgMult(attacker, tOutCtx) * talentIncomingDmgMult(defender, { typeEff: eff, isPhysical })
    const result = computeDamage({
        level: attacker.level,
        power: move.power,
        attack: atk,
        defense: def,
        stab,
        typeEff: eff,
        isCrit,
        // TALENT Fine lame : plancher du facteur aléatoire relevé (dégâts plus réguliers). RNG consommé à l'identique.
        randomFactor: Math.max(talentEffect(attacker)?.minRandom ?? 0, rng.damageFactor()),
        itemMult,
    })

    // OBJET TENU — Bandeau (Focus Band) : depuis PV PLEINS, X % de survivre à 1 PV à un coup fatal.
    let dealt = result.damage
    const defHeld = heldEffect(defender)
    // Bandeau (objet) OU talent Instinct de survie : % de survivre à 1 PV depuis PV pleins.
    const survivePct = (defHeld?.survive1hpPct ?? 0) + (talentEffect(defender)?.survive1hpPct ?? 0)
    if (survivePct > 0 && dealt >= defender.currentHp && defender.currentHp === maxHpOf(defender)
        && rng.next() < survivePct / 100) {
        dealt = Math.max(1, defender.currentHp - 1)
        events.push({ kind: "message", text: `${displayName(defender)} s'accroche à 1 PV !` })
    }
    applyDamage(state, other(side), dealt, events)
    // Record À VIE de l'attaquant (flavor affiché dans la fiche, persisté).
    if (dealt > (attacker.bestDmg ?? 0)) { attacker.bestDmg = dealt; attacker.bestDmgMove = move.name }
    // Record de CE COMBAT uniquement (runtime, repart de 0 à chaque combat) → débrief GOAT.
    if (dealt > (attacker.battleBestDmg ?? 0)) { attacker.battleBestDmg = dealt; attacker.battleBestDmgMove = move.name }
    // DÉFI CT (labo) : cumule les dégâts infligés PAR LE JOUEUR, par type d'attaque (PvE solo uniquement).
    // Placé APRÈS applyDamage → aucun RNG consommé ensuite (isCrit/randomFactor tirés avant) → déterminisme intact.
    if (!state.pvp && side === "player" && dealt > 0) {
        if (!state.dmgByType) state.dmgByType = {}
        state.dmgByType[effType] = (state.dmgByType[effType] ?? 0) + dealt // effType : prend en compte le STAB adaptatif
    }
    // Grelot Coque (objet) OU talent Sangsue : soigne l'attaquant d'une fraction des dégâts infligés.
    const atkHeld = heldEffect(attacker)
    const drainFrac = atkHeld?.drainDealtFrac ?? talentEffect(attacker)?.drainDealtFrac
    if (drainFrac && dealt > 0 && attacker.currentHp > 0) {
        applyHeal(state, side, Math.max(1, Math.floor(dealt / drainFrac)), events)
    }
    // Roche Royale (objet) + talent Regard perçant : % d'apeurer la cible (flinch), atténué par le talent Corps sain.
    const flinchPct = ((atkHeld?.flinchPct ?? 0) + (talentEffect(attacker)?.flinchOut ?? 0)) * (talentEffect(defender)?.flinchResistMult ?? 1)
    if (flinchPct > 0 && dealt > 0 && defender.currentHp > 0 && rng.next() < flinchPct / 100) {
        defender.volatiles.FLINCH = 1
        events.push({ kind: "message", text: `${displayName(defender)} hésite, intimidé !` })
    }
    if (isCrit) events.push({ kind: "message", text: "Coup critique !" })
    const effMsg = effectivenessMessage(eff)
    if (effMsg) events.push({ kind: "message", text: effMsg })

    return { dealt, typeEff: eff }
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
    if (fx.restSleep) {
        // REPOS : le LANCEUR s'endort volontairement pour EXACTEMENT 1 tour (compteur 2 → rate 1 tour,
        // se réveille et agit au tour suivant). Écrase tout statut existant (on « dort » son mal).
        selfMon.status = "SLEEP"
        selfMon.statusCounter = 2
        events.push({ kind: "status", side, status: "SLEEP" })
        events.push({ kind: "message", text: `${displayName(selfMon)} s'endort profondément pour récupérer !` })
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
    // TALENTS : Chanceux/Toxine tenace (+5 % chance, attaquant) ; Nerfs d'acier (−5 % si ça inflige un statut, défenseur).
    let chance = (fx.chance ?? 100) * (talentEffect(active(state[side]))?.statusChanceMult ?? 1)
    if (fx.inflictStatus) chance *= talentEffect(active(state[other(side)]))?.statusResistMult ?? 1
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
    // BAIE PURE : neutralise immédiatement le statut qu'on vient d'infliger, puis se consomme.
    const cure = heldEffect(mon)
    if (cure?.berryCureStatus) {
        mon.status = "NONE"; mon.statusCounter = 0
        mon.heldItem = undefined
        events.push({ kind: "message", text: `${displayName(mon)} : la ${cure.name} neutralise le statut !` })
    }
}

function applyVolatile(mon: BattleMon, vol: NonNullable<MoveData["effect"]>["inflictVolatile"], rng: Rng, events: BattleEvent[], named: BattleMon) {
    if (!vol) return
    if (vol === "CONFUSION") {
        if (mon.volatiles.CONFUSION) return
        // Compteur 2-5 → 1 à 4 tours EFFECTIFS de confusion (décrément-puis-soin au dernier), façon Gen 1.
        mon.volatiles.CONFUSION = rng.int(2, 5)
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
    const tal = talentEffect(mon)
    if (delta < 0 && mon.stages[stat] > -6) {
        // OBJET TENU — Herbe Blanche : annule la prochaine BAISSE de stat réelle, puis se consomme.
        if (heldEffect(mon)?.negateStatDrop) {
            mon.heldItem = undefined
            events.push({ kind: "message", text: `${displayName(mon)} : l'Herbe Blanche annule la baisse de ${labelStat(stat)} !` })
            return
        }
        // TALENT Volonté de fer : annule la 1re baisse de stat du combat (one-shot, façon Herbe Blanche).
        if (tal?.negateStatDrop && !mon.talentStatGuardUsed) {
            mon.talentStatGuardUsed = true
            events.push({ kind: "message", text: `${displayName(mon)} : sa Volonté de fer annule la baisse de ${labelStat(stat)} !` })
            return
        }
    }
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
        // Proba de RESTER gelé DÉCROISSANTE : 100% (1er tour) → 90 → 80 … → 20% (plancher). Le compteur =
        // nb de tours déjà gelé. (Une attaque de type FEU qui touche DÉGÈLE aussi, cf. dealMoveDamage.)
        const stayFrozen = Status.freezeStayFrozen(mon.statusCounter, rng)
        mon.statusCounter += 1
        if (!stayFrozen) {
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
        // Restes (objet) OU talent Cœur vaillant : régénère une fraction des PV max en fin de tour.
        const lefto = heldEffect(mon)?.leftoversFrac ?? talentEffect(mon)?.leftoversFrac
        if (lefto && mon.currentHp > 0 && mon.currentHp < maxHpOf(mon)) {
            applyHeal(state, side, Math.max(1, Math.floor(maxHpOf(mon) / lefto)), events)
            events.push({ kind: "message", text: `${displayName(mon)} récupère un peu de PV.` })
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
    triggerPinchBerry(state, side, events) // BAIE : soin/boost quand les PV passent bas (consommée)
}

// BAIE réactive « pinch » : quand le porteur (encore debout) tombe sous le seuil de PV → soin (⅓) OU +1 stat (¼),
// puis se consomme. Déterministe (aucun RNG) → identique en PvE et PvP. Le K.O. est géré par la Baie Phénix (checkFaints).
function triggerPinchBerry(state: BattleState, side: SideId, events: BattleEvent[]) {
    const mon = active(state[side])
    if (mon.currentHp <= 0) return
    const it = heldEffect(mon)
    if (!it) return
    const max = maxHpOf(mon)
    const trig = pinchBerry(it, mon.currentHp / max)
    if (!trig) return
    mon.heldItem = undefined // consommée au déclenchement
    if (trig.kind === "heal") {
        applyHeal(state, side, Math.max(1, Math.floor(max * trig.frac)), events)
        events.push({ kind: "message", text: `${displayName(mon)} : la ${it.name} restaure ses PV !` })
    } else {
        mon.stages[trig.stat] = clampStage(mon.stages[trig.stat] + 1)
        events.push({ kind: "message", text: `${displayName(mon)} : la ${it.name} le galvanise !` })
    }
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
    // Réinitialise stages/volatils du sortant. Une charge en cours (move 2 tours) est ANNULÉE
    // UNIQUEMENT pour le Daemon qui quitte le terrain (le lanceur) — pas pour l'adversaire.
    const out = s.team[s.activeIndex]
    out.stages = neutralStages()
    // La CONFUSION n'est PAS soignée par le changement (choix Sartay, ≠ Gen 1) → on la préserve.
    const keepConfusion = out.volatiles.CONFUSION
    out.volatiles = keepConfusion ? { CONFUSION: keepConfusion } : {}
    out.chargingMove = undefined
    out.semiInvuln = undefined // le sortant ressort du tunnel (annule une charge Tunnel en cours)
    out.swarmStacks = 0        // se retirer brise la frénésie de l'Essaim Vorace
    s.activeIndex = teamIndex
    const incoming = s.team[teamIndex]
    // Le Daemon entrant a "participé" → il partagera l'XP des futurs K.O. (joueur uniquement).
    if (side === "player" && !state.participated.includes(incoming.uid)) {
        state.participated.push(incoming.uid)
    }
    events.push({ kind: "switchIn", side, name: displayName(incoming), teamIndex })
    events.push({ kind: "message", text: side === "player" ? `En avant, ${displayName(incoming)} !` : `L'adversaire envoie ${displayName(incoming)} !` })
    events.push({ kind: "hp", side, hp: incoming.currentHp, max: maxHpOf(incoming) })
    recordMatchup(state)
}

/** Mémorise que le Daemon joueur actif a AFFRONTÉ l'ennemi actif (partage d'XP par ennemi). */
function recordMatchup(state: BattleState) {
    const e = active(state.enemy), p = active(state.player)
    if (!e || !p) return
    const set = (state.participants[e.uid] ??= [])
    if (!set.includes(p.uid)) set.push(p.uid)
}

function checkFaints(state: BattleState, events: BattleEvent[]) {
    for (const side of ["player", "enemy"] as SideId[]) {
        const s = state[side]
        const mon = active(s)
        if (mon.currentHp <= 0 && !(mon as any).__fainted) {
            // BAIE PHÉNIX : une seule fois, survit à 1 PV au lieu de tomber K.O.
            const rev = heldEffect(mon)
            if (rev?.berryRevive && !(mon as any).__phoenixUsed) {
                mon.currentHp = 1
                ;(mon as any).__phoenixUsed = true
                mon.heldItem = undefined
                events.push({ kind: "hp", side, hp: 1, max: maxHpOf(mon) })
                events.push({ kind: "message", text: `${displayName(mon)} : la ${rev.name} le maintient à 1 PV !` })
                continue
            }
            ;(mon as any).__fainted = true
            events.push({ kind: "faint", side, name: displayName(mon) })
            events.push({ kind: "message", text: `${displayName(mon)} est K.O. !` })
            // PvP : le camp ADVERSE (celui dont l'actif vient de KO l'autre) gagne l'XP.
            // Solo : l'XP de CET ennemi est versée IMMÉDIATEMENT aux Daemons ayant combattu et
            // encore debout (par Pokémon, pas en fin de combat — cf. awardExp).
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
    // ── Changement forcé après KO ──
    // PvP : les DEUX camps sont des JOUEURS → CHACUN choisit son remplaçant (jamais d'auto-switch :
    // c'était le bug "le suivant part tout seul" côté défié). On arme UN camp à la fois (player en
    // PREMIER = ordre fixe, déterministe sur les 2 clients) ; en DOUBLE-KO (les deux actifs tombés le
    // même tour) le 2e camp est RÉ-ARMÉ juste après le switch du 1er (cf. resolveTurnPvp, bloc forced
    // -> changements forcés SÉQUENTIELS). Le store ne gère qu'un forced à la fois → cette séquence
    // réutilise la machinerie existante sans risque de désync (doSwitch ne consomme aucun RNG).
    if (state.pvp) {
        if (active(state.player).currentHp <= 0) state.forcedSwitch = "player"
        else if (active(state.enemy).currentHp <= 0) state.forcedSwitch = "enemy"
        return
    }
    // SOLO / SAUVAGE — l'actif ennemi (IA) est K.O. et il lui reste des Daemons → il doit en envoyer un.
    if (active(state.enemy).currentHp <= 0 && !state.enemySendOut) {
        const enemyIdx = firstAliveIndex(state.enemy)
        // COMBAT DE DRESSEUR — flow Game Boy : on N'envoie PAS le suivant tout de suite. On ANNONCE le
        // prochain Daemon adverse et on laisse le joueur décider de changer (fenêtre gérée en tête de
        // resolveTurn). EXCEPTION : si le joueur est LUI AUSSI K.O. (double KO), il devra de toute façon
        // changer → la fenêtre "rester/changer" n'a pas de sens, on enchaîne l'envoi (historique).
        // SAUVAGE : pas de fenêtre — auto-switch immédiat.
        if (!state.isWild && active(state.player).currentHp > 0 && enemyIdx >= 0) {
            state.enemySendOut = { teamIndex: enemyIdx }
            events.push({ kind: "message", text: `L'adversaire va envoyer ${displayName(state.enemy.team[enemyIdx])} !` })
        } else {
            doSwitch(state, "enemy", enemyIdx, events)
        }
    }
    // Le joueur doit choisir un remplaçant si son actif est K.O.
    if (active(state.player).currentHp <= 0) {
        state.forcedSwitch = "player"
    }
}

/** Délègue le choix de l'adversaire à l'IA (ai.ts) selon le niveau de difficulté. */
export function chooseEnemyAction(state: BattleState, rng: Rng): ResolvedAction {
    const self = active(state.enemy)
    const foe = active(state.player)
    // VERROU DE CHARGE (move à 2 tours) : prioritaire sur tout → l'ennemi libère sa décharge.
    if (self.chargingMove) {
        const ci = self.moves.findIndex((m) => m.moveId === self.chargingMove)
        if (ci >= 0) return { side: "enemy", kind: "move", moveIndex: ci }
        self.chargingMove = undefined; self.semiInvuln = undefined // sécurité : move perdu → on déverrouille
    }
    // OPENING SCRIPTÉ (boss) : l'attaque imposée passe AVANT l'IA et le budget d'énergie
    // ("quoi qu'il arrive"). Consommée une par une, uniquement quand ce Daemon est actif.
    if (self.openingMoves && self.openingMoves.length > 0) {
        const forced = self.openingMoves.shift()!
        const idx = self.moves.findIndex((m) => m.moveId === forced)
        if (idx >= 0) return { side: "enemy", kind: "move", moveIndex: idx }
        // Sécurité : move non connu → entrée retirée, on enchaîne sur l'IA normale ce tour.
    }
    const choice = chooseAiAction(self, foe, state.enemy.team, state.enemy.activeIndex, state.aiLevel, rng)
    if (choice.kind === "switch" && choice.teamIndex !== undefined) {
        return { side: "enemy", kind: "switch", teamIndex: choice.teamIndex }
    }
    let moveIndex = choice.moveIndex ?? 0
    // Budget d'énergie (ACE) : si l'attaque choisie est inabordable, prendre la
    // meilleure attaque abordable ; à sec → Charge Désespérée (gratuite).
    if (state.enemyEnergy) {
        const remaining = state.enemyEnergy.cap - state.enemyEnergy.spent
        const costOf = (i: number) => attackCost(getMove(self.moves[i]?.moveId ?? ""), self.level, QUOTA_STD)
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

// PARTAGE DÉGRESSIF de l'XP (Sartay) selon l'ordre de participation : les 2 premiers Daemon
// ayant affronté l'ennemi touchent 100%, le 3e 60%, le 4e 30%, les 5e/6e 10% (au-delà : 10%).
const XP_SHARE_LADDER = [1, 1, 0.6, 0.3, 0.1, 0.1]

/**
 * XP attribuée IMMÉDIATEMENT à la chute de CHAQUE adversaire (par Pokémon, pas en fin de combat).
 * RÈGLE (Sartay) : seuls les Daemons ayant AFFRONTÉ cet ennemi ET ENCORE DEBOUT à l'instant de
 * sa chute en profitent → un Daemon KO ne touche plus rien à partir de sa chute, mais GARDE ce
 * qu'il a gagné avant. Partage dégressif selon l'ordre de participation (XP_SHARE_LADDER).
 * L'EXPÉRIENCE DE COMBAT (EV) reste réservée au Daemon actif (coup fatal).
 */
function awardExp(state: BattleState, events: BattleEvent[]) {
    const fainted = active(state.enemy)
    const winner = active(state.player)
    const faintedSp = speciesOf(fainted)
    const gain = Math.round(xpForDefeat(faintedSp.baseExp, fainted.level, state.isWild) * (state.expMult ?? 1))

    // EV uniquement au Daemon actif s'il est encore debout.
    if (winner.currentHp > 0) gainEv(winner, signatureStat(faintedSp), EV_YIELD_PER_WIN)

    // Daemons ayant affronté CET ennemi (pas l'XP d'ennemis jamais vus → évite les évos trop
    // rapides) ET ENCORE DEBOUT, dans l'ordre de participation → pilote le rang du partage.
    const credited = state.participants[fainted.uid] ?? []
    const aliveOrdered = state.participated.filter((uid) =>
        credited.includes(uid) && ((state.player.team.find((m) => m.uid === uid)?.currentHp ?? 0) > 0),
    )
    for (const mon of state.player.team) {
        const rank = aliveOrdered.indexOf(mon.uid)
        if (rank < 0) continue // n'a pas affronté cet ennemi, ou KO à l'instant de sa chute → rien
        const share = XP_SHARE_LADDER[rank] ?? 0.1
        const finalGain = Math.max(1, Math.round(gain * share * (heldEffect(mon)?.expMult ?? 1) * (talentEffect(mon)?.expMult ?? 1))) // Œuf Chance +50% / talent Studieux +5%
        const isActive = mon === winner
        const beforeMax = maxHpOf(mon)
        const res = applyExp(mon, finalGain)
        state.xpGained = (state.xpGained ?? 0) + finalGain // STAT de partie : XP cumulée ce combat (lue en fin de combat)
        events.push({ kind: "message", text: `${displayName(mon)} gagne ${finalGain} points d'Exp !` })
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
    // SUPER MÉGA NEXUS-BALL : capture GARANTIE de GOSHENDOFY s'il est sous 50% de ses PV (shunte le verrou
    // de statut et la formule). Hors de ce cas précis, elle se comporte comme une Ball très forte (bonus 6).
    const goshGuaranteed = itemId === "super_mega_nexus_ball" && wild.speciesId === "goshendofy" && wild.currentHp < maxHpOf(wild) * 0.5
    events.push({ kind: "message", text: `Tu lances une ${getItem(itemId)?.name ?? "Ball"} !` })
    // VERROU DE BALL (ex. Zappeuréal = Hyper Ball+) : une Ball trop faible n'accroche JAMAIS — la
    // Master Ball (capture garantie) shunte ce verrou. Lancer raté théâtral + message dédié, le tour
    // est consommé mais aucune capture. Placé AVANT tryCapture → le tirage RNG reste intact pour la suite.
    // Un STATUT majeur peut SHUNTER l'exigence de Ball (ex. Bouh : Super Ball+ OU sous statut).
    const statusBypassesBall = wild.captureStatusBypassesBall && wild.status !== "NONE"
    if (wild.captureMinBallBonus != null && !isGuaranteedBall(itemId) && ballBonusOf(itemId) < wild.captureMinBallBonus && !statusBypassesBall) {
        events.push({ kind: "ball", action: "miss" })
        events.push({ kind: "message", text: `La Ball ricoche sans même s'ouvrir… ${displayName(wild)} est bien trop instable pour une Ball aussi faible !` })
        return
    }
    // VERROU DE STATUT (hommage légendaire Gen1, ex. Goshendofy) : incapturable tant qu'il n'a pas de
    // statut majeur (para/sommeil/poison/brûlure/gel). La Master Ball shunte. Placé AVANT tryCapture.
    if (wild.captureRequiresStatus && wild.status === "NONE" && !isGuaranteedBall(itemId) && !goshGuaranteed) {
        events.push({ kind: "ball", action: "miss" })
        events.push({ kind: "message", text: `${displayName(wild)} dévie la Ball d'un revers ! Il faudra l'affaiblir par un STATUT avant d'espérer le capturer…` })
        return
    }
    const res = isGuaranteedBall(itemId) || goshGuaranteed
        ? { caught: true, shakes: 3, value: Infinity }
        : tryCapture(
            {
                catchRate: sp.catchRate, currentHp: wild.currentHp, maxHp: maxHpOf(wild), status: wild.status,
                // captureMult (<1) rend la capture PLUS DURE (ex. Thundah/Bélunode). ESCALADE : chaque lancer
                // raté (captureAttempts) augmente la proba du prochain (×(1 + 0,4×N)) → l'acharnement paie.
                ballBonus: ballBonusOf(itemId), level: wild.level, extraBonus: state.captureModifier * (wild.captureMult ?? 1) * (1 + CAPTURE_ESCALATION_PER_ATTEMPT * state.captureAttempts),
            },
            rng,
        )
    if (res.caught) {
        // RÉUSSITE : animation classique (la ball file → secousses → clic) puis capture.
        events.push({ kind: "ball", action: "throw" })           // la ball file vers le Daemon
        events.push({ kind: "ball", action: "shake", shakes: res.shakes }) // secousses (0..3)
        events.push({ kind: "ball", action: "result", caught: true }) // clic
        state.phase = "ended"
        state.outcome = "caught"
        events.push({ kind: "message", text: `Gagné ! ${displayName(wild)} est capturé !` })
        events.push({ kind: "end", outcome: "caught" })
    } else {
        // ÉCHEC = lancer RATÉ THÉÂTRAL (et NON l'animation « presque attrapé ») : la ball part
        // de travers, manque la cible et sort de l'écran (event "miss", joué côté UI), puis une
        // punchline moqueuse aléatoire. Le Daemon reste visible (on l'a raté, pas effleuré).
        // Tirage via le RNG seedé → déterministe/rejouable (la capture est wild-only, hors PvP).
        events.push({ kind: "ball", action: "miss" })
        // Garde-fou : si la liste n'est pas chargée (module non résolu en dev), on ne plante PAS
        // le tour (sinon la capture ratée ne ferait « rien ») → fallback de secours.
        const lines = MISS_CAPTURE_LINES ?? []
        const line = lines.length > 0 ? lines[rng.int(0, lines.length - 1)] : "Raté ! La Ball revient bredouille."
        events.push({ kind: "message", text: line })
        state.captureAttempts++ // ESCALADE : le prochain lancer sur ce sauvage sera un peu plus sûr.
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
    if (advance && state.phase !== "ended") {
        state.turn = prevTurn + 1
        // FUITE SAUVAGE PROGRAMMÉE (Centrale) : certains Daemons électriques décrochent du combat une
        // fois leur quota de tours écoulé (Boltah ≤5, Heatah ≤3 ; Thundah ne fuit jamais → pas de champ).
        // prevTurn = le tour qui vient d'être joué → le Daemon a agi prevTurn fois. Fin de combat SANS
        // récompense ni pénalité de fleeStreak (l'ennemi part, ce n'est pas le joueur qui fuit).
        const wild = active(state.enemy)
        if (state.isWild && wild.fleeAfterTurns != null && wild.currentHp > 0 && prevTurn >= wild.fleeAfterTurns) {
            state.phase = "ended"
            state.outcome = "enemyfled"
            events.push({ kind: "message", text: `${displayName(wild)} décroche et file à toute vitesse ! Plus moyen de le rattraper…` })
            events.push({ kind: "end", outcome: "enemyfled" })
        }
    }
    return state
}

function structuredCloneState(s: BattleState): BattleState {
    return {
        ...s,
        player: { activeIndex: s.player.activeIndex, team: s.player.team.map(cloneMon) },
        enemy: { activeIndex: s.enemy.activeIndex, team: s.enemy.team.map(cloneMon) },
        events: [],
        participated: [...s.participated],
        participants: Object.fromEntries(Object.entries(s.participants).map(([k, v]) => [k, [...v]])),
        enemyEnergy: s.enemyEnergy ? { ...s.enemyEnergy } : null,
        // Deep-clone défensif (cohérent avec enemyEnergy) : évite tout partage de référence
        // de l'objet { teamIndex } avec l'état précédent détenu par le store.
        enemySendOut: s.enemySendOut ? { ...s.enemySendOut } : null,
        // Cumul dégâts/type (défi CT) : copie pour ne pas partager la réf entre tours.
        dmgByType: s.dmgByType ? { ...s.dmgByType } : undefined,
    }
}

function cloneMon(m: BattleMon): BattleMon {
    return {
        ...m,
        ivs: { ...m.ivs },
        moves: m.moves.map((mv) => ({ ...mv })),
        stages: { ...m.stages },
        volatiles: { ...m.volatiles },
        // copie profonde : l'opening scripté est consommé (shift) par tour sans muter l'état précédent.
        ...(m.openingMoves ? { openingMoves: [...m.openingMoves] } : {}),
    }
}
