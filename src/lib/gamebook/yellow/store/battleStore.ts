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
import type { MonInstance, PokeType, MoveSlot } from "../battle/types"
import { markSeen, markCaught, getPokedex } from "./pokedexStore"
import { getPlayer, setTeam, addCaught, consumeItem, markTrainerDefeated, markTrainerRematched, healAllTeam, spendReps, awardBadge, recordSbireWin, grantReps, addItem, recordPvpResult, recordPvpUse, recordAceDefeat, grantCt, markGekrocResolved, recordHhCollectorWin, setChampion, setNgplusMaitreBeaten, setBerrySecretKnown, isBerrySecretKnown, recordOrcalineDefeat, orcalineLevelForWins, markSylvebarbeAwake, addCtDamage, grantRouletteTicket, grantRouletteCredit, consumeBattleBlessing, getActiveWorld, getNgplusNemesisSpeciesId, incNgplusBattles, bumpStat, bumpLeaguePotions, addRun3Defeated, markCaughtThisRun, markRun3LavapetitSeen, markRun3LavapetitCaught, getRun3ThirdStarter } from "./playerStore"
import { getItem } from "../data/items"
import { reportShiny } from "../shinyGift"
import { ARENA_TICKET_VALUE, SBIRE_TICKET_VALUE, SBIRE_TICKET_EVERY, ACE_TICKET_VALUE, ACE_TICKET_WIN_BEFORE, ACE_TICKET_WIN_AFTER, ACE_TICKET_EARLY_VALUE, ACE_TICKET_WIN_EARLY, LEAGUE_ROULETTE_PER_KO, LEAGUE_AUTOGRAPH_CREDIT } from "../data/labDefis"
import { getCt } from "../data/cts"
import { NGPLUS_BOSS_GIFTS, arenaRevancheBoost } from "../data/ngplusArenas"
import { run3ArenaBossTeam } from "../data/run3Bosses"
import { run3ArenaForBoss } from "../data/run3Arenas"
import { bossEnemyKey, leagueEnemyKey } from "../data/run3Score"
import { BERRY_SECRET_LINES_DRUIDE } from "../data/berryLore"
import { getMove, getMoveByName } from "../data/moves"
import { getSpecies } from "../data/species"
import { SBIRE_REWARD_REPS, SBIRE_REWARD_REPS_3, SBIRE_REWARD_REPS_5, SBIRE_REWARD_BALL_ID, SBIRE_REWARD_BALL_ID_4, SBIRE_REWARD_CT_ID, SBIRE_REWARD_CT_FALLBACK_REPS } from "../data/sbire"
import { ACE_TRAINER_ID, aceReward, aceWinTaunt, speciesAtLevel } from "../data/ace"
import { ORCALINE_TRAINER_ID, ORCALINE_GIFT_SPECIES, ORCALINE_GIFT_LEVEL, ORCALINE_BALL_REWARD_ID, ORCALINE_BALL_AT_LEVEL, orcalineTrainerDialogue } from "../data/orcalineTrainer"
import { GEKROC_STONE_ITEM } from "../data/gekroc"
import { frontierEnergyRefund, FRONTIER_EXP_MULT } from "../frontier/engine"
import { HH_COLLECTOR_ID, HH_COLLECTOR_CT, HH_COLLECTOR_DONE_LINES, HH_COLLECTOR_WINS_NEEDED, HH_COLLECTOR_SPECTRES_NEEDED } from "../data/hauntedNpcs"
import type { BadgeId } from "../data/cts"
import { createMonInstance } from "../battle/factory"
import { getTrainer } from "../data/trainers"
import { SBIRE_TRAINER_ID } from "../data/sbire"
import { toMonInstance, type LeagueHighlight, type ChampionRun, type ChampionMon } from "../storage/save"
import { fullStats } from "../battle/stats"
import { evolveTeam, type TeamEvolution } from "../progression/evolveTeam"
import { persistYellowSave, processSaiyanPoints, getNgplusOldTeam } from "./saveManager"
import { QUOTA_CAPTURE_BONUS } from "../data/captureConfig"
import { attackCost, effectiveQuota, STRUGGLE_INDEX } from "../data/combatCostConfig"
import { battleEnergyCap } from "../data/badges"
import { mpLog } from "../multiplayer/mp"

/** Espèce de l'adversaire actif (pour synchroniser le Pokédex). */
function enemyActiveSpeciesId(b: BattleState): string | null {
    const m = b.enemy.team[b.enemy.activeIndex]
    return m ? m.speciesId : null
}

/** Met à jour le Pokédex depuis l'état de combat (vu, et capturé si applicable). */
function syncPokedex(b: BattleState) {
    const sp = enemyActiveSpeciesId(b)
    if (!sp) return
    const caught = b.outcome === "caught"
    // SURPRISE : Gékroc / Goshendofy restent MASQUÉS du Pokédex (même pas « vu ») tant que NON capturés.
    if (caught || !getSpecies(sp)?.hiddenUntilCaught) markSeen(sp)
    if (caught) { markCaught(sp); markCaughtThisRun(sp) } // Pokédex GLOBAL + overlay « capturé ce run » (per-monde)
}

/** Contexte d'un combat de dresseur (récompense + marquage "battu"). */
interface TrainerContext {
    trainerId: string
    reward: number
    /** Ce combat est un REMATCH (2e équipe) → récompense rematch au lieu de badge/CT initiale. */
    isRematch: boolean
}

interface BattleStoreState {
    battle: BattleState | null
    /** Évolutions à jouer (cinématique post-combat). */
    evolutions: TeamEvolution[]
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
    /** Raillerie d'ACE quand IL gagne (le joueur a perdu) → affichée à la défaite ; null sinon. */
    aceLossTaunt: string | null
    /** Badge d'arène gagné ce combat (→ notification post-combat) ; null sinon. */
    badgeAwarded: BadgeId | null
    /** Nom de l'attaque de la CT cadeau remise par le boss (notif) ; null sinon. */
    giftCtMove: string | null
    /** Message de don de la Pierre Gékroc (mini-boss Centrale) → notification post-combat ; null sinon. */
    stoneReward: string | null
    lavapetitTeaser: "seen" | "caught" | null // RUN 3 : teaser Dieu Spag Lavapetit à afficher (transitoire)
    /** Récompense d'un REMATCH de dresseur (dialogue post-combat : énergie / CT Mirage) ; null sinon. */
    rematchReward: { npcId: string; npcName: string; lines: string[] } | null
    /** Contexte d'un combat JOUEUR vs JOUEUR (null = combat solo classique). */
    pvpCtx: PvpContext | null
    /** PREMIÈRE capture d'une espèce → popup post-combat (sprite + description + punchline +
     *  proposition de surnom). null sinon. Renseigné en fin de combat, consommé par l'UI. */
    newDexEntry: { speciesId: string; uid: string; level: number } | null
    /** LIGUE : sacre du CHAMPION (après LE MAÎTRE) → Hall of Fame post-combat (équipe + best-of). null sinon. */
    championRun: ChampionRun | null
    /** ARÈNE : victoire d'un boss de gym (badge gagné) → Hall of Fame par arène (équipe gelée). null sinon. */
    arenaRun: { badgeId: BadgeId; team: ChampionMon[]; world: "live" | "ngplus" | "run3" } | null // world : run 1/2/3 → HoF séparé (préfixe badge)
    /** Dresseur dont le REMATCH doit s'enchaîner DIRECTEMENT après cette victoire (ex. VOLTA 2 phases). null sinon. */
    chainRematchId: string | null
    /** Au moins un Daemon a une attaque EN ATTENTE d'apprentissage → prompt post-combat (façon Gen 1). */
    pendingLearn: boolean
    /** DUEL reflet (Viridian/arène eau) terminé : issue à traiter par l'UI (récompenses) ; null sinon. */
    duelResult: { won: boolean } | null
    /** ZONE DE COMBAT : combat d'une série Frontier terminé → l'UI enchaîne la vague suivante / clôt la série. */
    frontierResult: { won: boolean } | null
    /** Un Daemon vient d'être CAPTURÉ (n'importe quelle espèce) → signal transitoire pour l'UI
     *  (ex. carrousel d'explication de la génétique au 1er usage). Consommé/effacé par l'UI. */
    justCaught: boolean
    /** NG+ : le MAÎTRE vient d'être battu EN New Game+ → il reste à affronter l'ancienne équipe (combat de fin
     *  de Ligue). Posé au sacre NG+, consommé par l'UI (qui lance le combat après le Hall of Fame). */
    ngplusFinalPending: boolean
    /** NG+ : issue du combat de fin de Ligue contre l'ancienne équipe (trainerId "ngplus:final"). null sinon. */
    ngplusFinalResult: { won: boolean } | null
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

let storeState: BattleStoreState = { battle: null, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, pvpCtx: null, newDexEntry: null, championRun: null, arenaRun: null, chainRematchId: null, pendingLearn: false, duelResult: null, frontierResult: null, stoneReward: null, lavapetitTeaser: null, justCaught: false, ngplusFinalPending: false, ngplusFinalResult: null }
// LIGUE — meilleurs moments du run en cours (best hit par membre du Conseil 4 + Maître), runtime.
// Upsert par trainerId à chaque victoire de la Ligue ; lus au sacre du Maître pour le Hall of Fame.
const leagueHighlights: Record<string, LeagueHighlight> = {}
const listeners = new Set<() => void>()

// #2 — FUITE anti-spam : compteur de fuites consécutives (session). Chaque fuite RÉUSSIE durcit
// la suivante (100% → -10% par fuite, plancher 30%). Remis à 0 dès qu'on ENGAGE vraiment un
// combat (victoire / défaite / capture) → seul le SPAM de fuites est pénalisé.
let fleeStreak = 0
function wildFleeChance(): number { return Math.max(30, 100 - 10 * fleeStreak) }
/** Remet la fuite à 100% (appelé au soin de l'infirmerie : nouvelle boucle d'explo propre). */
export function resetFleeStreak() { fleeStreak = 0 }

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

// ============================================================
// #8 — PERSISTANCE DU COMBAT (anti-fuite au refresh)
// ------------------------------------------------------------
// Un refresh en plein combat de DRESSEUR ne doit PAS valoir une fuite gratuite (skip d'un boss,
// PV de l'équipe conservés…). On sérialise le combat dans localStorage à chaque tour ; au
// chargement on le REPREND tel quel — BattleState est 100% sérialisable (le RNG vit dans `seed`,
// reconstruit à chaque resolveTurn). Effacé dès la fin du combat. finishBattle ne dépend de
// storeState que via `trainer` + `energySpent` → ces deux-là suffisent à l'instantané.
// EXCLUS : PvP (réseau dual-client, désync) et séries Frontier (orchestration de vagues non
// reprenable ici). FAIL-SAFE : toute relecture invalide efface l'instantané et retombe sur la carte.
const BATTLE_LS_KEY = "pq_yellow_battle_v1"
const BATTLE_LS_MAX_AGE_MS = 24 * 3600 * 1000 // au-delà → instantané ignoré (anti-zombie)

function battlePersistable(b: BattleState | null, ctx: TrainerContext | null): boolean {
    if (!b || b.phase === "ended" || b.pvp) return false
    if (ctx?.trainerId?.startsWith("frontier:")) return false // série de vagues : pas reprenable ici
    return true
}

/** Écrit l'instantané du combat courant (no-op si non reprenable ou hors navigateur). */
function persistBattleSnapshot(): void {
    if (typeof window === "undefined") return
    try {
        const { battle, trainer, energySpent } = storeState
        if (!battlePersistable(battle, trainer)) { window.localStorage.removeItem(BATTLE_LS_KEY); return }
        // events = file de playback UI du DERNIER tour (déjà vue par le joueur) → on la VIDE dans
        // l'instantané pour reprendre DIRECTEMENT au point de décision (sinon le tour se rejoue).
        const snap = { ...battle, events: [] }
        window.localStorage.setItem(BATTLE_LS_KEY, JSON.stringify({ v: 1, ts: Date.now(), battle: snap, trainer, energySpent }))
    } catch { /* quota / sérialisation : on ignore (au pire = comportement d'avant) */ }
}

/** Efface l'instantané (fin de combat, sortie, ou relecture invalide). */
function clearBattleSnapshot(): void {
    if (typeof window === "undefined") return
    try { window.localStorage.removeItem(BATTLE_LS_KEY) } catch { /* ignore */ }
}

/** REPREND un combat sauvegardé après un refresh. Renvoie true si un combat a été restauré.
 *  À appeler au chargement (après hydratation du joueur). Fail-safe total : efface + ignore si invalide. */
export function resumeBattleFromStorage(): boolean {
    if (typeof window === "undefined" || storeState.battle) return false
    let raw: string | null = null
    try { raw = window.localStorage.getItem(BATTLE_LS_KEY) } catch { return false }
    if (!raw) return false
    try {
        const o = JSON.parse(raw) as { v?: number; ts?: number; battle?: BattleState; trainer?: TrainerContext | null; energySpent?: number }
        if (o.v !== 1 || !o.battle) { clearBattleSnapshot(); return false }
        if (typeof o.ts === "number" && Date.now() - o.ts > BATTLE_LS_MAX_AGE_MS) { clearBattleSnapshot(); return false }
        const b = o.battle
        // Validation défensive : combat en cours, équipes saines, espèces résolubles.
        if (b.phase === "ended" || b.pvp || !b.player?.team?.length || !b.enemy?.team?.length) { clearBattleSnapshot(); return false }
        for (const m of [...b.player.team, ...b.enemy.team]) if (!getSpecies(m.speciesId)) { clearBattleSnapshot(); return false }
        setStore({ battle: b, trainer: o.trainer ?? null, energySpent: o.energySpent ?? 0, evolutions: [], whiteout: false, pvpCtx: null })
        return true
    } catch { clearBattleSnapshot(); return false }
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
    const battle = createBattle(playerTeam, enemyTeam, { isWild: true, seed, captureModifier, fleeChance: wildFleeChance(), playerBadgeCount: getPlayer().badges.length })
    syncPokedex(battle) // adversaire "vu" dès la rencontre
    setStore({ battle, evolutions: [], trainer: null, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null })
    persistBattleSnapshot() // #8 : instantané anti-fuite (refresh)
}

export function startTrainerBattle(
    playerTeam: MonInstance[],
    enemyTeam: MonInstance[],
    seed: number,
    opts?: { trainerId?: string; reward?: number; aiLevel?: AiLevel; enemyEnergyCap?: number; isRematch?: boolean },
) {
    const isFrontier = !!opts?.trainerId?.startsWith("frontier:")
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: opts?.aiLevel, enemyEnergyCap: opts?.enemyEnergyCap, noItems: isFrontier, expMult: isFrontier ? FRONTIER_EXP_MULT : undefined, playerBadgeCount: getPlayer().badges.length })
    syncPokedex(battle)
    const trainer = opts?.trainerId ? { trainerId: opts.trainerId, reward: opts.reward ?? 0, isRematch: opts.isRematch ?? false } : null
    setStore({ battle, evolutions: [], trainer, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null })
    persistBattleSnapshot() // #8 : instantané anti-fuite (refresh) — dresseurs reprenables
}

// ════════════════ HALL OF FAME — affronter une équipe de champion FIGÉE ════════════════
/** Reconstruit un combattant à partir d'un champion figé (ChampionMon) : stats EXACTES du sacre
 *  (frozenStats → fullStats les renvoie telles quelles) + attaques retrouvées par leur NOM. */
function championToInstance(m: ChampionMon, idx: number): MonInstance {
    const moves: MoveSlot[] = m.moves
        .map((name) => getMoveByName(name))
        .filter((mv): mv is NonNullable<ReturnType<typeof getMoveByName>> => !!mv)
        .slice(0, 4)
        .map((mv) => ({ moveId: mv.id, pp: mv.pp, ppMax: mv.pp }))
    if (moves.length === 0) moves.push({ moveId: "charge", pp: 35, ppMax: 35 }) // garde-fou : jamais sans attaque
    return {
        uid: `hof-${idx}-${m.speciesId}`,
        speciesId: m.speciesId,
        nickname: m.nickname,
        level: m.level,
        exp: 0,
        ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 },
        currentHp: m.stats.hp,
        status: "NONE",
        statusCounter: 0,
        moves,
        shiny: m.shiny,
        frozenStats: { ...m.stats },
        owned: false,
    }
}

/** Gèle une équipe en ChampionMon[] (stats calculées, attaques par nom d'affichage) — même logique que le
 *  snapshot du Hall of Fame, réutilisable (NG+ : fige l'ANCIENNE équipe comme adversaire de fin de Ligue). */
export function freezeTeam(team: MonInstance[]): ChampionMon[] {
    return team.map((m) => {
        const sp = getSpecies(m.speciesId)
        const s = sp ? fullStats(m, sp) : { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }
        return {
            speciesId: m.speciesId,
            nickname: m.nickname,
            level: m.level,
            shiny: m.shiny,
            stats: { hp: s.hp, atk: s.atk, def: s.def, spe: s.spe, spc: s.spc },
            moves: m.moves.map((slot) => getMove(slot.moveId)?.name ?? slot.moveId),
        }
    })
}

/** Lance un combat amical contre l'équipe de champion FIGÉE (Hall of Fame). Sans sac (noItems), IA la plus
 *  maligne ("hof"), aucune récompense ni XP (challenge pur). `label` identifie le combat (ligue/arène). */
export function startHofBattle(label: string, champTeam: ChampionMon[]): boolean {
    const playerTeam = getPlayer().team
    if (playerTeam.length === 0 || champTeam.length === 0) return false
    if (!playerTeam.some((m) => m.currentHp > 0)) return false // équipe K.O. → soigne d'abord
    const enemyTeam = champTeam.map((m, i) => championToInstance(m, i))
    const seed = (Math.floor(Math.random() * 0x7fffffff) ^ (playerTeam.length * 2654435761)) >>> 0
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: "hof", noItems: true, expMult: 0, playerBadgeCount: getPlayer().badges.length })
    syncPokedex(battle)
    setStore({ battle, evolutions: [], trainer: { trainerId: `hof:${label}`, reward: 0, isRematch: false }, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null })
    persistBattleSnapshot()
    return true
}

/** NG+ — COMBAT DE FIN DE LIGUE contre l'ancienne équipe (figée en ChampionMon[]). VRAI combat : XP normale,
 *  sac autorisé, IA la plus maligne ("hof"). Adversaire owned:false (incapturable, stats gelées). Retourne
 *  false si l'équipe du joueur est vide/K.O. (soigner d'abord) ou pas d'ancienne équipe. */
export function startNgPlusFinalBattle(oldTeam: ChampionMon[]): boolean {
    const playerTeam = getPlayer().team
    if (playerTeam.length === 0 || oldTeam.length === 0) return false
    if (!playerTeam.some((m) => m.currentHp > 0)) return false // équipe K.O. → soigne d'abord
    const enemyTeam = oldTeam.map((m, i) => championToInstance(m, i))
    const seed = (Math.floor(Math.random() * 0x7fffffff) ^ (playerTeam.length * 40503)) >>> 0
    // Pas d'expMult:0 → XP NORMALE (choix de Sartay). Pas de noItems → sac autorisé (vrai combat).
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: "hof", playerBadgeCount: getPlayer().badges.length })
    syncPokedex(battle)
    setStore({ battle, evolutions: [], trainer: { trainerId: "ngplus:final", reward: 0, isRematch: false }, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null, ngplusFinalPending: false })
    persistBattleSnapshot()
    return true
}

/** RUN 3 — combat contre le BOSS d'arène = équipe de JOUEUR FIGÉE, tronquée à la taille de l'arène
 *  (run3ArenaBossTeam). On garde le trainerId du boss (y_arena_druide, …) → finishBattle attribue le badge +
 *  le palier d'énergie normalement. VRAI combat (XP, sac). false si équipe joueur vide/K.O. ou boss introuvable. */
export function startRun3BossBattle(badge: string, bossTrainerId: string): boolean {
    const enemyChamp = run3ArenaBossTeam(badge)
    if (enemyChamp.length === 0) return false
    const playerTeam = getPlayer().team
    if (playerTeam.length === 0 || !playerTeam.some((m) => m.currentHp > 0)) return false // équipe K.O. → soigne d'abord
    const enemyTeam = enemyChamp.map((m, i) => championToInstance(m, i))
    const seed = (Math.floor(Math.random() * 0x7fffffff) ^ (playerTeam.length * 2246822519)) >>> 0
    const battle = createBattle(playerTeam, enemyTeam, { isWild: false, seed, aiLevel: "hof", playerBadgeCount: getPlayer().badges.length })
    syncPokedex(battle)
    setStore({ battle, evolutions: [], trainer: { trainerId: bossTrainerId, reward: 0, isRematch: false }, whiteout: false, energySpent: 0, sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null })
    persistBattleSnapshot()
    return true
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
    return attackCost(getMove(slot.moveId), me.level, effectiveQuota(getPlayer().wildCtx?.quota))
}

export function submitPlayerAction(action: PlayerAction) {
    const battle = storeState.battle
    if (!battle) return
    // Combat PvP : chemin réseau dédié (pas d'IA, résolution dual-déterministe).
    if (storeState.pvpCtx) { submitPvpAction(action); return }
    // Lancer une Ball consomme l'objet de l'inventaire (réussite ou non).
    if (action.kind === "ball" && !consumeItem(action.itemId)) return
    if (action.kind === "ball") bumpStat("ballsUsed") // STAT : ball lancée
    // Utiliser un objet de soin le consomme aussi.
    if (action.kind === "item" && !consumeItem(action.itemId)) return
    if (action.kind === "item") { const c = getItem(action.itemId)?.category; if (c === "HEAL" || c === "STATUS_HEAL") { bumpStat("potionsUsed"); if (storeState.trainer?.trainerId?.startsWith("y_ligue_")) bumpLeaguePotions() } } // STAT : potion/soin ; +leaguePotions si combat de Ligue (malus score maîtrise)
    // BÉNÉDICTION barman (SECRET, solo) : boire une POTION (soin) déclenche l'effet en attente sur le
    // Daemon ACTIF — esquive ×2 (précision adverse ÷2 via stages.eva) ou crit garanti au prochain coup.
    if (action.kind === "item" && getItem(action.itemId)?.category === "HEAL") {
        const bless = consumeBattleBlessing()
        if (bless) {
            const m = battle.player.team[battle.player.activeIndex]
            if (m) {
                if (bless === "eva") m.stages.eva = Math.max(-6, Math.min(6, (m.stages.eva ?? 0) + 3))
                else if (bless === "crit") m.nextCritGuaranteed = true
            }
        }
    }
    // Attaque normale : coûte des reps (la Charge Désespérée, index sentinelle, est gratuite).
    let paidMoveCost = 0
    if (action.kind === "move" && action.moveIndex !== STRUGGLE_INDEX) {
        const cost = moveCostRepsForAction(battle, action.moveIndex)
        if (cost > 0) {
            // Cap d'énergie PAR COMBAT (relevé par les badges d'arène).
            const cap = battleEnergyCap(getPlayer().badges.length)
            if (storeState.energySpent + cost > cap) return // plus d'énergie ce combat (UI grise déjà)
            if (!spendReps(cost)) return                    // solde global insuffisant
            storeState = { ...storeState, energySpent: storeState.energySpent + cost }
            paidMoveCost = cost
        }
    }
    const next = resolveTurn(battle, action)
    // #4 : l'attaque n'est jamais partie (Daemon mis K.O. avant d'agir, adversaire plus rapide)
    // → on REMBOURSE les reps. Pas de double peine : on ne paie que les attaques réellement lancées.
    if (paidMoveCost > 0 && next.lastPlayerActed === false) {
        grantReps(paidMoveCost, true) // force : on rend au joueur SA propre énergie (attaque non partie) — même en run 3
        storeState = { ...storeState, energySpent: Math.max(0, storeState.energySpent - paidMoveCost) }
    }
    // PREMIÈRE capture de cette espèce ? On le détecte AVANT que syncPokedex ne la marque
    // « capturée » → sinon on ne saurait plus distinguer une nouvelle entrée d'un doublon.
    let newEntry: BattleStoreState["newDexEntry"] = null
    if (next.outcome === "caught") {
        const wild = next.enemy.team[next.enemy.activeIndex]
        if (wild && !getPokedex().caught.includes(wild.speciesId)) {
            newEntry = { speciesId: wild.speciesId, uid: wild.uid, level: wild.level }
        }
    }
    syncPokedex(next) // vu (changement d'adversaire) + capturé le cas échéant
    setStore({ battle: next, evolutions: [], trainer: storeState.trainer, whiteout: false })
    if (next.phase === "ended") finishBattle(next, newEntry)
    else persistBattleSnapshot() // #8 : on rafraîchit l'instantané anti-fuite tant que le combat dure
}

/** Fin de combat : resync équipe (XP/PV/niveaux), capture, évolutions, sauvegarde. */
function finishBattle(b: BattleState, newDexEntry: BattleStoreState["newDexEntry"] = null) {
    clearBattleSnapshot() // #8 : combat terminé → plus rien à reprendre
    // #2 : fuite RÉUSSIE → on durcit la prochaine ; tout autre dénouement = engagement → reset.
    if (b.outcome === "run") fleeStreak++
    else fleeStreak = 0

    // NG+ : chaque combat (sauvages inclus) consomme la fenêtre d'abandon (≤ NGPLUS_ABANDON_LIMIT). No-op hors NG+.
    if (getActiveWorld() === "ngplus") incNgplusBattles()

    // STATS de partie (per-world) — hors PvP (le PvP a ses propres stats). Un combat « joué » = win/lose/caught.
    if (!b.pvp) {
        if (b.outcome === "win" || b.outcome === "lose" || b.outcome === "caught") bumpStat("battles")
        if (b.outcome === "win") bumpStat("wins")
        if (b.outcome === "lose") bumpStat("teamKos")          // équipe mise KO (défaite)
        if (b.dmgByType) { let dealt = 0; for (const v of Object.values(b.dmgByType)) dealt += v ?? 0; bumpStat("hpDealt", dealt) }
        if (b.xpGained) bumpStat("xpTotal", b.xpGained)
    }

    // 1) Resynchronise l'équipe persistante depuis l'état de combat.
    //    ⚠️ EXCEPTION USINE (frontier:FACTORY) : on a joué une équipe de LOCATION (createMonInstance
    //    owned:false), PAS la vraie équipe → ne JAMAIS la réécrire dans le save, sinon on remplacerait
    //    l'équipe réelle du joueur par les Daemons loués (perte de données). L'Usine ne fait rien gagner
    //    à la vraie équipe (rentals jetables, façon Émeraude).
    const isFactory = storeState.trainer?.trainerId === "frontier:FACTORY"
    if (!isFactory) setTeam(b.player.team.map(toMonInstance))

    // 2) Capture → ajoute le sauvage à l'équipe/PC.
    if (b.outcome === "caught") {
        const wild = b.enemy.team[b.enemy.activeIndex]
        if (wild) {
            addCaught(toMonInstance(wild), { quotaReached: getPlayer().wildCtx?.quotaReached })
            // ✨ FÊTE SHINY (capture) : +50 énergie de plus pour TOUS les joueurs.
            if (wild.shiny) reportShiny("captured", wild.uid, wild.speciesId)
        }
    }

    // 2-bis) GÉKROC (mini-boss STATIQUE) : vaincu OU capturé → résolu (one-time, ne réapparaît plus)
    //        et la Pierre Gékroc est libérée (objet → fait évoluer Panthéon, cf. Part B).
    let stoneReward: string | null = null
    if (b.isWild && (b.outcome === "win" || b.outcome === "caught") && b.enemy.team.some((e) => e.speciesId === "gekroc" || e.speciesId === "gekraise")) {
        if (!getPlayer().gekrocResolved) {
            markGekrocResolved()
            addItem(GEKROC_STONE_ITEM, 1)
            // NOTIF : sans ça le don était totalement silencieux (objet MISC, pas affiché par défaut)
            // → le joueur avait l'impression de ne rien recevoir.
            stoneReward = "🪨 En s'effondrant, Gékroc libère une PIERRE D'ÉVOLUTION ! Tu obtiens la Pierre Gékroc — utilise-la depuis la fiche d'un Panthéon pour le faire évoluer (choix du type)."
        }
    }

    // 2-ter) SYLVEBARBE (gardien endormi du sud de Ville Jaune) : vaincu OU capturé → réveillé
    //        (la sortie sud s'ouvre vers la Zone de Combat) et la Daemonflûte est consommée.
    if (b.isWild && (b.outcome === "win" || b.outcome === "caught") && b.enemy.team.some((e) => e.speciesId === "sylvebarbe")) {
        if (!getPlayer().sylvebarbeAwake) {
            markSylvebarbeAwake()
            consumeItem("daemonflute")
        }
    }

    // 2-quater) RUN 3 — TEASER DIEU SPAGHETTI sur LAVAPETIT : à la 1re RENCONTRE (quel que soit l'issue) puis
    //   à la 1re CAPTURE, le Dieu Spag rappelle que c'est le Daemon qu'étudie CHEN (→ Magmator → Magnetor).
    //   Flags per-monde one-time. UNIQUEMENT en run 3 (Lavapetit apparaît aussi en run 1/2 sans teaser).
    let lavapetitTeaser: "seen" | "caught" | null = null
    if (getActiveWorld() === "run3" && b.isWild && b.enemy.team.some((e) => e.speciesId === "lavapetit")) {
        const pl = getPlayer()
        if (b.outcome === "caught" && !pl.run3LavapetitCaught) { markRun3LavapetitCaught(); lavapetitTeaser = "caught" }
        else if (!pl.run3LavapetitSeen && !pl.run3LavapetitCaught) { markRun3LavapetitSeen(); lavapetitTeaser = "seen" }
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
    let rematchReward: BattleStoreState["rematchReward"] = null
    let chainRematchId: string | null = null
    // CT du sbire possédée AVANT ce combat ? (le ticket sbire ne tombe qu'APRÈS l'avoir décrochée).
    const hadSbireCt = getPlayer().ownedCts.includes(SBIRE_REWARD_CT_ID)
    if (b.outcome === "win" && storeState.trainer) {
        if (storeState.trainer.trainerId === ACE_TRAINER_ID) {
            // ACE : sa défaite ratchete son niveau (+2 sur ta MOYENNE d'équipe) + mémorise le contre.
            const aceTeam = getPlayer().team
            const avg = Math.max(1, Math.round(aceTeam.reduce((s, m) => s + m.level, 0) / Math.max(1, aceTeam.length)))
            const aceLast = aceTeam[aceTeam.length - 1]
            const aceLastTypes = aceLast ? (getSpecies(aceLast.speciesId)?.types ?? []) : []
            const winNum = recordAceDefeat(avg, aceLastTypes, aceLast?.level ?? avg)
            const run3 = getActiveWorld() === "run3"
            const r = aceReward(winNum, run3) // run 3 : Balls + Panthéon oui, reps/refund NON (msg sans promesse d'énergie)
            if (r.itemId) addItem(r.itemId, 1)
            if (r.reps) grantReps(r.reps)
            let gaveNemesis = false
            if (r.gift === "pantheon") {
                const lvls = getPlayer().team.map((m) => m.level)
                const lvl = lvls.length ? Math.min(...lvls) : 5 // niveau du plus faible de l'équipe présente
                // NG+ : ACE lègue le NÉMÉSIS (contre-lignée) au lieu du Panthéon. Fallback Panthéon si indisponible.
                const nem = getActiveWorld() === "ngplus" ? getNgplusNemesisSpeciesId() : null
                let giftId = "pantheon"
                // speciesAtLevel : le némésis est offert au STADE NATUREL de son niveau (jamais une souche à haut niveau).
                if (nem) { try { const gid = speciesAtLevel(nem, lvl); createMonInstance(gid, lvl, { owned: true }); giftId = gid; gaveNemesis = true } catch { giftId = "pantheon" } }
                addCaught(createMonInstance(giftId, lvl, { owned: true }))
                markCaught(giftId); markCaughtThisRun(giftId) // le cadeau ACE entre au Pokédex (comme le cadeau Orcaline)
            }
            if (r.refund) grantReps(storeState.energySpent) // remboursement de l'énergie dépensée
            aceWin = winNum
            aceRewardMsg = gaveNemesis
                ? "« Sept fois. Sept. Tu l'as brisé si souvent que je te lègue mon Némésis — ta propre nemesis, forgée contre toi. Ironique, non ? »"
                : r.message
            // 🎟️ TICKETS ACE : un petit (20) à la 2e victoire ; un gros (50) avant Panthéon (victoire 6) + après (victoire 8).
            //    RUN 3 : AUCUN ticket (le concours n'a ni casino ni roulette) → on saute tout le bloc (sinon le
            //    message annoncerait des énergies qui ne tombent jamais, grantRouletteTicket étant déjà no-op en run3).
            const aceTicket = run3 ? 0 : winNum === ACE_TICKET_WIN_EARLY ? ACE_TICKET_EARLY_VALUE
                : (winNum === ACE_TICKET_WIN_BEFORE || winNum === ACE_TICKET_WIN_AFTER) ? ACE_TICKET_VALUE
                : 0
            if (aceTicket > 0) {
                grantRouletteTicket(aceTicket)
                aceRewardMsg = `${aceRewardMsg ? aceRewardMsg + " " : ""}🎟️ Et un ticket roulette de ${aceTicket} énergies — joue-le à ta prochaine connexion.`
            }
        } else if (storeState.trainer.trainerId === SBIRE_TRAINER_ID) {
            sbireWin = recordSbireWin()
            // Récompense selon la victoire DU JOUR (6 combats) : reps / balls croissantes / CT au 6e.
            const todayWins = getPlayer().sbireDefeatsToday
            if (todayWins === 1) {
                const added = grantReps(SBIRE_REWARD_REPS)
                sbireRewardMsg = `⚡ Et tiens, ${added} d'énergie pour ta peine !`
            } else if (todayWins === 2) {
                addItem(SBIRE_REWARD_BALL_ID, 1)
                sbireRewardMsg = `🎁 Et prends donc cette Nexus Ball, tu l'as méritée !`
            } else if (todayWins === 3) {
                const added = grantReps(SBIRE_REWARD_REPS_3)
                sbireRewardMsg = `⚡ ${added} d'énergie pour ce combat à trois !`
            } else if (todayWins === 4) {
                addItem(SBIRE_REWARD_BALL_ID_4, 1)
                sbireRewardMsg = `🎁 Une Super Nexus Ball, tu l'as bien gagnée !`
            } else if (todayWins === 5) {
                const added = grantReps(SBIRE_REWARD_REPS_5)
                sbireRewardMsg = `⚡ ${added} d'énergie ! Tu tiens la distance.`
            } else if (todayWins >= 6) {
                // Cadeau ULTIME one-time : CT Fouet de Nouilles. Déjà reçue → repli en reps.
                if (grantCt(SBIRE_REWARD_CT_ID)) {
                    sbireRewardMsg = `🍝 Relique du dieu Spaghetti : la CT Fouet de Nouilles est à toi !`
                } else {
                    const added = grantReps(SBIRE_REWARD_CT_FALLBACK_REPS)
                    sbireRewardMsg = `🍝 Tu as déjà ma relique — alors prends ${added} d'énergie !`
                }
            }
            // 🎟️ TICKET sbire (20) : tous les SBIRE_TICKET_EVERY combats cumulés, une fois la CT décrochée.
            if (hadSbireCt && sbireWin !== null && sbireWin % SBIRE_TICKET_EVERY === 0) {
                grantRouletteTicket(SBIRE_TICKET_VALUE)
                sbireRewardMsg = `${sbireRewardMsg ? sbireRewardMsg + " " : ""}🎟️ + un ticket roulette de ${SBIRE_TICKET_VALUE} énergies !`
            }
        } else if (storeState.trainer.isRematch) {
            // REMATCH gagné : marque le rematch fait + récompense (énergie / CT cadeau).
            const id = storeState.trainer.trainerId
            const t = getTrainer(id)
            markTrainerRematched(id)
            // RUN 2 — REVANCHE d'arène (équipe run 1 +N) : re-donne la CT CLASSIQUE du run 1 (boss uniquement,
            // 2e CT de l'arène en run 2) + le ticket d'arène (30). Les gardes : juste l'honneur.
            const revBoost = getActiveWorld() === "ngplus" ? arenaRevancheBoost(id) : null
            if (revBoost != null) {
                // CT « classique » de l'arène : soit un giftCt direct (Druide/Granit/Pyra/Ondine), soit — pour
                // VOLTA (élec), dont la CT est dans son rematch — la 1re de rematch.giftCts (ct22).
                const classicCt = t?.giftCt ?? t?.rematch?.giftCts?.[0]
                const rewardLines: string[] = []
                if (classicCt) {
                    const mvId = getCt(classicCt)?.moveId
                    const mv = mvId ? getMove(mvId)?.name : null
                    if (mv) {
                        if (grantCt(classicCt)) { giftCtMove = mv; rewardLines.push(`🎁 ${t?.name ?? "Le boss"} te remet (à nouveau) sa CT classique : « ${mv} » — celle de son arène du premier run !`) }
                        else rewardLines.push(`Tu possèdes déjà « ${mv} », la CT classique de cette arène. Belle revanche tout de même !`)
                    }
                }
                if (t?.badge) grantRouletteTicket(ARENA_TICKET_VALUE, "boss") // ticket = BOSS uniquement (les gardes : l'honneur)
                // Boss : réplique de défaite + récompenses. Garde (pas de badge) : message générique, sans récompense.
                const finalLines = t?.badge ? [...(t?.defeat ?? []), ...rewardLines] : []
                rematchReward = { npcId: id, npcName: t?.name ?? "DRESSEUR", lines: finalLines.length ? finalLines : ["⚔️ Revanche de l'arène remportée !"] }
            } else {
                const rm = t?.rematch
                let rewardLine: string
                const ctIds = rm?.giftCts ?? []
                if (ctIds.length > 0) {
                    // CT(s) cadeau : on ne nomme que celles RÉELLEMENT ajoutées (grantCt idempotent).
                    const names: string[] = []
                    for (const ctId of ctIds) {
                        if (!grantCt(ctId)) continue
                        const mvId = getCt(ctId)?.moveId
                        const mv = mvId ? getMove(mvId)?.name : null
                        if (mv) names.push(mv)
                    }
                    const plural = names.length > 1
                    rewardLine = names.length
                        ? `🎁 ${t?.name ?? "Le boss"} te remet ${plural ? "les CT" : "la CT"} « ${names.join(" » et « ")} » ! Cadeau unique — apprends-${plural ? "les" : "la"} à un Daemon compatible.`
                        : `🎁 ${t?.name ?? "Le boss"} te remet une CT cadeau !`
                } else if (rm?.reward && rm.reward > 0) {
                    const added = grantReps(rm.reward)
                    rewardLine = added > 0
                        ? `⚡ +${added} d'énergie pour la revanche !`
                        : `⚡ Revanche gagnée ! (ta jauge d'énergie déborde déjà)`
                } else {
                    rewardLine = "⚡ Revanche gagnée !"
                }
                rematchReward = { npcId: id, npcName: t?.name ?? "DRESSEUR", lines: [...(rm?.defeat ?? []), rewardLine] }
            }
        } else if (storeState.trainer.trainerId === HH_COLLECTOR_ID) {
            // COLLECTIONNEUR DE SPECTRES : réaffrontable (PAS de markTrainerDefeated). Enregistre la victoire
            // + les spectres montrés (présents dans l'équipe). À 3 victoires ET 3 spectres distincts → CT26.
            // NB : le collectionneur n'a PAS de badge → on ne peut PAS passer par giftCtMove (affiché seulement
            // avec un badge). On annonce donc tout (récompense ET progression) via rematchReward, fiable post-combat.
            const spectres = b.player.team.map((m) => m.speciesId).filter((id) => getSpecies(id)?.types.includes("SPECTRE"))
            const res = recordHhCollectorWin(spectres)
            if (res.rewarded) {
                const mvId = getCt(HH_COLLECTOR_CT)?.moveId
                const mv = mvId ? getMove(mvId)?.name : null
                rematchReward = {
                    npcId: HH_COLLECTOR_ID, npcName: "COLLECTIONNEUR",
                    lines: [...HH_COLLECTOR_DONE_LINES, mv ? `🎁 Reçois la CT « ${mv} » ! Apprends-la à un Daemon compatible.` : "🎁 Reçois ma CT spectrale !"],
                }
            } else {
                // Feedback de progression IMMÉDIAT (sinon le joueur ignore que sa victoire a compté).
                const w = Math.min(res.wins, HH_COLLECTOR_WINS_NEEDED)
                const s = Math.min(res.shown, HH_COLLECTOR_SPECTRES_NEEDED)
                rematchReward = {
                    npcId: HH_COLLECTOR_ID, npcName: "COLLECTIONNEUR",
                    lines: [
                        `Belle bataille ! Progression : ${w}/${HH_COLLECTOR_WINS_NEEDED} victoires · ${s}/${HH_COLLECTOR_SPECTRES_NEEDED} spectres distincts montrés.`,
                        res.shown === 0
                            ? "…mais je n'ai vu AUCUN spectre dans ton équipe ! Reviens avec un Daemon de type SPECTRE à tes côtés."
                            : "Reviens m'affronter avec d'AUTRES spectres pour compléter ma collection !",
                    ],
                }
            }
        } else if (storeState.trainer.trainerId === ORCALINE_TRAINER_ID) {
            // DRESSEUR D'ORCALINE : ré-affrontable (PAS de markTrainerDefeated). Verrouille la journée +
            // escalade le niveau (+10/victoire). 1re victoire → cadeau Orcaline ; battre le niv 95 → ball.
            const winsBefore = recordOrcalineDefeat()
            const levelBeaten = orcalineLevelForWins(winsBefore)
            const ngplus = getActiveWorld() === "ngplus"
            const run3 = getActiveWorld() === "run3"
            const dlg = orcalineTrainerDialogue(getActiveWorld()) // run 2 → Panthégel ; run 3 → ÉLEVEUR
            const lines: string[] = []
            if (winsBefore === 0) {
                // NG+ : cadeau PANTHÉGEL. RUN 3 : l'ÉLEVEUR confie le 3e STARTER (ni le joueur ni ACE) au STADE-1
                //   niveau 15 (prêt à évoluer). Run 1 : Orcaline. Cadeau one-time (winsBefore===0).
                const giftSp = run3 ? (getRun3ThirdStarter() ?? ORCALINE_GIFT_SPECIES) : ngplus ? "panthegel" : ORCALINE_GIFT_SPECIES
                const giftLvl = run3 ? 15 : ORCALINE_GIFT_LEVEL
                addCaught(createMonInstance(giftSp, giftLvl, { owned: true }))
                markCaught(giftSp); markCaughtThisRun(giftSp) // le cadeau entre au Pokédex (+ « ce run »)
                lines.push(...dlg.gift)
            } else {
                lines.push(...dlg.rematchWin)
            }
            if (levelBeaten === ORCALINE_BALL_AT_LEVEL) { // palier 95 battu (une seule fois) → récompense secrète
                addItem(ORCALINE_BALL_REWARD_ID, 1)
                lines.push(...dlg.ball)
            }
            rematchReward = { npcId: ORCALINE_TRAINER_ID, npcName: dlg.name, lines }
        } else if (storeState.trainer.trainerId.startsWith("duel:")) {
            // DUEL reflet : aucune récompense ici → gérée côté UI (limite 1/jour, Nexus Ball, dialogue
            // Dieu des Nouilles, cadeau croisé). PAS de markTrainerDefeated (ce n'est pas un dresseur permanent).
        } else if (storeState.trainer.trainerId.startsWith("frontier:")) {
            // ZONE DE COMBAT : adversaires éphémères (holographes) → aucune récompense dresseur ni
            // markTrainerDefeated. Les JC + l'enchaînement de vagues sont gérés par le runStore/UI.
            // Ici on REMBOURSE l'énergie à la VICTOIRE (10→100 % de l'énergie dépensée) ; 0 à la défaite.
            if (b.outcome === "win") {
                const refund = frontierEnergyRefund(storeState.energySpent)
                if (refund > 0) grantReps(refund)
            }
        } else if (storeState.trainer.trainerId.startsWith("hof:")) {
            // HALL OF FAME : combat amical contre une équipe figée → AUCUNE récompense, aucun marquage,
            // aucun badge. Juste l'honneur (et l'énergie déjà dépensée pour attaquer). Rien à faire ici.
        } else {
            markTrainerDefeated(storeState.trainer.trainerId)
            const t = getTrainer(storeState.trainer.trainerId)
            const inNgplus = getActiveWorld() === "ngplus"
            if (t?.badge && awardBadge(t.badge)) badgeAwarded = t.badge
            // RUN 3 : chaque arène vaincue RECHARGE l'énergie JUSQU'À son plafond (500→600→700→800→1000), sans
            //   jamais dépasser ni réduire la réserve → top-up = max(0, plafond - réserve actuelle). Seule source
            //   avec les 500 de départ. Forcé (le run 3 bloque les gains non-forcés).
            if (badgeAwarded && getActiveWorld() === "run3") {
                const r3arena = run3ArenaForBoss(storeState.trainer.trainerId)
                if (r3arena) {
                    const topUp = r3arena.energy - getPlayer().reps
                    if (topUp > 0) grantReps(topUp, true)
                }
            }
            // 🎟️ TICKET arène (30) : à la 1re conquête du badge (en plus de la CT cadeau). En NG+, le ticket
            //     est REMPLACÉ par le ticket dédié du boss run 2 (10→50, cf. NGPLUS_BOSS_GIFTS ci-dessous).
            //     RUN 3 : AUCUN ticket (concours sans casino/roulette) → run 1 uniquement.
            if (badgeAwarded && getActiveWorld() === "live") grantRouletteTicket(ARENA_TICKET_VALUE)
            // CT CADEAU (trophée du boss) — RUN 1 UNIQUEMENT. En RUN 2, le boss ne redonne PAS la CT du run 1
            // (ça n'a aucun sens : elle est déjà acquise) → il n'offre QUE sa signature exclusive (ci-dessous).
            // En RUN 3 : le boss = équipe gelée d'un joueur, AUCUN cadeau (badge + palier d'énergie SEULEMENT).
            if (t?.giftCt && getActiveWorld() === "live" && grantCt(t.giftCt)) {
                const mvId = getCt(t.giftCt)?.moveId
                giftCtMove = mvId ? (getMove(mvId)?.name ?? null) : null
            }
            // 🎁 RUN 2 (NG+) : le boss offre SA CT signature EXCLUSIVE (ct53→57, introuvable ailleurs) + son ticket
            //     roulette dédié (10→50), et l'ANNONCE dans un petit dialogue post-combat.
            const ngGift = inNgplus ? NGPLUS_BOSS_GIFTS[storeState.trainer.trainerId] : undefined
            let ngCtLine: string | null = null
            if (ngGift && t?.badge) { // t?.badge : durcissement — le ticket/CT signature = BOSS d'arène uniquement
                const granted = grantCt(ngGift.ctId)
                const mvId = getCt(ngGift.ctId)?.moveId
                const mvName = mvId ? (getMove(mvId)?.name ?? null) : null
                if (granted && mvName) {
                    giftCtMove = mvName
                    ngCtLine = `Et pour t'être imposé face à moi : prends ma CT signature, « ${mvName} ». Une EXCLUSIVITÉ du run 2 — personne d'autre ne la possède. Enseigne-la à un Daemon compatible !`
                }
                grantRouletteTicket(ngGift.ticket, "boss")
            }
            // 🗣️ RUN 2 — prise de parole post-combat du boss : (Druide, arène 1) le SECRET DES BAIES, PUIS (tous
            //    les boss) l'annonce de leur CT signature. Réunis en un seul dialogue via rematchReward.
            if (inNgplus) {
                const revealBerry = storeState.trainer.trainerId === "y_arena_druide" && !isBerrySecretKnown()
                if (revealBerry) setBerrySecretKnown()
                const lines = [...(revealBerry ? BERRY_SECRET_LINES_DRUIDE : []), ...(ngCtLine ? [ngCtLine] : [])]
                if (lines.length) rematchReward = { npcId: storeState.trainer.trainerId, npcName: t?.name ?? "Boss d'arène", lines }
            }
            // BOSS À 2 PHASES (ex. VOLTA) : sa 1re défaite enchaîne DIRECTEMENT sur son rematch (phase 2).
            //     En NG+ ET en RUN 3, les arènes re-typées / boss figés sont des combats UNIQUES → pas de phase 2
            //     (sinon VOLTA enchaînerait sur sa vraie phase-2 hors-score qui draine l'énergie du concours).
            if (t?.chainRematch && t.rematch && !storeState.trainer.isRematch && !inNgplus && getActiveWorld() !== "run3") chainRematchId = storeState.trainer.trainerId
        }
    }

    // 2quater) LIGUE : à chaque victoire d'un membre, on retient le MEILLEUR coup du combat (best-of).
    //          Au sacre du MAÎTRE → Champion + Hall of Fame (équipe + best-of des 5 combats).
    // Équipe GELÉE (ChampionMon[]) au moment d'un sacre — réutilisée par le Hall of Fame Ligue ET Arène.
    const snapshotTeam = (): ChampionMon[] => getPlayer().team.map((m) => {
        const sp = getSpecies(m.speciesId)
        const st = sp ? fullStats(m, sp) : { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }
        return {
            speciesId: m.speciesId,
            nickname: m.nickname,
            level: m.level,
            shiny: m.shiny,
            stats: { hp: st.hp, atk: st.atk, def: st.def, spe: st.spe, spc: st.spc },
            moves: m.moves.map((slot) => getMove(slot.moveId)?.name ?? slot.moveId),
        }
    })
    // ARÈNE — Hall of Fame par gym : si un badge vient d'être gagné, on gèle l'équipe victorieuse.
    const arenaRun: BattleStoreState["arenaRun"] = badgeAwarded ? { badgeId: badgeAwarded, team: snapshotTeam(), world: getActiveWorld() } : null

    let championRun: BattleStoreState["championRun"] = null
    const lid = storeState.trainer?.trainerId
    if (b.outcome === "win" && lid && lid.startsWith("y_ligue_")) {
        let best = { dmg: 0, mon: "", move: "" }
        for (const m of b.player.team) {
            const d = (m as { battleBestDmg?: number }).battleBestDmg ?? 0
            if (d > best.dmg) best = { dmg: d, mon: m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId, move: (m as { battleBestDmgMove?: string }).battleBestDmgMove ?? "" }
        }
        if (best.dmg > 0) leagueHighlights[lid] = { trainer: getTrainer(lid)?.name ?? "Conseil 4", mon: best.mon, dmg: best.dmg, move: best.move }
        // 🎰 RÉCOMPENSE ROULETTE (Conseil 4, LES DEUX runs) : chaque membre te file de l'énergie de casino
        //    selon le nombre de TES Daemons qu'il a mis K.O. — 5 ⚡/K.O., sur un ton de + en + condescendant.
        //    SANS-FAUTE (0 K.O.) → il te demande un autographe et t'offre 50 ⚡ « c'est tout ce qu'il me reste ».
        //    (Le MAÎTRE est exclu : son enjeu, c'est le sacre / Hall of Fame, pas des jetons.)
        if (lid !== "y_ligue_maitre") {
            const ko = b.player.team.filter((m) => m.currentHp <= 0).length
            const tName = getTrainer(lid)?.name ?? "Le membre du Conseil"
            if (ko === 0) {
                grantRouletteCredit(LEAGUE_AUTOGRAPH_CREDIT)
                rematchReward = { npcId: lid, npcName: tName, lines: [
                    "Pas un seul de tes Daemons à terre… je n'en reviens pas.",
                    `*il sort un carnet écorné* Un autographe, s'il te plaît ? …Merci ! Tiens, ${LEAGUE_AUTOGRAPH_CREDIT} ⚡ à jouer au casino — c'est tout ce qu'il me reste, mais tu l'as bien mérité.`,
                ] }
            } else {
                const credit = ko * LEAGUE_ROULETTE_PER_KO
                grantRouletteCredit(credit)
                const taunt = ko <= 2
                    ? "Pas trop mal… pour un amateur. Tiens, de quoi t'occuper au casino."
                    : ko <= 4
                    ? "Oh là là, tu en as bavé, hein ? *soupir condescendant* Prends ces jetons et va jouer, va."
                    : "Sérieusement, comment as-tu atteint la Ligue ? *rire* Va claquer ça au casino — c'est là, ta vraie place."
                rematchReward = { npcId: lid, npcName: tName, lines: [taunt, `Il te lâche ${credit} ⚡ à jouer au casino (${ko} Daemon${ko > 1 ? "s" : ""} K.O. × ${LEAGUE_ROULETTE_PER_KO}).`] }
            }
        }
        if (lid === "y_ligue_maitre") {
            // RUN 2 : battre le Maître ne SACRE PAS encore. Le vrai boss final = l'ANCIENNE équipe.
            //   → auto-soin + marqueur PERSISTANT (survit au refresh), et on enchaîne DIRECT sur ce combat
            //   (pas de Hall of Fame ici). Le sacre a lieu à la VICTOIRE contre l'ancienne équipe (ngplus:final, plus bas).
            const ngplusMaitre = getActiveWorld() === "ngplus" && (getNgplusOldTeam()?.length ?? 0) > 0
            if (ngplusMaitre) {
                setNgplusMaitreBeaten(true)
                healAllTeam()
            } else {
                setChampion()
                const order = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter", "y_ligue_maitre"]
                championRun = {
                    team: snapshotTeam(),
                    highlights: order.map((id) => leagueHighlights[id]).filter((h): h is LeagueHighlight => !!h),
                }
            }
        }
    }

    // RUN 3 — SCORE du concours : crédite chaque Daemon ENNEMI mis K.O. (boss d'arène + membres de Ligue),
    //   dédupliqué par clé stable (bossEnemyKey/leagueEnemyKey ↔ index de b.enemy.team). Tourne sur win ET
    //   lose : le run peut s'arrêter à 0⚡ EN PLEIN combat → on crédite la progression PARTIELLE.
    if (getActiveWorld() === "run3" && storeState.trainer && !b.isWild) {
        const tid = storeState.trainer.trainerId
        const r3 = run3ArenaForBoss(tid)
        const isLeague = tid.startsWith("y_ligue_")
        if (r3 || isLeague) {
            const newly: { key: string; level: number }[] = []
            b.enemy.team.forEach((e, i) => {
                if (e.currentHp <= 0) newly.push({ key: r3 ? bossEnemyKey(r3.badge, i) : leagueEnemyKey(tid, i), level: e.level })
            })
            if (newly.length) addRun3Defeated(newly)
        }
    }

    // 2ter) Défaite (équipe entièrement K.O.) : on soigne tout de suite et on
    //       signale un "whiteout" → la carte renverra le joueur au Centre.
    const isLose = b.outcome === "lose"
    if (isLose) healAllTeam()
    // Raillerie d'ACE quand IL gagne (défaite du joueur contre ACE) → affichée à la sortie du combat.
    const aceLossTaunt = (isLose && storeState.trainer?.trainerId === ACE_TRAINER_ID) ? aceWinTaunt() : null
    // DUEL reflet : signale l'issue (gagné/perdu) → l'UI applique les récompenses post-combat.
    const duelResult = storeState.trainer?.trainerId?.startsWith("duel:") ? { won: b.outcome === "win" } : null
    // ZONE DE COMBAT : issue d'une vague de série → l'UI enchaîne (win) ou clôt la série (lose).
    const frontierResult = storeState.trainer?.trainerId?.startsWith("frontier:") ? { won: b.outcome === "win" } : null
    // NG+ : sacre du Maître EN New Game+ avec une ancienne équipe à affronter → il reste le combat de fin de Ligue.
    const ngplusMaitreWin = lid === "y_ligue_maitre" && b.outcome === "win" && getActiveWorld() === "ngplus" && (getNgplusOldTeam()?.length ?? 0) > 0
    // NG+ : issue du combat de fin de Ligue (vs ancienne équipe). L'UI clôt le NG+ à la victoire.
    const ngplusFinalResult = storeState.trainer?.trainerId === "ngplus:final" ? { won: b.outcome === "win" } : null
    // RUN 2 — issue du combat de fin (vs l'ancienne équipe) : on consomme le marqueur « Maître battu » (gagné OU
    //   perdu). VICTOIRE → SACRE (le vrai Maître) + Hall of Fame MAINTENANT (les highlights des 5 combats de Ligue
    //   sont conservés dans leagueHighlights). DÉFAITE → pas Maître : marqueur retiré → il devra REFAIRE la Ligue.
    if (ngplusFinalResult) {
        setNgplusMaitreBeaten(false)
        if (ngplusFinalResult.won) {
            setChampion()
            const order = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter", "y_ligue_maitre"]
            championRun = {
                team: snapshotTeam(),
                highlights: order.map((id) => leagueHighlights[id]).filter((h): h is LeagueHighlight => !!h),
            }
        }
    }

    // DÉFI CT (labo) : remonte les dégâts par type infligés CE combat vers le défi CT actif
    // (no-op s'il n'y a pas de défi CT du bon type ; b.dmgByType absent en PvP).
    if (b.dmgByType) {
        for (const [type, amount] of Object.entries(b.dmgByType)) addCtDamage(type as PokeType, amount ?? 0)
    }

    // 3) Évolutions post-combat (mute l'équipe → re-set pour notifier + Pokédex).
    //    EXCEPTION USINE : on n'a pas touché l'équipe réelle (rentals) → pas d'évolution parasite.
    const team = getPlayer().team
    const evos = isFactory ? [] : evolveTeam(team)
    if (evos.length > 0) {
        for (const e of evos) { markCaught(e.toId); markCaughtThisRun(e.toId) } // la nouvelle forme entre au Pokédex
        setTeam([...team])
    }
    // Un Daemon a-t-il une attaque EN ATTENTE (slots pleins à la montée de niveau / l'évolution) ? → prompt post-combat.
    const pendingLearn = getPlayer().team.some((m) => (m.pendingMoves?.length ?? 0) > 0)
    // Expose les évolutions pour la cinématique post-combat (jouée après "QUITTER").
    setStore({ battle: b, evolutions: evos, trainer: null, whiteout: isLose, sbireWin, sbireRewardMsg, aceWin, aceRewardMsg, aceLossTaunt, badgeAwarded, giftCtMove, rematchReward, newDexEntry, championRun, arenaRun, chainRematchId, pendingLearn, duelResult, frontierResult, stoneReward, lavapetitTeaser, justCaught: b.outcome === "caught", ngplusFinalPending: storeState.ngplusFinalPending || ngplusMaitreWin, ngplusFinalResult })

    // 4) Sauvegarde persistante (DB).
    persistYellowSave()

    // 5) SAIYAN : convertit les niveaux gagnés ce combat en points (règle amende/quota).
    void processSaiyanPoints()
}

export function endBattle() {
    // On garde évolutions + whiteout : ils se jouent une fois le combat quitté.
    clearBattleSnapshot() // #8 : sortie de combat → pas de reprise fantôme
    swapCache = { src: null, out: null }
    setStore({ battle: null, evolutions: storeState.evolutions, trainer: null, whiteout: storeState.whiteout, pvpCtx: null })
}

export function clearEvolutions() {
    setStore({ battle: storeState.battle, evolutions: [], trainer: storeState.trainer, whiteout: storeState.whiteout })
}

/** ANNULE une évolution (touche B pendant la cinématique) : restaure la forme + les moves d'avant. */
export function cancelEvolution(uid: string) {
    const evo = storeState.evolutions.find((e) => e.uid === uid)
    if (!evo) return
    const team = getPlayer().team
    const mon = team.find((m) => m.uid === uid)
    if (!mon) return
    mon.speciesId = evo.beforeSpeciesId
    mon.moves = evo.beforeMoves.map((m) => ({ ...m }))
    mon.pendingMoves = [...evo.beforePendingMoves]
    setTeam([...team])
    persistYellowSave()
}

/** Consommé par l'UI une fois le Hall of Fame (sacre du Champion) joué. */
export function clearChampion() {
    setStore({ championRun: null })
}

/** Boss à 2 phases : id du dresseur dont le rematch doit s'enchaîner direct après la victoire ; null sinon. */
export function useChainRematch(): string | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().chainRematchId,
        () => getSnapshot().chainRematchId,
    )
}
export function clearChainRematch() {
    setStore({ chainRematchId: null })
}

/** Au moins un Daemon a une attaque en attente → on déclenche le prompt d'apprentissage post-combat. */
export function usePendingLearn(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().pendingLearn,
        () => getSnapshot().pendingLearn,
    )
}
export function clearPendingLearn() {
    setStore({ pendingLearn: false })
}

/** #7 — APPRENTISSAGE EN COMBAT : le joueur apprend TOUT DE SUITE une attaque débloquée au
 *  level-up alors que ses 4 slots étaient pleins (utilisable dès ce combat). `slot` = index de la
 *  capacité à oublier ; `slot=null` = renoncer. MUTE le Daemon de COMBAT EN PLACE (on ne crée
 *  PAS de nouveau ref `battle` : sinon BattleScreen rejouerait le playback du tour). La résolution
 *  est reportée à l'équipe persistante au finishBattle (toMonInstance copie moves + pendingMoves).
 *  BattleScreen force lui-même son re-render. Sans effet en PvP (apprentissage y reste post-combat). */
export function resolveBattleLearn(uid: string, moveId: string, slot: number | null) {
    const b = storeState.battle
    if (!b || storeState.pvpCtx) return
    const mon = b.player.team.find((m) => m.uid === uid)
    if (!mon || !mon.pendingMoves?.includes(moveId)) return
    mon.pendingMoves = mon.pendingMoves.filter((id) => id !== moveId)
    if (slot !== null && slot >= 0 && slot < mon.moves.length) {
        const mv = getMove(moveId)
        const pp = mv?.pp ?? 5
        mon.moves[slot] = { moveId, pp, ppMax: pp }
    }
    persistBattleSnapshot() // #8 : l'attaque apprise survit à un refresh
}

/** Consommé par la carte une fois le joueur renvoyé au Centre (ou redéposé à la Ligue). */
export function clearWhiteout() {
    setStore({ ...storeState, whiteout: false, aceLossTaunt: null })
}

/** Raillerie d'ACE à la défaite du joueur (lue dans l'effet whiteout) ; null si la défaite n'est pas contre ACE. */
export function getAceLossTaunt(): string | null {
    return storeState.aceLossTaunt
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
    setStore({ ...storeState, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null })
}

/** Consommé par la carte une fois l'issue du DUEL reflet traitée (récompenses appliquées). */
export function clearDuelResult() {
    setStore({ ...storeState, duelResult: null })
}

/** NG+ : consommé par l'UI qui lance le combat de fin de Ligue après le Hall of Fame. */
export function clearNgplusFinalPending() {
    setStore({ ...storeState, ngplusFinalPending: false })
}
/** NG+ : consommé par l'UI une fois l'issue du combat de fin de Ligue traitée (clôture / retry). */
export function clearNgplusFinalResult() {
    setStore({ ...storeState, ngplusFinalResult: null })
}

export function clearFrontierResult() {
    setStore({ ...storeState, frontierResult: null })
}

/** Message de récompense d'ACE (lu au moment d'afficher le dialogue post-combat). */
export function getAceRewardMsg(): string | null {
    return storeState.aceRewardMsg
}

/** Consommé par la carte une fois la notification de badge affichée. */
export function clearBadgeAwarded() {
    setStore({ ...storeState, badgeAwarded: null, giftCtMove: null, arenaRun: null })
}

/** Nom de l'attaque de la CT cadeau remise par le boss (lu à l'affichage). */
export function getGiftCtMove(): string | null {
    return storeState.giftCtMove
}

/** Récompense d'un rematch d'arène à afficher post-combat (énergie / CT) ; null sinon. */
export function getRematchReward(): BattleStoreState["rematchReward"] {
    return storeState.rematchReward
}

/** Consommé par la carte une fois la récompense de rematch affichée. */
export function clearRematchReward() {
    setStore({ ...storeState, rematchReward: null })
}

/** Première capture d'une espèce à célébrer (popup Pokédex post-combat) ; null sinon. */
export function useNewDexEntry(): BattleStoreState["newDexEntry"] {
    return useSyncExternalStore(subscribe, () => getSnapshot().newDexEntry, () => getSnapshot().newDexEntry)
}

/** Consommé par la carte une fois la popup de nouvelle entrée Pokédex fermée. */
export function clearNewDexEntry() {
    setStore({ ...storeState, newDexEntry: null })
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
    clearBattleSnapshot() // #8 : le PvP n'est jamais persisté (réseau) → on purge tout reliquat solo
    swapCache = { src: null, out: null }
    // PAS d'objets tenus en PvP : déterminisme dual-client. Les hooks (Vive Griffe/Focus Band/flinch…)
    // consomment du RNG conditionnellement → un objet non synchro entre les 2 clients désyncerait le match.
    // On retire donc heldItem des 2 équipes du COMBAT (copies BattleMon → l'équipe réelle n'est PAS touchée).
    for (const m of battle.player.team) m.heldItem = undefined
    for (const m of battle.enemy.team) m.heldItem = undefined
    mpLog("battle", "start", { battleId: ctx.battleId, role: ctx.role, checksum: battleChecksum(battle) })
    setStore({
        battle, evolutions: [], trainer: null, whiteout: false, energySpent: 0,
        sbireWin: null, sbireRewardMsg: null, aceWin: null, aceRewardMsg: null, aceLossTaunt: null, badgeAwarded: null, giftCtMove: null, rematchReward: null, newDexEntry: null,
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
    const team = getPlayer().team
    const evos = evolveTeam(team)
    if (evos.length > 0) {
        for (const e of evos) { markCaught(e.toId); markCaughtThisRun(e.toId) }
        setTeam([...team])
    }
    // COMBAT AMICAL : après CHAQUE match PvP (gagnant comme perdant) on soigne l'équipe à fond
    // (PV/statut/PP) → un match casino ne déprime jamais ton équipe PvE. Pas de white-out : tu
    // restes sur place pour enchaîner / faire la revanche.
    healAllTeam()
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
    // ABANDON délibéré → je gagne et je touche l'XP NORMALE (multiplier 1 : fini le ×2 qui
    // faisait gagner ~7 niveaux d'un coup). Comme tout match PvP, mon équipe est soignée ensuite.
    const side = mySide(ctx)
    const ended = applyForfeitWin(battle, side, { multiplier: 1, headline: `${ctx.oppNickname} a abandonné le combat !` })
    recordPvpResult("win") // réputation
    setTeam(ended[side].team.map(toMonInstance))
    healAllTeam() // combat amical terminé → équipe soignée (cohérent avec finishPvpBattle)
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

export function useEvolutions(): TeamEvolution[] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().evolutions,
        () => getSnapshot().evolutions,
    )
}

/** LIGUE : le sacre du Champion (Hall of Fame) à jouer, ou null. */
export function useChampionRun(): BattleStoreState["championRun"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().championRun,
        () => getSnapshot().championRun,
    )
}

/** ARÈNE : victoire de gym à graver au Hall of Fame par arène (équipe gelée + badge), ou null. */
export function useArenaRun(): BattleStoreState["arenaRun"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().arenaRun,
        () => getSnapshot().arenaRun,
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

export function useDuelResult(): BattleStoreState["duelResult"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().duelResult,
        () => getSnapshot().duelResult,
    )
}

export function useFrontierResult(): BattleStoreState["frontierResult"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().frontierResult,
        () => getSnapshot().frontierResult,
    )
}

export function useNgplusFinalPending(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().ngplusFinalPending,
        () => false,
    )
}

export function useNgplusFinalResult(): BattleStoreState["ngplusFinalResult"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().ngplusFinalResult,
        () => null,
    )
}

export function useBadgeAwarded(): BadgeId | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().badgeAwarded,
        () => getSnapshot().badgeAwarded,
    )
}

export function useRematchReward(): BattleStoreState["rematchReward"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().rematchReward,
        () => getSnapshot().rematchReward,
    )
}

/** Don de la Pierre Gékroc (mini-boss Centrale) → notification post-combat ; null sinon. */
export function useStoneReward(): string | null {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().stoneReward,
        () => getSnapshot().stoneReward,
    )
}
export function clearStoneReward() {
    setStore({ stoneReward: null })
}

/** RUN 3 — teaser Dieu Spag sur Lavapetit à afficher post-combat ('seen'|'caught'), ou null. */
export function useLavapetitTeaser(): BattleStoreState["lavapetitTeaser"] {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().lavapetitTeaser,
        () => getSnapshot().lavapetitTeaser,
    )
}
export function clearLavapetitTeaser() {
    setStore({ lavapetitTeaser: null })
}

/** Un Daemon vient d'être capturé (signal transitoire pour l'UI, ex. carrousel génétique). */
export function useJustCaught(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => getSnapshot().justCaught,
        () => getSnapshot().justCaught,
    )
}
export function clearJustCaught() {
    setStore({ justCaught: false })
}
