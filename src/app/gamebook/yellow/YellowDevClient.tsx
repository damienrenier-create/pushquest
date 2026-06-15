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
import BattleControls, { BATTLE_CONTROLS_HEIGHT } from "./battle/BattleControls"
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
import DexEntryScreen from "./battle/DexEntryScreen"
import IntroCinematic from "./IntroCinematic"
import GuidePanel from "./GuidePanel"
import LibraryPanel from "./LibraryPanel"
import MovesPanel from "./MovesPanel"
import AdvisorPanel from "./AdvisorPanel"
import LabPanel from "./LabPanel"
import ParkSignPanel from "./ParkSignPanel"
import PosterPanel from "./PosterPanel"
import { useGameStore, setCurrentNickname } from "@/lib/gamebook/yellow/store/gameStore"
import { YELLOW_MAPS, CENDREVILLE_SPAWN } from "@/lib/gamebook/yellow/maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { useBattle, useEvolutions, clearEvolutions, useWhiteout, clearWhiteout, useSbireWin, clearSbireWin, useAceWin, clearAceWin, useBadgeAwarded, clearBadgeAwarded, useRematchReward, clearRematchReward, useNewDexEntry, clearNewDexEntry, dispatchBattleInput, endBattle, getSbireRewardMsg, getAceRewardMsg, getGiftCtMove } from "@/lib/gamebook/yellow/store/battleStore"
import { sbireExplanation } from "@/lib/gamebook/yellow/data/sbire"
import { loadYellowSave, initAutosave, persistYellowSave, processSaiyanPoints, resetYellowChapter } from "@/lib/gamebook/yellow/store/saveManager"
import { getPlayer, setTeam, usePlayer, addItem, spendReps, grantReps, consumeItem, setCurrentPlayerId, setCurrentMapId, executeTrade, tradeCt, applyTradeEvolution, markIntroSeen, superPastaPrice, buySuperPasta, depositToPc, withdrawFromPc, renameDaemon, healTeamMember, allocateStatPoint, teachCt, swapTeam, favoriteDaemon, favoriteMove, resolveLearn, consumeGiftMessage, reorderMove } from "@/lib/gamebook/yellow/store/playerStore"
import { purchasableCts, getCt, canLearnCt } from "@/lib/gamebook/yellow/data/cts"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ITEMS, getItem } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import { moveCostReps } from "@/lib/gamebook/yellow/data/combatCostConfig"
import { SAIYAN_POINT_VALUE } from "@/lib/gamebook/yellow/data/saiyanConfig"
import { ivTier, ivTotal, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, topEvStats, EV_TOTAL_CAP } from "@/lib/gamebook/yellow/data/evConfig"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

export default function YellowDevClient({ userId = "", isCreator = false, nickname = "" }: { userId?: string; isCreator?: boolean; nickname?: string }) {
    const move = useGameStore((s) => s.move)
    const mapPlayer = useGameStore((s) => s.player)
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)
    const hydrate = useGameStore((s) => s.hydrate)
    const hydrated = useGameStore((s) => s.hydrated)
    const shopOpen = useGameStore((s) => s.shopOpen)
    const closeShop = useGameStore((s) => s.closeShop)
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
    const signOpen = useGameStore((s) => s.signOpen)
    const closeSign = useGameStore((s) => s.closeSign)
    const posterImage = useGameStore((s) => s.posterImage)
    const closePoster = useGameStore((s) => s.closePoster)
    const dialogue = useGameStore((s) => s.dialogue)
    const setMap = useGameStore((s) => s.setMap)
    const showDialogue = useGameStore((s) => s.showDialogue)
    const battle = useBattle()
    const evolutions = useEvolutions()
    const newDexEntry = useNewDexEntry()
    const whiteout = useWhiteout()
    const sbireWin = useSbireWin()
    const aceWin = useAceWin()
    const badgeAwarded = useBadgeAwarded()
    const rematchReward = useRematchReward()
    const router = useRouter()
    const player = usePlayer()
    const [menu, setMenu] = useState<"none" | "pause" | "team" | "pc" | "bag" | "reput" | "moves">("none")
    const ficheTouchX = useRef<number | null>(null) // swipe gauche/droite dans la fiche Daemon
    const [selected, setSelected] = useState<MonInstance | null>(null)
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
            if (newDexEntry || evolutions.length > 0) { e.preventDefault(); return }
            const inB = !!battle
            const k = e.key.toLowerCase()
            if (e.key === "ArrowUp" || k === "z") { e.preventDefault(); inB ? dispatchBattleInput("up") : move("up") }
            else if (e.key === "ArrowDown" || k === "s") { e.preventDefault(); inB ? dispatchBattleInput("down") : move("down") }
            else if (e.key === "ArrowLeft" || k === "q") { e.preventDefault(); inB ? dispatchBattleInput("left") : move("left") }
            else if (e.key === "ArrowRight" || k === "d") { e.preventDefault(); inB ? dispatchBattleInput("right") : move("right") }
            else if (e.key === " " || e.key === "Enter" || k === "a") {
                e.preventDefault(); inB ? dispatchBattleInput("a") : pressA()
            }
            else if (e.key === "Escape" || k === "b" || k === "f") {
                // Hors combat : ferme d'abord l'overlay le plus haut (goBack), sinon dialogue (pressB).
                e.preventDefault(); inB ? dispatchBattleInput("b") : (goBackRef.current() || pressB())
            }
            else if (e.key === "Tab") {
                // Start/Select = ouvre/ferme le menu pause (hors combat uniquement).
                e.preventDefault(); if (!inB) setMenu((m) => (m === "none" ? "pause" : "none"))
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [move, pressA, pressB, battle, newDexEntry, evolutions])

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

    // Équipe entièrement K.O. → renvoi immédiat au Centre Daemon (déjà soignée par
    // le store de combat). On warp dès que le combat est quitté.
    useEffect(() => {
        if (whiteout && !battle) {
            setMap("yellow_infirmary", 4, 3)
            persistYellowSave()
            clearWhiteout()
        }
    }, [whiteout, battle, setMap])

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
            const lines = ["*ACE s'incline, un sourire en coin.*", "Pas mal. Mais demain je reviens plus fort…", ...(reward ? [reward] : [])]
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
            if (giftMove) lines.push(`🎁 Le Doyen te remet la CT « ${giftMove} » ! Apprends-la à un Daemon Plante — c'est un cadeau unique.`)
            showDialogue("y_gym_sign", "ARÈNE", lines)
            clearBadgeAwarded()
        }
    }, [badgeAwarded, battle, evolutions.length, showDialogue])

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
        if (renaming) { setRenaming(false); return true } // annule le renommage, reste sur la fiche
        if (selected) { setSelected(null); setRenaming(false); return true } // fermer la fiche reset aussi le renommage
        // Sous-modals de la BOUTIQUE (rendus au-dessus d'elle) → se ferment avant la boutique.
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
        if (menu === "pc" || pcOpen) { closePc(); setMenu(menu === "pc" ? "pause" : "none"); return true }
        if (menu === "team" || menu === "bag" || menu === "reput" || menu === "moves") { setMenu("pause"); return true }
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

            {/* En COMBAT : plein écran, SANS la coque Game Boy. La coque enfermait
                le combat dans l'écran 3:2 et coupait les menus (cf. retour Sartay).
                Le BattleScreen est entièrement jouable au doigt (boutons d'options
                tactiles) + clavier (dispatchBattleInput), donc pas besoin du D-pad. */}
            {battle ? (
                <div style={battleWrapStyle}>
                    {/* Error boundary : si le combat plante, on propose "Reprendre"
                        (endBattle) au lieu d'obliger un hard refresh. */}
                    <BattleBoundary onReset={() => endBattle()}>
                        <BattleScreen />
                    </BattleBoundary>
                    {/* Boutons (D-pad + A/B) en footer FIXE : ne bougent jamais. */}
                    <BattleControls />
                </div>
            ) : (
                <GameBoyShell
                    reps={player.reps}
                    repsCap={player.repsCap}
                    onUp={() => move("up")}
                    onDown={() => move("down")}
                    onLeft={() => move("left")}
                    onRight={() => move("right")}
                    onA={() => {
                        // Dans le casino, A face à un autre joueur = le défier.
                        if (inCasino) {
                            const target = facingRemote()
                            if (target) { menuTapGuard.current = Date.now(); setInteractTarget({ userId: target.userId, nickname: target.nickname }); return }
                        }
                        pressA()
                    }}
                    onB={() => { if (!goBack()) pressB() }}
                    onStart={() => { menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
                    onSelect={() => { menuTapGuard.current = Date.now(); setMenu((m) => (m === "none" ? "pause" : "none")) }}
                >
                    <MapView remotePlayers={remotePlayers} chatBubbles={chat.bubbles} myUserId={userId} />
                </GameBoyShell>
            )}

            {/* Menu START (pause) */}
            {!battle && menu === "pause" && (
                <div style={menuOverlayStyle} onClick={() => { if (Date.now() - menuTapGuard.current < 350) return; setMenu("none") }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>MENU</div>
                        <button style={menuBtnStyle} onClick={() => setMenu("team")}>🐾 ÉQUIPE</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("pc")}>📦 PC (BOÎTES)</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("bag")}>🎒 SAC</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/pokedex")}>📷 POKÉDEX</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/dex")}>📖 DEX (CATALOGUE)</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("moves")}>⚔️ ATTAQUES</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("reput")}>🏆 RÉPUTATION</button>
                        {confirmReset ? (
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
                                            await resetYellowChapter() // copie la save dans history AVANT d'effacer
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
                        )}
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
                Ouvert via le menu START (menu="pc") OU l'ordinateur du Centre (pcOpen). */}
            {!battle && (menu === "pc" || pcOpen) && (() => {
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
                const closePcUi = () => { closePc(); setMenu(menu === "pc" ? "pause" : "none") }
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
                                    {player.ownedCts.length === 0 && Object.values(ITEMS).filter((it) => (player.items[it.id] ?? 0) > 0).length === 0 && (
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

            {/* Réputation PvP (matchs + Daemon fétiche + attaque favorite) */}
            {!battle && menu === "reput" && (
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
            <GuidePanel />
            <LibraryPanel />
            <AdvisorPanel />
            <LabPanel />
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
                            return groups.map(([cat, label]) => {
                                const list = sellable.filter((it) => it.category === cat)
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
                                <div style={{ maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                    {(() => {
                                        const purch = purchasableCts(player.badges)
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
                const toNext = expForLevel(live.level + 1) - Math.max(live.exp, expForLevel(live.level))
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
                                XP cumulée : {Math.max(live.exp, expForLevel(live.level)).toLocaleString("fr-FR")} · niveau suivant dans ~{Math.max(0, toNext).toLocaleString("fr-FR")} XP
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
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        Expérience de combat : <b>{total}/{EV_TOTAL_CAP}</b>
                                        <span style={{ opacity: 0.45 }}> (petit bonus passif gagné en combattant)</span>
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
                                        <span style={{ opacity: 0.7, flexShrink: 0 }}>💪 {moveCostReps(m?.power ?? 0, live.level)}</span>
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

                            <button style={{ ...menuBtnDimStyle, marginTop: 8 }} onClick={closeFiche}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* Cinématique d'évolution (post-combat, après QUITTER) */}
            {!battle && evolutions.length > 0 && (
                <EvolutionScreen evolutions={evolutions} onDone={clearEvolutions} />
            )}

            {/* Popup PREMIÈRE capture d'une espèce (après l'éventuelle évolution, jamais en
                même temps : on attend que la file d'évolutions soit vidée). */}
            {!battle && evolutions.length === 0 && newDexEntry && (
                <DexEntryScreen entry={newDexEntry} onDone={clearNewDexEntry} />
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

// Combat plein écran (hors coque) : centré, scrollable si le contenu dépasse.
// paddingBottom réserve la place du footer de contrôles FIXE (sinon il masque
// les dernières options).
const battleWrapStyle: React.CSSProperties = {
    width: "100%", maxWidth: 480, margin: "0 auto",
    padding: "14px 12px", boxSizing: "border-box",
    maxHeight: "100dvh", overflowY: "auto",
    paddingBottom: `calc(${BATTLE_CONTROLS_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 16px)`,
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

