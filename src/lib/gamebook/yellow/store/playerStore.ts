// src/lib/gamebook/yellow/store/playerStore.ts
//
// Nexus Jaune Éclair — état PERSISTANT du joueur : équipe (max 6), PC (réserve),
// objets. Store externe (useSyncExternalStore). Source de vérité hors combat ;
// le combat travaille sur une COPIE de l'équipe et resynchronise à la fin.

import { useSyncExternalStore } from "react"
import type { MonInstance, MoveSlot } from "../battle/types"
import { fullStats } from "../battle/stats"
import { getSpecies, registerCustomSpecies, isCustomSpeciesId, CANONICAL_NEMESIS } from "../data/species"
import { NEMESIS_ARMED_MARKER } from "../data/nemesisChallenge"
import { LEAGUE_PLUS3_MARKER } from "../data/fusionLeague"
import { type CustomSpec, type StoredCustomDaemon, buildCustomSpecies, buildNemesis, customStarterSpeciesId, customLineageBaseId } from "../create/customSpecies"
import { FUSION_BASE_SPECIES } from "../data/fusionBaseSpecies"
import { UKOGNOFY_SPECIES } from "../data/ukognofy"
import { tradeEvolutionTarget, applyEvolution, type EvolutionResult } from "../battle/evolution"
import { getMove } from "../data/moves"
import { getItem, MAGNETOR_EVO_ITEM } from "../data/items"
import { isHeldItem, getHeldItem } from "../data/heldItems"
import { SAIYAN_POINT_VALUE } from "../data/saiyanConfig"
import { BADGE_REPS_CAP_BONUS } from "../data/badges"
import { getCt, canLearnCt, purchasableCts, run2BlackjackCtPool, type BadgeId } from "../data/cts"
import { emptyLabDefi, casinoWinningCase, CASINO_NUM_CASES, CASINO_MIN_BET, CASINO_MAX_BET, CASINO_WIN_MULT, CASINO_BANKRUPT_STREAK, CASINO_BANKRUPT_COOLDOWN_MS, TONYTONY_TARGET, TONYTONY_SHINY_TARGET, TONYTONY_LEVEL, TONYTONY_SPECIES, MEROREM_SPECIES, DAILY_TICKET_VALUE, TICKET_QUEUE_MAX, ROULETTE_CLAIMED_MAX, BLESSING_QUEUE_MAX, casinoFloorTiles, isCasinoFloorTile, CHIP_MIN, CHIP_MAX, CHIP_TICKET_VALUE, isSecretChipMilestone, clampTicketValue, SPAG_GIFT_TICKET_COUNT, SPAG_GIFT_TICKET_VALUE, STEP_GIFT_CREDIT, BLACKJACK_CT_TARGET, BLACKJACK_CT_ID, BLACKJACK_CT_NGPLUS_TARGET, type LabDefiState, type LabActiveDefi } from "../data/labDefis"
import { createMonInstance } from "../battle/factory"
import { emptyYellowStats, type YellowStats } from "../storage/save"
import type { StatKey } from "../battle/types"
import { expForLevel, levelFromExp, applyExp, MAX_LEVEL, type ExpResult } from "../battle/xp"
import type { WildPlayerCtx } from "../data/encounters"
import { aceTargetLevel, bestCounter, ACE_EASY_START } from "../data/ace"
import { GEKROC_STONE_ITEM, PANTHEON_BASE_ID, PANTHEON_STONE_EVOS } from "../data/gekroc"
import { markCaught, getPokedex } from "./pokedexStore"
import type { PokeType } from "../battle/types"

export const TEAM_MAX = 6

/** Super Pasta : +1 niveau. Prix = (60 + bonus journalier) × 1.5^achats du jour. */
export const SUPER_PASTA_BASE = 60
/** Le prix plancher augmente de ce montant à chaque nouveau jour de jeu. */
export const SUPER_PASTA_DAILY_INCREASE = 3
export const SUPER_PASTA_GROWTH = 1.5

interface PlayerState {
    team: MonInstance[]
    pc: MonInstance[]
    items: Record<string, number>
    /** Portefeuille : reps stockés (dépensés en boutique ET pour attaquer). Persisté. */
    reps: number
    /** Plafond de stockage des reps (1000 au départ, augmenté par les badges d'arène). */
    repsCap: number
    /** Dernier jour tické (reset quotidien pasta/sbire). */
    creditedThrough: string
    /** High-water des reps banquées en énergie (total déjà crédité). -1 = non initialisé. */
    repsBankedTotal: number
    /** Cadeau de bienvenue (100 énergie) déjà réclamé ? */
    welcomeGift: boolean
    /** 1re partie de poker (tuto solo house-funded) déjà jouée ? → ensuite = cash quotidien / multi. */
    pokerFirstGameDone: boolean
    /** CASH QUOTIDIEN vs les boss : tapis du jour de chaque boss (nom → reps ; 0 = ruiné/out du jour). Persiste
     *  entre tes parties du jour, reset à minuit. Le cap des DONS de la maison = pokerCashCap. */
    pokerBossStacks: Record<string, number>
    pokerCashCap: number   // ton buy-in à la 1re partie du jour (plafond des jetons donnés aux boss)
    pokerCashDate: string  // jour courant du cash (reset des tapis boss quand il change)
    /** Cadeau du DIEU SPAG (+150 énergie, one-shot événementiel) déjà réclamé ? */
    spagGift: boolean
    /** Cadeau du DIEU DES PÂTES (poster mural du Centre, +100 énergie, one-shot) déjà réclamé ? */
    pastaGodGift: boolean
    /** Nb de Super Pastas achetés aujourd'hui (remis à 0 chaque jour ; gonfle le prix ×1.5). */
    pastaBoughtToday: number
    /** VŒU DU GÉNIE (cap casino) : énergie MISÉE au casino aujourd'hui (reset quotidien), pour le plafond 200/jour. */
    casinoSpentToday: number
    /** Bonus cumulé sur le prix plancher du Super Pasta (+3 par jour de jeu écoulé). */
    pastaDayBonus: number
    /** DÔME : nb de tournois gagnés (titres) → tier max débloqué + palmarès. Permanent. */
    domeChampionships: number
    /** Ids des dresseurs déjà battus. */
    defeatedTrainers: string[]
    /** Ids des dresseurs déjà RE-battus (match retour / rematch fait). */
    rematchedTrainers: string[]
    /** Badges d'arène gagnés (Feu/Plante/Eau). */
    badges: BadgeId[]
    /** Stats d'effort du jour (PushQuest) qui modulent les rencontres. Null = neutre. */
    wildCtx: WildPlayerCtx | null
    /** Cinématique d'intro (choix du starter) déjà jouée ? */
    introSeen: boolean
    /** Victoires sur le sbire AUJOURD'HUI (reset au tick quotidien ; plafond 2). */
    sbireDefeatsToday: number
    /** Daemomaniaque : consultations du jour (reset au tick ; 5 gratuites puis payant). Optionnel (défaut 0). */
    consultsToday?: number
    /** GALIJAH : captures sauvages RÉUSSIES aujourd'hui (reset au tick quotidien). À la 150ᵉ → Galijah s'arme. Optionnel (défaut 0). */
    capturesToday?: number
    /** Victoires totales sur le sbire (cumulatif → cycle des explications app). */
    sbireWinsTotal: number
    /** Réputation PvP (matchs + usages pour fétiche/favorite). */
    pvpStats: PvpStats
    domeStats?: DomeStats // stats DÔME UNIQUEMENT (fétiches + bilan tournois) — optionnel, défaut vide
    stats: YellowStats
    /** ACE (rival) — pic de niveau mémorisé (ratchet, ne régresse jamais). */
    acePeakLevel: number
    /** Mémoire de niveau des espèces-contre (slot 6 adaptatif). */
    aceBox: Record<string, number>
    /** Taille d'équipe d'ACE (cliquet de la taille du joueur, min 3 = les 3 panthères, ne redescend jamais). */
    aceTeamSizePeak: number
    /** Nombre de fois où le joueur a battu ACE (récompenses). */
    aceWins: number
    /** Jour (= creditedThrough) où ACE a été battu → 1 défaite/jour. */
    aceDefeatedDate: string
    /** DUELS reflets (Viridian/arène eau) : userId du joueur-IA → jour (=creditedThrough) de la
     *  dernière victoire → limite « 1 victoire par joueur-IA et par jour ». */
    duelWins: Record<string, string>
    /** CT CADEAUX possédées (remises par les boss) : enseignables GRATUITEMENT. */
    ownedCts: string[]
    /** CT « achat unique » déjà achetées (ex. Météores) → retirées du shop définitivement. */
    boughtCts: string[]
    /** GÉKROC (mini-boss de la Centrale) vaincu OU capturé (one-time) → ne réapparaît plus. */
    gekrocResolved: boolean
    /** COLLECTIONNEUR DE SPECTRES (maison hantée) : espèces SPECTRE distinctes montrées en combat gagné. */
    hhSpectresShown: string[]
    /** COLLECTIONNEUR DE SPECTRES : nombre de victoires contre lui (réward = 3 victoires + 3 spectres). */
    hhCollectorWins: number
    /** LIGUE : le joueur a battu LE MAÎTRE (Champion du Nexus) → Hall of Fame / post-game. */
    isChampion: boolean
    /** BADGE run 1 « Ligue 6-shiny » : sacré Champion avec 6 Daemons TOUS shiny (figé au sacre). */
    leagueSixShiny: boolean
    /** BADGE run 1 « Reflet niveau-sup » : a battu le reflet d'un joueur au niveau cumulé SUPÉRIEUR. */
    mirrorWinHigherLevel: boolean
    /** BAIES (post-Ligue) : secret des baies révélé (Druide run 2 / assistant CHEN) → active la récolte. */
    berrySecretKnown: boolean
    /** BAIES : jour (YYYY-MM-DD) du suivi de récolte courant. */
    berryHarvestDay: string
    /** BAIES : arbres déjà cueillis CE jour ("mapId:x:y") → anti-refarm au refresh. */
    berryHarvestPicked: string[]
    /** DÉNICHEUR (grotte Route Nord) : échange Faukon → Blaziper effectué (one-time). */
    caveTradeDone: boolean
    /** GAMIN (plaine d'entraînement) : confidence entendue de nuit → boost Goshendofy ×2 les nuits suivantes. */
    goshHintHeard: boolean
    /** DRESSEUR D'ORCALINE (plaine) : nb de victoires (pilote le niveau : 35 + 10×victoires). */
    orcalineWins: number
    /** DRESSEUR D'ORCALINE : jour (=creditedThrough) de la dernière victoire → 1 combat gagnant/jour. */
    orcalineDate: string
    /** PNJ 5 (gardien de la Grotte du Nexus) : nb de victoires du joueur → SCALING (+2 niveaux/victoire pour ses Gek).
     *  PAS de cap journalier (re-battable à chaque visite). */
    pnj5Wins: number
    /** NG+ : nb de combats livrés depuis le lancement du NG+ (fenêtre d'abandon = ≤ NGPLUS_ABANDON_LIMIT). */
    ngplusBattles: number
    /** MAÎTRE DES CAPACITÉS : nb de réapprentissages payés → prix croissant. */
    moveReminderUses: number
    /** SYLVEBARBE ENDORMI : réveillé (true) → ne bloque plus la sortie sud de Ville Jaune. */
    sylvebarbeAwake: boolean
    /** DÉFIS DU LABO (étage du Centre) : défi actif, flags one-shot, cumul dégâts CT, casino/Tonytony. */
    labDefi: LabDefiState
    /** DAEMONS CUSTOM créés (post-Ligue) — persistés + ré-enregistrés au chargement (Phase 2). */
    customDaemons: StoredCustomDaemon[]
    /** RUN 2 — timestamp (ms) de lancement du NG+ ; undefined hors NG+. Sert au « temps réel » écoulé. */
    ngplusStartedAt?: number
    /** RUN 2 — temps de jeu ACTIF cumulé (ms), accumulé côté client tant que l'onglet est visible. */
    playtimeMs: number
    /** RUN 2 — potions/soins utilisés PENDANT les combats de Ligue (malus du score « maîtrise »). */
    leaguePotions: number
    /** RUN 2 — le New Game+ a-t-il déjà été lancé ? Survit à la fusion (reste dans le monde live) → interdit
     *  un 2e run 2. Remis à false uniquement par resetForIntro (reset complet du run 1). */
    ngplusUsed: boolean
    /** RUN 3 (concours) — le run 3 a-t-il déjà été lancé ? Jumeau de ngplusUsed (survit à la fusion). Défaut false. */
    run3Used: boolean
    /** RUN 2 — Maître de Ligue battu, il RESTE le combat de fin (vs l'ancienne équipe). Marqueur persistant : tant
     *  qu'il est true, le joueur n'est PAS encore Champion et le combat final reste accessible (auto-relance + bouton
     *  menu, survit au refresh). Voir save.ts. Défaut false. */
    ngplusMaitreBeaten: boolean
    /** RUN 3 — speciesId de base du starter CHOISI (elefer/cornaive/coccipoing) → sert au counter d'ACE. "" hors run 3. */
    run3StarterBase: string
    /** REJEU RUN 2 — speciesId du starter du run 2 (le Daemon perso du NG+), pour rejouer le run 2 même après canonisation. Global. */
    ngplusStarterBase?: string
    /** RUN 3 — ennemis vaincus (boss + Ligue) pour le SCORE. Per-monde. Défaut []. */
    run3Defeated: { key: string; level: number }[]
    /** RUN 3 — score « Survivant » : énergie restante relevée à la fin de chaque arène/Ligue (clé → snapshot). Per-monde. */
    run3EnergyByArena: Record<string, number>
    /** POKÉDEX — espèces capturées CE run (overlay per-monde par-dessus le Pokédex cumulatif). Défaut []. */
    caughtThisRun: string[]
    /** ATELIER DE FUSION — jusqu'à 6 paires {uid A, uid B} = l'équipe de fusion du joueur (Ligue de Fusion + PvP). */
    fusionRoster: { a: string; b: string }[]
    fusionHistory: { a: string; b: string }[] // JOURNAL permanent des fusions créées (speciesId des 2 parents, a=tête). Fusiodex.
    /** RUN 3 — teaser Dieu Spag Lavapetit vu / capturé (one-time, per-monde). Défaut false. */
    run3LavapetitSeen: boolean
    run3LavapetitCaught: boolean
    /** MIMIMOY (roaming LIVE) — rendu au brocanteur (roaming armé) ? + nb d'apparitions (0..10). Défaut false / 0. */
    mimimoyReturned: boolean
    mimimoyAppearances: number
    /** VŒU DU GÉNIE (LIVE) — ⚡ restant à dépenser avant de pouvoir réutiliser/acheter une Ball (verrou si > 0). Défaut 0. */
    ballLockRemaining: number
    /** VŒU DU GÉNIE — rencontre FORCÉE one-shot (JSON {speciesId,level,hard}) consommée au prochain sauvage. */
    forcedEncounter?: string
    /** LIGUE DE FUSION — usure du gauntlet persistée (JSON) pour REPRENDRE la ligue au reload (équipe abîmée). */
    fusionLeagueCarry?: string
    /** VŒU « ABONDANCE MAUDITE » (Jacanon) — début (ms), nb d'objets gratuits pris, date du dernier objet gratuit. */
    curseAbundanceStart?: number
    curseFreeItemsTaken?: number
    curseFreeItemDate?: string
}

/** Statistiques PvP du joueur (réputation). */
export interface PvpStats {
    wins: number
    losses: number
    /** Matchs que J'AI abandonnés (comptés aussi dans `losses`). */
    forfeits: number
    /** speciesId → nb de fois envoyé/utilisé en PvP (→ "Daemon fétiche"). */
    daemonUse: Record<string, number>
    /** moveId → nb d'utilisations en PvP (→ "attaque favorite"). */
    moveUse: Record<string, number>
    /** speciesId → total des dégâts INFLIGÉS en duel PvP (→ top-5 « plus gros dégâts »). Non rétroactif. */
    dmgByDaemon: Record<string, number>
}

export function emptyPvpStats(): PvpStats {
    return { wins: 0, losses: 0, forfeits: 0, daemonUse: {}, moveUse: {}, dmgByDaemon: {} }
}

/** Stats DÔME UNIQUEMENT (≠ pvpStats qui compte TOUS les combats) : Daemons/attaques joués DANS les tournois du
 *  Dôme + bilan de tournois. Alimenté SEULEMENT pendant un combat trainerId "frontier:DOME". */
export interface DomeStats {
    wins: number   // tournois REMPORTÉS
    losses: number // tournois PERDUS (éliminé avant / finale perdue)
    daemonUse: Record<string, number> // speciesId → coups joués au Dôme
    moveUse: Record<string, number>   // moveId → coups joués au Dôme
}
export function emptyDomeStats(): DomeStats { return { wins: 0, losses: 0, daemonUse: {}, moveUse: {} } }

let st: PlayerState = { team: [], pc: [], items: {}, domeChampionships: 0, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pokerFirstGameDone: false, pokerBossStacks: {}, pokerCashCap: 0, pokerCashDate: "", spagGift: false, pastaGodGift: false, pastaBoughtToday: 0, casinoSpentToday: 0, pastaDayBonus: 0, defeatedTrainers: [], rematchedTrainers: [], badges: [], wildCtx: null, introSeen: false, sbireDefeatsToday: 0, capturesToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), stats: emptyYellowStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", duelWins: {}, ownedCts: [], boughtCts: [], gekrocResolved: false, hhSpectresShown: [], hhCollectorWins: 0, isChampion: false, leagueSixShiny: false, mirrorWinHigherLevel: false, berrySecretKnown: false, berryHarvestDay: "", berryHarvestPicked: [], caveTradeDone: false, goshHintHeard: false, orcalineWins: 0, orcalineDate: "", pnj5Wins: 0, ngplusBattles: 0, moveReminderUses: 0, sylvebarbeAwake: false, labDefi: emptyLabDefi(), customDaemons: [], ngplusStartedAt: undefined, playtimeMs: 0, leaguePotions: 0, ngplusUsed: false, run3Used: false, ngplusMaitreBeaten: false, run3StarterBase: "", run3Defeated: [], run3EnergyByArena: {}, caughtThisRun: [], fusionRoster: [], fusionHistory: [], run3LavapetitSeen: false, run3LavapetitCaught: false, mimimoyReturned: false, mimimoyAppearances: 0, ballLockRemaining: 0 }
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

export function subscribePlayer(l: () => void): () => void {
    listeners.add(l)
    return () => { listeners.delete(l) }
}

export function getPlayer(): PlayerState { return st }

// NG+ (2 mondes navigables) — monde ACTIF que le joueur contrôle. Runtime ; la sérialisation (stash du
// monde inactif, fusion des 2 mondes) est gérée par saveManager. Émet pour que l'UI se re-rende à la bascule.
export type WorldId = "live" | "ngplus" | "run3" | "replay"
let activeWorld: WorldId = "live"
export function getActiveWorld(): WorldId { return activeWorld }
export function setActiveWorld(w: WorldId) { if (w === activeWorld) return; activeWorld = w; emit() }
/** Hook React : monde actif (re-render à la bascule). */
export function useActiveWorld(): WorldId {
    return useSyncExternalStore(subscribePlayer, getActiveWorld, () => "live")
}

// === REJEU (« run bis ») — contexte de la bulle isolée. `replayRun` pilote les RÈGLES (énergie) du run rejoué ;
// `replayReturn` = monde réel à réactiver en sortant. Portés ici (état de nav) ; sérialisés par saveManager. ===
let replayRun: "run1" | "run2" | "run3" | null = null
let replayReturn: "live" | "ngplus" | "run3" | null = null
export function getReplayRun(): "run1" | "run2" | "run3" | null { return replayRun }
export function getReplayReturn(): "live" | "ngplus" | "run3" | null { return replayReturn }
export function setReplayContext(run: "run1" | "run2" | "run3", ret: "live" | "ngplus" | "run3") { replayRun = run; replayReturn = ret }
export function clearReplayContext() { replayRun = null; replayReturn = null }
/** Mode de RÈGLES effectif : hors rejeu = monde actif ; en rejeu = le run rejoué (la bulle suit ses règles d'énergie). */
function runMode(): "live" | "ngplus" | "run3" {
    if (activeWorld !== "replay") return activeWorld
    return replayRun === "run3" ? "run3" : replayRun === "run2" ? "ngplus" : "live"
}
/** Monde EFFECTIF (public) : hors rejeu = monde actif ; en rejeu = le run rejoué. Pour tout code qui tague/
 *  choisit selon le run (Hall of Fame, Gékroc, Orcaline, arène…) et ne doit jamais voir la valeur "replay". */
export function effectiveRunWorld(): "live" | "ngplus" | "run3" { return runMode() }

/** REJEU — amorce un run FRAIS dans les stores (la bulle). run1 = intro (starter choisi ensuite) ; run2/run3
 *  exigent un starter. Les flags `used` posés ici vivent dans la bulle (jetée à la sortie) → sans effet sur le réel.
 *  L'énergie de départ + le passage activeWorld="replay" sont gérés par saveManager.startReplay. */
export function startReplayWorld(run: "run1" | "run2" | "run3", starter: MonInstance | null): boolean {
    if (run === "run1") {
        resetForIntro()                                     // monde run 1 FRAIS (reps/énergie regérés ensuite par startReplay)
        // BOUCLE ENDGAME : si un starter custom est fourni, on l'installe en équipe et on SAUTE l'intro (comme
        //   startNgPlusWorld) — le joueur repart directement avec son Daemon perso. Sinon (rejeu classique du menu),
        //   introSeen reste false → l'intro choisit un starter de base. customDaemons est préservé par resetForIntro.
        if (starter) { st = { ...st, team: [starter], introSeen: true }; emit() }
        return true
    }
    if (!starter) return false
    if (run === "run2") { startNgPlusWorld(starter); return true }
    startRun3World(starter); return true
}

// === PARRAINAGE — MODES DE JEU (énergie) ===
// Choisi à l'inscription (User.gameMode), transmis par le client APRÈS résolution du compte, AVANT le
// chargement de la save (sinon bankReps créditerait les vrais reps d'un compte easy/debutant).
//  - "normal"   : énergie = vrais reps (bankReps) — comportement historique, seuls comptes concernés = les 7 potes.
//  - "easy"     : 3000 au départ + 1 recharge de 3000 à sec  → 2 remplissages = 6000 en tout.
//  - "debutant" : 1000 au départ + 5 recharges de 1000 à sec → 6 remplissages = 6000 en tout.
// La recharge se déclenche quand l'énergie ne suffit plus pour agir (spendReps) ou tombe pile à 0, tant qu'il
// reste des remplissages (compteur `stats.modeFillsUsed`, persisté). Modes actifs UNIQUEMENT sur le monde live.
export type GameMode = "normal" | "easy" | "debutant"
let gameMode: GameMode = "normal"
export function setGameMode(m: string | null | undefined) { gameMode = m === "easy" || m === "debutant" ? m : "normal" }
export function getGameMode(): GameMode { return gameMode }

const MODE_CFG: Record<GameMode, { fill: number; maxFills: number }> = {
    normal: { fill: 0, maxFills: 0 },
    easy: { fill: 3000, maxFills: 2 },
    debutant: { fill: 1000, maxFills: 6 },
}
/** Remplissages d'énergie restants pour les modes easy/debutant (0 en normal). Pour l'affichage. */
export function modeFillsRemaining(): number {
    const cfg = MODE_CFG[gameMode]
    if (cfg.fill <= 0) return 0
    return Math.max(0, cfg.maxFills - (st.stats.modeFillsUsed ?? 0))
}
/** Montant du remplissage du mode (0 en normal) — pour l'affichage. */
export function modeFillAmount(): number { return MODE_CFG[gameMode].fill }

// Événement de recharge à consommer par l'UI (toast). Montant du dernier remplissage, ou null.
let lastModeRecharge: number | null = null
export function consumeModeRechargeEvent(): number | null { const v = lastModeRecharge; lastModeRecharge = null; return v }

/** easy/debutant, monde live : effectue UN remplissage d'énergie s'il en reste (remonte à `fill`, relève le
 *  plafond au besoin). Renvoie true si rechargé. No-op en normal / hors live / budget épuisé. */
function tryModeRecharge(): boolean {
    if (runMode() !== "live") return false
    const cfg = MODE_CFG[gameMode]
    if (cfg.fill <= 0) return false
    const used = st.stats.modeFillsUsed ?? 0
    if (used >= cfg.maxFills) return false
    st = { ...st, reps: Math.max(st.reps, cfg.fill), repsCap: Math.max(st.repsCap, cfg.fill), stats: { ...st.stats, modeFillsUsed: used + 1 } }
    lastModeRecharge = cfg.fill
    emit()
    return true
}

/** À l'arrivée (après chargement / nouvelle partie) : crédite le remplissage de DÉPART des modes easy/debutant,
 *  une seule fois (idempotent via modeFillsUsed>0). No-op en normal ou si déjà démarré. */
export function ensureModeStartGrant(): void {
    if (MODE_CFG[gameMode].fill <= 0) return
    if ((st.stats.modeFillsUsed ?? 0) > 0) return
    tryModeRecharge()
}

/** NG+ : incrémente le compteur de combats (fenêtre d'abandon = ≤ NGPLUS_ABANDON_LIMIT). No-op hors NG+. */
export function incNgplusBattles() {
    if (activeWorld !== "ngplus") return
    st = { ...st, ngplusBattles: st.ngplusBattles + 1 }
    emit()
}

/** DAEMON CUSTOM créé : l'enregistre au registre runtime (résolvable en combat) ET le persiste dans la save
 *  (ré-enregistré au chargement). Idempotent-ish : borne la liste, ignore une spec qui ne se construit pas. */
export function addCustomDaemon(ownerId: string, spec: CustomSpec): void {
    try { registerCustomSpecies(buildCustomSpecies(spec, ownerId)) } catch { return } // spec illégale → on n'enregistre rien
    const MAX = 40 // relevé (la boucle endgame permet plus de créations) ; le vrai garde-fou est l'éviction ci-dessous
    const list: StoredCustomDaemon[] = [...st.customDaemons, { ownerId, spec }]
    let trimmed = list
    if (list.length > MAX) {
        // RÈGLE D'OR : ne JAMAIS évincer une lignée RÉFÉRENCÉE par un Daemon POSSÉDÉ (équipe/PC). Sinon, au reload,
        //   reregisterCustomDaemons ne la ré-enregistre plus → l'instance possédée devient irrésoluble (speciesOf
        //   throw = combat/dex cassés pour un Daemon réel). On retire les PLUS ANCIENNES lignées NON référencées
        //   jusqu'à revenir sous le plafond ; on garde TOUTES les référencées + la plus récente (quitte à dépasser
        //   MAX transitoirement — la sécurité d'un owned prime sur le plafond de confort).
        const ownedIds = [...st.team, ...st.pc].map((m) => m.speciesId)
        const isReferenced = (d: StoredCustomDaemon) => { const base = customLineageBaseId(d); return ownedIds.some((sid) => sid === base || sid.startsWith(`${base}_`)) }
        let excess = list.length - MAX
        trimmed = list.filter((d, i) => {
            if (excess <= 0 || i === list.length - 1 || isReferenced(d)) return true // rien à retirer / la nouvelle / protégée
            excess--; return false // plus ancienne lignée NON référencée → évincée
        })
    }
    st = { ...st, customDaemons: trimmed }
    emit()
}
/** Attache les sprites GÉNÉRÉS (Gemini, 1 par stade — index 0 = stade 1) à une lignée custom déjà créée, puis
 *  RÉ-ENREGISTRE l'espèce (le combat/Pokédex montrent enfin les vrais sprites au lieu de MISSINGNO) et persiste.
 *  Positionnel : un slot vide ("" / null) laisse le sprite existant (regénération partielle) → MISSINGNO en dernier. */
export function setCustomDaemonSprites(ownerId: string, specName: string, spriteUrls: (string | null)[]): void {
    if (!Array.isArray(spriteUrls) || !spriteUrls.some((u) => typeof u === "string" && u)) return // rien de généré → on garde ce qu'on a
    let changed = false
    const next = st.customDaemons.map((d) => {
        if (d.ownerId !== ownerId || d.spec.name !== specName) return d
        const merged = spriteUrls.map((u, i) => (typeof u === "string" && u ? u : (d.spec.spriteUrls?.[i] ?? ""))) // "" = falsy → buildCustomSpecies retombe sur canonisé/MISSINGNO
        const spec: CustomSpec = { ...d.spec, spriteUrls: merged }
        try { registerCustomSpecies(buildCustomSpecies(spec, d.ownerId)); changed = true } catch { return d } // spec cassée → on garde l'ancien enregistrement
        return { ownerId: d.ownerId, spec }
    })
    if (!changed) return
    st = { ...st, customDaemons: next }
    emit()
}
/** Ré-enregistre au chargement toutes les lignées custom persistées (défensif : une entrée cassée est ignorée). */
export function reregisterCustomDaemons(): void {
    // FUSIONS DE BASE PERMANENTES (Grotte du Nexus) : enregistrées comme espèces custom → résolvables (getSpecies /
    //   createMonInstance) pour les rencontres sauvages, MAIS invisibles du Pokédex principal (visibleDexSpecies
    //   n'itère que SPECIES, jamais le registre custom) → anti-spoiler par construction. Le Fusiodex les listera à part.
    registerCustomSpecies(FUSION_BASE_SPECIES)
    registerCustomSpecies([UKOGNOFY_SPECIES]) // légendaire ultime : espèce permanente (capture keepable, hors dex principal)
    for (const d of st.customDaemons) { try { registerCustomSpecies(buildCustomSpecies(d.spec, d.ownerId)) } catch { /* entrée corrompue → ignorée */ } }
}

/** RUN 3 — le starter qui CONTRE celui du joueur (triangle 🔩Métal›🧚Fée›🦗Combat›🔩Métal) → ACE le fielde en
 *  némésis (id de STADE 1 ; speciesAtLevel l'évolue au bon stade). null hors run 3 / starter inconnu. */
const RUN3_STARTER_COUNTER: Record<string, string> = { elefer: "coccipoing", cornaive: "elefer", coccipoing: "cornaive" }
export function getRun3AceNemesis(): string | null {
    return RUN3_STARTER_COUNTER[st.run3StarterBase] ?? null
}
/** RUN 3 — le 3e starter (NI celui du joueur, NI celui d'ACE) : double-saut du cycle. C'est le cadeau de
 *  l'ÉLEVEUR. Ex. joueur=elefer → ACE=coccipoing → 3e = cornaive. null hors run 3 / starter inconnu. */
export function getRun3ThirdStarter(): string | null {
    const ace = getRun3AceNemesis()
    return ace ? (RUN3_STARTER_COUNTER[ace] ?? null) : null
}

/** NG+ — lignée NÉMÉSIS (contre-lignée) du Daemon custom que le joueur JOUE en NG+ : trouve le custom dans
 *  l'équipe, retrouve sa spec, génère + enregistre son Némésis (déterministe, idempotent), renvoie son
 *  speciesId de STADE 1 (pour l'équipe d'ACE / le cadeau). null si pas de custom en équipe ou spec introuvable. */
export function getNgplusNemesisSpeciesId(): string | null {
    // 1) STARTER CANONIQUE avec némésis dédié (ex. Gavillus → Goatiny/Mouflorage) : ACE field la contre-lignée
    //    canonique (id de STADE 1 ; speciesAtLevel l'évolue au bon stade côté équipe d'ACE / cadeau).
    for (const m of st.team) { const canon = CANONICAL_NEMESIS[m.speciesId]; if (canon) return canon }
    // 2) Sinon : Daemon CUSTOM (wizard) → némésis auto-généré (buildNemesis, déterministe, idempotent).
    const teamCustom = st.team.find((m) => isCustomSpeciesId(m.speciesId))
    if (!teamCustom) return null
    const stored = st.customDaemons.find((d) => teamCustom.speciesId.startsWith(customLineageBaseId(d)))
    if (!stored) return null
    try {
        const nemSpec = buildNemesis(stored.spec)
        const nemOwner = `nem_${stored.ownerId}`
        registerCustomSpecies(buildCustomSpecies(nemSpec, nemOwner)) // idempotent (ré-écrit l'entrée du registre)
        return customStarterSpeciesId({ ownerId: nemOwner, spec: nemSpec })
    } catch { return null }
}

/** Migrations d'items au chargement (idempotentes). Replie les ids FANTÔMES historiques vers l'id
 *  réel, pour que les objets gagnés avant un correctif redeviennent visibles/utilisables dans le sac
 *  (le sac n'affiche que les ids définis dans ITEMS). Récupère aussi les balles déjà « perdues ».
 *  - "nexus_ball" (récompense des duels reflets, id inexistant) → "poke_ball" (la vraie « Nexus-Ball »). */
const ITEM_ID_MIGRATIONS: Record<string, string> = { nexus_ball: "poke_ball" }
function migrateItems(items: Record<string, number>): Record<string, number> {
    let changed = false
    const out: Record<string, number> = { ...items }
    for (const [oldId, newId] of Object.entries(ITEM_ID_MIGRATIONS)) {
        if (!(oldId in out)) continue
        const n = out[oldId]
        if (n && n > 0) out[newId] = (out[newId] ?? 0) + n
        delete out[oldId]
        changed = true
    }
    return changed ? out : items
}

export function hydratePlayer(p: Partial<PlayerState>) {
    st = {
        team: p.team ?? [], pc: p.pc ?? [], items: migrateItems(p.items ?? {}),
        reps: p.reps ?? st.reps ?? 0, repsCap: p.repsCap ?? st.repsCap ?? 1000, creditedThrough: p.creditedThrough ?? st.creditedThrough ?? "",
        repsBankedTotal: p.repsBankedTotal ?? st.repsBankedTotal ?? -1, welcomeGift: p.welcomeGift ?? st.welcomeGift ?? false,
        pokerFirstGameDone: p.pokerFirstGameDone ?? st.pokerFirstGameDone ?? false,
        pokerBossStacks: p.pokerBossStacks ?? st.pokerBossStacks ?? {},
        pokerCashCap: p.pokerCashCap ?? st.pokerCashCap ?? 0,
        pokerCashDate: p.pokerCashDate ?? st.pokerCashDate ?? "",
        spagGift: p.spagGift ?? st.spagGift ?? false,
        pastaGodGift: p.pastaGodGift ?? st.pastaGodGift ?? false,
        pastaBoughtToday: p.pastaBoughtToday ?? st.pastaBoughtToday ?? 0, casinoSpentToday: p.casinoSpentToday ?? st.casinoSpentToday ?? 0, pastaDayBonus: p.pastaDayBonus ?? st.pastaDayBonus ?? 0,
        domeChampionships: p.domeChampionships ?? st.domeChampionships ?? 0,
        defeatedTrainers: p.defeatedTrainers ?? [], rematchedTrainers: p.rematchedTrainers ?? [], badges: p.badges ?? st.badges ?? [], wildCtx: p.wildCtx ?? st.wildCtx ?? null,
        introSeen: p.introSeen ?? st.introSeen ?? false,
        sbireDefeatsToday: p.sbireDefeatsToday ?? st.sbireDefeatsToday ?? 0,
        consultsToday: p.consultsToday ?? st.consultsToday ?? 0,
        capturesToday: p.capturesToday ?? st.capturesToday ?? 0,
        sbireWinsTotal: p.sbireWinsTotal ?? st.sbireWinsTotal ?? 0,
        pvpStats: p.pvpStats ?? st.pvpStats ?? emptyPvpStats(),
        domeStats: p.domeStats ?? st.domeStats ?? emptyDomeStats(),
        stats: p.stats ?? st.stats ?? emptyYellowStats(),
        acePeakLevel: p.acePeakLevel ?? st.acePeakLevel ?? 0,
        aceBox: p.aceBox ?? st.aceBox ?? {},
        aceTeamSizePeak: p.aceTeamSizePeak ?? st.aceTeamSizePeak ?? 3,
        aceWins: p.aceWins ?? st.aceWins ?? 0,
        aceDefeatedDate: p.aceDefeatedDate ?? st.aceDefeatedDate ?? "",
        duelWins: p.duelWins ?? st.duelWins ?? {},
        ownedCts: p.ownedCts ?? st.ownedCts ?? [],
        boughtCts: p.boughtCts ?? st.boughtCts ?? [],
        gekrocResolved: p.gekrocResolved ?? st.gekrocResolved ?? false,
        hhSpectresShown: p.hhSpectresShown ?? st.hhSpectresShown ?? [],
        hhCollectorWins: p.hhCollectorWins ?? st.hhCollectorWins ?? 0,
        isChampion: p.isChampion ?? st.isChampion ?? false,
        leagueSixShiny: p.leagueSixShiny ?? st.leagueSixShiny ?? false,
        mirrorWinHigherLevel: p.mirrorWinHigherLevel ?? st.mirrorWinHigherLevel ?? false,
        berrySecretKnown: p.berrySecretKnown ?? st.berrySecretKnown ?? false,
        berryHarvestDay: p.berryHarvestDay ?? st.berryHarvestDay ?? "",
        berryHarvestPicked: p.berryHarvestPicked ?? st.berryHarvestPicked ?? [],
        caveTradeDone: p.caveTradeDone ?? st.caveTradeDone ?? false,
        goshHintHeard: p.goshHintHeard ?? st.goshHintHeard ?? false,
        orcalineWins: p.orcalineWins ?? st.orcalineWins ?? 0,
        orcalineDate: p.orcalineDate ?? st.orcalineDate ?? "",
        pnj5Wins: p.pnj5Wins ?? st.pnj5Wins ?? 0,
        ngplusBattles: p.ngplusBattles ?? st.ngplusBattles ?? 0,
        moveReminderUses: p.moveReminderUses ?? st.moveReminderUses ?? 0,
        sylvebarbeAwake: p.sylvebarbeAwake ?? st.sylvebarbeAwake ?? false,
        labDefi: p.labDefi ?? st.labDefi ?? emptyLabDefi(),
        customDaemons: p.customDaemons ?? st.customDaemons ?? [],
        // `in` (et non `??`) : ce champ peut LÉGITIMEMENT être undefined (monde live) → il faut pouvoir le VIDER
        // en repassant du NG+ au live. Avec `??`, un undefined explicite ne nettoierait pas la valeur NG+ résiduelle.
        ngplusStartedAt: "ngplusStartedAt" in p ? p.ngplusStartedAt : st.ngplusStartedAt,
        playtimeMs: p.playtimeMs ?? st.playtimeMs ?? 0,
        leaguePotions: p.leaguePotions ?? st.leaguePotions ?? 0,
        ngplusUsed: p.ngplusUsed ?? st.ngplusUsed ?? false,
        run3Used: p.run3Used ?? st.run3Used ?? false,
        ngplusMaitreBeaten: p.ngplusMaitreBeaten ?? st.ngplusMaitreBeaten ?? false,
        run3StarterBase: p.run3StarterBase ?? st.run3StarterBase ?? "",
        ngplusStarterBase: p.ngplusStarterBase ?? st.ngplusStarterBase,
        run3Defeated: p.run3Defeated ?? st.run3Defeated ?? [],
        run3EnergyByArena: p.run3EnergyByArena ?? st.run3EnergyByArena ?? {},
        caughtThisRun: p.caughtThisRun ?? st.caughtThisRun ?? [],
        fusionRoster: p.fusionRoster ?? st.fusionRoster ?? [],
        fusionHistory: p.fusionHistory ?? st.fusionHistory ?? [],
        run3LavapetitSeen: p.run3LavapetitSeen ?? st.run3LavapetitSeen ?? false,
        run3LavapetitCaught: p.run3LavapetitCaught ?? st.run3LavapetitCaught ?? false,
        mimimoyReturned: p.mimimoyReturned ?? st.mimimoyReturned ?? false,
        mimimoyAppearances: p.mimimoyAppearances ?? st.mimimoyAppearances ?? 0,
        ballLockRemaining: p.ballLockRemaining ?? st.ballLockRemaining ?? 0,
        forcedEncounter: p.forcedEncounter ?? st.forcedEncounter,
        fusionLeagueCarry: p.fusionLeagueCarry ?? st.fusionLeagueCarry,
        curseAbundanceStart: "curseAbundanceStart" in p ? p.curseAbundanceStart : st.curseAbundanceStart,
        curseFreeItemsTaken: "curseFreeItemsTaken" in p ? p.curseFreeItemsTaken : st.curseFreeItemsTaken,
        curseFreeItemDate: "curseFreeItemDate" in p ? p.curseFreeItemDate : st.curseFreeItemDate,
    }
    emit()
}

/** Marque la cinématique d'intro comme jouée. */
export function markIntroSeen() {
    if (st.introSeen) return
    st = { ...st, introSeen: true }
    emit()
}

/** DÔME : enregistre une victoire de tournoi (titre gagné) → débloque le tier suivant + gonfle le palmarès. */
export function recordDomeChampionship() {
    st = { ...st, domeChampionships: st.domeChampionships + 1 }
    emit()
}

/** GÉKROC : marque le mini-boss comme vaincu OU capturé (one-time, idempotent). */
export function markGekrocResolved() {
    if (st.gekrocResolved) return
    st = { ...st, gekrocResolved: true }
    emit()
}

/** DÉNICHEUR (grotte) : marque l'échange Faukon → Blaziper comme effectué (one-time, idempotent). */
export function markCaveTradeDone() {
    if (st.caveTradeDone) return
    st = { ...st, caveTradeDone: true }
    emit()
}

/** GAMIN (plaine d'entraînement) : confidence entendue de nuit → active le boost Goshendofy ×2 (idempotent). */
export function markGoshHintHeard() {
    if (st.goshHintHeard) return
    st = { ...st, goshHintHeard: true }
    emit()
}

/** SYLVEBARBE : réveille le colosse (appelé par le combat quand on le bat/capture, après l'avoir réveillé
 *  à la Daemonflûte). Idempotent. Tant qu'il dort (false), il bloque la sortie sud (cf. data/sylvebarbeBlock). */
export function markSylvebarbeAwake() {
    if (st.sylvebarbeAwake) return
    st = { ...st, sylvebarbeAwake: true }
    emit()
}

/** COLLECTIONNEUR DE SPECTRES (maison hantée) : enregistre une victoire + les spectres montrés.
 *  Récompense la CT26 (Frappe d'Au-delà) dès 3 VICTOIRES ET 3 spectres DISTINCTS montrés. */
export function recordHhCollectorWin(teamSpectreSpecies: string[]): { wins: number; shown: number; rewarded: boolean } {
    const shown = Array.from(new Set([...st.hhSpectresShown, ...teamSpectreSpecies]))
    const wins = st.hhCollectorWins + 1
    st = { ...st, hhSpectresShown: shown, hhCollectorWins: wins }
    emit()
    let rewarded = false
    if (wins >= 3 && shown.length >= 3 && !st.ownedCts.includes("ct26")) rewarded = grantCt("ct26")
    return { wins, shown: shown.length, rewarded }
}

/** LIGUE : marque le joueur CHAMPION du Nexus (après avoir battu LE MAÎTRE). Idempotent. */
export function setChampion() {
    if (st.isChampion) return
    // BADGE « Ligue 6-shiny » : figé au sacre si l'équipe compte 6 Daemons TOUS shiny (l'équipe peut changer après).
    const sixShiny = st.team.length === 6 && st.team.every((m) => m.shiny === true)
    st = { ...st, isChampion: true, leagueSixShiny: st.leagueSixShiny || sixShiny }
    emit()
}

/** BADGE « Reflet niveau-sup » : a battu le reflet d'un joueur dont le Σ niveaux d'équipe DÉPASSAIT le sien.
 *  One-time monotone (jamais remis à false ; mergeWorlds le préserve en OR). No-op si déjà acquis. */
export function recordMirrorWinHigherLevel() {
    if (st.mirrorWinHigherLevel) return
    st = { ...st, mirrorWinHigherLevel: true }
    emit()
}

/** RUN 2 : pose/retire le marqueur « Maître battu, combat final (vs ancienne équipe) en attente ». Persistant :
 *  survit au refresh → si le flag runtime de fin de Ligue est perdu, le combat reste relançable (bouton menu). */
export function setNgplusMaitreBeaten(v: boolean) {
    if (st.ngplusMaitreBeaten === v) return
    st = { ...st, ngplusMaitreBeaten: v }
    emit()
}

/** POKÉDEX — marque une espèce comme capturée CE run (overlay per-monde). Idempotent. Appelé en paire de
 *  chaque markCaught (le Pokédex global reste inchangé ; ceci distingue « ce run » de « run précédent »). */
export function markCaughtThisRun(speciesId: string) {
    if (!speciesId || st.caughtThisRun.includes(speciesId)) return
    st = { ...st, caughtThisRun: [...st.caughtThisRun, speciesId] }
    emit()
}

/** ATELIER DE FUSION — remplace le roster de fusion (jusqu'à 6 paires {uid A, uid B}). Ne touche PAS aux Daemons
 *  eux-mêmes (juste des références). Persisté. */
export function setFusionRoster(roster: { a: string; b: string }[]) {
    st = { ...st, fusionRoster: roster.slice(0, 6) }
    emit()
}

/** FUSIODEX — journalise une fusion CRÉÉE (speciesId des 2 parents, a=tête/dominant → l'ORDRE compte pour le nom).
 *  Dédup : une même paire (a,b) n'est loggée qu'UNE fois. (a,b) ≠ (b,a) (fusions distinctes). Cap 200. Persisté. */
export function recordFusionCreated(a: string, b: string) {
    if (!a || !b) return
    if (st.fusionHistory.some((p) => p.a === a && p.b === b)) return // déjà connue
    st = { ...st, fusionHistory: [...st.fusionHistory, { a, b }].slice(-200) }
    emit()
}

/** RUN 3 — teaser Dieu Spag Lavapetit : marque la RENCONTRE vue (one-time). Idempotent. */
export function markRun3LavapetitSeen() {
    if (st.run3LavapetitSeen) return
    st = { ...st, run3LavapetitSeen: true }
    emit()
}
/** RUN 3 — teaser Dieu Spag Lavapetit : marque le Lavapetit CAPTURÉ (pose AUSSI seen → pas de re-teaser). */
export function markRun3LavapetitCaught() {
    if (st.run3LavapetitCaught) return
    st = { ...st, run3LavapetitCaught: true, run3LavapetitSeen: true }
    emit()
}

/** RUN 3 — crédite des ennemis VAINCUS au score (dédup par clé). Gardé sur le monde run 3 (aucun effet ailleurs). */
export function addRun3Defeated(entries: { key: string; level: number }[]) {
    if (runMode() !== "run3" || entries.length === 0) return
    const seen = new Set(st.run3Defeated.map((e) => e.key))
    const add = entries.filter((e) => e.key && !seen.has(e.key))
    if (add.length === 0) return
    st = { ...st, run3Defeated: [...st.run3Defeated, ...add.map((e) => ({ key: e.key, level: Math.max(0, Math.floor(e.level)) }))] }
    emit()
}

/** RUN 3 — score « Survivant » : relève l'énergie (reps) restante à la fin d'une arène/Ligue. Idempotent par clé
 *  (une arène ne compte qu'une fois). Ignoré hors run 3. Le score = Σ des snapshots (cf. run3EnergyScore). */
export function addRun3EnergySnapshot(key: string, energy: number) {
    if (runMode() !== "run3" || !key || key in st.run3EnergyByArena) return
    st = { ...st, run3EnergyByArena: { ...st.run3EnergyByArena, [key]: Math.max(0, Math.floor(energy)) } }
    emit()
}

/** MIMIMOY — le joueur a rendu Mimimoy au brocanteur → arme le roaming (monde live). Idempotent. */
export function markMimimoyReturned() {
    if (st.mimimoyReturned) return
    st = { ...st, mimimoyReturned: true }
    emit()
}
/** MIMIMOY — incrémente le compteur d'apparitions du roaming (cap 10 → disparaît ensuite). */
export function bumpMimimoyAppearances() {
    if (st.mimimoyAppearances >= 10) return
    st = { ...st, mimimoyAppearances: st.mimimoyAppearances + 1 }
    emit()
}

// === BAIES (post-Ligue) : secret révélé + récolte quotidienne (anti-refarm au refresh). ==================

/** Révèle le SECRET DES BAIES (Druide en run 2, ou assistant du Prof. CHEN) → active la récolte. Idempotent. */
export function setBerrySecretKnown() {
    if (st.berrySecretKnown) return
    st = { ...st, berrySecretKnown: true }
    emit()
}
export function isBerrySecretKnown(): boolean { return st.berrySecretKnown }

/** Un arbre (mapId,x,y) a-t-il déjà été cueilli aujourd'hui (`day`) ? (Le suivi se réinitialise au jour suivant.) */
export function isBerryTreeHarvested(mapId: string, x: number, y: number, day: string): boolean {
    return st.berryHarvestDay === day && st.berryHarvestPicked.includes(`${mapId}:${x}:${y}`)
}

/** Récolte la baie `berryId` de l'arbre (mapId,x,y) pour le jour `day` → +1 au sac + arbre marqué cueilli
 *  (persisté → pas de re-farm au refresh). Renvoie false si secret inconnu ou arbre déjà cueilli ce jour. */
export function harvestBerryTree(mapId: string, x: number, y: number, day: string, berryId: string): boolean {
    if (!st.berrySecretKnown) return false
    const key = `${mapId}:${x}:${y}`
    const picked = st.berryHarvestDay === day ? st.berryHarvestPicked : [] // nouveau jour → repart à zéro
    if (picked.includes(key)) return false
    st = {
        ...st,
        berryHarvestDay: day,
        berryHarvestPicked: [...picked, key],
        items: { ...st.items, [berryId]: (st.items[berryId] ?? 0) + 1 },
    }
    emit()
    return true
}

/** DEV : remet la progression jaune à zéro pour rejouer l'intro (équipe vidée, introSeen=false). */
export function resetForIntro() {
    activeWorld = "live" // un reset volontaire repart sur le monde d'origine (le NG+ éventuel est effacé par saveManager)
    st = { team: [], pc: [], items: {}, domeChampionships: 0, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: false, pokerFirstGameDone: false, pokerBossStacks: {}, pokerCashCap: 0, pokerCashDate: "", spagGift: false, pastaGodGift: false, pastaBoughtToday: 0, casinoSpentToday: 0, pastaDayBonus: 0, defeatedTrainers: [], rematchedTrainers: [], badges: [], wildCtx: st.wildCtx, introSeen: false, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), stats: emptyYellowStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", duelWins: {}, ownedCts: [], boughtCts: [], gekrocResolved: false, hhSpectresShown: [], hhCollectorWins: 0, isChampion: false, leagueSixShiny: false, mirrorWinHigherLevel: false, berrySecretKnown: false, berryHarvestDay: "", berryHarvestPicked: [], caveTradeDone: false, goshHintHeard: false, orcalineWins: 0, orcalineDate: "", pnj5Wins: 0, ngplusBattles: 0, moveReminderUses: 0, sylvebarbeAwake: false, labDefi: emptyLabDefi(), customDaemons: st.customDaemons, ngplusStartedAt: undefined, playtimeMs: 0, leaguePotions: 0, ngplusUsed: false, run3Used: false, ngplusMaitreBeaten: false, run3StarterBase: "", ngplusStarterBase: st.ngplusStarterBase, run3Defeated: [], run3EnergyByArena: {}, caughtThisRun: [], fusionRoster: [], fusionHistory: [], run3LavapetitSeen: false, run3LavapetitCaught: false, mimimoyReturned: false, mimimoyAppearances: 0, ballLockRemaining: 0 }
    emit()
}

/** NG+ : démarre un MONDE NG+ FRAIS dans les stores — comme resetForIntro, MAIS l'intro des 3 starters est
 *  sautée (introSeen=true) et le Daemon custom est déjà en équipe. isChampion=false (on relève le défi à
 *  nouveau), customDaemons GLOBAUX préservés, cadeaux de bienvenue neutralisés (l'énergie NG+ est créditée à
 *  part par saveManager). Le passage activeWorld="ngplus" + l'énergie sont gérés par saveManager.startNewGamePlus. */
export function startNgPlusWorld(starter: MonInstance) {
    st = { team: [starter], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: true, pokerFirstGameDone: st.pokerFirstGameDone, pokerBossStacks: {}, pokerCashCap: 0, pokerCashDate: "", spagGift: true, pastaGodGift: true, pastaBoughtToday: 0, casinoSpentToday: 0, pastaDayBonus: 0, defeatedTrainers: [], rematchedTrainers: [], badges: [], wildCtx: st.wildCtx, introSeen: true, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), stats: emptyYellowStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", duelWins: {}, ownedCts: [], boughtCts: [], gekrocResolved: false, hhSpectresShown: [], hhCollectorWins: 0, isChampion: false, leagueSixShiny: false, mirrorWinHigherLevel: false, berrySecretKnown: false, berryHarvestDay: "", berryHarvestPicked: [], caveTradeDone: false, goshHintHeard: false, orcalineWins: 0, orcalineDate: "", pnj5Wins: 0, ngplusBattles: 0, moveReminderUses: 0, sylvebarbeAwake: false, labDefi: emptyLabDefi(), customDaemons: st.customDaemons, ngplusStartedAt: Date.now(), playtimeMs: 0, leaguePotions: 0, ngplusUsed: true, run3Used: false, ngplusMaitreBeaten: false, run3StarterBase: "", ngplusStarterBase: starter.speciesId, domeChampionships: st.domeChampionships, run3Defeated: [], run3EnergyByArena: {}, caughtThisRun: [], fusionRoster: [], fusionHistory: [], run3LavapetitSeen: false, run3LavapetitCaught: false, mimimoyReturned: false, mimimoyAppearances: 0, ballLockRemaining: 0 }
    emit()
}

/** RUN 3 (concours) : démarre un MONDE RUN 3 FRAIS dans les stores — jumeau de startNgPlusWorld (intro sautée,
 *  starter en équipe, isChampion=false, customDaemons GLOBAUX préservés) mais pose run3Used=true. L'énergie de
 *  départ (500) + le passage activeWorld="run3" sont gérés par saveManager.startRun3. On réutilise ngplusStartedAt
 *  comme horodatage de départ du run (le run 3 n'a pas de champ dédié). */
export function startRun3World(starter: MonInstance) {
    st = { team: [starter], pc: [], items: {}, reps: 0, repsCap: 1000, creditedThrough: "", repsBankedTotal: -1, welcomeGift: true, pokerFirstGameDone: st.pokerFirstGameDone, pokerBossStacks: {}, pokerCashCap: 0, pokerCashDate: "", spagGift: true, pastaGodGift: true, pastaBoughtToday: 0, casinoSpentToday: 0, pastaDayBonus: 0, defeatedTrainers: [], rematchedTrainers: [], badges: [], wildCtx: st.wildCtx, introSeen: true, sbireDefeatsToday: 0, sbireWinsTotal: 0, pvpStats: emptyPvpStats(), stats: emptyYellowStats(), acePeakLevel: 0, aceBox: {}, aceTeamSizePeak: 3, aceWins: 0, aceDefeatedDate: "", duelWins: {}, ownedCts: [], boughtCts: [], gekrocResolved: false, hhSpectresShown: [], hhCollectorWins: 0, isChampion: false, leagueSixShiny: false, mirrorWinHigherLevel: false, berrySecretKnown: false, berryHarvestDay: "", berryHarvestPicked: [], caveTradeDone: false, goshHintHeard: false, orcalineWins: 0, orcalineDate: "", pnj5Wins: 0, ngplusBattles: 0, moveReminderUses: 0, sylvebarbeAwake: false, labDefi: emptyLabDefi(), customDaemons: st.customDaemons, ngplusStartedAt: Date.now(), playtimeMs: 0, leaguePotions: 0, ngplusUsed: true, run3Used: true, ngplusMaitreBeaten: false, domeChampionships: st.domeChampionships, run3StarterBase: starter.speciesId, ngplusStarterBase: st.ngplusStarterBase, run3Defeated: [], run3EnergyByArena: {}, caughtThisRun: [], fusionRoster: [], fusionHistory: [], run3LavapetitSeen: false, run3LavapetitCaught: false, mimimoyReturned: false, mimimoyAppearances: 0, ballLockRemaining: 0 }
    emit()
}

// Identité du joueur courant (= User.id) + carte courante : sert à estampiller
// l'ownership et le lieu de capture (RECO identité/Pokédex). Posés par l'UI au montage.
let currentPlayerId = ""
let currentMapId = ""
export function setCurrentPlayerId(id: string) { currentPlayerId = id || "" }
export function getCurrentPlayerId(): string { return currentPlayerId }
export function setCurrentMapId(id: string) { currentMapId = id || "" }

/** Renseigne les stats d'effort du jour (fetchées au chargement). */
export function setWildCtx(ctx: WildPlayerCtx | null) {
    st = { ...st, wildCtx: ctx }
    emit()
}

/** Marque un dresseur comme battu (idempotent). */
export function markTrainerDefeated(trainerId: string) {
    if (st.defeatedTrainers.includes(trainerId)) return
    st = { ...st, defeatedTrainers: [...st.defeatedTrainers, trainerId] }
    emit()
}

/** Marker JOURNALIER BORNÉ : retire tous les `<prefix>*` puis pose `marker` → defeatedTrainers garde AU PLUS UN
 *  marker de ce préfixe (évite l'accumulation d'un marker/jour, ex. cap journalier PNJ 7). Idempotent. */
export function setDailyMarker(prefix: string, marker: string) {
    const others = st.defeatedTrainers.filter((t) => !t.startsWith(prefix))
    if (others.length === st.defeatedTrainers.length - 1 && st.defeatedTrainers.includes(marker)) return // déjà exactement ce marker
    st = { ...st, defeatedTrainers: [...others, marker] }
    emit()
}

export function isTrainerDefeated(trainerId: string): boolean {
    return st.defeatedTrainers.includes(trainerId)
}

/** Retire un marker de defeatedTrainers (ex. fusioball_owed une fois la Fusio-Ball achetée). Idempotent. */
export function clearTrainerMarker(marker: string) {
    if (!st.defeatedTrainers.includes(marker)) return
    st = { ...st, defeatedTrainers: st.defeatedTrainers.filter((t) => t !== marker) }
    emit()
}

/** LIGUE : réinitialise le gauntlet (oublie toutes les victoires « y_ligue_* ») → toutes les portes se
 *  rescellent, on doit tout réaffronter depuis la 1re salle. Appelé quand le joueur est K.O. dans la Ligue. */
export function resetLigueProgress() {
    const cleaned = st.defeatedTrainers.filter((id) => !id.startsWith("y_ligue_"))
    if (cleaned.length === st.defeatedTrainers.length) return
    st = { ...st, defeatedTrainers: cleaned }
    emit()
}

/** LIGUE DE FUSION : rescelle le gauntlet (oublie les victoires `y_fusion_*`) à chaque nouvelle entrée de palier.
 *  ⚠️ Ne touche PAS les marqueurs de palier `fusleague_*` (préfixe différent) → l'échelle Bronze/Argent/Or persiste. */
export function resetFusionLeagueProgress() {
    const cleaned = st.defeatedTrainers.filter((id) => !id.startsWith("y_fusion_"))
    if (cleaned.length === st.defeatedTrainers.length) return
    st = { ...st, defeatedTrainers: cleaned }
    emit()
}

/** Marque un dresseur comme RE-battu (rematch / match retour fait, idempotent). */
export function markTrainerRematched(trainerId: string) {
    if (st.rematchedTrainers.includes(trainerId)) return
    st = { ...st, rematchedTrainers: [...st.rematchedTrainers, trainerId] }
    emit()
}

export function isTrainerRematched(trainerId: string): boolean {
    return st.rematchedTrainers.includes(trainerId)
}

/** Possède ce badge d'arène ? */
export function hasBadge(id: BadgeId): boolean {
    return st.badges.includes(id)
}

/** Accorde un badge (idempotent) : augmente aussi le plafond de stockage des reps. */
export function awardBadge(id: BadgeId): boolean {
    if (st.badges.includes(id)) return false
    // RUN 3 : le plafond d'énergie est FIXE (échelle de recharge d'arène : 500→1000, jamais au-dessus) → les
    //   badges ne le gonflent PAS (sinon la jauge se remplirait au-delà des paliers attendus). Run 1/2 : +250.
    const capBonus = runMode() === "run3" ? 0 : BADGE_REPS_CAP_BONUS
    st = { ...st, badges: [...st.badges, id], repsCap: st.repsCap + capBonus }
    emit()
    return true
}

/** Remet une CT CADEAU (trophée de boss) → enseignable GRATUITEMENT. true si nouvelle. */
export function grantCt(ctId: string): boolean {
    if (st.ownedCts.includes(ctId)) return false
    st = { ...st, ownedCts: [...st.ownedCts, ctId] }
    emit()
    return true
}

/** Remplace l'équipe (utilisé pour resynchroniser après un combat : XP/PV/niveaux). */
export function setTeam(team: MonInstance[]) {
    st = { ...st, team }
    emit()
}

/** Remplace équipe ET boîte en une écriture (ex. Ligue Fusion : l'XP des parents peut toucher des Daemons de la boîte). */
export function setTeamAndPc(team: MonInstance[], pc: MonInstance[]) {
    st = { ...st, team, pc }
    emit()
}

/** Ajoute un Daemon capturé (équipe si place, sinon PC). */
export function addCaught(mon: MonInstance, ctx?: { quotaReached?: boolean }): "team" | "pc" {
    const today = new Date().toISOString().slice(0, 10)
    // EV : plafond modulé débloqué DÈS qu'une Ligue a été battue (live post-Ligue OU run 2/3 en cours).
    //   isChampion est remis à false au début de chaque run → on OR avec ngplusUsed/run3Used (permanents).
    //   Estampillé À LA CAPTURE → strictement NON rétroactif (les Daemons déjà en boîte restent à 510).
    const leagueEverBeaten = st.isChampion || st.ngplusUsed || st.run3Used
    const owned: MonInstance = {
        ...mon, owned: true,
        capturedLevel: mon.capturedLevel ?? mon.level,
        capturedAt: mon.capturedAt ?? today,
        // Identité : posée UNE fois (le captureur). currentOwner = origin à la capture.
        originalTrainerId: mon.originalTrainerId ?? (currentPlayerId || undefined),
        currentOwnerId: mon.currentOwnerId ?? (currentPlayerId || undefined),
        traded: mon.traded ?? false,
        // Métadonnées de capture (Pokédex enrichi).
        capturedMapId: mon.capturedMapId ?? (currentMapId || undefined),
        capturedQuotaReached: mon.capturedQuotaReached ?? ctx?.quotaReached,
        evCapBoost: mon.evCapBoost ?? (leagueEverBeaten || undefined),
    }
    if (st.team.length < TEAM_MAX) {
        st = { ...st, team: [...st.team, owned] }
        emit()
        return "team"
    }
    st = { ...st, pc: [...st.pc, owned] }
    emit()
    return "pc"
}

/**
 * ÉCHANGE (RECO 4) : retire le Daemon donné (par uid, équipe OU PC), ajoute le reçu
 * avec nouvel ownership. originalTrainerId préservé (survit aux allers-retours) ;
 * surnom d'origine figé. Renvoie false si le Daemon donné est introuvable (déjà parti).
 */
export function executeTrade(giveUid: string, receive: MonInstance): boolean {
    const has = st.team.some((m) => m.uid === giveUid) || st.pc.some((m) => m.uid === giveUid)
    if (!has || !receive?.speciesId) return false
    const team = st.team.filter((m) => m.uid !== giveUid)
    const pc = st.pc.filter((m) => m.uid !== giveUid)
    const got: MonInstance = {
        ...receive,
        owned: true,
        currentOwnerId: currentPlayerId || receive.currentOwnerId,
        originalTrainerId: receive.originalTrainerId ?? receive.currentOwnerId,
        traded: true,
        originalNickname: receive.originalNickname ?? receive.nickname,
    }
    if (team.length < TEAM_MAX) team.push(got)
    else pc.push(got)
    st = { ...st, team, pc }
    emit()
    return true
}

/** Échange de CT : retire la CT donnée de ownedCts et ajoute la reçue (si pas déjà possédée).
 *  Renvoie false si je ne possède pas la CT offerte (garde-fou anti-triche). */
export function tradeCt(giveCtId: string, receiveCtId: string): boolean {
    const i = st.ownedCts.indexOf(giveCtId)
    if (i < 0) return false
    const owned = [...st.ownedCts]
    owned.splice(i, 1)
    if (receiveCtId && !owned.includes(receiveCtId)) owned.push(receiveCtId)
    st = { ...st, ownedCts: owned }
    emit()
    return true
}

/**
 * ÉVOLUTION PAR ÉCHANGE : si le Daemon reçu (uid) appartient à une espèce qui évolue
 * par TRADE, l'évolue sur-le-champ (immuable). Renvoie le résultat (pour le toast/anim).
 */
export function applyTradeEvolution(uid: string): EvolutionResult | null {
    const inTeam = st.team.findIndex((m) => m.uid === uid)
    const where: "team" | "pc" = inTeam >= 0 ? "team" : "pc"
    const idx = inTeam >= 0 ? inTeam : st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return null
    const src = (where === "team" ? st.team : st.pc)[idx]
    const toId = tradeEvolutionTarget(src)
    if (!toId) return null
    const clone: MonInstance = { ...src, moves: src.moves.map((m) => ({ ...m })), pendingMoves: src.pendingMoves ? [...src.pendingMoves] : undefined }
    const res = applyEvolution(clone, toId)
    if (!res) return null
    const list = [...(where === "team" ? st.team : st.pc)]
    list[idx] = clone
    st = where === "team" ? { ...st, team: list } : { ...st, pc: list }
    emit()
    return res
}

/**
 * PIERRE GÉKROC (Part B) : fait évoluer un PANTHÉON (uid) vers la panthère du TYPE choisi.
 * Consomme la Pierre. Renvoie le résultat (toast/anim) ou null si invalide (pas de pierre, pas
 * un Panthéon, cible inconnue). La nouvelle panthère entre au Pokédex.
 */
export function evolvePantheonWithStone(uid: string, targetSpeciesId: string): EvolutionResult | null {
    if ((st.items[GEKROC_STONE_ITEM] ?? 0) <= 0) return null
    if (!PANTHEON_STONE_EVOS.some((e) => e.speciesId === targetSpeciesId)) return null
    const inTeam = st.team.findIndex((m) => m.uid === uid)
    const where: "team" | "pc" = inTeam >= 0 ? "team" : "pc"
    const idx = inTeam >= 0 ? inTeam : st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return null
    const src = (where === "team" ? st.team : st.pc)[idx]
    if (src.speciesId !== PANTHEON_BASE_ID) return null
    const clone: MonInstance = { ...src, moves: src.moves.map((m) => ({ ...m })), pendingMoves: src.pendingMoves ? [...src.pendingMoves] : undefined }
    const fromSp = getSpecies(src.speciesId)
    const hpBefore = fromSp ? fullStats(src, fromSp).hp : src.currentHp
    const res = applyEvolution(clone, targetSpeciesId)
    if (!res) return null
    // Crédite le delta de PV MAX (la panthère a + de PV que Panthéon) → pas de déficit injustifié.
    const toSp = getSpecies(targetSpeciesId)
    if (toSp) { const hpAfter = fullStats(clone, toSp).hp; clone.currentHp = Math.min(hpAfter, clone.currentHp + Math.max(0, hpAfter - hpBefore)) }
    const list = [...(where === "team" ? st.team : st.pc)]
    list[idx] = clone
    const items = { ...st.items, [GEKROC_STONE_ITEM]: (st.items[GEKROC_STONE_ITEM] ?? 0) - 1 }
    st = where === "team" ? { ...st, team: list, items } : { ...st, pc: list, items }
    markCaught(targetSpeciesId); markCaughtThisRun(targetSpeciesId) // la panthère entre au Pokédex (+ « ce run »)
    emit()
    return res
}

/**
 * NOYAU DE MÉTAL (Prof CHEN, run 3) : fait évoluer un MAGMATOR (uid) en MAGNETOR (Feu/Métal, forteresse).
 * Consomme l'objet MAGNETOR_EVO_ITEM. Renvoie le résultat (toast/anim) ou null si invalide (pas d'objet,
 * pas un Magmator, uid introuvable). Magnetor entre au Pokédex. Même patron que la Pierre Gékroc.
 */
export function evolveMagmatorWithChen(uid: string): EvolutionResult | null {
    if ((st.items[MAGNETOR_EVO_ITEM] ?? 0) <= 0) return null
    const inTeam = st.team.findIndex((m) => m.uid === uid)
    const where: "team" | "pc" = inTeam >= 0 ? "team" : "pc"
    const idx = inTeam >= 0 ? inTeam : st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return null
    const src = (where === "team" ? st.team : st.pc)[idx]
    if (src.speciesId !== "magmator") return null
    if (src.level < 50) return null // Sartay : l'évo Magmator→Magnetor n'est possible qu'à partir du NIVEAU 50
    const clone: MonInstance = { ...src, moves: src.moves.map((m) => ({ ...m })), pendingMoves: src.pendingMoves ? [...src.pendingMoves] : undefined }
    const fromSp = getSpecies(src.speciesId)
    const hpBefore = fromSp ? fullStats(src, fromSp).hp : src.currentHp
    const res = applyEvolution(clone, "magnetor")
    if (!res) return null
    // Crédite le delta de PV MAX (Magnetor a + de PV que Magmator) → pas de déficit injustifié.
    const toSp = getSpecies("magnetor")
    if (toSp) { const hpAfter = fullStats(clone, toSp).hp; clone.currentHp = Math.min(hpAfter, clone.currentHp + Math.max(0, hpAfter - hpBefore)) }
    const list = [...(where === "team" ? st.team : st.pc)]
    list[idx] = clone
    const items = { ...st.items, [MAGNETOR_EVO_ITEM]: (st.items[MAGNETOR_EVO_ITEM] ?? 0) - 1 } // Noyau consommé
    st = where === "team" ? { ...st, team: list, items } : { ...st, pc: list, items }
    markCaught("magnetor"); markCaughtThisRun("magnetor") // Magnetor entre au Pokédex (+ « ce run »)
    emit()
    return res
}

export function addItem(itemId: string, qty = 1) {
    st = { ...st, items: { ...st.items, [itemId]: (st.items[itemId] ?? 0) + qty } }
    emit()
}

/** Consomme 1 objet (ex. une Ball). Renvoie false si le joueur n'en a pas. */
export function consumeItem(itemId: string): boolean {
    if ((st.items[itemId] ?? 0) <= 0) return false
    st = { ...st, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    emit()
    return true
}

/** Solde de reps disponible (pool stocké, déjà plafonné). */
export function walletBalance(): number {
    return st.reps
}

/** VŒU DU GÉNIE — verrou Ball actif tant qu'il reste des ⚡ à dépenser. */
export function isBallLocked(): boolean { return st.ballLockRemaining > 0 }
/** Décompte les ⚡ dépensées vers le vœu « Balls verrouillées » (se lève à 0). À appeler à CHAQUE sortie de reps. */
export function trackBallLockSpend(n: number) {
    if (st.ballLockRemaining > 0 && n > 0) st = { ...st, ballLockRemaining: Math.max(0, st.ballLockRemaining - Math.floor(n)) }
}

// ════════════ VŒU DU GÉNIE — CAP CASINO (10 ⚡/mise + 200 ⚡/jour) ════════════
// Actif si le marqueur `casino_restricted` est posé (effet génie « casino_cap »). `casinoSpentToday` se reset
// chaque jour (creditDailyReps). Enforcement CLIENT (le casino jaune est client-authoritative) : chaque jeu vérifie
// casinoBetAllowed(mise) avant de miser, et recordCasinoSpend(mise) une fois la mise engagée.
export const CASINO_RESTRICTED_MARKER = "casino_restricted"
export const CASINO_VOW_MAX_BET = 10
export const CASINO_VOW_MAX_PER_DAY = 200
// VŒU « ABONDANCE MAUDITE » (Jacanon) : marqueur d'activité (defeatedTrainers) + durée 1 semaine + plafond de
//   Daemons rendus désobéissants à la fin. Le compteur d'objets gratuits pris = le nb de Daemons touchés (max 7).
export const ABUNDANCE_CURSE_MARKER = "abundance_curse_active"
export const ABUNDANCE_CURSE_MS = 7 * 24 * 3600 * 1000
export const ABUNDANCE_MAX_DISOBEY = 7
const todayStr = () => new Date().toISOString().slice(0, 10)
export function isCasinoRestricted(): boolean { return st.defeatedTrainers.includes(CASINO_RESTRICTED_MARKER) }
/** Mise autorisée ? (cap génie). Ne débite RIEN. `ok:true` si non restreint. */
export function casinoBetAllowed(bet: number): { ok: boolean; reason?: string } {
    if (!isCasinoRestricted()) return { ok: true }
    const b = Math.max(0, Math.floor(bet))
    if (b > CASINO_VOW_MAX_BET) return { ok: false, reason: `Vœu du génie : ta mise est plafonnée à ${CASINO_VOW_MAX_BET} ⚡.` }
    if (st.casinoSpentToday + b > CASINO_VOW_MAX_PER_DAY) return { ok: false, reason: `Vœu du génie : plafond de ${CASINO_VOW_MAX_PER_DAY} ⚡/jour au casino atteint. Reviens demain.` }
    return { ok: true }
}
/** Reste misable au casino aujourd'hui (pour borner les curseurs de mise). Infini si non restreint. */
export function casinoRemainingToday(): number {
    return isCasinoRestricted() ? Math.max(0, CASINO_VOW_MAX_PER_DAY - st.casinoSpentToday) : Infinity
}
/** Enregistre une mise casino DÉPENSÉE (compteur 200/jour). No-op si non restreint. */
export function recordCasinoSpend(bet: number): void {
    if (!isCasinoRestricted()) return
    st = { ...st, casinoSpentToday: st.casinoSpentToday + Math.max(0, Math.floor(bet)) }
    emit()
}
/** Dépense une MISE au casino : refuse si le cap génie est dépassé, sinon débite (spendReps) + enregistre.
 *  Pour les jeux CLIENT (blackjack / poker buy-in / roulette solo). Renvoie {ok:false, reason} si refusé. */
export function spendCasinoBet(bet: number): { ok: boolean; reason?: string } {
    const b = Math.max(0, Math.floor(bet))
    const allowed = casinoBetAllowed(b)
    if (!allowed.ok) return allowed
    if (!spendReps(b)) return { ok: false, reason: "Pas assez d'énergie." }
    recordCasinoSpend(b)
    return { ok: true }
}

/** VŒU DU GÉNIE — effet MACHINE d'un vœu (posé EN BASE par le créateur avec conditionN, appliqué AUTOMATIQUEMENT
 *  à l'acceptation → plus d'aller-retour ni de redéploiement pour un type déjà géré). */
export interface GenieEffect { kind: string; amount?: number; id?: string; qty?: number; level?: number; hard?: boolean }
/** Applique UN effet atomique. Renvoie true si le type est RECONNU (→ marquable). Type inconnu → false : le vœu n'est
 *  PAS marqué appliqué, donc un déploiement futur qui ajoute le `case` l'appliquera au prochain login (zéro perte). */
function runGenieEffect(e: GenieEffect): boolean {
    const amt = Math.floor(e.amount ?? 0)
    switch (e.kind) {
        case "energy": grantBonusEnergyUncapped(Math.max(0, amt)); return true                              // don d'⚡ hors plafond
        case "ball_lock": st = { ...st, ballLockRemaining: Math.max(0, amt) }; return true                  // arme le verrou Ball
        case "item": if (e.id) addItem(e.id, Math.max(1, Math.floor(e.qty ?? 1))); return true             // cadeau d'objet
        case "cap": st = { ...st, repsCap: Math.max(0, st.repsCap + amt) }; return true                     // ajuste le plafond (+/-)
        case "energy_drain": st = { ...st, reps: Math.max(0, st.reps - Math.max(0, amt)) }; return true     // malus d'⚡
        case "force_encounter": if (e.id) {
            // Si un vœu écrase une rencontre GALIJAH en attente, on RE-ARME Galijah (sinon sa chasse serait perdue).
            const clobbersGalijah = st.forcedEncounter?.includes('"galijah"') && !st.defeatedTrainers.includes(GALIJAH_ARMED_MARKER)
            st = { ...st, forcedEncounter: JSON.stringify({ speciesId: e.id, level: Math.max(1, Math.min(100, Math.floor(e.level ?? 50))), hard: !!e.hard }), defeatedTrainers: clobbersGalijah ? [...st.defeatedTrainers, GALIJAH_ARMED_MARKER] : st.defeatedTrainers }
        }; return true // rencontre imposée
        case "nemesis_challenge": if (!st.defeatedTrainers.includes(NEMESIS_ARMED_MARKER)) st = { ...st, defeatedTrainers: [...st.defeatedTrainers, NEMESIS_ARMED_MARKER] }; return true // arme le défi némésis (PNJ apparaît)
        case "league_level_boost": if (!st.defeatedTrainers.includes(LEAGUE_PLUS3_MARKER)) st = { ...st, defeatedTrainers: [...st.defeatedTrainers, LEAGUE_PLUS3_MARKER] }; return true // Ligue de Fusion +3 niveaux (le montant est appliqué côté Ligue)
        case "casino_cap": if (!st.defeatedTrainers.includes(CASINO_RESTRICTED_MARKER)) st = { ...st, defeatedTrainers: [...st.defeatedTrainers, CASINO_RESTRICTED_MARKER] }; return true // cap casino 10/mise + 200/jour (enforcé par les jeux)
        case "abundance_curse": if (!st.defeatedTrainers.includes(ABUNDANCE_CURSE_MARKER)) st = { ...st, defeatedTrainers: [...st.defeatedTrainers, ABUNDANCE_CURSE_MARKER], curseAbundanceStart: Date.now(), curseFreeItemsTaken: 0, curseFreeItemDate: "" }; return true // 1 sem : objet gratuit 1/j + achat coupé + attaques ×10 ; fin → N Daemons désobéissants
        default: return false                                                                              // type non géré → non appliqué
    }
}
/** VŒU DU GÉNIE — consomme la rencontre forcée (appelé par le moteur quand elle se produit : one-shot). */
export function clearForcedEncounter() { if (st.forcedEncounter) { st = { ...st, forcedEncounter: undefined }; emit() } }

/** LIGUE DE FUSION — persiste l'usure du gauntlet (JSON) pour reprendre au reload ; null = efface. */
export function setFusionLeagueCarry(json: string | null) { st = { ...st, fusionLeagueCarry: json ?? undefined }; emit() }
export function clearFusionLeagueCarry() { if (st.fusionLeagueCarry) { st = { ...st, fusionLeagueCarry: undefined }; emit() } }
/** Applique les effets des vœux ACCEPTÉS pas encore appliqués (1 marker save par vœu → IDEMPOTENT). Appliqué en
 *  LIVE **et en NG+** (run 2) ; SEUL le run 3 est différé (l'énergie y a une source unique → les dons d'⚡ no-op,
 *  auto-retry au retour). Renvoie true si l'état a changé (→ l'appelant persiste). */
export function applyAcceptedGenieWishEffects(row: {
    accepted1?: boolean | null; accepted2?: boolean | null; accepted3?: boolean | null
    effect1?: string | null; effect2?: string | null; effect3?: string | null
} | null | undefined): boolean {
    if (!row || getActiveWorld() === "run3") return false
    const wishes = [
        { acc: row.accepted1, fx: row.effect1, mark: "genie_fx1" },
        { acc: row.accepted2, fx: row.effect2, mark: "genie_fx2" },
        { acc: row.accepted3, fx: row.effect3, mark: "genie_fx3" },
    ]
    let changed = false
    for (const w of wishes) {
        if (w.acc !== true || !w.fx || st.defeatedTrainers.includes(w.mark)) continue
        let effects: GenieEffect[]
        try { const parsed = JSON.parse(w.fx); effects = Array.isArray(parsed) ? parsed : [parsed] } catch { continue } // JSON invalide → on saute (pas de crash)
        let handled = false
        for (const e of effects) { if (runGenieEffect(e)) handled = true }
        if (!handled) continue // aucun effet RECONNU (build antérieur à ce type) → NE PAS marquer → re-tenté après déploiement
        st = { ...st, defeatedTrainers: [...st.defeatedTrainers, w.mark] } // marker one-shot par vœu
        changed = true
    }
    if (changed) emit()
    return changed
}

// ═══════ VŒU « ABONDANCE MAUDITE » (Jacanon) — helpers (gaté par ABUNDANCE_CURSE_MARKER, save-safe) ═══════
/** La malédiction est-elle ACTIVE ? (marqueur posé ET moins d'1 semaine écoulée depuis le départ). */
export function isAbundanceCurseActive(): boolean {
    if (!st.defeatedTrainers.includes(ABUNDANCE_CURSE_MARKER)) return false
    const start = st.curseAbundanceStart ?? 0
    return start > 0 && Date.now() < start + ABUNDANCE_CURSE_MS
}
/** Un objet gratuit est-il DISPONIBLE aujourd'hui ? (malédiction active + pas déjà pris ce jour). */
export function abundanceFreeItemAvailableToday(): boolean {
    return isAbundanceCurseActive() && (st.curseFreeItemDate ?? "") !== todayStr()
}
/** Prend l'objet gratuit du jour (1/jour ; l'UI restreint aux non-CT). Renvoie true si donné. */
export function takeFreeShopItem(itemId: string): boolean {
    if (!itemId || !abundanceFreeItemAvailableToday()) return false
    addItem(itemId, 1)
    st = { ...st, curseFreeItemDate: todayStr(), curseFreeItemsTaken: Math.min(ABUNDANCE_MAX_DISOBEY, (st.curseFreeItemsTaken ?? 0) + 1) }
    emit()
    return true
}
/** À l'EXPIRATION (>1 semaine) : marque N Daemons AU HASARD du PC `disobedient` (N = objets gratuits pris, max 7),
 *  puis désarme la malédiction. NON-destructif (flag réversible par le créateur). Appelé au login. Renvoie N touchés. */
export function resolveAbundanceCurse(): number {
    if (!st.defeatedTrainers.includes(ABUNDANCE_CURSE_MARKER)) return 0
    const start = st.curseAbundanceStart ?? 0
    if (start <= 0) return 0 // défensif : marqueur présent mais date de début manquante (persistance/corruption) → NE PAS désarmer
    if (Date.now() < start + ABUNDANCE_CURSE_MS) return 0 // pas encore expiré
    const n = Math.min(ABUNDANCE_MAX_DISOBEY, st.curseFreeItemsTaken ?? 0)
    const idx = st.pc.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] } // Fisher-Yates
    const chosen = new Set(idx.slice(0, n))
    const pc = st.pc.map((m, i) => (chosen.has(i) ? { ...m, disobedient: true } : m))
    st = { ...st, pc, defeatedTrainers: st.defeatedTrainers.filter((t) => t !== ABUNDANCE_CURSE_MARKER), curseAbundanceStart: undefined }
    emit()
    return chosen.size
}

/** Dépense des reps (boutique OU attaque). Renvoie false si solde insuffisant. */
export function spendReps(n: number): boolean {
    if (st.reps < n) tryModeRecharge()   // PARRAINAGE easy/debutant à sec : recharge avant de refuser l'action
    if (st.reps < n) return false
    st = { ...st, reps: st.reps - Math.floor(n) }
    trackBallLockSpend(n) // VŒU DU GÉNIE : toute dépense réduit le verrou Ball
    bumpStat("energySpent", Math.floor(n)) // STAT : énergie dépensée (attaques + boutique + casino)
    emit()
    if (st.reps <= 0) tryModeRecharge()   // épuisé pile → recharge immédiate pour la prochaine action
    return true
}

/** Crédite des reps (récompense), plafonné au cap. Renvoie le montant réellement ajouté.
 *  RUN 3 (concours) : l'énergie a une SOURCE UNIQUE (500 de départ + paliers d'arène) → tout crédit est BLOQUÉ
 *  sauf `force` (utilisé par startRun3, les paliers d'arène, et le remboursement d'une attaque qui n'est jamais
 *  partie = on rend au joueur SA propre énergie). Casino/ACE/sbire/dresseurs/gauntlet → bloqués en run 3. */
export function grantReps(n: number, force = false): number {
    if (runMode() === "run3" && !force) return 0
    const before = st.reps
    st = { ...st, reps: Math.min(st.repsCap, st.reps + Math.max(0, Math.floor(n))) }
    emit()
    return st.reps - before
}

/** Crédite INTÉGRALEMENT (cash-out poker) : relève le cap AU MINIMUM nécessaire pour ne JAMAIS tronquer
 *  (sinon un gros gain repartirait avec moins que sa mise, ou serait rogné au bankReps quotidien). Le cap
 *  ne bouge que si le crédit le dépasse. Renvoie le montant crédité (= n). */
export function creditReps(n: number): number {
    if (runMode() === "run3") return 0 // RUN 3 : aucune énergie reçue (source unique) → bloque le cash-out + le tuto poker (100⚡)
    const amt = Math.max(0, Math.floor(n))
    if (amt <= 0) return 0
    const newReps = st.reps + amt
    st = { ...st, reps: newReps, repsCap: Math.max(st.repsCap, newReps) }
    emit()
    return amt
}

/**
 * Tick quotidien (1×/jour) : reset des achats Super Pasta (+3 au prix plancher) et
 * du compteur de combats du sbire. Le CRÉDIT des reps est désormais géré par bankReps.
 */
// ═══════ LÉGENDAIRES SECRETS — markers (vivent dans defeatedTrainers → persistés, pas de nouveau champ de save) ═══════
export const GALIJAH_ARMED_MARKER = "galijah_armed"          // chasse Galijah en cours (150ᵉ atteint, spawn imminent)
export const GALIJAH_OFFERED_MARKER = "galijah_offered"      // cadeau du 200ᵉ dex déjà donné (one-shot)
export const MEGAMONARX_GRANTED_MARKER = "megamonarx_granted" // MégamonarX déjà octroyé (one-shot)
export const GALIJAH_CAPTURE_THRESHOLD = 150 // 1re apparition : 150ᵉ capture du jour
export const GALIJAH_RETRY_STEP = 50 // ratée ? nouvelle apparition toutes les +50 captures (200, 250, …)
const GALIJAH_DEX_GIFT_THRESHOLD = 200 // Daemons différents au Pokédex → cadeau de secours

/** GALIJAH — captures RESTANTES avant sa prochaine apparition (décompte énigmatique du Pokédex). 150→0 d'abord,
 *  puis 50→0 à chaque tentative ratée. 0 = imminent. (Pur, lisible aussi côté UI.) */
export function galijahCountdown(capturesToday: number): number {
    const c = Math.max(0, capturesToday)
    if (c <= GALIJAH_CAPTURE_THRESHOLD) return GALIJAH_CAPTURE_THRESHOLD - c
    return (GALIJAH_RETRY_STEP - ((c - GALIJAH_CAPTURE_THRESHOLD) % GALIJAH_RETRY_STEP)) % GALIJAH_RETRY_STEP
}

/** GALIJAH — +1 capture sauvage RÉUSSIE du jour. À la 150ᵉ (puis toutes les +50 si ratée, tant que Galijah n'est pas
 *  capturé), ARME la chasse : le spawn forcé (3-4 pas plus tard, niveau moyen d'équipe) est géré côté gameStore. À
 *  n'appeler QUE pour une vraie capture à la Ball d'un sauvage (jamais pour les cadeaux/piliers). */
export function bumpCapturesToday() {
    const n = (st.capturesToday ?? 0) + 1
    st = { ...st, capturesToday: n }
    // Palier atteint (150, 200, 250, …), Galijah pas encore capturé, pas déjà armé → arme la rencontre légendaire.
    if (n >= GALIJAH_CAPTURE_THRESHOLD && (n - GALIJAH_CAPTURE_THRESHOLD) % GALIJAH_RETRY_STEP === 0
        && !getPokedex().caught.includes("galijah") && !st.defeatedTrainers.includes(GALIJAH_ARMED_MARKER)) {
        st = { ...st, defeatedTrainers: [...st.defeatedTrainers, GALIJAH_ARMED_MARKER] }
    }
    emit()
}
/** GALIJAH — la chasse est-elle armée (150ᵉ atteint, pas encore apparu) ? Lu par gameStore pour poser le spawn forcé. */
export function isGalijahArmed(): boolean { return st.defeatedTrainers.includes(GALIJAH_ARMED_MARKER) }
/** GALIJAH — désarme la chasse (une fois le spawn forcé posé, ou après capture/fuite). */
export function disarmGalijah() {
    if (!st.defeatedTrainers.includes(GALIJAH_ARMED_MARKER)) return
    st = { ...st, defeatedTrainers: st.defeatedTrainers.filter((m) => m !== GALIJAH_ARMED_MARKER) }; emit()
}
/** GALIJAH — pose la rencontre FORCÉE (one-shot, capture légendaire `hard`) au niveau donné + DÉSARME la chasse.
 *  Consommée par le moteur au prochain sauvage (gameStore) → Galijah apparaît dans les hautes herbes. */
export function poseGalijahEncounter(level: number) {
    if (st.forcedEncounter) return // NE PAS écraser une rencontre forcée déjà posée (ex. vœu génie one-shot) → Galijah reste ARMÉ, réessaiera au pas suivant une fois le slot libéré
    const lvl = Math.max(5, Math.min(100, Math.floor(level)))
    st = {
        ...st,
        forcedEncounter: JSON.stringify({ speciesId: "galijah", level: lvl, hard: true }),
        defeatedTrainers: st.defeatedTrainers.filter((m) => m !== GALIJAH_ARMED_MARKER),
    }
    emit()
}
/** GALIJAH — niveau de spawn/cadeau = moyenne des niveaux de l'équipe (clampé 5-100), façon rencontres badge-roche. */
function teamAverageLevel(): number {
    const t = st.team
    return t.length ? Math.max(5, Math.min(100, Math.round(t.reduce((s, m) => s + m.level, 0) / t.length))) : 40
}
/** GALIJAH — cadeau de SECOURS : au 200ᵉ Daemon DIFFÉRENT du Pokédex, s'il n'a jamais été capturé, on l'offre
 *  (au niveau moyen de l'équipe), one-shot. Renvoie le placement (team/pc) ou null si non éligible. */
export function grantGalijahIfDexMilestone(): "team" | "pc" | null {
    if (st.defeatedTrainers.includes(GALIJAH_OFFERED_MARKER)) return null
    const caught = getPokedex().caught
    if (caught.includes("galijah") || caught.length < GALIJAH_DEX_GIFT_THRESHOLD) return null
    let mon: MonInstance
    try { mon = createMonInstance("galijah", teamAverageLevel(), { owned: true }) } catch { return null }
    st = { ...st, defeatedTrainers: [...st.defeatedTrainers, GALIJAH_OFFERED_MARKER].filter((m) => m !== GALIJAH_ARMED_MARKER) } // flag AVANT + désarme
    const where = addCaught(mon)
    markCaught("galijah"); markCaughtThisRun("galijah")
    return where
}
/** MÉGAMONARX — octroi ONE-SHOT (victoire Ligue de Fusion avec Dracolithe niv 100). MégamonarX n'étant pas une
 *  fusion persistante, on le CRÉE (niv 100) et on le donne (modèle Ukognofy/pilier), puis on le marque au dex. */
export function grantMegamonarx(): "team" | "pc" | null {
    if (st.defeatedTrainers.includes(MEGAMONARX_GRANTED_MARKER)) return null
    if (getPokedex().caught.includes("megamonarx")) return null // one-shot GLOBAL (le Pokédex est cumulatif inter-runs)
    let mon: MonInstance
    try { mon = createMonInstance("megamonarx", 100, { owned: true }) } catch { return null }
    st = { ...st, defeatedTrainers: [...st.defeatedTrainers, MEGAMONARX_GRANTED_MARKER] } // flag AVANT (anti double-don)
    const where = addCaught(mon)
    markCaught("megamonarx"); markCaughtThisRun("megamonarx")
    return where
}
/** MÉGAMONARX — déjà obtenu ? (garde one-shot lue par le hook de la Ligue de Fusion). */
export function hasMegamonarx(): boolean { return st.defeatedTrainers.includes(MEGAMONARX_GRANTED_MARKER) }

export function creditDailyReps(today: string) {
    if (st.creditedThrough === today) return // déjà tické aujourd'hui
    const firstEver = st.creditedThrough === ""
    st = {
        ...st,
        creditedThrough: today,
        pastaBoughtToday: 0,
        casinoSpentToday: 0, // VŒU DU GÉNIE (cap casino) : le plafond de mise 200/jour se recharge chaque jour
        pastaDayBonus: firstEver ? st.pastaDayBonus : st.pastaDayBonus + SUPER_PASTA_DAILY_INCREASE,
        sbireDefeatsToday: 0, // nouveau jour → le sbire est de nouveau affrontable (2×)
        consultsToday: 0, // nouveau jour → 5 consultations gratuites du Daemomaniaque de nouveau
        capturesToday: 0, // GALIJAH : nouveau jour → le compteur de captures repart de 0 (re-armable à la 150ᵉ)
    }
    // GALIJAH : un nouveau jour désarme une chasse non aboutie de la veille (repart proprement à la prochaine 150ᵉ).
    st = { ...st, defeatedTrainers: st.defeatedTrainers.filter((m) => m !== GALIJAH_ARMED_MARKER) }
    emit()
}

/**
 * Banque les reps réelles en ÉNERGIE, INSTANTANÉMENT (high-water mark) : crédite le
 * DELTA entre le total cumulé des reps (incluant aujourd'hui, en direct) et ce qui a
 * déjà été banqué → aujourd'hui compte tout de suite, les jours non joués ne sont
 * jamais perdus, zéro double-crédit (idempotent). 1re fois : pic initialisé au "total
 * d'hier" (le passé est déjà banqué par l'ancien système → pas de crédit rétroactif).
 */
export function bankReps(totalToDate: number, throughYesterday: number, today?: string) {
    // RUN 3 : les vraies pompes ne donnent PAS d'énergie (elles comptent pour les points Saiyan uniquement).
    // Le high-water mark réel reste porté par les mondes run 1 / run 2 → conservé à la fusion. (rejeu run 3 idem)
    if (runMode() === "run3") return
    // PARRAINAGE easy/debutant : énergie DÉCOUPLÉE des vrais reps (pool à remplissages) → pas de crédit reps.
    if (gameMode !== "normal") return
    const tot = Math.max(0, Math.floor(totalToDate))
    let banked = st.repsBankedTotal
    if (banked < 0) banked = Math.max(0, Math.floor(throughYesterday)) // init migration / 1re fois
    let delta = Math.max(0, tot - banked)
    // DÉFI 3 (labo) : « énergies de demain ×N » le jour cible (respecte le plafond repsCap).
    // Multiplie le DELTA banqué ce jour-là ; le flag reste inerte les autres jours (date ≠ today).
    const d = st.labDefi
    if (today && d.tomorrowEnergyMult > 1 && d.tomorrowEnergyDate && today === d.tomorrowEnergyDate) {
        delta = delta * d.tomorrowEnergyMult
    }
    st = { ...st, reps: Math.min(st.repsCap, st.reps + delta), repsBankedTotal: Math.max(banked, tot) }
    emit()
}

/** Cadeau de bienvenue : +100 énergie, UNE seule fois par joueur (à l'arrivée dans le Ch.2). */
export function claimWelcomeGift() {
    if (st.welcomeGift) return
    st = { ...st, welcomeGift: true, reps: Math.min(st.repsCap, st.reps + 100) }
    emit()
}

/** La 1re partie de poker (tuto solo) est jouée : les suivantes passeront à la vraie table multi. Idempotent. */
export function markPokerFirstGameDone() {
    if (st.pokerFirstGameDone) return
    st = { ...st, pokerFirstGameDone: true }
    emit()
}
export function isPokerFirstGameDone(): boolean { return st.pokerFirstGameDone }

// === CASH QUOTIDIEN vs les boss (persistant à la journée, reset à minuit) ===
/** Début d'une partie cash : reset les tapis boss si NOUVEAU JOUR, fixe le cap (= ton buy-in) à la 1re
 *  partie du jour. Renvoie le cap du jour + les tapis boss persistés (nom → reps ; 0 = ruiné/out). */
export function beginPokerCashGame(today: string, playerBuyin: number): { cap: number; bossStacks: Record<string, number> } {
    if (st.pokerCashDate !== today) st = { ...st, pokerCashDate: today, pokerCashCap: 0, pokerBossStacks: {} }
    let cap = st.pokerCashCap
    if (cap <= 0) { cap = Math.max(1, Math.floor(playerBuyin)); st = { ...st, pokerCashCap: cap } }
    return { cap, bossStacks: { ...st.pokerBossStacks } }
}
/** Persiste les tapis finaux des boss après une partie cash (0 = ruiné → out pour la journée). */
export function savePokerBossStacks(stacks: Record<string, number>) {
    st = { ...st, pokerBossStacks: { ...stacks } }
    emit()
}

// === STATISTIQUES DE PARTIE (per-world) ===
/** Incrémente un compteur de stats. NE déclenche PAS de re-render (lu à l'ouverture du panneau) →
 *  coût nul par pas/attaque ; l'update est embarqué dans la prochaine écriture de save. */
export function bumpStat(key: keyof YellowStats, n = 1) {
    if (!Number.isFinite(n) || n <= 0) return
    st = { ...st, stats: { ...st.stats, [key]: (st.stats[key] ?? 0) + Math.floor(n) } }
}
export function getStats(): YellowStats { return st.stats }
/** Met à jour un compteur de stats en gardant le MAXIMUM observé (ex. meilleur score /1000 du run 2, car la note
 *  n'est pas monotone). Comme bumpStat : pas d'emit ; la valeur est embarquée dans la prochaine écriture de save.
 *  Renvoie true si un nouveau record vient d'être posé (pour déclencher une sauvegarde immédiate au besoin). */
export function recordStatMax(key: keyof YellowStats, value: number): boolean {
    if (!Number.isFinite(value) || value <= (st.stats[key] ?? 0)) return false
    st = { ...st, stats: { ...st.stats, [key]: Math.floor(value) } }
    return true
}

/** RUN 2 — incrémente le compteur de potions de Ligue (champ top-level, hors YellowStats). Pas d'emit (comme bumpStat). */
export function bumpLeaguePotions(n = 1) {
    if (!Number.isFinite(n) || n <= 0) return
    st = { ...st, leaguePotions: st.leaguePotions + Math.floor(n) }
}
/** RUN 2 — accumule le temps de jeu ACTIF (ms). Pas d'emit (lu en direct à l'ouverture du panneau). */
export function bumpPlaytime(ms: number) {
    if (!Number.isFinite(ms) || ms <= 0) return
    st = { ...st, playtimeMs: st.playtimeMs + Math.floor(ms) }
}

// === CADEAU DU DIEU SPAG (événementiel, one-shot) ===

/** Message de cadeau en attente d'affichage (toast). Transient, non persisté. */
let pendingGiftMessage: string | null = null

/**
 * Cadeau du DIEU SPAG : +150 énergie, UNE seule fois par joueur (flag `spagGift` persisté).
 * Crédité après hydratation (cf. saveManager) pour ne pas être écrasé. Plafonné par repsCap :
 * si la jauge déborde, on le signale quand même (message "batterie pleine").
 */
export function claimSpagGift() {
    if (st.spagGift) return
    const before = st.reps
    st = { ...st, spagGift: true, reps: Math.min(st.repsCap, st.reps + 150) }
    const gained = st.reps - before
    pendingGiftMessage = gained > 0
        ? `🍝 Le DIEU SPAG te bénit : +${gained} d'énergie offerte ! Régale-toi, mortel.`
        : `🍝 Le DIEU SPAG voulait t'offrir 150 d'énergie… mais ta jauge déborde déjà ! 🤌`
    emit()
}

/** Récupère (et efface) le message de cadeau en attente, pour l'afficher en toast côté UI. */
export function consumeGiftMessage(): string | null {
    const m = pendingGiftMessage
    pendingGiftMessage = null
    return m
}

/**
 * Cadeau du DIEU DES PÂTES (poster mural du Centre) : +100 énergie, UNE seule fois par joueur
 * (flag `pastaGodGift` persisté → anti-exploit du clic en boucle). Renvoie true si le don a eu
 * lieu (le dialogue varie selon). Plafonné par repsCap.
 */
export function claimPastaGodGift(): boolean {
    if (st.pastaGodGift) return false
    st = { ...st, pastaGodGift: true, reps: Math.min(st.repsCap, st.reps + 100) }
    emit()
    return true
}

/**
 * Enregistre une victoire sur le sbire : +1 au compteur du jour ET au cumul.
 * Renvoie le numéro de victoire TOTAL (1-indexé) → choix de l'explication app.
 */
export function recordSbireWin(): number {
    const winsTotal = st.sbireWinsTotal + 1
    st = { ...st, sbireDefeatsToday: st.sbireDefeatsToday + 1, sbireWinsTotal: winsTotal }
    emit()
    return winsTotal
}

// ── DAEMOMANIAQUE (guide de capture post-run-3) : 5 consultations GRATUITES/jour, puis payant en énergie. ──
export const FREE_CONSULTS_PER_DAY = 5
export const CONSULT_COST = 50 // énergie par consultation au-delà des 5 gratuites du jour
/** Une consultation : gratuite si < 5 aujourd'hui, sinon débite CONSULT_COST reps. { ok:false, reason:"reps" } si solde
 *  insuffisant. spendReps garde le solde + emit. consultsToday se reset au tick quotidien (creditDailyReps). */
export function consultDaemomaniaque(): { ok: boolean; paid: boolean; reason?: "reps" } {
    const used = st.consultsToday ?? 0
    if (used < FREE_CONSULTS_PER_DAY) {
        st = { ...st, consultsToday: used + 1 }
        emit()
        return { ok: true, paid: false }
    }
    if (!spendReps(CONSULT_COST)) return { ok: false, paid: false, reason: "reps" }
    st = { ...st, consultsToday: used + 1 }
    emit()
    return { ok: true, paid: true }
}
/** Consultations restantes GRATUITES aujourd'hui (0-5), pour l'UI. */
export function freeConsultsLeft(): number {
    return Math.max(0, FREE_CONSULTS_PER_DAY - (st.consultsToday ?? 0))
}

// === RÉPUTATION PvP ===

/** Enregistre l'issue d'un match PvP. "forfeit" = j'ai abandonné (compté en défaite aussi). */
export function recordPvpResult(result: "win" | "loss" | "forfeit") {
    const s = st.pvpStats
    const next: PvpStats = { ...s, daemonUse: { ...s.daemonUse }, moveUse: { ...s.moveUse } }
    if (result === "win") next.wins += 1
    else if (result === "loss") next.losses += 1
    else { next.forfeits += 1; next.losses += 1 }
    st = { ...st, pvpStats: next }
    emit()
}

/** Comptabilise l'usage d'un Daemon (+ d'une attaque) en PvP → fétiche / favorite. */
export function recordPvpUse(speciesId: string, moveId?: string) {
    const s = st.pvpStats
    const daemonUse = { ...s.daemonUse, [speciesId]: (s.daemonUse[speciesId] ?? 0) + 1 }
    const moveUse = moveId ? { ...s.moveUse, [moveId]: (s.moveUse[moveId] ?? 0) + 1 } : s.moveUse
    st = { ...st, pvpStats: { ...s, daemonUse, moveUse } }
    emit()
}

/** Cumule les dégâts infligés PAR chaque Daemon (speciesId → total) sur un match PvP → top-5 « plus gros dégâts ».
 *  `byDaemon` = accumulateur du camp du joueur pour CE combat (fourni par battleStore en fin de duel). Non rétroactif. */
export function recordPvpDamage(byDaemon: Record<string, number>) {
    if (!byDaemon || Object.keys(byDaemon).length === 0) return
    const s = st.pvpStats
    const dmgByDaemon = { ...(s.dmgByDaemon ?? {}) }
    for (const [sid, amount] of Object.entries(byDaemon)) {
        if (typeof amount === "number" && amount > 0) dmgByDaemon[sid] = (dmgByDaemon[sid] ?? 0) + Math.floor(amount)
    }
    st = { ...st, pvpStats: { ...s, dmgByDaemon } }
    emit()
}

/** DÔME UNIQUEMENT — usage d'un Daemon/attaque dans un tournoi du Dôme (appelé par battleStore seulement si
 *  trainerId "frontier:DOME"). Alimente les « fétiches du Dôme » (≠ pvpStats global). */
export function recordDomeUse(speciesId: string, moveId?: string) {
    const s = st.domeStats ?? emptyDomeStats()
    const daemonUse = { ...s.daemonUse, [speciesId]: (s.daemonUse[speciesId] ?? 0) + 1 }
    const moveUse = moveId ? { ...s.moveUse, [moveId]: (s.moveUse[moveId] ?? 0) + 1 } : s.moveUse
    st = { ...st, domeStats: { ...s, daemonUse, moveUse } }
    emit()
}
/** DÔME UNIQUEMENT — issue d'un TOURNOI (win = remporté ; loss = éliminé/finale perdue). */
export function recordDomeResult(won: boolean) {
    const s = st.domeStats ?? emptyDomeStats()
    st = { ...st, domeStats: { ...s, daemonUse: { ...s.daemonUse }, moveUse: { ...s.moveUse }, wins: s.wins + (won ? 1 : 0), losses: s.losses + (won ? 0 : 1) } }
    emit()
}

function topKey(rec: Record<string, number>): string | null {
    let best: string | null = null, max = -1
    for (const [k, v] of Object.entries(rec)) if (v > max) { max = v; best = k }
    return best
}
/** Daemon fétiche (le plus envoyé en PvP), ou null. */
export function favoriteDaemon(): string | null { return topKey(st.pvpStats.daemonUse) }
/** Attaque favorite (la plus utilisée en PvP), ou null. */
export function favoriteMove(): string | null { return topKey(st.pvpStats.moveUse) }

// === ACE (rival) ===
/** Pic de niveau mémorisé + box des contres (pour construire son équipe au combat). */
export function getAceState(): { peak: number; box: Record<string, number> } {
    return { peak: st.acePeakLevel, box: st.aceBox }
}
/** Taille d'équipe d'ACE : max(pic, taille du joueur), plancher 3 (les 3 panthères), cliquet → ne redescend jamais. */
export function aceTeamSizeFor(playerTeamSize: number): number {
    const want = Math.max(1, Math.min(6, Math.floor(playerTeamSize)))
    const size = Math.max(st.aceTeamSizePeak, 3, want)
    if (size !== st.aceTeamSizePeak) { st = { ...st, aceTeamSizePeak: size }; emit() }
    return size
}
/** Nombre de défaites d'ACE infligées par ce joueur. */
export function aceWinsCount(): number { return st.aceWins }
/**
 * Niveau de combat d'ACE — CLIQUET. ACE ne monte ses Daemons de niveau QU'À sa défaite
 * (recordAceDefeat ratchete acePeakLevel) ; entre deux défaites son niveau est FIGÉ, quelle
 * que soit la progression du joueur. À la TOUTE PREMIÈRE rencontre (pic jamais posé), on fige
 * le pic à « ton meilleur + ACE_EASY_START » (un poil facile) puis il ne bouge plus jusqu'à ce
 * que tu le battes. (Corrige le bug : avant, son niveau se recalibrait à CHAQUE rencontre.)
 */
export function aceBattleLevel(playerBestLevel: number): number {
    if (st.acePeakLevel <= 0) {
        const init = Math.max(1, Math.min(MAX_LEVEL, Math.floor(playerBestLevel) + ACE_EASY_START))
        st = { ...st, acePeakLevel: init }
        emit()
    }
    return st.acePeakLevel
}
/** ACE affrontable aujourd'hui ? (1 défaite/jour ; retry libre si on perd). */
export function aceAvailableToday(): boolean {
    return st.creditedThrough === "" || st.aceDefeatedDate !== st.creditedThrough
}
/**
 * Défaite d'ACE : ratchet du pic de niveau (= max(pic, ton meilleur + 2), ne régresse
 * jamais) + mémorise le niveau du contre affronté. Verrouille la journée. Renvoie le n° de victoire.
 */
export function recordAceDefeat(playerBestLevel: number, playerLastTypes: PokeType[], playerLastLevel: number): number {
    const wins = st.aceWins + 1
    const peak = aceTargetLevel(st.acePeakLevel, playerBestLevel)
    const counter = bestCounter(playerLastTypes)
    const box = { ...st.aceBox, [counter]: Math.max(st.aceBox[counter] ?? 0, playerLastLevel) }
    st = { ...st, acePeakLevel: peak, aceBox: box, aceWins: wins, aceDefeatedDate: st.creditedThrough }
    emit()
    return wins
}

// === DUELS reflets (Viridian = exacts / arène eau = inversés) ===
/** A-t-on DÉJÀ vaincu ce joueur-IA aujourd'hui ? (limite : 1 victoire par joueur-IA et par jour). */
export function duelWonToday(userId: string): boolean {
    return st.creditedThrough !== "" && st.duelWins[userId] === st.creditedThrough
}
/** Enregistre une victoire de duel du jour contre ce joueur-IA (verrouille jusqu'à demain). */
export function recordDuelWin(userId: string): void {
    st = { ...st, duelWins: { ...st.duelWins, [userId]: st.creditedThrough }, stats: { ...st.stats, duelWinsTotal: st.stats.duelWinsTotal + 1 } }
    emit()
}

// RUN 3 — limite DURCIE des duels-reflets : 1 SEUL match miroir par jour (défaite comprise), au lieu de « 1 victoire
//   par reflet/jour ». La règle du double-XP reste marrante mais devient non-farmable en run 3. Réutilise duelWins
//   avec une CLÉ RÉSERVÉE (`__daily__`, jamais un vrai userId) → aucune migration de save, aucun impact leaderboard
//   (duelWinsTotal non touché). Le match est consommé au LANCEMENT → une défaite compte aussi.
const DUEL_DAILY_KEY = "__daily__"
/** RUN 3 : a-t-on déjà JOUÉ un match miroir aujourd'hui (victoire OU défaite) ? */
export function duelPlayedToday(): boolean {
    return st.creditedThrough !== "" && st.duelWins[DUEL_DAILY_KEY] === st.creditedThrough
}
/** RUN 3 : marque le match miroir du jour comme JOUÉ (au lancement) → verrouille jusqu'à demain, issue indifférente. */
export function recordDuelMatch(): void {
    st = { ...st, duelWins: { ...st.duelWins, [DUEL_DAILY_KEY]: st.creditedThrough } }
    emit()
}

// === DRESSEUR D'ORCALINE (plaine d'entraînement) ===
/** Niveau des Orcalines du dresseur pour un nombre de victoires donné : 35, +10 par victoire (cap 100). */
export function orcalineLevelForWins(wins: number): number {
    return Math.min(MAX_LEVEL, 35 + 10 * Math.max(0, wins))
}
/** Niveau des Orcalines pour le PROCHAIN combat (selon les victoires déjà acquises). */
export function orcalineNextLevel(): number { return orcalineLevelForWins(st.orcalineWins) }
export function orcalineWinsCount(): number { return st.orcalineWins }
/** Dresseur affrontable aujourd'hui ? (1 victoire/jour ; retry libre si on perd). */
export function orcalineAvailableToday(): boolean {
    return st.creditedThrough === "" || st.orcalineDate !== st.creditedThrough
}
/** Victoire sur le dresseur : verrouille la journée, incrémente le compteur. Renvoie le nb de victoires AVANT
 *  (→ niveau battu = orcalineLevelForWins(winsBefore) ; winsBefore===0 = 1re victoire). */
export function recordOrcalineDefeat(): number {
    const winsBefore = st.orcalineWins
    st = { ...st, orcalineWins: winsBefore + 1, orcalineDate: st.creditedThrough }
    emit()
    return winsBefore
}

/** PNJ 5 (gardien de la Grotte du Nexus) : nb de victoires du joueur (pilote le SCALING : +2 niveaux/victoire). */
export function pnj5WinsCount(): number { return st.pnj5Wins }
/** Victoire sur PNJ 5 : incrémente le compteur. PAS de cap journalier (re-battable à chaque visite).
 *  Renvoie le nb de victoires AVANT (→ niveau battu = pnj5Level(winsBefore)). */
export function recordPnj5Defeat(): number {
    const winsBefore = st.pnj5Wins
    st = { ...st, pnj5Wins: winsBefore + 1 }
    emit()
    return winsBefore
}

/** Prix actuel d'un Super Pasta : (60 + bonus journalier) × 1.5^(achats du jour). */
export function superPastaPrice(): number {
    return Math.round((SUPER_PASTA_BASE + st.pastaDayBonus) * SUPER_PASTA_GROWTH ** st.pastaBoughtToday)
}

/**
 * Achète et applique un Super Pasta à un Daemon de l'équipe : +1 niveau effectif,
 * apprentissage des attaques du palier (ou mise en attente), PV ajustés au level-up.
 * Renvoie { ok:false } si solde insuffisant, Daemon introuvable, ou déjà au max.
 */
export function buySuperPasta(uid: string): { ok: boolean; reason?: "reps" | "introuvable" | "max"; result?: ExpResult; price?: number } {
    const price = superPastaPrice()
    if (st.reps < price) return { ok: false, reason: "reps" }
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    const orig = st.team[idx]
    const sp = getSpecies(orig.speciesId)
    const baseExp = Math.max(orig.exp, expForLevel(orig.level, orig.speciesId))
    const effLevel = Math.max(orig.level, levelFromExp(orig.exp, orig.speciesId))
    if (effLevel >= MAX_LEVEL) return { ok: false, reason: "max" }
    const target = Math.min(MAX_LEVEL, effLevel + 1)
    const mon: MonInstance = {
        ...orig, ivs: { ...orig.ivs }, moves: orig.moves.map((s) => ({ ...s })),
        pendingMoves: orig.pendingMoves ? [...orig.pendingMoves] : undefined,
    }
    const hpBefore = sp ? fullStats(orig, sp).hp : orig.currentHp
    const result = applyExp(mon, Math.max(1, expForLevel(target, orig.speciesId) - baseExp))
    const hpAfter = sp ? fullStats(mon, sp).hp : mon.currentHp
    mon.currentHp = Math.min(hpAfter, mon.currentHp + Math.max(0, hpAfter - hpBefore))
    const team = st.team.slice()
    team[idx] = mon
    st = { ...st, reps: st.reps - price, pastaBoughtToday: st.pastaBoughtToday + 1, team }
    trackBallLockSpend(price) // VŒU DU GÉNIE : dépense hors spendReps
    emit()
    return { ok: true, result, price }
}

/** Augmente le plafond de stockage (badge d'arène). */
export function raiseRepsCap(delta: number) {
    st = { ...st, repsCap: st.repsCap + Math.max(0, Math.floor(delta)) }
    emit()
}

/**
 * Cadeau exceptionnel HORS-PLAFOND (ex. anniversaire) : relève le cap de n PUIS crédite n.
 * Garantit le don intégral — sans relever le cap, le surplus serait re-plafonné (donc effacé)
 * au prochain bankReps quotidien. Le cap reste relevé (perk durable assumé).
 */
export function grantBonusEnergyUncapped(n: number) {
    if (runMode() === "run3") return // RUN 3 : aucun cadeau d'énergie hors-plafond (source unique)
    const amt = Math.max(0, Math.floor(n))
    if (amt <= 0) return
    st = { ...st, repsCap: st.repsCap + amt, reps: st.reps + amt }
    emit()
}

// ============================================================
// DÉFIS DU LABO (étage du Centre) — physiques / CT / casino Tonytony
// ============================================================

/** Lance un défi. CT → slot CT indépendant (reset du compteur de dégâts). Physique → slot physique
 *  (remplace l'éventuel physique en cours). Les deux peuvent être actifs en parallèle. */
export function startLabDefi(defi: LabActiveDefi) {
    const d = st.labDefi
    if (defi.kind === "ct") st = { ...st, labDefi: { ...d, activeCt: defi, ctDamageByType: {} } }
    else st = { ...st, labDefi: { ...d, activePhys: defi } }
    emit()
}

/** Clôt UN défi (annulation OU récompense remise). "ct" vide aussi le compteur de dégâts CT. */
export function clearLabDefi(which: "phys" | "ct") {
    const d = st.labDefi
    if (which === "ct") {
        if (!d.activeCt && Object.keys(d.ctDamageByType).length === 0) return
        st = { ...st, labDefi: { ...d, activeCt: null, ctDamageByType: {} } }
    } else {
        if (!d.activePhys) return
        st = { ...st, labDefi: { ...d, activePhys: null } }
    }
    emit()
}

/** Défi 2 : marque les « 150 squats en 1 série » réussis (one-shot à vie, idempotent). */
export function markSquat150Done() {
    if (st.labDefi.squat150Done) return
    st = { ...st, labDefi: { ...st.labDefi, squat150Done: true } }
    emit()
}

/** Nb de réussites d'un défi physique répétable (pour scaler cible + récompense). */
export function physWinCount(kind: string): number {
    return st.labDefi.physWins[kind] ?? 0
}
/** Enregistre une réussite d'un défi physique répétable (durcit le défi + augmente la récompense). */
export function recordPhysWin(kind: string) {
    const d = st.labDefi
    st = { ...st, labDefi: { ...d, physWins: { ...d.physWins, [kind]: (d.physWins[kind] ?? 0) + 1 } } }
    emit()
}

/** Accumule des dégâts infligés par le joueur pour le défi CT actif (si le type ciblé correspond). */
export function addCtDamage(type: PokeType, amount: number) {
    const d = st.labDefi
    if (!d.activeCt || d.activeCt.kind !== "ct" || d.activeCt.ctType !== type) return
    const add = Math.max(0, Math.floor(amount))
    if (add <= 0) return
    st = { ...st, labDefi: { ...d, ctDamageByType: { ...d.ctDamageByType, [type]: (d.ctDamageByType[type] ?? 0) + add } } }
    emit()
}

/** Dégâts cumulés pour le défi CT actif (0 si aucun défi CT en cours). */
export function ctDefiProgress(): number {
    const d = st.labDefi
    if (!d.activeCt || d.activeCt.kind !== "ct" || !d.activeCt.ctType) return 0
    return d.ctDamageByType[d.activeCt.ctType] ?? 0
}

/** Enregistre une CT gagnée au défi CT (pour le plafond 2/type + le seuil ×2), idempotent. */
export function recordCtEarned(ctId: string) {
    if (st.labDefi.ctEarned.includes(ctId)) return
    st = { ...st, labDefi: { ...st.labDefi, ctEarned: [...st.labDefi.ctEarned, ctId] } }
    emit()
}

/** Défi 3 : programme le multiplicateur d'énergie pour un jour cible (YYYY-MM-DD). */
export function setTomorrowEnergyMult(mult: number, date: string) {
    st = { ...st, labDefi: { ...st.labDefi, tomorrowEnergyMult: Math.max(1, Math.floor(mult)), tomorrowEnergyDate: date } }
    emit()
}

// ── Casino pattern (défi Surprise) ──
export interface CasinoBet { case: number; amount: number }
export interface CasinoSpinResult {
    ok: boolean
    reason?: string
    winningCase?: number
    totalBet?: number
    totalWin?: number
    bankrupt?: boolean
    /** Cumul BRUT gagné après ce spin. */
    totalWon?: number
    /** Cible Tonytony atteinte (et pas encore réclamé) ? */
    tonytonyReady?: boolean
}

/**
 * SPIN du casino pattern (déterministe : motif fixe). Valide les mises, dépense la mise,
 * crédite le gain (plafonné par repsCap, normal), accumule le cumul BRUT (non plafonné, vers Tonytony),
 * gère streak + banqueroute. `nowMs` = horloge fournie par l'appelant (Date.now() côté UI).
 */
export function casinoSpin(bets: CasinoBet[], nowMs: number): CasinoSpinResult {
    // RUN 3 (concours) : le casino est FERMÉ — casinoSpin écrit st.reps DIRECTEMENT (contourne le verrou
    //   grantReps/creditReps). Sans ce garde, la roulette du labo est un faucet d'énergie infini qui casse
    //   la « source unique » du concours ET empêche la fin de run (gatée sur reps===0). Cf. tables casino déjà fermées.
    if (runMode() === "run3") return { ok: false, reason: "🔒 Casino FERMÉ pendant le CONCOURS (run 3)." }
    const d = st.labDefi
    if (d.casinoBankruptUntil && new Date(d.casinoBankruptUntil).getTime() > nowMs) {
        return { ok: false, reason: "Le casino est en banqueroute. Reviens plus tard." }
    }
    if (!Array.isArray(bets) || bets.length === 0 || bets.length > CASINO_NUM_CASES) return { ok: false, reason: "Mise invalide." }
    const seen = new Set<number>()
    let totalBet = 0
    for (const b of bets) {
        if (!Number.isInteger(b.case) || b.case < 0 || b.case >= CASINO_NUM_CASES) return { ok: false, reason: "Case invalide." }
        if (seen.has(b.case)) return { ok: false, reason: "Doublon de case." }
        seen.add(b.case)
        if (!Number.isInteger(b.amount) || b.amount < CASINO_MIN_BET || b.amount > CASINO_MAX_BET) return { ok: false, reason: "Montant invalide." }
        totalBet += b.amount
    }
    if (totalBet > st.reps) return { ok: false, reason: `Pas assez d'énergie (${totalBet} requis, ${st.reps} dispo).` }
    // 🤫 Le TOUT PREMIER pari du joueur est gagné d'office (la case gagnante = sa 1re mise) ; ensuite, normal.
    const firstBet = !d.casinoFirstBetDone
    const winningCase = firstBet ? bets[0].case : casinoWinningCase(d.casinoSpinIndex)
    const winningBet = bets.find((b) => b.case === winningCase)
    const totalWin = winningBet ? winningBet.amount * CASINO_WIN_MULT : 0
    let newStreak = totalWin > 0 ? d.casinoWinStreak + 1 : 0
    let newSpinIndex = d.casinoSpinIndex + 1
    let bankruptUntil = d.casinoBankruptUntil
    let bankrupt = false
    if (newStreak >= CASINO_BANKRUPT_STREAK) {
        bankrupt = true
        bankruptUntil = new Date(nowMs + CASINO_BANKRUPT_COOLDOWN_MS).toISOString()
        newStreak = 0
        newSpinIndex = 0
    }
    const newTotalWon = d.casinoTotalWon + totalWin
    const newReps = Math.min(st.repsCap, Math.max(0, st.reps - totalBet) + totalWin)
    st = {
        ...st,
        reps: newReps,
        labDefi: { ...d, casinoSpinIndex: newSpinIndex, casinoWinStreak: newStreak, casinoBankruptUntil: bankruptUntil, casinoTotalWon: newTotalWon, casinoFirstBetDone: true },
    }
    trackBallLockSpend(totalBet) // VŒU DU GÉNIE : mise casino = dépense (hors spendReps)
    emit()
    return { ok: true, winningCase, totalBet, totalWin, bankrupt, totalWon: newTotalWon, tonytonyReady: newTotalWon >= TONYTONY_TARGET && !d.tonytonyClaimed }
}

/** Cumul brut gagné au casino (vers la cible Tonytony). */
export function casinoTotalWon(): number { return st.labDefi.casinoTotalWon }

/** Ajoute `n` (gain net > 0) au cumul gagné au casino → FAIT PROGRESSER la quête Tonytony. Utilisé par la
 *  ROULETTE multijoueur (le croupier en tient le compte) en plus du casino-pattern. Persisté par le caller. */
export function addCasinoWon(n: number): void {
    const add = Math.max(0, Math.floor(n))
    if (add <= 0) return
    st = { ...st, labDefi: { ...st.labDefi, casinoTotalWon: st.labDefi.casinoTotalWon + add } }
    emit()
}

// ════════════════ BLACKJACK (casino) — custody : mise (spendReps) + règlement + cumul VIP ════════════════
/** Cumul des GAINS NETS au blackjack (progression VIP → CT signature). */
export function blackjackTotalWon(): number { return st.labDefi.blackjackWon }
/** Règle une main : crédite `payout` (mise remboursée + gain, plafonné repsCap comme d'habitude) et
 *  accumule le GAIN NET (>0) dans blackjackWon (hors-plafond). La mise a déjà été débitée (spendReps). */
export function settleBlackjack(payout: number, net: number): void {
    const pay = Math.max(0, Math.floor(payout))
    if (pay > 0) grantReps(pay)
    const n = Math.floor(net)
    if (n > 0) st = { ...st, labDefi: { ...st.labDefi, blackjackWon: st.labDefi.blackjackWon + n } }
    emit()
}

/** Réclame la CT-trophée « Apothéose » dès que le cumul net atteint BLACKJACK_CT_TARGET (one-shot à vie).
 *  Retourne le NOM de l'attaque débloquée (pour la célébration UI) si le palier vient d'être franchi, sinon null.
 *  Idempotent : le flag blackjackCtClaimed empêche tout re-don, même si grantCt échoue (CT déjà possédée). */
export function claimBlackjackCt(): string | null {
    if (getActiveWorld() === "ngplus") return null // RUN 2 : l'Apothéose est remplacée par les picks de CT de boss (cf. ci-dessous)
    if (st.labDefi.blackjackCtClaimed) return null
    if (st.labDefi.blackjackWon < BLACKJACK_CT_TARGET) return null
    st = { ...st, labDefi: { ...st.labDefi, blackjackCtClaimed: true } }
    grantCt(BLACKJACK_CT_ID) // emit() interne ; idempotent si déjà possédée
    const moveName = getMove(getCt(BLACKJACK_CT_ID)?.moveId ?? "")?.name ?? "Apothéose"
    emit()
    return moveName
}

// ── BLACKJACK RUN 2 (NG+) : récompense UNIQUE. Une fois BLACKJACK_CT_NGPLUS_TARGET (1000 ⚡) nets gagnés,
//    le joueur choisit UNE SEULE CT — n'importe laquelle (magasin + cadeaux + labo, sans filtre de badge) SAUF
//    les 5 signatures de boss (ct53-57) et l'Apothéose (ct52) — encore NON possédée. Après ce pick, le blackjack
//    ne donne plus AUCUN lot en run 2 (one-shot via blackjackNgplusPicks). ──
/** CT choisissables encore non possédées (univers = run2BlackjackCtPool : tout sauf boss + Apothéose). */
export function blackjackNgplusChoices(): string[] {
    return run2BlackjackCtPool().filter((id) => !st.ownedCts.includes(id))
}
/** La récompense UNIQUE est-elle disponible ? (run 2, seuil de 1000 ⚡ atteint, JAMAIS encore réclamée, et il
 *  reste au moins une CT à prendre). Une seule fois pour tout le run 2. */
export function blackjackNgplusPickPending(): boolean {
    if (getActiveWorld() !== "ngplus") return false
    if (st.labDefi.blackjackNgplusPicks >= 1) return false // déjà réclamée une fois → plus jamais
    return st.labDefi.blackjackWon >= BLACKJACK_CT_NGPLUS_TARGET && blackjackNgplusChoices().length > 0
}
/** Réclame la récompense unique : octroie la CT choisie (si éligible) et VERROUILLE tout futur lot blackjack
 *  du run 2 (picks → 1). Renvoie le nom de l'attaque, sinon null. */
export function claimBlackjackCtNgplus(ctId: string): string | null {
    if (!blackjackNgplusPickPending()) return null
    if (!blackjackNgplusChoices().includes(ctId)) return null // doit être une CT choisissable non possédée
    st = { ...st, labDefi: { ...st.labDefi, blackjackNgplusPicks: 1 } } // one-shot : verrouillé définitivement
    grantCt(ctId)
    const moveName = getMove(getCt(ctId)?.moveId ?? "")?.name ?? ctId
    emit()
    return moveName
}

// ── Tickets roulette ──
// Deux sources DISTINCTES : (1) le ticket GRATUIT du jour (Dieu Spaghetti) → cinématique à la connexion,
// joué directement (gated par dailyTicketDate, HORS file) ; (2) les tickets OCTROYÉS par les boss
// (file FIFO `grantedTickets`, valeur variable) → joués au LABO + visibles dans le sac.
export interface CasinoTicketResult { winningCase: number; won: boolean; winAmount: number; betValue: number }

/** Nb de tickets de BOSS en attente dans la file (hors ticket gratuit du jour). */
export function ticketCount(): number { return st.labDefi.grantedTickets.length }

/** Valeur de mise du PROCHAIN ticket de boss à jouer (0 si la file est vide). */
export function peekTicketValue(): number { return st.labDefi.grantedTickets[0] ?? 0 }

/** Octroie un ticket roulette de `value` énergies de mise (borné 10–50 ; file plafonnée).
 *  `origin` : "boss" (arène/sbire/ACE, défaut) · "spag" (Dieu Spaghetti) · "casino" (trouvé/acheté →
 *  RACHETABLE par le barman). */
export function grantRouletteTicket(value: number, origin: "boss" | "spag" | "casino" = "boss") {
    if (runMode() === "run3") return // RUN 3 : aucun ticket (casino/boss/spag) — l'énergie a une source unique
    const d = st.labDefi
    if (d.grantedTickets.length >= TICKET_QUEUE_MAX) return
    st = { ...st, labDefi: { ...d, grantedTickets: [...d.grantedTickets, clampTicketValue(value)], grantedTicketOrigins: [...d.grantedTicketOrigins, origin] } }
    emit()
}

/** Consomme (retire) le PROCHAIN ticket de la file et renvoie sa valeur (0 si vide). */
export function consumeTicket(): number {
    const d = st.labDefi
    if (d.grantedTickets.length === 0) return 0
    const [first, ...rest] = d.grantedTickets
    st = { ...st, labDefi: { ...d, grantedTickets: rest, grantedTicketOrigins: d.grantedTicketOrigins.slice(1) } }
    emit()
    return first
}

/** Nb de tickets RACHETABLES (origine casino) en file. */
export function casinoTicketCount(): number {
    return st.labDefi.grantedTicketOrigins.filter((o) => o === "casino").length
}
/** Le barman RACHÈTE le 1er ticket d'origine casino : le retire de la file et renvoie sa valeur (0 si
 *  aucun rachetable). Le caller crédite les reps (1:1). */
export function redeemCasinoTicket(): number {
    const d = st.labDefi
    const i = d.grantedTicketOrigins.findIndex((o) => o === "casino")
    if (i < 0) return 0
    const value = d.grantedTickets[i]
    st = { ...st, labDefi: { ...d, grantedTickets: d.grantedTickets.filter((_, j) => j !== i), grantedTicketOrigins: d.grantedTicketOrigins.filter((_, j) => j !== i) } }
    emit()
    return value
}

/** CONVERSION TICKETS → CRÉDIT ROULETTE : engage TOUTE la file de tickets (toutes origines) sur la VRAIE
 *  table de roulette. Chaque ticket apporte sa valeur de mise (10/20/30/50) en crédit divisible (jouable
 *  case par case, non encaissable). Vide la file et renvoie le total converti (0 si aucun ticket). */
export function convertAllTicketsToCredit(): number {
    const d = st.labDefi
    if (d.grantedTickets.length === 0) return 0
    const total = d.grantedTickets.reduce((a, b) => a + b, 0)
    st = { ...st, labDefi: { ...d, grantedTickets: [], grantedTicketOrigins: [], rouletteCredit: d.rouletteCredit + total } }
    emit()
    return total
}

/** Le ticket GRATUIT du jour (Dieu Spaghetti) est-il disponible ? (1×/jour, `today` = jour serveur). */
export function dailyTicketAvailable(today: string): boolean {
    return !!today && st.labDefi.dailyTicketDate !== today
}

/** La cinématique roulette du Dieu Spaghetti a-t-elle déjà été montrée ? (one-shot). */
export function spagRouletteSeen(): boolean { return st.labDefi.spagRouletteSeen }
/** Marque la cinématique roulette comme vue (ne se rouvrira plus jamais à la connexion). */
export function markSpagRouletteSeen(): void {
    if (st.labDefi.spagRouletteSeen) return
    st = { ...st, labDefi: { ...st.labDefi, spagRouletteSeen: true } }
    emit()
}

/** Le cadeau de bienvenue (3 tickets) du Dieu Spaghetti a-t-il déjà été réclamé ? (one-shot à vie). */
export function spagWelcomeGiftClaimed(): boolean { return st.labDefi.spagWelcomeGift }
/** Réclame le cadeau de bienvenue du Dieu Spaghetti : 3 tickets roulette "spag" (à JOUER, non rachetables
 *  par le barman). Idempotent (pose le flag d'abord). Renvoie le nb de tickets réellement octroyés (0 si
 *  déjà réclamé ou file pleine). */
export function claimSpagWelcomeTickets(): number {
    if (st.labDefi.spagWelcomeGift) return 0
    st = { ...st, labDefi: { ...st.labDefi, spagWelcomeGift: true } } // flag AVANT octroi → jamais de double cadeau
    let granted = 0
    for (let i = 0; i < SPAG_GIFT_TICKET_COUNT; i++) {
        const before = st.labDefi.grantedTickets.length
        grantRouletteTicket(SPAG_GIFT_TICKET_VALUE, "spag")
        if (st.labDefi.grantedTickets.length > before) granted++
    }
    emit()
    return granted
}

// ════════════════ CRÉDIT ROULETTE (énergie offerte, jouable UNIQUEMENT à la table) ════════════════
/** Solde de crédit roulette (énergie offerte, non encaissable, dépensée avant les reps à la table). */
export function rouletteCreditBalance(): number { return st.labDefi.rouletteCredit }
/** Ajoute `n` au crédit roulette. */
export function grantRouletteCredit(n: number): void {
    if (runMode() === "run3") return // RUN 3 : aucun crédit roulette (énergie offerte) — source unique
    const add = Math.max(0, Math.floor(n))
    if (add <= 0) return
    st = { ...st, labDefi: { ...st.labDefi, rouletteCredit: st.labDefi.rouletteCredit + add } }
    emit()
}
/** Finance une mise de roulette : dépense le CRÉDIT d'abord, puis les reps. Renvoie false si fonds
 *  insuffisants (crédit + reps < montant). Les gains éventuels reviennent en reps (jamais en crédit). */
export function fundRouletteBet(amount: number): boolean {
    const a = Math.max(0, Math.floor(amount))
    const credit = st.labDefi.rouletteCredit
    if (credit + st.reps < a) return false
    const fromCredit = Math.min(credit, a)
    st = { ...st, reps: st.reps - (a - fromCredit), labDefi: { ...st.labDefi, rouletteCredit: credit - fromCredit } }
    trackBallLockSpend(a - fromCredit) // VŒU DU GÉNIE : mise roulette (part reps) = dépense
    emit()
    return true
}

// ÉVÉNEMENT D'UN JOUR (Dieu Spaghetti) : cadeau du 10e pas → crédit roulette (one-shot).
export function spagStepGiftDone(): boolean { return st.labDefi.spagStepGiftClaimed }
/** Réclame le cadeau du 10e pas : +STEP_GIFT_CREDIT de crédit roulette. Idempotent (flag d'abord).
 *  Renvoie le crédit octroyé (0 si déjà réclamé). */
export function claimSpagStepGift(): number {
    if (st.labDefi.spagStepGiftClaimed) return 0
    st = { ...st, labDefi: { ...st.labDefi, spagStepGiftClaimed: true, rouletteCredit: st.labDefi.rouletteCredit + STEP_GIFT_CREDIT } }
    emit()
    return STEP_GIFT_CREDIT
}

// ════════════════ BARMAN (casino) — achat "prix libre" + bénédictions SECRÈTES ════════════════
/** Prix plancher d'une potion au barman = prix boutique de la Potion de base. */
export function barmanPotionBasePrice(): number { return getItem("potion")?.price ?? 10 }

/** Achat d'une Potion au barman à PRIX LIBRE (≥ prix de base, payé en reps, surcoût perdu).
 *  Donne 1 Potion + (secret, jamais affiché) une bénédiction selon le MULTIPLE exact du prix :
 *  ×2 = esquive ×2 · ×3 = crit garanti · ×4 = chance roulette 25 % · ×5 = gain garanti plafonné. */
export function buyBarmanPotion(priceReps: number): { ok: boolean; reason?: "min" | "energy" } {
    const base = barmanPotionBasePrice()
    const price = Math.floor(priceReps)
    if (price < base) return { ok: false, reason: "min" }
    if (st.reps < price) return { ok: false, reason: "energy" }
    spendReps(price)
    addItem("potion", 1)
    const d = st.labDefi
    const mult = price % base === 0 ? price / base : 0
    let battle = d.battleBlessings
    let luck = d.rouletteLuck
    if (mult === 2) battle = [...battle, "eva" as const].slice(-BLESSING_QUEUE_MAX)
    else if (mult === 3) battle = [...battle, "crit" as const].slice(-BLESSING_QUEUE_MAX)
    else if (mult === 4) luck = [...luck, { kind: "luck25" as const, cap: price }].slice(-BLESSING_QUEUE_MAX)
    else if (mult === 5) luck = [...luck, { kind: "luckMax" as const, cap: price }].slice(-BLESSING_QUEUE_MAX)
    // SECRET : tous les N achats cumulés (séquence indevinable), la prochaine fouille devient gagnante.
    const newCount = d.barmanPotionsBought + 1
    const blessed = isSecretChipMilestone(newCount) ? true : d.blessedSearch
    st = { ...st, labDefi: { ...st.labDefi, barmanPotionsBought: newCount, battleBlessings: battle, rouletteLuck: luck, blessedSearch: blessed } }
    emit()
    return { ok: true }
}

// ════════════════ JETONS INVISIBLES (casino, SECRET) — fouille au sol ════════════════
/** Génère (1×/jour) les jetons cachés sur des cases-sol aléatoires du casino. `quotaReached` = quota
 *  journalier déjà validé → +1 case gagnante bonus ce jour-là. Idempotent par `today`. */
export function ensureDailyChips(today: string, quotaReached: boolean): boolean {
    if (!today) return false
    const d = st.labDefi
    if (d.chipDay === today) return false
    let n = CHIP_MIN + Math.floor(Math.random() * (CHIP_MAX - CHIP_MIN + 1)) // 1..4 cases gagnantes
    if (quotaReached) n += 1
    const pool = casinoFloorTiles()
    const chips: Array<{ x: number; y: number; count: number }> = []
    for (let i = 0; i < n && pool.length > 0; i++) {
        const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]
        chips.push({ x: t.x, y: t.y, count: CHIP_MIN + Math.floor(Math.random() * (CHIP_MAX - CHIP_MIN + 1)) })
    }
    st = { ...st, labDefi: { ...d, chipDay: today, chips, chipSearched: [] } }
    emit()
    return true
}

/** Fouille la case-sol (x,y) du casino (1×/case/jour). Renvoie le nb de tickets casino trouvés ; `0` =
 *  fouille fraîche mais vide ; `-1` = no-op (case hors-sol ou déjà fouillée aujourd'hui). Une case
 *  gagnante octroie autant de tickets (valeur de base). Si une bénédiction secrète est armée, une case
 *  VIDE devient gagnante (puis la bénédiction tombe). */
export function searchChipTile(x: number, y: number): number {
    const d = st.labDefi
    if (!isCasinoFloorTile(x, y)) return -1
    const key = `${x},${y}`
    if (d.chipSearched.includes(key)) return -1
    const chip = d.chips.find((c) => c.x === x && c.y === y)
    let count = chip?.count ?? 0
    let blessed = d.blessedSearch
    if (count === 0 && blessed) {
        count = CHIP_MIN + Math.floor(Math.random() * (CHIP_MAX - CHIP_MIN + 1))
        blessed = false
    }
    const chips = chip ? d.chips.filter((c) => !(c.x === x && c.y === y)) : d.chips
    st = { ...st, labDefi: { ...d, chips, chipSearched: [...d.chipSearched, key], blessedSearch: blessed } }
    emit()
    let granted = 0
    for (let i = 0; i < count; i++) {
        const before = st.labDefi.grantedTickets.length
        grantRouletteTicket(CHIP_TICKET_VALUE, "casino")
        if (st.labDefi.grantedTickets.length > before) granted++
    }
    return granted
}

/** Consomme la prochaine bénédiction de COMBAT (à la prise d'une potion en combat). null si aucune. */
export function consumeBattleBlessing(): "eva" | "crit" | null {
    const d = st.labDefi
    if (d.battleBlessings.length === 0) return null
    const [first, ...rest] = d.battleBlessings
    st = { ...st, labDefi: { ...d, battleBlessings: rest } }
    emit()
    return first
}

/** Jeton de chance roulette en attente (sans le consommer) — lu avant de parier seul. */
export function peekRouletteLuck(): { kind: "luck25" | "luckMax"; cap: number } | null {
    return st.labDefi.rouletteLuck[0] ?? null
}
/** Consomme le prochain jeton de chance roulette. null si aucun. */
export function consumeRouletteLuck(): { kind: "luck25" | "luckMax"; cap: number } | null {
    const d = st.labDefi
    if (d.rouletteLuck.length === 0) return null
    const [first, ...rest] = d.rouletteLuck
    st = { ...st, labDefi: { ...d, rouletteLuck: rest } }
    emit()
    return first
}
/** Décompte un gain truqué du plafond du 1er jeton (récupération du prix de la potion). Quand le cap
 *  est épuisé, le jeton est consommé (la potion a fait son office). */
export function decrementRouletteLuck(netWon: number): void {
    const d = st.labDefi
    if (d.rouletteLuck.length === 0 || netWon <= 0) return
    const [first, ...rest] = d.rouletteLuck
    const remaining = first.cap - Math.floor(netWon)
    const luck = remaining > 0 ? [{ ...first, cap: remaining }, ...rest] : rest
    st = { ...st, labDefi: { ...d, rouletteLuck: luck } }
    emit()
}

/** Le carrousel d'explication de la génétique a-t-il déjà été montré ? (one-shot, post-capture). */
export function geneIntroSeen(): boolean { return st.labDefi.geneIntroSeen }
/** Marque le carrousel génétique comme vu (ne se rejouera plus). */
export function markGeneIntroSeen(): void {
    if (st.labDefi.geneIntroSeen) return
    st = { ...st, labDefi: { ...st.labDefi, geneIntroSeen: true } }
    emit()
}

/** ROULETTE MULTIJOUEUR — réclame le gain d'une manche UNE seule fois (idempotent, anti-double-crédit).
 *  Renvoie true si c'est la 1re réclamation (le client doit alors créditer ses reps), false si déjà fait.
 *  Persistant (save) → réconciliation robuste même après refresh / déconnexion en cours de manche. */
export function markRouletteClaimed(roundId: string): boolean {
    if (!roundId) return false
    const d = st.labDefi
    if (d.rouletteClaimed.includes(roundId)) return false
    const next = [...d.rouletteClaimed, roundId].slice(-ROULETTE_CLAIMED_MAX)
    st = { ...st, labDefi: { ...d, rouletteClaimed: next } }
    emit()
    return true
}

/** Joue le ticket GRATUIT du jour (valeur DAILY_TICKET_VALUE), HORS file de boss. Marque le jour
 *  consommé. 🤫 1er pari du joueur gagné d'office ; ensuite aléatoire. Gain = mise × 10. */
export function playDailyTicketSpin(betCase: number, today: string): CasinoTicketResult {
    if (runMode() === "run3") return { winningCase: -1, won: false, winAmount: 0, betValue: 0 } // casino fermé en run 3
    const d = st.labDefi
    const betValue = DAILY_TICKET_VALUE
    const firstBet = !d.casinoFirstBetDone
    const winningCase = firstBet ? betCase : Math.floor(Math.random() * CASINO_NUM_CASES)
    const won = winningCase === betCase
    const winAmount = won ? betValue * CASINO_WIN_MULT : 0
    const newReps = won ? Math.min(st.repsCap, st.reps + winAmount) : st.reps
    st = { ...st, reps: newReps, labDefi: { ...d, dailyTicketDate: today, casinoFirstBetDone: true } }
    emit()
    return { winningCase, won, winAmount, betValue }
}

/**
 * Joue le PROCHAIN ticket de BOSS de la file (FIFO), mise sur UNE case. Indépendant du casino du labo :
 * ne touche NI le cumul Tonytony, NI la série, NI la banqueroute, NI le motif. 🤫 Le TOUT PREMIER
 * pari du joueur est gagné d'office (case gagnante = sa mise) ; ensuite, aléatoire. Gain = mise × 10.
 * Renvoie un résultat à winningCase=-1/betValue=0 si aucun ticket en attente (no-op).
 */
export function playTicketSpin(betCase: number): CasinoTicketResult {
    if (runMode() === "run3") return { winningCase: -1, won: false, winAmount: 0, betValue: 0 } // casino fermé en run 3
    const d = st.labDefi
    const betValue = d.grantedTickets[0]
    if (betValue === undefined) return { winningCase: -1, won: false, winAmount: 0, betValue: 0 }
    const firstBet = !d.casinoFirstBetDone
    const winningCase = firstBet ? betCase : Math.floor(Math.random() * CASINO_NUM_CASES)
    const won = winningCase === betCase
    const winAmount = won ? betValue * CASINO_WIN_MULT : 0
    const newReps = won ? Math.min(st.repsCap, st.reps + winAmount) : st.reps
    st = { ...st, reps: newReps, labDefi: { ...d, grantedTickets: d.grantedTickets.slice(1), casinoFirstBetDone: true } }
    emit()
    return { winningCase, won, winAmount, betValue }
}

/** PILIER DU CASINO selon le monde : Tonytony (run 1) ou son alter-ego MEROREM (run 2). Le cumul casino
 *  (labDefi, PAR MONDE : remis à zéro en NG+) débloque l'un OU l'autre aux MÊMES paliers (1000 / 5000).
 *  Source unique partagée par le don, le shiny et l'UI (labo/croupier/roulette) → jamais de nom incohérent. */
export function casinoPillar(): { species: string; name: string; emoji: string } {
    return getActiveWorld() === "ngplus"
        ? { species: MEROREM_SPECIES, name: "Merorem", emoji: "🦠" }
        : { species: TONYTONY_SPECIES, name: "Tonytony", emoji: "🥚" }
}

/**
 * Remet le PILIER du casino (Tonytony run 1 / Merorem run 2, one-shot) si le cumul casino atteint la cible.
 * Crée l'instance niveau TONYTONY_LEVEL, l'ajoute (équipe si place, sinon PC) + Pokédex, pose le flag.
 * Renvoie le placement, ou null si pas éligible (déjà réclamé / cumul insuffisant).
 */
export function grantTonytony(): "team" | "pc" | null {
    const d = st.labDefi
    if (d.tonytonyClaimed || d.casinoTotalWon < TONYTONY_TARGET) return null
    const species = casinoPillar().species // run 2 → Merorem, sinon Tonytony
    const mon = createMonInstance(species, TONYTONY_LEVEL, { owned: true })
    st = { ...st, labDefi: { ...d, tonytonyClaimed: true } } // pose le flag AVANT (anti double-don)
    const where = addCaught(mon) // gère équipe pleine → PC + estampille l'ownership ; emit()
    markCaught(species); markCaughtThisRun(species) // entrée Pokédex (+ « ce run »)
    return where
}

/**
 * CAPSTONE 5000 : rend SHINY le pilier du casino (Tonytony run 1 / Merorem run 2, one-shot). Le retrouve
 * dans l'équipe puis le PC ; s'il n'en a plus (relâché/échangé), en redonne un SHINY. Renvoie où, ou null.
 */
export function makeTonytonyShiny(): "team" | "pc" | "new" | null {
    const d = st.labDefi
    // Invariant : on ne peut rendre shiny QUE si le pilier de base a déjà été réclamé (1000⚡). L'UI le garantit
    // déjà, mais on le verrouille aussi ici (défense en profondeur : pas de shiny gratuit sans le don de base).
    if (d.tonytonyShiny || !d.tonytonyClaimed || d.casinoTotalWon < TONYTONY_SHINY_TARGET) return null
    const species = casinoPillar().species // run 2 → Merorem, sinon Tonytony
    const ti = st.team.findIndex((m) => m.speciesId === species)
    if (ti >= 0) {
        const team = st.team.slice(); team[ti] = { ...team[ti], shiny: true }
        st = { ...st, team, labDefi: { ...d, tonytonyShiny: true } }
        emit(); return "team"
    }
    const pi = st.pc.findIndex((m) => m.speciesId === species)
    if (pi >= 0) {
        const pc = st.pc.slice(); pc[pi] = { ...pc[pi], shiny: true }
        st = { ...st, pc, labDefi: { ...d, tonytonyShiny: true } }
        emit(); return "pc"
    }
    // Plus de pilier → on en redonne un SHINY.
    const mon = createMonInstance(species, TONYTONY_LEVEL, { owned: true })
    mon.shiny = true
    st = { ...st, labDefi: { ...d, tonytonyShiny: true } }
    addCaught(mon)
    markCaught(species); markCaughtThisRun(species)
    return "new"
}

/** Soin complet de l'équipe (Centre Daemon) : PV max, statut effacé, PP refaits. */
export function healAllTeam() {
    st = {
        ...st,
        team: st.team.map((m): MonInstance => {
            const sp = getSpecies(m.speciesId)
            const max = sp ? fullStats(m, sp).hp : m.currentHp
            return {
                ...m,
                currentHp: max,
                status: "NONE",
                statusCounter: 0,
                moves: m.moves.map((mv) => ({ ...mv, pp: mv.ppMax })),
            }
        }),
    }
    bumpStat("heals") // STAT : soin d'équipe (Centre Pokémon / soin complet)
    emit()
}

/**
 * Réordonne les attaques d'un Daemon (équipe OU PC) : déplace le slot `from` vers `to`.
 * L'ordre des slots = l'ordre affiché en combat (le curseur démarre en haut). Persistance par l'appelant.
 */
export function reorderMove(uid: string, from: number, to: number) {
    const applyTo = (list: MonInstance[]): MonInstance[] | null => {
        const idx = list.findIndex((m) => m.uid === uid)
        if (idx < 0) return null
        const mon = list[idx]
        if (from < 0 || to < 0 || from >= mon.moves.length || to >= mon.moves.length || from === to) return null
        const moves = [...mon.moves]
        const [moved] = moves.splice(from, 1)
        moves.splice(to, 0, moved)
        const next = [...list]
        next[idx] = { ...mon, moves }
        return next
    }
    const t = applyTo(st.team)
    if (t) { st = { ...st, team: t }; emit(); return }
    const p = applyTo(st.pc)
    if (p) { st = { ...st, pc: p }; emit() }
}

// ============================================================
// PC / boîtes — dépôt, retrait, renommage, soin hors combat
// ============================================================

/** Dépose un Daemon de l'équipe vers le PC. Refuse de vider entièrement l'équipe. */
export function depositToPc(uid: string): { ok: boolean; reason?: "introuvable" | "last" } {
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    if (st.team.length <= 1) return { ok: false, reason: "last" }
    const mon = st.team[idx]
    st = { ...st, team: st.team.filter((_, i) => i !== idx), pc: [...st.pc, mon] }
    emit()
    return { ok: true }
}

/** Retire un Daemon du PC vers l'équipe. Refuse si l'équipe est pleine. */
export function withdrawFromPc(uid: string): { ok: boolean; reason?: "introuvable" | "full" } {
    if (st.team.length >= TEAM_MAX) return { ok: false, reason: "full" }
    const idx = st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    const mon = st.pc[idx]
    st = { ...st, pc: st.pc.filter((_, i) => i !== idx), team: [...st.team, mon] }
    emit()
    return { ok: true }
}

/** RELÂCHE définitivement un Daemon de la RÉSERVE (PC) — retiré du jeu, ne revient pas. On ne relâche QUE depuis
 *  le PC (l'équipe n'est jamais concernée) → aucun risque de se retrouver sans Daemon. */
export function releaseFromPc(uid: string): { ok: boolean; reason?: "introuvable" } {
    const idx = st.pc.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    st = { ...st, pc: st.pc.filter((_, i) => i !== idx) }
    emit()
    return { ok: true }
}

/** Échange la position de deux Daemons de l'équipe (réordonnancement manuel). */
export function swapTeam(uidA: string, uidB: string): boolean {
    if (uidA === uidB) return false
    const i = st.team.findIndex((m) => m.uid === uidA)
    const j = st.team.findIndex((m) => m.uid === uidB)
    if (i < 0 || j < 0) return false
    const team = [...st.team]
    ;[team[i], team[j]] = [team[j], team[i]]
    st = { ...st, team }
    emit()
    return true
}

/** Renomme un Daemon (équipe ou PC). Vide → réinitialise au nom d'espèce. Max 12 car. */
export function renameDaemon(uid: string, nickname: string) {
    const target = st.team.find((m) => m.uid === uid) ?? st.pc.find((m) => m.uid === uid)
    if (target?.traded) return // surnom VERROUILLÉ sur un Daemon reçu en échange (cohérent avec l'UI + le flag traded)
    const nn = nickname.trim().slice(0, 12)
    const apply = (m: MonInstance): MonInstance => (m.uid === uid ? { ...m, nickname: nn.length ? nn : undefined } : m)
    st = { ...st, team: st.team.map(apply), pc: st.pc.map(apply) }
    emit()
}

/** Utilise un objet de soin sur un Daemon de l'équipe (hors combat). Renvoie false si inutile.
 *  NB : nom volontairement SANS préfixe « use » (ce n'est pas un hook React). */
export function healTeamMember(uid: string, itemId: string): boolean {
    const item = getItem(itemId)
    if (!item || item.category !== "HEAL") return false
    if ((st.items[itemId] ?? 0) <= 0) return false
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return false
    const m = st.team[idx]
    if (m.currentHp <= 0) return false // une Potion ne ranime pas un Daemon K.O.
    const sp = getSpecies(m.speciesId)
    const max = sp ? fullStats(m, sp).hp : m.currentHp
    if (m.currentHp >= max) return false // déjà au max
    const heal = item.healHp && item.healHp > 0 ? item.healHp : max
    const team = st.team.slice()
    team[idx] = { ...m, currentHp: Math.min(max, m.currentHp + heal) }
    st = { ...st, team, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    bumpStat("heals"); bumpStat("potionsUsed") // STAT : soin par potion hors combat (compte comme soin ET potion)
    emit()
    return true
}

/** RAPPEL (hors combat) : ranime un Daemon K.O. de l'équipe à une fraction de ses PV max. Renvoie false si inutile. */
export function reviveTeamMember(uid: string, itemId: string): boolean {
    const item = getItem(itemId)
    if (!item || item.category !== "REVIVE") return false
    if ((st.items[itemId] ?? 0) <= 0) return false
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return false
    const m = st.team[idx]
    if (m.currentHp > 0) return false // pas K.O. → un Rappel n'a aucun effet
    const sp = getSpecies(m.speciesId)
    const max = sp ? fullStats(m, sp).hp : 1
    const team = st.team.slice()
    team[idx] = { ...m, currentHp: Math.max(1, Math.floor(max * (item.reviveFrac ?? 0.1))) }
    st = { ...st, team, items: { ...st.items, [itemId]: st.items[itemId] - 1 } }
    bumpStat("heals")
    emit()
    return true
}

/** Équipe un objet tenu (depuis le sac) sur un Daemon (équipe ou PC). L'éventuel objet déjà tenu
 *  retourne au sac. Refuse si pas en stock, ou si c'est un objet SIGNATURE d'une autre espèce. */
export function equipHeldItem(uid: string, itemId: string): boolean {
    if (!isHeldItem(itemId) || (st.items[itemId] ?? 0) <= 0) return false
    const target = st.team.find((m) => m.uid === uid) ?? st.pc.find((m) => m.uid === uid)
    if (!target) return false
    const it = getHeldItem(itemId)
    // Verrou ESPÈCE (signature) : species peut être un tableau (lignée à stade final ajouté, ex. Aquilothan/Aquilord).
    if (it?.species) {
        const ok = Array.isArray(it.species) ? it.species.includes(target.speciesId) : it.species === target.speciesId
        if (!ok) return false
    }
    const items = { ...st.items, [itemId]: st.items[itemId] - 1 }
    if (target.heldItem) items[target.heldItem] = (items[target.heldItem] ?? 0) + 1 // l'ancien objet revient au sac
    const apply = (m: MonInstance): MonInstance => (m.uid === uid ? { ...m, heldItem: itemId } : m)
    st = { ...st, team: st.team.map(apply), pc: st.pc.map(apply), items }
    emit()
    return true
}

/** Retire l'objet tenu d'un Daemon → il retourne au sac. Renvoie false si aucun objet tenu. */
export function unequipHeldItem(uid: string): boolean {
    const target = st.team.find((m) => m.uid === uid) ?? st.pc.find((m) => m.uid === uid)
    if (!target?.heldItem) return false
    const items = { ...st.items, [target.heldItem]: (st.items[target.heldItem] ?? 0) + 1 }
    const apply = (m: MonInstance): MonInstance => (m.uid === uid ? { ...m, heldItem: undefined } : m)
    st = { ...st, team: st.team.map(apply), pc: st.pc.map(apply), items }
    emit()
    return true
}

/**
 * ENTRAÎNEMENT SAIYAN : dépense 1 point de stat sur le Daemon (équipe ou PC).
 * Si la stat est PV, augmente aussi les PV courants du gain (pas de PV "manquants").
 */
export function allocateStatPoint(uid: string, stat: StatKey): boolean {
    const pools: ("team" | "pc")[] = ["team", "pc"]
    for (const pool of pools) {
        const arr = st[pool]
        const idx = arr.findIndex((m) => m.uid === uid)
        if (idx < 0) continue
        const m = arr[idx]
        if ((m.statPoints ?? 0) <= 0) return false
        const allocated = { ...(m.allocated ?? {}) }
        allocated[stat] = (allocated[stat] ?? 0) + 1
        const updated: MonInstance = {
            ...m,
            statPoints: (m.statPoints ?? 0) - 1,
            allocated,
            currentHp: stat === "hp" ? m.currentHp + SAIYAN_POINT_VALUE.hp : m.currentHp,
        }
        const next = arr.slice()
        next[idx] = updated
        st = { ...st, [pool]: next }
        emit()
        return true
    }
    return false
}

/**
 * Achète et enseigne une CT à un Daemon (équipe ou PC). Paie en reps.
 * - slot libre → apprise directement ;
 * - 4 slots pleins → mise EN ATTENTE (pendingMoves) → l'écran d'apprentissage gère le remplacement.
 */
export function teachCt(uid: string, ctId: string): { ok: boolean; reason?: "introuvable" | "locked" | "incompatible" | "known" | "reps"; queued?: boolean } {
    const ct = getCt(ctId)
    if (!ct) return { ok: false, reason: "introuvable" }
    // CT possédée (cadeau) → gratuite. Sinon il faut qu'elle soit en vente (badges).
    const owned = st.ownedCts.includes(ctId)
    if (!owned && !purchasableCts(st.badges, st.boughtCts).some((c) => c.id === ctId)) return { ok: false, reason: "locked" }
    const pools: ("team" | "pc")[] = ["team", "pc"]
    for (const pool of pools) {
        const arr = st[pool]
        const idx = arr.findIndex((m) => m.uid === uid)
        if (idx < 0) continue
        const m = arr[idx]
        const sp = getSpecies(m.speciesId)
        if (!sp || !canLearnCt(sp, ct)) return { ok: false, reason: "incompatible" }
        if (m.moves.some((s) => s.moveId === ct.moveId) || m.pendingMoves?.includes(ct.moveId)) return { ok: false, reason: "known" }
        const cost = owned ? 0 : ct.price // CT cadeau = gratuite
        if (st.reps < cost) return { ok: false, reason: "reps" }
        const free = m.moves.length < 4
        const pp = getMove(ct.moveId)?.pp ?? 5
        const updated: MonInstance = free
            ? { ...m, moves: [...m.moves, { moveId: ct.moveId, pp, ppMax: pp }] }
            : { ...m, pendingMoves: [...(m.pendingMoves ?? []), ct.moveId] }
        const next = arr.slice()
        next[idx] = updated
        // CT cadeau : consommée à l'apprentissage (une seule fois, puis c'est fini).
        const ownedAfter = owned ? st.ownedCts.filter((id) => id !== ctId) : st.ownedCts
        // ACHAT UNIQUE (toute CT) : on enregistre l'achat → retirée du shop pour de bon.
        const boughtAfter = owned ? st.boughtCts : [...st.boughtCts, ctId]
        st = { ...st, reps: st.reps - cost, [pool]: next, ownedCts: ownedAfter, boughtCts: boughtAfter }
        trackBallLockSpend(cost) // VŒU DU GÉNIE : achat de CT = dépense (hors spendReps)
        emit()
        return { ok: true, queued: !free }
    }
    return { ok: false, reason: "introuvable" }
}

// ===== MAÎTRE DES CAPACITÉS (étage du Centre) — réapprendre une attaque du learnset contre reps (prix croissant) =====

/** Attaques du learnset RÉAPPRENABLES par ce Daemon : palier atteint (level ≥), pas déjà connues ni en attente. */
export function relearnableMoves(mon: MonInstance): string[] {
    const sp = getSpecies(mon.speciesId)
    if (!sp) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const l of sp.learnset) {
        if (mon.level < l.level || seen.has(l.moveId)) continue
        seen.add(l.moveId)
        if (mon.moves.some((s) => s.moveId === l.moveId)) continue
        if (mon.pendingMoves?.includes(l.moveId)) continue
        out.push(l.moveId)
    }
    return out
}

/** Prix (reps) du PROCHAIN réapprentissage — croissant : 200, puis ×1.5 par usage (200, 300, 450, 675, …). */
export function moveReminderPrice(): number { return Math.round(200 * 1.5 ** st.moveReminderUses) }
export function moveReminderUsesCount(): number { return st.moveReminderUses }

/**
 * Fait RÉAPPRENDRE une attaque du learnset à un Daemon de l'ÉQUIPE, contre reps (prix croissant, débité ICI).
 * < 4 capacités → ajout direct ; 4 capacités → il faut fournir `forgetSlot` (0-3) = la capacité à oublier.
 * Le prix n'est débité (et le compteur incrémenté) QUE si l'apprentissage aboutit (pas de débit à vide).
 */
export function relearnMove(uid: string, moveId: string, forgetSlot?: number | null): { ok: boolean; reason?: "introuvable" | "invalide" | "reps" | "slot" } {
    const idx = st.team.findIndex((m) => m.uid === uid)
    if (idx < 0) return { ok: false, reason: "introuvable" }
    const m = st.team[idx]
    if (!relearnableMoves(m).includes(moveId)) return { ok: false, reason: "invalide" }
    const price = moveReminderPrice()
    if (st.reps < price) return { ok: false, reason: "reps" }
    const pp = getMove(moveId)?.pp ?? 5
    let moves: typeof m.moves
    if (m.moves.length < 4) {
        moves = [...m.moves, { moveId, pp, ppMax: pp }]
    } else {
        if (forgetSlot == null || forgetSlot < 0 || forgetSlot > 3) return { ok: false, reason: "slot" }
        moves = m.moves.map((s, i) => (i === forgetSlot ? { moveId, pp, ppMax: pp } : s))
    }
    const team = st.team.slice()
    team[idx] = { ...m, moves }
    st = { ...st, reps: st.reps - price, team, moveReminderUses: st.moveReminderUses + 1 }
    trackBallLockSpend(price) // VŒU DU GÉNIE : ré-apprentissage d'attaque = dépense
    emit()
    return { ok: true }
}

/**
 * SAIYAN — applique les points calculés (règle amende/quota) aux Daemons :
 * ajoute statPoints, remet à zéro pendingSaiyanLevels, fixe lastLevelUpAt=today.
 * (Appelé par processSaiyanPoints côté bridge, après l'appel serveur.)
 */
export function applySaiyanResults(results: { uid: string; points: number }[], today: string) {
    if (!today || results.length === 0) return
    const byUid = new Map(results.map((r) => [r.uid, r.points]))
    const patch = (m: MonInstance): MonInstance => {
        if (!byUid.has(m.uid) || !(m.pendingSaiyanLevels ?? 0)) return m
        return {
            ...m,
            statPoints: (m.statPoints ?? 0) + (byUid.get(m.uid) ?? 0),
            pendingSaiyanLevels: undefined,
            lastLevelUpAt: today,
        }
    }
    st = { ...st, team: st.team.map(patch), pc: st.pc.map(patch) }
    emit()
}

/** Apprentissage en attente : un Daemon veut apprendre une attaque mais a 4 slots. */
export interface PendingLearn { uid: string; speciesId: string; name: string; moveId: string; moves: MoveSlot[] }

/** Liste des apprentissages en attente sur l'équipe (un par couple Daemon/attaque). */
export function pendingLearns(): PendingLearn[] {
    const out: PendingLearn[] = []
    for (const m of st.team) {
        if (!m.pendingMoves?.length) continue
        const name = m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId
        for (const moveId of m.pendingMoves) out.push({ uid: m.uid, speciesId: m.speciesId, name, moveId, moves: m.moves })
    }
    return out
}

/** Résout un apprentissage : slotIndex = capacité à remplacer, ou null = renoncer. */
export function resolveLearn(uid: string, moveId: string, slotIndex: number | null) {
    st = {
        ...st,
        team: st.team.map((m) => {
            if (m.uid !== uid) return m
            const pending = (m.pendingMoves ?? []).filter((id) => id !== moveId)
            let moves = m.moves
            if (slotIndex !== null && slotIndex >= 0 && slotIndex < m.moves.length) {
                const pp = getMove(moveId)?.pp ?? 5
                moves = m.moves.map((s, i) => (i === slotIndex ? { moveId, pp, ppMax: pp } : s))
            }
            return { ...m, moves, pendingMoves: pending.length ? pending : undefined }
        }),
    }
    emit()
}

export function usePlayer(): PlayerState {
    return useSyncExternalStore(subscribePlayer, getPlayer, getPlayer)
}
