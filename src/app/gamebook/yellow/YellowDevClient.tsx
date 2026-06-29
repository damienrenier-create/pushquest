"use client"

// Nexus II — page de dev client.
//
// Branche le D-pad du GameBoyShell au store Zustand : chaque pression appelle
// useGameStore.move(direction), qui calcule le nouveau player state via le
// moteur pur tryMove(). Le MapView ré-render automatiquement.
//
// Pas encore : interaction A/B (NPCs, dialogues), START (menu), SELECT.

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import GameBoyShell from "./GameBoyShell"
import MapView from "./MapView"
import BattleScreen from "./battle/BattleScreen"
import BattleBoundary from "./battle/BattleBoundary"
import { useCasinoPresence } from "@/lib/gamebook/yellow/multiplayer/useCasinoPresence"
import { useCasinoChallenge, type BattleStart } from "@/lib/gamebook/yellow/multiplayer/useCasinoChallenge"
import { useCasinoChat } from "@/lib/gamebook/yellow/multiplayer/useCasinoChat"
import { useCasinoTrade } from "@/lib/gamebook/yellow/multiplayer/useCasinoTrade"
import { useCasinoCtTrade } from "@/lib/gamebook/yellow/multiplayer/useCasinoCtTrade"
import { useCasinoBattle } from "@/lib/gamebook/yellow/multiplayer/useCasinoBattle"
import TradeAnimation from "./TradeAnimation"
import { usePvpCtx, pvpForfeit } from "@/lib/gamebook/yellow/store/battleStore"
import EvolutionScreen from "./battle/EvolutionScreen"
import MoveLearnScreen from "./battle/MoveLearnScreen"
import HallOfFame from "./HallOfFame"
import HallOfFameViewer from "./HallOfFameViewer"
import DexEntryScreen from "./battle/DexEntryScreen"
import IntroCinematic from "./IntroCinematic"
import GuidePanel from "./GuidePanel"
import LibraryPanel from "./LibraryPanel"
import MovesPanel from "./MovesPanel"
import AdvisorPanel from "./AdvisorPanel"
import LabPanel from "./LabPanel"
import CombatShopModal from "./CombatShopModal"
import DailyTicketModal from "./DailyTicketModal"
import HeldItemModal from "./HeldItemModal"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import ParkSignPanel from "./ParkSignPanel"
import PosterPanel from "./PosterPanel"
import { useGameStore, setCurrentNickname, DEFAULT_SPAWN } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { YELLOW_MAPS, CENDREVILLE_SPAWN } from "@/lib/gamebook/yellow/maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { useBattle, useEvolutions, clearEvolutions, useChampionRun, clearChampion, useWhiteout, clearWhiteout, useSbireWin, clearSbireWin, useAceWin, clearAceWin, useBadgeAwarded, clearBadgeAwarded, useRematchReward, clearRematchReward, useNewDexEntry, clearNewDexEntry, dispatchBattleInput, endBattle, getSbireRewardMsg, getAceRewardMsg, getAceLossTaunt, getGiftCtMove, startTrainerBattle, useChainRematch, clearChainRematch, cancelEvolution, usePendingLearn, clearPendingLearn, useDuelResult, clearDuelResult, useFrontierResult, clearFrontierResult, getBattleEnergy, resumeBattleFromStorage, useStoneReward, clearStoneReward, useJustCaught, clearJustCaught } from "@/lib/gamebook/yellow/store/battleStore"
import { useEncounterFxActive } from "@/lib/gamebook/yellow/store/encounterFxStore"
import { aceLoseLine } from "@/lib/gamebook/yellow/data/ace"
import { sbireExplanation } from "@/lib/gamebook/yellow/data/sbire"
import { duelWinLines, duelLossLines, duelDreamLines, DUEL_NEXUS_BALL_ID, DUEL_LOSS_CONSOLE_REPS, DUEL_GOD_NPC, DUEL_GOD_NAME, DUEL_DREAM_NPC, DUEL_DREAM_NAME } from "@/lib/gamebook/yellow/data/duel"
import { loadYellowSave, initAutosave, persistYellowSave, processSaiyanPoints, resetYellowChapter } from "@/lib/gamebook/yellow/store/saveManager"
import { getPlayer, setTeam, usePlayer, addItem, spendReps, grantReps, grantBonusEnergyUncapped, consumeItem, setCurrentPlayerId, setCurrentMapId, executeTrade, tradeCt, applyTradeEvolution, markIntroSeen, superPastaPrice, buySuperPasta, depositToPc, withdrawFromPc, renameDaemon, healTeamMember, healAllTeam, allocateStatPoint, teachCt, swapTeam, favoriteDaemon, favoriteMove, resolveLearn, consumeGiftMessage, reorderMove, evolvePantheonWithStone, resetLigueProgress, duelWonToday, recordDuelWin, grantCt, markSpagRouletteSeen, markGeneIntroSeen, ticketCount } from "@/lib/gamebook/yellow/store/playerStore"
import { PANTHEON_STONE_EVOS } from "@/lib/gamebook/yellow/data/gekroc"
import { ARENA_TICKET_VALUE } from "@/lib/gamebook/yellow/data/labDefis"
import { purchasableCts, getCt, canLearnCt } from "@/lib/gamebook/yellow/data/cts"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { useRun, getRun, startTowerRun, startRun, applyWinFromBattle, applyLossFromBattle, quitRun, endRun, setDraftedTeam, getDraftedTeam, setRunRaw } from "@/lib/gamebook/yellow/frontier/runStore"
import type { FrontierRunState } from "@/lib/gamebook/yellow/frontier/run"
import { postRecordRun } from "@/lib/gamebook/yellow/frontier/frontierApi"
import { ctRewardOptionsForTeam } from "@/lib/gamebook/yellow/frontier/rewards"
import { generateRentalPool, buildDraftTeam, type RentalCandidate } from "@/lib/gamebook/yellow/frontier/factory"
import { resolveFrontierLevel, JC_PER_WIN, JC_BOSS_MULT, BOSS_EVERY, type OpponentSpec, type LevelRule } from "@/lib/gamebook/yellow/frontier/engine"
import { createDome, advanceDome, playerOpponent, aiLeadIndex, DOME_ROUNDS, type DomeState } from "@/lib/gamebook/yellow/frontier/dome"
import { Rng } from "@/lib/gamebook/yellow/battle/rng"

// ZONE DE COMBAT — convertit les specs d'adversaires de la série en instances de combat.
function buildFrontierEnemies(opponent: OpponentSpec[]) {
    return opponent.map((o) => createMonInstance(o.speciesId, o.level, { owned: false }))
}
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ITEMS, getItem } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import { attackCost, effectiveQuota } from "@/lib/gamebook/yellow/data/combatCostConfig"
import { SAIYAN_POINT_VALUE } from "@/lib/gamebook/yellow/data/saiyanConfig"
import { ivTier, ivTotal, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, topEvStats, EV_TOTAL_CAP, EV_STAT_CAP, evStatBonus, EV_YIELD_PER_WIN } from "@/lib/gamebook/yellow/data/evConfig"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"
import { usePlayerArena, type ArenaOpponent } from "@/lib/gamebook/yellow/multiplayer/usePlayerArena"
import { buildHubTeam, buildMirrorTeam, type ArenaMode } from "@/lib/gamebook/yellow/data/playerArena"
import ArenaChallengeModal from "./ArenaChallengeModal"
import DomeBracket from "./DomeBracket"
import GeneIntroCarousel from "./GeneIntroCarousel"

// ============================================================
// ZONE DE COMBAT — REPRISE DE SÉRIE au refresh (anti-abandon)
// ------------------------------------------------------------
// Le combat #8 (battleStore) EXCLUT volontairement les séries Frontier. On persiste donc ICI la
// SÉRIE elle-même (Tour/Usine: run + équipe louée ; Dôme: bracket) dans un instantané localStorage
// dédié, repris au boot. v1 = on ne reprend PAS le combat de vague en cours (on retombe au début de
// la vague courante via l'effet de lancement) — bien plus sûr. Fail-safe total comme #8.
type DomeSnap = { state: DomeState; rule: LevelRule; seed: number; jc: number }
interface FrontierSnap {
    v: 1
    ts: number
    run: FrontierRunState | null
    draftedTeam: MonInstance[] | null
    dome: DomeSnap | null
    tourChoice: boolean
    usineCt: string[] | null
}
const FRONTIER_LS_KEY = "pq_yellow_frontier_v1"
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
        if (typeof o.ts === "number" && Date.now() - o.ts > FRONTIER_LS_MAX_AGE_MS) { clearFrontierSnap(); return null }
        if (!frontierActive(o.run, o.dome) || !frontierSpeciesOk(o)) { clearFrontierSnap(); return null }
        return o
    } catch { clearFrontierSnap(); return null }
}

export default function YellowDevClient({ userId = "", isCreator = false, nickname = "" }: { userId?: string; isCreator?: boolean; nickname?: string }) {
    const move = useGameStore((s) => s.move)
    const mapPlayer = useGameStore((s) => s.player)
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)
    const hydrate = useGameStore((s) => s.hydrate)
    const hydrated = useGameStore((s) => s.hydrated)
    const shopOpen = useGameStore((s) => s.shopOpen)
    const closeShop = useGameStore((s) => s.closeShop)
    const interiorReturn = useGameStore((s) => s.interiorReturn) // ville d'entrée d'un intérieur partagé (shop/centre)
    const pcOpen = useGameStore((s) => s.pcOpen)
    const closePc = useGameStore((s) => s.closePc)
    // Overlays plein écran gérés côté store (fermés par le bouton B via goBack).
    const guideOpen = useGameStore((s) => s.guideOpen)
    const closeGuide = useGameStore((s) => s.closeGuide)
    const libraryOpen = useGameStore((s) => s.libraryOpen)
    const closeLibrary = useGameStore((s) => s.closeLibrary)
    const advisorOpen = useGameStore((s) => s.advisorOpen)
    const closeAdvisor = useGameStore((s) => s.closeAdvisor)
    const labOpen = useGameStore((s) => s.labOpen)
    const closeLab = useGameStore((s) => s.closeLab)
    const combatShopOpen = useGameStore((s) => s.combatShopOpen)
    const closeCombatShop = useGameStore((s) => s.closeCombatShop)
    const signOpen = useGameStore((s) => s.signOpen)
    const closeSign = useGameStore((s) => s.closeSign)
    const posterImage = useGameStore((s) => s.posterImage)
    const closePoster = useGameStore((s) => s.closePoster)
    const dialogue = useGameStore((s) => s.dialogue)
    const setMap = useGameStore((s) => s.setMap)
    const launchRematch = useGameStore((s) => s.launchRematch)
    const showDialogue = useGameStore((s) => s.showDialogue)
    const battle = useBattle()
    // Transition de rencontre (écran de chargement) affichée → on neutralise le D-pad.
    const encounterFx = useEncounterFxActive()
    const evolutions = useEvolutions()
    const championRun = useChampionRun()
    const chainRematchId = useChainRematch()
    const pendingLearn = usePendingLearn()
    const newDexEntry = useNewDexEntry()
    const whiteout = useWhiteout()
    const duelResult = useDuelResult()
    const run = useRun()
    const frontierResult = useFrontierResult()
    const frontierReportedRef = useRef(false)
    // #frontier-resume : tant que la reprise au boot n'a pas eu lieu, on N'ÉCRIT PAS l'instantané
    // (sinon le 1er rendu, état vide, effacerait le snapshot avant qu'on ait pu le relire).
    const frontierResumedRef = useRef(false)
    const [usineDraft, setUsineDraft] = useState<{ levelRule: LevelRule; pool: RentalCandidate[]; picks: string[] } | null>(null)
    // DÔME (bracket de 8, état local éphémère) : state du tournoi + règle + graine + JC cumulés.
    const [dome, setDome] = useState<{ state: DomeState; rule: LevelRule; seed: number; jc: number } | null>(null)
    const [ticketOpen, setTicketOpen] = useState(false) // ticket roulette quotidien (1re connexion du jour)
    const [heldOpen, setHeldOpen] = useState(false) // modale "objet tenu" (depuis la fiche d'un Daemon)
    const [evDetailOpen, setEvDetailOpen] = useState(false) // détail EV (par stat) déplié sur la fiche
    const ticketChecked = useRef(false)
    const [tourChoice, setTourChoice] = useState(false) // pause entre vagues de série (Continuer / Quitter)
    const [domePause, setDomePause] = useState(false) // écran d'intro AVANT chaque match du Dôme (bracket + adversaire)
    const [usineCt, setUsineCt] = useState<string[] | null>(null) // CT à choisir (récompense Usine) parmi le vaincu
    const sbireWin = useSbireWin()
    const aceWin = useAceWin()
    const badgeAwarded = useBadgeAwarded()
    const rematchReward = useRematchReward()
    const stoneReward = useStoneReward()
    const justCaught = useJustCaught()
    const [showGeneIntro, setShowGeneIntro] = useState(false) // carrousel génétique one-shot (post-capture)
    const router = useRouter()
    const player = usePlayer()
    // ARÈNES JOUEURS (hub Eau / miroir Élec) — adversaires IA, débloqués quand on a TOUS les badges.
    const myArenaLevel = player.team.reduce((m, x) => Math.max(m, x.level), 0)
    const { mode: arenaMode, opponents: arenaOpponents } = usePlayerArena(mapPlayer.mapId, player.badges, userId, myArenaLevel)
    const [arenaFight, setArenaFight] = useState<{ opp: ArenaOpponent; mode: ArenaMode; enemy: MonInstance[] } | null>(null)
    // Adversaire du duel EN COURS (gardé pendant le combat pour appliquer les récompenses à la fin).
    const duelOppRef = useRef<{ userId: string; nickname: string } | null>(null)
    const handleArenaClick = (uid: string) => {
        if (!arenaMode) return
        const opp = arenaOpponents.find((o) => o.userId === uid)
        if (!opp) return
        // Limite : 1 victoire par joueur-IA et par jour → déjà battu aujourd'hui = pas de revanche.
        if (duelWonToday(opp.userId)) { showDialogue("duel_rival", opp.nickname, ["Tu m'as déjà vaincu aujourd'hui. Reviens demain pour ta revanche."]); return }
        const enemy = arenaMode === "hub" ? buildHubTeam(opp.player) : buildMirrorTeam(opp.player)
        setArenaFight({ opp, mode: arenaMode, enemy })
    }
    const [menu, setMenu] = useState<"none" | "pause" | "team" | "bag" | "reput" | "moves" | "hof">("none")
    const ficheTouchX = useRef<number | null>(null) // swipe gauche/droite dans la fiche Daemon
    const [selected, setSelected] = useState<MonInstance | null>(null)
    const [pantheonEvo, setPantheonEvo] = useState<MonInstance | null>(null) // Pierre Gékroc : choix du type pour Panthéon
    const [showIntro, setShowIntro] = useState(false)
    const [pastaPick, setPastaPick] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [renaming, setRenaming] = useState(false)
    const [renameText, setRenameText] = useState("")
    const [bagItem, setBagItem] = useState<string | null>(null)
    const [pcBox, setPcBox] = useState(0)
    const [pcSort, setPcSort] = useState<"recent" | "lvl" | "hp" | "spc" | "atk" | "def" | "spe" | "alpha">("recent")
    const [pcSortDir, setPcSortDir] = useState(-1) // -1 = décroissant · 1 = croissant
    const [ctShop, setCtShop] = useState(false)
    const [ctPick, setCtPick] = useState<string | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)
    // SÉCURITÉ RESET : le « OUI » se fait par MAINTIEN prolongé (1,5s, barre de remplissage), pas par
    // un tap. Empêche l'effacement accidentel par double-A / tap rapide (cf. perte de save de Mools).
    const [resetHolding, setResetHolding] = useState(false)
    const resetHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => () => { if (resetHoldTimer.current) clearTimeout(resetHoldTimer.current) }, [])
    const [buyConfirm, setBuyConfirm] = useState<{ id: string; name: string; price: number } | null>(null)
    const [buyQty, setBuyQty] = useState(1)
    const [sellMode, setSellMode] = useState(false)
    const [swapPick, setSwapPick] = useState<string | null>(null) // uid du Daemon "à déplacer"

    // Multijoueur casino : présence + déplacements temps réel des autres joueurs.
    // Actif uniquement quand on EST dans le casino, hors combat et hors intro.
    const inCasino = mapPlayer.mapId === "yellow_casino"
    const remotePlayers = useCasinoPresence({
        active: inCasino && !battle && !showIntro && !!userId,
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

    // === PvP : défi + combat réseau ===
    const [pvpSession, setPvpSession] = useState<BattleStart | null>(null)
    const pvpCtx = usePvpCtx()
    const challenge = useCasinoChallenge({
        active: inCasino && !battle && !showIntro && !!userId,
        myUserId: userId,
        busy: !!battle || !!pvpSession || tradeBusyRef.current || ctTradeBusyRef.current,
        onStart: (s) => setPvpSession(s),
    })
    const { forfeit: pvpForfeitNow } = useCasinoBattle(pvpSession, userId, (reason) => {
        setPvpSession(null)
        setToast(reason)
    })

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

    // Au mount : charge l'état du joueur depuis le serveur (DB Neon).
    // Si le joueur n'a jamais joué, on garde le state par défaut (déjà set
    // côté store) — l'API renvoie les mêmes defaults dans ce cas.
    useEffect(() => {
        fetch("/api/gamebook/yellow/state")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.player) hydrate(data.player)
            })
            .catch((e) => console.warn("[yellow] load failed", e))
    }, [hydrate])

    // Charge la sauvegarde de jeu (équipe / Pokédex / objets) + auto-save.
    useEffect(() => {
        let cancelled = false
        ; (async () => {
            await loadYellowSave()
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
            if (!cancelled) {
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
                        if (duelTotal > 0 || bdayTotal > 0) persistYellowSave()
                        if (duel.length > 0) {
                            const nicks = [...new Set(duel.map((g) => g.fromNickname).filter(Boolean))]
                            showDialogue(DUEL_DREAM_NPC, DUEL_DREAM_NAME, duelDreamLines(nicks, duelTotal))
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
            // LIGUE — RÉCOMPENSE CROISÉE : un autre joueur est devenu Champion → +1/3 de MON quota
            // énergétique (1 don par sacre, calculé sur MON repsCap). Appliqué après loadYellowSave.
            if (!cancelled) {
                try {
                    const r = await fetch("/api/gamebook/yellow/hall-of-fame/energy")
                    const j = r.ok ? await r.json() : null
                    const grants = (j?.grants ?? 0) as number
                    const champs = (j?.champions ?? []) as string[]
                    if (!cancelled && grants > 0) {
                        const per = Math.floor(getPlayer().repsCap / 3)
                        const got = grantReps(per * grants)
                        persistYellowSave()
                        const who = [...new Set(champs.filter(Boolean))].join(", ")
                        if (got > 0) setToast(`🏛️ ${who || "Un champion"} a vaincu la Ligue ! +${got} énergie pour toi !`)
                    }
                } catch { /* neutre (hors-ligne / table absente) */ }
            }
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
            // Overlays POST-COMBAT (popup 1re capture / cinématique d'évolution) : ils vivent dans
            // battleStore (hors garde de move()) et s'affichent quand battle===null. Sans ça, une
            // flèche déplacerait le joueur SOUS l'overlay → rencontre sauvage → startWildBattle
            // reset newDexEntry/evolutions → popup + renommage PERDUS. On neutralise tout input carte.
            if (championRun || arenaFight || pendingLearn || newDexEntry || evolutions.length > 0) { e.preventDefault(); return }
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
                    const opp = arenaMode ? [...arenaOpponents].filter((o) => cheb(o) <= 1).sort((a, b) => cheb(a) - cheb(b))[0] : undefined
                    if (arenaMode && opp) {
                        if (duelWonToday(opp.userId)) showDialogue("duel_rival", opp.nickname, ["Tu m'as déjà vaincu aujourd'hui. Reviens demain pour ta revanche."])
                        else { const enemy = arenaMode === "hub" ? buildHubTeam(opp.player) : buildMirrorTeam(opp.player); setArenaFight({ opp, mode: arenaMode, enemy }) }
                    }
                    else pressA()
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
    }, [move, pressA, pressB, battle, menu, newDexEntry, evolutions, championRun, arenaFight, pendingLearn, arenaMode, arenaOpponents, mapPlayer, showDialogue])

    // Identité (User.id) + carte courante → estampillage ownership/lieu à la capture.
    useEffect(() => { setCurrentPlayerId(userId) }, [userId])
    useEffect(() => { setCurrentNickname(nickname) }, [nickname]) // whitelist gate ACE → Cendreville
    useEffect(() => { setCurrentMapId(mapPlayer.mapId) }, [mapPlayer.mapId])

    // Toast éphémère : disparaît tout seul après 2,5 s.
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 2500)
        return () => clearTimeout(t)
    }, [toast])

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
            if (mapPlayer.mapId.startsWith("yellow_ligue_")) resetLigueProgress()
            setMap("yellow_infirmary", 4, 3)
            persistYellowSave()
            clearWhiteout()
            if (aceTaunt) showDialogue("y_ace", "ACE", [aceTaunt]) // raillerie d'ACE quand il t'a vaincu
        }
    }, [whiteout, battle, setMap, mapPlayer.mapId, showDialogue])

    // DUEL reflet terminé (Viridian/arène eau) → récompenses post-combat, une fois le combat quitté
    // ET les éventuelles évolutions jouées. Victoire : cadeau Dieu des Nouilles + Nexus Ball (+ cadeau
    // croisé serveur au vrai joueur). Défaite : trashtalk de l'adversaire + 30 énergie « par pitié ».
    useEffect(() => {
        if (!duelResult || battle || evolutions.length > 0) return
        const opp = duelOppRef.current
        duelOppRef.current = null
        clearDuelResult()
        if (!opp) return
        if (duelResult.won) {
            recordDuelWin(opp.userId)
            addItem(DUEL_NEXUS_BALL_ID, 1)
            persistYellowSave()
            // Partie C : cadeau croisé au VRAI joueur mirouté (best-effort, non bloquant).
            fetch("/api/gamebook/yellow/duel-gift", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ toUserId: opp.userId, fromNickname: nickname }),
            }).catch(() => {})
            showDialogue(DUEL_GOD_NPC, DUEL_GOD_NAME, duelWinLines(opp.nickname))
        } else {
            grantReps(DUEL_LOSS_CONSOLE_REPS)
            persistYellowSave()
            showDialogue("duel_rival", opp.nickname, duelLossLines(opp.nickname))
        }
    }, [duelResult, battle, evolutions, nickname, showDialogue])

    // LIGUE — SACRE : dès que le championRun est posé (victoire sur LE MAÎTRE), on grave l'équipe
    // au Hall of Fame PARTAGÉ et on récompense tous les autres joueurs (+1/3 de leur quota). Une seule
    // fois par sacre — la ref se réarme quand le générique se ferme (clearChampion → championRun=null).
    const champReportedRef = useRef(false)
    useEffect(() => {
        if (!championRun) { champReportedRef.current = false; return }
        if (champReportedRef.current) return
        champReportedRef.current = true
        fetch("/api/gamebook/yellow/hall-of-fame", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ team: championRun.team }),
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
            const labels: Record<string, string> = { plante: "FEUILLE", feu: "FLAMME", eau: "GOUTTE", roche: "ROCHE", elec: "ÉCLAIR" }
            const lbl = labels[badgeAwarded] ?? badgeAwarded.toUpperCase()
            const giftMove = getGiftCtMove()
            const lines = [
                `🎖️ Tu obtiens le BADGE ${lbl} !`,
                "Ton plafond de reps grimpe (+250) et de nouvelles CT s'ouvrent à la boutique.",
            ]
            if (giftMove) lines.push(`🎁 Tu reçois la CT « ${giftMove} » ! Apprends-la à un Daemon compatible — cadeau unique.`)
            lines.push(`🎟️ Et un ticket roulette de ${ARENA_TICKET_VALUE} énergies — joue-le à ta prochaine connexion !`)
            showDialogue("y_gym_sign", "ARÈNE", lines)
            clearBadgeAwarded()
        }
    }, [badgeAwarded, battle, evolutions.length, showDialogue])

    // PIERRE GÉKROC : don de la Pierre d'Évolution après avoir battu/capturé Gékroc (Centrale) →
    // notification claire post-combat (sinon le don, objet "objet clé", passait totalement inaperçu).
    useEffect(() => {
        if (stoneReward && !battle && evolutions.length === 0) {
            showDialogue("y_gekroc", "PIERRE GÉKROC", [stoneReward])
            clearStoneReward()
        }
    }, [stoneReward, battle, evolutions.length, showDialogue])

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
            const rng = new Rng((dome.seed ^ ((dome.state.round + 1) * 0x9e3779b1)) >>> 0)
            const next = advanceDome(dome.state, rng, won)
            const base = JC_PER_WIN[dome.rule] ?? JC_PER_WIN.L50
            // JC : base par manche gagnée ; la FINALE (championnat) compte comme un boss (×5).
            const jc = dome.jc + (won ? (next.status === "won" ? base * JC_BOSS_MULT : base) : 0)
            if (next.status === "active") {
                setDome({ ...dome, state: next, jc }) // manche suivante : on REPASSE par l'intro (bracket + adversaire)
                setDomePause(true)
            } else {
                const roundsWon = won ? DOME_ROUNDS : dome.state.round // éliminé au round R = R manches gagnées
                postRecordRun({ mode: "DOME", streak: Math.max(0, roundsWon), jcEarned: jc })
                setToast(next.status === "won"
                    ? `🏆 DÔME REMPORTÉ ! ${jc} JC enregistrés.`
                    : `🏆 Dôme — éliminé en ${["quart", "demi", "finale"][dome.state.round] ?? "manche"}. ${jc} JC enregistrés.`)
                setDome(null)
                setDomePause(false)
            }
            clearFrontierResult()
            return
        }
        if (frontierResult.won) {
            // USINE : récompense = choisir une CT parmi les attaques du vaincu (run.opponent = la vague battue,
            // AVANT applyWin qui prépare la suivante). On filtre celles déjà possédées.
            const curRun = getRun() // run courant (= la vague battue, avant applyWin) — lu hors réactivité (pas de dep)
            if (curRun?.mode === "FACTORY") {
                const opts = ctRewardOptionsForTeam(curRun.opponent).filter((id) => !getPlayer().ownedCts.includes(id) && !getPlayer().boughtCts.includes(id))
                setUsineCt(opts.length ? opts : null)
            }
            applyWinFromBattle(getBattleEnergy().spent)
            setTourChoice(true) // PAUSE entre vagues : le joueur choisit Continuer / Quitter
        } else {
            const ended = applyLossFromBattle()
            if (ended && !frontierReportedRef.current) {
                frontierReportedRef.current = true
                postRecordRun({ mode: ended.mode, streak: ended.streak, jcEarned: ended.jc }) // persiste JC + record (serveur, neutre si table absente)
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
        startTrainerBattle(myTeam, buildFrontierEnemies(run.opponent), Math.floor(Math.random() * 1e9), { trainerId: "frontier:" + run.mode, aiLevel: "trainer" })
    }, [run, tourChoice, battle, frontierResult, evolutions.length, dialogue, pendingLearn, newDexEntry])

    // DÔME — lance le match du round courant (TON équipe vs ton adversaire de bracket) tant que le tournoi
    // est actif et l'écran libre. L'issue est traitée par l'effet de résultat (advanceDome).
    useEffect(() => {
        if (!dome || dome.state.status !== "active") return
        if (domePause) return // écran d'intro affiché : on attend que le joueur clique « Affronter »
        if (battle || frontierResult || evolutions.length > 0 || dialogue || pendingLearn || newDexEntry) return
        const opp = playerOpponent(dome.state)
        if (!opp) return
        // SOIN avant la 1re manche SEULEMENT (round 0) → endurance sur les 3 manches (cf. intro
        // « Pas de soin entre les manches ! »). Les PV se conservent (finishBattle persiste l'équipe).
        if (dome.state.round === 0) healAllTeam()
        // DIFFICULTÉ CROISSANTE : en quart (round 0) l'IA envoie son 1er Daemon ; en demi/finale
        // (round ≥ 1) elle OUVRE avec son MEILLEUR matchup de type contre ton équipe visible (aiLeadIndex).
        let oppTeam = opp.team
        if (dome.state.round >= 1) {
            const pTeam = getPlayer().team.map((m) => ({ speciesId: m.speciesId, level: m.level }))
            const lead = aiLeadIndex(opp.team, pTeam)
            oppTeam = [opp.team[lead], ...opp.team.filter((_, i) => i !== lead)]
        }
        startTrainerBattle(getPlayer().team, buildFrontierEnemies(oppTeam), Math.floor(Math.random() * 1e9), { trainerId: "frontier:DOME", aiLevel: "trainer" })
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
        }
    }, [hydrated, ticketOpen, battle, dialogue, evolutions.length, pendingLearn, newDexEntry, championRun, whiteout])

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

    // RETOUR : ferme l'overlay le plus "haut" de la pile (fiche → sous-menu → pause).
    // Renvoie true si quelque chose a été fermé → utilisé par le bouton B (B = retour).
    // Pile de fermeture du bouton B : ferme l'overlay le PLUS HAUT et renvoie true ; false si
    // plus rien à fermer (le clavier/onB enchaîne alors sur pressB pour les dialogues).
    // Ordre = du plus superposé au moins superposé (un sous-modal se ferme avant son parent).
    const goBack = (): boolean => {
        if (posterImage) { closePoster(); return true } // poster mural (Centre) → overlay plein écran
        if (confirmReset) { setConfirmReset(false); return true }
        if (heldOpen) { setHeldOpen(false); return true } // sous-modale objet tenu (au-dessus de la fiche)
        if (renaming) { setRenaming(false); return true } // annule le renommage, reste sur la fiche
        if (selected) { setSelected(null); setRenaming(false); setHeldOpen(false); return true } // fermer la fiche reset renommage + objet tenu
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
        if (libraryOpen) { closeLibrary(); return true }
        if (advisorOpen) { closeAdvisor(); return true }
        if (labOpen) { closeLab(); return true }
        if (pcOpen) { closePc(); return true }
        if (menu === "team" || menu === "bag" || menu === "reput" || menu === "moves" || menu === "hof") { setMenu("pause"); return true }
        if (menu === "pause") { setMenu("none"); return true }
        return false
    }
    // Le handler clavier (effet plus haut) appelle toujours la dernière version via ce ref.
    goBackRef.current = goBack

    return (
        <div style={pageStyle}>
            {showIntro && <IntroCinematic onComplete={onIntroComplete} />}
            {tradeAnim && (
                <TradeAnimation
                    give={tradeAnim.give}
                    receive={tradeAnim.receive}
                    onDone={() => {
                        executeTrade(tradeAnim.give.uid, tradeAnim.receive)
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
                // En combat, START/SELECT ouvre le menu pause (viewers sûrs). Quand ce menu est ouvert,
                // le D-pad / A pilotent le menu (tactile) → on neutralise l'entrée combat dessous ;
                // B referme le menu (goBack).
                onUp={() => { if (encounterFx) return; if (battle) { if (menu === "none") dispatchBattleInput("up"); return } move("up") }}
                onDown={() => { if (encounterFx) return; if (battle) { if (menu === "none") dispatchBattleInput("down"); return } move("down") }}
                onLeft={() => { if (encounterFx) return; if (battle) { if (menu === "none") dispatchBattleInput("left"); return } move("left") }}
                onRight={() => { if (encounterFx) return; if (battle) { if (menu === "none") dispatchBattleInput("right"); return } move("right") }}
                onA={() => {
                    if (battle) { if (menu === "none") dispatchBattleInput("a"); return }
                    // Dans le casino, A face à un autre joueur = le défier.
                    if (inCasino) {
                        const target = facingRemote()
                        if (target) { menuTapGuard.current = Date.now(); setInteractTarget({ userId: target.userId, nickname: target.nickname }); return }
                    }
                    pressA()
                }}
                onB={() => { if (battle) { if (menu !== "none") { goBack(); return } dispatchBattleInput("b"); return } if (!goBack()) pressB() }}
                onStart={() => { menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
                onSelect={() => { menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
            >
                {battle ? (
                    // Error boundary : si le combat plante, on propose "Reprendre" (endBattle).
                    <BattleBoundary onReset={() => endBattle()}>
                        <BattleScreen />
                    </BattleBoundary>
                ) : (
                    <MapView remotePlayers={remotePlayers} chatBubbles={chat.bubbles} myUserId={userId} arenaOpponents={arenaOpponents} onArenaClick={handleArenaClick} />
                )}
            </GameBoyShell>

            {/* Menu START (pause). En COMBAT : ouvert aussi, mais limité aux viewers SÛRS
                (Pokédex, Dex, Réputation, Hall of Fame) — pas d'édition d'équipe / d'attaques
                ni de réinitialisation qui casseraient le combat en cours. */}
            {menu === "pause" && (
                <div style={menuOverlayStyle} onClick={() => { if (Date.now() - menuTapGuard.current < 350) return; setMenu("none") }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>MENU</div>
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("team")}>🐾 ÉQUIPE</button>}
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("bag")}>🎒 SAC</button>}
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/pokedex")}>📷 POKÉDEX</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/dex")}>📖 DEX (CATALOGUE)</button>
                        {!battle && <button style={menuBtnStyle} onClick={() => setMenu("moves")}>⚔️ ATTAQUES</button>}
                        <button style={menuBtnStyle} onClick={() => setMenu("reput")}>🏆 RÉPUTATION</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("hof")}>🏛️ HALL OF FAME</button>
                        {!battle && (confirmReset ? (
                            <>
                                <div style={{ fontSize: 11, color: "#c83030", fontWeight: 700, textAlign: "center" }}>
                                    Effacer TOUTE ta progression du Chapitre 2 ?<br />(équipe, Pokédex, badges, reps — IRRÉVERSIBLE)<br />
                                    <span style={{ fontSize: 10, opacity: 0.85, fontWeight: 400 }}>MAINTIENS le bouton enfoncé 1,5 s pour confirmer — un simple appui ne fait rien.</span>
                                </div>
                                <button
                                    style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030", position: "relative", overflow: "hidden", touchAction: "none", userSelect: "none" }}
                                    onPointerDown={() => {
                                        if (resetHoldTimer.current) return
                                        if (trade.session) { setToast("Termine ton échange en cours avant de réinitialiser."); setConfirmReset(false); return }
                                        setResetHolding(true)
                                        resetHoldTimer.current = setTimeout(async () => {
                                            resetHoldTimer.current = null; setResetHolding(false)
                                            await resetYellowChapter() // copie la save dans history AVANT d'effacer + recrédite l'énergie
                                            setMap(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y) // repop au tout début (1re ville), comme une nouvelle partie
                                            setConfirmReset(false); setMenu("none"); setShowIntro(true)
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
                                <button style={menuBtnDimStyle} onClick={() => setConfirmReset(false)}>← Annuler</button>
                            </>
                        ) : (
                            <button style={menuBtnDimStyle} onClick={() => setConfirmReset(true)}>♻️ RECOMMENCER LE CHAPITRE 2</button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("none")}>← FERMER</button>
                    </div>
                </div>
            )}

            {/* Overlay Équipe */}
            {!battle && menu === "team" && (
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
                                    <span onClick={() => setSelected(m)} title="Voir la fiche" style={{ fontWeight: 700, flex: 1, cursor: "pointer" }}>{displayName(m)}</span>
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
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%" }} onClick={() => setSelected(m)}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{displayName(m)}</span>
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
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%" }} onClick={() => setSelected(m)}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{displayName(m)}</span>
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
                                    {/* ❤️ Poche Soins */}
                                    {(() => {
                                        const heals = Object.values(ITEMS).filter((it) => (it.category === "HEAL" || it.category === "STATUS_HEAL") && (player.items[it.id] ?? 0) > 0)
                                        return heals.length > 0 && (
                                            <>
                                                <div style={pocketHdrStyle}>❤️ Soins</div>
                                                {heals.map((it) => (
                                                    <button key={it.id} style={it.category === "HEAL" ? menuBtnStyle : menuBtnDimStyle} disabled={it.category !== "HEAL"} onClick={() => it.category === "HEAL" && setBagItem(it.id)}>
                                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{it.name}{it.category === "STATUS_HEAL" ? " (en combat)" : ""}</span><span>×{player.items[it.id]}</span>
                                                        </span>
                                                    </button>
                                                ))}
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
                                    {/* 🎒 Poche Objets clés (MISC : Pierre Gékroc, Daemonflûte…) — lecture seule.
                                        La Pierre Gékroc s'utilise depuis la fiche d'un Panthéon. */}
                                    {(() => {
                                        const keys = Object.values(ITEMS).filter((it) => it.category === "MISC" && (player.items[it.id] ?? 0) > 0)
                                        return keys.length > 0 && (
                                            <div>
                                                <div style={pocketHdrStyle}>🎒 Objets clés</div>
                                                {keys.map((it) => (
                                                    <button key={it.id} style={{ ...menuBtnDimStyle, display: "block", textAlign: "left", height: "auto" }} disabled>
                                                        <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                            <span>{it.name}</span><span>×{player.items[it.id]}</span>
                                                        </span>
                                                        {it.description && <span style={{ display: "block", fontSize: 10, opacity: 0.65, marginTop: 3, whiteSpace: "normal", lineHeight: 1.3 }}>{it.description}</span>}
                                                    </button>
                                                ))}
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
                                {player.team.map((m) => {
                                    const sp = getSpecies(m.speciesId)
                                    const max = sp ? fullStats(m, sp).hp : m.currentHp
                                    const ko = m.currentHp <= 0
                                    const full = m.currentHp >= max
                                    const dis = ko || full
                                    return (
                                        <button
                                            key={m.uid}
                                            style={dis ? menuBtnDimStyle : menuBtnStyle}
                                            disabled={dis}
                                            onClick={() => {
                                                if (healTeamMember(m.uid, bagItem)) {
                                                    setToast(`${displayName(m)} récupère des PV !`)
                                                    persistYellowSave()
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
                                })}
                                <button style={menuBtnDimStyle} onClick={() => setBagItem(null)}>← RETOUR</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Réputation PvP (matchs + Daemon fétiche + attaque favorite) — viewer sûr, dispo en combat */}
            {menu === "reput" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("pause")}>
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
                        <button style={menuBtnDimStyle} onClick={() => setMenu("pause")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* Boutique (vendeur) */}
            {!battle && menu === "moves" && <MovesPanel close={() => setMenu("pause")} />}
            {menu === "hof" && <HallOfFameViewer close={() => setMenu("pause")} />}

            {/* ZONE DE COMBAT — entrée Tour (placeholder, non-bloquant : marche pour sortir) */}
            {!battle && !run && mapPlayer.mapId === "yellow_combat_tour" && !dialogue && player.team.length > 0 && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22ee", color: "#fff", border: "2px solid #e8893a", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 300 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>🏯 TOUR DE COMBAT</div>
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
            {/* ZONE DE COMBAT — USINE : draft de location (placeholder) dans l'intérieur de l'Usine */}
            {!battle && !run && mapPlayer.mapId === "yellow_combat_usine" && !dialogue && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22ee", color: "#fff", border: "2px solid #6aa0ec", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 340 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>🏭 USINE DE COMBAT</div>
                    {!usineDraft ? (
                        <>
                            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8 }}>Choisis ton mode — tu joueras une équipe de LOCATION :</div>
                            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                                {(["L50", "L100", "ADAPT"] as LevelRule[]).map((rule) => (
                                    <button key={rule} onClick={() => {
                                        const lvl = resolveFrontierLevel(rule, myArenaLevel || 50)
                                        const pool = generateRentalPool(new Rng(Math.floor(Math.random() * 1e9)), { streak: 1, level: lvl })
                                        setUsineDraft({ levelRule: rule, pool, picks: [] })
                                    }} style={{ background: "#6aa0ec", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                                        {rule === "L50" ? "Niv 50" : rule === "L100" ? "Niv 100" : "Adaptatif"}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 6 }}>Choisis 3 Daemons ({usineDraft.picks.length}/3) :</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center" }}>
                                {usineDraft.pool.map((c) => {
                                    const picked = usineDraft.picks.includes(c.speciesId)
                                    return (
                                        <button key={c.speciesId} onClick={() => setUsineDraft((d) => {
                                            if (!d) return d
                                            const picks = picked ? d.picks.filter((p) => p !== c.speciesId) : (d.picks.length < 3 ? [...d.picks, c.speciesId] : d.picks)
                                            return { ...d, picks }
                                        })} style={{ background: picked ? "#6aa0ec" : "#333", color: picked ? "#1a1a22" : "#fff", border: "none", borderRadius: 7, padding: "4px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                            {getSpecies(c.speciesId)?.name ?? c.speciesId} <span style={{ opacity: 0.7 }}>N{c.level}</span>
                                        </button>
                                    )
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
                    )}
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>(marche pour sortir)</div>
                </div>
            )}
            {/* ZONE DE COMBAT — DÔME : tournoi à élimination (bracket de 8), TON équipe, 3 manches */}
            {!battle && !dome && mapPlayer.mapId === "yellow_combat_dome" && !dialogue && player.team.length > 0 && (
                <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 60, background: "#1a1a22ee", color: "#fff", border: "2px solid #f1c40f", borderRadius: 12, padding: "10px 14px", textAlign: "center", maxWidth: 320 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>🏆 DÔME DE COMBAT</div>
                    <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 8 }}>Tournoi à élimination (8 dresseurs) — 3 manches d&apos;affilée avec TON équipe. Pas de soin entre les manches !</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                        {(["L50", "L100", "ADAPT"] as LevelRule[]).map((rule) => (
                            <button key={rule} onClick={() => {
                                const lvl = resolveFrontierLevel(rule, myArenaLevel || 50)
                                const seed = Math.floor(Math.random() * 1e9)
                                const playerTeam = getPlayer().team.map((m) => ({ speciesId: m.speciesId, level: lvl }))
                                setDome({ state: createDome(new Rng(seed), { level: lvl, streak: 14, playerTeam }), rule, seed, jc: 0 })
                                setDomePause(true) // montre le bracket + le 1er adversaire avant de lancer
                            }} style={{ background: "#f1c40f", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
                                {rule === "L50" ? "Niv 50" : rule === "L100" ? "Niv 100" : "Adaptatif"}
                            </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6 }}>(marche pour sortir)</div>
                </div>
            )}
            {/* ZONE DE COMBAT — HUD de série pendant le run */}
            {run && run.status === "active" && (
                <div style={{ position: "absolute", left: 8, top: 8, zIndex: 60, background: "#1a1a22cc", color: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontWeight: 700 }}>
                    🏯 Série {run.streak + 1} · {run.jc} JC{run.isBoss ? " · 👑 BOSS" : ""}
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
                    🏆 Dôme · {(["Quart", "Demi", "Finale"][dome.state.round]) ?? `Manche ${dome.state.round + 1}`} ({dome.state.round + 1}/{DOME_ROUNDS}) · {dome.jc} JC
                </div>
            )}
            {/* ÉCRAN D'INTRO avant chaque match du Dôme : bracket du round + adversaire annoncé + bouton Affronter */}
            {dome && dome.state.status === "active" && domePause && !battle && !frontierResult && evolutions.length === 0 && !dialogue && (() => {
                const opp = playerOpponent(dome.state)
                return (
                    <div style={{ position: "absolute", left: "50%", top: 16, transform: "translateX(-50%)", zIndex: 62, background: "#1a1a22f2", color: "#fff", border: "2px solid #f1c40f", borderRadius: 12, padding: "12px 14px", textAlign: "center", width: "min(340px, 94vw)" }}>
                        <DomeBracket state={dome.state} />
                        <div style={{ fontSize: 12, margin: "2px 0 8px" }}>{opp ? <>Ton adversaire : <b style={{ color: "#f1c40f" }}>{opp.name}</b></> : "En attente…"}</div>
                        <button onClick={() => setDomePause(false)} style={{ background: "#f1c40f", color: "#1a1a22", fontWeight: 800, border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer" }}>⚔️ Affronter</button>
                    </div>
                )
            })()}
            <GuidePanel />
            <LibraryPanel />
            <AdvisorPanel />
            <LabPanel />
            {combatShopOpen && <CombatShopModal onClose={closeCombatShop} />}
            {ticketOpen && <DailyTicketModal mode="daily" today={getPlayer().creditedThrough} onClose={() => { persistYellowSave(); setTicketOpen(false) }} />}
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
                        <button style={menuBtnStyle} onClick={() => { challenge.sendChallenge(interactTarget.userId, interactTarget.nickname); setInteractTarget(null) }}>⚔️ Défier en combat</button>
                        <button style={menuBtnStyle} onClick={() => { setTradePickFor(interactTarget); setInteractTarget(null) }}>🔄 Proposer un échange</button>
                        <button style={menuBtnStyle} onClick={() => { setCtTradePickFor(interactTarget); setInteractTarget(null) }}>🎴 Échanger une CT</button>
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
                        {(() => {
                            const groups: [string, string][] = [["BALL", "🔴 Balls"], ["HEAL", "❤️ Soins"], ["STATUS_HEAL", "💊 Statuts"], ["BOOST", "⬆️ Boosts (combat)"]]
                            const sellable = Object.values(ITEMS).filter((it) => it.price > 0)
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
                                            const afford = player.reps >= it.price
                                            return (
                                                <button
                                                    key={it.id}
                                                    style={afford ? menuBtnStyle : menuBtnDimStyle}
                                                    disabled={!afford}
                                                    onClick={() => { setBuyConfirm({ id: it.id, name: it.name, price: it.price }); setBuyQty(1) }}
                                                >
                                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                        <span>{it.name}{owned > 0 ? ` (×${owned})` : ""}</span>
                                                        <span>{it.price} reps</span>
                                                    </span>
                                                    <span style={{ display: "block", fontSize: 10, opacity: 0.6, fontWeight: 400 }}>{it.description}</span>
                                                </button>
                                            )
                                        })}
                                        {cat === "BALL" && !inSecondTown && <div style={{ fontSize: 10, opacity: 0.6, padding: "3px 2px" }}>✨ Des Balls plus puissantes se vendent à Cendreville…</div>}
                                    </div>
                                )
                            })
                        })()}
                        {/* Super Pasta : +1 niveau, prix dynamique (monte à chaque achat du jour). */}
                        {(() => {
                            const price = superPastaPrice()
                            const afford = player.reps >= price && player.team.length > 0
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
                        {/* Accès aux Capsules Techniques (CT) */}
                        <button style={menuBtnStyle} onClick={() => { setCtShop(true); setCtPick(null) }}>
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
                                onClick={() => { if (spendReps(total)) addItem(buyConfirm.id, buyQty); setBuyConfirm(null) }}
                            >✅ Acheter</button>
                            <button style={menuBtnDimStyle} onClick={() => setBuyConfirm(null)}>← Annuler</button>
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
            {challenge.incoming && !battle && (
                <div style={menuOverlayStyle}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>⚔️ DÉFI</div>
                        <div style={{ fontSize: 13, fontWeight: 700, textAlign: "center", margin: "4px 0 10px" }}>
                            {challenge.incoming.fromNickname} te défie en combat !
                        </div>
                        <button style={menuBtnStyle} onClick={() => challenge.respond(true)}>✓ Combattre</button>
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
                            onTouchStart={(e) => { ficheTouchX.current = e.touches[0]?.clientX ?? null }}
                            onTouchEnd={(e) => {
                                const sx = ficheTouchX.current; ficheTouchX.current = null
                                if (sx == null) return
                                const dx = (e.changedTouches[0]?.clientX ?? sx) - sx
                                if (Math.abs(dx) > 45) slide(dx < 0 ? 1 : -1) // swipe gauche = suivant
                            }}
                        >
                            <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                                <span style={{ flex: 1, textAlign: "left" }}>{displayName(live).toUpperCase()} · N.{live.level}</span>
                                <button style={slideBtnStyle} disabled={ficheList.length < 2} onClick={() => slide(-1)}>◀</button>
                                <button style={slideBtnStyle} disabled={ficheList.length < 2} onClick={() => slide(1)}>▶</button>
                            </div>
                            {sp?.sprite && <img src={sp.sprite} alt={sp.name} style={ficheSpriteStyle} />}
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
                                const EVK: Array<[string, string]> = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        <button onClick={() => setEvDetailOpen((o) => !o)}
                                            style={{ background: "transparent", border: "none", padding: 0, font: "inherit", color: "inherit", cursor: "pointer", textAlign: "left" }}>
                                            Entraînement (EV) : <b>{total}/{EV_TOTAL_CAP}</b>{total >= EV_TOTAL_CAP ? " 🔒" : ""} <span style={{ opacity: 0.6 }}>{evDetailOpen ? "▾" : "▸"}</span>
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
                                                    +{EV_YIELD_PER_WIN} EV par victoire, dans la stat-forte du Daemon vaincu. La contribution « +X » s'ajoute dans le calcul de la stat (montée avec le niveau). Plafond {EV_STAT_CAP}/stat, {EV_TOTAL_CAP} au total.
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
                                        <span style={{ opacity: 0.7, flexShrink: 0 }}>💪 {attackCost(m ?? null, live.level, effectiveQuota(player.wildCtx?.quota))}</span>
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
                                    ) : (
                                        <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => {
                                            const r = withdrawFromPc(live.uid)
                                            if (r.ok) { setToast(`${displayName(live)} rejoint l'équipe.`); persistYellowSave(); closeFiche() }
                                            else if (r.reason === "full") setToast("Équipe pleine (6 max).")
                                        }}>➡️ Équipe</button>
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
                        duelOppRef.current = { userId: arenaFight.opp.userId, nickname: arenaFight.opp.nickname }
                        startTrainerBattle(getPlayer().team, arenaFight.enemy, Math.floor(Math.random() * 1e9), { trainerId: "duel:" + arenaFight.opp.userId, reward: 0, aiLevel: "trainer" })
                        setArenaFight(null)
                    }}
                    onCancel={() => setArenaFight(null)}
                />
            )}

            {!battle && evolutions.length === 0 && championRun && (
                <HallOfFame champion={championRun} onDone={() => {
                    clearChampion()
                    // Le générique DEVIENT la transition : on ressort directement à Cendreville (au-dessus du
                    // gate sud, comme la porte droite de la salle du trône) au lieu de rester dans le trône vide.
                    setMap("yellow_cendreville", 21, 32)
                    // QUÊTE DE LA FLÛTE (déblocage Zone de Combat) : le Maître annonce la récompense du Dieu Spaghetti.
                    showDialogue("y_ligue_maitre", "LE MAÎTRE", [
                        "« Félicitations, nouveau Maître ! Tu mérites une récompense à la hauteur de ton exploit. »",
                        "« Le Dieu Spaghetti t'a laissé une Daemonflûte… mais ce distrait l'a oubliée à l'ÉTAGE du Centre Pokémon ! »",
                        "« Récupère-la là-haut, puis va réveiller le colosse endormi au SUD de la ville. La ZONE DE COMBAT t'attend, Maître. »",
                    ])
                }} />
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

