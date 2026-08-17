"use client"

// Nexus II — page de dev client.
//
// Branche le D-pad du GameBoyShell au store Zustand : chaque pression appelle
// useGameStore.move(direction), qui calcule le nouveau player state via le
// moteur pur tryMove(). Le MapView ré-render automatiquement.
//
// Pas encore : interaction A/B (NPCs, dialogues), START (menu), SELECT.

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import GameBoyShell, { type GbButton } from "./GameBoyShell"
import MapView from "./MapView"
import BattleScreen from "./battle/BattleScreen"
import BattleBoundary from "./battle/BattleBoundary"
import { useCasinoPresence } from "@/lib/gamebook/yellow/multiplayer/useCasinoPresence"
import { useCasinoChallenge, type BattleStart } from "@/lib/gamebook/yellow/multiplayer/useCasinoChallenge"
import { useCasinoChat } from "@/lib/gamebook/yellow/multiplayer/useCasinoChat"
import { useCasinoTrade } from "@/lib/gamebook/yellow/multiplayer/useCasinoTrade"
import { useCasinoCtTrade } from "@/lib/gamebook/yellow/multiplayer/useCasinoCtTrade"
import { useCasinoBattle, type FusionPvpHooks } from "@/lib/gamebook/yellow/multiplayer/useCasinoBattle"
import TradeAnimation from "./TradeAnimation"
import { FusionPreviewCard } from "./FusionPreviewCard"
import { FusionPickerView } from "./FusionPickerView"
import { FusionCompareView } from "./FusionCompareView"
import { usePvpCtx, pvpForfeit, championToInstance } from "@/lib/gamebook/yellow/store/battleStore"
import EvolutionScreen from "./battle/EvolutionScreen"
import MoveLearnScreen from "./battle/MoveLearnScreen"
import HallOfFame from "./HallOfFame"
import HallOfFameViewer from "./HallOfFameViewer"
import ArenaHallOfFamePanel from "./ArenaHallOfFamePanel"
import RunScoreboardPanel from "./RunScoreboardPanel"
import RunBadgesPanel from "./RunBadgesPanel"
import FusionEpiloguePanel, { type EpilogueRosterMon } from "./FusionEpiloguePanel"
import RustyLampModal from "./RustyLampModal"
import GeniePanel from "./GeniePanel"
import DexEntryScreen from "./battle/DexEntryScreen"
import IntroCinematic from "./IntroCinematic"
import Run3IntroCinematic from "./Run3IntroCinematic"
import GuidePanel from "./GuidePanel"
import ArenaInfoPanel from "./ArenaInfoPanel"
import LibraryPanel from "./LibraryPanel"
import MovesPanel from "./MovesPanel"
import AdvisorPanel from "./AdvisorPanel"
import DaemomaniaquePanel from "./DaemomaniaquePanel"
import LabPanel from "./LabPanel"
import MoveReminderPanel from "./MoveReminderPanel"
import CombatShopModal from "./CombatShopModal"
import DailyTicketModal from "./DailyTicketModal"
import DiablesRougesQuiz, { diablesRougesAvailable } from "./DiablesRougesQuiz"
import GlandEvent, { type GlandScreen, GLAND_EVENT_DATE, GLAND_STEP_INTERVAL, GLAND_ENERGY_STOLEN, GLAND_TICKET_COUNT, GLAND_TICKET_VALUE, glandCartonDone, glandJusticeDone, markGlandCartonDone, markGlandJusticeDone } from "./GlandEvent"
import HeldItemModal from "./HeldItemModal"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { SHINY_FILTER } from "@/lib/gamebook/yellow/data/shinyFx"
import ParkSignPanel from "./ParkSignPanel"
import PosterPanel from "./PosterPanel"
import { useGameStore, setCurrentNickname, DEFAULT_SPAWN, restoreFusionGauntletFromCarry, reorderFusionGauntletTeam, reorderFusionGauntletMove } from "@/lib/gamebook/yellow/store/gameStore"
import { getGauntletTeam } from "@/lib/gamebook/yellow/store/fusionGauntlet"
import { YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { YELLOW_MAPS, CENDREVILLE_SPAWN } from "@/lib/gamebook/yellow/maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { useBattle, useEvolutions, clearEvolutions, useChampionRun, useArenaRun, clearChampion, useWhiteout, clearWhiteout, useSbireWin, clearSbireWin, useAceWin, clearAceWin, useBadgeAwarded, clearBadgeAwarded, useRematchReward, clearRematchReward, useNewDexEntry, clearNewDexEntry, dispatchBattleInput, endBattle, getSbireRewardMsg, getAceRewardMsg, getAceLossTaunt, getNemesisLossTaunt, getGiftCtMove, startTrainerBattle, startFusionTrialBattle, useChainRematch, clearChainRematch, cancelEvolution, usePendingLearn, clearPendingLearn, useDuelResult, clearDuelResult, useFrontierResult, clearFrontierResult, getBattleEnergy, resumeBattleFromStorage, useStoneReward, clearStoneReward, useLavapetitTeaser, clearLavapetitTeaser, useFusioBallOffer, clearFusioBallOffer, useLoopOffer, clearLoopOffer, useFusionParentReward, clearFusionParentReward, useFusionSacre, clearFusionSacre, useMegamonarxReveal, clearMegamonarxReveal, usePnj6TradeOffer, clearPnj6TradeOffer, useJustCaught, clearJustCaught, freezeTeam, useNgplusFinalPending, clearNgplusFinalPending, useNgplusFinalResult, clearNgplusFinalResult } from "@/lib/gamebook/yellow/store/battleStore"
import { useEncounterFxActive } from "@/lib/gamebook/yellow/store/encounterFxStore"
import { aceLoseLine } from "@/lib/gamebook/yellow/data/ace"
import { sbireExplanation } from "@/lib/gamebook/yellow/data/sbire"
import { duelWinLines, duelLossLines, duelDreamLines, DUEL_NEXUS_BALL_ID, DUEL_LOSS_CONSOLE_REPS, DUEL_GOD_NPC, DUEL_GOD_NAME, DUEL_DREAM_NPC, DUEL_DREAM_NAME } from "@/lib/gamebook/yellow/data/duel"
import { SPAG_LAVAPETIT_TEASER_LINES, SPAG_LAVAPETIT_CAUGHT_LINES } from "@/lib/gamebook/yellow/data/labDialogues"
import { loadYellowSave, initAutosave, persistYellowSave, persistYellowSaveNow, processSaiyanPoints, resetYellowChapter, startNewGamePlus, completeNewGamePlus, abandonNewGamePlus, NGPLUS_ABANDON_LIMIT, startRun3, completeRun3, startReplay, exitReplay, startNewProfileFromRun1, switchProfile, getAltProfileSummaries, profileCount, MAX_ALT_PROFILES, startGenesisProfile } from "@/lib/gamebook/yellow/store/saveManager"
import { FRONTIER_LS_KEY, RUN2_SCORES_LS_KEY } from "@/lib/gamebook/yellow/storage/sessionKeys"
import { customStarterSpeciesId, type StoredCustomDaemon, type CustomSpec } from "@/lib/gamebook/yellow/create/customSpecies"
import { getPlayer, setTeam, usePlayer, useActiveWorld, getActiveWorld, effectiveRunWorld, addItem, spendReps, grantReps, grantBonusEnergyUncapped, consumeItem, setCurrentPlayerId, setCurrentMapId, executeTrade, tradeCt, applyTradeEvolution, markIntroSeen, superPastaPrice, buySuperPasta, depositToPc, withdrawFromPc, releaseFromPc, renameDaemon, healTeamMember, reviveTeamMember, addCaught, healAllTeam, allocateStatPoint, teachCt, swapTeam, favoriteDaemon, favoriteMove, resolveLearn, consumeGiftMessage, reorderMove, evolvePantheonWithStone, resetLigueProgress, duelWonToday, recordDuelWin, duelPlayedToday, recordDuelMatch, recordMirrorWinHigherLevel, grantCt, markSpagRouletteSeen, markGeneIntroSeen, ticketCount, ensureDailyChips, searchChipTile, claimSpagWelcomeTickets, claimSpagStepGift, spagStepGiftDone, bumpPlaytime, grantRouletteTicket, recordDomeChampionship, recordDomeResult, recordStatMax, setGameMode, ensureModeStartGrant, consumeModeRechargeEvent, getReplayRun, setFusionRoster, recordFusionCreated, markTrainerDefeated, clearTrainerMarker, recordPlayerTrade, getPotionBuysToday, recordPotionBuy, getJcEnergyBuysToday } from "@/lib/gamebook/yellow/store/playerStore"
import { freezeChampionTeam } from "@/lib/gamebook/yellow/admin/progressionRecipe"
import { isDomeChampion, isMasterCtClaimed } from "@/lib/gamebook/yellow/store/playerStore"
import DomeMasters from "./DomeMasters"
import EspionPanel from "./EspionPanel"
import TrocPanel from "./TrocPanel"
import MasterCtChoice from "./MasterCtChoice"
import { computeRunScores, computeReplayScore, leaderboardFactors, formatDuration, type RunScores } from "@/lib/gamebook/yellow/score/runScore"
import { run3Score, run3MaxScore, run3EnergyScore } from "@/lib/gamebook/yellow/data/run3Score"
import { PANTHEON_STONE_EVOS } from "@/lib/gamebook/yellow/data/gekroc"
import { evolveMagmatorWithChen, applyAcceptedGenieWishEffects, setCustomDaemonSprites, resolveAbundanceCurse, isAbundanceCurseActive, abundanceFreeItemAvailableToday, takeFreeShopItem } from "@/lib/gamebook/yellow/store/playerStore"
import { ARENA_TICKET_VALUE, STEP_GIFT_DATE, STEP_GIFT_THRESHOLD } from "@/lib/gamebook/yellow/data/labDefis"
import { purchasableCts, getCt, canLearnCt } from "@/lib/gamebook/yellow/data/cts"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { computeFusion } from "@/lib/gamebook/yellow/data/fusionSpecies"
import { buildFusion, disposeFusion, fusionParentFromInstance } from "@/lib/gamebook/yellow/data/fusionMon"
import { prefetchFusionSprites } from "@/lib/gamebook/yellow/data/fusionSpriteClient"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"
import { buildFusionTrialEnemy } from "@/lib/gamebook/yellow/data/fusionTrial"
import { AUTEL_VISITED_MARKER, historyFusions } from "@/lib/gamebook/yellow/data/fusiodex"
import { EPILOGUE_INTRO_LINES, fusionEpilogueQuests } from "@/lib/gamebook/yellow/data/fusionEpilogue"
import { shopPrice, BOURSE_INTRO_LINES, BOURSE_SHOP_LINES, BOURSE_INTRO_MARKER, BOURSE_SHOP_MARKER } from "@/lib/gamebook/yellow/data/shopPricing"
import { getPokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { LAMP_ITEM_ID, LAMP_RUBBED_MARKER } from "@/lib/gamebook/yellow/data/genieLamp"
import { makeCrocavernGift, PNJ6_TRADE_DONE_MARKER, PNJ6_NAME } from "@/lib/gamebook/yellow/data/pnj6"
import { FUSIOBALL_OWED_MARKER, FUSIOBALL_REOFFER_REPS, FUSIOBALL_REOFFER_PREFIX } from "@/lib/gamebook/yellow/data/fusionLeague"
import { useRun, getRun, startTowerRun, startRun, applyWinFromBattle, applyLossFromBattle, quitRun, endRun, setDraftedTeam, getDraftedTeam, setRunRaw } from "@/lib/gamebook/yellow/frontier/runStore"
import type { FrontierRunState } from "@/lib/gamebook/yellow/frontier/run"
import { postRecordRun, postReplaySpend, fetchFrontierProfile, type FrontierProfile } from "@/lib/gamebook/yellow/frontier/frontierApi"
import { replayCost } from "@/lib/gamebook/yellow/data/replayCost"
import { ctRewardOptionsForTeam, opponentMoveIds } from "@/lib/gamebook/yellow/frontier/rewards"
import { generateRentalPool, buildDraftTeam, type RentalCandidate } from "@/lib/gamebook/yellow/frontier/factory"
import { resolveFrontierLevel, JC_PER_WIN, JC_BOSS_MULT, BOSS_EVERY, frontierEnergyRefund, type OpponentSpec, type LevelRule } from "@/lib/gamebook/yellow/frontier/engine"
import { createDome, advanceDome, playerOpponent, aiLeadIndex, DOME_ROUNDS, type DomeState } from "@/lib/gamebook/yellow/frontier/dome"
import { DOME_BUDGETS, DOME_TITLES, maxUnlockedTier, distributeDomeTraining, roundBudget } from "@/lib/gamebook/yellow/frontier/domeBudgets"
import { DOME_TIERS, isDanTier, type DomeTier } from "@/lib/gamebook/yellow/frontier/domeTypes"
import { DOME_BLINDS, clampBet, domeEnergyRefund, domeJcReward, domeFinalPlacement } from "@/lib/gamebook/yellow/frontier/domeEconomy"
import { Rng } from "@/lib/gamebook/yellow/battle/rng"

// ZONE DE COMBAT — convertit les specs d'adversaires en instances de combat. `training` (Dôme-only) = budget
// EV/Saiyan du tier appliqué à chaque ennemi (Tour/Usine appellent sans → coquilles nues, inchangées).
function buildFrontierEnemies(opponent: OpponentSpec[], training?: { ev: number; saiyan: number }) {
    return opponent.map((o) => {
        // Équipes DÉSIGNÉES (Voie du Maître) : moveset/shiny imposés ; sinon undefined → learnset/non-shiny (historique).
        const base = { owned: false, moveIds: o.moveIds, shiny: o.shiny }
        let mon: MonInstance
        if (!training || (training.ev <= 0 && training.saiyan <= 0)) {
            mon = createMonInstance(o.speciesId, o.level, base)
        } else {
            const sp = getSpecies(o.speciesId)
            const t = sp ? distributeDomeTraining(sp.baseStats, training.ev, training.saiyan) : { ev: {}, allocated: {} }
            mon = createMonInstance(o.speciesId, o.level, { ...base, ev: t.ev, allocated: t.allocated })
        }
        if (o.heldItemId) mon.heldItem = o.heldItemId // objet tenu de l'équipe désignée (posé après création)
        return mon
    })
}
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies, isCustomSpeciesId } from "@/lib/gamebook/yellow/data/species"
import { ITEMS, getItem } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import { attackCost, effectiveQuota } from "@/lib/gamebook/yellow/data/combatCostConfig"
import { SAIYAN_POINT_VALUE } from "@/lib/gamebook/yellow/data/saiyanConfig"
import { ivTier, ivTotal, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, topEvStats, evTotalCap, EV_TOTAL_CAP, EV_STAT_CAP, evStatBonus, EV_YIELD_PER_WIN } from "@/lib/gamebook/yellow/data/evConfig"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import type { MonInstance, SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import { usePlayerArena, type ArenaOpponent } from "@/lib/gamebook/yellow/multiplayer/usePlayerArena"
import { useRun2Ghosts, RUN2_GHOST_TRAINER_PREFIX, type Run2Ghost } from "@/lib/gamebook/yellow/multiplayer/useRun2Ghosts"
import { buildHubTeam, buildMirrorTeam, registerRegistryCustoms, type ArenaMode } from "@/lib/gamebook/yellow/data/playerArena"
import ArenaChallengeModal from "./ArenaChallengeModal"
import DomeBracket from "./DomeBracket"
import GeneIntroCarousel from "./GeneIntroCarousel"
import RouletteCasinoModal from "./roulette/RouletteCasinoModal"
import RouletteMultiTable from "./roulette/RouletteMultiTable"
import CroupierPanel from "./CroupierPanel"
import BarmanPanel from "./BarmanPanel"
import BlackjackPanel from "./BlackjackPanel"
import PokerPanel from "./PokerPanel"
import SoloPokerPanel from "./SoloPokerPanel"
import DailyPokerPanel from "./DailyPokerPanel"
import RacePanel from "./RacePanel"
import RaceView, { type RaceCfg, type RaceInput } from "./RaceView"
import { type Racer } from "@/lib/gamebook/yellow/race/engine"
import DaemonCreator from "./create/DaemonCreator"

// ============================================================
// ZONE DE COMBAT — REPRISE DE SÉRIE au refresh (anti-abandon)
// ------------------------------------------------------------
// Le combat #8 (battleStore) EXCLUT volontairement les séries Frontier. On persiste donc ICI la
// SÉRIE elle-même (Tour/Usine: run + équipe louée ; Dôme: bracket) dans un instantané localStorage
// dédié, repris au boot. v1 = on ne reprend PAS le combat de vague en cours (on retombe au début de
// la vague courante via l'effet de lancement) — bien plus sûr. Fail-safe total comme #8.
type DomeSnap = { state: DomeState; rule: LevelRule; tier: DomeTier; bet: number; seed: number; jc: number; energyAccrued: number }
interface FrontierSnap {
    v: 1
    ts: number
    run: FrontierRunState | null
    draftedTeam: MonInstance[] | null
    dome: DomeSnap | null
    tourChoice: boolean
    usineCt: string[] | null
}
// Clés partagées avec storage/sessionKeys (source unique : un reset / le générateur de progression
// doit pouvoir purger ces reliquats de session sans redéclarer les chaînes).
// RUN2_SCORES_LS_KEY = snapshot des 5 scores figé à la clôture du run 2 (recap perso, relisible après
// le run 2 / en run 3, alors que l'état live ne les calcule plus). Client-only, zéro impact sur la save.
function readRun2Snapshot(): RunScores | null {
    try { const raw = window.localStorage.getItem(RUN2_SCORES_LS_KEY); return raw ? (JSON.parse(raw) as RunScores) : null } catch { return null }
}
const FRONTIER_LS_MAX_AGE_MS = 24 * 3600 * 1000

function frontierActive(run: FrontierRunState | null, dome: DomeSnap | null): boolean {
    return (run?.status === "active") || (dome?.state.status === "active")
}
/** Toutes les espèces référencées sont-elles résolubles ? (garde-fou de relecture, comme #8). */
function frontierSpeciesOk(snap: FrontierSnap): boolean {
    const ids: string[] = []
    if (snap.run) ids.push(...snap.run.opponent.map((o) => o.speciesId))
    if (snap.draftedTeam) ids.push(...snap.draftedTeam.map((m) => m.speciesId))
    if (snap.dome) for (const e of snap.dome.state.entrants) ids.push(...e.team.map((o) => o.speciesId))
    return ids.every((id) => !!getSpecies(id))
}
function writeFrontierSnap(snap: FrontierSnap): void {
    if (typeof window === "undefined") return
    try {
        if (!frontierActive(snap.run, snap.dome)) { window.localStorage.removeItem(FRONTIER_LS_KEY); return }
        window.localStorage.setItem(FRONTIER_LS_KEY, JSON.stringify(snap))
    } catch { /* quota / sérialisation : on ignore */ }
}
function clearFrontierSnap(): void {
    if (typeof window === "undefined") return
    try { window.localStorage.removeItem(FRONTIER_LS_KEY) } catch { /* ignore */ }
}
function readFrontierSnap(): FrontierSnap | null {
    if (typeof window === "undefined") return null
    let raw: string | null = null
    try { raw = window.localStorage.getItem(FRONTIER_LS_KEY) } catch { return null }
    if (!raw) return null
    try {
        const o = JSON.parse(raw) as FrontierSnap
        if (o.v !== 1) { clearFrontierSnap(); return null }
        if (o.dome && !DOME_TIERS.includes(o.dome.tier)) o.dome.tier = "OR" // rétro-compat : vieux snap Dôme sans tier
        if (o.dome && typeof o.dome.bet !== "number") o.dome.bet = 0 // rétro-compat : vieux snap Dôme sans mise
        if (o.dome && typeof o.dome.energyAccrued !== "number") o.dome.energyAccrued = 0 // rétro-compat : remboursement énergie différé (fin de tournoi)
        if (typeof o.ts === "number" && Date.now() - o.ts > FRONTIER_LS_MAX_AGE_MS) { clearFrontierSnap(); return null }
        if (!frontierActive(o.run, o.dome) || !frontierSpeciesOk(o)) { clearFrontierSnap(); return null }
        return o
    } catch { clearFrontierSnap(); return null }
}

// ── interiorReturn : survie au RELOAD ──────────────────────────────────────────────────────────────────────
// Le labo (étage) et la boutique sont des cartes PARTAGÉES entre Ville Jaune et Cendreville : c'est interiorReturn
// (posé à l'entrée) qui dit de QUELLE ville on vient — et donc, côté Cendreville, d'afficher le MAÎTRE DES CAPACITÉS
// (au lieu de l'assistant), les bons posters, et une porte de sortie vers la bonne ville. Or interiorReturn est
// TRANSIENT (jamais écrit en base : la table ne stocke que mapId/posX/posY/direction). Un rechargement le remet à
// null → on retombe « côté Ville Jaune ». Sur mobile (PWA relancée à chaque retour d'app) c'est quasi systématique,
// d'où « je ne vois toujours pas le Maître ». Parade : on MIROITE interiorReturn en localStorage (par joueur) et on
// le réinjecte après hydrate() quand la save nous replace dans un intérieur partagé. Purement client, zéro migration.
const SHARED_INTERIORS = new Set(["yellow_infirmary", "yellow_infirmary_2e", "yellow_shop"])
function interiorReturnKey(uid: string) { return `yellow_intret_${uid}` }
function readInteriorReturn(uid: string): { mapId: string; x: number; y: number } | null {
    if (typeof window === "undefined" || !uid) return null
    try {
        const raw = window.localStorage.getItem(interiorReturnKey(uid))
        if (!raw) return null
        const v = JSON.parse(raw)
        if (v && typeof v.mapId === "string" && typeof v.x === "number" && typeof v.y === "number") return v
    } catch { /* localStorage indispo / JSON corrompu : on ignore */ }
    return null
}
function writeInteriorReturn(uid: string, v: { mapId: string; x: number; y: number } | null) {
    if (typeof window === "undefined" || !uid) return
    try {
        if (v) window.localStorage.setItem(interiorReturnKey(uid), JSON.stringify(v))
        else window.localStorage.removeItem(interiorReturnKey(uid))
    } catch { /* quota / mode privé : silencieux */ }
}

/** REFLET (arène/ghost run 2) : rend le PREMIER Daemon envoyé de L'ADVERSAIRE imprévisible (mélange son ordre,
 *  Fisher-Yates). ⚠️ NE s'applique QU'À l'adversaire : TON équipe garde l'ordre que TU as décidé (ton lead).
 *  Anti-exploit : tu ne connais plus d'avance le lead du reflet. Copie superficielle → n'altère jamais l'équipe réelle. */
function randomizeLead(team: MonInstance[]): MonInstance[] {
    const a = team.slice()
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
    return a
}

export default function YellowDevClient({ userId = "", isCreator = false, nickname = "", gameMode = "normal" }: { userId?: string; isCreator?: boolean; nickname?: string; gameMode?: string }) {
    const move = useGameStore((s) => s.move)
    const activateRepel = useGameStore((s) => s.activateRepel)
    const repelSteps = useGameStore((s) => s.repelSteps) // REPOUSSE : pas restants (HUD + garde anti-double)
    const activateTorch = useGameStore((s) => s.activateTorch)
    const torchSteps = useGameStore((s) => s.torchSteps) // LAMPE TORCHE : pas d'autonomie restants (HUD + sac)
    const mapPlayer = useGameStore((s) => s.player)
    // LIGUE DE FUSION — dans une salle de fusion, l'onglet ÉQUIPE affiche les 6 FUSIONNÉS du gauntlet (au lieu de
    //   l'équipe de base) : on peut ouvrir la fiche de chacun + réordonner l'ordre de combat et les attaques.
    const fusionGauntletTeam = getGauntletTeam()
    const inFusionLeague = !!fusionGauntletTeam && mapPlayer.mapId.startsWith("yellow_fusion_")
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)
    const hydrate = useGameStore((s) => s.hydrate)
    const hydrated = useGameStore((s) => s.hydrated)
    const shopOpen = useGameStore((s) => s.shopOpen)
    const closeShop = useGameStore((s) => s.closeShop)
    const interiorReturn = useGameStore((s) => s.interiorReturn) // ville d'entrée d'un intérieur partagé (shop/centre)
    const pcOpen = useGameStore((s) => s.pcOpen)
    const closePc = useGameStore((s) => s.closePc)
    const domeMenuOpen = useGameStore((s) => s.domeMenuOpen)   // carrousel du Maître du Dôme
    const closeDomeMenu = useGameStore((s) => s.closeDomeMenu)
    const espionOpen = useGameStore((s) => s.espionOpen)
    const closeEspion = useGameStore((s) => s.closeEspion)
    const trocOpen = useGameStore((s) => s.trocOpen)
    const closeTroc = useGameStore((s) => s.closeTroc)
    const usineMenuOpen = useGameStore((s) => s.usineMenuOpen)
    const closeUsineMenu = useGameStore((s) => s.closeUsineMenu)
    const fusionMenuOpen = useGameStore((s) => s.fusionMenuOpen) // AUTEL DE LA CHIMÈRE (salle de fusion)
    const closeFusionMenu = useGameStore((s) => s.closeFusionMenu)
    const fusionAtelierOpen = useGameStore((s) => s.fusionAtelierOpen) // ORDINATEUR DE FUSION (atelier 6 slots)
    const closeFusionAtelier = useGameStore((s) => s.closeFusionAtelier)
    const openPc = useGameStore((s) => s.openPc)
    // Overlays plein écran gérés côté store (fermés par le bouton B via goBack).
    const guideOpen = useGameStore((s) => s.guideOpen)
    const closeGuide = useGameStore((s) => s.closeGuide)
    const arenaInfoOpen = useGameStore((s) => s.arenaInfoOpen)
    const closeArenaInfo = useGameStore((s) => s.closeArenaInfo)
    const libraryOpen = useGameStore((s) => s.libraryOpen)
    const closeLibrary = useGameStore((s) => s.closeLibrary)
    const advisorOpen = useGameStore((s) => s.advisorOpen)
    const closeAdvisor = useGameStore((s) => s.closeAdvisor)
    const daemomaniaqueOpen = useGameStore((s) => s.daemomaniaqueOpen)
    const closeDaemomaniaque = useGameStore((s) => s.closeDaemomaniaque)
    const labOpen = useGameStore((s) => s.labOpen)
    const closeLab = useGameStore((s) => s.closeLab)
    const moveReminderOpen = useGameStore((s) => s.moveReminderOpen)
    const closeMoveReminder = useGameStore((s) => s.closeMoveReminder)
    const combatShopOpen = useGameStore((s) => s.combatShopOpen)
    const closeCombatShop = useGameStore((s) => s.closeCombatShop)
    const signOpen = useGameStore((s) => s.signOpen)
    const closeSign = useGameStore((s) => s.closeSign)
    const posterImage = useGameStore((s) => s.posterImage)
    const closePoster = useGameStore((s) => s.closePoster)
    const dialogue = useGameStore((s) => s.dialogue)
    const pendingNgplusAbandon = useGameStore((s) => s.pendingNgplusAbandon) // NG+ : offre d'abandon CHEN → confirmation
    const setMap = useGameStore((s) => s.setMap)
    const teleportToHealCenter = useGameStore((s) => s.teleportToHealCenter)
    const launchRematch = useGameStore((s) => s.launchRematch)
    const showDialogue = useGameStore((s) => s.showDialogue)
    const battle = useBattle()
    // Transition de rencontre (écran de chargement) affichée → on neutralise le D-pad.
    const encounterFx = useEncounterFxActive()
    const evolutions = useEvolutions()
    const championRun = useChampionRun()
    const arenaRun = useArenaRun()
    const chainRematchId = useChainRematch()
    const pendingLearn = usePendingLearn()
    const newDexEntry = useNewDexEntry()
    const whiteout = useWhiteout()
    const duelResult = useDuelResult()
    const ngplusFinalPending = useNgplusFinalPending() // NG+ : Maître battu en NG+ → combat vs ancienne équipe à lancer
    const ngplusFinalResult = useNgplusFinalResult()   // NG+ : issue de ce combat (win → clôture)
    // RUN 3 — à la fin du run 2, on propose le CHOIX : fusionner maintenant (finir) OU lancer le run 3.
    const [run3Offer, setRun3Offer] = useState<{ score: number; bestGrade: number } | null>(null)
    const [run3StarterChoice, setRun3StarterChoice] = useState(false) // RUN 3 : choix du starter (les 3 lignées)
    const [run3EndOffer, setRun3EndOffer] = useState<{ score: number; reason: "energy" | "master" } | null>(null) // RUN 3 : fin (0⚡ OU sacre du Maître) → méga-fusion forcée
    const run3EndTriggeredRef = useRef(false) // anti double-déclenchement de completeRun3 (async, bascule activeWorld)
    const run = useRun()
    const frontierResult = useFrontierResult()
    const frontierReportedRef = useRef(false)
    // #frontier-resume : tant que la reprise au boot n'a pas eu lieu, on N'ÉCRIT PAS l'instantané
    // (sinon le 1er rendu, état vide, effacerait le snapshot avant qu'on ait pu le relire).
    const frontierResumedRef = useRef(false)
    const [usineDraft, setUsineDraft] = useState<{ levelRule: LevelRule; pool: RentalCandidate[]; picks: string[] } | null>(null)
    const [usineCursor, setUsineCursor] = useState(0) // carousel : fiche du Daemon de location affichée
    // Profil Frontier (serveur) : records towerBest/factoryBest → détecte le CHAMPION (série ≥ 46 = palier DAN_4)
    //   pour offrir la CT du Maître dans la Tour/Usine. Rafraîchi à l'entrée de la salle + après chaque fin de série.
    const [frontierProf, setFrontierProf] = useState<FrontierProfile | null>(null)
    // DÔME (bracket de 8, état local éphémère) : state du tournoi + règle + graine + JC cumulés.
    const [dome, setDome] = useState<DomeSnap | null>(null)
    const [domeSetup, setDomeSetup] = useState<{ tier: DomeTier; bet: number } | null>(null) // écran de MISE avant lancement
    const domeLaunchingRef = useRef(false) // anti double-débit de la mise (double-tap mobile)
    const [domeRegisterOpen, setDomeRegisterOpen] = useState(false) // le SÉLECTEUR de tier ne s'affiche qu'après « S'inscrire » (via le mage), pas tout seul
    const [domeTab, setDomeTab] = useState<"inscrire" | "regles" | "stats">("inscrire") // onglet actif du carrousel du mage
    // Quitter la map du Dôme (marcher pour sortir) réinitialise l'écran de mise + le sélecteur → on repasse par le mage au retour.
    useEffect(() => {
        if (mapPlayer.mapId !== "yellow_combat_dome") { if (domeSetup) setDomeSetup(null); if (domeRegisterOpen) setDomeRegisterOpen(false); domeLaunchingRef.current = false }
    }, [mapPlayer.mapId, domeSetup, domeRegisterOpen])
    const [ticketOpen, setTicketOpen] = useState(false) // ticket roulette quotidien (1re connexion du jour)
    const [rouletteOpen, setRouletteOpen] = useState(false) // roulette européenne SOLO (bêta, à côté du casino)
    const [rouletteMpOpen, setRouletteMpOpen] = useState(false) // roulette européenne MULTIJOUEUR (Phase 4)
    const [croupierOpen, setCroupierOpen] = useState(false) // carrousel du croupier (railleries + stats casino)
    const [barmanOpen, setBarmanOpen] = useState(false) // menu du barman (guide + potions prix-libre)
    const [blackjackOpen, setBlackjackOpen] = useState(false) // table de blackjack (PC haut-gauche)
    const [pokerOpen, setPokerOpen] = useState(false) // table de poker multijoueur (coin bas-gauche)
    const [soloPokerOpen, setSoloPokerOpen] = useState(false) // 1re partie de poker : tuto SOLO local (house-funded)
    const [dailyPokerOpen, setDailyPokerOpen] = useState(false) // cash quotidien SOLO vs les boss (vraies reps)
    const [kartOpen, setKartOpen] = useState(false) // borne d'arcade Pokémon Kart (PC haut-gauche, hors 1er)
    // Pokémon Kart : la SÉLECTION/RÉSULTATS sont des overlays (RacePanel) ; la COURSE est rendue DANS
    // l'écran (RaceView) et pilotée par les VRAIS boutons de la coque (mode analogique, onHoldChange).
    const [raceCfg, setRaceCfg] = useState<RaceCfg | null>(null)          // course en cours (null = écran de sélection)
    const [raceResults, setRaceResults] = useState<Racer[] | null>(null)  // classement final (null = pas encore fini)
    const raceInputRef = useRef<RaceInput>({ up: false, down: false, left: false, right: false, nitro: false })
    const raceActive = kartOpen && !!raceCfg && !raceResults           // la course tourne dans l'écran (boutons GB = analogiques)
    const resetRaceInput = () => { raceInputRef.current = { up: false, down: false, left: false, right: false, nitro: false } }
    // Boutons de la coque → état de pilotage (mode analogique). A=gaz · B=frein · SELECT=nitro · ◀▶=braquer.
    // START = abandonner la course (retour à l'écran de sélection). ▲▼ inutilisés.
    const handleRaceHold = (btn: GbButton, pressed: boolean) => {
        const r = raceInputRef.current
        if (btn === "left") r.left = pressed
        else if (btn === "right") r.right = pressed
        else if (btn === "a") r.up = pressed
        else if (btn === "b") r.down = pressed
        else if (btn === "select") r.nitro = pressed
        else if (btn === "start" && pressed) { resetRaceInput(); setRaceCfg(null) }
    }
    const [creatorOpen, setCreatorOpen] = useState(false) // TEST : créateur de Daemon (post-Ligue) — réservé à Mools/créateur
    const [forcedCreator, setForcedCreator] = useState(false) // post-sacre : création OBLIGATOIRE qui enchaîne sur le NG+
    const [pendingForcedCreator, setPendingForcedCreator] = useState(false) // ouvre le créateur forcé après le dialogue-défi
    const [abandonConfirm, setAbandonConfirm] = useState(false) // overlay de confirmation d'abandon du NG+ (chez CHEN)
    const [heldOpen, setHeldOpen] = useState(false) // modale "objet tenu" (depuis la fiche d'un Daemon)
    const [evDetailOpen, setEvDetailOpen] = useState(false) // détail EV (par stat) déplié sur la fiche
    const ticketChecked = useRef(false)
    const [belgiumOpen, setBelgiumOpen] = useState(false) // événement Diables Rouges (02-07 uniquement)
    const belgiumChecked = useRef(false)
    const stepCountRef = useRef(0)                                                  // pas du jour (événement 10e pas)
    const stepPrevPosRef = useRef<{ x: number; y: number; mapId: string } | null>(null)
    const [glandModal, setGlandModal] = useState<GlandScreen | null>(null)          // événement « injustice du gland » (07-07)
    const glandCartonStepRef = useRef<number | null>(null)                          // pas auquel le carton rouge a été montré
    const [tourChoice, setTourChoice] = useState(false) // pause entre vagues de série (Continuer / Quitter)
    const [domePause, setDomePause] = useState(false) // écran d'intro AVANT chaque match du Dôme (bracket + adversaire)
    const [fusionPick, setFusionPick] = useState<string[]>([]) // AUTEL : uids des 2 Daemons à fusionner (ordre = ①②)
    const fusionSpeciesRef = useRef<string[]>([])              // espèces éphémères des fusionnés (1 épreuve simple, jusqu'à 6 pour un roster) → dispose au prochain combat / unmount
    const [atelierAdd, setAtelierAdd] = useState<{ a: string; b: string } | null>(null) // ATELIER : brouillon d'ajout (Parent A + Parent B) ; null = vue d'ensemble
    const [atelierPicking, setAtelierPicking] = useState<"a" | "b" | null>(null)         // quel picker de parent est ouvert
    const [fusionCompare, setFusionCompare] = useState<{ a: MonInstance; b: MonInstance } | null>(null) // vue PLEIN ÉCRAN parents vs fusionné
    // AUTEL : oublie la sélection en quittant la salle ; retire les espèces éphémères au démontage.
    useEffect(() => { if (mapPlayer.mapId !== "yellow_combat_autel" && fusionPick.length) setFusionPick([]) }, [mapPlayer.mapId, fusionPick.length])
    useEffect(() => () => { fusionSpeciesRef.current.forEach(disposeFusion) }, [])
    const [usineCt, setUsineCt] = useState<string[] | null>(null) // CT à choisir (récompense Usine) parmi le vaincu
    const sbireWin = useSbireWin()
    const aceWin = useAceWin()
    const badgeAwarded = useBadgeAwarded()
    const rematchReward = useRematchReward()
    const stoneReward = useStoneReward()
    const lavapetitTeaser = useLavapetitTeaser() // RUN 3 : teaser Dieu Spag Lavapetit (post-combat)
    const fusioBallOffer = useFusioBallOffer() // LIGUE DE FUSION : offre Fusio-Ball du Dieu Spaghetti (post-sacre)
    const loopOffer = useLoopOffer() // BOUCLE ENDGAME : offre « recrée ton Daemon & repars » (post-capture Ukognofy / sacre OR)
    const fusionParentReward = useFusionParentReward() // LIGUE DE FUSION : XP reversée aux parents (fin de combat)
    const fusionSacre = useFusionSacre() // LIGUE DE FUSION : roster vainqueur à graver au Hall of Fame (sacre Dieu Spaghetti)
    const megamonarxReveal = useMegamonarxReveal() // 🐉🪨 MÉGAMONARX : Dracolithe niv100 vient de transcender → cinématique historique
    const pnj6TradeOffer = usePnj6TradeOffer() // PNJ 6 : offre d'échange Crocavern ↔ team[0] (post-victoire)
    const justCaught = useJustCaught()
    const [showGeneIntro, setShowGeneIntro] = useState(false) // carrousel génétique one-shot (post-capture)
    const router = useRouter()
    const player = usePlayer()
    // ARÈNES JOUEURS (hub Eau / miroir Élec) — adversaires IA, débloqués quand on a TOUS les badges.
    const myArenaLevel = player.team.reduce((m, x) => Math.max(m, x.level), 0)
    const { mode: arenaMode, opponents: arenaOpponents } = usePlayerArena(mapPlayer.mapId, player.badges, userId, myArenaLevel)
    const [arenaFight, setArenaFight] = useState<{ opp: ArenaOpponent; mode: ArenaMode; enemy: MonInstance[] } | null>(null)
    const run2Ghosts = useRun2Ghosts(mapPlayer.mapId, userId) // PNJ-joueurs = équipes run-2 gelées d'autres joueurs (Grotte 1F)
    const visibleGhosts = run2Ghosts.filter((g) => !player.defeatedTrainers.includes(RUN2_GHOST_TRAINER_PREFIX + g.userId)) // les déjà-vaincus disparaissent
    const [ghostFight, setGhostFight] = useState<{ ghost: Run2Ghost; enemy: MonInstance[] } | null>(null)
    const [replayKeep, setReplayKeep] = useState<{ max: number; mons: MonInstance[] } | null>(null) // rejeu : modale « ramener X Daemons »
    const [confirmExitReplay, setConfirmExitReplay] = useState(false) // rejeu : confirmation AVANT de sortir (anti-clic accidentel)
    const [confirmStartReplay, setConfirmStartReplay] = useState<"run2" | "run3" | null>(null) // « rejouer un run » : confirmation avant de lancer
    const [genieOffer, setGenieOffer] = useState<{ sourceNickname: string; amount: number; pushupPerRefusal: number } | null>(null) // VŒU GÉNIE « offre partagée » : prompt reçu d'un autre joueur
    const [keepSel, setKeepSel] = useState<Set<string>>(new Set())
    // Adversaire du duel EN COURS (gardé pendant le combat pour appliquer les récompenses à la fin).
    const duelOppRef = useRef<{ userId: string; nickname: string } | null>(null)
    const handleArenaClick = (uid: string) => {
        // PNJ-JOUEUR RUN 2 (Grotte 1F) : combat vs l'équipe run-2 GELÉE d'un autre joueur (traité AVANT le check arène).
        const ghost = run2Ghosts.find((g) => g.userId === uid)
        if (ghost) {
            if (player.defeatedTrainers.includes(RUN2_GHOST_TRAINER_PREFIX + uid)) {
                showDialogue("run2ghost", ghost.nickname, [`Tu as déjà vaincu l'équipe RUN 2 de ${ghost.nickname}. Un seul combat par PNJ !`])
                return
            }
            if (!getPlayer().team.some((m) => m.currentHp > 0)) { showDialogue("run2ghost", ghost.nickname, ["Ton équipe est K.O. ! Soigne-toi avant d'affronter un champion du RUN 2."]); return }
            // Filtre les espèces non résolues (custom d'un autre joueur non enregistré) + garde try/catch (données gelées
            //   d'un autre client) → jamais de crash « pépin » (comme les reflets qui filtrent getSpecies).
            let enemy: MonInstance[] = []
            try { enemy = ghost.team.filter((m) => getSpecies(m.speciesId)).map((m, i) => championToInstance(m, i)) } catch { enemy = [] }
            if (enemy.length === 0) { showDialogue("run2ghost", ghost.nickname, [`L'équipe de ${ghost.nickname} n'a pas pu être chargée (Daemons custom non résolus). Réessaie plus tard.`]); return }
            setGhostFight({ ghost, enemy })
            return
        }
        if (!arenaMode) return
        const opp = arenaOpponents.find((o) => o.userId === uid)
        if (!opp) return
        // RUN 3 — limite DURCIE anti-farm du double-XP : 1 SEUL match de REFLET par jour (défaite comprise), pour
        //   LES DEUX modes de reflet (hub Viridian « exacts » ET miroir eau « inversés » donnent tous deux le
        //   double-XP). effectiveRunWorld() couvre aussi le REJEU de run 3. Ailleurs (run 1/2) : 1 victoire par
        //   reflet et par jour (retry jusqu'à la victoire). ⚠️ La consommation se fait au VRAI lancement du combat
        //   (onFight de la modale), PAS ici — sinon ouvrir l'aperçu pour scouter puis annuler gâcherait la journée.
        const run3Reflect = effectiveRunWorld() === "run3"
        if (run3Reflect ? duelPlayedToday() : duelWonToday(opp.userId)) {
            showDialogue("duel_rival", opp.nickname, run3Reflect
                ? ["Tu as déjà disputé ton reflet aujourd'hui. En RUN 3, c'est UN SEUL par jour — victoire OU défaite. Reviens demain."]
                : ["Tu m'as déjà vaincu aujourd'hui. Reviens demain pour ta revanche."])
            return
        }
        const enemy = arenaMode === "hub" ? buildHubTeam(opp.player) : buildMirrorTeam(opp.player)
        setArenaFight({ opp, mode: arenaMode, enemy })
    }
    const [menu, setMenu] = useState<"none" | "pause" | "team" | "bag" | "reput" | "moves" | "hof" | "arena-hof" | "stats" | "run2scores" | "run3scores" | "leaderboard" | "badges" | "palmares" | "genie">("none")
    const [run2Snap, setRun2Snap] = useState<RunScores | null>(null)
    useEffect(() => { setRun2Snap(readRun2Snapshot()) }, [])
    const activeWorld = useActiveWorld() // NG+ : "live" (partie d'origine) ou "ngplus" (New Game+)
    const ficheTouchX = useRef<number | null>(null) // swipe gauche/droite dans la fiche Daemon
    const ficheTouchY = useRef<number | null>(null) // + axe Y : un swipe ne compte que s'il DOMINE le scroll vertical
    const [selected, setSelected] = useState<MonInstance | null>(null)
    const [selectedFusionUid, setSelectedFusionUid] = useState<string | null>(null) // fiche d'un fusionné (Ligue de Fusion)
    const [pantheonEvo, setPantheonEvo] = useState<MonInstance | null>(null) // Pierre Gékroc : choix du type pour Panthéon
    const [showIntro, setShowIntro] = useState(false)
    const [pastaPick, setPastaPick] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    // PARRAINAGE (modes easy/debutant) — feedback quand le pool d'énergie se recharge à sec (spendReps).
    useEffect(() => {
        const amt = consumeModeRechargeEvent()
        if (amt) setToast(`🔋 Énergie rechargée : +${amt} ⚡ (mode assisté)`)
    }, [player.reps, player.stats.modeFillsUsed])
    const [renaming, setRenaming] = useState(false)
    const [renameText, setRenameText] = useState("")
    const [bagItem, setBagItem] = useState<string | null>(null)
    const [pcBox, setPcBox] = useState(0)
    const [pcSort, setPcSort] = useState<"recent" | "lvl" | "hp" | "spc" | "atk" | "def" | "spe" | "alpha">("recent")
    const [pcSortDir, setPcSortDir] = useState(-1) // -1 = décroissant · 1 = croissant
    const [ctShop, setCtShop] = useState(false)
    const [lampOpen, setLampOpen] = useState(false) // ARC LAMPE & GÉNIE : modal de la lampe rouillée (clic depuis le sac)
    const [ctPick, setCtPick] = useState<string | null>(null)
    // RESET « Recommencer le Nexus » — TRIPLE confirmation : 0 idle · 1 avertissement · 2 « c'est définitif » · 3 maintien 1,5 s.
    const [resetStep, setResetStep] = useState(0)
    // REJEU (« run bis ») — overlay de lancement (choix du run) + sous-choix du starter (run2 = Daemon custom, run3 = 3 lignées).
    const [replayMenu, setReplayMenu] = useState(false)
    const [replayNextCost, setReplayNextCost] = useState<number | null>(null) // coût JC du PROCHAIN rejeu (affiché à l'ouverture du menu)
    useEffect(() => {
        if (!replayMenu) return
        fetchFrontierProfile().then((p) => setReplayNextCost(replayCost(p.replaysUsed))).catch(() => setReplayNextCost(null))
    }, [replayMenu])
    // À l'entrée de la TOUR ou de l'USINE : on récupère le profil serveur (towerBest/factoryBest) pour savoir si le
    //   joueur est CHAMPION (série ≥ 46) et lui proposer sa CT du Maître. Dégrade en silence si la table n'existe pas.
    useEffect(() => {
        if (mapPlayer.mapId !== "yellow_combat_usine") closeUsineMenu() // le panneau ne survit pas à la sortie de l'Usine
        if (mapPlayer.mapId !== "yellow_combat_tour" && mapPlayer.mapId !== "yellow_combat_usine") return
        fetchFrontierProfile().then(setFrontierProf).catch(() => {})
    }, [mapPlayer.mapId])
    const [replayPickRun, setReplayPickRun] = useState<"run2" | "run3" | null>(null)
    const [profileView, setProfileView] = useState(false) // MULTI-PROFILS : overlay « Mes profils » (nouveau profil + bascule)
    const [genesisCraftStep, setGenesisCraftStep] = useState<number | null>(null) // MODE GENÈSE : étape de craft (0..5) ; null = pas en craft
    const genesisSpecsRef = useRef<StoredCustomDaemon[]>([]) // specs Genèse accumulés (ref → pas de race async entre créations)
    // SÉCURITÉ RESET : le « OUI » se fait par MAINTIEN prolongé (1,5s, barre de remplissage), pas par
    // un tap. Empêche l'effacement accidentel par double-A / tap rapide (cf. perte de save de Mools).
    const [resetHolding, setResetHolding] = useState(false)
    const resetHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (resetHoldTimer.current) clearTimeout(resetHoldTimer.current) }, [])
    const [buyConfirm, setBuyConfirm] = useState<{ id: string; name: string; price: number } | null>(null)
    // BOURSE — heure SERVEUR (Europe/Paris, anti-triche horloge) récupérée à l'ouverture du magasin → prix dynamiques.
    //   + dialogue ② one-shot du Dieu Spaghetti au 1er retour au magasin en run 3 (marker BOURSE_SHOP_MARKER).
    const [bourseHour, setBourseHour] = useState<number | null>(null)
    useEffect(() => {
        if (!shopOpen) return
        fetch("/api/gamebook/yellow/shop-time").then((r) => r.json()).then((d) => { if (typeof d?.hour === "number") setBourseHour(d.hour) }).catch(() => { /* hors-ligne : repli heure client */ })
        if (getPlayer().run3Used && !getPlayer().defeatedTrainers.includes(BOURSE_SHOP_MARKER)) {
            closeShop() // le Dieu Spaghetti t'interpelle À l'entrée (sinon le dialogue passe derrière la modale) → tu rouvres après
            showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, BOURSE_SHOP_LINES)
            markTrainerDefeated(BOURSE_SHOP_MARKER); persistYellowSave()
        }
    }, [shopOpen, showDialogue])
    // BOURSE — dialogue ① one-shot : le Dieu Spaghetti explique l'économie vivante après la 1re arène du run 3.
    useEffect(() => {
        if (getActiveWorld() === "run3" && player.run3Defeated.length >= 1 && !player.defeatedTrainers.includes(BOURSE_INTRO_MARKER)
            && !battle && evolutions.length === 0 && !dialogue && !newDexEntry && !pendingLearn && !championRun && !shopOpen) {
            showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, BOURSE_INTRO_LINES)
            markTrainerDefeated(BOURSE_INTRO_MARKER); persistYellowSave()
        }
    }, [player.run3Defeated, player.defeatedTrainers, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun, shopOpen, showDialogue])
    const [fusioBallModal, setFusioBallModal] = useState(false) // offre Fusio-Ball post-sacre (Dieu Spaghetti)
    const [loopModal, setLoopModal] = useState(false) // BOUCLE ENDGAME : offre « recrée ton Daemon & repars » (accepter/refuser)
    const [loopCreatorOpen, setLoopCreatorOpen] = useState(false) // BOUCLE ENDGAME : créateur de Daemon (mode boucle) ouvert après acceptation
    // ÉPILOGUE « Maître de la Chimère » (fin de Ligue de Fusion) : snapshot du roster vainqueur figé au sacre (fusionSacre
    //   est effacé dans la foulée), + drapeau « intro jouée → monter le panneau » (showDialogue n'a pas de callback de fin).
    const [fusionEpilogue, setFusionEpilogue] = useState<{ tier: string; roster: EpilogueRosterMon[] } | null>(null)
    const [epiloguePending, setEpiloguePending] = useState(false)
    const fusioBuyingRef = useRef(false) // verrou anti-double-tap sur l'achat (mobile) : 1 débit / 1 balle max
    const fusioReofferShownRef = useRef(false) // Fusio-Ball : re-proposition montrée UNE fois par session (anti-nag)
    const [pnj6Modal, setPnj6Modal] = useState(false) // offre d'échange PNJ 6 (post-victoire)
    const pnj6TradingRef = useRef(false) // verrou anti-double-tap sur l'échange (IRRÉVERSIBLE) : 1 seul échange
    // ANTI-MASH : le bouton « Oui » ne s'arme qu'après un court délai à l'ouverture de la modale → marteler A juste
    //   après la victoire ne peut PLUS déclencher l'échange par accident (le bug de l'Uzumaro cédé sans le vouloir).
    const [pnj6Armed, setPnj6Armed] = useState(false)
    const [buyQty, setBuyQty] = useState(1)
    const [sellMode, setSellMode] = useState(false)
    const [swapPick, setSwapPick] = useState<string | null>(null) // uid du Daemon "à déplacer"

    // Multijoueur casino : présence + déplacements temps réel des autres joueurs.
    // Actif uniquement quand on EST dans le casino, hors combat et hors intro.
    const inCasino = mapPlayer.mapId === "yellow_casino"
    // Salle de FUSION : présence + défi + combat PvP sur un canal DÉDIÉ `yellow_autel`
    // (les coordonnées sont propres à une carte → on ne mélange pas les positions casino/salle).
    const inAutel = mapPlayer.mapId === "yellow_combat_autel"
    const mpChannel = inAutel ? "yellow_autel" : "yellow_casino"
    const mpActive = (inCasino || inAutel) && !battle && !showIntro && !!userId
    const remotePlayers = useCasinoPresence({
        active: mpActive,
        channel: mpChannel,
        myUserId: userId,
        posX: mapPlayer.posX,
        posY: mapPlayer.posY,
        direction: mapPlayer.direction,
    })

    // === Chat du casino (RECO 8) ===
    const [chatOpen, setChatOpen] = useState(false)
    const [chatText, setChatText] = useState("")
    const [chatUnread, setChatUnread] = useState(0) // #2 : badge non-lus quand le panneau est fermé
    const chatOpenRef = useRef(chatOpen); chatOpenRef.current = chatOpen
    const chat = useCasinoChat({
        active: inCasino && !battle && !showIntro && !!userId,
        myUserId: userId,
        // #2 — message REÇU alors que le panneau est fermé → toast + incrément du badge
        // (sinon le message n'apparaissait nulle part : « le chat semble cassé »).
        onIncoming: (line) => {
            if (!chatOpenRef.current) {
                setChatUnread((n) => Math.min(99, n + 1))
                setToast(`💬 ${line.nickname}: ${line.text}`)
            }
        },
    })

    // #5 — verrous croisés échange↔défi (jamais les deux en même temps, sinon on peut
    // partir en combat avec un Daemon déjà échangé). Réfs lues à chaque render par les
    // hooks (busy stocké en ref côté hook) → 1 render de latence max, sans casse.
    const tradeBusyRef = useRef(false)
    const challengeBusyRef = useRef(false)
    const ctTradeBusyRef = useRef(false)

    // === PvP : défi + combat réseau (casino = normal · salle de fusion = combat de FUSION) ===
    const [pvpSession, setPvpSession] = useState<(BattleStart & { fusion?: boolean }) | null>(null)
    const pvpCtx = usePvpCtx()
    // FUSION : construit MON équipe de fusion (espèces éphémères) depuis le roster persisté.
    // Paires de fusion VALIDES + DÉDUPLIQUÉES : on écarte celles dont un parent n'est plus dans l'équipe/la boîte
    //   (relâché…) OU qui réutilisent un Daemon (uid) déjà engagé dans une fusion précédente. RÈGLE : un Daemon ne
    //   peut alimenter qu'UNE seule fusion à la fois (on ne fusionne pas 2× le même Ukognos). 1re occurrence gagne.
    const dedupFusions = (roster: { a: string; b: string }[]): { a: string; b: string }[] => {
        const all = [...player.team, ...player.pc]
        const has = (uid: string) => all.some((m) => m.uid === uid)
        const seen = new Set<string>(), out: { a: string; b: string }[] = []
        for (const p of roster) {
            if (!has(p.a) || !has(p.b) || p.a === p.b || seen.has(p.a) || seen.has(p.b)) continue
            seen.add(p.a); seen.add(p.b); out.push(p)
        }
        return out
    }
    const buildMyFusionTeam = () => {
        const all = [...player.team, ...player.pc]
        const byU = (uid: string) => all.find((m) => m.uid === uid)!
        const built = dedupFusions(player.fusionRoster).map((p) => buildFusion(byU(p.a), byU(p.b)))
        return {
            team: built.map((f) => f.instance),
            species: built.map((f) => getSpecies(f.speciesId)).filter((s): s is SpeciesData => !!s),
        }
    }
    const fusionHooks: FusionPvpHooks = { buildTeam: buildMyFusionTeam, dispose: (ids) => ids.forEach(disposeFusion) }
    // Nombre de fusions valides prêtes au combat (roster ↔ Daemons présents, déduplié par uid) → gate des défis.
    const myFusionCount = dedupFusions(player.fusionRoster).length
    // Prefetch (GET-only, aucune génération, aucun coût) des sprites générés du roster de fusion → chauffe le
    //   registre mémoire pour que le COMBAT de fusion affiche les sprites déjà en cache (repli sync dans buildFusion).
    useEffect(() => {
        const all = [...player.team, ...player.pc]
        const byU = (uid: string) => all.find((m) => m.uid === uid)
        const pairs = dedupFusions(player.fusionRoster)
            .map((p) => { const a = byU(p.a), b = byU(p.b); return a && b ? [a.speciesId, b.speciesId] as [string, string] : null })
            .filter((x): x is [string, string] => !!x)
        if (pairs.length) void prefetchFusionSprites(pairs)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player.fusionRoster, player.team, player.pc])
    const challenge = useCasinoChallenge({
        // Borne Kart ouverte → on ne REÇOIT plus de défi (sinon combat PvP invisible sous la course,
        // forfait fantôme au démontage). Réciproque : on bloque l'ouverture de la borne si un défi/combat
        // est en cours (cf. tryCasinoObjectA). Canal = casino OU salle de fusion.
        active: mpActive && !kartOpen,
        channel: mpChannel,
        myUserId: userId,
        busy: !!battle || !!pvpSession || tradeBusyRef.current || ctTradeBusyRef.current,
        // La session hérite du contexte de la salle : dans l'Autel → combat de FUSION.
        onStart: (s) => setPvpSession({ ...s, fusion: inAutel }),
    })
    const { forfeit: pvpForfeitNow } = useCasinoBattle(
        pvpSession, userId,
        (reason) => { setPvpSession(null); setToast(reason) },
        pvpSession?.fusion ? fusionHooks : undefined,
    )

    // === Échange de Daemons (RECO 4) ===
    const [interactTarget, setInteractTarget] = useState<{ userId: string; nickname: string } | null>(null)
    // Anti ghost-click : ouvrir un menu via un bouton GameBoy (START/A, onPointerDown) fait
    // apparaître l'overlay SOUS le doigt → le clic de relâchement du même appui retombe sur
    // le backdrop et le referme aussitôt (d'où "il faut appuyer longtemps"). On note l'instant
    // d'ouverture ; le backdrop ignore toute fermeture dans les 350 ms qui suivent.
    const menuTapGuard = useRef(0)
    const [tradePickFor, setTradePickFor] = useState<{ userId: string; nickname: string } | null>(null)
    const [tradeAnim, setTradeAnim] = useState<{ give: MonInstance; receive: MonInstance } | null>(null)
    const trade = useCasinoTrade({
        active: inCasino && !battle && !showIntro && !!userId,
        myUserId: userId,
        busy: !!battle || !!pvpSession || challengeBusyRef.current || ctTradeBusyRef.current,
        // Échange validé des 2 côtés → on lance la CINÉMATIQUE ; le swap réel est appliqué
        // à la FIN de l'animation (onDone du composant TradeAnimation, plus bas).
        onComplete: (give, receive) => { setTradePickFor(null); setTradeAnim({ give, receive }) },
        // #13 — feedback explicite quand l'échange se ferme sans aboutir.
        onClosed: (reason) => { setToast(reason); setTradePickFor(null) },
    })
    // #5 — MAJ des réfs APRÈS les deux hooks (lues au render suivant par les busy).
    challengeBusyRef.current = !!(challenge.incoming || challenge.outgoing)
    tradeBusyRef.current = !!trade.session

    // ── Échange de CT (flux SÉPARÉ du Daemon ; un seul échange à la fois via ctTradeBusyRef). ──
    const [ctTradePickFor, setCtTradePickFor] = useState<{ userId: string; nickname: string } | null>(null)
    const ctTrade = useCasinoCtTrade({
        active: inCasino && !battle && !showIntro && !!userId,
        myUserId: userId,
        busy: !!battle || !!pvpSession || challengeBusyRef.current || tradeBusyRef.current,
        onComplete: (giveCtId, receiveCtId) => {
            tradeCt(giveCtId, receiveCtId)
            persistYellowSave()
            setCtTradePickFor(null)
            setToast(`🎴 Échange de CT réussi ! Tu reçois ${getMove(getCt(receiveCtId)?.moveId ?? "")?.name ?? "une CT"}.`)
        },
        onClosed: (reason) => { setToast(reason); setCtTradePickFor(null) },
    })
    ctTradeBusyRef.current = !!ctTrade.session

    const [confirmForfeit, setConfirmForfeit] = useState(false)

    // RUN 2 — accumulateur de TEMPS DE JEU ACTIF (score #2) : ajoute le temps écoulé tant que l'onglet est
    // VISIBLE (tick 5 s + flush au basculement/démontage). Un onglet caché n'accumule rien (last avance sans bump).
    useEffect(() => {
        if (typeof document === "undefined") return
        let last = Date.now()
        // Tick (5 s) + démontage : encaisse [last, now] SI on est visible, puis avance last.
        const bumpVisible = () => { const now = Date.now(); if (document.visibilityState === "visible") bumpPlaytime(now - last); last = now }
        // Bascule de visibilité : en passant CACHÉ on encaisse le temps visible écoulé ; en passant VISIBLE on
        // NE compte PAS l'intervalle caché (on repart de now) → le temps hors-app n'est jamais compté.
        const onVis = () => { const now = Date.now(); if (document.visibilityState === "hidden") bumpPlaytime(now - last); last = now }
        const id = setInterval(bumpVisible, 5000)
        document.addEventListener("visibilitychange", onVis)
        return () => { bumpVisible(); clearInterval(id); document.removeEventListener("visibilitychange", onVis) }
    }, [])

    // Anti-sortie ACCIDENTELLE du Nexus : le bouton RETOUR du navigateur/téléphone déclenche
    // une confirmation au lieu de quitter direct (le joueur voulait souvent juste un "retour"
    // in-game). On pose une entrée tampon dans l'historique ; le retour la consomme → confirm.
    useEffect(() => {
        if (typeof window === "undefined") return
        window.history.pushState(null, "", window.location.href)
        const onPop = () => {
            if (window.confirm("Quitter le Nexus Jaune Éclair ? Ta progression est sauvegardée — tu pourras reprendre où tu en étais.")) {
                window.history.back() // l'utilisateur confirme → on le laisse sortir
            } else {
                window.history.pushState(null, "", window.location.href) // il reste : on re-pose le tampon
            }
        }
        window.addEventListener("popstate", onPop)
        return () => window.removeEventListener("popstate", onPop)
    }, [])

    // Teardown de la session PvP une fois le combat terminé (pvpCtx repassé à null).
    const wasPvpRef = useRef(false)
    useEffect(() => {
        if (pvpCtx) wasPvpRef.current = true
        else if (wasPvpRef.current) { wasPvpRef.current = false; setPvpSession(null); setConfirmForfeit(false) }
    }, [pvpCtx])

    // #2 — Timeout de tour : si j'attends l'adversaire trop longtemps → il déclare forfait.
    // "J'attends" = soit l'adversaire doit changer de Daemon, soit j'ai joué et pas lui.
    const waitingOnOpp = !!pvpCtx && !!battle && battle.phase !== "ended" && !pvpCtx.desync && (
        battle.forcedSwitch === "enemy"
        || (pvpCtx.myAction != null && pvpCtx.oppAction == null && !battle.forcedSwitch)
    )
    useEffect(() => {
        if (!waitingOnOpp) return
        const t = setTimeout(() => {
            setToast("L'adversaire n'a pas répondu — victoire par forfait.")
            pvpForfeit(false) // l'adversaire n'a pas joué → IL forfait, je gagne
        }, 35000)
        return () => clearTimeout(t)
    }, [waitingOnOpp])

    // Joueur distant sur la tuile EN FACE (pour le défier d'un appui A).
    const facingRemote = () => {
        const d = mapPlayer.direction
        const fx = mapPlayer.posX + (d === "left" ? -1 : d === "right" ? 1 : 0)
        const fy = mapPlayer.posY + (d === "up" ? -1 : d === "down" ? 1 : 0)
        return remotePlayers.find((p) => p.posX === fx && p.posY === fy) ?? null
    }

    // CASINO : A face à la TABLE ROULETTE (3-5,4-5) → joue ; A face au CROUPIER (4,3) → carrousel.
    // Le SENS où l'on regarde désambiguïse (table sous le croupier). Renvoie true si géré.
    const tryCasinoObjectA = useCallback((): boolean => {
        if (!inCasino || !userId) return false
        const d = mapPlayer.direction
        const fx = mapPlayer.posX + (d === "left" ? -1 : d === "right" ? 1 : 0)
        const fy = mapPlayer.posY + (d === "up" ? -1 : d === "down" ? 1 : 0)
        // RUN 3 (concours) : les TABLES du casino (mise = énergie) sont FERMÉES — pas de mise, pas de gain. Le
        //   kart (course arcade, sans mise) reste ouvert. Le verrou énergie couvre déjà les gains ; ceci évite
        //   juste d'ouvrir une table inutile.
        if (activeWorld === "run3") {
            const onTable =
                (fx >= 3 && fx <= 5 && fy >= 4 && fy <= 5) || // roulette (multi)
                (fx === 4 && fy === 3) ||                      // croupier
                (fy === 2 && fx >= 9 && fx <= 12) ||           // barman (rachat de tickets)
                (fy === 1 && fx >= 1 && fx <= 2) ||            // blackjack
                (fx >= 3 && fx <= 5 && fy >= 7 && fy <= 8)     // poker
            if (onTable) { menuTapGuard.current = Date.now(); setToast("🎰 Casino FERMÉ pendant le CONCOURS — pas de mise ni de gain."); return true }
        }
        if (fx >= 3 && fx <= 5 && fy >= 4 && fy <= 5) { menuTapGuard.current = Date.now(); setRouletteMpOpen(true); return true }
        if (fx === 4 && fy === 3) { menuTapGuard.current = Date.now(); setCroupierOpen(true); return true }
        if (fy === 2 && fx >= 9 && fx <= 12) { menuTapGuard.current = Date.now(); setBarmanOpen(true); return true } // comptoir du barman
        if (fy === 1 && fx >= 1 && fx <= 2) { menuTapGuard.current = Date.now(); setBlackjackOpen(true); return true } // 1er PC (tout à gauche) = blackjack
        if (fy === 1 && fx >= 3 && fx <= 6) {      // PC suivants = Pokémon Kart
            if (challengeBusyRef.current || pvpSession || battle) return true // défi/combat en cours → on n'ouvre pas la borne (évite le combat invisible sous la course)
            menuTapGuard.current = Date.now(); setRaceCfg(null); setRaceResults(null); resetRaceInput(); setKartOpen(true); return true
        }
        if (fx >= 3 && fx <= 5 && fy >= 7 && fy <= 8) { // table de poker (sud de la roulette)
            menuTapGuard.current = Date.now()
            if (!getPlayer().pokerFirstGameDone) { setSoloPokerOpen(true); return true } // 1re fois : tuto SOLO offert
            // Ensuite : MULTI si des potes sont au casino, sinon CASH quotidien SOLO vs les boss.
            if (remotePlayers.length > 0) setPokerOpen(true); else setDailyPokerOpen(true)
            return true
        }
        return false
    }, [inCasino, userId, mapPlayer, activeWorld])

    // A dans le casino SANS cible d'interaction : tente d'abord un PNJ (pressA) ; si aucun dialogue ne
    // s'ouvre, FOUILLE la case-sol courante (jetons cachés — secret, cf. ensureDailyChips/searchChipTile).
    const casinoAFallback = useCallback(() => {
        if (!inCasino || !userId) { pressA(); return }
        const hadDialogue = !!useGameStore.getState().dialogue
        pressA()
        if (hadDialogue || useGameStore.getState().dialogue) return // un PNJ parle / dialogue en cours
        const got = searchChipTile(mapPlayer.posX, mapPlayer.posY)
        if (got > 0) { setToast(`🎰 Tu déniches ${got} jeton${got > 1 ? "s" : ""} sous le tapis ! (ticket${got > 1 ? "s" : ""} casino)`); persistYellowSave() }
        else if (got === 0) setToast("🔎 Rien sous ce tapis…")
    }, [inCasino, userId, pressA, mapPlayer.posX, mapPlayer.posY])

    // ANTI-MASH échange PNJ 6 : à l'ouverture de la modale, on DÉSARME le bouton « Oui » puis on l'arme après
    //   1,2 s. Un joueur qui martèle A pour passer le dialogue de victoire ne peut donc plus valider l'échange
    //   irréversible sans le vouloir (cause de la perte de l'Uzumaro).
    useEffect(() => {
        if (!pnj6Modal) { setPnj6Armed(false); return }
        setPnj6Armed(false)
        const t = setTimeout(() => setPnj6Armed(true), 1200)
        return () => clearTimeout(t)
    }, [pnj6Modal])

    // Au mount : charge l'état du joueur depuis le serveur (DB Neon).
    // Si le joueur n'a jamais joué, on garde le state par défaut (déjà set
    // côté store) — l'API renvoie les mêmes defaults dans ce cas.
    useEffect(() => {
        fetch("/api/gamebook/yellow/state")
            .then((r) => (r.ok ? r.json() : null))
            .then(async (data) => {
                if (!data?.player) return
                // RELOAD dans un intérieur PARTAGÉ (labo/boutique) : on restaure interiorReturn depuis localStorage
                //   AVANT hydrate (qui laisse interiorReturn à null), puis on le réinjecte → le Maître des Capacités
                //   de Cendreville, les posters et la porte de sortie survivent au rechargement.
                const saved = SHARED_INTERIORS.has(data.player.mapId) ? readInteriorReturn(userId) : null
                hydrate(data.player)
                if (saved) useGameStore.getState().setInteriorReturn(saved)
                // RELOAD en pleine LIGUE DE FUSION (gauntlet) : on RECONSTRUIT l'équipe abîmée depuis la save (carry :
                //   PV/statut/PP/ordre persistés). ⚠️ La restauration lit le carry DANS la save de jeu → il FAUT que
                //   loadYellowSave soit terminé avant (sinon COURSE avec l'autre effet : carry pas encore chargé →
                //   renvoi au Dôme À TORT). loadYellowSave est idempotent ; setGameMode d'abord (parrainage, cf. l'autre
                //   effet). Réussi → on RESTE dans la salle (progression + usure gardées, pas de soin gratuit). Échec
                //   (pas de carry / roster changé / toutes K.O.) → repli Autel (fail-safe). La ré-entrée réinitialise tout.
                if (typeof data.player.mapId === "string" && data.player.mapId.startsWith("yellow_fusion_")) {
                    setGameMode(gameMode)
                    await loadYellowSave()
                    if (!restoreFusionGauntletFromCarry()) useGameStore.getState().setMap("yellow_combat_autel", 9, 8)
                }
            })
            .catch((e) => console.warn("[yellow] load failed", e))
    }, [hydrate, userId])

    // MIROIR interiorReturn → localStorage : à chaque changement (une fois hydraté, pour ne pas écraser la valeur
    //   mémorisée avant qu'on l'ait relue au montage). Permet de retrouver la ville d'entrée d'un intérieur partagé
    //   après un rechargement de page / relance de la PWA.
    useEffect(() => {
        if (!hydrated) return
        writeInteriorReturn(userId, interiorReturn)
    }, [interiorReturn, hydrated, userId])

    // Charge la sauvegarde de jeu (équipe / Pokédex / objets) + auto-save.
    useEffect(() => {
        let cancelled = false
        ; (async () => {
            // PARRAINAGE — le mode de jeu est fixé AVANT le chargement : sinon bankReps (dans loadYellowSave)
            // créditerait les vrais reps d'un compte easy/debutant (énergie découplée en modes assistés).
            setGameMode(gameMode)
            await loadYellowSave()
            // RUN 3 — reload en pleine arène : loadYellowSave vient d'établir le monde (setActiveWorld). Si hydrate()
            //   a posé la carte de BASE avant (course de montage), on re-résout maintenant vers la variante re-thémée.
            if (!cancelled) useGameStore.getState().refreshActiveMap()
            // easy/debutant : crédite le remplissage d'énergie de DÉPART (idempotent — une seule fois par run).
            if (!cancelled) ensureModeStartGrant()
            // CROSS-JOUEUR : enregistre les Daemons CUSTOM (+ leurs némésis) de TOUS les joueurs → ceux créés par
            //   d'autres joueurs se résolvent partout (reflets, Hall of Fame, sprites) au lieu de MISSINGNO/équipe
            //   amputée. « Des Pokémon comme les autres, créés par un autre joueur » (choix Sartay). Non bloquant.
            fetch("/api/gamebook/yellow/registry").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.players) registerRegistryCustoms(j.players) }).catch(() => {})
            initAutosave()
            // #8 — ANTI-FUITE : un combat (dresseur/sauvage) interrompu par un refresh est REPRIS tel
            // quel au lieu de valoir une fuite gratuite. No-op s'il n'y a rien à reprendre.
            if (!cancelled) resumeBattleFromStorage()
            // ZONE DE COMBAT — reprise d'une SÉRIE Frontier interrompue (Tour/Usine/Dôme) au refresh.
            // On NE reprend PAS le combat de vague (exclu de #8) : on retombe au début de la vague
            // courante via les effets de lancement. Toujours marquer la reprise faite (frontierResumedRef)
            // pour autoriser ensuite l'écriture de l'instantané, même s'il n'y avait rien à reprendre.
            if (!cancelled) {
                const fsnap = readFrontierSnap()
                if (fsnap?.run?.status === "active") {
                    setRunRaw(fsnap.run)
                    setDraftedTeam(fsnap.draftedTeam ?? null)
                    setTourChoice(fsnap.tourChoice)
                    setUsineCt(fsnap.usineCt)
                } else if (fsnap?.dome?.state.status === "active") {
                    setDome(fsnap.dome)
                }
                frontierResumedRef.current = true
            }
            // TÉLÉPORT DEV : ?map=<id> saute direct à une map (ex. yellow_arena_elec) en ignorant
            // les gates (badge, ACE…). Réservé au créateur OU au pseudo whitelisté (Ledé) pour le test.
            const teleportAllowed = isCreator || ["ledé", "lede"].includes(nickname.normalize("NFC").toLowerCase())
            if (!cancelled && teleportAllowed && typeof window !== "undefined") {
                const target = new URLSearchParams(window.location.search).get("map")
                const tm = target ? YELLOW_MAPS[target] : null
                if (target && tm) {
                    let sp: { x: number; y: number } = { x: 1, y: 1 }
                    if (target === "yellow_cendreville") sp = CENDREVILLE_SPAWN
                    else outer: for (let y = 0; y < tm.height; y++) for (let x = 0; x < tm.width; x++) {
                        if (!isBlockingTile(tm.tiles[y][x])) { sp = { x, y }; break outer }
                    }
                    setMap(target, sp.x, sp.y)
                }
            }
            // Cadeau du DIEU SPAG crédité au chargement (saveManager) → on affiche son message une fois.
            if (!cancelled) { const gift = consumeGiftMessage(); if (gift) setToast(gift) }
            // CADEAUX CROISÉS de duel (Partie C) : un autre joueur a battu MON reflet → le Dieu Spaghetti
            // me console (+énergie) à cette connexion. Énergie appliquée APRÈS loadYellowSave → pas de race.
            // RUN 3 : on ne réclame PAS (le don serait consommé serveur mais grantReps est no-op → perdu). En attente.
            if (!cancelled && getActiveWorld() !== "run3") {
                try {
                    const r = await fetch("/api/gamebook/yellow/duel-gift")
                    const j = r.ok ? await r.json() : null
                    const gifts = (j?.gifts ?? []) as { fromNickname: string; energy: number }[]
                    if (!cancelled && gifts.length > 0) {
                        // 🎂 Cadeau d'anniversaire de Gg (sentinelle) vs cadeaux croisés de duel.
                        const bday = gifts.filter((g) => g.fromNickname === "__BDAY36__")
                        const duel = gifts.filter((g) => g.fromNickname !== "__BDAY36__")
                        const duelTotal = duel.reduce((s, g) => s + (g.energy || 0), 0)
                        const bdayTotal = bday.reduce((s, g) => s + (g.energy || 0), 0)
                        if (duelTotal > 0) grantReps(duelTotal)                  // cadeaux de duel : plafonnés (normal)
                        if (bdayTotal > 0) grantBonusEnergyUncapped(bdayTotal)   // anniv : HORS-plafond garanti
                        // RATTRAPAGE (Sartay 02/08) : le joueur mirouté touche EN PLUS un bonus d'énergie hors-plafond
                        //   d'autant plus gros qu'il est à la traîne (peu de badges) + une Super Ball par consolation.
                        let duelBalls = 0, duelCatchup = 0
                        if (duel.length > 0) {
                            duelCatchup = Math.max(0, 5 - (getPlayer().badges?.length ?? 0)) * 30 // 0 (5 badges) → 150 (débutant)
                            if (duelCatchup > 0) grantBonusEnergyUncapped(duelCatchup)
                            duelBalls = duel.length
                            addItem("super_ball", duelBalls)
                        }
                        if (duelTotal > 0 || bdayTotal > 0 || duelBalls > 0) persistYellowSave()
                        if (duel.length > 0) {
                            const nicks = [...new Set(duel.map((g) => g.fromNickname).filter(Boolean))]
                            const bonusLine = `🎁 En prime : ${duelBalls} Super Nexus-Ball${duelBalls > 1 ? "s" : ""}${duelCatchup > 0 ? ` + ${duelCatchup} énergie (coup de pouce)` : ""} !`
                            showDialogue(DUEL_DREAM_NPC, DUEL_DREAM_NAME, [...duelDreamLines(nicks, duelTotal), bonusLine])
                        }
                        if (bday.length > 0) {
                            showDialogue(DUEL_DREAM_NPC, "🎂 Joyeux anniversaire !", [
                                "Le Dieu Spaghetti surgit avec un gâteau de 36 bougies fumantes...",
                                `« JOYEUX ANNIVERSAIRE, champion ! Pour tes 36 ans, voici +${bdayTotal} énergie (hors plafond). Régale-toi ! »`,
                            ])
                        }
                    }
                } catch { /* neutre (hors-ligne / table absente) */ }
            }
            // VŒU GÉNIE « offre partagée » : un joueur (ex. Mools) offre de l'énergie aux 5 premiers connectés →
            //   prompt interactif accepter/refuser. Le serveur filtre l'éligibilité (pas la source, pas déjà répondu,
            //   quota libre, monde live/ngplus). Non-réponse = on ne POST rien → l'offre passe au joueur suivant.
            if (!cancelled) {
                try {
                    const r = await fetch("/api/gamebook/yellow/genie-offer")
                    const j = r.ok ? await r.json() : null
                    if (!cancelled && j?.offer) setGenieOffer({ sourceNickname: j.offer.sourceNickname, amount: j.offer.amount, pushupPerRefusal: j.offer.pushupPerRefusal })
                } catch { /* neutre */ }
            }
            // LIGUE — RÉCOMPENSE CROISÉE : un autre joueur est devenu Champion → +1/3 de MON quota
            // énergétique (1 don par sacre, calculé sur MON repsCap). Appliqué après loadYellowSave.
            // RUN 3 : on NE réclame PAS (le GET marque « claimed » côté serveur mais grantReps est no-op en run 3
            //   → le don serait DÉTRUIT). On le laisse en attente : il sera appliqué au retour en live (post-fusion).
            if (!cancelled && getActiveWorld() !== "run3") {
                try {
                    const r = await fetch("/api/gamebook/yellow/hall-of-fame/energy")
                    const j = r.ok ? await r.json() : null
                    const grants = (j?.grants ?? 0) as number
                    const champs = (j?.champions ?? []) as string[]
                    if (!cancelled && grants > 0) {
                        // +1/3 du quota par sacre, MAIS plafonné à 1000 ⚡/sacre : sinon les joueurs au repsCap
                        // gonflé (poker/casino) recevaient des milliers d'énergie d'un seul coup (ex. Mools cap 11550 → 3850).
                        const per = Math.min(1000, Math.floor(getPlayer().repsCap / 3))
                        const got = grantReps(per * grants)
                        persistYellowSave()
                        const who = [...new Set(champs.filter(Boolean))].join(", ")
                        if (got > 0) setToast(`🏛️ ${who || "Un champion"} a vaincu la Ligue ! +${got} énergie pour toi !`)
                    }
                } catch { /* neutre (hors-ligne / table absente) */ }
            }
            // ✨ FÊTE SHINY : un joueur a croisé/capturé un shiny → +50 énergie HORS-plafond pour tous,
            // annoncé par le Dieu Spaghetti à cette connexion (réclamation des dons en attente).
            // RUN 3 : même logique — on ne réclame pas (sinon le don shiny est consommé serveur mais perdu). En attente.
            if (!cancelled && getActiveWorld() !== "run3") {
                try {
                    const r = await fetch("/api/gamebook/yellow/shiny-gift")
                    const j = r.ok ? await r.json() : null
                    const energy = (j?.energy ?? 0) as number
                    const events = (j?.events ?? []) as { kind: string; speciesId: string; fromNickname: string }[]
                    if (!cancelled && energy > 0) {
                        grantBonusEnergyUncapped(energy)
                        persistYellowSave()
                        const who = (es: typeof events) => [...new Set(es.map((e) => e.fromNickname).filter(Boolean))].join(", ")
                        const caps = events.filter((e) => e.kind === "captured")
                        const encs = events.filter((e) => e.kind === "encounter")
                        const synes = events.filter((e) => e.kind === "synergy") // 🔮 secrets de synergie percés (speciesId = label)
                        const lines: string[] = ["*Le Dieu Spaghetti apparaît dans une volute de vapeur dorée…*"]
                        if (encs.length) lines.push(`✨ « Un Daemon SHINY a été aperçu sur le Nexus${who(encs) ? ` (par ${who(encs)})` : ""} ! La chance rayonne. »`)
                        if (caps.length) lines.push(`🎉 « JOUR DE FÊTE : un shiny a été CAPTURÉ${who(caps) ? ` par ${who(caps)}` : ""} ! »`)
                        for (const s of [...new Map(synes.map((e) => [e.speciesId, e])).values()].slice(0, 3)) {
                            lines.push(`🔮 « SECRET PERCÉ${s.fromNickname ? ` par ${s.fromNickname}` : ""} : ${s.speciesId} ! Un croisement d'une rare perspicacité. »`)
                        }
                        lines.push(`« Je régale toute la communauté : +${energy} énergie (hors plafond) pour toi ! »`)
                        showDialogue(DUEL_DREAM_NPC, "✨ Dieu Spaghetti", lines)
                    }
                } catch { /* neutre (hors-ligne / table absente) */ }
            }
            // PARRAINAGE — BONUS MUTUELS : un pote (parrain/filleul) a conquis une arène ou CAPTURÉ un shiny →
            // don d'énergie réclamé ici. Arène = 1/10 de MA jauge run 1 (calculé maintenant, plafonné) ; shiny = +500.
            // RUN 3 : on ne réclame pas (grantBonusEnergyUncapped no-op → don perdu). En attente jusqu'au retour live.
            if (!cancelled && getActiveWorld() !== "run3") {
                try {
                    const r = await fetch("/api/gamebook/yellow/sponsor-gift")
                    const j = r.ok ? await r.json() : null
                    const gifts = (j?.gifts ?? []) as { kind: string; energy: number; fromNickname: string }[]
                    if (!cancelled && gifts.length > 0) {
                        const arenaUnit = Math.min(1000, Math.floor(getPlayer().repsCap / 10)) // 1/10 de la jauge, plafonné (comme le don de Ligue)
                        let total = 0
                        for (const g of gifts) total += g.kind === "arena" ? arenaUnit : (g.energy || 0)
                        if (total > 0) {
                            grantBonusEnergyUncapped(total)
                            persistYellowSave()
                            const who = [...new Set(gifts.map((g) => g.fromNickname).filter(Boolean))].join(", ")
                            const arenas = gifts.filter((g) => g.kind === "arena").length
                            const shinies = gifts.filter((g) => g.kind === "shiny").length
                            const lines: string[] = ["*Le Dieu Spaghetti se matérialise, tout sourire…*"]
                            if (arenas > 0) lines.push(`🏟️ « ${who || "Ton pote"} a conquis une arène ! En bon parrainage, tu touches ta part d'énergie. »`)
                            if (shinies > 0) lines.push(`✨ « ${who || "Ton pote"} a CAPTURÉ un shiny ! La chance se partage : GROSSE prime pour toi ! »`)
                            lines.push(`« +${total} énergie (hors plafond) créditée. L'entraide, c'est ça le Nexus ! »`)
                            showDialogue(DUEL_DREAM_NPC, "🎁 Parrainage", lines)
                        }
                    }
                } catch { /* neutre (hors-ligne / table absente) */ }
            }
            // 🧞 ARC LAMPE & GÉNIE : le génie « revient » quand le créateur a fixé les contreparties (status PROPOSED).
            //   Pop-up une seule fois (?claim=1 marque proposedSeen). Détail + accept/refus dans le menu → 🧞 Vœux.
            if (!cancelled && getActiveWorld() !== "run3") {
                try {
                    const r = await fetch("/api/gamebook/yellow/genie-wish") // PEEK — ne consomme PAS proposedSeen
                    const j = r.ok ? await r.json() : null
                    // SELF-HEAL : applique tout effet de vœu ACCEPTÉ mais pas encore appliqué (idempotent) — filet si
                    //   l'application à l'acceptation a été manquée (autre appareil, reload, etc.).
                    if (!cancelled && j?.wish && applyAcceptedGenieWishEffects(j.wish)) persistYellowSave()
                    if (!cancelled && j?.justReturned && j?.wish) {
                        showDialogue(DUEL_DREAM_NPC, "🧞 Le Génie", [
                            "*Ta lampe rougeoie soudain au fond de ton sac…*",
                            "« J'ai médité sur ta demande, mortel. Reviens me voir — frotte ta lampe. »",
                        ])
                        void fetch("/api/gamebook/yellow/genie-wish?claim=1") // consomme le pop-up SEULEMENT après l'avoir affiché
                    }
                } catch { /* neutre */ }
            }
            // 🍝 VŒU MAUDIT (Jacanon) : à l'EXPIRATION de la semaine, N Daemons du PC deviennent désobéissants (login,
            //   one-shot ; no-op ailleurs car le marqueur est per-monde). Non-destructif (flag réversible par le créateur).
            if (!cancelled) { const n = resolveAbundanceCurse(); if (n > 0) { persistYellowSave(); setToast(`😈 L'abondance a un prix : ${n} de tes Daemons refusent désormais de t'obéir…`) } }
            // 1re entrée (intro jamais vue + aucune équipe) → cinématique + choix du starter.
            if (!cancelled && !getPlayer().introSeen && getPlayer().team.length === 0) {
                setShowIntro(true)
            }
        })()
        return () => { cancelled = true }
    }, [])

    // Pile de fermeture (B/Escape) : ref "latest" pour que le handler clavier appelle
    // TOUJOURS le goBack() à jour sans avoir à se ré-abonner (closures fraîches à chaque render).
    const goBackRef = useRef<() => boolean>(() => false)

    // Support clavier desktop — tout sous la MAIN GAUCHE (la souris reste libre pour les choix) :
    //   déplacement = flèches OU ZQSD · A = Espace/Entrée/A · B = Échap/B/F · Start-Select = Tab.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ne pas piloter le jeu quand on tape dans un champ (chat, renommage…).
            const t = e.target as HTMLElement | null
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return
            // BORNE KART ouverte (sélection / course / résultats) : on neutralise TOUT input carte/menu
            // (y compris Entrée/Échap/Tab non interceptés par le listener capture de RaceView) pour ne
            // pas déplacer le joueur / ouvrir un menu SOUS l'overlay. Le pilotage passe par la coque.
            if (kartOpen) return
            // Overlays POST-COMBAT (popup 1re capture / cinématique d'évolution) : ils vivent dans
            // battleStore (hors garde de move()) et s'affichent quand battle===null. Sans ça, une
            // flèche déplacerait le joueur SOUS l'overlay → rencontre sauvage → startWildBattle
            // reset newDexEntry/evolutions → popup + renommage PERDUS. On neutralise tout input carte.
            if (championRun || arenaFight || ghostFight || replayKeep || pendingLearn || newDexEntry || evolutions.length > 0) { e.preventDefault(); return }
            const inB = !!battle
            // En combat, menu pause ouvert → le D-pad/A pilotent le menu (tactile), pas le combat.
            const inBMenu = inB && menu !== "none"
            const k = e.key.toLowerCase()
            if (e.key === "ArrowUp" || k === "z") { e.preventDefault(); inB ? (inBMenu || dispatchBattleInput("up")) : move("up") }
            else if (e.key === "ArrowDown" || k === "s") { e.preventDefault(); inB ? (inBMenu || dispatchBattleInput("down")) : move("down") }
            else if (e.key === "ArrowLeft" || k === "q") { e.preventDefault(); inB ? (inBMenu || dispatchBattleInput("left")) : move("left") }
            else if (e.key === "ArrowRight" || k === "d") { e.preventDefault(); inB ? (inBMenu || dispatchBattleInput("right")) : move("right") }
            else if (e.key === " " || e.key === "Enter" || k === "a") {
                e.preventDefault()
                if (inB) { if (!inBMenu) dispatchBattleInput("a") }
                else {
                    // ARÈNE JOUEUR : A près d'un reflet (≤1 case, DIAGONALES incluses) → défie le PLUS PROCHE
                    // (en plus du clic/tap). Chebyshev ≤1 = les 8 cases autour + la case occupée (avant : 4 cases ortho
                    // seulement → A ratait souvent les reflets qui errent ; le tactile, lui, ignorait la distance).
                    const cheb = (o: { x: number; y: number }) => Math.max(Math.abs(o.x - mapPlayer.posX), Math.abs(o.y - mapPlayer.posY))
                    // Reflets d'arène OU PNJ-joueurs run 2 (Grotte 1F) : A près (≤1 case) → défie le plus proche (comme le clic/tap).
                    const opp = [...arenaOpponents, ...visibleGhosts].filter((o) => cheb(o) <= 1).sort((a, b) => cheb(a) - cheb(b))[0]
                    if (opp) handleArenaClick(opp.userId) // même gate/lancement que le clic (dont la limite run 3 : 1 match miroir/jour)
                    else if (tryCasinoObjectA()) { /* table roulette / croupier (casino) */ }
                    else casinoAFallback()
                }
            }
            else if (e.key === "Escape" || k === "b" || k === "f") {
                // En combat avec menu pause ouvert → B referme le menu. Sinon B = combat.
                // Hors combat : ferme d'abord l'overlay le plus haut (goBack), sinon dialogue (pressB).
                e.preventDefault(); inB ? (inBMenu ? goBackRef.current() : dispatchBattleInput("b")) : (goBackRef.current() || pressB())
            }
            else if (e.key === "Tab") {
                // Start/Select = ouvre/ferme le menu pause (en combat aussi : viewers sûrs).
                e.preventDefault(); setMenu((m) => (m === "none" ? "pause" : "none"))
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [move, pressA, pressB, battle, menu, newDexEntry, evolutions, championRun, arenaFight, pendingLearn, arenaMode, arenaOpponents, mapPlayer, showDialogue, tryCasinoObjectA, casinoAFallback, kartOpen])

    // Identité (User.id) + carte courante → estampillage ownership/lieu à la capture.
    useEffect(() => { setCurrentPlayerId(userId) }, [userId])
    useEffect(() => { setCurrentNickname(nickname) }, [nickname]) // whitelist gate ACE → Cendreville
    useEffect(() => { setCurrentMapId(mapPlayer.mapId) }, [mapPlayer.mapId])

    // NOTIF SPRITES (Mools / créateur, dans le Nexus) : à la connexion, on liste les champions RÉCENTS
    // (Ligue terminée → Daemon créé avec placeholder MissingNo) pas encore vus, et on invite à générer
    // leur sprite conforme. 100% READ-ONLY (GET hall-of-fame existant), gate Mools/créateur, dédup par
    // joueur+date en localStorage. Différé de 6 s pour ne pas être écrasé par les toasts de bienvenue.
    useEffect(() => {
        if (!(isCreator || nickname.toLowerCase() === "mools")) return
        let cancelled = false
        const timer = window.setTimeout(async () => {
            try {
                const r = await fetch("/api/gamebook/yellow/hall-of-fame")
                const j = r.ok ? await r.json() : null
                const champs = (j?.champions ?? []) as { nickname: string; wonAt: string }[]
                const now = Date.now()
                const recent = champs.filter((c) => c.nickname && now - new Date(c.wonAt).getTime() < 5 * 86400000) // < 5 jours
                const KEY = "yellow_sprite_notif_seen"
                let seen: string[] = []
                try { seen = JSON.parse(localStorage.getItem(KEY) ?? "[]") } catch { seen = [] }
                const fresh = recent.filter((c) => !seen.includes(`${c.nickname}|${c.wonAt}`))
                if (!cancelled && fresh.length > 0) {
                    const names = [...new Set(fresh.map((c) => c.nickname))].join(", ")
                    setToast(`🎨 Sprite à générer : ${names} ${fresh.length > 1 ? "ont" : "a"} terminé la Ligue ! Génère le Daemon conforme (MissingNo en attendant).`)
                    try { localStorage.setItem(KEY, JSON.stringify([...seen, ...fresh.map((c) => `${c.nickname}|${c.wonAt}`)].slice(-100))) } catch { /* quota */ }
                }
            } catch { /* neutre (hors-ligne / table absente) */ }
        }, 6000)
        return () => { cancelled = true; window.clearTimeout(timer) }
    }, [isCreator, nickname])

    // Toast éphémère : disparaît tout seul après 2,5 s.
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 2500)
        return () => clearTimeout(t)
    }, [toast])

    // LEADERBOARD RUN 2 — visibilité LIVE : on remonte le score run 2 (note /1000) à CHAQUE CONNEXION (montage, une
    // fois hydraté) ET quand l'onglet passe en arrière-plan (≈ fin de session). Le serveur garde le meilleur par joueur
    // → chaque joueur EN COURS de run 2 apparaît au classement (avant, le score n'était envoyé qu'à la transition
    // run2→run3, d'où un classement run 2 vide). N'affecte pas run 3 (POST séparé à la clôture du run 3).
    useEffect(() => {
        if (!hydrated) return
        // Échantillonne le score COURANT : retient le PIC (record local, la note n'est pas monotone) puis remonte le
        // courant au classement. `post` = true seulement aux moments réseau (connexion / arrière-plan) ; l'intervalle
        // ne fait QUE mettre à jour le record local (pas de réseau toutes les 20 s).
        const sample = (post: boolean) => {
            if (getActiveWorld() !== "ngplus") return // seulement en run 2 (NG+)
            try {
                const sc = computeRunScores()
                if (recordStatMax("run2BestGrade", sc.grade)) persistYellowSave() // nouveau record → on fige tout de suite
                if (post) {
                    fetch("/api/gamebook/yellow/run-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: "run2", score: sc.grade, factors: leaderboardFactors(sc) }) }).catch(() => { /* hors-ligne : silencieux */ })
                }
            } catch { /* état non prêt : on ignore */ }
        }
        sample(true) // à la connexion : record + remontée classement
        const id = window.setInterval(() => sample(false), 20000) // capte les pics en cours de session (local only)
        const onHide = () => { if (document.visibilityState === "hidden") sample(true) } // fin de session (onglet caché/fermé)
        document.addEventListener("visibilitychange", onHide)
        return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onHide) }
    }, [hydrated])

    // Évite un flash à l'écran avant que l'état serveur soit chargé.
    // Si la requête échoue (offline / 403), on affiche quand même le state local.
    void hydrated

    // Équipe entièrement K.O. → renvoi immédiat au Centre Daemon (déjà soignée par le store de combat).
    // On warp dès que le combat est quitté. K.O. dans la Ligue → le gauntlet se rescelle (on rejouera
    // DEPUIS LA 1re SALLE), MAIS on ressort quand même au Centre Daemon : ainsi on peut se soigner et
    // aller se ré-entraîner entre deux tentatives (la Ligue est sans retour à l'intérieur).
    useEffect(() => {
        if (whiteout && !battle) {
            const aceTaunt = getAceLossTaunt() // lu AVANT clearWhiteout (qui l'efface) — null si défaite hors ACE
            const nemTaunt = getNemesisLossTaunt() // DÉFI NÉMÉSIS perdu → Caninombre scellé à jamais (lu AVANT clearWhiteout)
            if (mapPlayer.mapId.startsWith("yellow_fusion_")) {
                setMap("yellow_combat_autel", 9, 8) // KO en LIGUE DE FUSION → retour au DÔME DE FUSION (Autel), pas au Centre
            } else {
                if (mapPlayer.mapId.startsWith("yellow_ligue_")) resetLigueProgress()
                setMap("yellow_infirmary", 4, 3)
            }
            persistYellowSave()
            clearWhiteout()
            if (aceTaunt) showDialogue("y_ace", "ACE", [aceTaunt]) // raillerie d'ACE quand il t'a vaincu
            else if (nemTaunt) showDialogue("y_nemesis_challenge", "LE NÉMÉSIS", [nemTaunt]) // défaite au défi némésis
        }
    }, [whiteout, battle, setMap, mapPlayer.mapId, showDialogue])

    // DUEL reflet terminé (Viridian/arène eau) → récompenses post-combat, une fois le combat quitté
    // ET les éventuelles évolutions jouées. Victoire : cadeau Dieu des Nouilles + Nexus Ball (+ cadeau
    // croisé serveur au vrai joueur). Défaite : trashtalk de l'adversaire + 30 énergie « par pitié ».
    useEffect(() => {
        if (!duelResult || battle || evolutions.length > 0) return
        // REJEU : un duel-reflet joué dans une bulle ne reverse PAS d'énergie au VRAI adversaire (POST duel-gift) et
        //   ne compte pas — sinon faucet d'énergie inter-comptes + contournement du cap « 1 victoire/jour » (duelWins
        //   repart à zéro dans la bulle). On clôt le résultat sans aucun effet.
        if (activeWorld === "replay") { clearDuelResult(); duelOppRef.current = null; return }
        const opp = duelOppRef.current
        duelOppRef.current = null
        clearDuelResult()
        if (!opp) return
        if (duelResult.won) {
            recordDuelWin(opp.userId)
            if (duelResult.enemyHigher) recordMirrorWinHigherLevel() // badge « Reflet niveau-sup »
            addItem(DUEL_NEXUS_BALL_ID, 1)
            // Remboursement au KO : plus le vainqueur a perdu de Daemons (galère), plus il récupère d'énergie dépensée.
            const refund = Math.round(duelResult.energySpent * Math.min(6, duelResult.faints) / 6)
            if (refund > 0) grantReps(refund)
            // Drop 5 % : CT60 « Reflet Fatal » (inédite, jamais en vente). grantCt renvoie false si déjà possédée.
            const ctDropped = Math.random() < 0.05 && grantCt("ct60")
            // Énergie reversée au reflet = énergie dépensée, bornée comme le serveur ([30, 3000]) pour un affichage cohérent.
            const energyToOpp = Math.max(30, Math.min(3000, Math.floor(duelResult.energySpent)))
            persistYellowSave()
            // Partie C : cadeau croisé au VRAI joueur mirouté (best-effort, non bloquant) — il reçoit l'énergie du vainqueur.
            fetch("/api/gamebook/yellow/duel-gift", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toUserId: opp.userId, fromNickname: nickname, energy: duelResult.energySpent }),
            }).catch(() => {})
            showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, duelWinLines(opp.nickname, { refund, ctDropped, energyToOpp }))
        } else {
            grantReps(DUEL_LOSS_CONSOLE_REPS)
            persistYellowSave()
            showDialogue("duel_rival", opp.nickname, duelLossLines(opp.nickname))
        }
    }, [duelResult, battle, evolutions, nickname, showDialogue])

    // NG+ (run 2) — Maître vaincu : le combat FINAL vs ton DOUBLE se joue désormais dans la SALLE DORÉE (porte droite
    //   du trône → yellow_ligue_final, cf. gameStore/maps). On NE lance plus le combat ici : on consomme le flag et on
    //   guide le joueur vers la porte dorée. (Le combat, sans soin, part de l'interaction avec le double dans la salle.)
    useEffect(() => {
        if (!ngplusFinalPending) return
        if (battle || evolutions.length > 0 || championRun || dialogue) return
        clearNgplusFinalPending()
        setToast("🚪 Le Maître est vaincu… mais la porte DORÉE s'ouvre à droite. Ton ANCIEN TOI t'y attend.")
    }, [ngplusFinalPending, battle, evolutions.length, championRun, dialogue])

    // NG+ — issue du combat de fin de Ligue vs l'ancienne équipe. VICTOIRE = le VRAI sacre : le Hall of Fame vient
    //   d'être armé (championRun) par battleStore → on ATTEND qu'il se referme (championRun null) avant l'offre run 3.
    //   DÉFAITE = pas Maître (le sacre est différé) → whiteout (déjà géré) + il faut REFAIRE la Ligue.
    useEffect(() => {
        if (!ngplusFinalResult || battle || evolutions.length > 0 || championRun || dialogue) return
        const won = ngplusFinalResult.won
        clearNgplusFinalResult()
        if (won) {
            // ÉNERGIE en réserve à la clôture (capturée AVANT la fusion, qui remanie les reps) — sert au FLAVOR de
            // l'offre run 3 (« X⚡ en réserve »), PAS au classement.
            const ngplusScore = getPlayer().reps
            // LEADERBOARD run 2 : on remonte la NOTE GLOBALE /1000 de PERFORMANCE (3 facteurs : Pokédex ×500,
            //   % victoire ×300, Σ niveaux ×200 — énergie & pas RETIRÉS) — surtout PAS l'énergie brute (grind poker).
            //   computeRunScores lit l'état run 2 courant (avant fusion). Best-effort (le serveur garde le meilleur).
            // La clôture est un dernier échantillon : on grave le PIC du run avant de figer le recap.
            recordStatMax("run2BestGrade", computeRunScores().grade)
            const run2Sc = computeRunScores() // relu APRÈS le record → run2Sc.bestGrade est à jour
            const run2Grade = run2Sc.grade
            // Recap perso : on FIGE les scores (client, avec le MEILLEUR du run) pour pouvoir les rouvrir après le run 2
            //   (le menu ne les recalcule plus hors run 2). N'impacte pas le leaderboard serveur (score COURANT run 2).
            try { window.localStorage.setItem(RUN2_SCORES_LS_KEY, JSON.stringify(run2Sc)) } catch { /* ignore */ }
            setRun2Snap(run2Sc)
            fetch("/api/gamebook/yellow/run-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: "run2", score: run2Grade, factors: leaderboardFactors(run2Sc) }) }).catch(() => {})
            // On NE FUSIONNE PAS tout de suite : on PROPOSE le choix (fusionner OU lancer le run 3). L'overlay
            // ci-dessous appelle completeNewGamePlus (fusion 2-voies) OU launchRun3 (garde les 3 mondes gelés).
            setRun3Offer({ score: ngplusScore, bestGrade: run2Sc.bestGrade })
        } else {
            // Ton ancien toi t'a battu : tu n'es pas Maître. Il faut REFAIRE la Ligue (rebattre les 5, puis re-affronter
            // l'ancienne équipe). Le marqueur "Maître battu" a été retiré par battleStore → le combat final n'est plus
            // accessible tant que tu ne rebats pas le Maître.
            setToast("Ton ancien toi t'a vaincu — tu n'es pas encore Maître. Refais la Ligue pour retenter !")
        }
    }, [ngplusFinalResult, battle, evolutions.length, championRun, dialogue])

    // RUN 3 — FIN DU CONCOURS : deux conditions (choix Sartay) → MÉGA-FUSION 3-voies (retour en live).
    //   (a) 0⚡ : la source unique est épuisée. (b) SACRE : le joueur bat LE MAÎTRE de la Ligue (isChampion en
    //   run 3) → clôture au sommet. On attend l'écran LIBRE (fin de combat/cinématique/HoF — le sacre affiche
    //   d'abord son Hall of Fame via championRun, qu'on laisse se fermer). Ref anti-double (completeRun3 async).
    useEffect(() => {
        if (activeWorld !== "run3") { run3EndTriggeredRef.current = false; return }
        if (run3EndTriggeredRef.current) return
        const beatMaster = player.isChampion // en run 3, devenir Champion = avoir battu LE MAÎTRE
        // FIN « énergie » : le concours s'achève dès que le joueur ne peut plus s'offrir LA MOINDRE attaque de son
        //   équipe (le struggle gratuit reste, mais il ne permet plus de progresser). Évite que reps se fige sur un
        //   petit positif (< coût min) → le run ne se terminerait jamais avec un simple test reps===0.
        const quota = effectiveQuota(player.wildCtx?.quota)
        const moveCosts = player.team.flatMap((m) => { const hf = m.currentHp / Math.max(1, maxHpOf(m)); return m.moves.map((mv) => attackCost(getMove(mv.moveId), m.level, quota, hf)) })
        const minMoveCost = moveCosts.length ? Math.min(...moveCosts) : 1
        if (player.reps >= minMoveCost && !beatMaster) return
        if (battle || evolutions.length > 0 || championRun || dialogue || pendingLearn || newDexEntry || run3EndOffer) return
        run3EndTriggeredRef.current = true
        setRun3EndOffer({ score: run3Score(player.run3Defeated ?? []), reason: beatMaster ? "master" : "energy" })
    }, [activeWorld, player.reps, player.isChampion, player.run3Defeated, battle, evolutions.length, championRun, dialogue, pendingLearn, newDexEntry, run3EndOffer])

    // SACRE run 1 → une fois le dialogue-défi du Dieu des Nouilles refermé, on OUVRE le créateur en mode FORCÉ.
    useEffect(() => {
        if (!pendingForcedCreator || dialogue || battle || evolutions.length > 0 || championRun) return
        setPendingForcedCreator(false)
        setForcedCreator(true)
        setCreatorOpen(true)
    }, [pendingForcedCreator, dialogue, battle, evolutions.length, championRun])

    // FILET DE SÉCURITÉ (Franss & co.) : les flags pendingForcedCreator/forcedCreator sont LOCAUX (non persistés) →
    // un Champion qui ferme le wizard / recharge AVANT d'avoir créé son Daemon restait bloqué hors du créateur.
    // On le RÉ-OUVRE en mode forcé à chaque chargement tant que : isChampion & AUCUN custom & pas encore NG+.
    // Une fois créé (launchNewGamePlus → ngplusUsed), la condition tombe. Le ref évite de re-popper dans la même
    // session après une fermeture volontaire (on y revient via le bouton menu 🧬 ou le prochain chargement).
    const forcedCreatorRecoveredRef = useRef(false)
    useEffect(() => {
        if (forcedCreatorRecoveredRef.current || creatorOpen || dialogue || battle || evolutions.length > 0 || championRun) return
        // REJEU : ne JAMAIS rouvrir le créateur forcé dans une bulle (un rejeu run 1 rend isChampion=true & ngplusUsed=false
        //   → sinon un Daemon créé fuiterait dans le vrai monde via le Pokédex/customDaemons globaux). Cf. sacre l.3409.
        if (activeWorld === "replay") return
        if (player.isChampion && !player.ngplusUsed && (player.customDaemons?.length ?? 0) === 0) {
            forcedCreatorRecoveredRef.current = true
            setForcedCreator(true)
            setCreatorOpen(true)
        }
    }, [player.isChampion, player.ngplusUsed, player.customDaemons, dialogue, battle, evolutions.length, championRun, creatorOpen])

    // NG+ — après l'offre d'abandon de CHEN (dialogue refermé), ouvre l'overlay de CONFIRMATION (action irréversible).
    useEffect(() => {
        if (!pendingNgplusAbandon || dialogue || battle) return
        useGameStore.setState({ pendingNgplusAbandon: false })
        setAbandonConfirm(true)
    }, [pendingNgplusAbandon, dialogue, battle])

    // LIGUE — SACRE : dès que le championRun est posé (victoire sur LE MAÎTRE), on grave l'équipe
    // au Hall of Fame PARTAGÉ et on récompense tous les autres joueurs (+1/3 de leur quota). Une seule
    // fois par sacre — la ref se réarme quand le générique se ferme (clearChampion → championRun=null).
    const champReportedRef = useRef(false)
    useEffect(() => {
        if (!championRun) { champReportedRef.current = false; return }
        // REJEU : un sacre « bis » ne se grave PAS au Hall of Fame réel et ne récompense PAS les autres joueurs
        //   (+1/3 de quota) → sinon rejouer en boucle = faucet d'énergie communautaire / pollution du HoF.
        if (activeWorld === "replay") return
        if (champReportedRef.current) return
        champReportedRef.current = true
        fetch("/api/gamebook/yellow/hall-of-fame", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team: championRun.team, world: activeWorld }), // world : run 1/2/3 → HoF Ligue séparé
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                // DÉCUPLE DÉTENTEUR : 10 victoires de Ligue → CT-trophée Souffle Primordial (une seule fois).
                if (j?.wins >= 10 && grantCt("ct37")) {
                    persistYellowSave()
                    setToast("👑 DÉCUPLE CHAMPION ! Tu reçois la CT37 — Souffle Primordial !")
                }
            })
            .catch(() => {})
    }, [championRun])

    // ARÈNE — CONQUÊTE : dès qu'un badge est gagné (arenaRun posé), on grave l'équipe victorieuse au
    // Hall of Fame de CETTE arène. Une seule fois (la ref se réarme au clear du badge → arenaRun=null).
    const arenaReportedRef = useRef(false)
    useEffect(() => {
        if (!arenaRun) { arenaReportedRef.current = false; return }
        // REJEU : une conquête d'arène « bis » ne se grave PAS au Hall of Fame d'arène RÉEL (partagé) et ne
        //   déclenche PAS le bonus de parrainage (arena-champions POST → fanOutSponsorGift). Miroir du sacre (l.1040).
        if (activeWorld === "replay") return
        if (arenaReportedRef.current) return
        arenaReportedRef.current = true
        // RUN 2/3 : arènes re-typées → HoF SÉPARÉ (badge préfixé "ngplus:" / "run3:") pour ne pas polluer le run 1.
        const badgeId = arenaRun.world === "ngplus" ? `ngplus:${arenaRun.badgeId}` : arenaRun.world === "run3" ? `run3:${arenaRun.badgeId}` : arenaRun.badgeId
        fetch("/api/gamebook/yellow/arena-champions", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ badgeId, team: arenaRun.team }),
        }).catch(() => {})
    }, [arenaRun])

    // Victoire sur le sbire : on délivre une explication sur l'app, une fois le
    // combat quitté ET l'éventuelle cinématique d'évolution terminée.
    useEffect(() => {
        if (sbireWin !== null && !battle && evolutions.length === 0) {
            const reward = getSbireRewardMsg()
            const lines = [...sbireExplanation(sbireWin), ...(reward ? [reward] : [])]
            showDialogue("y_sbire", "SBIRE", lines)
            clearSbireWin()
        }
    }, [sbireWin, battle, evolutions.length, showDialogue])

    // ACE vaincu : message de récompense post-combat (revanche le lendemain, plus fort).
    useEffect(() => {
        if (aceWin !== null && !battle && evolutions.length === 0) {
            const reward = getAceRewardMsg()
            // Concession d'ACE PIOCHÉE AU HASARD (différente à chaque défaite) + le message de récompense.
            const lines = [aceLoseLine(), ...(reward ? [reward] : [])]
            showDialogue("y_ace", "ACE", lines)
            clearAceWin()
        }
    }, [aceWin, battle, evolutions.length, showDialogue])

    // Badge d'arène gagné : notification claire (sinon le joueur a l'impression de rien recevoir).
    useEffect(() => {
        if (badgeAwarded && !battle && evolutions.length === 0) {
            const run3 = activeWorld === "run3"
            // RUN 3 : les arènes sont re-typées aux GARDIENS (aperçu de la Ligue) → on annonce l'arène par ce type,
            //   pas par son type du run 1. Et on ne promet NI CT NI ticket (le concours n'a ni boutique ni casino).
            const labels: Record<string, string> = run3
                ? { plante: "GLACE", roche: "COMBAT", feu: "SPECTRE", elec: "DRAGON", eau: "PRISME" }
                : { plante: "FEUILLE", feu: "FLAMME", eau: "GOUTTE", roche: "ROCHE", elec: "ÉCLAIR" }
            const lbl = labels[badgeAwarded] ?? badgeAwarded.toUpperCase()
            const lines: string[] = []
            if (run3) {
                lines.push(`🎖️ Tu conquiers l'ARÈNE ${lbl} !`)
                lines.push("Le Dieu Spaghetti te crédite ton PALIER D'ÉNERGIE du concours — file vers l'arène suivante !")
            } else {
                const giftMove = getGiftCtMove()
                lines.push(`🎖️ Tu obtiens le BADGE ${lbl} !`)
                lines.push("Ton plafond de reps grimpe (+250) et de nouvelles CT s'ouvrent à la boutique.")
                if (giftMove) lines.push(`🎁 Tu reçois la CT « ${giftMove} » ! Apprends-la à un Daemon compatible — cadeau unique.`)
                lines.push(`🎟️ Et un ticket roulette de ${ARENA_TICKET_VALUE} énergies — joue-le à ta prochaine connexion !`)
            }
            showDialogue("y_gym_sign", "ARÈNE", lines)
            clearBadgeAwarded()
        }
    }, [badgeAwarded, battle, evolutions.length, showDialogue, activeWorld])

    // PIERRE GÉKROC : don de la Pierre d'Évolution après avoir battu/capturé Gékroc (Centrale) →
    // notification claire post-combat (sinon le don, objet "objet clé", passait totalement inaperçu).
    useEffect(() => {
        if (stoneReward && !battle && evolutions.length === 0) {
            showDialogue("y_gekroc", "PIERRE GÉKROC", [stoneReward])
            clearStoneReward()
        }
    }, [stoneReward, battle, evolutions.length, showDialogue])

    // LIGUE DE FUSION — SACRE (Dieu Spaghetti) : grave le roster vainqueur au Hall of Fame partagé (POST une fois,
    //   puis on efface le signal). Best-effort (silencieux hors-ligne). Récompense narrative, pas de blocage UI.
    useEffect(() => {
        if (!fusionSacre) return
        fetch("/api/gamebook/yellow/fusion-hall-of-fame", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: fusionSacre.tier, team: fusionSacre.team }),
        }).catch(() => { /* hors-ligne : silencieux */ })
        // ÉPILOGUE : on FIGE le roster vainqueur AVANT le clear (fusionSacre disparaît juste après). Le panneau (Acte II)
        //   le rejoue ; bst calculé ici car absent de FusionChampionMon (sert au marquage « le plus puissant »).
        setFusionEpilogue({
            tier: fusionSacre.tier,
            roster: fusionSacre.team.map((m) => ({
                name: m.name, sprite: m.sprite, types: m.types, level: m.level,
                bst: m.stats.hp + m.stats.atk + m.stats.def + m.stats.spe + m.stats.spc,
            })),
        })
        clearFusionSacre()
    }, [fusionSacre])

    // 🐉🪨 MÉGAMONARX — CINÉMATIQUE HISTORIQUE : un Dracolithe niv 100 a remporté la Ligue de Fusion et TRANSCENDE en
    //   3ᵉ légendaire. Le Daemon est déjà en équipe/PC (grantMegamonarx). On fige la save (événement critique) et le
    //   Dieu Spaghetti narre la naissance de la « fusion infinie ». One-shot (signal effacé après lecture).
    useEffect(() => {
        if (!megamonarxReveal) return
        persistYellowSaveNow()
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            "*Le sol du Nexus se fissure. Ton Dracolithe, sacré champion de la Fusion, se met à irradier d'une lumière que nul œil n'a jamais contemplée…*",
            "« IM… IMPOSSIBLE. La fusion parfaite, poussée à son APOGÉE ABSOLUE… Elle ne se contente plus d'unir deux âmes. Elle en FORGE une TROISIÈME. »",
            "*La roche et le dragon rugissent d'une seule voix. Des cristaux de pierre vive jaillissent de sa carapace ; ses ailes déchirent le ciel du Nexus. La terre tremble.*",
            "« Contemple, Maître. Ce que tu vois n'est PLUS un Dracolithe. C'est la FUSION INFINIE faite chair — une légende née de tes mains, à l'identité propre. »",
            "🐉🪨 « MÉGAMONARX s'éveille. Le 3ᵉ légendaire du Nexus. Immortel. Colossal. Et il est TIEN — à jamais. Que ton nom résonne dans l'éternité, champion. »",
        ])
        clearMegamonarxReveal()
    }, [megamonarxReveal, showDialogue])

    // LIGUE DE FUSION : à la fin d'un combat, les fusionnés reversent la moitié de leur XP à leurs parents →
    // notification (une fois l'écran libre, sans écraser un prompt d'apprentissage / dialogue en cours).
    useEffect(() => {
        if (fusionParentReward && !battle && evolutions.length === 0 && !pendingLearn && !dialogue) {
            showDialogue("y_fusion_altar", "AUTEL DE LA CHIMÈRE", [fusionParentReward])
            clearFusionParentReward()
        }
    }, [fusionParentReward, battle, evolutions.length, pendingLearn, dialogue, showDialogue])

    // RUN 3 — TEASER DIEU SPAGHETTI sur LAVAPETIT : pop-up post-combat, une fois l'écran LIBRE (on attend la fin
    // de la popup 1re-capture / cinématique d'évolution / prompt d'apprentissage pour ne rien écraser).
    useEffect(() => {
        if (lavapetitTeaser && !battle && !newDexEntry && evolutions.length === 0 && !pendingLearn && !dialogue && !championRun && !run3EndOffer) {
            showDialogue(DUEL_DREAM_NPC, "✨ Dieu Spaghetti", lavapetitTeaser === "caught" ? SPAG_LAVAPETIT_CAUGHT_LINES : SPAG_LAVAPETIT_TEASER_LINES)
            clearLavapetitTeaser()
        }
    }, [lavapetitTeaser, battle, newDexEntry, evolutions.length, pendingLearn, dialogue, championRun, run3EndOffer, showDialogue])

    // LIGUE DE FUSION — OFFRE FUSIO-BALL (Dieu Spaghetti) au sacre : modale d'achat post-combat, une fois l'écran
    // LIBRE (après l'annonce de victoire du reflet + toute cinématique) pour ne rien écraser.
    useEffect(() => {
        // !fusionParentReward : au sacre, le message « parents entraînés » et cette offre partent dans le MÊME flush ;
        //   sans ce gate, le modal (zIndex 9500) recouvrirait le message avant lecture. On attend qu'il soit consommé.
        if (fusioBallOffer && !battle && evolutions.length === 0 && !dialogue && !newDexEntry && !pendingLearn && !championRun && !fusionParentReward) {
            fusioBuyingRef.current = false // ré-arme le verrou d'achat pour cette offre
            fusioReofferShownRef.current = true // l'offre du sacre COMPTE comme la proposition de cette session
            setFusioBallModal(true)
            clearFusioBallOffer()
        }
    }, [fusioBallOffer, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun, fusionParentReward])

    // BOUCLE ENDGAME — OFFRE « recrée ton Daemon & repars » : posée par finishBattle (capture Ukognofy / sacre OR),
    //   consommée ici une fois l'écran LIBRE. On s'enchaîne APRÈS l'offre Fusio-Ball (au sacre OR, les deux partent
    //   dans le même flush) via !fusioBallModal && !fusioBallOffer. Jamais en bulle de rejeu (double garde).
    useEffect(() => {
        if (loopOffer && !battle && evolutions.length === 0 && !dialogue && !newDexEntry && !pendingLearn && !championRun
            && !fusionParentReward && !fusioBallOffer && !fusioBallModal && !fusionSacre && getActiveWorld() !== "replay") {
            setLoopModal(true)
            clearLoopOffer()
        }
    }, [loopOffer, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun, fusionParentReward, fusioBallOffer, fusioBallModal, fusionSacre])

    // ÉPILOGUE « MAÎTRE DE LA CHIMÈRE » — après le sacre, EN DERNIER (une fois toutes les modales/cinématiques du sacre
    //   consommées : Fusio-Ball, boucle, Mégamonarx…), le Dieu Spaghetti prononce son laïus (EPILOGUE_INTRO_LINES) ;
    //   à la fermeture du dialogue, le panneau riche (3 actes) se monte via epiloguePending && !dialogue (cf. JSX).
    //   Gardes !loopCreatorOpen && world != "replay" : au sacre OR, si le joueur ACCEPTE la boucle (créateur ouvert →
    //   bascule en monde "replay"), l'épilogue ne doit PAS recouvrir le créateur ni surgir dans la bulle de rejeu (où
    //   player/pokedex refléteraient l'état replay). L'état épilogue est aussi vidé à l'acceptation de la boucle.
    useEffect(() => {
        if (fusionEpilogue && !epiloguePending && !battle && evolutions.length === 0 && !dialogue && !newDexEntry
            && !pendingLearn && !championRun && !fusionParentReward && !fusioBallOffer && !fusioBallModal
            && !loopOffer && !loopModal && !loopCreatorOpen && !megamonarxReveal && getActiveWorld() !== "replay") {
            showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, EPILOGUE_INTRO_LINES)
            setEpiloguePending(true)
        }
    }, [fusionEpilogue, epiloguePending, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun, fusionParentReward, fusioBallOffer, fusioBallModal, loopOffer, loopModal, loopCreatorOpen, megamonarxReveal, showDialogue])

    // FUSIO-BALL — RE-PROPOSITION : offre EN ATTENTE (non achetée au sacre, marker fusioball_owed) + reps ≥ seuil →
    //   le Dieu Spaghetti la re-propose au MAX 1×/JOUR (marker daté persisté = anti-spam ; avant : 1×/session → re-pop à
    //   chaque rechargement). S'arrête net à l'achat (owed retiré).
    useEffect(() => {
        const today = player.creditedThrough || new Date().toISOString().slice(0, 10)
        const dayMarker = FUSIOBALL_REOFFER_PREFIX + today
        if (player.reps >= FUSIOBALL_REOFFER_REPS && player.defeatedTrainers.includes(FUSIOBALL_OWED_MARKER)
            && !player.defeatedTrainers.includes(dayMarker) && !fusioReofferShownRef.current
            && !fusioBallModal && !battle && evolutions.length === 0 && !dialogue && !newDexEntry && !pendingLearn && !championRun) {
            fusioReofferShownRef.current = true
            fusioBuyingRef.current = false
            markTrainerDefeated(dayMarker) // marque le jour → plus de pop aujourd'hui (persisté)
            persistYellowSave()
            setFusioBallModal(true)
        }
    }, [player.reps, player.defeatedTrainers, player.creditedThrough, fusioBallModal, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun])

    // PNJ 6 — OFFRE D'ÉCHANGE (Crocavern ↔ team[0]) post-victoire : modale une fois l'écran LIBRE (après l'annonce
    // de victoire), comme l'offre Fusio-Ball.
    useEffect(() => {
        if (pnj6TradeOffer && !battle && evolutions.length === 0 && !dialogue && !newDexEntry && !pendingLearn && !championRun) {
            pnj6TradingRef.current = false // ré-arme le verrou d'échange pour cette offre
            setPnj6Modal(true)
            clearPnj6TradeOffer()
        }
    }, [pnj6TradeOffer, battle, evolutions.length, dialogue, newDexEntry, pendingLearn, championRun])

    // CARROUSEL GÉNÉTIQUE (one-shot) : après une capture, une fois l'écran libéré (popup Pokédex /
    // évolutions / apprentissage passés), le Dieu Spaghetti explique le potentiel/IV. UNE SEULE FOIS.
    useEffect(() => {
        if (!justCaught) return
        if (battle || newDexEntry || evolutions.length > 0 || pendingLearn || dialogue || championRun) return
        clearJustCaught() // consommé : on ne re-déclenche pas
        if (!getPlayer().labDefi.geneIntroSeen) setShowGeneIntro(true)
    }, [justCaught, battle, newDexEntry, evolutions.length, pendingLearn, dialogue, championRun])

    // BOSS À 2 PHASES (VOLTA) : une fois la notif de badge fermée, on enchaîne DIRECTEMENT son rematch (phase 2).
    useEffect(() => {
        if (chainRematchId && !battle && evolutions.length === 0 && !dialogue && !badgeAwarded) {
            launchRematch(chainRematchId)
            clearChainRematch()
        }
    }, [chainRematchId, battle, evolutions.length, dialogue, badgeAwarded, launchRematch])

    // ZONE DE COMBAT — ISSUE d'une vague (après que le combat soit quitté + évolutions jouées).
    // Victoire → on avance la série (JC + remboursement énergie via runStore/battleStore) ; défaite →
    // fin de série (résumé + clôture). Le lancement de la vague suivante est géré par l'effet ci-dessous.
    useEffect(() => {
        if (!frontierResult || battle || evolutions.length > 0) return
        // DÔME (bracket) : `run` est null ; on avance le bracket selon l'issue du match du joueur.
        if (dome && dome.state.status === "active") {
            const won = frontierResult.won
            // REMBOURSEMENT ÉNERGIE DIFFÉRÉ (Dôme) : on cumule le remboursement du match (10→100 % de l'énergie
            //   dépensée, uniquement si gagné — même barème que la Tour) et on ne crédite RIEN entre les matchs.
            //   Tout est versé d'un coup à la CLÔTURE du bracket (cf. « à la fin du tournoi, pas avant match »).
            const matchRefund = won ? frontierEnergyRefund(frontierResult.energySpent) : 0
            const accrued = dome.energyAccrued + matchRefund
            const rng = new Rng((dome.seed ^ ((dome.state.round + 1) * 0x9e3779b1)) >>> 0)
            const next = advanceDome(dome.state, rng, won)
            if (next.status === "active") {
                setDome({ ...dome, state: next, energyAccrued: accrued }) // manche suivante : on REPASSE par l'intro (bracket + adversaire)
                setDomePause(true)
            } else {
                // Classement final dans le bracket de 8 (helper pur testé) : 1er (titre) / 2e (finale) / demi / quart.
                const placement = domeFinalPlacement(next.status === "won", dome.state.round)
                const refund = domeEnergyRefund(dome.bet, placement) // ≤ mise (faucet-safe)
                const jc = domeJcReward(dome.bet, dome.tier, placement) // Jetons ∝ mise
                // `force` : rembourse AUSSI en run3 (symétrique au débit spendReps qui, lui, n'a pas de garde run3).
                // Faucet-safe garanti (refund ≤ mise déjà débitée). On affiche le montant RÉELLEMENT crédité.
                const credited = refund > 0 ? grantReps(refund, true) : 0
                // Remboursement DIFFÉRÉ de l'énergie d'attaque : cumulé sur les matchs GAGNÉS du tournoi, versé UNE
                //   SEULE fois ICI (clôture) au lieu d'après chaque match — cf. « à la fin du tournoi, pas avant match ».
                const energyBack = accrued > 0 ? grantReps(accrued, true) : 0
                const totalBack = credited + energyBack // ⚡ total rendu à la clôture (remboursement de mise + énergie d'attaque)
                // Progression (débloque le tier suivant) UNIQUEMENT en gagnant à SON tier-frontière (le + haut débloqué) :
                // rejouer un tier déjà maîtrisé rapporte JC/⚡ mais AUCUN nouveau titre (gate par compétence, pas par grind).
                const atFrontier = dome.tier === maxUnlockedTier(getPlayer().domeChampionships)
                // Nouveau titre : à son tier-frontière ET seulement tant que tous les tiers ne sont pas déjà vaincus (Maître = plafond).
                const gainedTitle = next.status === "won" && atFrontier && getPlayer().domeChampionships < DOME_TIERS.length
                if (gainedTitle) {
                    recordDomeChampionship()
                    // PANTHÉON DU DÔME : grave l'équipe gagnante + le palier (partagé, consultable au Hall of Fame → onglet
                    //   DÔME). Best-effort ; JAMAIS en REJEU (bulle jetable) pour ne pas polluer le palmarès. Cf. dome-hall-of-fame/.
                    if (getActiveWorld() !== "replay") {
                        void fetch("/api/gamebook/yellow/dome-hall-of-fame", {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ team: freezeChampionTeam(getPlayer().team), tier: dome.tier }),
                        }).catch(() => { /* hors-ligne : silencieux */ })
                    }
                }
                recordDomeResult(won) // bilan DÔME (tournoi remporté / perdu) — stats Dôme dédiées
                void persistYellowSaveNow() // IMMÉDIAT (non débouncé) : le titre/JC/⚡ atteint le serveur AVANT que le joueur puisse quitter l'app (fini la perte de palier)
                const roundsWon = won ? DOME_ROUNDS : dome.state.round
                postRecordRun({ mode: "DOME", streak: Math.max(0, roundsWon), jcEarned: jc }) // crédite le JC (serveur)
                setToast(next.status === "won"
                    ? (gainedTitle
                        ? `🏆 DÔME REMPORTÉ — nouveau titre ${DOME_TITLES[dome.tier]} ! +${jc} 🪙 · ${totalBack} ⚡ · ${getPlayer().domeChampionships} tiers vaincus`
                        : `🏆 ${DOME_TITLES[dome.tier]} remporté ! +${jc} 🪙 · ${totalBack} ⚡ (déjà maîtrisé — pas de nouveau titre)`)
                    : `🏆 Dôme — ${["quart", "demi", "finale"][dome.state.round] ?? "manche"} : +${jc} 🪙 · ${totalBack} ⚡ rendus.`)
                setDome(null)
                setDomePause(false)
            }
            clearFrontierResult()
            return
        }
        if (frontierResult.won) {
            // USINE : les JETONS tombent à CHAQUE victoire (applyWin). La CT, elle, n'est offerte QUE lorsqu'on
            // vient de battre un BOSS (Cerveau, tous les 7) — sinon elle arrivait beaucoup trop vite. curRun =
            // la vague battue (AVANT applyWin), donc curRun.isBoss = « la vague qu'on vient de gagner était un boss ».
            const curRun = getRun() // run courant (= la vague battue, avant applyWin) — lu hors réactivité (pas de dep)
            if (curRun?.mode === "FACTORY" && curRun.isBoss) {
                const opts = ctRewardOptionsForTeam(curRun.opponent).filter((id) => !getPlayer().ownedCts.includes(id) && !getPlayer().boughtCts.includes(id))
                setUsineCt(opts.length ? opts : null)
            }
            applyWinFromBattle(getBattleEnergy().spent)
            setTourChoice(true) // PAUSE entre vagues : le joueur choisit Continuer / Quitter
        } else {
            const ended = applyLossFromBattle()
            if (ended && !frontierReportedRef.current) {
                frontierReportedRef.current = true
                // persiste JC + record (serveur, neutre si table absente) → le profil frais met à jour le statut CHAMPION
                postRecordRun({ mode: ended.mode, streak: ended.streak, jcEarned: ended.jc }).then((p) => { if (p) setFrontierProf(p) })
                setToast(`🏯 Série terminée — ${ended.streak} victoire(s) · ${ended.jc} JC enregistrés`)
            }
            endRun()
        }
        clearFrontierResult()
    }, [frontierResult, battle, evolutions.length, dome])

    // ZONE DE COMBAT — LANCEMENT de la vague courante : série active + écran libre (pas de combat, ni
    // issue en attente, ni overlay) → on envoie l'équipe contre `run.opponent`. Gardé pour ne jamais
    // boucler (un combat en cours ou une issue non traitée bloquent le relancement).
    useEffect(() => {
        if (!run || run.status !== "active") return
        if (tourChoice) return // pause entre vagues : on attend le choix Continuer/Quitter
        if (battle || frontierResult || evolutions.length > 0 || dialogue || pendingLearn || newDexEntry) return
        // SOIN tous les BOSS_EVERY (7) combats, façon Tour de Combat Émeraude : on soigne au DÉBUT d'un
        // BLOC de 7 (vagues 1, 8, 15…), PAS entre chaque vague → tenir la distance sur la série EST le défi.
        // Les PV se conservent d'une vague à l'autre (finishBattle persiste l'équipe). L'Usine (location)
        // n'est pas soignée ici (équipe fraîche à chaque vague, géré à part).
        if (run.mode === "TOWER" && run.streak % BOSS_EVERY === 0) healAllTeam()
        // FACTORY : on joue l'équipe de LOCATION draftée ; Tour/Dôme : l'équipe réelle du joueur (soignée ci-dessus).
        const myTeam = run.mode === "FACTORY" ? (getDraftedTeam() ?? getPlayer().team) : getPlayer().team
        if (run.isBoss && run.bossName) setToast(`👑 ${run.bossName} entre en scène !`)
        // IA graduée dans toute la Zone de Combat : boss/Cerveaux = « hof » (la + maligne : dégâts attendus,
        // ouverture statut, switch anti-yo-yo), vagues normales = « ace » (switch sur mauvais matchup). Fini le « trainer » basique.
        startTrainerBattle(myTeam, buildFrontierEnemies(run.opponent), Math.floor(Math.random() * 1e9), { trainerId: "frontier:" + run.mode, aiLevel: run.isBoss ? "hof" : "ace" })
    }, [run, tourChoice, battle, frontierResult, evolutions.length, dialogue, pendingLearn, newDexEntry])

    // DÔME — lance le match du round courant (TON équipe vs ton adversaire de bracket) tant que le tournoi
    // est actif et l'écran libre. L'issue est traitée par l'effet de résultat (advanceDome).
    useEffect(() => {
        if (!dome || dome.state.status !== "active") return
        if (domePause) return // écran d'intro affiché : on attend que le joueur clique « Affronter »
        if (battle || frontierResult || evolutions.length > 0 || dialogue || pendingLearn || newDexEntry) return
        const opp = playerOpponent(dome.state)
        if (!opp) return
        // SOIN COMPLET avant CHAQUE manche (décision design : le Dôme resoigne entre les matchs → chaque
        // manche se joue à équipe FRAÎCHE, PV/PP/statuts restaurés). Cf. écran d'intro du Dôme.
        healAllTeam()
        // DIFFICULTÉ CROISSANTE : en quart (round 0) l'IA envoie son 1er Daemon ; en demi/finale
        // (round ≥ 1) elle OUVRE avec son MEILLEUR matchup de type contre ton équipe visible (aiLeadIndex).
        let oppTeam = opp.team
        if (dome.state.round >= 1) {
            const pTeam = getPlayer().team.map((m) => ({ speciesId: m.speciesId, level: m.level }))
            const lead = aiLeadIndex(opp.team, pTeam)
            oppTeam = [opp.team[lead], ...opp.team.filter((_, i) => i !== lead)]
        }
        // Dôme : difficulté croissante aussi côté IA — quart = « ace », demi/finale = « hof » (la + maligne).
        // EV/Saiyan des ennemis : budget du tier ESCALADÉ par la manche (quart < demi < finale, cf. roundBudget) — Dôme-only.
        const rb = roundBudget(DOME_BUDGETS[dome.tier], dome.state.round)
        const domeTrain = { ev: rb.evPerMon, saiyan: rb.saiyanPerMon }
        startTrainerBattle(getPlayer().team, buildFrontierEnemies(oppTeam, domeTrain), Math.floor(Math.random() * 1e9), { trainerId: "frontier:DOME", aiLevel: dome.state.round >= 1 ? "hof" : "ace" })
    }, [dome, domePause, battle, frontierResult, evolutions.length, dialogue, pendingLearn, newDexEntry])

    // ZONE DE COMBAT — INSTANTANÉ de la série (anti-abandon au refresh). On (ré)écrit à chaque
    // changement de run/dome/pause ; n'écrit RIEN tant que la reprise au boot n'a pas eu lieu.
    // (draftedTeam n'est pas réactif → lu au moment de l'écriture ; il ne change qu'avec le run.)
    useEffect(() => {
        if (!frontierResumedRef.current) return
        writeFrontierSnap({ v: 1, ts: Date.now(), run, draftedTeam: getDraftedTeam(), dome, tourChoice, usineCt })
    }, [run, dome, tourChoice, usineCt])

    // TICKET ROULETTE QUOTIDIEN : à la 1re connexion du jour (chap. 2), une fois l'intro passée et l'écran
    // libre, on ouvre la cinématique du Dieu Spaghetti (1×/session ; consommé à la fermeture).
    useEffect(() => {
        if (ticketChecked.current || !hydrated || ticketOpen) return
        if (getActiveWorld() === "run3") return // RUN 3 : casino/tickets FERMÉS → aucune cinématique ni don de ticket
        if (!getPlayer().introSeen) return
        if (battle || dialogue || evolutions.length > 0 || pendingLearn || newDexEntry || championRun || whiteout) return
        const today = getPlayer().creditedThrough
        if (!today) return // jour serveur pas encore connu (player-stats non chargé)
        ticketChecked.current = true
        // ONE-SHOT : la cinématique du Dieu Spaghetti ne s'ouvre qu'UNE SEULE FOIS dans la vie du joueur
        // — juste un rappel « la roulette existe ». Ensuite on la joue à la demande au labo (tickets de
        // boss, visibles dans le sac). On marque + persiste DÈS l'ouverture → jamais de re-pop, même au refresh.
        if (!getPlayer().labDefi.spagRouletteSeen) {
            markSpagRouletteSeen()
            persistYellowSave()
            setTicketOpen(true)
        } else if (!getPlayer().labDefi.spagWelcomeGift) {
            // CADEAU DE BIENVENUE (one-shot à vie) : le Dieu Spaghetti offre 3 tickets roulette "spag"
            // (à JOUER au labo, non rachetables par le barman) + un message d'invitation à les dépenser.
            const n = claimSpagWelcomeTickets()
            if (n > 0) {
                persistYellowSave()
                showDialogue(DUEL_DREAM_NPC, "✨ Dieu Spaghetti", [
                    "*Le Dieu Spaghetti se matérialise dans un tourbillon de semoule dorée…*",
                    `« Mortel ! Pour fêter la grande roulette, je t'offre ${n} JETONS. »`,
                    "« File les claquer sur la table de la roulette — la fortune sourit aux audacieux ! »",
                ])
            }
        }
    }, [hydrated, ticketOpen, battle, dialogue, evolutions.length, pendingLearn, newDexEntry, championRun, whiteout, showDialogue])

    // ÉVÉNEMENT DIABLES ROUGES (02-07) : quiz du score exact → 100 d'énergie casino. 1× (flag localStorage).
    useEffect(() => {
        if (belgiumChecked.current || !hydrated || belgiumOpen || ticketOpen) return
        if (!getPlayer().introSeen) return
        if (battle || dialogue || evolutions.length > 0 || pendingLearn || newDexEntry || championRun || whiteout) return
        if (!diablesRougesAvailable(getPlayer().creditedThrough)) return
        belgiumChecked.current = true
        setBelgiumOpen(true)
    }, [hydrated, belgiumOpen, ticketOpen, battle, dialogue, evolutions.length, pendingLearn, newDexEntry, championRun, whiteout])

    // CASINO — jetons cachés au sol : générés 1×/jour à l'entrée (today + bonus quota connus). Idempotent
    // (ensureDailyChips ne régénère pas si déjà fait aujourd'hui). On persiste seulement si génération.
    useEffect(() => {
        if (!inCasino || !hydrated) return
        const today = getPlayer().creditedThrough
        if (!today) return
        if (ensureDailyChips(today, getPlayer().wildCtx?.quotaReached === true)) persistYellowSave()
    }, [inCasino, hydrated])

    // ÉVÉNEMENT D'UN JOUR (Dieu Spaghetti) : au 10e PAS de la journée — le jour J uniquement — il offre un
    // CRÉDIT roulette (divisible, à jouer à la table). On compte les pas en surveillant les changements de
    // position sur une MÊME carte (les téléports ne comptent pas). Crédit one-shot (flag persistant).
    useEffect(() => {
        if (!hydrated || battle) return
        const cur = { x: mapPlayer.posX, y: mapPlayer.posY, mapId: mapPlayer.mapId }
        const prev = stepPrevPosRef.current
        stepPrevPosRef.current = cur
        if (!prev || prev.mapId !== cur.mapId || (prev.x === cur.x && prev.y === cur.y)) return // 1re pos / téléport / immobile
        stepCountRef.current += 1
        // ÉVÉNEMENT DU GLAND (07-07 uniquement) : à 14 pas → carton rouge injuste (−14⚡) ; 14 pas plus tard →
        // le Dieu Spaghetti rétablit la justice (+14 tickets casino). Une modale à la fois (flags localStorage).
        if (getPlayer().creditedThrough === GLAND_EVENT_DATE && glandModal === null) {
            if (!glandCartonDone() && stepCountRef.current >= GLAND_STEP_INTERVAL) {
                glandCartonStepRef.current = stepCountRef.current
                setGlandModal("carton")
            } else if (glandCartonDone() && !glandJusticeDone() && stepCountRef.current >= (glandCartonStepRef.current ?? 0) + GLAND_STEP_INTERVAL) {
                setGlandModal("spag")
            }
        }
        if (stepCountRef.current < STEP_GIFT_THRESHOLD || spagStepGiftDone()) return
        if (getPlayer().creditedThrough !== STEP_GIFT_DATE) return // événement d'un seul jour
        const n = claimSpagStepGift()
        if (n > 0) {
            persistYellowSave()
            showDialogue(DUEL_DREAM_NPC, "✨ Dieu Spaghetti", [
                "*Le Dieu Spaghetti jaillit du sol dans une gerbe de semoule dorée…*",
                `« Dix pas, mortel ! Pour fêter ça — aujourd'hui SEULEMENT — voici ${n} crédits de roulette, OFFERTS ! »`,
                "« La grande ROULETTE t'attend dans le BÂTIMENT MULTIJOUEUR — et grande nouvelle : le BAR est ENFIN OUVERT ! 🍸 »",
                "« File claquer tes crédits à la table, mise par mise. La fortune sourit aux marcheurs ! »",
            ])
        }
    }, [mapPlayer.posX, mapPlayer.posY, mapPlayer.mapId, hydrated, battle, showDialogue, glandModal])

    // Revanche d'arène gagnée : dialogue de récompense post-combat (énergie / CT Mirage),
    // une fois le combat quitté ET la cinématique d'évolution terminée (même règle que badge/ACE).
    useEffect(() => {
        if (rematchReward && !battle && evolutions.length === 0) {
            showDialogue(rematchReward.npcId, rematchReward.npcName, rematchReward.lines)
            clearRematchReward()
        }
    }, [rematchReward, battle, evolutions.length, showDialogue])

    // Fin d'intro : on accorde le starter choisi (niv 5) + un petit kit de départ,
    // on marque l'intro vue et on persiste.
    const onIntroComplete = (starterId: string) => {
        setTeam([createMonInstance(starterId, 5, { owned: true })])
        addItem("poke_ball", 5)
        // Pas d'argent offert : le portefeuille = reps de la veille (crédité au chargement).
        markIntroSeen()
        setShowIntro(false)
        persistYellowSave()
    }

    // NG+ (2 mondes navigables) — lance un New Game+ avec un Daemon custom en starter (+6000⚡), en GELANT
    // l'équipe championne actuelle comme adversaire de fin de Ligue. Le monde d'origine reste intact/rejouable.
    // RUN 3 (concours) — lance le 3e run DEPUIS la fin du run 2 avec le STARTER CHOISI (l'une des 3 lignées,
    // fraîchement éclos niveau 5). run 1 + run 2 restent GELÉS ; TOUT fusionne à la fin du run 3 (0⚡).
    const launchRun3 = async (starterId: string) => {
        let starter
        try { starter = createMonInstance(starterId, 5, { owned: true }) }
        catch { setToast("Starter introuvable — run 3 impossible."); return }
        const ok = await startRun3(starter)
        if (!ok) { setToast("Run 3 réservé au Champion du run 2."); return }
        setRun3StarterChoice(false)
        setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // le run 3 démarre au tout début
        const nm = getSpecies(starterId)?.name ?? "Ton champion"
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            `*Un éclair de pâte incandescente. ${nm} s'éveille à tes côtés, niveau 5 — pour la TROISIÈME vie.*`,
            "« Voici le CONCOURS ultime. 500 énergies bénies pour commencer — et RIEN d'autre. Pas de casino, pas de reps, pas de cadeaux : chaque attaque puise dans ta réserve. »",
            "« À chaque arène vaincue, ta réserve se RECHARGE jusqu'à un plafond croissant : 500, puis 600, 700, 800, et 1000⚡ — jamais au-dessus. Gère chaque goutte. La Ligue t'attend au bout. »",
            "« Ton SCORE = la somme des niveaux de tous les Daemons ennemis que tu terrasses. Le concours s'achève quand tu tombes à 0⚡ OU quand tu terrasses LE MAÎTRE de la Ligue. »",
            "« Et alors seulement — MÉGA-FUSION : ton run 1, ton run 2 ET ce run 3 n'en feront plus qu'un. D'ici là, tes deux vies passées restent gelées. Pas de retour. »",
            "« Que la légende commence, Maître. 🍝🔥 »",
        ])
    }

    // Génère en TÂCHE DE FOND les sprites de la création (Gemini, texte→pixel art) une fois le run 2 EFFECTIVEMENT
    //   lancé. UN stade par appel (chaînage via refUrl = URL du stade précédent). Le Daemon reste MISSINGNO tant que
    //   ce n'est pas prêt ; à l'arrivée on ré-enregistre l'espèce + persiste. Silencieux + coût 0 si la génération est
    //   désactivée en prod (route → "disabled"), ou en cas d'échec réseau → MISSINGNO reste (dégradation propre).
    const generateCustomSpritesInBackground = async (stored: StoredCustomDaemon) => {
        try {
            const n = Number(stored.spec.stages) || 1
            const urls: (string | null)[] = []
            let refUrl: string | null = null
            for (let stage = 1; stage <= n; stage++) {
                let url: string | null = null
                try {
                    const resp: Response = await fetch("/api/gamebook/yellow/custom-sprite", {
                        method: "POST", headers: { "content-type": "application/json" },
                        body: JSON.stringify({ ownerId: stored.ownerId, spec: stored.spec, stage, refUrl }),
                    })
                    const j = (await resp.json().catch(() => null)) as { ok?: boolean; status?: string; url?: string } | null
                    if (j?.status === "disabled" || j?.status === "capped") return // OFF ou budget épuisé → inutile d'insister, MISSINGNO reste
                    if (j?.ok && j.status === "READY" && typeof j.url === "string") url = j.url
                } catch { /* réseau → ce stade reste vide (MISSINGNO) */ }
                urls.push(url)
                if (url) refUrl = url // chaînage d'évolution : le stade suivant part du précédent
            }
            if (urls.some((u) => u)) { setCustomDaemonSprites(stored.ownerId, stored.spec.name, urls); persistYellowSaveNow() }
        } catch { /* jamais bloquant */ }
    }

    const launchNewGamePlus = async (stored: StoredCustomDaemon) => {
        if (getPlayer().ngplusUsed) { setToast("Tu as déjà accompli ta seconde vie. Pour en relancer une, il faut recommencer le run 1 (réinitialiser le chapitre)."); return }
        let starter
        try { starter = createMonInstance(customStarterSpeciesId(stored), 5, { owned: true }) }
        catch { setToast("Ton Daemon custom est introuvable/corrompu — NG+ impossible."); return }
        const oldTeam = freezeTeam(getPlayer().team)
        const ok = await startNewGamePlus(starter, oldTeam)
        if (!ok) { setToast("New Game+ réservé aux Champions du Nexus."); return }
        void generateCustomSpritesInBackground(stored) // NON bloquant : le run 2 démarre tout de suite, les sprites arrivent après (MISSINGNO en attendant)
        setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // le NG+ démarre au tout début
        // Cinématique d'entrée du 2e run : le Dieu des Nouilles explique le NG+ ET la fenêtre d'abandon.
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            `*Un éclair de pâte sacrée. ${stored.spec.name}, ta création, s'éveille à tes côtés — à peine éclos, niveau 5.*`,
            "« Voici ta seconde vie : ta création pour seul allié, 6000 énergies bénies, et un Nexus recommencé de zéro — mais PROFONDÉMENT changé. »",
            "« Des Daemons jamais vus rôdent sur les routes, les types ont basculé, et des CT INÉDITES t'attendent. Rien ne sera comme avant, Maître. »",
            "« Ton défi de gloire : rallier la Ligue et la vaincre avec le PLUS d'énergie possible. Ce chiffre sera TON score — la trace que tu graves dans le Nexus. »",
            "« Tu hésites ? Tu as 15 COMBATS — pas un de plus — pour renoncer : porte ton starter au Prof. CHEN. Tu perdras ta création ET les 6000⚡ à JAMAIS, mais tu retrouveras ta partie de Champion, la flûte et la Zone de Combat. »",
            "« Passé ces 15 combats, plus de retour : engagé jusqu'au bout. ACE t'attend avec une NÉMÉSIS forgée contre toi… et au sommet, ta PROPRE ancienne équipe. »",
            "« Choisis bien, Maître. Fais de cette vie une légende. 🍝 »",
        ])
    }

    // REJEU (« run bis ») — lance un rejeu ISOLÉ (bulle jetable, cf. saveManager.startReplay). run1 = intro ;
    //   run2/run3 = starter fourni. Le VRAI monde reste intact ; le score « Pseudo² » apparaît au classement.
    const doStartReplay = async (run: "run1" | "run2" | "run3", starter: ReturnType<typeof createMonInstance> | null = null) => {
        if (getActiveWorld() !== "replay") {
            // COÛT du rejeu : JC croissant, 1er gratuit (compteur GLOBAL côté serveur). "insufficient" → on bloque ;
            //   "no-table"/"error" (avant db:push / hors-ligne) → on laisse passer GRATUITEMENT (dégradation propre).
            const rc = await postReplaySpend()
            if (!rc.ok && rc.reason === "insufficient") { setToast(`Rejeu : ${rc.cost} JC requis (tu as ${rc.jc}). Farme la Zone de Combat !`); return }
        }
        const ok = await startReplay(run, starter)
        if (!ok) { setToast(run === "run1" ? "Rejeu impossible pour l'instant." : "Il te faut un Daemon de départ."); return }
        setReplayMenu(false); setReplayPickRun(null); setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // le rejeu démarre au tout début
        const label = run === "run1" ? "Run 1" : run === "run2" ? "Run 2" : "Run 3"
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            "*Le Dieu Spaghetti claque des doigts. Une bulle dorée t'enveloppe, hors du temps…*",
            `« REJEU du ${label} ! Une seconde chance : bats ton score et complète ton Pokédex (les ESPÈCES vues ici restent cochées à jamais). »`,
            "« Ton VRAI monde t'attend, intact — ceci n'est qu'une bulle. Ton score apparaîtra au classement sous « Pseudo² », à côté de l'ancien. »",
            "« Et surtout : à la SORTIE, tu pourras RAMENER dans ton vrai monde autant de DAEMONS que de BADGES gagnés ici (+1 si tu bats la Ligue) — à choisir parmi ton équipe et ton PC. Le reste sera perdu. »",
            "« Sors quand tu veux (Menu → 🚪) : ton score² sera figé et tu choisiras tes Daemons à garder. Bonne chance, champion ! 🍝 »",
        ])
    }

    // MULTI-PROFILS — « Rejouer le RUN 1 » = démarre un 2ᵉ PROFIL complet et frais (run 1 depuis l'intro), en
    //   STASHANT le profil actif. NON-destructif (les profils coexistent). Recréer un Daemon perso passe par là.
    const doNewProfileRun1 = async () => {
        const ok = await startNewProfileFromRun1()
        if (!ok) { setToast(`Impossible : maximum ${MAX_ALT_PROFILES + 1} profils (ou action indisponible ici).`); return }
        setProfileView(false); setReplayMenu(false); setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // profil FRAIS → l'intro run 1 se joue (introSeen=false)
    }
    // MULTI-PROFILS — bascule sur un profil inactif (repart à l'entrée ; position par-profil = raffinement futur).
    const doSwitchProfile = async (i: number) => {
        const ok = await switchProfile(i)
        if (!ok) { setToast("Bascule de profil impossible."); return }
        setProfileView(false); setReplayMenu(false); setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y)
    }

    // MODE GENÈSE — assistant de craft ×6 : chaque création alimente l'équipe ; à 6, on démarre le profil Genèse
    //   (verrou de capture jusqu'à la Ligue de Fusion, fusion autorisée). Ref pour accumuler sans race async.
    const GENESIS_TEAM = 6
    const openGenesisCraft = () => { genesisSpecsRef.current = []; setProfileView(false); setGenesisCraftStep(0) }
    const doGenesisCraftStep = async (spec: CustomSpec) => {
        genesisSpecsRef.current = [...genesisSpecsRef.current, { ownerId: userId, spec }]
        const n = genesisSpecsRef.current.length
        if (n < GENESIS_TEAM) { setGenesisCraftStep(n); setToast(`Création ${n}/${GENESIS_TEAM} — encore ${GENESIS_TEAM - n} !`); return }
        const specs = genesisSpecsRef.current
        setGenesisCraftStep(null); genesisSpecsRef.current = []
        let team: ReturnType<typeof createMonInstance>[]
        try { team = specs.map((s) => createMonInstance(customStarterSpeciesId(s), 5, { owned: true })) } catch { setToast("Une création est corrompue — Genèse annulée."); return }
        const ok = await startGenesisProfile(team, specs)
        if (!ok) { setToast(`Mode Genèse impossible (maximum ${MAX_ALT_PROFILES + 1} profils ?).`); return }
        specs.forEach((s) => void generateCustomSpritesInBackground(s)) // sprites générés en tâche de fond (non bloquant)
        setMenu("none"); setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y)
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            "*Le Dieu Spaghetti contemple tes 6 créations, un sourire malicieux aux lèvres…*",
            "« MODE GENÈSE ! Tu repars au tout début avec TES 6 créatures — et rien d'autre. »",
            "« Interdiction de capturer le moindre Daemon jusqu'à ce que tu domptes la LIGUE DE FUSION. Tes chimères contre le monde ! »",
            "« Tu peux les FUSIONNER entre elles en chemin. Montre-moi ce que valent tes créations, démiurge ! 🍝 »",
        ])
    }

    // BOUCLE ENDGAME — lance le rejeu du run 1 GRATUITEMENT (récompense de fin de jeu) avec le Daemon custom
    //   fraîchement recréé comme starter. Contourne postReplaySpend (pas de coût JC — c'est un cadeau). Non-destructif :
    //   passe par startReplay (bulle isolée), le vrai monde est stashé/restauré intact. Créé HORS bulle (garde amont).
    const startLoopReplay = async (stored: StoredCustomDaemon) => {
        let starter: ReturnType<typeof createMonInstance>
        try { starter = createMonInstance(customStarterSpeciesId(stored), 5, { owned: true }) } catch { setToast("Daemon custom corrompu."); return }
        const ok = await startReplay("run1", starter)
        if (!ok) { setToast("Rejeu impossible pour l'instant."); return }
        void generateCustomSpritesInBackground(stored) // NON bloquant : génère le vrai sprite de la création (comme le NG+) → tient la promesse de l'écran de succès (MISSINGNO en attendant)
        setMenu("none"); setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y)
        showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
            "*Le Dieu Spaghetti sourit. Une bulle dorée t'enveloppe, ta nouvelle création à tes côtés…*",
            `« Repars au tout début du Nexus avec ${stored.spec.name} ! Une traversée fraîche, rien que vous deux. »`,
            "« Ton VRAI monde t'attend, intact — ceci n'est qu'une bulle. Ton score apparaîtra au classement sous « Pseudo² ». »",
            "« À la SORTIE (Menu → 🚪), tu ramèneras autant de Daemons que de BADGES gagnés ici (+1 si tu bats la Ligue) — dont ta création, si tu la gardes. Bonne route, champion ! 🍝 »",
        ])
    }

    // REJEU — SORT de la bulle : fige le score « bis » au classement (POST) puis restaure le vrai monde INTACT.
    const doExitReplay = async (keep: MonInstance[] = []) => {
        const run = getReplayRun()
        if (run) {
            try {
                const { score, factors } = computeReplayScore(run)
                const posts = [fetch("/api/gamebook/yellow/run-scores", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ run: `${run}bis`, score, factors }),
                })]
                // REJEU run 3 : fige AUSSI le score « Survivant² » (énergie), sinon la bulle jetée l'emporte et le
                //   classement Survie n'aurait jamais la trace du rejeu (symétrie avec le Conquérant² ci-dessus).
                if (run === "run3") {
                    const energyScore = run3EnergyScore(getPlayer().run3EnergyByArena)
                    posts.push(fetch("/api/gamebook/yellow/run-scores", {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ run: "run3energybis", score: energyScore }),
                    }))
                }
                await Promise.all(posts)
            } catch { /* hors-ligne au moment de sortir : le score² de cette tentative n'est pas figé (perdu). Rare — refais un rejeu en ligne. */ }
        }
        await exitReplay()
        // RAMENER dans la vraie save les Daemons choisis (uids déjà re-tagués anti-collision côté modale) : addCaught
        //   les met en équipe s'il reste de la place, sinon au PC. Puis persistance immédiate (anti-désync).
        let brought = 0
        for (const m of keep) { addCaught(m); brought++ }
        if (brought > 0) persistYellowSaveNow()
        setMenu("none")
        setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y)
        setToast(brought > 0
            ? `🚪 Rejeu terminé — ${brought} Daemon${brought > 1 ? "s" : ""} ramené${brought > 1 ? "s" : ""} (équipe/PC) + score² figé !`
            : "🚪 Rejeu terminé — ton score² est figé au classement. De retour dans ton vrai monde !")
    }

    // REJEU — SORTIE confirmée : lance la sortie (run 2 = additif → tout ramené, pas de modale de garde ; run 1/3 =
    //   modale « ramener X Daemons » selon les badges gagnés).
    const beginExitReplay = () => {
        setConfirmExitReplay(false)
        if (getReplayRun() === "run2") { void doExitReplay(); return } // run 2 additif : exitReplay ramène déjà tous les Daemons
        const max = getPlayer().badges.length + (getPlayer().isChampion ? 1 : 0)
        if (max <= 0) { void doExitReplay(); return }
        setKeepSel(new Set()); setReplayKeep({ max, mons: [...getPlayer().team, ...getPlayer().pc] }); setMenu("none")
    }
    // VŒU GÉNIE « offre partagée » — réponse au prompt. ACCEPTER → +énergie créditée localement (grantReps + persist,
    //   modèle d'énergie du jeu). REFUSER → +pompes à la dette de la SOURCE (côté serveur). Le serveur reste
    //   authoritative sur l'éligibilité + la dette ; le client ne crédite QUE sur un accept validé.
    const respondGenieOffer = async (choice: "accept" | "refuse") => {
        const offer = genieOffer
        setGenieOffer(null)
        try {
            const r = await fetch("/api/gamebook/yellow/genie-offer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ response: choice }) })
            const j = r.ok ? await r.json() : null
            if (j?.ok && choice === "accept" && (j.amount ?? 0) > 0) {
                grantReps(j.amount); persistYellowSave()
                setToast(`🎁 Le génie de ${offer?.sourceNickname ?? "?"} t'offre +${j.amount}⚡ !`)
            } else if (j?.ok && choice === "refuse") {
                setToast(`Tu as décliné l'offre du génie de ${offer?.sourceNickname ?? "?"}.`)
            } else if (j?.reason === "wrong-world") {
                setGenieOffer(offer) // reviens en jeu normal (live/ngplus) pour répondre → on garde le prompt
                setToast("Reviens dans ton monde principal pour répondre à l'offre du génie.")
            }
        } catch { /* neutre */ }
    }
    // REJEU RUN 2 — lancement confirmé (starter mémorisé niv 5, repli picker customDaemons pour les saves legacy).
    const doStartReplayRun2 = () => {
        setConfirmStartReplay(null)
        const base = getPlayer().ngplusStarterBase
        if (base) { let s; try { s = createMonInstance(base, 5, { owned: true }) } catch { setToast("Ton starter du run 2 est introuvable."); return } setReplayMenu(false); void doStartReplay("run2", s); return }
        if ((getPlayer().customDaemons?.length ?? 0) === 0) { setToast("Ton starter du run 2 est introuvable — recommence le run 1 pour recréer un Daemon."); return }
        setReplayMenu(false); setReplayPickRun("run2")
    }

    // RETOUR : ferme l'overlay le plus "haut" de la pile (fiche → sous-menu → pause).
    // Renvoie true si quelque chose a été fermé → utilisé par le bouton B (B = retour).
    // Pile de fermeture du bouton B : ferme l'overlay le PLUS HAUT et renvoie true ; false si
    // plus rien à fermer (le clavier/onB enchaîne alors sur pressB pour les dialogues).
    // Ordre = du plus superposé au moins superposé (un sous-modal se ferme avant son parent).
    // ÉVÉNEMENT DU GLAND — avance la modale (bouton OU B) : carton → retire jusqu'à 14⚡ ; spag → offre 14 tickets
    // casino → trump2 ; trump2 → clôt (justice faite). Effets + flags one-shot ici, l'affichage est dans GlandEvent.
    const advanceGland = () => {
        if (glandModal === "carton") {
            const take = Math.min(GLAND_ENERGY_STOLEN, getPlayer().reps)
            if (take > 0) spendReps(take)
            markGlandCartonDone(); persistYellowSave(); setGlandModal(null)
        } else if (glandModal === "spag") {
            for (let i = 0; i < GLAND_TICKET_COUNT; i++) grantRouletteTicket(GLAND_TICKET_VALUE, "spag")
            persistYellowSave(); setGlandModal("trump2")
        } else if (glandModal === "trump2") {
            markGlandJusticeDone(); setGlandModal(null)
        }
    }
    const goBack = (): boolean => {
        if (glandModal) { advanceGland(); return true } // l'événement du gland s'avance/se ferme au B
        if (posterImage) { closePoster(); return true } // poster mural (Centre) → overlay plein écran
        if (resetStep > 0) { setResetStep(0); return true }
        if (replayPickRun) { setReplayPickRun(null); return true }
        if (replayMenu) { setReplayMenu(false); return true }
        if (heldOpen) { setHeldOpen(false); return true } // sous-modale objet tenu (au-dessus de la fiche)
        if (renaming) { setRenaming(false); return true } // annule le renommage, reste sur la fiche
        if (selectedFusionUid) { setSelectedFusionUid(null); return true } // fermer la fiche fusion
        if (selected) { setSelected(null); setRenaming(false); setHeldOpen(false); return true } // fermer la fiche reset renommage + objet tenu
        if (fusioBallModal) { setFusioBallModal(false); return true } // offre Fusio-Ball post-sacre (décliner)
        if (loopModal) { setLoopModal(false); return true } // BOUCLE ENDGAME : décliner l'offre (re-proposée au prochain sacre OR / capture)
        if (pnj6Modal) { setPnj6Modal(false); return true } // offre d'échange PNJ 6 (décliner)
        // Sous-modals de la BOUTIQUE (rendus au-dessus d'elle) → se ferment avant la boutique.
        if (pantheonEvo) { setPantheonEvo(null); return true }
        if (pastaPick) { setPastaPick(false); return true }
        if (buyConfirm) { setBuyConfirm(null); return true }
        if (sellMode) { setSellMode(false); return true }
        if (ctShop) { setCtShop(false); setCtPick(null); return true }
        if (tradePickFor) { setTradePickFor(null); return true }
        if (ctTradePickFor) { setCtTradePickFor(null); return true }
        if (interactTarget) { setInteractTarget(null); return true }
        if (chatOpen) { setChatOpen(false); return true }
        // Sélection « déplacer un Daemon » dans le menu ÉQUIPE → annule la sélection d'abord.
        if (swapPick) { setSwapPick(null); return true }
        // Overlays plein écran gérés côté store (boutique + panneaux Guide/Library/Lab/Panneau).
        if (shopOpen) { closeShop(); return true }
        if (signOpen !== null) { closeSign(); return true } // signOpen est un index (0 = 1er panneau)
        if (guideOpen) { closeGuide(); return true }
        if (arenaInfoOpen) { closeArenaInfo(); return true }
        if (libraryOpen) { closeLibrary(); return true }
        if (advisorOpen) { closeAdvisor(); return true }
        if (daemomaniaqueOpen) { closeDaemomaniaque(); return true }
        if (labOpen) { closeLab(); return true }
        if (moveReminderOpen) { closeMoveReminder(); return true }
        if (pcOpen) { closePc(); return true }
        if (menu === "team" || menu === "bag" || menu === "moves" || menu === "palmares" || menu === "genie") { setMenu("pause"); return true }
        if (menu === "reput" || menu === "hof" || menu === "arena-hof" || menu === "stats" || menu === "run2scores" || menu === "run3scores" || menu === "leaderboard" || menu === "badges") { setMenu("palmares"); return true }
        if (menu === "pause") { setMenu("none"); return true }
        return false
    }
    // Le handler clavier (effet plus haut) appelle toujours la dernière version via ce ref.
    goBackRef.current = goBack

    return (
        <div style={pageStyle}>
            {showIntro && <IntroCinematic onComplete={onIntroComplete} />}

            {/* NG+ — HUD « fenêtre d'abandon » : décompte visible des combats restants avant d'être ENGAGÉ. */}
            {activeWorld === "ngplus" && player.ngplusBattles <= NGPLUS_ABANDON_LIMIT && !battle && !showIntro && (
                <div style={{ position: "fixed", top: 6, left: 6, zIndex: 60, background: "#1b1206ee", border: "2px solid #e0a020", color: "#f4d78a", borderRadius: 8, padding: "3px 8px", fontSize: 10.5, fontWeight: 700, fontFamily: "monospace", pointerEvents: "none", lineHeight: 1.35, textAlign: "center", maxWidth: 150 }}>
                    🔓 NEW GAME+
                    {NGPLUS_ABANDON_LIMIT - player.ngplusBattles > 0 ? (
                        <div>Abandon (Prof. CHEN) : <b style={{ color: "#fff" }}>{NGPLUS_ABANDON_LIMIT - player.ngplusBattles}</b> combat{NGPLUS_ABANDON_LIMIT - player.ngplusBattles > 1 ? "s" : ""}</div>
                    ) : (
                        <div style={{ color: "#ff8c60" }}>⚠️ DERNIÈRE CHANCE d&apos;abandonner !</div>
                    )}
                </div>
            )}
            {tradeAnim && (
                <TradeAnimation
                    give={tradeAnim.give}
                    receive={tradeAnim.receive}
                    onDone={() => {
                        executeTrade(tradeAnim.give.uid, tradeAnim.receive)
                        recordPlayerTrade() // haut-fait trade_player : ÉCHANGE Casino joueur↔joueur (forward-only)
                        const evo = applyTradeEvolution(tradeAnim.receive.uid) // évolution par échange (ex. Roctaur → Rochison)
                        persistYellowSave()
                        if (evo) setToast(`✨ Suite à l'échange, ${evo.fromName} évolue en ${evo.toName} !`)
                        else setToast(`Échange réussi ! Tu reçois ${getSpecies(tradeAnim.receive.speciesId)?.name ?? "un Daemon"}.`)
                        setTradeAnim(null)
                    }}
                />
            )}

            {/* La coque Game Boy enveloppe TOUJOURS le jeu — exploration ET combat.
                En combat, l'écran de combat est rendu DANS l'écran (menus façon
                Gen 1/2) et le D-pad + A/B de la coque pilotent le combat via
                dispatchBattleInput (le même pont que le clavier). */}
            <GameBoyShell
                reps={player.reps}
                repsCap={player.repsCap}
                // Pendant l'écran de chargement du combat (transition de rencontre), les
                // flèches sont neutralisées : pas de curseur/pas fantôme sous le rideau.
                dpadDisabled={encounterFx}
                // COURSE (Pokémon Kart) : mode ANALOGIQUE — quand une course tourne dans l'écran, les
                // boutons pilotent le kart en continu (handleRaceHold : A=gaz, B=frein, SELECT=nitro,
                // ◀▶=braquer, START=quitter). La coque ignore alors les callbacks mono-appui ci-dessous.
                // Hors course mais borne ouverte (sélection/résultats), on NEUTRALISE ces callbacks
                // (`kartOpen`) pour ne pas déplacer le joueur/ouvrir le menu sous l'overlay.
                onHoldChange={raceActive ? handleRaceHold : undefined}
                // En combat, START/SELECT ouvre le menu pause (viewers sûrs). Quand ce menu est ouvert,
                // le D-pad / A pilotent le menu (tactile) → on neutralise l'entrée combat dessous ;
                // B referme le menu (goBack).
                onUp={() => { if (encounterFx || kartOpen) return; if (battle) { if (menu === "none") dispatchBattleInput("up"); return } move("up") }}
                onDown={() => { if (encounterFx || kartOpen) return; if (battle) { if (menu === "none") dispatchBattleInput("down"); return } move("down") }}
                onLeft={() => { if (encounterFx || kartOpen) return; if (battle) { if (menu === "none") dispatchBattleInput("left"); return } move("left") }}
                onRight={() => { if (encounterFx || kartOpen) return; if (battle) { if (menu === "none") dispatchBattleInput("right"); return } move("right") }}
                onA={() => {
                    if (kartOpen) return
                    if (glandModal) { advanceGland(); return } // événement du gland : A avance aussi la modale
                    if (battle) { if (menu === "none") dispatchBattleInput("a"); return }
                    // Dans le casino, A face à un autre joueur = le défier.
                    if (inCasino) {
                        const target = facingRemote()
                        if (target) { menuTapGuard.current = Date.now(); setInteractTarget({ userId: target.userId, nickname: target.nickname }); return }
                        if (tryCasinoObjectA()) return
                        casinoAFallback(); return
                    }
                    // Salle de FUSION : A face à un autre joueur = le défier en fusion (sinon PNJ/PC via pressA).
                    if (inAutel) {
                        const target = facingRemote()
                        if (target) { menuTapGuard.current = Date.now(); setInteractTarget({ userId: target.userId, nickname: target.nickname }); return }
                    }
                    pressA()
                }}
                onB={() => { if (kartOpen) return; if (battle) { if (menu !== "none") { goBack(); return } dispatchBattleInput("b"); return } if (!goBack()) pressB() }}
                onStart={() => { if (kartOpen) return; menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
                onSelect={() => { if (kartOpen) return; menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
            >
                {kartOpen && raceCfg && !raceResults ? (
                    // COURSE en cours : rendue DANS l'écran, pilotée par les boutons de la coque.
                    <RaceView cfg={raceCfg} inputRef={raceInputRef} onFinish={(rk) => { resetRaceInput(); setRaceResults(rk) }} />
                ) : battle ? (
                    // Error boundary : si le combat plante, on propose "Reprendre" (endBattle).
                    <BattleBoundary onReset={() => endBattle()}>
                        <BattleScreen />
                    </BattleBoundary>
                ) : (
                    <MapView remotePlayers={remotePlayers} chatBubbles={chat.bubbles} myUserId={userId} arenaOpponents={[...arenaOpponents, ...visibleGhosts]} onArenaClick={handleArenaClick} />
                )}
            </GameBoyShell>

            {/* Menu START (pause). En COMBAT : ouvert aussi, mais limité aux viewers SÛRS
                (Pokédex, Dex, Réputation, Hall of Fame) — pas d'édition d'équipe / d'attaques
                ni de réinitialisation qui casseraient le combat en cours. */}
            {menu === "pause" && (
                <div style={menuOverlayStyle} onClick={() => { if (Date.now() - menuTapGuard.current < 350) return; setMenu("none") }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>MENU</div>
                        {/* (Bouton « QUITTER LA GROTTE » RETIRÉ : on ne sort de la grotte que par la porte d'entrée
                            (1F 18-19,39), l'échelle du Dôme (B1F 45,5) ou un KO d'équipe.) */}
                        {/* TÉLÉPORTATION — dans le DÔME DE FUSION : retour à un Centre Daemon (Ville Jaune / Cendreville). */}
                        {!battle && mapPlayer.mapId === "yellow_combat_autel" && (
                            <>
                                <button style={{ ...menuBtnStyle, borderColor: "#b98aff", color: "#d9b8ff" }} onClick={() => { setMenu("none"); teleportToHealCenter("yellow_entrance") }}>🌀 Téléport → Centre Ville Jaune</button>
                                <button style={{ ...menuBtnStyle, borderColor: "#b98aff", color: "#d9b8ff" }} onClick={() => { setMenu("none"); teleportToHealCenter("yellow_cendreville") }}>🌀 Téléport → Centre Cendreville</button>
                            </>
                        )}
                        {/* TÉLÉPORTATION — dans un CENTRE DAEMON, une fois le Dôme atteint 1× : retour direct au Dôme de Fusion. */}
                        {!battle && mapPlayer.mapId === "yellow_infirmary" && player.defeatedTrainers.includes(AUTEL_VISITED_MARKER) && (
                            <button style={{ ...menuBtnStyle, borderColor: "#b98aff", color: "#d9b8ff" }} onClick={() => { setMenu("none"); setMap("yellow_combat_autel", 9, 8) }}>🌀 Téléport → Dôme de Fusion</button>
                        )}
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("team")}>🐾 ÉQUIPE</button>}
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("bag")}>🎒 SAC</button>}
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/pokedex")}>📷 POKÉDEX</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/dex")}>📖 DEX (CATALOGUE)</button>
                        {/* FUSIODEX : débloqué à la 1re arrivée au Dôme Fusion (marker autel_visited). Anti-spoiler :
                            invisible tant que le joueur n'a pas atteint l'Autel. */}
                        {player.defeatedTrainers.includes(AUTEL_VISITED_MARKER) && (
                            <button style={{ ...menuBtnStyle, borderColor: "#b98aff", color: "#d9b8ff" }} onClick={() => router.push("/gamebook/yellow/fusiodex")}>🧬 FUSIODEX</button>
                        )}
                        {/* ARC LAMPE & GÉNIE : onglet Vœux, débloqué une fois la lampe frottée (marker LAMP_RUBBED_MARKER). */}
                        {player.defeatedTrainers.includes(LAMP_RUBBED_MARKER) && (
                            <button style={{ ...menuBtnStyle, borderColor: "#c9a227", color: "#ffd76a" }} onClick={() => setMenu("genie")}>🧞 VŒUX</button>
                        )}
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("moves")}>⚔️ ATTAQUES</button>}
                        <button style={menuBtnStyle} onClick={() => setMenu("palmares")}>🏆 PALMARÈS</button>
                        {(() => {
                            // Champion qui n'a pas encore créé son Daemon (Franss & co.) : accès PERMANENT au créateur
                            // (forcé → enchaîne le NG+ à la création). Le bouton TEST reste dispo pour les devs/Mools.
                            const eligible = player.isChampion && !player.ngplusUsed && (player.customDaemons?.length ?? 0) === 0
                            if (!eligible && !isCreator && nickname.toLowerCase() !== "mools") return null
                            return (
                                <button style={{ ...menuBtnStyle, borderColor: "#3ad0c0", color: "#3ad0c0" }} onClick={() => { setMenu("none"); setForcedCreator(eligible); setCreatorOpen(true) }}>{eligible ? "🧬 CRÉER TON DAEMON" : "🧬 CRÉER UN DAEMON (TEST)"}</button>
                            )
                        })()}
                        {/* (Retiré) « AFFRONTER TON ANCIENNE ÉQUIPE » : le combat du double se fait désormais dans la
                            SALLE DORÉE (porte droite du trône après le Maître, run 2). Plus de raccourci menu. */}
                        {/* REJEU (« run bis ») — rejouer un run terminé (bulle isolée) : sortir du rejeu, ou en lancer un. */}
                        {!battle && activeWorld === "replay" && (
                            <button style={{ ...menuBtnStyle, borderColor: "#c9a227", color: "#c9a227" }} onClick={() => setConfirmExitReplay(true)}>🚪 SORTIR DU REJEU</button>
                        )}
                        {!battle && activeWorld !== "replay" && resetStep === 0 && (getPlayer().ngplusUsed || getPlayer().run3Used || player.isChampion) && (
                            <button style={menuBtnDimStyle} onClick={() => setReplayMenu(true)}>🔁 REJOUER UN RUN</button>
                        )}
                        {!battle && (resetStep === 0 ? (
                            <button style={menuBtnDimStyle} onClick={() => setResetStep(1)}>♻️ RECOMMENCER LE NEXUS</button>
                        ) : resetStep === 1 ? (
                            <>
                                <div style={{ fontSize: 11, color: "#c83030", fontWeight: 700, textAlign: "center" }}>
                                    ⚠️ Confirmation 1/3<br />
                                    <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 400 }}>Recommencer le Nexus efface TOUTE ta progression : équipe, Pokédex, badges, énergie — et TOUS tes runs (1, 2 et 3).</span>
                                </div>
                                <button style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030" }} onClick={() => setResetStep(2)}>Continuer →</button>
                                <button style={menuBtnDimStyle} onClick={() => setResetStep(0)}>← Annuler</button>
                            </>
                        ) : resetStep === 2 ? (
                            <>
                                <div style={{ fontSize: 11, color: "#c83030", fontWeight: 700, textAlign: "center" }}>
                                    ⚠️ Confirmation 2/3 — C'EST DÉFINITIF<br />
                                    <span style={{ fontSize: 10, opacity: 0.9, fontWeight: 400 }}>Aucun retour en arrière. Tu repars de la toute première ville, à zéro. VRAIMENT sûr ?</span>
                                </div>
                                <button style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030" }} onClick={() => setResetStep(3)}>Oui, je confirme →</button>
                                <button style={menuBtnDimStyle} onClick={() => setResetStep(0)}>← Annuler</button>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: 11, color: "#c83030", fontWeight: 700, textAlign: "center" }}>
                                    🔥 Confirmation 3/3 — dernier rempart<br />
                                    <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>MAINTIENS le bouton 1,5 s pour tout effacer — un simple appui ne fait rien.</span>
                                </div>
                                <button
                                    style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030", position: "relative", overflow: "hidden", touchAction: "none", userSelect: "none" }}
                                    onPointerDown={() => {
                                        if (resetHoldTimer.current) return
                                        if (trade.session) { setToast("Termine ton échange en cours avant de réinitialiser."); setResetStep(0); return }
                                        setResetHolding(true)
                                        resetHoldTimer.current = setTimeout(async () => {
                                            resetHoldTimer.current = null; setResetHolding(false)
                                            await resetYellowChapter() // copie la save dans history AVANT d'effacer + recrédite l'énergie
                                            setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // repop au tout début (1re ville), comme une nouvelle partie
                                            setResetStep(0); setMenu("none"); setShowIntro(true)
                                        }, 1500)
                                    }}
                                    onPointerUp={() => { if (resetHoldTimer.current) { clearTimeout(resetHoldTimer.current); resetHoldTimer.current = null } setResetHolding(false) }}
                                    onPointerLeave={() => { if (resetHoldTimer.current) { clearTimeout(resetHoldTimer.current); resetHoldTimer.current = null } setResetHolding(false) }}
                                    onPointerCancel={() => { if (resetHoldTimer.current) { clearTimeout(resetHoldTimer.current); resetHoldTimer.current = null } setResetHolding(false) }}
                                    onContextMenu={(e) => e.preventDefault()}
                                >
                                    <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: resetHolding ? "100%" : "0%", background: "#c8303055", transition: resetHolding ? "width 1.5s linear" : "none", pointerEvents: "none" }} />
                                    <span style={{ position: "relative", pointerEvents: "none" }}>{resetHolding ? "⏳ Maintiens… (relâche = annuler)" : "🔥 MAINTIENS 1,5 s pour TOUT effacer"}</span>
                                </button>
                                <button style={menuBtnDimStyle} onClick={() => setResetStep(0)}>← Annuler</button>
                            </>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("none")}>← FERMER</button>
                    </div>
                </div>
            )}

            {/* HUB PALMARÈS — regroupe réputation / stats / trophées / HoF / scores concours.
               Affichage PROGRESSIF : un joueur run 1 ne voit ni « run 2/3 » ni les HoF non débloqués. */}
            {menu === "palmares" && (() => {
                // Affichage PROGRESSIF (anti-spoiler) : un joueur run 1 ne voit ni HoF non débloquées ni suffixe « RUN 1 ».
                //   Le CLASSEMENT est visible dès le run 1 (le panneau masque lui-même les onglets run 2/3 non atteints,
                //   cf. props hasRun2/hasRun3 au montage). On ne gate JAMAIS sur run2Snap (clé localStorage globale non
                //   scopée par compte → fuiterait l'existence des runs suivants sur un navigateur partagé).
                // badges = monde ACTIF (remis à [] au début d'un run 2/3) → un joueur avancé aurait la HoF Arènes cachée
                //   en début de run. On élargit à tout état prouvant une conquête d'arène passée (le panneau lit le serveur).
                const hasArenaHof = (player.badges?.length ?? 0) > 0 || player.isChampion || player.ngplusUsed || player.run3Used
                const hasLeagueHof = player.isChampion || player.ngplusUsed || player.run3Used
                // Run 1 « fini » = a battu la Ligue au moins une fois (sacre, ou déjà passé en run 2/3). Les hauts faits
                //   sont intrinsèquement run-1 → on suffixe « RUN 1 » une fois le run 1 bouclé.
                const run1Done = player.isChampion || player.ngplusUsed || player.run3Used
                return (
                    <div style={menuOverlayStyle} onClick={() => setMenu("pause")}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>🏆 PALMARÈS</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "2px 0 6px" }}>
                                <button style={menuBtnStyle} onClick={() => setMenu("badges")}>🎖️ TROPHÉES & HAUTS FAITS{run1Done ? " — RUN 1" : ""}</button>
                                {hasArenaHof && <button style={menuBtnStyle} onClick={() => setMenu("arena-hof")}>🏟️ HALL OF FAME (ARÈNES)</button>}
                                {hasLeagueHof && <button style={menuBtnStyle} onClick={() => setMenu("hof")}>🏛️ HALL OF FAME (LIGUE)</button>}
                                {/* Classement visible DÈS le run 1 (onglet RUN 1 + Duels) ; les onglets run 2/3 sont masqués côté panneau tant qu'ils ne sont pas atteints. */}
                                <button style={menuBtnStyle} onClick={() => setMenu("leaderboard")}>📊 CLASSEMENT CONCOURS</button>
                                <button style={menuBtnStyle} onClick={() => setMenu("stats")}>📊 STATS (cette partie)</button>
                            </div>
                            <button style={menuBtnDimStyle} onClick={() => setMenu("pause")}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* Overlay Équipe */}
            {/* LIGUE DE FUSION — onglet ÉQUIPE = les 6 FUSIONNÉS du gauntlet (ordre de combat via ⇅ + fiche/attaques). */}
            {!battle && menu === "team" && inFusionLeague && (
                <div style={menuOverlayStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🧬 ÉQUIPE DE FUSION</div>
                        {(fusionGauntletTeam ?? []).map((f) => {
                            const sp = getSpecies(f.instance.speciesId)
                            const maxHp = f.instance.frozenStats?.hp ?? f.instance.currentHp
                            const pct = Math.max(0, Math.min(100, (f.instance.currentHp / Math.max(1, maxHp)) * 100))
                            const picked = swapPick === f.instance.uid
                            return (
                                <div key={f.instance.uid} style={{ ...teamRowStyle, alignItems: "center", outline: picked ? "2px solid #b98aff" : "none", borderRadius: picked ? 4 : 0 }}>
                                    <button
                                        title={picked ? "Annuler le déplacement" : "Déplacer (ordre de combat)"}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!swapPick) { setSwapPick(f.instance.uid); return }
                                            if (swapPick === f.instance.uid) { setSwapPick(null); return }
                                            if (reorderFusionGauntletTeam(swapPick, f.instance.uid)) setSwapPick(null)
                                        }}
                                        style={{ background: picked ? "#b98aff" : "transparent", border: "1px solid #8a6ac0", color: picked ? "#1a1030" : "#b98aff", borderRadius: 4, cursor: "pointer", fontSize: 13, padding: "2px 6px", marginRight: 6, lineHeight: 1 }}
                                    >⇅</button>
                                    <span onClick={() => setSelectedFusionUid(f.instance.uid)} title="Voir la fiche" style={{ fontWeight: 700, flex: 1, cursor: "pointer" }}>{sp?.name ?? "Fusion"}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{sp?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{f.instance.level}</span>
                                    <span style={{ width: 78, textAlign: "right", color: pct > 50 ? "#2a8a2a" : pct > 20 ? "#b88010" : "#c83030" }}>
                                        {f.instance.currentHp}/{maxHp}{f.instance.status !== "NONE" ? ` ${f.instance.status}` : ""}
                                    </span>
                                </div>
                            )
                        })}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                            {swapPick ? "Touche un autre ⇅ pour échanger l'ordre de combat." : "⇅ = ordre de combat · nom = fiche (réordonner les attaques)."}
                        </div>
                        <button style={menuBtnDimStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>← RETOUR</button>
                    </div>
                </div>
            )}
            {!battle && menu === "team" && !inFusionLeague && (
                <div style={menuOverlayStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>ÉQUIPE</div>
                        {player.team.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>Aucun Daemon.</div>}
                        {player.team.map((m) => {
                            const sp = getSpecies(m.speciesId)
                            const max = maxHpOf(m)
                            const pct = Math.max(0, Math.min(100, (m.currentHp / max) * 100))
                            const picked = swapPick === m.uid
                            return (
                                <div key={m.uid} style={{ ...teamRowStyle, alignItems: "center", outline: picked ? "2px solid #e0b020" : "none", borderRadius: picked ? 4 : 0 }}>
                                    {/* Poignée de réordonnancement : 1er tap = "à déplacer", 2e tap (autre) = échange. */}
                                    <button
                                        title={picked ? "Annuler le déplacement" : "Déplacer ce Daemon"}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!swapPick) { setSwapPick(m.uid); return }
                                            if (swapPick === m.uid) { setSwapPick(null); return }
                                            if (swapTeam(swapPick, m.uid)) { persistYellowSave(); setSwapPick(null) }
                                        }}
                                        style={{ background: picked ? "#e0b020" : "transparent", border: "1px solid #b8941c", color: picked ? "#3a2a00" : "#b8941c", borderRadius: 4, cursor: "pointer", fontSize: 13, padding: "2px 6px", marginRight: 6, lineHeight: 1 }}
                                    >⇅</button>
                                    <span onClick={() => setSelected(m)} title="Voir la fiche" style={{ fontWeight: 700, flex: 1, cursor: "pointer" }}>{displayName(m)}{m.shiny && <span title="Chromatique (shiny)">{" ✨"}</span>}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{sp?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                    <span style={{ width: 78, textAlign: "right", color: pct > 50 ? "#2a8a2a" : pct > 20 ? "#b88010" : "#c83030" }}>
                                        {m.currentHp}/{max}{m.status !== "NONE" ? ` ${m.status}` : ""}
                                    </span>
                                </div>
                            )
                        })}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                            {swapPick ? "Touche un autre ⇅ pour échanger les places." : "⇅ pour déplacer · nom pour la fiche."}
                        </div>
                        {player.pc.length > 0 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>PC : {player.pc.length} Daemon(s) en réserve</div>}
                        <button style={menuBtnDimStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* PC — boîtes : dépôt/retrait entre l'équipe et la réserve.
                Accessible UNIQUEMENT via l'ordinateur du Centre Daemon (pcOpen), plus depuis le menu START. */}
            {!battle && pcOpen && (() => {
                const BOX_SIZE = 20
                // Tri de la réserve — sur une COPIE (on ne réordonne jamais player.pc lui-même,
                // pour garder l'ordre de dépôt réel pour l'option "récemment déposé").
                const sortedPc = [...player.pc]
                if (pcSort === "recent") { if (pcSortDir < 0) sortedPc.reverse() } // récent = dernier déposé en tête
                else if (pcSort === "alpha") sortedPc.sort((a, b) => displayName(a).localeCompare(displayName(b)) * pcSortDir)
                else if (pcSort === "lvl") sortedPc.sort((a, b) => (a.level - b.level) * pcSortDir)
                else {
                    const k = pcSort // "hp"|"spc"|"atk"|"def"|"spe" → stat calculée au niveau du Daemon
                    sortedPc.sort((a, b) => {
                        const sa = getSpecies(a.speciesId), sb = getSpecies(b.speciesId)
                        return ((sa ? fullStats(a, sa)[k] : 0) - (sb ? fullStats(b, sb)[k] : 0)) * pcSortDir
                    })
                }
                const boxes = Math.max(1, Math.ceil(sortedPc.length / BOX_SIZE))
                const box = Math.min(pcBox, boxes - 1)
                const slice = sortedPc.slice(box * BOX_SIZE, box * BOX_SIZE + BOX_SIZE)
                const closePcUi = () => { closePc() }
                return (
                    <div style={menuOverlayStyle} onClick={closePcUi}>
                        <div style={{ ...menuBoxStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>PC — RANGEMENT</div>
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: "2px 0" }}>ÉQUIPE ({player.team.length}/6)</div>
                            {player.team.map((m) => (
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%", opacity: m.tradeState === "listed" ? 0.45 : 1 }} onClick={() => setSelected(m)} title={m.tradeState === "listed" ? "Sur l'étal du Grand Marchand" : undefined}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{m.tradeState === "listed" && <span title="Sur l'étal du Marchand">🛒 </span>}{displayName(m)}{m.shiny && <span title="Chromatique (shiny)">{" ✨"}</span>}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{getSpecies(m.speciesId)?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                </button>
                            ))}
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: "8px 0 2px", display: "flex", justifyContent: "space-between" }}>
                                <span>BOÎTE {box + 1}/{boxes}</span>
                                <span>
                                    <button style={miniBtn} disabled={box <= 0} onClick={() => setPcBox(box - 1)}>◀</button>
                                    <button style={miniBtn} disabled={box >= boxes - 1} onClick={() => setPcBox(box + 1)}>▶</button>
                                </span>
                            </div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, margin: "0 0 6px" }}>
                                <span style={{ opacity: 0.6 }}>Tri</span>
                                <select value={pcSort} onChange={(e) => { setPcSort(e.target.value as typeof pcSort); setPcBox(0) }}
                                    style={{ flex: 1, fontSize: 11, padding: "3px 4px", borderRadius: 4, border: "1px solid #cdbb86", background: "#fffef8", color: "#1c1408", fontFamily: "inherit" }}>
                                    <option value="recent">Déposé récemment</option>
                                    <option value="lvl">Niveau</option>
                                    <option value="hp">PV max</option>
                                    <option value="spc">Spé max</option>
                                    <option value="atk">Att max</option>
                                    <option value="def">Déf max</option>
                                    <option value="spe">Vit max</option>
                                    <option value="alpha">Alphabet</option>
                                </select>
                                <button style={miniBtn} onClick={() => { setPcSortDir((d) => -d); setPcBox(0) }} title={pcSortDir < 0 ? "Décroissant" : "Croissant"}>{pcSortDir < 0 ? "▼" : "▲"}</button>
                            </div>
                            {player.pc.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Aucun Daemon en réserve.</div>}
                            {slice.map((m) => (
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%", opacity: m.tradeState === "listed" ? 0.45 : 1 }} onClick={() => setSelected(m)} title={m.tradeState === "listed" ? "Sur l'étal du Grand Marchand" : undefined}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{m.tradeState === "listed" && <span title="Sur l'étal du Marchand">🛒 </span>}{displayName(m)}{m.shiny && <span title="Chromatique (shiny)">{" ✨"}</span>}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{getSpecies(m.speciesId)?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                </button>
                            ))}
                            <button style={{ ...menuBtnDimStyle, marginTop: 6 }} onClick={closePcUi}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* SAC — objets utilisables hors combat (soins) */}
            {!battle && menu === "bag" && (
                <div style={menuOverlayStyle} onClick={() => { setMenu("pause"); setBagItem(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        {bagItem === null ? (
                            <>
                                <div style={menuTitleStyle}>🎒 SAC</div>
                                <div style={{ maxHeight: "62vh", overflowY: "auto" }}>
                                    {/* 📀 Poche CT (toute CT reçue/achetée/cadeau y est visible + enseignable) */}
                                    {player.ownedCts.length > 0 && (
                                        <>
                                            <div style={pocketHdrStyle}>📀 Capsules Techniques</div>
                                            {player.ownedCts.map((id) => getCt(id)).filter((c): c is NonNullable<typeof c> => !!c).map((ct) => {
                                                const mv = getMove(ct.moveId)
                                                return (
                                                    <button key={ct.id} style={menuBtnStyle} onClick={() => { setMenu("none"); setCtShop(true); setCtPick(ct.id) }}>
                                                        <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                            <span>{ct.label} · {mv?.name ?? ct.moveId}<br /><span style={{ fontSize: 10, opacity: 0.6 }}>{mv?.type}{mv && mv.power > 0 ? ` · Puis ${mv.power}` : " · statut"}{mv?.description ? ` — ${mv.description}` : ""}</span></span><span>Enseigner ▸</span>
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </>
                                    )}
                                    {/* ❤️ Poche Soins (PV, statut, RAPPEL) */}
                                    {(() => {
                                        const heals = Object.values(ITEMS).filter((it) => (it.category === "HEAL" || it.category === "STATUS_HEAL" || it.category === "REVIVE") && (player.items[it.id] ?? 0) > 0)
                                        return heals.length > 0 && (
                                            <>
                                                <div style={pocketHdrStyle}>❤️ Soins</div>
                                                {heals.map((it) => {
                                                    const usable = it.category === "HEAL" || it.category === "REVIVE" // STATUS_HEAL = combat uniquement
                                                    return (
                                                        <button key={it.id} style={usable ? menuBtnStyle : menuBtnDimStyle} disabled={!usable} onClick={() => usable && setBagItem(it.id)}>
                                                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                                <span>{it.name}{it.category === "STATUS_HEAL" ? " (en combat)" : ""}</span><span>×{player.items[it.id]}</span>
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </>
                                        )
                                    })()}
                                    {/* 🔴 Poche Balls · ⬆️ Poche Combat (utilisables en combat) */}
                                    {([["BALL", "🔴 Balls"], ["BOOST", "⬆️ Objets de combat"]] as [string, string][]).map(([cat, label]) => {
                                        const list = Object.values(ITEMS).filter((it) => it.category === cat && (player.items[it.id] ?? 0) > 0)
                                        return list.length > 0 && (
                                            <div key={cat}>
                                                <div style={pocketHdrStyle}>{label}</div>
                                                {list.map((it) => (
                                                    <button key={it.id} style={menuBtnDimStyle} disabled>
                                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{it.name} (en combat)</span><span>×{player.items[it.id]}</span>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    })}
                                    {/* 🎟️ Poche Tickets roulette (octroyés par les boss) — lecture seule : joués à l'étage du labo. */}
                                    {player.labDefi.grantedTickets.length > 0 && (
                                        <div>
                                            <div style={pocketHdrStyle}>🎟️ Tickets roulette</div>
                                            <button style={menuBtnDimStyle} disabled>
                                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>{player.labDefi.grantedTickets.length} ticket(s) · à jouer au labo</span>
                                                    <span style={{ fontSize: 10, opacity: 0.7 }}>{player.labDefi.grantedTickets.join(" · ")} ⚡</span>
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                    {/* 🧴 Poche Exploration : Repousse (s'utilise HORS combat → N pas sans rencontre). */}
                                    {(() => {
                                        const repels = Object.values(ITEMS).filter((it) => it.repelSteps && (player.items[it.id] ?? 0) > 0)
                                        return repels.length > 0 && (
                                            <div>
                                                <div style={pocketHdrStyle}>🧴 Exploration</div>
                                                {repels.map((it) => (
                                                    <button key={it.id} style={{ ...menuBtnStyle, display: "block", textAlign: "left", height: "auto" }} onClick={() => {
                                                        if (repelSteps > 0) { setToast("Une Repousse agit déjà !"); return }
                                                        if (consumeItem(it.id)) { activateRepel(it.repelSteps ?? 30); persistYellowSave(); setToast(`${it.name} ! Aucun Daemon sauvage pendant ${it.repelSteps} pas.`); setMenu("none"); setBagItem(null) }
                                                    }}>
                                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{it.name} · Utiliser ▸</span><span>×{player.items[it.id]}</span>
                                                        </span>
                                                        {it.description && <span style={{ display: "block", fontSize: 10, opacity: 0.65, marginTop: 3, whiteSpace: "normal", lineHeight: 1.3 }}>{it.description}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                    {/* 🔦 Poche Lampes torches : s'allument HORS combat (éclairent la Grotte du Nexus, allumer une neuve remplace l'active). */}
                                    {(() => {
                                        const torches = Object.values(ITEMS).filter((it) => it.torchRadius && (player.items[it.id] ?? 0) > 0)
                                        return torches.length > 0 && (
                                            <div>
                                                <div style={pocketHdrStyle}>🔦 Lampes torches{torchSteps > 0 ? ` · allumée (${torchSteps} pas)` : ""}</div>
                                                {torches.map((it) => (
                                                    <button key={it.id} style={{ ...menuBtnStyle, display: "block", textAlign: "left", height: "auto" }} onClick={() => {
                                                        if (consumeItem(it.id)) { activateTorch(it.torchRadius ?? 2, it.torchSteps ?? 150); persistYellowSave(); setToast(`${it.name} allumée ! Vision élargie pendant ${it.torchSteps} pas.`); setMenu("none"); setBagItem(null) }
                                                    }}>
                                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{it.name} · Allumer ▸</span><span>×{player.items[it.id]}</span>
                                                        </span>
                                                        {it.description && <span style={{ display: "block", fontSize: 10, opacity: 0.65, marginTop: 3, whiteSpace: "normal", lineHeight: 1.3 }}>{it.description}</span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                    {/* 🎒 Poche Objets clés (MISC : Pierre Gékroc, Daemonflûte…) — lecture seule.
                                        La Pierre Gékroc s'utilise depuis la fiche d'un Panthéon. */}
                                    {(() => {
                                        const keys = Object.values(ITEMS).filter((it) => it.category === "MISC" && !it.repelSteps && !it.torchRadius && (player.items[it.id] ?? 0) > 0)
                                        return keys.length > 0 && (
                                            <div>
                                                <div style={pocketHdrStyle}>🎒 Objets clés</div>
                                                {keys.map((it) => {
                                                    // ARC LAMPE & GÉNIE : la « lampe rouillée » est le SEUL objet clé cliquable → ouvre son modal
                                                    //   (frottement → génie), SANS être consommée. Les autres restent en lecture seule.
                                                    const isLamp = it.id === LAMP_ITEM_ID
                                                    return (
                                                        <button
                                                            key={it.id}
                                                            style={{ ...(isLamp ? menuBtnStyle : menuBtnDimStyle), display: "block", textAlign: "left", height: "auto", ...(isLamp ? { borderColor: "#c9a227", color: "#ffd76a" } : {}) }}
                                                            disabled={!isLamp}
                                                            onClick={isLamp ? () => { setMenu("none"); setLampOpen(true) } : undefined}
                                                        >
                                                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                                <span>{it.name}{isLamp ? " ✨" : ""}</span><span>×{player.items[it.id]}</span>
                                                            </span>
                                                            {it.description && <span style={{ display: "block", fontSize: 10, opacity: 0.65, marginTop: 3, whiteSpace: "normal", lineHeight: 1.3 }}>{it.description}</span>}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })()}
                                    {player.ownedCts.length === 0 && player.labDefi.grantedTickets.length === 0 && Object.values(ITEMS).filter((it) => (player.items[it.id] ?? 0) > 0).length === 0 && (
                                        <div style={{ fontSize: 11, opacity: 0.6, padding: 10 }}>Sac vide. Va à la boutique !</div>
                                    )}
                                </div>
                                <button style={menuBtnDimStyle} onClick={() => setMenu("pause")}>← RETOUR</button>
                            </>
                        ) : (
                            <>
                                <div style={menuTitleStyle}>{getItem(bagItem)?.name} — SUR QUI ?</div>
                                {(() => {
                                    const isRevive = getItem(bagItem)?.category === "REVIVE"
                                    return player.team.map((m) => {
                                        const sp = getSpecies(m.speciesId)
                                        const max = sp ? fullStats(m, sp).hp : m.currentHp
                                        const ko = m.currentHp <= 0
                                        const full = m.currentHp >= max
                                        const dis = isRevive ? !ko : (ko || full) // RAPPEL : seuls les K.O. ; soin : ni K.O. ni pleins
                                        return (
                                            <button
                                                key={m.uid}
                                                style={dis ? menuBtnDimStyle : menuBtnStyle}
                                                disabled={dis}
                                                onClick={() => {
                                                    if (isRevive) {
                                                        if (reviveTeamMember(m.uid, bagItem)) { setToast(`${displayName(m)} est ranimé !`); persistYellowSave() }
                                                    } else if (healTeamMember(m.uid, bagItem)) {
                                                        setToast(`${displayName(m)} récupère des PV !`); persistYellowSave()
                                                    }
                                                    setBagItem(null)
                                                }}
                                            >
                                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>{displayName(m)}{ko ? " (K.O.)" : ""}</span>
                                                    <span>{m.currentHp}/{max}</span>
                                                </span>
                                            </button>
                                        )
                                    })
                                })()}
                                <button style={menuBtnDimStyle} onClick={() => setBagItem(null)}>← RETOUR</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Réputation PvP (matchs + Daemon fétiche + attaque favorite) — viewer sûr, dispo en combat */}
            {menu === "reput" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("palmares")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🏆 RÉPUTATION PvP</div>
                        {(() => {
                            const s = player.pvpStats
                            const fav = favoriteDaemon()
                            const favMv = favoriteMove()
                            const total = s.wins + s.losses
                            const winrate = total > 0 ? Math.round((s.wins / total) * 100) : 0
                            const row = (label: string, val: React.ReactNode) => (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{label}</span><b>{val}</b></div>
                            )
                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "4px 0 8px" }}>
                                    {row("Victoires", s.wins)}
                                    {row("Défaites", s.losses)}
                                    {row("Abandons", s.forfeits)}
                                    {row("Ratio de victoire", `${winrate}%`)}
                                    <div style={{ height: 1, background: "#00000022", margin: "2px 0" }} />
                                    {row("Daemon fétiche", fav ? (getSpecies(fav)?.name ?? fav) : "—")}
                                    {row("Attaque favorite", favMv ? (getMove(favMv)?.name ?? favMv) : "—")}
                                    {total === 0 && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>Aucun combat PvP pour l'instant. Défie un joueur au casino !</div>}
                                </div>
                            )
                        })()}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("palmares")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* STATS de la partie en cours (per-world : run principal OU NG+). Lues en direct (getPlayer). */}
            {menu === "stats" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("palmares")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>📊 STATS — {activeWorld === "run3" ? "concours (run 3)" : activeWorld === "ngplus" ? "run NG+" : "run principal"}</div>
                        {(() => {
                            const s = getPlayer().stats
                            const winrate = s.battles > 0 ? Math.round((s.wins / s.battles) * 100) : 0
                            const row = (label: string, val: React.ReactNode) => (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{label}</span><b>{val}</b></div>
                            )
                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "4px 0 8px" }}>
                                    {row("Combats joués", s.battles)}
                                    {row("Victoires", s.wins)}
                                    {row("% de victoire", `${winrate}%`)}
                                    {row("Fois équipe K.O.", s.teamKos)}
                                    <div style={{ height: 1, background: "#00000022", margin: "2px 0" }} />
                                    {row("Pas parcourus", s.steps.toLocaleString("fr-FR"))}
                                    {row("Énergie dépensée ⚡", s.energySpent.toLocaleString("fr-FR"))}
                                    {row("XP cumulée", s.xpTotal.toLocaleString("fr-FR"))}
                                    {row("PV infligés", s.hpDealt.toLocaleString("fr-FR"))}
                                    <div style={{ height: 1, background: "#00000022", margin: "2px 0" }} />
                                    {row("Potions utilisées", s.potionsUsed)}
                                    {row("Balls lancées", s.ballsUsed)}
                                    {row("Soins effectués", s.heals)}
                                </div>
                            )
                        })()}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("palmares")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* RUN 2 — stats brutes (temps de jeu · énergie consommée · pas) + NOTE GLOBALE /1000, lues en direct. */}
            {menu === "run2scores" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("palmares")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🏅 SCORES — RUN 2{activeWorld !== "ngplus" ? " (figé)" : ""}</div>
                        {(() => {
                            const sc = activeWorld === "ngplus" ? computeRunScores() : run2Snap
                            if (!sc) return <div style={{ fontSize: 12, opacity: 0.7, margin: "8px 0" }}>Aucun score run 2 enregistré sur cet appareil.</div>
                            const row = (label: string, val: React.ReactNode, hint: string) => (
                                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{label}</span><b>{val}</b></div>
                                    <div style={{ fontSize: 9.5, opacity: 0.6, lineHeight: 1.3 }}>{hint}</div>
                                </div>
                            )
                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0 8px" }}>
                                    {row("🎮 Temps de jeu", formatDuration(sc.playtimeMs), "temps passé actif dans l'app — plus bas = mieux")}
                                    {row("⚡ Reps utilisés (total run 2)", sc.energyConsumed.toLocaleString("fr-FR"), "reps dépensés sur TOUT le run 2 (attaques, boutique, casino) — compté depuis le début")}
                                    {row("🏆 Reps utilisés (en Ligue)", (sc.leagueReps ?? 0).toLocaleString("fr-FR"), "reps dépensés en combats de Ligue — nouveau compteur (0 si tu avais déjà entamé la Ligue avant l'ajout)")}
                                    {/* NOTE GLOBALE /1000 (courante) + MEILLEUR du run + détail des facteurs (rendu dynamique) */}
                                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.18)", paddingTop: 8, marginTop: 2 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 15 }}>
                                            <b>★ SCORE GLOBAL{activeWorld === "ngplus" ? " (actuel)" : ""}</b>
                                            <b style={{ fontSize: 20, color: "#ffe36b" }}>{sc.grade}<span style={{ fontSize: 12, opacity: 0.6 }}> / 1000</span></b>
                                        </div>
                                        {sc.bestGrade > sc.grade && (
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12, marginTop: 2, opacity: 0.9 }}>
                                                <span>🏅 Meilleur du run</span>
                                                <b style={{ color: "#ffe36b" }}>{sc.bestGrade}<span style={{ fontSize: 10, opacity: 0.6 }}> / 1000</span></b>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 9, opacity: 0.55, marginTop: 2 }}>Le classement partagé affiche ton score <b>actuel</b> ; ton <b>meilleur</b> est gravé à la fin du run 2.</div>
                                        <div style={{ fontSize: 9.5, opacity: 0.7, marginTop: 6, lineHeight: 1.4, background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "5px 7px" }}>
                                            <b>Comment se calcule le score ?</b> 3 critères de PERFORMANCE (% victoire, Pokédex, niveaux d&apos;équipe), chacun noté puis pondéré (son poids = le nombre après « / »). On les additionne → note sur <b>1000</b>, plus c&apos;est haut mieux c&apos;est. La barre montre ta part du critère.
                                        </div>
                                        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 6 }}>
                                            {/* Masque les axes PÉRIMÉS (frugality/steps) d'un snapshot local figé sous l'ancienne formule. */}
                                            {sc.factors.filter((f) => f.key !== "frugality" && f.key !== "steps").map((f) => (
                                                <div key={f.key} style={{ fontSize: 11 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                                        <span>{f.label}</span>
                                                        <span style={{ opacity: 0.85 }}><b>{f.points}</b> / {f.max}</span>
                                                    </div>
                                                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden", margin: "2px 0 1px" }}>
                                                        <div style={{ width: `${Math.round(f.ratio * 100)}%`, height: "100%", background: "#ffe36b" }} />
                                                    </div>
                                                    <div style={{ fontSize: 9, opacity: 0.55 }}>{f.detail}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("palmares")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* SCORE RUN 3 (concours) — Σ des niveaux des Daemons ennemis vaincus (boss d'arène + Ligue). */}
            {menu === "run3scores" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("palmares")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🏆 SCORE — RUN 3 (concours)</div>
                        {(() => {
                            const defeated = player.run3Defeated ?? []
                            const score = run3Score(defeated)
                            const max = run3MaxScore()
                            const ratio = max > 0 ? Math.min(1, score / max) : 0
                            const n = defeated.length
                            return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0 8px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 15 }}>
                                        <b>★ SCORE</b>
                                        <b style={{ fontSize: 22, color: "#ffe36b" }}>{score}<span style={{ fontSize: 12, opacity: 0.6 }}> / {max}</span></b>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                                        <div style={{ width: `${Math.round(ratio * 100)}%`, height: "100%", background: "#ffe36b" }} />
                                    </div>
                                    <div style={{ fontSize: 12, opacity: 0.9 }}>🗡️ <b>{n}</b> Daemon{n > 1 ? "s" : ""} ennemi{n > 1 ? "s" : ""} vaincu{n > 1 ? "s" : ""} (boss d'arène + Ligue), compté{n > 1 ? "s" : ""} une seule fois.</div>
                                    <div style={{ fontSize: 9.5, opacity: 0.6, lineHeight: 1.4 }}>
                                        Le score = Σ des niveaux des Daemons ennemis que tu as vaincus. Tout le monde affronte les MÊMES 5 boss figés + la même Ligue → les scores sont comparables. Le concours s'arrête quand ton énergie tombe à 0⚡ : ton score est alors gravé.
                                    </div>
                                </div>
                            )
                        })()}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("palmares")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* Boutique (vendeur) */}
            {!battle && menu === "moves" && <MovesPanel close={() => setMenu("pause")} />}
            {menu === "hof" && <HallOfFameViewer close={() => setMenu("palmares")} onFight={() => setMenu("none")} />}
            {menu === "arena-hof" && <ArenaHallOfFamePanel close={() => setMenu("palmares")} onFight={() => setMenu("none")} />}
            {menu === "leaderboard" && <RunScoreboardPanel close={() => setMenu("palmares")} hasRun2={activeWorld === "ngplus" || player.ngplusUsed} hasRun3={activeWorld === "run3" || player.run3Used} />}
            {menu === "badges" && <RunBadgesPanel close={() => setMenu("palmares")} />}
            {menu === "genie" && <GeniePanel close={() => setMenu("pause")} />}
            {lampOpen && <RustyLampModal onClose={() => setLampOpen(false)} />}

            {/* ZONE DE COMBAT — entrée Tour (placeholder, non-bloquant : marche pour sortir) */}
            {!battle && !run && mapPlayer.mapId === "yellow_combat_tour" && !dialogue && player.team.length > 0 && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22ee", color: "#fff", border: "2px solid #e8893a", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 300 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>🏯 TOUR DE COMBAT</div>
                    {/* CHAMPION de la Tour (série ≥ 46 = palier DAN_4, « équivalent Dôme ») : choix d'une CT du Maître, une seule fois. */}
                    {frontierProf && frontierProf.towerBest >= 46 && !isMasterCtClaimed("tour") && (
                        <div style={{ marginBottom: 8, padding: 8, background: "rgba(255,215,74,.12)", border: "1px solid #ffd54a", borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#ffd54a", marginBottom: 4 }}>🏆 CHAMPION DE LA TOUR — récompense du Maître</div>
                            <MasterCtChoice facility="tour" onClaimed={(name) => setToast(`🎁 CT « ${name} » apprise ! Sacré MAÎTRE DE LA TOUR. 🏆`)} />
                        </div>
                    )}
                    <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8 }}>Série d&apos;endurance avec ton équipe : tiens le plus loin possible. 👑 Boss tous les 7 — et tu n&apos;es soigné QUE tous les 7 combats. Choisis ton mode :</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {(["L50", "L100", "ADAPT"] as LevelRule[]).map((rule) => (
                            <button key={rule} onClick={() => { frontierReportedRef.current = false; setTourChoice(false); setUsineCt(null); startTowerRun({ levelRule: rule, playerTopLevel: myArenaLevel || 50, seed: Math.floor(Math.random() * 1e9) }) }}
                                style={{ background: "#e8893a", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                                {rule === "L50" ? "Niv 50" : rule === "L100" ? "Niv 100" : "Adaptatif"}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>(marche pour sortir)</div>
                </div>
            )}
            {/* ZONE DE COMBAT — USINE : draft de location. N'OUVRE QUE via le Maître de l'Usine (usineMenuOpen). */}
            {!battle && !run && usineMenuOpen && mapPlayer.mapId === "yellow_combat_usine" && !dialogue && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22ee", color: "#fff", border: "2px solid #6aa0ec", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 340 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontWeight: 800 }}>🏭 USINE DE COMBAT</div>
                        <button onClick={() => { setUsineDraft(null); closeUsineMenu() }} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 7, padding: "2px 8px", cursor: "pointer", fontWeight: 800, fontSize: 12 }}>✕</button>
                    </div>
                    {/* CHAMPION de l'Usine (série ≥ 46 = palier DAN_4, « équivalent Dôme ») : choix d'une CT du Maître, une seule fois. */}
                    {frontierProf && frontierProf.factoryBest >= 46 && !isMasterCtClaimed("usine") && (
                        <div style={{ marginBottom: 8, padding: 8, background: "rgba(255,215,74,.12)", border: "1px solid #ffd54a", borderRadius: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "#ffd54a", marginBottom: 4 }}>🏆 CHAMPION DE L&apos;USINE — récompense du Maître</div>
                            <MasterCtChoice facility="usine" onClaimed={(name) => setToast(`🎁 CT « ${name} » apprise ! Sacré MAÎTRE DE L'USINE. 🏆`)} />
                        </div>
                    )}
                    {!usineDraft ? (
                        <>
                            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8 }}>Choisis ton mode — tu joueras une équipe de LOCATION :</div>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                {(["L50", "L100", "ADAPT"] as LevelRule[]).map((rule) => (
                                    <button key={rule} onClick={() => {
                                        const lvl = resolveFrontierLevel(rule, myArenaLevel || 50)
                                        const pool = generateRentalPool(new Rng(Math.floor(Math.random() * 1e9)), { streak: 1, level: lvl })
                                        setUsineDraft({ levelRule: rule, pool, picks: [] })
                                        setUsineCursor(0)
                                    }} style={{ background: "#6aa0ec", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                                        {rule === "L50" ? "Niv 50" : rule === "L100" ? "Niv 100" : "Adaptatif"}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {(() => {
                                const pool = usineDraft.pool
                                const cur = Math.max(0, Math.min(pool.length - 1, usineCursor))
                                const c = pool[cur]
                                const sp = getSpecies(c.speciesId)
                                const st = fullStats(createMonInstance(c.speciesId, c.level, { owned: false }), sp!)
                                const moves = opponentMoveIds(c.speciesId, c.level)
                                const picked = usineDraft.picks.includes(c.speciesId)
                                const full = usineDraft.picks.length >= 3
                                const STATS: [keyof typeof st, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]
                                const toggle = () => setUsineDraft((d) => {
                                    if (!d) return d
                                    const has = d.picks.includes(c.speciesId)
                                    const picks = has ? d.picks.filter((p) => p !== c.speciesId) : (d.picks.length < 3 ? [...d.picks, c.speciesId] : d.picks)
                                    return { ...d, picks }
                                })
                                const navBtn: React.CSSProperties = { background: "#242433", color: "#fff", border: "1px solid #444", borderRadius: 8, width: 26, fontSize: 16, cursor: "pointer", flexShrink: 0, alignSelf: "stretch" }
                                return (
                                    <>
                                        <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 6 }}>Choisis 3 Daemons de location — {usineDraft.picks.length}/3</div>
                                        <div style={{ display: "flex", alignItems: "stretch", gap: 5 }}>
                                            <button onClick={() => setUsineCursor((i) => (i - 1 + pool.length) % pool.length)} style={navBtn}>◀</button>
                                            <div style={{ flex: 1, minWidth: 0, background: "#0f0f18", border: `2px solid ${picked ? "#6aa0ec" : "#333"}`, borderRadius: 10, padding: 8 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <img src={sp?.sprite ?? `/yellow/sprites/dex/${c.speciesId}.png`} alt={sp?.name ?? c.speciesId} width={46} height={46} style={{ imageRendering: "pixelated" }} />
                                                    <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: 12.5 }}>{sp?.name ?? c.speciesId} <span style={{ opacity: 0.6, fontWeight: 600, fontSize: 11 }}>N.{c.level}</span></div>
                                                        <div style={{ fontSize: 9.5, opacity: 0.8 }}>{(sp?.types ?? []).join(" / ")}</div>
                                                    </div>
                                                    <div style={{ fontSize: 9, opacity: 0.55 }}>{cur + 1}/{pool.length}</div>
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 24px", gap: "2px 5px", margin: "7px 0 5px", alignItems: "center" }}>
                                                    {STATS.flatMap(([k, lbl]) => [
                                                        <span key={`${k as string}l`} style={{ fontSize: 9, opacity: 0.75, textAlign: "left" }}>{lbl}</span>,
                                                        <span key={`${k as string}b`} style={{ height: 5, background: "#333", borderRadius: 3, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${Math.min(100, Math.round(st[k] / 200 * 100))}%`, background: "#6aa0ec" }} /></span>,
                                                        <span key={`${k as string}v`} style={{ fontSize: 9, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{st[k]}</span>,
                                                    ])}
                                                </div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3, justifyContent: "center" }}>
                                                    {moves.map((mid) => { const mv = getMove(mid); return <span key={mid} style={{ fontSize: 8.5, background: "#242433", borderRadius: 5, padding: "2px 5px" }}>{mv?.name ?? mid}</span> })}
                                                </div>
                                                <button onClick={toggle} disabled={!picked && full} style={{ marginTop: 7, width: "100%", background: picked ? "#e0533a" : "#6aa0ec", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 7, padding: "5px", cursor: "pointer", opacity: (!picked && full) ? 0.4 : 1 }}>{picked ? "✓ Retirer" : full ? "Équipe complète" : "Choisir"}</button>
                                            </div>
                                            <button onClick={() => setUsineCursor((i) => (i + 1) % pool.length)} style={navBtn}>▶</button>
                                        </div>
                                        <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
                                            {[0, 1, 2].map((i) => {
                                                const id = usineDraft.picks[i]; const s2 = id ? getSpecies(id) : null
                                                return <div key={i} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #444", background: "#0f0f18", display: "flex", alignItems: "center", justifyContent: "center" }}>{s2 ? <img src={s2.sprite ?? `/yellow/sprites/dex/${id}.png`} alt="" width={26} height={26} style={{ imageRendering: "pixelated" }} /> : <span style={{ opacity: 0.3, fontSize: 16 }}>·</span>}</div>
                                            })}
                                        </div>
                                        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
                                            <button disabled={usineDraft.picks.length !== 3} onClick={() => {
                                                const specs = buildDraftTeam(usineDraft.pool, usineDraft.picks)
                                                setDraftedTeam(specs.map((o) => createMonInstance(o.speciesId, o.level, { owned: false })))
                                                frontierReportedRef.current = false
                                                setTourChoice(false); setUsineCt(null)
                                                startRun({ mode: "FACTORY", levelRule: usineDraft.levelRule, playerTopLevel: myArenaLevel || 50, seed: Math.floor(Math.random() * 1e9) })
                                                setUsineDraft(null)
                                            }} style={{ background: "#6aa0ec", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 12px", cursor: usineDraft.picks.length === 3 ? "pointer" : "default", opacity: usineDraft.picks.length === 3 ? 1 : 0.45 }}>Confirmer</button>
                                            <button onClick={() => setUsineDraft(null)} style={{ background: "#555", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Annuler</button>
                                        </div>
                                    </>
                                )
                            })()}
                        </>
                    )}
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>(marche pour sortir)</div>
                </div>
            )}
            {/* ZONE DE COMBAT — DÔME : tournoi à élimination (bracket de 8), TON équipe, 3 manches */}
            {!battle && !dome && mapPlayer.mapId === "yellow_combat_dome" && !dialogue && player.team.length > 0 && domeRegisterOpen && (() => {
                const champs = player.domeChampionships ?? 0
                const maxRank = DOME_TIERS.indexOf(maxUnlockedTier(champs))
                const frontierTier = DOME_TIERS[maxRank] // ton palier = le tier le + haut débloqué (on y REPREND, jamais Bronze)
                const box: React.CSSProperties = { position: "absolute", left: "50%", top: 14, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22f2", color: "#fff", border: "3px solid #f1c40f", borderRadius: 14, padding: "18px 22px", textAlign: "center", width: "min(460px, 94vw)", boxShadow: "0 8px 30px #000b" }
                // ÉTAPE 2 — MISE (buy-in poker) pour le tier choisi.
                if (domeSetup) {
                    const bud = DOME_BUDGETS[domeSetup.tier]
                    const bl = DOME_BLINDS[domeSetup.tier]
                    const avail = Math.floor(player.reps)
                    const sliderMax = Math.max(bl.min, Math.min(bl.max, avail))
                    const staked = clampBet(domeSetup.bet, domeSetup.tier, avail)
                    const canPlay = staked > 0
                    return (
                        <div style={box}>
                            <div style={{ fontWeight: 800, marginBottom: 3 }}>{DOME_TITLES[domeSetup.tier]} · Niv {bud.level}</div>
                            <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 6 }}>Mise libre (buy-in) : tu la récupères selon ton classement (≤100 %, jamais de profit). Le vrai gain = titre + Jetons.</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#ffe36b" }}>{canPlay ? `Mise : ${staked} ⚡` : "Bourse insuffisante pour ce tier"}</div>
                            <input type="range" min={bl.min} max={sliderMax} value={Math.min(domeSetup.bet, sliderMax)} onChange={(e) => setDomeSetup({ tier: domeSetup.tier, bet: Number(e.target.value) })} style={{ width: "90%", accentColor: "#f1c40f", margin: "4px 0" }} />
                            <div style={{ fontSize: 9.5, opacity: 0.82, margin: "2px 0 8px", lineHeight: 1.55 }}>
                                Bourse {avail} ⚡ · blinds {bl.min}–{bl.max} · <span style={{ opacity: 0.7 }}>gains 🪙/⚡ rendus</span><br />
                                {([["🥇 1er", 1], ["🥈 2e", 2], ["demi", 3], ["quart", 4]] as [string, 1 | 2 | 3 | 4][]).map(([lbl, p]) => (
                                    <span key={p} style={{ display: "inline-block", marginRight: 9 }}>{lbl} <b style={{ color: "#ffe36b" }}>{domeJcReward(staked, domeSetup.tier, p)}🪙</b>/<span style={{ color: "#8fd8ff" }}>{domeEnergyRefund(staked, p)}⚡</span></span>
                                ))}
                            </div>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                <button onClick={() => setDomeSetup(null)} style={{ background: "rgba(255,255,255,.15)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 11 }}>← retour</button>
                                <button disabled={!canPlay} onClick={() => {
                                    if (domeLaunchingRef.current) return // anti double-débit (double-tap)
                                    const finalBet = clampBet(domeSetup.bet, domeSetup.tier, Math.floor(getPlayer().reps))
                                    if (finalBet <= 0) return
                                    if (!window.confirm(`Miser ${finalBet} ⚡ pour ce tournoi ${DOME_TITLES[domeSetup.tier]} ? Débit immédiat ; tu récupères ta mise selon ton classement (au mieux 100 %).`)) return
                                    domeLaunchingRef.current = true
                                    spendReps(finalBet) // BUY-IN : débit de la mise (une seule fois, gardé par le ref)
                                    const lvl = bud.level
                                    const seed = Math.floor(Math.random() * 1e9)
                                    const rule: LevelRule = lvl <= 50 ? "L50" : "L100"
                                    const playerTeam = getPlayer().team.map((m) => ({ speciesId: m.speciesId, level: lvl }))
                                    // VOIE DU MAÎTRE : les dan tirent des ÉQUIPES DÉSIGNÉES (pool des 12) avec le shiny du grade ; sinon procédural.
                                    const danShiny = isDanTier(domeSetup.tier) ? (bud.shiny ?? "none") : undefined
                                    setDome({ state: createDome(new Rng(seed), { level: lvl, streak: bud.streak, playerTeam, danShiny }), rule, tier: domeSetup.tier, bet: finalBet, seed, jc: 0, energyAccrued: 0 })
                                    setDomeSetup(null)
                                    setDomePause(true)
                                    persistYellowSave()
                                }} style={{ background: canPlay ? "#f1c40f" : "#7a6a2a", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 12px", cursor: canPlay ? "pointer" : "default", fontSize: 12 }}>
                                    {canPlay ? `⚔️ Lancer (−${staked} ⚡)` : "Pas assez d'énergie"}
                                </button>
                            </div>
                        </div>
                    )
                }
                // ÉTAPE 1 — choix du TIER.
                return (
                    <div style={box}>
                        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>🏆 DÔME DE COMBAT</div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Palmarès : <b>{champs}</b> tier{champs > 1 ? "s" : ""} vaincu{champs > 1 ? "s" : ""} · rang max <b>{DOME_TITLES[maxUnlockedTier(champs)]}</b></div>
                        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8, lineHeight: 1.45 }}>Tournoi <b>6v6</b>, 3 manches, soin complet entre chaque. <b style={{ color: "#7dffa0" }}>Ton palier est ACQUIS À VIE</b> : tu reprends toujours à ton rang, jamais depuis Bronze (≠ Tour de Combat, où on perd tout). Gagne le tier <b style={{ color: "#7dffa0" }}>⭐ à battre</b> pour le titre suivant.</div>
                        <button onClick={() => { domeLaunchingRef.current = false; setDomeSetup({ tier: frontierTier, bet: DOME_BLINDS[frontierTier].min }) }}
                            style={{ background: "#4cd964", color: "#0a2a12", fontWeight: 800, border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontSize: 14, marginBottom: 10, boxShadow: "0 0 10px #4cd96466" }}>
                            ▶ REPRENDRE À {DOME_TITLES[frontierTier]}
                        </button>
                        <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>ou choisis un palier :</div>
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                            {DOME_TIERS.map((tier, i) => {
                                const bud = DOME_BUDGETS[tier]
                                const locked = i > maxRank
                                const frontier = i === maxRank && champs < DOME_TIERS.length // le tier à BATTRE pour un nouveau titre
                                return (
                                    <button key={tier} disabled={locked} onClick={() => { domeLaunchingRef.current = false; setDomeSetup({ tier, bet: DOME_BLINDS[tier].min }) }}
                                        style={{ background: locked ? "#332e4a" : "#f1c40f", color: locked ? "#8f88b5" : "#1a1a22", fontWeight: 800, border: frontier ? "2px solid #4cd964" : "2px solid transparent", borderRadius: 10, padding: "10px 13px", minWidth: 70, cursor: locked ? "not-allowed" : "pointer", fontSize: 14, lineHeight: 1.3, opacity: locked ? 0.7 : 1, boxShadow: frontier ? "0 0 10px #4cd96488" : "none" }}>
                                        {frontier ? "⭐ " : ""}{locked ? "🔒 " : ""}{DOME_TITLES[tier]}<br /><span style={{ fontSize: 10, opacity: 0.78 }}>{locked ? `bats ${DOME_TITLES[DOME_TIERS[maxRank]]}` : bud.shiny === "full" ? "✨✨ full shiny" : bud.shiny === "half" ? "✨ mi-shiny" : isDanTier(tier) ? `Saiyan ${bud.saiyanPerMon}` : frontier ? "à battre" : `Niv ${bud.level}`}</span>
                                    </button>
                                )
                            })}
                        </div>
                        <button onClick={() => setDomeRegisterOpen(false)} style={{ marginTop: 10, background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 11 }}>✕ Fermer</button>
                    </div>
                )
            })()}
            {/* CARROUSEL DU MAÎTRE DU DÔME (mage central) : S'inscrire / Règles / Stats */}
            {!battle && domeMenuOpen && (() => {
                const champs = getPlayer().domeChampionships ?? 0
                const cur = maxUnlockedTier(champs)
                const curIdx = DOME_TIERS.indexOf(cur)
                const nextT = DOME_TIERS[Math.min(DOME_TIERS.length - 1, curIdx + 1)]
                const dome = player.domeStats ?? { wins: 0, losses: 0, daemonUse: {} as Record<string, number>, moveUse: {} as Record<string, number> }
                const topN = (rec: Record<string, number>, n: number) => Object.entries(rec ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n)
                const tierRow = (t: DomeTier) => { const b = DOME_BUDGETS[t]; const bl = DOME_BLINDS[t]; return `${DOME_TITLES[t]} · Niv ${b.level} · EV ${b.evPerMon} · Saiyan ${b.saiyanPerMon}${b.shiny && b.shiny !== "none" ? ` · ✨ ${b.shiny === "full" ? "équipe shiny" : "mi-shiny"}` : ""} · IA ${b.aiLevel} · mise ${bl.min}-${bl.max}⚡${isDanTier(t) ? " · 🎴 équipe désignée" : ""}` }
                return (
                    <div style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(10,8,20,.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: "min(460px, 94vw)", maxHeight: "88dvh", overflowY: "auto", background: "#1a1a22f2", color: "#fff", border: "3px solid #7c4d9e", borderRadius: 14, padding: "16px 18px", boxShadow: "0 8px 30px #000b" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                                <img src="/yellow/sprites/npc_dome_mage.png" alt="" style={{ width: 40, height: 40, imageRendering: "pixelated" }} />
                                <div style={{ fontWeight: 800, fontSize: 16 }}>LE MAÎTRE DU DÔME</div>
                            </div>
                            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                                {(([["inscrire", "🎟️ S'inscrire"], ["regles", "📜 Règles"], ["stats", "📊 Stats"]]) as [typeof domeTab, string][]).map(([k, lbl]) => (
                                    <button key={k} onClick={() => setDomeTab(k)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, background: domeTab === k ? "#7c4d9e" : "#332e4a", color: "#fff" }}>{lbl}</button>
                                ))}
                            </div>
                            {domeTab === "inscrire" && (
                                <div style={{ textAlign: "center" }}>
                                    {isDomeChampion() && !isMasterCtClaimed("dome") && (
                                        <div style={{ textAlign: "left", background: "rgba(255,215,74,.08)", border: "1.5px solid #ffd54a", borderRadius: 10, padding: 10, marginBottom: 14 }}>
                                            <div style={{ fontWeight: 800, color: "#ffd54a", fontSize: 13, marginBottom: 4 }}>🏆 MAÎTRE DU DÔME — ta récompense t'attend !</div>
                                            <div style={{ fontSize: 10.5, opacity: 0.85, marginBottom: 8, lineHeight: 1.4 }}>Tu as vaincu les 11 tiers, jusqu'au 4ᵉ Dan. Ton nom est gravé dans l'histoire du Dôme. Reçois une CT INÉDITE du Maître :</div>
                                            <MasterCtChoice facility="dome" onClaimed={(name) => { setToast(`🎁 CT « ${name} » apprise ! Sacré MAÎTRE DU DÔME. 🏆`); closeDomeMenu() }} />
                                        </div>
                                    )}
                                    <div style={{ fontSize: 12, opacity: 0.88, marginBottom: 14, lineHeight: 1.55 }}>« Ton palier : <b style={{ color: "#c9a0ff" }}>{DOME_TITLES[cur]}</b>. Prêt à te battre, aspirant ? »<br /><span style={{ fontSize: 10.5, opacity: 0.8 }}>Tu reprends toujours à ton rang — jamais depuis Bronze.</span></div>
                                    <button onClick={() => { closeDomeMenu(); setDomeRegisterOpen(true) }} style={{ background: "#4cd964", color: "#0a2a12", fontWeight: 800, border: "none", borderRadius: 10, padding: "12px 20px", cursor: "pointer", fontSize: 14, boxShadow: "0 0 10px #4cd96466" }}>▶ S'inscrire au tournoi</button>
                                </div>
                            )}
                            {domeTab === "regles" && (
                                <div style={{ fontSize: 11.5, opacity: 0.9, lineHeight: 1.6 }}>
                                    <p style={{ margin: "0 0 8px" }}><b style={{ color: "#c9a0ff" }}>Format :</b> tournoi <b>6v6</b> à élimination (quart → demi → finale). Équipe <b>soignée entre chaque manche</b>.</p>
                                    <p style={{ margin: "0 0 8px" }}><b style={{ color: "#c9a0ff" }}>Mise :</b> buy-in libre en ⚡. Remboursement selon ton classement (🥇 100 % · 🥈 70 % · demi 50 % · quart 25 %, jamais de profit). Le vrai gain = <b>titre + Jetons</b>.</p>
                                    <p style={{ margin: "0 0 8px" }}><b style={{ color: "#c9a0ff" }}>Progression :</b> gagne à <b>ton palier ⭐</b> pour un titre + débloquer le tier suivant.</p>
                                    <p style={{ margin: "0 0 8px" }}><b style={{ color: "#7dffa0" }}>Palier ACQUIS À VIE :</b> un tier débloqué le reste à jamais. Perdre/sortir ne coûte que ta mise, <b>jamais ta progression</b> (≠ Tour de Combat).</p>
                                    <p style={{ margin: 0 }}><b style={{ color: "#c9a0ff" }}>Pas de limite :</b> réinscris-toi autant que ton énergie le permet.</p>
                                </div>
                            )}
                            {domeTab === "stats" && (
                                <div style={{ fontSize: 11.5, opacity: 0.92, lineHeight: 1.55 }}>
                                    <div style={{ fontWeight: 800, color: "#c9a0ff", marginBottom: 3 }}>🏅 Palmarès</div>
                                    <div style={{ marginBottom: 10 }}>{champs} tier{champs > 1 ? "s" : ""} vaincu{champs > 1 ? "s" : ""} · rang max <b>{DOME_TITLES[cur]}</b> · tournois {dome.wins}V / {dome.losses}D</div>
                                    <div style={{ fontWeight: 800, color: "#c9a0ff", marginBottom: 3 }}>🎯 Ton palier & le suivant</div>
                                    <div style={{ marginBottom: 2 }}>▸ {tierRow(cur)}</div>
                                    {curIdx < DOME_TIERS.length - 1 && <div style={{ marginBottom: 10, opacity: 0.72 }}>▸ à venir : {tierRow(nextT)}</div>}
                                    {curIdx >= DOME_TIERS.length - 1 && <div style={{ marginBottom: 10, opacity: 0.72 }}>▸ palier maximal atteint 👑</div>}
                                    <div style={{ fontWeight: 800, color: "#c9a0ff", marginBottom: 3 }}>🐾 Tes Daemons du Dôme</div>
                                    <div style={{ marginBottom: 10 }}>{topN(dome.daemonUse, 5).map(([id, n], i) => `${i + 1}. ${getSpecies(id)?.name ?? id} (${n})`).join(" · ") || "— (aucun tournoi joué)"}</div>
                                    <div style={{ fontWeight: 800, color: "#c9a0ff", marginBottom: 3 }}>💥 Tes attaques du Dôme</div>
                                    <div style={{ marginBottom: 10 }}>{topN(dome.moveUse, 5).map(([id, n], i) => `${i + 1}. ${getMove(id)?.name ?? id} (${n})`).join(" · ") || "— (aucun tournoi joué)"}</div>
                                    <div style={{ fontWeight: 800, color: "#c9a0ff", marginBottom: 5 }}>🏯 Les maîtres du Dôme</div>
                                    <DomeMasters />
                                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>Bientôt : top coups les + forts · top némésis.</div>
                                </div>
                            )}
                            <button onClick={() => closeDomeMenu()} style={{ marginTop: 12, width: "100%", background: "rgba(255,255,255,.12)", color: "#fff", border: "none", borderRadius: 8, padding: "9px", cursor: "pointer", fontSize: 12 }}>✕ Fermer</button>
                        </div>
                    </div>
                )
            })()}
            {/* AUTEL DE LA CHIMÈRE — salle de fusion : choisir 2 Daemons → aperçu → combat-épreuve (le joueur PILOTE le fusionné). */}
            {!battle && fusionMenuOpen && (() => {
                const picks = fusionPick.map((uid) => player.team.find((m) => m.uid === uid)).filter((m): m is MonInstance => !!m)
                const ready = picks.length === 2
                const preview = ready ? computeFusion(fusionParentFromInstance(picks[0]), fusionParentFromInstance(picks[1])) : null
                // Stats des 2 parents (pour mesurer l'amélioration) + BST de la fusion (pour juger sa force).
                const parentStats = picks.map((m) => {
                    const sp = getSpecies(m.speciesId)
                    const st = sp ? fullStats(m, sp) : null
                    return { m, st, sum: st ? st.hp + st.atk + st.def + st.spc + st.spe : 0 }
                })
                const closeIt = () => { setFusionPick([]); closeFusionMenu() }
                const launch = () => {
                    if (!ready) return
                    if (picks[0].speciesId === picks[1].speciesId) { setToast("Impossible de fusionner deux Daemons de la MÊME espèce."); return } // ex. 2 Gavillus → interdit
                    fusionSpeciesRef.current.forEach(disposeFusion) // nettoie les fusions précédentes (joueur + ennemi)
                    const { instance, speciesId, result } = buildFusion(picks[0], picks[1])
                    recordFusionCreated(picks[0].speciesId, picks[1].speciesId); persistYellowSave() // journalise dans « Mes fusions » (Fusiodex) — l'épreuve EST une chimère assemblée à l'Autel (dédup idempotent)
                    const lvl = result.level
                    // ÉPREUVE D'OUVERTURE : vs 2 fusions ennemies (Tonyront EAU/NORMAL · Maîtrelmin COMBAT/ELEC), scalées.
                    const enemy = buildFusionTrialEnemy(lvl)
                    fusionSpeciesRef.current = [speciesId, ...enemy.speciesIds] // à disposer au prochain lancement
                    startFusionTrialBattle([instance], enemy.team, Math.floor(Math.random() * 0x7fffffff))
                    setFusionPick([])
                    closeFusionMenu()
                }
                return (
                    <div style={menuOverlayStyle} onClick={closeIt}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>🧬 AUTEL DE LA CHIMÈRE</div>
                            <div style={{ fontSize: 11, opacity: 0.7, margin: "0 0 8px" }}>Fusionne 2 Daemons le temps d&apos;un combat-épreuve. Tes Daemons ne risquent RIEN (ni XP, ni perte).</div>
                            {player.team.length < 2 && <div style={{ fontSize: 12, color: "#c83030", marginBottom: 6 }}>Il te faut au moins 2 Daemons dans ton équipe.</div>}
                            {player.team.map((m) => {
                                const sp = getSpecies(m.speciesId)
                                const idx = fusionPick.indexOf(m.uid)
                                const picked = idx >= 0
                                // 2 Daemons de la MÊME espèce ne peuvent pas fusionner → une fois le 1er choisi, on grise ses congénères.
                                const dis = !picked && (fusionPick.length >= 2 || (fusionPick.length === 1 && picks[0]?.speciesId === m.speciesId))
                                return (
                                    <button key={m.uid} disabled={dis}
                                        style={{ ...(dis ? menuBtnDimStyle : menuBtnStyle), textAlign: "left", outline: picked ? "2px solid #7c4fc0" : "none", borderRadius: picked ? 6 : undefined }}
                                        onClick={() => setFusionPick((p) => picked ? p.filter((u) => u !== m.uid) : [...p, m.uid])}>
                                        {picked ? (idx === 0 ? "① " : "② ") : "◦ "}{displayName(m)} <span style={{ opacity: 0.6, fontSize: 10 }}>{sp?.types.join("/")} · N.{m.level}</span>
                                    </button>
                                )
                            })}
                            {/* PARENTS : leurs stats actuelles + total, pour comparer à la fusion ci-dessous. */}
                            {ready && parentStats.every((p) => p.st) && (
                                <div style={{ fontSize: 10, opacity: 0.85, margin: "6px 0 2px", display: "flex", flexDirection: "column", gap: 2 }}>
                                    {parentStats.map((p, i) => (
                                        <div key={p.m.uid} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                            <span>{i === 0 ? "①" : "②"} {displayName(p.m)} <span style={{ opacity: 0.6 }}>N.{p.m.level}</span></span>
                                            <span style={{ fontVariantNumeric: "tabular-nums" }}>PV{p.st!.hp}·At{p.st!.atk}·Df{p.st!.def}·Sp{p.st!.spc}·Vi{p.st!.spe} <b>Σ{p.sum}</b></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {preview && (
                                <>
                                    <FusionPreviewCard name={preview.name} types={preview.types} stats={preview.stats} moves={preview.moves} level={preview.level} spriteSrc={officialFusionForParents(picks[0].speciesId, picks[1].speciesId)?.sprite} aSprite={getSpecies(picks[0].speciesId)?.sprite} bSprite={getSpecies(picks[1].speciesId)?.sprite} aId={picks[0].speciesId} bId={picks[1].speciesId} parents={getSpecies(picks[0].speciesId) && getSpecies(picks[1].speciesId) ? [{ name: displayName(picks[0]), stats: fullStats(picks[0], getSpecies(picks[0].speciesId)!) }, { name: displayName(picks[1]), stats: fullStats(picks[1], getSpecies(picks[1].speciesId)!) }] : undefined} />
                                    {preview.heldItems.length > 0 && <div style={{ fontSize: 10, opacity: 0.7, marginTop: -3, marginBottom: 4 }}>🎒 {preview.heldItems.length} objet(s) hérité(s){preview.heldItems.length > 1 ? " (les 2 actifs en combat)" : ""}</div>}
                                </>
                            )}
                            <button style={ready ? menuBtnStyle : menuBtnDimStyle} disabled={!ready} onClick={() => ready && setFusionCompare({ a: picks[0], b: picks[1] })}>🔬 Comparer plein écran (fiches des parents)</button>
                            <button style={ready ? { ...menuBtnStyle, borderColor: "#7c4fc0", color: "#7c4fc0" } : menuBtnDimStyle} disabled={!ready} onClick={launch}>⚔️ LANCER L&apos;ÉPREUVE</button>
                            <button style={menuBtnDimStyle} onClick={closeIt}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}
            {/* ORDINATEUR DE FUSION — ATELIER : assembler l'équipe de fusion (jusqu'à 6), accès boîte/équipe, combat de test. */}
            {!battle && fusionAtelierOpen && (() => {
                const collection = [...player.team, ...player.pc]
                const byUid = (uid: string) => collection.find((m) => m.uid === uid)
                const roster = player.fusionRoster
                const rosterUids = new Set(roster.flatMap((p) => [p.a, p.b])) // uids DÉJÀ engagés → interdits dans une autre fusion
                const listedUids = collection.filter((m) => m.tradeState === "listed").map((m) => m.uid) // posés sur l'étal → verrouillés en fusion
                const nameOf = (uid: string) => { const m = byUid(uid); return m ? displayName(m) : "?" }
                const fusionNameOf = (p: { a: string; b: string }) => {
                    const a = byUid(p.a), b = byUid(p.b)
                    if (!a || !b) return "(invalide)"
                    // Affiche le NOM OFFICIEL si la paire matche une fusion connue (sinon le mot-valise dérivé).
                    return officialFusionForParents(a.speciesId, b.speciesId)?.name ?? computeFusion(fusionParentFromInstance(a), fusionParentFromInstance(b)).name
                }
                const valid = dedupFusions(roster)
                const closeIt = () => { setAtelierAdd(null); setAtelierPicking(null); closeFusionAtelier() }
                const removeAt = (i: number) => { setFusionRoster(roster.filter((_, j) => j !== i)); persistYellowSave() }
                const confirmAdd = () => {
                    const add = atelierAdd
                    if (!add?.a || !add?.b || add.a === add.b || rosterUids.has(add.a) || rosterUids.has(add.b) || roster.length >= 6) return
                    // 2 Daemons de la MÊME espèce ne peuvent pas fusionner (ex. 2 Gavillus).
                    const sameA = byUid(add.a), sameB = byUid(add.b)
                    if (sameA && sameB && sameA.speciesId === sameB.speciesId) { setToast("Impossible de fusionner deux Daemons de la MÊME espèce."); return }
                    // Dédup EXACTE (même ordre = même espèce éphémère) ; (A,B) et (B,A) restent 2 fusions distinctes.
                    if (!roster.some((p) => p.a === add.a && p.b === add.b)) {
                        setFusionRoster([...roster, { a: add.a, b: add.b }])
                        const ma = byUid(add.a), mb = byUid(add.b) // uid → instance → speciesId (stable) pour le journal Fusiodex
                        if (ma && mb) recordFusionCreated(ma.speciesId, mb.speciesId)
                        persistYellowSave()
                    }
                    setAtelierAdd(null); setAtelierPicking(null)
                }
                const fight = () => {
                    if (!valid.length) return
                    // Disposer les fusions précédentes AVANT de construire : les ids d'espèce sont DÉTERMINISTES
                    //   (fusion_<uidA>_<uidB>) → si on rejoue le même roster, disposer après effacerait l'espèce
                    //   qu'on vient de ré-enregistrer → combat planté. (Même ordre que l'épreuve simple.)
                    fusionSpeciesRef.current.forEach(disposeFusion)
                    const built = valid.map((p) => buildFusion(byUid(p.a)!, byUid(p.b)!))
                    const lvl = Math.max(...built.map((f) => f.result.level))
                    // ÉPREUVE D'OUVERTURE : vs les 2 mêmes fusions ennemies que l'épreuve simple (Tonyront · Maîtrelmin).
                    const enemy = buildFusionTrialEnemy(lvl)
                    fusionSpeciesRef.current = [...built.map((f) => f.speciesId), ...enemy.speciesIds]
                    startFusionTrialBattle(built.map((f) => f.instance), enemy.team, Math.floor(Math.random() * 0x7fffffff))
                    closeIt()
                }
                const draftA = atelierAdd?.a ? byUid(atelierAdd.a) : null
                const draftB = atelierAdd?.b ? byUid(atelierAdd.b) : null
                const draftPreview = draftA && draftB && atelierAdd!.a !== atelierAdd!.b ? computeFusion(fusionParentFromInstance(draftA), fusionParentFromInstance(draftB)) : null
                const draftName = draftPreview ? (officialFusionForParents(draftA!.speciesId, draftB!.speciesId)?.name ?? draftPreview.name) : ""
                return (
                    <div style={menuOverlayStyle} onClick={closeIt}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>💻 ATELIER DE FUSION</div>
                            {atelierAdd === null ? (
                                <>
                                    <div style={{ fontSize: 11, opacity: 0.7, margin: "0 0 8px" }}>Assemble jusqu&apos;à 6 fusions et <b>compare leurs stats / BST</b> ici, sans combattre. (Le combat-test est optionnel, en bas.)</div>
                                    {roster.length === 0 && <div style={{ fontSize: 12, opacity: 0.6, margin: "4px 0" }}>Aucune fusion — ajoute-en une ↓</div>}
                                    {roster.map((p, i) => {
                                        const a = byUid(p.a), b = byUid(p.b)
                                        const prev = a && b ? computeFusion(fusionParentFromInstance(a), fusionParentFromInstance(b)) : null
                                        const bst = prev ? prev.stats.hp + prev.stats.atk + prev.stats.def + prev.stats.spc + prev.stats.spe : 0
                                        const isValid = valid.includes(p)
                                        return (
                                            <div key={i} style={{ padding: "6px 9px", border: "1px solid #7c4fc0", borderRadius: 8, margin: "4px 0", background: "rgba(124,79,192,0.07)" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <b style={{ flex: 1, minWidth: 0, color: isValid ? "#7c4fc0" : "#c83030", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i + 1}. {fusionNameOf(p)}</b>
                                                    {prev && <span style={{ fontSize: 10, opacity: 0.9, flexShrink: 0 }}>[{prev.types.join("/")}] N.{prev.level} · <span style={{ color: bst >= 500 ? "#c9a227" : "inherit", fontWeight: 700 }}>BST {bst}</span></span>}
                                                    <button onClick={() => removeAt(i)} style={{ background: "transparent", border: "1px solid #c83030", color: "#c83030", borderRadius: 4, cursor: "pointer", fontSize: 11, padding: "1px 6px", flexShrink: 0 }}>✕</button>
                                                </div>
                                                {prev && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>PV{prev.stats.hp} · At{prev.stats.atk} · Df{prev.stats.def} · Sp{prev.stats.spc} · Vi{prev.stats.spe}</div>}
                                                {prev && <div style={{ fontSize: 9.5, opacity: 0.75, marginTop: 2 }}>⚔️ {prev.moves.map((id) => getMove(id)?.name ?? id).join(" · ")}</div>}
                                                <div style={{ fontSize: 9.5, opacity: 0.5, marginTop: 2 }}>{nameOf(p.a)} + {nameOf(p.b)}</div>
                                            </div>
                                        )
                                    })}
                                    {roster.length < 6 && collection.length >= 2 && <button style={{ ...menuBtnStyle, borderColor: "#7c4fc0", color: "#7c4fc0" }} onClick={() => setAtelierAdd({ a: "", b: "" })}>＋ AJOUTER UNE FUSION</button>}
                                    {collection.length < 2 && <div style={{ fontSize: 11, color: "#c83030", margin: "4px 0" }}>Il te faut au moins 2 Daemons.</div>}
                                    <button style={menuBtnStyle} onClick={() => openPc()}>📦 BOÎTE / ÉQUIPE (ranger tes Daemons)</button>
                                    <button style={menuBtnDimStyle} disabled={!valid.length} onClick={fight}>⚔️ Tester au combat (optionnel){valid.length ? ` — ${valid.length} fusion${valid.length > 1 ? "s" : ""}` : ""}</button>
                                    <button style={menuBtnDimStyle} onClick={closeIt}>← RETOUR</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Choisis les 2 Daemons de cette fusion (Ⓐ + Ⓑ).</div>
                                    {(["a", "b"] as const).map((which) => {
                                        const chosen = atelierAdd[which] ? byUid(atelierAdd[which]) : null
                                        return (
                                            <button key={which} style={{ ...menuBtnStyle, textAlign: "left", outline: atelierPicking === which ? "2px solid #7c4fc0" : "none" }} onClick={() => setAtelierPicking(atelierPicking === which ? null : which)}>
                                                {which === "a" ? "Ⓐ" : "Ⓑ"} {chosen ? `${displayName(chosen)} (${getSpecies(chosen.speciesId)?.types.join("/")}, N.${chosen.level})` : "— choisir —"}
                                            </button>
                                        )
                                    })}
                                    {atelierPicking && (
                                        <FusionPickerView
                                            slot={atelierPicking}
                                            daemons={collection}
                                            disabledUids={new Set([...rosterUids, ...listedUids, atelierAdd[atelierPicking === "a" ? "b" : "a"]].filter(Boolean))}
                                            onPick={(uid) => { setAtelierAdd((d) => d ? { ...d, [atelierPicking]: uid } : d); setAtelierPicking(null) }}
                                            onClose={() => setAtelierPicking(null)}
                                        />
                                    )}
                                    {draftPreview && (
                                        <FusionPreviewCard name={draftName} types={draftPreview.types} stats={draftPreview.stats} moves={draftPreview.moves} level={draftPreview.level} spriteSrc={draftA && draftB ? officialFusionForParents(draftA.speciesId, draftB.speciesId)?.sprite : undefined} aSprite={draftA ? getSpecies(draftA.speciesId)?.sprite : undefined} bSprite={draftB ? getSpecies(draftB.speciesId)?.sprite : undefined} aId={draftA?.speciesId} bId={draftB?.speciesId} parents={draftA && draftB && getSpecies(draftA.speciesId) && getSpecies(draftB.speciesId) ? [{ name: displayName(draftA), stats: fullStats(draftA, getSpecies(draftA.speciesId)!) }, { name: displayName(draftB), stats: fullStats(draftB, getSpecies(draftB.speciesId)!) }] : undefined} />
                                    )}
                                    <button style={draftPreview ? menuBtnStyle : menuBtnDimStyle} disabled={!draftPreview} onClick={() => draftA && draftB && setFusionCompare({ a: draftA, b: draftB })}>🔬 Comparer plein écran (fiches des parents)</button>
                                    <button style={draftPreview ? { ...menuBtnStyle, borderColor: "#7c4fc0", color: "#7c4fc0" } : menuBtnDimStyle} disabled={!draftPreview} onClick={confirmAdd}>✓ AJOUTER CETTE FUSION</button>
                                    <button style={menuBtnDimStyle} onClick={() => { setAtelierAdd(null); setAtelierPicking(null) }}>← ANNULER</button>
                                </>
                            )}
                        </div>
                    </div>
                )
            })()}
            {/* APERÇU FUSION PLEIN ÉCRAN — parents vs fusionné (déclenché depuis l'Autel ou l'Atelier). */}
            {fusionCompare && <FusionCompareView a={fusionCompare.a} b={fusionCompare.b} onClose={() => setFusionCompare(null)} />}
            {/* ZONE DE COMBAT — HUD de série pendant le run */}
            {run && run.status === "active" && (
                <div style={{ position: "absolute", left: 8, top: 8, zIndex: 60, background: "#1a1a22cc", color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
                    🏯 Série {run.streak + 1} · {run.jc} JC{run.isBoss ? " · 👑 BOSS" : ""}
                </div>
            )}
            {/* HUD REPOUSSE — pas restants sans rencontre sauvage (top-center, hors combat). */}
            {!battle && repelSteps > 0 && (
                <div style={{ position: "absolute", left: "50%", top: 8, transform: "translateX(-50%)", zIndex: 60, background: "#2a2140ee", color: "#e6d2ff", border: "1px solid #8a5ae0", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
                    🧴 Repousse · {repelSteps} pas
                </div>
            )}
            {/* HUD LAMPE TORCHE — pas d'autonomie restants (top-center, sous la repousse si les deux sont actives). */}
            {!battle && torchSteps > 0 && (
                <div style={{ position: "absolute", left: "50%", top: repelSteps > 0 ? 34 : 8, transform: "translateX(-50%)", zIndex: 60, background: "#3a2a10ee", color: "#ffdf9e", border: "1px solid #e0a13a", borderRadius: 999, padding: "4px 12px", fontSize: 11, fontWeight: 800, letterSpacing: 0.5, boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
                    🔦 Torche · {torchSteps} pas
                </div>
            )}
            {/* ZONE DE COMBAT — pause entre vagues : Continuer ou Quitter (en gardant les JC) */}
            {run && run.status === "active" && tourChoice && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 62, background: "#1a1a22ee", color: "#fff", border: "2px solid #4cd964", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 330 }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>✅ Vague {run.streak} réussie ! +{run.lastReward} JC{run.lastRefund > 0 ? ` · +${run.lastRefund} ⚡` : ""}</div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8 }}>Cumul : {run.jc} JC · prochaine : vague {run.streak + 1}{run.isBoss ? (run.bossName ? ` · 👑 ${run.bossName} !` : " · 👑 BOSS") : ""}</div>
                    {run.mode === "FACTORY" && usineCt && usineCt.length > 0 && (
                        <div style={{ marginBottom: 8, paddingTop: 6, borderTop: "1px solid #ffffff22" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🎁 Récompense — choisis une CT du vaincu :</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                                {usineCt.map((id) => { const mv = getMove(getCt(id)?.moveId ?? ""); return (
                                    <button key={id} onClick={() => { grantCt(id); setUsineCt(null); persistYellowSave(); setToast(`💿 CT obtenue : ${mv?.name ?? id} !`) }}
                                        style={{ background: "#6aa0ec", color: "#1a1a22", fontWeight: 700, border: "none", borderRadius: 7, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>{mv?.name ?? id}</button>
                                ) })}
                            </div>
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        <button onClick={() => { setTourChoice(false); setUsineCt(null) }} style={{ background: "#4cd964", color: "#0a2a12", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Continuer</button>
                        <button onClick={() => {
                            const ended = quitRun()
                            if (ended && !frontierReportedRef.current) { frontierReportedRef.current = true; postRecordRun({ mode: ended.mode, streak: ended.streak, jcEarned: ended.jc }) }
                            setToast(`🏁 Série quittée — ${ended?.streak ?? 0} victoire(s) · ${ended?.jc ?? 0} JC gardés`)
                            setTourChoice(false); setUsineCt(null); endRun()
                        }} style={{ background: "#555", color: "#fff", fontWeight: 700, border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>Quitter (garder les JC)</button>
                    </div>
                </div>
            )}
            {/* ZONE DE COMBAT — HUD du Dôme (round courant) */}
            {/* HUD compact (toujours visible pendant un Dôme actif) */}
            {dome && dome.state.status === "active" && (
                <div style={{ position: "absolute", left: 8, top: 8, zIndex: 60, background: "#1a1a22cc", color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
                    🏆 Dôme · {(["Quart", "Demi", "Finale"][dome.state.round]) ?? `Manche ${dome.state.round + 1}`} ({dome.state.round + 1}/{DOME_ROUNDS}) · {DOME_TITLES[dome.tier]} · mise {dome.bet}⚡
                </div>
            )}
            {/* ÉCRAN D'INTRO avant chaque match du Dôme : bracket du round + adversaire annoncé + bouton Affronter */}
            {dome && dome.state.status === "active" && domePause && !battle && !frontierResult && evolutions.length === 0 && !dialogue && (() => {
                const opp = playerOpponent(dome.state)
                return (
                    <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 62, background: "#1a1a22f2", color: "#fff", border: "2px solid #f1c40f", borderRadius: 12, padding: "12px 14px", textAlign: "center", width: "min(340px, 94vw)" }}>
                        <DomeBracket state={dome.state} />
                        <div style={{ fontSize: 12, margin: "2px 0 4px" }}>{opp ? <>Ton adversaire : <b style={{ color: "#f1c40f" }}>{opp.name}</b>{opp.epithet ? <span style={{ opacity: 0.7 }}> — « {opp.epithet} »</span> : null}</> : "En attente…"}</div>
                        {opp?.taunt && <div style={{ fontSize: 11, fontStyle: "italic", opacity: 0.75, margin: "0 0 8px", lineHeight: 1.4 }}>« {opp.taunt} »</div>}
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
                            <button onClick={() => setDomePause(false)} style={{ background: "#f1c40f", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>⚔️ Affronter</button>
                            <button onClick={() => {
                                if (!window.confirm("Abandonner le tournoi ? Tu récupères ta mise selon ta place ACTUELLE (pas de titre).")) return
                                const p = domeFinalPlacement(false, dome.state.round) // forfait = éliminé à ce round
                                const refundF = domeEnergyRefund(dome.bet, p)
                                const credited = refundF > 0 ? grantReps(refundF, true) : 0
                                // Énergie d'attaque cumulée sur les matchs DÉJÀ gagnés : rendue AUSSI à l'abandon (déjà méritée).
                                const energyBackF = dome.energyAccrued > 0 ? grantReps(dome.energyAccrued, true) : 0
                                const jcF = domeJcReward(dome.bet, dome.tier, p)
                                void persistYellowSaveNow() // immédiat (fini la perte de mise/énergie si on quitte vite)
                                postRecordRun({ mode: "DOME", streak: dome.state.round, jcEarned: jcF })
                                setToast(`🏳️ Dôme abandonné (${["quart", "demi", "finale"][dome.state.round] ?? "manche"}) : +${jcF} 🪙 · ${credited + energyBackF} ⚡ rendus.`)
                                setDome(null); setDomePause(false)
                            }} style={{ background: "rgba(255,255,255,.12)", color: "#e6e0ff", fontWeight: 700, border: "1px solid rgba(255,255,255,.2)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12 }}>🏳️ Abandonner</button>
                        </div>
                    </div>
                )
            })()}
            <GuidePanel />
            {arenaInfoOpen && <ArenaInfoPanel badge={arenaInfoOpen} isRun2={activeWorld === "ngplus"} isRun3={activeWorld === "run3"} onClose={closeArenaInfo} />}

            {/* RUN 3 — CHOIX à la fin du run 2 : fusionner maintenant (finir) OU lancer le concours (méga-fusion plus tard). */}
            {run3Offer && (
                <div style={menuOverlayStyle}>
                    <div style={{ ...menuBoxStyle, background: "#1c1408", color: "#f5ecd0", border: "3px solid #ffd54a" }} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🔥 UN TROISIÈME DÉFI ?</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, margin: "2px 0 10px", color: "#eee" }}>
                            Tu boucles ta seconde vie avec <b style={{ color: "#ffe36b" }}>{run3Offer.score}⚡</b> en réserve.
                            <div style={{ margin: "8px 0 2px", padding: "8px 10px", background: "rgba(255,227,107,0.14)", border: "1px solid rgba(255,227,107,0.35)", borderRadius: 8, textAlign: "center" }}>
                                🏅 Ton <b>MEILLEUR score</b> du run 2 : <b style={{ color: "#ffe36b", fontSize: 18 }}>{run3Offer.bestGrade}</b><span style={{ opacity: 0.6 }}> / 1000</span>
                            </div>
                            Deux voies s'ouvrent :
                            <div style={{ margin: "8px 0 0", padding: "8px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }}>
                                🍝 <b>Fusionner</b> : tes Daemons du run 1 rejoignent ton PC, le run 2 devient ton compte. C'est fini.
                            </div>
                            <div style={{ margin: "6px 0 0", padding: "8px 10px", background: "rgba(255,120,40,0.12)", borderRadius: 8, fontSize: 12 }}>
                                🔥 <b>Lancer le RUN 3</b> — le concours ultime (500⚡, source unique). <b style={{ color: "#ff9a5a" }}>⚠️ Ton run 1 ET ton run 2 restent GELÉS</b> : tu récupères TOUT (méga-fusion) seulement à la fin du run 3, à 0⚡. <b>Pas de retour.</b>
                            </div>
                        </div>
                        <button style={menuBtnStyle} onClick={() => { setRun3Offer(null); setRun3StarterChoice(true) }}>🔥 Lancer le RUN 3</button>
                        <button style={menuBtnDimStyle} onClick={() => {
                            const { score, bestGrade } = run3Offer
                            setRun3Offer(null)
                            completeNewGamePlus().finally(() => {
                                showDialogue("y_ligue_maitre", "FUSION DES TIMELINES", [
                                    "L'équipe que tu avais un jour abandonnée s'incline devant ta création.",
                                    `Tu boucles cette seconde vie avec ${score}⚡ en réserve — un dernier écho de ton périple.`,
                                    `Ton MEILLEUR score du run 2, ${bestGrade}/1000, est gravé au classement du Nexus. Sauras-tu le battre un jour ?`,
                                    "En cet instant, tes deux destins n'en font plus qu'UN : tous tes anciens Daemons rejoignent ton PC.",
                                    "Le cycle est bouclé, Maître. Ta lignée custom règne désormais sur le Nexus fusionné. 🍝",
                                ])
                            })
                        }}>🍝 Fusionner maintenant (finir le run 2)</button>
                    </div>
                </div>
            )}

            {/* RUN 3 — FIN DU CONCOURS (0⚡ OU sacre du Maître) : méga-fusion 3-voies FORCÉE (un seul bouton). */}
            {run3EndOffer && (
                <div style={menuOverlayStyle}>
                    <div style={{ ...menuBoxStyle, background: "#1c1408", color: "#f5ecd0", border: "3px solid #ffd54a" }} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>{run3EndOffer.reason === "master" ? "👑 CONCOURS REMPORTÉ" : "🏁 CONCOURS TERMINÉ"}</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, margin: "2px 0 10px", color: "#eee" }}>
                            {run3EndOffer.reason === "master"
                                ? <>Tu as terrassé <b style={{ color: "#ffe36b" }}>LE MAÎTRE</b> de la Ligue à la force de ton concours ! Sacre au sommet — le run 3 s'achève dans la gloire.</>
                                : <>Ton énergie est <b style={{ color: "#ff9a5a" }}>épuisée</b> — plus de quoi lancer la moindre attaque. Le concours s'achève ici.</>}
                            <div style={{ margin: "8px 0 0", padding: "8px 10px", background: "rgba(255,227,107,0.12)", borderRadius: 8, fontSize: 12 }}>
                                🏆 Ton score : <b style={{ color: "#ffe36b" }}>{run3EndOffer.score}</b> — gravé dans le Nexus.
                            </div>
                            <div style={{ margin: "6px 0 0", padding: "8px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }}>
                                🍝 <b>MÉGA-FUSION</b> : tes trois vies (run 1 + run 2 + run 3) n'en font plus qu'UNE. Ton équipe du concours reste active ; tous tes anciens Daemons, objets et CT te rejoignent au PC/sac. La suite t'attend au <b>SUD de Ville Jaune</b>…
                            </div>
                        </div>
                        <button style={menuBtnStyle} onClick={async () => {
                            const score = run3EndOffer.score
                            setRun3EndOffer(null)
                            // LEADERBOARD : score run 3 remonté AVANT la fusion (irréversible). On ATTEND le POST
                            //   (avec catch : hors-ligne → on fusionne quand même) pour ne pas perdre le score en silence.
            const energyScore = run3EnergyScore(getPlayer().run3EnergyByArena)
                            try {
                                // Les DEUX podiums remontés AVANT la fusion (irréversible) : Conquérant (Σ niveaux) ET Survivant
                                //   (Σ énergie). Sans ça, mergeWorlds vide run3World → le classement « Survie » resterait vide
                                //   pour tous les finisseurs (le pull ne peut plus recalculer). En parallèle, on continue au catch.
                                await Promise.all([
                                    fetch("/api/gamebook/yellow/run-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: "run3", score }) }),
                                    fetch("/api/gamebook/yellow/run-scores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ run: "run3energy", score: energyScore }) }),
                                ])
                            } catch { /* hors-ligne : scores non remontés, la fusion continue */ }
                            completeRun3().finally(() => {
                                showDialogue("y_ligue_maitre", "🌀 MÉGA-FUSION", [
                                    "Le concours s'éteint dans un dernier éclat d'énergie…",
                                    `Ton score final : ${score}. Gravé au grand registre du Nexus — sauras-tu le battre un jour ?`,
                                    "En cet instant, tes TROIS vies FUSIONNENT : run 1, run 2 et run 3 n'en font plus qu'un seul monde unifié.",
                                    "🖥️ Fonce au PC d'un Centre Daemon : TOUTES tes équipes, tes captures et tes fusions des TROIS runs y sont réunies — et tes objets & CT dans ton sac. Compose ta team ULTIME en piochant le meilleur de chaque vie.",
                                    "🗺️ Ensuite, cap au SUD de Ville Jaune : là veille SYLVEBARBE. Une fois la voie franchie, la ZONE DE COMBAT s'ouvre à toi.",
                                    "⚔️ Un conseil : décroche d'abord l'OR au DÔME DE COMBAT — sans ce titre, le gardien de la grotte te refoulera.",
                                    "💰 Dans la ZONE DE COMBAT, trouve le MARCHAND : lui SEUL ouvre la GROTTE DU NEXUS, pour 50 Jetons de Combat (gagnés à la Tour, l'Usine et le Dôme).",
                                    "🌀 Traverse son dédale — ta Grotte Victoire — et tout au fond t'attend l'ULTIME Ligue, avec les secrets qu'elle scelle. Va, Maître ! 🍝",
                                ])
                            })
                        }}>🌀 MÉGA-FUSION</button>
                    </div>
                </div>
            )}

            {/* RUN 3 — CHOIX DU STARTER : les 3 lignées en triangle (Métal › Fée › Combat › Métal). */}
            {/* RUN 3 — choix de la lignée via la CINÉMATIQUE (jumelle de l'intro run 1, lisible), dialogues adaptés.
                Le Dieu Spaghetti présente le concours + le triangle → choix → outro → launchRun3 (règles 500⚡). */}
            {run3StarterChoice && <Run3IntroCinematic onComplete={(id) => void launchRun3(id)} />}

            {/* REJEU (« run bis ») — LANCEUR : choisir quel run terminé rejouer (bulle isolée, cf. saveManager). */}
            {replayMenu && (
                <div style={menuOverlayStyle} onClick={() => setReplayMenu(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🔁 REJOUER UN RUN</div>
                        <div style={{ fontSize: 10, opacity: 0.75, textAlign: "center", marginBottom: 6, lineHeight: 1.35 }}>
                            RUN 1 & 3 : bulle ISOLÉE (améliore ton score + complète ton Pokédex, ton monde reste intact, classement « {nickname || "Toi"}² »). RUN 2 : ADDITIF — repars avec ton starter perso (niv 5, 10 000⚡) et les Daemons capturés REJOIGNENT ta collection.
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, textAlign: "center", marginBottom: 8, color: replayNextCost ? "#c9a227" : "#3ad06a" }}>
                            💠 Prochain rejeu : {replayNextCost === null ? "…" : replayNextCost === 0 ? "GRATUIT" : `${replayNextCost} JC`}
                        </div>
                        <button style={menuBtnStyle} onClick={() => { setReplayMenu(false); setProfileView(true) }}>🏅 Rejouer le RUN 1 (nouveau profil){profileCount() > 1 ? ` · ${profileCount()} profils` : ""}</button>
                        {getPlayer().ngplusUsed && (
                            <button style={menuBtnStyle} onClick={() => setConfirmStartReplay("run2")}>🏆 Rejouer le RUN 2</button>
                        )}
                        {getPlayer().run3Used && (
                            <button style={menuBtnStyle} onClick={() => setConfirmStartReplay("run3")}>🔥 Rejouer le RUN 3</button>
                        )}
                        <button style={menuBtnDimStyle} onClick={() => setReplayMenu(false)}>← Retour</button>
                    </div>
                </div>
            )}
            {/* REJEU run 2 — choix du Daemon custom de départ (comme le NG+). */}
            {replayPickRun === "run2" && (
                <div style={menuOverlayStyle} onClick={() => setReplayPickRun(null)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>REJEU RUN 2 — ton starter</div>
                        {(getPlayer().customDaemons ?? []).map((d, i) => (
                            <button key={i} style={menuBtnStyle} onClick={() => { let s; try { s = createMonInstance(customStarterSpeciesId(d), 5, { owned: true }) } catch { setToast("Daemon custom corrompu."); return } void doStartReplay("run2", s) }}>⚔️ {d.spec.name}</button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setReplayPickRun(null)}>← Retour</button>
                    </div>
                </div>
            )}
            {/* REJEU run 3 — choix du starter (les 3 lignées) via la cinématique existante. */}
            {replayPickRun === "run3" && <Run3IntroCinematic onComplete={(id) => { let s; try { s = createMonInstance(id, 5, { owned: true }) } catch { setToast("Starter introuvable."); return } void doStartReplay("run3", s) }} />}
            {/* MULTI-PROFILS — « Mes profils » : créer un 2ᵉ profil (Run 1) + basculer entre profils COEXISTANTS. */}
            {profileView && (
                <div style={menuOverlayStyle} onClick={() => setProfileView(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🧬 MES PROFILS</div>
                        <div style={{ fontSize: 10, opacity: 0.75, textAlign: "center", marginBottom: 8, lineHeight: 1.35 }}>
                            « Rejouer le RUN 1 » crée un 2ᵉ profil COMPLET à zéro (nouvelle création possible). Les profils COEXISTENT : rien n'est fusionné ni supprimé, tu bascules quand tu veux.
                        </div>
                        {getAltProfileSummaries().length < MAX_ALT_PROFILES
                            ? <button style={menuBtnStyle} onClick={() => void doNewProfileRun1()}>🆕 Nouveau profil (recommencer au Run 1)</button>
                            : <div style={{ fontSize: 10, opacity: 0.6, textAlign: "center", margin: "4px 0" }}>Maximum de {MAX_ALT_PROFILES + 1} profils atteint.</div>}
                        {getAltProfileSummaries().length < MAX_ALT_PROFILES && <button style={menuBtnStyle} onClick={openGenesisCraft}>🌱 Mode GENÈSE — 6 craftés, zéro capture</button>}
                        {getAltProfileSummaries().length > 0 && <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.7, margin: "8px 0 2px" }}>BASCULER SUR :</div>}
                        {getAltProfileSummaries().map((p, i) => (
                            <button key={i} style={menuBtnStyle} onClick={() => void doSwitchProfile(i)}>
                                🔀 Profil {i + 1} — {p.badges} badge{p.badges > 1 ? "s" : ""}{p.isChampion ? " · Champion" : ""}{p.run3Used ? " · run 3" : p.ngplusUsed ? " · run 2" : ""} · {p.dex} au Dex
                            </button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setProfileView(false)}>← Retour</button>
                    </div>
                </div>
            )}
            {/* REJEU — bannière permanente (rappel : tu es dans une bulle jetable). */}
            {activeWorld === "replay" && !battle && (
                <div style={{ position: "absolute", top: 2, left: "50%", transform: "translateX(-50%)", zIndex: 40, background: "#c9a227", color: "#3a2a00", fontSize: 8, fontWeight: 700, padding: "1px 7px", borderRadius: 8, pointerEvents: "none", whiteSpace: "nowrap", opacity: 0.9 }}>
                    🔁 REJEU · {getReplayRun() === "run3" ? "RUN 3" : getReplayRun() === "run2" ? "RUN 2" : "RUN 1"} bis
                </div>
            )}
            <LibraryPanel />
            <AdvisorPanel />
            <DaemomaniaquePanel />
            <LabPanel />
            <MoveReminderPanel />
            {combatShopOpen && <CombatShopModal onClose={closeCombatShop} onEnterGrotte={() => { closeCombatShop(); setMap("yellow_grotte_nexus", 18, 39) }} />}
            {espionOpen && <EspionPanel onClose={closeEspion} onCharged={(m) => setToast(m)} />}
            {trocOpen && <TrocPanel onClose={closeTroc} onToast={(m) => setToast(m)} />}
            {ticketOpen && <DailyTicketModal mode="daily" today={getPlayer().creditedThrough} onClose={() => { persistYellowSave(); setTicketOpen(false) }} />}
            {belgiumOpen && <DiablesRougesQuiz onClose={() => setBelgiumOpen(false)} />}
            {glandModal && <GlandEvent screen={glandModal} onNext={advanceGland} />}
            <ParkSignPanel />
            <PosterPanel />
            {/* EncounterTransition est désormais rendu DANS BattleScreen (calé sur la scène). */}

            {/* Chat du casino (RECO 8) : bouton flottant + overlay messages/saisie */}
            {inCasino && !battle && !showIntro && !chatOpen && (
                <button onClick={() => { setChatOpen(true); setChatUnread(0) }} style={chatFabStyle} title="Chat du casino">
                    💬
                    {chatUnread > 0 && <span style={chatBadgeStyle}>{chatUnread > 9 ? "9+" : chatUnread}</span>}
                </button>
            )}
            {/* Roulette EUROPÉENNE (bêta) — entrée provisoire dans le casino (la table-sur-map via sprite 16×16 viendra ensuite) */}
            {inCasino && activeWorld !== "run3" && !battle && !showIntro && !chatOpen && !rouletteOpen && (
                <button onClick={() => setRouletteOpen(true)} style={{ ...chatFabStyle, bottom: 84, fontSize: 22 }} title="Roulette européenne">🎡</button>
            )}
            {rouletteOpen && <RouletteCasinoModal onClose={() => setRouletteOpen(false)} />}
            {/* Roulette MULTIJOUEUR (Phase 4) — ouverte en s'approchant de la TABLE (3-5,4-5) + A (cf. tryCasinoObjectA). */}
            {rouletteMpOpen && !!userId && <RouletteMultiTable myUserId={userId} onClose={() => setRouletteMpOpen(false)} />}
            {/* CROUPIER — carrousel : railleries + numéros chauds/froids + top mises & gains (jour/semaine/ever). */}
            {croupierOpen && !!userId && <CroupierPanel myUserId={userId} close={() => setCroupierOpen(false)} onPlay={() => { setCroupierOpen(false); setRouletteMpOpen(true) }} />}
            {/* BARMAN — guide du casino + indice jetons + Potions à prix libre (effets secrets). */}
            {barmanOpen && <BarmanPanel close={() => setBarmanOpen(false)} />}
            {blackjackOpen && <BlackjackPanel close={() => setBlackjackOpen(false)} />}
            {pokerOpen && !dailyPokerOpen && <PokerPanel close={() => setPokerOpen(false)} myUserId={userId} />}
            {/* 1re partie de poker : tuto SOLO local (house-funded). Le flag pokerFirstGameDone est posé
                à l'encaissement (dans SoloPokerPanel) → les fois suivantes ouvrent la vraie table multi. */}
            {soloPokerOpen && <SoloPokerPanel myUserId={userId} onDone={() => setSoloPokerOpen(false)} />}
            {/* Cash quotidien SOLO vs les boss (vraies reps). Ouvert quand aucun pote au casino (sinon table multi). */}
            {dailyPokerOpen && !pokerOpen && !soloPokerOpen && <DailyPokerPanel myUserId={userId} onDone={() => setDailyPokerOpen(false)} />}
            {/* Pokémon Kart : overlay de SÉLECTION (avant la course) ou de RÉSULTATS (après). Pendant la
                course (raceActive), aucun overlay → la course est dans l'écran et les boutons la pilotent. */}
            {kartOpen && !raceActive && (
                <RacePanel
                    mode={raceResults ? "results" : "select"}
                    results={raceResults}
                    onSelect={(cfg) => { resetRaceInput(); setRaceResults(null); setRaceCfg(cfg) }}
                    onReplay={() => { setRaceResults(null); setRaceCfg(null) }}
                    onClose={() => { setKartOpen(false); setRaceCfg(null); setRaceResults(null); resetRaceInput() }}
                />
            )}
            {creatorOpen && (
                <DaemonCreator
                    ownerId={userId} nickname={nickname}
                    close={() => setCreatorOpen(false)}
                    onCreated={forcedCreator ? (spec) => { setCreatorOpen(false); setForcedCreator(false); void launchNewGamePlus({ ownerId: userId, spec }) } : undefined}
                />
            )}

            {/* BOUCLE ENDGAME — créateur en mode « boucle » : à la création, on enchaîne sur un REJEU du run 1 (gratuit,
                bulle isolée) avec la nouvelle création en starter. Créé HORS bulle (l'offre est gatée activeWorld!=="replay"). */}
            {loopCreatorOpen && (
                <DaemonCreator
                    ownerId={userId} nickname={nickname}
                    mode="loop"
                    close={() => setLoopCreatorOpen(false)}
                    onCreated={(spec) => { setLoopCreatorOpen(false); void startLoopReplay({ ownerId: userId, spec }) }}
                />
            )}

            {/* MODE GENÈSE — assistant de craft ×6 : un DaemonCreator FRAIS par étape (key), onCreated accumule via ref. */}
            {genesisCraftStep !== null && (
                <DaemonCreator
                    key={`genesis-${genesisCraftStep}`}
                    ownerId={userId} nickname={nickname}
                    close={() => { setGenesisCraftStep(null); genesisSpecsRef.current = [] }}
                    onCreated={(spec) => void doGenesisCraftStep(spec)}
                />
            )}

            {/* NG+ — confirmation d'ABANDON (chez le Prof. CHEN) : action IRRÉVERSIBLE (starter + 6000⚡ perdus). */}
            {abandonConfirm && (
                <div style={menuOverlayStyle} onClick={() => setAbandonConfirm(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>⚠️ ABANDONNER LE NEW GAME+ ?</div>
                        <div style={{ fontSize: 11.5, textAlign: "center", lineHeight: 1.6, opacity: 0.9, marginBottom: 4 }}>
                            Tu rends ton Daemon créé et tes <b>6000⚡</b> — <b style={{ color: "#c83030" }}>perdus À JAMAIS</b>.<br />
                            En échange, tu récupères ta partie de <b>Champion</b>, la <b>Daemonflûte</b> et l&apos;accès à la <b>Zone de Combat</b>.
                        </div>
                        <button style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030" }} onClick={async () => {
                            const ok = await abandonNewGamePlus()
                            setAbandonConfirm(false)
                            if (ok) {
                                setMap("yellow_cendreville", CENDREVILLE_SPAWN.x, CENDREVILLE_SPAWN.y)
                                showDialogue("y_lab_scientist", "Prof. CHEN", [
                                    "*Le Prof. CHEN récupère ton Daemon avec un soupir mélancolique, puis te tend un instrument de bois ouvragé.*",
                                    "« Décision sage, peut-être. Voici la Daemonflûte — l'œuvre de ma vie. Va réveiller le colosse au SUD : la ZONE DE COMBAT t'attend, Champion. »",
                                ])
                            } else setToast("Trop tard : tu es déjà engagé dans le New Game+.")
                        }}>🔥 OUI, j&apos;abandonne (perte définitive)</button>
                        <button style={menuBtnDimStyle} onClick={() => setAbandonConfirm(false)}>← NON, je continue mon NG+</button>
                    </div>
                </div>
            )}
            {chatOpen && (
                <div style={menuOverlayStyle} onClick={() => setChatOpen(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>💬 CHAT CASINO</div>
                        <div style={{ minHeight: 110, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, padding: "6px 2px", fontSize: 12.5, lineHeight: 1.35 }}>
                            {chat.lines.length === 0
                                ? <div style={{ opacity: 0.5, textAlign: "center", padding: 14 }}>Aucun message. Dis bonjour ! 👋</div>
                                : chat.lines.map((l) => (
                                    <div key={l.id}><b style={{ color: l.mine ? "#1f7a3a" : "#9a3010" }}>{l.mine ? "moi" : l.nickname}</b> : {l.text}</div>
                                ))}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <input
                                value={chatText}
                                onChange={(e) => setChatText(e.target.value)}
                                maxLength={80}
                                placeholder="Écris un message…"
                                onKeyDown={(e) => { if (e.key === "Enter") { chat.send(chatText); setChatText("") } }}
                                style={{ flex: 1, padding: "9px 10px", border: "2px solid #1c1408", borderRadius: 8, fontSize: 13, minWidth: 0 }}
                            />
                            <button style={{ ...menuBtnStyle, width: "auto", padding: "0 14px", flexShrink: 0 }} onClick={() => { chat.send(chatText); setChatText("") }}>Envoyer</button>
                        </div>
                        <button style={menuBtnDimStyle} onClick={() => setChatOpen(false)}>← Fermer</button>
                    </div>
                </div>
            )}

            {/* === ÉCHANGE (RECO 4) === */}
            {/* 1) Menu d'interaction face à un joueur */}
            {interactTarget && !trade.session && !tradePickFor && !ctTrade.session && !ctTradePickFor && (
                <div style={menuOverlayStyle} onClick={() => { if (Date.now() - menuTapGuard.current < 350) return; setInteractTarget(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>{interactTarget.nickname}</div>
                        {inAutel ? (
                            // SALLE DE FUSION : uniquement le défi de FUSION (pas d'échange ici).
                            myFusionCount > 0 ? (
                                <button style={menuBtnStyle} onClick={() => { challenge.sendChallenge(interactTarget.userId, interactTarget.nickname); setInteractTarget(null) }}>🧬 Défier en combat de FUSION</button>
                            ) : (
                                <div style={{ fontSize: 11, opacity: 0.8, textAlign: "center", margin: "4px 0 10px", lineHeight: 1.4 }}>
                                    Assemble d&apos;abord une équipe de fusion au 💻 (au moins 1 fusion) pour pouvoir défier.
                                </div>
                            )
                        ) : (<>
                            <button style={menuBtnStyle} onClick={() => { challenge.sendChallenge(interactTarget.userId, interactTarget.nickname); setInteractTarget(null) }}>⚔️ Défier en combat</button>
                            <button style={menuBtnStyle} onClick={() => { setTradePickFor(interactTarget); setInteractTarget(null) }}>🔄 Proposer un échange</button>
                            <button style={menuBtnStyle} onClick={() => { setCtTradePickFor(interactTarget); setInteractTarget(null) }}>🎴 Échanger une CT</button>
                        </>)}
                        <button style={menuBtnDimStyle} onClick={() => setInteractTarget(null)}>← Annuler</button>
                    </div>
                </div>
            )}

            {/* 2) Choix du Daemon à offrir (initiateur OU répondeur) */}
            {(tradePickFor || (trade.session?.role === "B" && !trade.session.myMon)) && (
                <div style={menuOverlayStyle} onClick={() => { if (tradePickFor) setTradePickFor(null); else trade.cancel() }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>{tradePickFor ? `Offrir à ${tradePickFor.nickname}` : `${trade.session?.partnerNickname} propose un échange`}</div>
                        {trade.session?.theirMon && (
                            <div style={{ fontSize: 12, marginBottom: 8, textAlign: "center" }}>
                                Il offre : <b>{getSpecies(trade.session.theirMon.speciesId)?.name}</b> N.{trade.session.theirMon.level}
                            </div>
                        )}
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Choisis ton Daemon à donner :</div>
                        <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                            {player.team.map((m) => (
                                <button key={m.uid} style={menuBtnStyle} onClick={() => {
                                    if (tradePickFor) { trade.startOffer(tradePickFor.userId, tradePickFor.nickname, m); setTradePickFor(null) }
                                    else trade.acceptWith(m)
                                }}>
                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>{m.nickname || getSpecies(m.speciesId)?.name}</span><span>N.{m.level}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button style={menuBtnDimStyle} onClick={() => { if (tradePickFor) setTradePickFor(null); else trade.acceptWith(null) }}>← {tradePickFor ? "Annuler" : "Refuser"}</button>
                    </div>
                </div>
            )}

            {/* 3) Panneau d'échange : les 2 offres + DOUBLE confirmation (pas de fermeture accidentelle) */}
            {trade.session && trade.session.myMon && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🔄 ÉCHANGE — {trade.session.partnerNickname}</div>
                        <div style={{ display: "flex", justifyContent: "space-around", gap: 8, margin: "10px 0", fontSize: 12, textAlign: "center" }}>
                            <div>
                                <div style={{ opacity: 0.6, fontSize: 10 }}>Tu donnes</div>
                                <div><b>{trade.session.myMon.nickname || getSpecies(trade.session.myMon.speciesId)?.name}</b></div>
                                <div>N.{trade.session.myMon.level}</div>
                                <div style={{ fontSize: 16 }}>{trade.session.myConfirmed ? "✅" : "⏳"}</div>
                            </div>
                            <div style={{ alignSelf: "center", fontSize: 18 }}>⇄</div>
                            <div>
                                <div style={{ opacity: 0.6, fontSize: 10 }}>Tu reçois</div>
                                {trade.session.theirMon ? (
                                    <>
                                        <div><b>{getSpecies(trade.session.theirMon.speciesId)?.name}</b></div>
                                        <div>N.{trade.session.theirMon.level}</div>
                                        <div style={{ fontSize: 16 }}>{trade.session.theirConfirmed ? "✅" : "⏳"}</div>
                                    </>
                                ) : <div style={{ opacity: 0.5, marginTop: 8 }}>en attente…</div>}
                            </div>
                        </div>
                        {trade.session.theirMon ? (
                            <button style={trade.session.myConfirmed ? menuBtnDimStyle : menuBtnStyle} disabled={trade.session.myConfirmed} onClick={() => trade.confirm()}>
                                {trade.session.myConfirmed ? "En attente de l'autre dresseur…" : "✅ Confirmer l'échange"}
                            </button>
                        ) : (
                            <div style={{ textAlign: "center", fontSize: 11, opacity: 0.6, padding: 8 }}>En attente de son Daemon…</div>
                        )}
                        <button style={menuBtnDimStyle} onClick={() => trade.cancel()}>← Annuler l'échange</button>
                    </div>
                </div>
            )}

            {/* ÉCHANGE DE CT — choix de la CT à offrir (initiateur OU répondeur) */}
            {(ctTradePickFor || (ctTrade.session?.role === "B" && !ctTrade.session.myCt)) && (
                <div style={menuOverlayStyle} onClick={() => { if (ctTradePickFor) setCtTradePickFor(null); else ctTrade.cancel() }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>{ctTradePickFor ? `🎴 Offrir une CT à ${ctTradePickFor.nickname}` : `${ctTrade.session?.partnerNickname} propose une CT`}</div>
                        {ctTrade.session?.theirCt && (
                            <div style={{ fontSize: 12, marginBottom: 8, textAlign: "center" }}>
                                Il offre : <b>{getCt(ctTrade.session.theirCt)?.label}</b> · {getMove(getCt(ctTrade.session.theirCt)?.moveId ?? "")?.name}
                            </div>
                        )}
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Choisis ta CT à donner :</div>
                        {player.ownedCts.length === 0 && <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Tu n'as aucune CT à échanger.</div>}
                        <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                            {player.ownedCts.map((id) => getCt(id)).filter((c): c is NonNullable<typeof c> => !!c).map((ct) => (
                                <button key={ct.id} style={menuBtnStyle} onClick={() => {
                                    if (ctTradePickFor) { ctTrade.startOffer(ctTradePickFor.userId, ctTradePickFor.nickname, ct.id); setCtTradePickFor(null) }
                                    else ctTrade.acceptWith(ct.id)
                                }}>
                                    <span style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                        <span>{ct.label}</span><span>{getMove(ct.moveId)?.name}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <button style={menuBtnDimStyle} onClick={() => { if (ctTradePickFor) setCtTradePickFor(null); else ctTrade.acceptWith(null) }}>← {ctTradePickFor ? "Annuler" : "Refuser"}</button>
                    </div>
                </div>
            )}

            {/* ÉCHANGE DE CT — les 2 offres + DOUBLE confirmation */}
            {ctTrade.session && ctTrade.session.myCt && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🎴 ÉCHANGE DE CT — {ctTrade.session.partnerNickname}</div>
                        <div style={{ display: "flex", justifyContent: "space-around", gap: 8, margin: "10px 0", fontSize: 12, textAlign: "center" }}>
                            <div>
                                <div style={{ opacity: 0.6, fontSize: 10 }}>Tu donnes</div>
                                <div><b>{getCt(ctTrade.session.myCt)?.label}</b></div>
                                <div>{getMove(getCt(ctTrade.session.myCt)?.moveId ?? "")?.name}</div>
                                <div style={{ fontSize: 16 }}>{ctTrade.session.myConfirmed ? "✅" : "⏳"}</div>
                            </div>
                            <div style={{ alignSelf: "center", fontSize: 18 }}>⇄</div>
                            <div>
                                <div style={{ opacity: 0.6, fontSize: 10 }}>Tu reçois</div>
                                {ctTrade.session.theirCt ? (
                                    <>
                                        <div><b>{getCt(ctTrade.session.theirCt)?.label}</b></div>
                                        <div>{getMove(getCt(ctTrade.session.theirCt)?.moveId ?? "")?.name}</div>
                                        <div style={{ fontSize: 16 }}>{ctTrade.session.theirConfirmed ? "✅" : "⏳"}</div>
                                    </>
                                ) : <div style={{ opacity: 0.5, marginTop: 8 }}>en attente…</div>}
                            </div>
                        </div>
                        {ctTrade.session.theirCt ? (
                            <button style={ctTrade.session.myConfirmed ? menuBtnDimStyle : menuBtnStyle} disabled={ctTrade.session.myConfirmed} onClick={() => ctTrade.confirm()}>
                                {ctTrade.session.myConfirmed ? "En attente de l'autre dresseur…" : "✅ Confirmer l'échange"}
                            </button>
                        ) : (
                            <div style={{ textAlign: "center", fontSize: 11, opacity: 0.6, padding: 8 }}>En attente de sa CT…</div>
                        )}
                        <button style={menuBtnDimStyle} onClick={() => ctTrade.cancel()}>← Annuler l'échange</button>
                    </div>
                </div>
            )}

            {!battle && shopOpen && (
                <div style={menuOverlayStyle} onClick={closeShop}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>BOUTIQUE</span><span>💪 {player.reps}/{player.repsCap} reps</span>
                        </div>
                        {isAbundanceCurseActive() && (
                            <div style={{ fontSize: 11, color: "#e8b84a", background: "rgba(232,184,74,0.12)", borderRadius: 8, padding: "6px 8px", margin: "4px 0 6px", lineHeight: 1.4 }}>
                                🍝 <b>Abondance maudite</b> — achat payant COUPÉ. {abundanceFreeItemAvailableToday() ? "Choisis 1 objet GRATUIT aujourd'hui (hors CT)." : "Objet gratuit du jour déjà pris — reviens demain."}
                            </div>
                        )}
                        {(() => {
                            const groups: [string, string][] = [["BALL", "🔴 Balls"], ["HEAL", "❤️ Soins"], ["STATUS_HEAL", "💊 Statuts"], ["BOOST", "⬆️ Boosts (combat)"]]
                            const sellable = Object.values(ITEMS).filter((it) => it.price > 0)
                            // BOURSE (endgame run 3) : prix dynamiques (heure serveur + Sylvebarbe + inflation perso). Avant run 3 = prix de base.
                            const bourseCtx = { hour: bourseHour ?? new Date().getHours(), sylvebarbeAwake: player.sylvebarbeAwake, potionBuysToday: getPotionBuysToday(), jcEnergyBuysToday: getJcEnergyBuysToday(), active: player.run3Used }
                            const priceOf = (it: { price: number; category: string }) => shopPrice(it.price, it.category, bourseCtx)
                            // Balls FORTES réservées à la 2e ville (Cendreville). En 1re ville (Ville Jaune), on ne
                            // vend que les balls de base ; le shop étant partagé, on filtre selon la ville d'entrée.
                            const SECOND_TOWN_BALLS = new Set(["super_ball_plus", "hyper_ball", "hyper_ball_plus"])
                            const inSecondTown = interiorReturn?.mapId === "yellow_cendreville"
                            return groups.map(([cat, label]) => {
                                const list = sellable.filter((it) => it.category === cat && !(cat === "BALL" && !inSecondTown && SECOND_TOWN_BALLS.has(it.id)))
                                if (!list.length) return null
                                return (
                                    <div key={cat}>
                                        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: "6px 0 2px" }}>{label}</div>
                                        {list.map((it) => {
                                            const owned = player.items[it.id] ?? 0
                                            const ballLocked = it.category === "BALL" && player.ballLockRemaining > 0 // VŒU DU GÉNIE : achat de Ball verrouillé
                                            const curse = isAbundanceCurseActive() // VŒU MAUDIT (Jacanon) : achat payant coupé, 1 objet gratuit/jour (hors CT)
                                            const freeAvail = curse && abundanceFreeItemAvailableToday()
                                            const price = priceOf(it) // BOURSE : prix dynamique (base hors run 3)
                                            const afford = player.reps >= price
                                            const usable = curse ? freeAvail : (afford && !ballLocked) // maudit → seul l'objet gratuit du jour est cliquable
                                            return (
                                                <button
                                                    key={it.id}
                                                    style={usable ? menuBtnStyle : menuBtnDimStyle}
                                                    disabled={!usable}
                                                    onClick={() => {
                                                        if (curse) { if (takeFreeShopItem(it.id)) { persistYellowSave(); setToast(`🎁 Objet gratuit du jour : ${it.name} ! (vœu maudit)`) } return }
                                                        setBuyConfirm({ id: it.id, name: it.name, price }); setBuyQty(1)
                                                    }}
                                                >
                                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                        <span>{it.name}{owned > 0 ? ` (×${owned})` : ""}</span>
                                                        <span>{curse ? "GRATUIT" : `${price} reps`}</span>
                                                    </span>
                                                    <span style={{ display: "block", fontSize: 10, opacity: 0.6, fontWeight: 400 }}>{it.description}</span>
                                                </button>
                                            )
                                        })}
                                        {cat === "BALL" && !inSecondTown && <div style={{ fontSize: 10, opacity: 0.6, padding: "3px 2px" }}>✨ Des Balls plus puissantes se vendent à Cendreville…</div>}
                                        {cat === "BALL" && player.ballLockRemaining > 0 && <div style={{ fontSize: 10, color: "#e0b84a", padding: "3px 2px" }}>🔴 Balls verrouillées par le génie : dépense encore {player.ballLockRemaining}⚡.</div>}
                                    </div>
                                )
                            })
                        })()}
                        {/* Super Pasta : +1 niveau, prix dynamique (monte à chaque achat du jour). */}
                        {(() => {
                            const price = superPastaPrice()
                            const afford = player.reps >= price && player.team.length > 0 && !isAbundanceCurseActive() // VŒU MAUDIT : achat payant coupé
                            return (
                                <button
                                    style={afford ? { ...menuBtnStyle, borderColor: "#f5d020" } : menuBtnDimStyle}
                                    disabled={!afford}
                                    onClick={() => setPastaPick(true)}
                                    title="Fait gagner 1 niveau à un Daemon de l'équipe"
                                >
                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>🍝 Super Pasta (+1 niv.)</span>
                                        <span>{price} reps</span>
                                    </span>
                                </button>
                            )
                        })()}
                        {/* Accès aux Capsules Techniques (CT) — coupé pendant l'abondance maudite (CT exclues du gratuit + achat off) */}
                        <button style={isAbundanceCurseActive() ? menuBtnDimStyle : menuBtnStyle} disabled={isAbundanceCurseActive()} onClick={() => { setCtShop(true); setCtPick(null) }}>
                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>🎓 Capsules CT</span><span>attaques</span>
                            </span>
                        </button>
                        <button style={menuBtnStyle} onClick={() => setSellMode(true)}>
                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>💰 Revendre un objet</span><span>50%</span>
                            </span>
                        </button>
                        <button style={menuBtnDimStyle} onClick={closeShop}>← QUITTER</button>
                    </div>
                </div>
            )}

            {/* Confirmation d'achat (anti-clic accidentel) + sélecteur de quantité */}
            {shopOpen && buyConfirm && (() => {
                const total = buyConfirm.price * buyQty
                const canAfford = player.reps >= total
                return (
                    <div style={{ ...menuOverlayStyle, zIndex: 9500 }} onClick={() => setBuyConfirm(null)}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>Confirmer l'achat</div>
                            <div style={{ textAlign: "center", margin: "8px 0 4px", fontSize: 14, fontWeight: 700 }}>{buyConfirm.name}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "10px 0" }}>
                                <button style={{ ...menuBtnDimStyle, width: 48, fontSize: 20 }} onClick={() => setBuyQty((q) => Math.max(1, q - 1))}>−</button>
                                <span style={{ fontSize: 22, fontWeight: 800, minWidth: 36, textAlign: "center" }}>{buyQty}</span>
                                <button style={{ ...menuBtnDimStyle, width: 48, fontSize: 20 }} onClick={() => setBuyQty((q) => q + 1)}>+</button>
                            </div>
                            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 13, color: canAfford ? "inherit" : "#c0392b" }}>
                                Total : <b>{total} reps</b>{canAfford ? "" : " — insuffisant"}
                            </div>
                            <button
                                style={canAfford ? menuBtnStyle : menuBtnDimStyle}
                                disabled={!canAfford}
                                onClick={() => { if (getItem(buyConfirm.id)?.category === "BALL" && player.ballLockRemaining > 0) { setBuyConfirm(null); return } if (spendReps(total)) { addItem(buyConfirm.id, buyQty); if (getItem(buyConfirm.id)?.category === "HEAL") recordPotionBuy(); persistYellowSave() } setBuyConfirm(null) }}
                            >✅ Acheter</button>
                            <button style={menuBtnDimStyle} onClick={() => setBuyConfirm(null)}>← Annuler</button>
                        </div>
                    </div>
                )
            })()}

            {/* LIGUE DE FUSION — offre Fusio-Ball du Dieu Spaghetti au sacre (autonome, hors boutique). 1000 reps. */}
            {fusioBallModal && (() => {
                const price = 1000
                const canAfford = player.reps >= price
                return (
                    <div style={{ ...menuOverlayStyle, zIndex: 9500 }} onClick={() => setFusioBallModal(false)}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>✨ Dieu Spaghetti</div>
                            <div style={{ textAlign: "center", margin: "8px 0", fontSize: 13, lineHeight: 1.5 }}>
                                « Maître de la Chimère ! Pour capturer les Daemons fusionnés à l&apos;état sauvage, il te faut une <b>FUSIO-BALL</b>. Je t&apos;en cède une pour <b>1000 reps</b>. Marché conclu ? »
                            </div>
                            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 13, color: canAfford ? "inherit" : "#c0392b" }}>
                                💪 {player.reps}/{player.repsCap}{canAfford ? "" : " — insuffisant"}
                            </div>
                            <button
                                style={canAfford ? menuBtnStyle : menuBtnDimStyle}
                                disabled={!canAfford}
                                onClick={() => { if (player.ballLockRemaining > 0) { setFusioBallModal(false); return } if (fusioBuyingRef.current) return; fusioBuyingRef.current = true; if (spendReps(price)) { addItem("fusio_ball", 1); clearTrainerMarker(FUSIOBALL_OWED_MARKER) } setFusioBallModal(false) }}
                            >✅ Oui, acheter (1000 reps)</button>
                            <button style={menuBtnDimStyle} onClick={() => setFusioBallModal(false)}>❌ Non merci</button>
                        </div>
                    </div>
                )
            })()}

            {/* BOUCLE ENDGAME — offre « recrée ton Daemon & repars » (post-capture Ukognofy / sacre OR). Accepter →
                ouvre le créateur (mode boucle) → rejeu run 1 gratuit avec la création en starter. Refuser → re-proposé
                au prochain sacre OR. Non-destructif (bulle isolée). */}
            {loopModal && (
                <div style={{ ...menuOverlayStyle, zIndex: 9500 }} onClick={() => setLoopModal(false)}>
                    <div style={{ ...menuBoxStyle, background: "#1c1408", color: "#f5ecd0", border: "3px solid #ffd54a" }} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🔁 UNE NOUVELLE BOUCLE ?</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, margin: "2px 0 10px", color: "#eee" }}>
                            Tu as atteint le sommet, Maître. 🍝 Le Dieu Spaghetti t&apos;offre de <b style={{ color: "#ffe36b" }}>concevoir un nouveau compagnon</b> et de <b>repartir au tout début du Nexus</b> avec lui — une traversée fraîche, rien que vous deux.
                            <div style={{ margin: "8px 0 0", padding: "8px 10px", background: "rgba(255,255,255,0.06)", borderRadius: 8, fontSize: 12 }}>
                                Ton vrai monde reste <b>intact</b> (simple bulle de rejeu). Tu refuses ? Il te le re-proposera à ta prochaine victoire à la Ligue de Fusion.
                            </div>
                        </div>
                        <button style={menuBtnStyle} onClick={() => { setLoopModal(false); setFusionEpilogue(null); setEpiloguePending(false); setLoopCreatorOpen(true) }}>🧬 Oui, créer &amp; repartir !</button>
                        <button style={menuBtnDimStyle} onClick={() => setLoopModal(false)}>Plus tard</button>
                    </div>
                </div>
            )}

            {/* PNJ 6 — offre d'échange Crocavern ↔ team[0] (post-victoire). IRRÉVERSIBLE : verrou anti-double-tap. */}
            {pnj6Modal && (() => {
                const lead = player.team[0]
                if (!lead) return null // aucun Daemon de tête → rien à échanger (garde)
                return (
                    <div style={{ ...menuOverlayStyle, zIndex: 9500 }} onClick={() => setPnj6Modal(false)}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>🤝 {PNJ6_NAME}</div>
                            <div style={{ textAlign: "center", margin: "8px 0", fontSize: 13, lineHeight: 1.5 }}>
                                Es-tu <b>SÛR</b> de vouloir échanger ton <b>{displayName(lead)}</b> contre un <b>CROCAVERN</b> ?
                            </div>
                            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 11, color: "#ff8c60", fontWeight: 700 }}>⚠️ DÉFINITIF — {displayName(lead)} partira pour toujours avec l&apos;Échangeur.</div>
                            {/* Bouton SÛR en premier (le tap réflexe = garder son Daemon). */}
                            <button style={menuBtnStyle} onClick={() => setPnj6Modal(false)}>❌ Non, garder {displayName(lead)}</button>
                            <button
                                style={{ ...menuBtnDimStyle, opacity: pnj6Armed ? 1 : 0.4, pointerEvents: pnj6Armed ? "auto" : "none" }}
                                disabled={!pnj6Armed}
                                onClick={() => {
                                    if (!pnj6Armed || pnj6TradingRef.current) return
                                    pnj6TradingRef.current = true
                                    // Échange IRRÉVERSIBLE one-time → persistance IMMÉDIATE (comme le titre Dôme),
                                    //   pas le débounce 800 ms : sinon fermer l'app juste après annulerait le trade.
                                    if (executeTrade(lead.uid, makeCrocavernGift())) { markTrainerDefeated(PNJ6_TRADE_DONE_MARKER); void persistYellowSaveNow() }
                                    setPnj6Modal(false)
                                }}
                            >{pnj6Armed ? `✅ Oui, échanger définitivement ${displayName(lead)}` : "⏳ Patiente…"}</button>
                        </div>
                    </div>
                )
            })()}

            {/* Revente : récupère 50% du prix (anti-achat-définitif) */}
            {shopOpen && sellMode && (
                <div style={{ ...menuOverlayStyle, zIndex: 9500 }} onClick={() => setSellMode(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>REVENDRE</span><span>💪 {player.reps}/{player.repsCap}</span>
                        </div>
                        {(() => {
                            if (activeWorld === "run3") return <div style={{ textAlign: "center", padding: 18, fontSize: 12, opacity: 0.6 }}>Pas de revente pendant le CONCOURS — aucune énergie ne rentre en run 3.</div>
                            const owned = Object.values(ITEMS).filter((it) => it.price > 0 && (player.items[it.id] ?? 0) > 0)
                            if (!owned.length) return <div style={{ textAlign: "center", padding: 18, fontSize: 12, opacity: 0.6 }}>Aucun objet à revendre.</div>
                            return owned.map((it) => {
                                const refund = Math.floor(it.price / 2)
                                const n = player.items[it.id] ?? 0
                                return (
                                    <button key={it.id} style={menuBtnStyle} onClick={() => { if (consumeItem(it.id)) grantReps(refund) }}>
                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                            <span>{it.name} (×{n})</span><span>+{refund} reps</span>
                                        </span>
                                    </button>
                                )
                            })
                        })()}
                        <button style={menuBtnDimStyle} onClick={() => setSellMode(false)}>← Retour</button>
                    </div>
                </div>
            )}

            {/* Boutique de CT : acheter une attaque et l'enseigner à un Daemon compatible */}
            {!battle && ctShop && (
                <div style={menuOverlayStyle} onClick={() => { setCtShop(false); setCtPick(null) }}>
                    <div style={{ ...menuBoxStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        {ctPick === null ? (
                            <>
                                <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                                    <span>🎓 CAPSULES CT</span><span>⚡ {player.reps}</span>
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.65, padding: "0 2px 6px" }}>⚠️ Chaque CT ne s&apos;achète qu&apos;une seule fois.</div>
                                <div style={{ maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(() => {
                                        const purch = purchasableCts(player.badges, player.boughtCts)
                                        const purchIds = new Set(purch.map((c) => c.id))
                                        // CT CADEAUX possédées (trophées de boss, gratuites) en tête de liste.
                                        const gifts = player.ownedCts.map(getCt).filter((c): c is NonNullable<typeof c> => !!c && !purchIds.has(c.id))
                                        return [...gifts, ...purch].map((ct) => {
                                            const mv = getMove(ct.moveId)
                                            const isGift = !purchIds.has(ct.id)
                                            const afford = isGift || player.reps >= ct.price
                                            return (
                                                <button key={ct.id} style={afford ? menuBtnStyle : menuBtnDimStyle} disabled={!afford} onClick={() => setCtPick(ct.id)}>
                                                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                        <span>{ct.label} · {mv?.name}<br /><span style={{ fontSize: 10, opacity: 0.6 }}>{mv?.type}{mv && mv.power > 0 ? ` · Puis ${mv.power}` : " · statut"}{mv && mv.accuracy > 0 ? ` · Préc ${mv.accuracy}` : ""}{mv?.description ? ` — ${mv.description}` : ""}</span></span>
                                                        <span>{isGift ? "✨ Cadeau" : `${ct.price} reps`}</span>
                                                    </span>
                                                </button>
                                            )
                                        })
                                    })()}
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4 }}>D'autres CT se débloquent avec les badges d'arène.</div>
                                <button style={menuBtnDimStyle} onClick={() => setCtShop(false)}>← QUITTER</button>
                            </>
                        ) : (() => {
                            const ct = getCt(ctPick)!
                            const mv = getMove(ct.moveId)
                            return (
                                <>
                                    <div style={menuTitleStyle}>{mv?.name} — QUEL DAEMON ?</div>
                                    {mv && (
                                        <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 8, lineHeight: 1.45, padding: "6px 8px", background: "#f3efd6", borderRadius: 6 }}>
                                            {mv.type} · {mv.power > 0 ? (moveCategory(mv.type) === "PHYSICAL" ? "Physique" : "Spécial") : "Statut"}
                                            {mv.power > 0 ? ` · Puissance ${mv.power}` : ""}{mv.accuracy > 0 ? ` · Précision ${mv.accuracy}%` : ""}
                                            {mv.description ? <><br />{mv.description}</> : null}
                                        </div>
                                    )}
                                    {player.team.map((m) => {
                                        const sp = getSpecies(m.speciesId)
                                        const compatible = sp ? canLearnCt(sp, ct) : false
                                        const known = m.moves.some((s) => s.moveId === ct.moveId)
                                        const dis = !compatible || known
                                        return (
                                            <button key={m.uid} style={dis ? menuBtnDimStyle : menuBtnStyle} disabled={dis}
                                                onClick={() => {
                                                    const r = teachCt(m.uid, ct.id)
                                                    if (r.ok) { setToast(r.queued ? `${displayName(m)} : choisis une attaque à oublier.` : `${displayName(m)} apprend ${mv?.name} !`); persistYellowSave(); setCtShop(false); setCtPick(null) }
                                                    else if (r.reason === "reps") setToast("Pas assez de reps.")
                                                }}>
                                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>{displayName(m)}{known ? " (déjà apprise)" : compatible ? "" : " (incompatible)"}</span><span>N.{m.level}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                    <button style={menuBtnDimStyle} onClick={() => setCtPick(null)}>← RETOUR</button>
                                </>
                            )
                        })()}
                    </div>
                </div>
            )}

            {/* CT CADEAU : plus de pop-up forcé. L'annonce se fait UNE fois au badge, puis
                la CT s'apprend à la demande via la boutique → 🎓 Capsules CT (gratuite). */}

            {/* Super Pasta : choix du Daemon à faire monter d'un niveau. */}
            {!battle && pastaPick && (
                <div style={menuOverlayStyle} onClick={() => setPastaPick(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>🍝 QUEL DAEMON ?</span><span>{superPastaPrice()} reps</span>
                        </div>
                        {player.team.map((m) => (
                            <button
                                key={m.uid}
                                style={m.level >= 100 ? menuBtnDimStyle : menuBtnStyle}
                                disabled={m.level >= 100}
                                onClick={() => {
                                    const r = buySuperPasta(m.uid)
                                    if (r.ok && r.result) {
                                        setToast(`${displayName(m)} monte au niveau ${r.result.toLevel} !`)
                                        setPastaPick(false)
                                        void processSaiyanPoints() // convertit le niveau gagné en points Saiyan
                                    } else if (r.reason === "reps") {
                                        setToast("Pas assez de reps.")
                                    } else if (r.reason === "max") {
                                        setToast(`${displayName(m)} est déjà au niveau max.`)
                                    }
                                }}
                            >
                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>{displayName(m)}</span><span>N.{m.level}</span>
                                </span>
                            </button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setPastaPick(false)}>← ANNULER</button>
                    </div>
                </div>
            )}

            {/* Pierre Gékroc → Panthéon évolue vers la panthère du TYPE choisi (Part B). */}
            {!battle && pantheonEvo && (
                <div style={menuOverlayStyle} onClick={() => setPantheonEvo(null)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>🪨 PIERRE GÉKROC — QUEL TYPE ?</div>
                        {PANTHEON_STONE_EVOS.map(({ type, speciesId }) => (
                            <button
                                key={speciesId}
                                style={menuBtnStyle}
                                onClick={() => {
                                    const res = evolvePantheonWithStone(pantheonEvo.uid, speciesId)
                                    if (res) {
                                        setToast(`${res.fromName} évolue en ${res.toName} !`)
                                        persistYellowSave()
                                        setPantheonEvo(null)
                                        setSelected(null) // ferme la fiche (le Daemon a changé d'espèce)
                                    } else {
                                        setToast("Évolution impossible.")
                                    }
                                }}
                            >
                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>{type}</span><span>{getSpecies(speciesId)?.name}</span>
                                </span>
                            </button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setPantheonEvo(null)}>← ANNULER</button>
                    </div>
                </div>
            )}

            {/* Toast éphémère (achat, info). */}
            {toast && (
                <div style={toastStyle} onClick={() => setToast(null)}>{toast}</div>
            )}

            {/* PvP — défi reçu : accepter / refuser */}
            {challenge.incoming && !battle && !kartOpen && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>{inAutel ? "🧬 DÉFI DE FUSION" : "⚔️ DÉFI"}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: "center", margin: "4px 0 10px" }}>
                            {challenge.incoming.fromNickname} te défie {inAutel ? "en combat de FUSION" : "en combat"} !
                        </div>
                        {inAutel && myFusionCount === 0 ? (
                            <div style={{ fontSize: 11, opacity: 0.8, textAlign: "center", margin: "0 0 10px", lineHeight: 1.4 }}>
                                Tu n&apos;as aucune fusion prête. Assemble une équipe au 💻 avant d&apos;accepter.
                            </div>
                        ) : (
                            <button style={menuBtnStyle} onClick={() => challenge.respond(true)}>✓ Combattre</button>
                        )}
                        <button style={menuBtnDimStyle} onClick={() => challenge.respond(false)}>✕ Refuser</button>
                    </div>
                </div>
            )}

            {/* PvP — défi envoyé : en attente (touche pour annuler) */}
            {challenge.outgoing && !battle && (
                <div style={toastStyle} onClick={() => challenge.cancelChallenge()}>
                    Défi envoyé à {challenge.outgoing.toNickname}… (touche pour annuler)
                </div>
            )}

            {/* PvP #6 — en attente de l'adversaire */}
            {waitingOnOpp && (
                <div style={pvpWaitStyle}>⏳ En attente de l'adversaire…</div>
            )}

            {/* PvP #1 — désynchronisation détectée */}
            {pvpCtx?.desync && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>⚠️ DÉSYNCHRONISATION</div>
                        <div style={{ fontSize: 12, lineHeight: 1.5, margin: "4px 0 10px" }}>
                            Le combat n'est plus synchronisé entre les deux joueurs. Recharge la page pour repartir proprement.
                        </div>
                        <button style={menuBtnStyle} onClick={() => pvpForfeitNow()}>Quitter le combat</button>
                    </div>
                </div>
            )}

            {/* PvP #7/#11 — abandon explicite + avertissement reps */}
            {pvpCtx && battle && battle.phase !== "ended" && !pvpCtx.desync && (
                confirmForfeit ? (
                    <div style={pvpForfeitBoxStyle}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Abandonner ?</div>
                        <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 6 }}>Les reps déjà dépensés ce combat sont perdus.</div>
                        <button style={miniBtn} onClick={() => pvpForfeitNow()}>Oui, abandonner</button>
                        <button style={miniBtn} onClick={() => setConfirmForfeit(false)}>Non</button>
                    </div>
                ) : (
                    <button style={pvpForfeitBtnStyle} onClick={() => setConfirmForfeit(true)}>🏳️ Abandonner</button>
                )
            )}

            {/* Fiche / résumé d'un Daemon (équipe ou PC) + actions */}
            {/* FICHE d'un FUSIONNÉ (Ligue de Fusion) — lecture (stats GELÉES) + réordonnancement des attaques.
                Volontairement SÉPARÉE de la fiche Daemon (pas d'EV/IV/évo/renommage : une fusion est éphémère). */}
            {selectedFusionUid && (() => {
                const f = (getGauntletTeam() ?? []).find((x) => x.instance.uid === selectedFusionUid)
                if (!f) { return null }
                const inst = f.instance
                const sp = getSpecies(inst.speciesId)
                const fs = inst.frozenStats
                const closeFiche = () => setSelectedFusionUid(null)
                return (
                    <div style={menuOverlayStyle} onClick={closeFiche}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>{(sp?.name ?? "FUSION").toUpperCase()} · N.{inst.level}</div>
                            {sp?.sprite && <img src={sp.sprite} alt={sp.name} style={ficheSpriteStyle} />}
                            <div style={{ fontSize: 11, opacity: 0.7, textAlign: "center" }}>🧬 Fusion · {sp?.types.join(" / ")}</div>
                            {fs && (
                                <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", margin: "8px 0" }}>
                                    <span>PV : {inst.currentHp}/{fs.hp}</span>
                                    <span>Vitesse : {fs.spe}</span>
                                    <span>Attaque : {fs.atk}</span>
                                    <span>Défense : {fs.def}</span>
                                    <span>Spécial : {fs.spc}</span>
                                    <span>Statut : {inst.status === "NONE" ? "—" : inst.status}</span>
                                </div>
                            )}
                            {f.result.heldItems.length > 0 && (
                                <div style={{ fontSize: 11, marginBottom: 6 }}>
                                    🎒 {f.result.heldItems.map((id) => getItem(id)?.name ?? id).join(" · ")}{f.result.heldItems.length > 1 ? " (les 2 actifs)" : ""}
                                </div>
                            )}
                            <div style={{ fontSize: 9.5, opacity: 0.6, marginBottom: 6 }}>Stats calculées depuis tes 2 parents — EV &amp; points Saiyan DÉJÀ inclus (via leurs stats réelles).</div>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>ATTAQUES (▲▼ = ordre en combat)</div>
                            {inst.moves.map((mv, i) => {
                                const m = getMove(mv.moveId)
                                const cat = !m || m.power <= 0 ? { label: "STATUT", color: "#8868c0" }
                                    : moveCategory(m.type) === "PHYSICAL" ? { label: "PHYS", color: "#c0532a" }
                                        : { label: "SPÉ", color: "#3a7ae0" }
                                const up = i > 0, down = i < inst.moves.length - 1
                                const btn: React.CSSProperties = { width: 18, height: 18, fontSize: 9, lineHeight: 1, padding: 0, border: "1px solid #1c1408", borderRadius: 3, background: "#f8f8e8", flexShrink: 0 }
                                return (
                                    <div key={mv.moveId} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                                        <button disabled={!up} style={{ ...btn, cursor: up ? "pointer" : "default", opacity: up ? 1 : 0.25 }} onClick={() => reorderFusionGauntletMove(inst.uid, i, i - 1)} aria-label="Monter l'attaque">▲</button>
                                        <button disabled={!down} style={{ ...btn, cursor: down ? "pointer" : "default", opacity: down ? 1 : 0.25 }} onClick={() => reorderFusionGauntletMove(inst.uid, i, i + 1)} aria-label="Descendre l'attaque">▼</button>
                                        <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", background: cat.color, padding: "1px 4px", borderRadius: 3, flexShrink: 0, letterSpacing: 0.5 }}>{cat.label}</span>
                                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m?.name ?? mv.moveId} <span style={{ opacity: 0.55 }}>({m?.type ?? "?"}{m && m.power > 0 ? ` · ${m.power}` : ""})</span></span>
                                    </div>
                                )
                            })}
                            <button style={{ ...menuBtnDimStyle, marginTop: 8 }} onClick={closeFiche}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {selected && (() => {
                // Lit la version LIVE depuis le store (à jour après renommage/soin).
                const live = player.team.find((m) => m.uid === selected.uid) ?? player.pc.find((m) => m.uid === selected.uid)
                if (!live) { return null }
                const inTeam = player.team.some((m) => m.uid === live.uid)
                const sp = getSpecies(live.speciesId)
                const stats = sp ? fullStats(live, sp) : null
                const toNext = expForLevel(live.level + 1, live.speciesId) - Math.max(live.exp, expForLevel(live.level, live.speciesId))
                const closeFiche = () => { setSelected(null); setRenaming(false) }
                // Slide ◀ ▶ / swipe entre les Daemons de la MÊME liste (équipe ou PC).
                const ficheList = inTeam ? player.team : player.pc
                const ficheIdx = ficheList.findIndex((m) => m.uid === live.uid)
                const slide = (d: number) => {
                    if (ficheList.length < 2) return
                    const nx = ficheList[(ficheIdx + d + ficheList.length) % ficheList.length]
                    setSelected(nx); setRenaming(false)
                }
                const evoLvl = sp?.evolution && sp.evolution.method.kind === "LEVEL" ? sp.evolution.method.level : null
                return (
                    <div style={menuOverlayStyle} onClick={closeFiche}>
                        <div
                            style={menuBoxStyle}
                            onClick={(e) => e.stopPropagation()}
                            onTouchStart={(e) => { ficheTouchX.current = e.touches[0]?.clientX ?? null; ficheTouchY.current = e.touches[0]?.clientY ?? null }}
                            onTouchEnd={(e) => {
                                const sx = ficheTouchX.current, sy = ficheTouchY.current; ficheTouchX.current = null; ficheTouchY.current = null
                                if (sx == null || sy == null) return
                                const dx = (e.changedTouches[0]?.clientX ?? sx) - sx
                                const dy = (e.changedTouches[0]?.clientY ?? sy) - sy
                                // swipe horizontal SEULEMENT : doit dépasser 60px ET dominer nettement le vertical (sinon = scroll de la fiche)
                                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) slide(dx < 0 ? 1 : -1) // swipe gauche = suivant
                            }}
                        >
                            <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span style={{ flex: 1, textAlign: "left" }}>{displayName(live).toUpperCase()}{live.shiny ? " ✨" : ""} · N.{live.level}</span>
                                <button style={slideBtnStyle} disabled={ficheList.length < 2} onClick={() => slide(-1)}>◀</button>
                                <button style={slideBtnStyle} disabled={ficheList.length < 2} onClick={() => slide(1)}>▶</button>
                            </div>
                            {sp?.sprite && <img key={live.uid + ":" + live.speciesId} src={sp.sprite} alt={sp.name} style={live.shiny ? { ...ficheSpriteStyle, filter: SHINY_FILTER } : ficheSpriteStyle} />}
                            <div style={{ fontSize: 11, opacity: 0.7, textAlign: "center" }}>
                                N°{sp?.dexNo} · {sp?.types.join(" / ")} · {sp?.name} · {inTeam ? `Équipe ${ficheIdx + 1}/${ficheList.length}` : `PC ${ficheIdx + 1}/${ficheList.length}`}
                            </div>
                            {stats && (
                                <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", margin: "8px 0" }}>
                                    <span>PV : {live.currentHp}/{stats.hp}</span>
                                    <span>Vitesse : {stats.spe}</span>
                                    <span>Attaque : {stats.atk}</span>
                                    <span>Défense : {stats.def}</span>
                                    <span>Spécial : {stats.spc}</span>
                                    <span>Statut : {live.status === "NONE" ? "—" : live.status}</span>
                                </div>
                            )}
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
                                {/* plancher du niveau pour les anciens Daemons sauvegardés à exp=0 → cohérent avec le niveau */}
                                XP cumulée : {Math.max(live.exp, expForLevel(live.level, live.speciesId)).toLocaleString("fr-FR")} · niveau suivant dans ~{Math.max(0, toNext).toLocaleString("fr-FR")} XP
                            </div>
                            {(live.capturedLevel != null || live.capturedAt || live.capturedMapId) && (
                                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
                                    🎣 Capturé{live.capturedLevel != null ? ` au N.${live.capturedLevel}` : ""}{live.capturedAt ? ` le ${live.capturedAt}` : ""}{live.capturedMapId && YELLOW_MAPS[live.capturedMapId] ? ` — ${YELLOW_MAPS[live.capturedMapId].name}` : ""}{live.capturedQuotaReached ? " · 🏆 quota atteint" : ""}
                                </div>
                            )}
                            {live.traded && (
                                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
                                    🔄 Reçu par échange{live.originalTrainerName ? ` · dresseur d'origine : ${live.originalTrainerName}` : ""}{live.originalNickname ? ` · surnom d'origine « ${live.originalNickname} »` : ""}
                                </div>
                            )}
                            {live.bestDmgMove && (
                                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>
                                    💥 Plus gros coup : {live.bestDmgMove} ({live.bestDmg} dégâts)
                                </div>
                            )}
                            {evoLvl != null && sp?.evolution && (
                                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>⤴️ Évolue en {getSpecies(sp.evolution.toId)?.name ?? "?"} au niveau {evoLvl}</div>
                            )}
                            {(() => {
                                const tier = ivTier(live.ivs)
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        Potentiel génétique : <b style={{ color: ivTierColor(tier) }}>{tier === "PARFAIT" ? "★ PARFAIT" : tier}</b>
                                        <span style={{ opacity: 0.45 }}> (qualité de naissance)</span>
                                    </div>
                                )
                            })()}
                            {(() => {
                                const total = evTotal(live.ev)
                                const cap = evTotalCap(live)
                                const boosted = cap > EV_TOTAL_CAP
                                const EVK: Array<[string, string]> = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        <button onClick={() => setEvDetailOpen((o) => !o)}
                                            style={{ background: "transparent", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                                            Entraînement (EV) : <b>{total}/{cap}</b>{boosted ? " ✨" : ""}{total >= cap ? " 🔒" : ""} <span style={{ opacity: 0.6 }}>{evDetailOpen ? "▾" : "▸"}</span>
                                        </button>
                                        {evDetailOpen && (
                                            <div style={{ marginTop: 4, padding: 8, border: "2px solid #3a8ee0", borderRadius: 6, background: "#eef6ff" }}>
                                                {EVK.map(([k, lbl]) => {
                                                    const ev = (live.ev as Record<string, number> | undefined)?.[k] ?? 0
                                                    const pct = Math.round((ev / EV_STAT_CAP) * 100)
                                                    const maxed = ev >= EV_STAT_CAP
                                                    return (
                                                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                                            <span style={{ width: 26, fontSize: 10, fontWeight: 700, color: "#1c4a80" }}>{lbl}</span>
                                                            <div style={{ flex: 1, height: 7, background: "#cdd9e6", borderRadius: 4, overflow: "hidden" }}>
                                                                <div style={{ width: `${pct}%`, height: "100%", background: maxed ? "#e0a020" : "#3a8ee0" }} />
                                                            </div>
                                                            <span style={{ width: 86, fontSize: 9, textAlign: "right", opacity: 0.85 }}>{ev}/{EV_STAT_CAP} → +{evStatBonus(ev)}{maxed ? " MAX" : ""}</span>
                                                        </div>
                                                    )
                                                })}
                                                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 5, lineHeight: 1.35 }}>
                                                    +{EV_YIELD_PER_WIN} EV par victoire, dans la stat-forte du Daemon vaincu. La contribution « +X » s'ajoute dans le calcul de la stat (montée avec le niveau). Plafond {EV_STAT_CAP}/stat, {cap} au total.{boosted ? ` ✨ Plafond relevé (+${cap - EV_TOTAL_CAP}) : capturé après la Ligue, à bas niveau et/ou à fort potentiel génétique.` : ""}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>ATTAQUES (▲▼ = ordre en combat)</div>
                            {live.moves.map((mv, i) => {
                                const m = getMove(mv.moveId)
                                // Gen 1 : la catégorie dépend du TYPE (cf. moveCategory) ; puissance 0 = move de statut.
                                const cat = !m || m.power <= 0 ? { label: "STATUT", color: "#8868c0" }
                                    : moveCategory(m.type) === "PHYSICAL" ? { label: "PHYS", color: "#c0532a" }
                                        : { label: "SPÉ", color: "#3a7ae0" }
                                const up = i > 0, down = i < live.moves.length - 1
                                const btn: React.CSSProperties = { width: 18, height: 18, fontSize: 9, lineHeight: 1, padding: 0, border: "1px solid #1c1408", borderRadius: 3, background: "#f8f8e8", flexShrink: 0 }
                                return (
                                    <div key={mv.moveId} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between", padding: "2px 0" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                                            <button disabled={!up} style={{ ...btn, cursor: up ? "pointer" : "default", opacity: up ? 1 : 0.25 }} onClick={() => { reorderMove(live.uid, i, i - 1); persistYellowSave() }} aria-label="Monter l'attaque">▲</button>
                                            <button disabled={!down} style={{ ...btn, cursor: down ? "pointer" : "default", opacity: down ? 1 : 0.25 }} onClick={() => { reorderMove(live.uid, i, i + 1); persistYellowSave() }} aria-label="Descendre l'attaque">▼</button>
                                            <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", background: cat.color, padding: "1px 4px", borderRadius: 3, flexShrink: 0, letterSpacing: 0.5 }}>{cat.label}</span>
                                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m?.name ?? mv.moveId} <span style={{ opacity: 0.55 }}>({m?.type ?? "?"}{m && m.power > 0 ? ` · ${m.power}` : ""})</span></span>
                                        </span>
                                        {/* PP masqués côté joueur (illimités tant qu'on a l'énergie) → on n'affiche que le coût en reps. */}
                                        <span style={{ opacity: 0.7, flexShrink: 0 }}>💪 {attackCost(m ?? null, live.level, effectiveQuota(player.wildCtx?.quota), live.currentHp / Math.max(1, maxHpOf(live)))}</span>
                                    </div>
                                )
                            })}

                            {/* ATTAQUES EN ATTENTE : apprentissage À LA DEMANDE (plus de pop-up forcé). */}
                            {live.pendingMoves && live.pendingMoves.length > 0 && (
                                <div style={{ marginTop: 8, padding: 8, border: "2px solid #f5d020", borderRadius: 6, background: "#fffbe6" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>🆕 NOUVELLE(S) ATTAQUE(S) À APPRENDRE</div>
                                    {live.pendingMoves.map((mid) => {
                                        const nm = getMove(mid)
                                        return (
                                            <div key={mid} style={{ marginBottom: 6 }}>
                                                <div style={{ fontSize: 10, marginBottom: 3 }}>
                                                    <b>{nm?.name ?? mid}</b> {nm ? `(${nm.type}${nm.power > 0 ? ` · ${nm.power}` : ""})` : ""} — remplace :
                                                </div>
                                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                                    {live.moves.map((s, i) => (
                                                        <button key={i} style={{ ...menuBtnStyle, padding: "6px 8px", fontSize: 10 }}
                                                            onClick={() => { resolveLearn(live.uid, mid, i); persistYellowSave(); setToast(`${nm?.name ?? mid} apprise !`) }}>
                                                            {getMove(s.moveId)?.name ?? s.moveId}
                                                        </button>
                                                    ))}
                                                    <button style={{ ...menuBtnDimStyle, padding: "6px 8px", fontSize: 10 }}
                                                        onClick={() => { resolveLearn(live.uid, mid, null); persistYellowSave(); setToast(`${nm?.name ?? mid} oubliée.`) }}>
                                                        Oublier
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* ENTRAÎNEMENT SAIYAN : répartition des points de stats */}
                            {(live.statPoints ?? 0) > 0 && (
                                <div style={{ marginTop: 10, padding: 8, border: "2px solid #f5a020", borderRadius: 6, background: "#fff6e6" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                                        🔥 ENTRAÎNEMENT SAIYAN — <span style={{ color: "#e06000" }}>{live.statPoints} pt{(live.statPoints ?? 0) > 1 ? "s" : ""}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4 }}>
                                        {([["hp", "PV"], ["atk", "ATQ"], ["def", "DÉF"], ["spe", "VIT"], ["spc", "SPÉ"]] as const).map(([k, lbl]) => (
                                            <button
                                                key={k}
                                                style={{ ...menuBtnStyle, padding: "8px 2px", textAlign: "center", fontSize: 11 }}
                                                onClick={() => { if (allocateStatPoint(live.uid, k)) { setToast(`+${SAIYAN_POINT_VALUE[k]} ${lbl}`); persistYellowSave() } }}
                                            >
                                                +{lbl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Renommage */}
                            {renaming ? (
                                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                                    <input
                                        autoFocus
                                        value={renameText}
                                        maxLength={12}
                                        placeholder={sp?.name ?? ""}
                                        onChange={(e) => setRenameText(e.target.value)}
                                        style={{ flex: 1, fontFamily: "inherit", fontSize: 13, padding: "8px 10px", border: "2px solid #1c1408", borderRadius: 6 }}
                                    />
                                    <button style={menuBtnStyle} onClick={() => { renameDaemon(live.uid, renameText); persistYellowSave(); setRenaming(false) }}>OK</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                                    {live.traded
                                        ? <div style={{ flex: 1, fontSize: 10, opacity: 0.6, alignSelf: "center", textAlign: "center", padding: "8px 4px" }}>🔒 Nom verrouillé (Daemon reçu en échange)</div>
                                        : <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => { setRenameText(live.nickname ?? ""); setRenaming(true) }}>✏️ Renommer</button>}
                                    {/* Dépôt/retrait UNIQUEMENT depuis l'ordi du Centre Daemon (pcOpen), pas le menu START. */}
                                    {pcOpen && (inTeam ? (
                                        <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => {
                                            const r = depositToPc(live.uid)
                                            if (r.ok) { setToast(`${displayName(live)} déposé au PC.`); persistYellowSave(); closeFiche() }
                                            else if (r.reason === "last") setToast("Tu dois garder au moins 1 Daemon !")
                                        }}>📦 Déposer</button>
                                    ) : live.tradeState === "listed" ? (
                                        // Daemon posé sur l'étal du Grand Marchand : verrouillé (ni équipe, ni relâche) tant qu'il y est.
                                        <div style={{ flex: 1, fontSize: 11, color: "#e0a458", textAlign: "center", padding: "6px 4px", border: "1px solid #e0a458", borderRadius: 8, background: "rgba(224,164,88,.1)" }}>🛒 Sur l&apos;étal du Marchand — retire-le de l&apos;étal pour le réutiliser.</div>
                                    ) : (
                                        <>
                                            <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => {
                                                const r = withdrawFromPc(live.uid)
                                                if (r.ok) { setToast(`${displayName(live)} rejoint l'équipe.`); persistYellowSave(); closeFiche() }
                                                else if (r.reason === "full") setToast("Équipe pleine (6 max).")
                                                else if (r.reason === "listed") setToast("Ce Daemon est sur l'étal du Marchand.")
                                            }}>➡️ Équipe</button>
                                            {/* RELÂCHER : définitif (irréversible) → confirmation. Seulement depuis le PC (jamais l'équipe). */}
                                            <button style={{ ...menuBtnStyle, flex: 1, borderColor: "#c05050", color: "#e08888" }} onClick={() => {
                                                if (!window.confirm(`Relâcher ${displayName(live)} (N.${live.level}) ? Il quittera DÉFINITIVEMENT le jeu — c'est IRRÉVERSIBLE.`)) return
                                                const r = releaseFromPc(live.uid)
                                                if (r.ok) { setToast(`${displayName(live)} a été relâché. Adieu ! 🕊️`); persistYellowSave(); closeFiche() }
                                                else if (r.reason === "listed") setToast("Ce Daemon est sur l'étal du Marchand.")
                                            }}>🕊️ Relâcher</button>
                                        </>
                                    ))}
                                </div>
                            )}

                            <button style={{ ...menuBtnStyle, marginTop: 8, width: "100%" }} onClick={() => setHeldOpen(true)}>
                                🎒 {live.heldItem ? `Objet tenu : ${getHeldItem(live.heldItem)?.name ?? "?"}` : "Objet tenu — aucun"}
                            </button>
                            {heldOpen && <HeldItemModal uid={live.uid} onClose={() => setHeldOpen(false)} />}

                            {live.speciesId === "pantheon" && (player.items["pierre_gekroc"] ?? 0) > 0 && (
                                <button style={{ ...menuBtnStyle, marginTop: 8, width: "100%" }} onClick={() => { setPantheonEvo(live); setSelected(null) }}>
                                    🪨 Utiliser la Pierre Gékroc
                                </button>
                            )}
                            {/* Noyau de Métal → Magmator (niv 50+) évolue en Magnetor. Consomme le Noyau (evolveMagmatorWithChen). */}
                            {live.speciesId === "magmator" && (player.items["noyau_metal"] ?? 0) > 0 && (
                                <button style={{ ...menuBtnStyle, marginTop: 8, width: "100%" }} onClick={() => {
                                    const res = evolveMagmatorWithChen(live.uid)
                                    if (res) { setToast("Magmator évolue en Magnetor ! 🔩"); setSelected(null); persistYellowSave() }
                                    else setToast("Il faut un Magmator de niveau 50 minimum.")
                                }}>
                                    🔩 Utiliser le Noyau de Métal
                                </button>
                            )}
                            <button style={{ ...menuBtnDimStyle, marginTop: 8 }} onClick={closeFiche}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* Cinématique d'évolution (post-combat, après QUITTER) */}
            {!battle && evolutions.length > 0 && (
                <EvolutionScreen evolutions={evolutions} onCancel={cancelEvolution} onDone={clearEvolutions} />
            )}

            {/* APPRENTISSAGE post-combat (après les évolutions) : « X veut apprendre Y — oublier laquelle ? » */}
            {pendingLearn && !battle && evolutions.length === 0 && !championRun && !newDexEntry && !arenaFight && (
                <MoveLearnScreen onDone={clearPendingLearn} />
            )}

            {/* Hall of Fame — sacre du Champion après LE MAÎTRE de la Ligue (après les évolutions) */}
            {arenaFight && !battle && (
                <ArenaChallengeModal
                    title={arenaFight.mode === "hub" ? `⚔️ Défi : ${arenaFight.opp.nickname}` : `🪞 Reflet de ${arenaFight.opp.nickname}`}
                    subtitle={arenaFight.mode === "hub"
                        ? "Son équipe réelle, jouée par l'IA. Entraîne-toi autant que tu veux !"
                        : "Une version inversée, taillée pour TE contrer (faiblesses de type)."}
                    accent={arenaFight.mode === "hub" ? "#4ec3ff" : "#c77dff"}
                    enemyTeam={arenaFight.enemy}
                    onFight={() => {
                        // DUEL : on retient l'adversaire (récompenses post-combat) + trainerId "duel:<userId>"
                        // → finishBattle signale l'issue via duelResult.
                        // RUN 3 : on CONSOMME le match du jour ICI (vrai lancement) → une défaite compte, mais scouter
                        //   puis Annuler ne coûte rien. Verrou lu par duelPlayedToday() au prochain handleArenaClick.
                        if (effectiveRunWorld() === "run3") recordDuelMatch()
                        duelOppRef.current = { userId: arenaFight.opp.userId, nickname: arenaFight.opp.nickname }
                        startTrainerBattle(getPlayer().team, randomizeLead(arenaFight.enemy), Math.floor(Math.random() * 1e9), { trainerId: "duel:" + arenaFight.opp.userId, reward: 0, aiLevel: "hof" })
                        setArenaFight(null)
                    }}
                    onCancel={() => setArenaFight(null)}
                />
            )}

            {ghostFight && !battle && (
                <ArenaChallengeModal
                    title={`⚔️ Équipe RUN 2 de ${ghostFight.ghost.nickname}`}
                    subtitle="L'équipe GELÉE avec laquelle il a battu la Ligue du RUN 2. XP DOUBLÉE — victoire = un RAPPEL. Combat UNIQUE !"
                    accent="#e0a13a"
                    enemyTeam={ghostFight.enemy}
                    onFight={() => {
                        startTrainerBattle(getPlayer().team, randomizeLead(ghostFight.enemy), Math.floor(Math.random() * 1e9), { trainerId: RUN2_GHOST_TRAINER_PREFIX + ghostFight.ghost.userId, reward: 0, aiLevel: "hof" })
                        setGhostFight(null)
                    }}
                    onCancel={() => setGhostFight(null)}
                />
            )}

            {/* REJEU — MODALE « RAMENER DES DAEMONS » : à la sortie, garder jusqu'à X (= badges gagnés + 1 si Ligue)
                Daemons choisis parmi l'équipe + le PC du rejeu ; le reste est perdu. */}
            {/* REJEU — CONFIRMATION de SORTIE (anti-clic accidentel, cf. save Mools). « Rester » prominent, « Quitter » discret + rouge. */}
            {confirmExitReplay && !battle && (
                <div style={menuOverlayStyle} onClick={() => setConfirmExitReplay(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>⚠️ Quitter le rejeu ?</div>
                        <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", marginBottom: 10, lineHeight: 1.45 }}>
                            Tu vas SORTIR de ton {getReplayRun() === "run2" ? "RUN 2²" : getReplayRun() === "run3" ? "RUN 3²" : "RUN 1²"} et revenir à ton monde principal. <b>Cette partie bis sera figée — tu ne pourras plus la reprendre.</b>{getReplayRun() === "run2" ? " (Tes Daemons rejoignent ta collection.)" : ""}
                        </div>
                        <button style={menuBtnStyle} onClick={() => setConfirmExitReplay(false)}>← Non, RESTER dans le rejeu</button>
                        <button style={{ ...menuBtnDimStyle, borderColor: "#c83030", color: "#c83030", marginTop: 6 }} onClick={beginExitReplay}>🚪 Oui, quitter (définitif)</button>
                    </div>
                </div>
            )}
            {/* REJEU — CONFIRMATION de LANCEMENT (rejouer un run). */}
            {confirmStartReplay && !battle && (
                <div style={menuOverlayStyle} onClick={() => setConfirmStartReplay(null)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>Lancer le rejeu du {confirmStartReplay === "run2" ? "RUN 2" : "RUN 3"} ?</div>
                        <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", marginBottom: 10, lineHeight: 1.45 }}>
                            Tu vas entrer dans une partie bis. Ton vrai monde est mis de côté (INTACT) et restauré à la sortie.{confirmStartReplay === "run2" ? " Rejeu RUN 2 = ADDITIF (tes captures rejoignent ta collection)." : ""}
                        </div>
                        <button style={menuBtnDimStyle} onClick={() => setConfirmStartReplay(null)}>← Annuler</button>
                        <button style={{ ...menuBtnStyle, marginTop: 6 }} onClick={() => { if (confirmStartReplay === "run2") doStartReplayRun2(); else { setConfirmStartReplay(null); setReplayMenu(false); setReplayPickRun("run3") } }}>Oui, lancer</button>
                    </div>
                </div>
            )}
            {/* VŒU GÉNIE « offre partagée » : prompt reçu d'un autre joueur (accepter l'énergie / refuser au prix de sa dette). */}
            {genieOffer && !battle && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle}>
                        <div style={menuTitleStyle}>🧞 Un vœu de {genieOffer.sourceNickname}</div>
                        <div style={{ fontSize: 12, opacity: 0.85, textAlign: "center", marginBottom: 10, lineHeight: 1.45 }}>
                            Le génie de <b>{genieOffer.sourceNickname}</b> te tend la main : <b>+{genieOffer.amount}⚡</b> pour toi, cadeau !
                            <br />⚠️ Si tu refuses, <b>{genieOffer.sourceNickname}</b> devra faire <b>{genieOffer.pushupPerRefusal} pompes</b> de plus (l'orgueil du génie).
                        </div>
                        <button style={menuBtnStyle} onClick={() => respondGenieOffer("accept")}>✅ Accepter {genieOffer.amount}⚡</button>
                        <button style={{ ...menuBtnDimStyle, marginTop: 6 }} onClick={() => respondGenieOffer("refuse")}>✋ Refuser</button>
                    </div>
                </div>
            )}
            {replayKeep && !battle && (
                <div style={menuOverlayStyle}>
                    <div style={{ ...menuBoxStyle, maxHeight: "88%", overflowY: "auto" }}>
                        <div style={menuTitleStyle}>🎁 RAMENER DES DAEMONS</div>
                        <div style={{ fontSize: 11, opacity: 0.85, textAlign: "center", lineHeight: 1.4, marginBottom: 8 }}>
                            Tu peux ramener jusqu&apos;à <b>{replayKeep.max}</b> Daemon{replayKeep.max > 1 ? "s" : ""} (1 par badge gagné + 1 si Ligue battue) dans ton vrai monde. Choisis parmi ton équipe et ton PC — <b>le reste sera perdu</b>.
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 800, textAlign: "center", marginBottom: 6, color: keepSel.size >= replayKeep.max ? "#c9a227" : "#e8e8ee" }}>Sélectionnés : {keepSel.size} / {replayKeep.max}</div>
                        {replayKeep.mons.length === 0 && <div style={{ fontSize: 11, opacity: 0.6, textAlign: "center", padding: 8 }}>(Aucun Daemon dans ce rejeu.)</div>}
                        {replayKeep.mons.map((m) => {
                            const sp = getSpecies(m.speciesId)
                            const sel = keepSel.has(m.uid)
                            const full = keepSel.size >= replayKeep.max
                            return (
                                <button key={m.uid} style={{ ...menuBtnStyle, display: "block", textAlign: "left", height: "auto", borderColor: sel ? "#3ad06a" : undefined, opacity: (!sel && full) ? 0.45 : 1 }} onClick={() => {
                                    setKeepSel((prev) => {
                                        const next = new Set(prev)
                                        if (next.has(m.uid)) next.delete(m.uid)
                                        else if (next.size < replayKeep.max) next.add(m.uid)
                                        return next
                                    })
                                }}>
                                    <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span>{sel ? "✅ " : "⬜ "}{displayName(m)}{m.shiny ? " ✨" : ""}</span>
                                        <span style={{ opacity: 0.75, whiteSpace: "nowrap" }}>N.{m.level} · {(sp?.types ?? []).join("/")}</span>
                                    </span>
                                </button>
                            )
                        })}
                        <button style={{ ...menuBtnStyle, borderColor: "#3ad06a", color: "#3ad06a", marginTop: 8 }} onClick={() => {
                            const chosen = [...keepSel]
                                .map((uid) => replayKeep.mons.find((m) => m.uid === uid))
                                .filter((m): m is MonInstance => !!m)
                                .map((m, i) => ({ ...m, uid: `bis-${Date.now()}-${i}-${m.uid}` })) // uid RÉELLEMENT unique (Date.now par sortie + index) → aucune collision entre 2 rejeux (revue : bis<i>- se répétait au reload → doublons → perte via échange)
                            setReplayKeep(null)
                            doExitReplay(chosen)
                        }}>✅ Garder {keepSel.size} Daemon{keepSel.size > 1 ? "s" : ""} et sortir</button>
                        <button style={menuBtnDimStyle} onClick={() => { setReplayKeep(null); doExitReplay([]) }}>Ne rien garder et sortir</button>
                    </div>
                </div>
            )}

            {!battle && evolutions.length === 0 && championRun && (
                <HallOfFame champion={championRun} onDone={() => {
                    clearChampion()
                    // REJEU (« run bis ») : un sacre dans la bulle = TA fin de rejeu. Pas de créateur, pas de méga-fusion,
                    //   pas de suite — le joueur sort du rejeu (Menu → 🚪) pour figer son score². (Le HoF réel n'est pas touché.)
                    if (getActiveWorld() === "replay") { setToast("🏆 Rejeu accompli ! Sors du rejeu (Menu → 🚪) pour figer ton score²."); return }
                    // RUN 3 : le sacre du Maître DÉCLENCHE la fin du concours → l'effet run3End ouvre la méga-fusion
                    //   une fois championRun=null (clearChampion ci-dessus). Rien d'autre ici (pas de toast run 2).
                    if (getActiveWorld() === "run3") return
                    // RUN 2 — VRAI sacre (ce HoF suit la victoire contre l'ANCIENNE équipe) : ngplusFinalResult est encore
                    //   armé (son effet attend justement la fermeture du HoF). On sort ici → l'effet ouvre l'OFFRE run 3.
                    if (ngplusFinalResult) return
                    // (Legacy) NG+ ancien flux : si un combat de fin est encore en attente, laisse l'effet dédié le lancer.
                    if (ngplusFinalPending) { setToast("Un dernier défi t'attend… ton ANCIENNE équipe !"); return }
                    // RUN 2 NON-REJOUABLE : un Champion qui a DÉJÀ accompli sa seconde vie ne se voit PAS
                    // reproposer le créateur forcé → pas de 3e run. (Il faut reset le run 1 pour recommencer.)
                    if (getPlayer().ngplusUsed) { setToast("Tu es déjà allé au bout de ta seconde vie. 🍝"); return }
                    // SACRE (run 1) : le générique sert de transition → Cendreville, puis le Dieu des Nouilles
                    // lance LE DÉFI, et on enchaîne sur la CRÉATION OBLIGATOIRE d'un Daemon (→ New Game+).
                    setMap("yellow_cendreville", 21, 32)
                    showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, [
                        "*Le trône vacillant, une lueur de pâte sacrée descend sur toi.*",
                        "« CHAMPION ! Tu as tout vaincu… mais crois-tu vraiment avoir touché le fond du Nexus ? »",
                        "« Je t'offre l'ULTIME défi : deviens à ton tour CRÉATEUR. Conçois de tes mains un Daemon INÉDIT — TON œuvre — et recommence une SECONDE VIE avec lui pour seul allié. »",
                        "« Un Nexus REVISITÉ t'attend : de nouveaux types, de nouvelles arènes, des CT introuvables ailleurs, et des Daemons que nul Champion n'a jamais croisés. Et 10 000 énergies bénies pour t'élancer. »",
                        "« Mais retiens ceci : ces 10 000⚡ sont un PRÊT du Nexus. Renonce au second run, et il les REPRENDRA. Va au bout, et elles sont à toi pour toujours. »",
                        "« Et surtout — un SCORE t'attend : franchis cette seconde Ligue avec le PLUS d'énergie possible. Ce chiffre-là, c'est la vraie mesure d'un Maître. »",
                        "« Ce n'est pas une option : le Nexus l'exige. Lève-toi, et façonne ta création. 🍝 »",
                    ])
                    setPendingForcedCreator(true) // ouvre le créateur forcé dès la fin du dialogue
                }} />
            )}

            {/* ÉPILOGUE « Maître de la Chimère » (fin de Ligue de Fusion) : monté APRÈS le laïus du Dieu Spaghetti
                (epiloguePending && !dialogue). Acte I = les 6 dresseurs, Acte II = le roster vainqueur figé,
                Acte III = la checklist des secrets restants (teasers sans spoiler). Overlay propre zIndex 9600. */}
            {!battle && evolutions.length === 0 && !dialogue && !loopCreatorOpen && epiloguePending && fusionEpilogue && getActiveWorld() !== "replay" && (
                <FusionEpiloguePanel
                    tierLabel={fusionEpilogue.tier.toUpperCase()}
                    roster={fusionEpilogue.roster}
                    quests={fusionEpilogueQuests({
                        // NB : markers = defeatedTrainers du monde ACTIF (donc en run 2/3 « Nexus revisité » l'Acte III
                        //   reflète ce run, pas la vie entière) ; dexCount exclut les espèces custom (fusions/Ukognofy)
                        //   pour s'aligner sur le compteur dex visible du jeu (cf. pokedexCompletion).
                        markers: player.defeatedTrainers,
                        caught: getPokedex().caught,
                        dexCount: getPokedex().caught.filter((id) => !isCustomSpeciesId(id)).length,
                        domeChampionships: player.domeChampionships,
                        fusionsDiscovered: historyFusions(player.fusionHistory).length,
                        shinyCount: [...player.team, ...player.pc].filter((m) => m.shiny).length,
                    })}
                    onClose={() => { setFusionEpilogue(null); setEpiloguePending(false) }}
                />
            )}

            {/* Popup PREMIÈRE capture d'une espèce (après l'éventuelle évolution, jamais en
                même temps : on attend que la file d'évolutions soit vidée). */}
            {!battle && evolutions.length === 0 && newDexEntry && (
                <DexEntryScreen entry={newDexEntry} onDone={clearNewDexEntry} />
            )}
            {/* Carrousel génétique one-shot (Dieu Spaghetti) — après la 1re capture, explique le potentiel/IV. */}
            {showGeneIntro && (
                <GeneIntroCarousel onDone={() => { markGeneIntroSeen(); persistYellowSave(); setShowGeneIntro(false) }} />
            )}

            {/* Apprentissage d'attaque : plus de pop-up forcé — ça se fait À LA DEMANDE
                dans la fiche du Daemon (section « 🆕 attaque(s) à apprendre »). */}
        </div>
    )
}

// === STYLES ===

const pageStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",        // bloc compact centré verticalement → boutons dans la zone du pouce, pas de scroll
    justifyContent: "center",    // centrée horizontalement sur grand écran
    padding: 0,
}

// PvP — bandeau d'attente + bouton/boîte d'abandon (fixés, au-dessus du combat).
const pvpWaitStyle: React.CSSProperties = {
    position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 70,
    background: "#1c1408", color: "#f5d020", border: "2px solid #f5d020", borderRadius: 8,
    padding: "8px 14px", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700,
}
const pvpForfeitBtnStyle: React.CSSProperties = {
    position: "fixed", top: 70, left: 10, zIndex: 70,
    background: "#5a0f1c", color: "#fff", border: "2px solid #1c1408", borderRadius: 8,
    padding: "6px 10px", fontFamily: "'Courier New', monospace", fontSize: 11, fontWeight: 700, cursor: "pointer",
}
const pvpForfeitBoxStyle: React.CSSProperties = {
    position: "fixed", top: 70, left: 10, zIndex: 70,
    background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 8,
    padding: 10, fontFamily: "'Courier New', monospace", maxWidth: 220,
    display: "flex", flexDirection: "column", gap: 6,
}

const menuOverlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9100,
    background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
}
const menuBoxStyle: React.CSSProperties = {
    background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 10,
    padding: 16, width: "100%", maxWidth: 360, fontFamily: "'Courier New', monospace",
    display: "flex", flexDirection: "column", gap: 8,
    // Mobile : ne jamais dépasser l'écran → scroll interne (boutons toujours atteignables).
    maxHeight: "88dvh", overflowY: "auto",
}
const menuTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }
const chatFabStyle: React.CSSProperties = { position: "fixed", top: 12, right: "max(12px, calc(50% - 228px))", zIndex: 9300, width: 44, height: 44, borderRadius: "50%", border: "3px solid #1c1408", background: "#f4ecd4", fontSize: 20, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }
const chatBadgeStyle: React.CSSProperties = { position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: "#e0302a", color: "#fff", fontSize: 11, fontWeight: 800, lineHeight: "18px", textAlign: "center", border: "2px solid #f4ecd4", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }
const pocketHdrStyle: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, opacity: 0.75, margin: "8px 0 3px", borderBottom: "1px solid rgba(0,0,0,0.15)", paddingBottom: 2 }
const menuBtnStyle: React.CSSProperties = {
    background: "#fff", border: "2px solid #1c1408", borderRadius: 6, padding: "12px 14px",
    fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left", color: "#1c1408",
    touchAction: "manipulation", // tap instantané sur mobile (sinon pris pour un scroll → "appui long")
}
const menuBtnDimStyle: React.CSSProperties = { ...menuBtnStyle, background: "#e0e0d0", border: "2px solid #888", color: "#555" }
// Fiche Daemon : flèches de slide + sprite.
const slideBtnStyle: React.CSSProperties = {
    background: "#1c1408", color: "#f5d020", border: "none", borderRadius: 6, padding: "4px 10px",
    fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", lineHeight: 1,
}
const ficheSpriteStyle: React.CSSProperties = {
    width: 104, height: 104, objectFit: "contain", imageRendering: "pixelated",
    display: "block", margin: "2px auto", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.25))",
}
const teamRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 0", borderBottom: "1px solid #00000018",
}
const miniBtn: React.CSSProperties = {
    background: "#fff", border: "2px solid #1c1408", borderRadius: 5, padding: "2px 8px",
    fontFamily: "inherit", fontWeight: 700, cursor: "pointer", color: "#1c1408", marginLeft: 4,
}
const toastStyle: React.CSSProperties = {
    position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)", zIndex: 9300,
    background: "#1c1408", color: "#f5d020", border: "2px solid #f5d020", borderRadius: 8,
    padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700,
    maxWidth: 320, textAlign: "center", cursor: "pointer",
}

