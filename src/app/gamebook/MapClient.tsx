"use client"

// src/app/gamebook/MapClient.tsx
//
// Composant React principal de la carte v3. Branché sur les vraies APIs :
//   - /api/gamebook/state : lecture/écriture position + reps du jour
//   - /api/gamebook/players : autres joueurs figés + classement reps du jour
//
// Mécaniques :
//   - Avant intro Monstre : mode "explore", pas de coût de mouvement
//   - Après intro : mode "playing", 1 rep par case
//   - Pousser un joueur : coûte 30 reps, le pousse d'une case (si possible)
//   - Bouton A : interagir avec ce qui est devant (porte, panneau, joueur, machine...)

import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { ArrowLeft, RotateCcw } from "lucide-react"
import {
    MAPS,
    OUTDOOR_BUILDINGS_BASE,
    OUTDOOR_SIGNS,
    getMap,
    BRIDGE_PNJS,
    ROUTE1_SPAWN_FROM_SOUTH,
    PEPITEVILLE_BUILDINGS,
    PEPITEVILLE_SIGNS,
    PEPITEVILLE_SPAWN_FROM_SOUTH,
    ROUTE1_NORTH_GATE,
    PEPITEVILLE_APPLE_TREES,
    HAUTESPATES_BUILDINGS,
    HAUTESPATES_SIGNS,
    HAUTESPATES_SPAWN_FROM_SOUTH,
    PEPITEVILLE_SPAWN_FROM_NORTH,
    TOWER_STAIRS_SQUATS_THRESHOLD,
    MACARONILE_BUILDINGS,
    MACARONILE_SIGNS,
    MUSCUVILLE_BUILDINGS,
    MUSCUVILLE_SIGNS,
    GRASS_SUD_SPAWN_FROM_NORTH,
    MACARONILE_SPAWN_FROM_GRASS_SUD,
    MUSCUVILLE_SPAWN_FROM_NORTH,
    GRASS_SUD_SPAWN_FROM_SOUTH,
    LAMER_SPAWN_FROM_BOURG,
    BOURG_SPAWN_FROM_LAMER,
    MACARONILE_SPAWN_FROM_LAMER,
    LAMER_SPAWN_FROM_MACARONILE,
    PAPA_TABLEAUX,
    BIBLIOTHEQUE_TOPICS,
    INDOOR_MAP_IDS,
} from "@/lib/gamebook/maps"
import {
    type Direction,
    type PlayerMapState,
    type PlayerSnapshot,
    type Building,
    buildingAt,
    doorAt,
    tryComputeMove,
    frontTile,
    computePushTarget,
    bridgePnjSeeingPlayer,
    COST_PUSH,
    COST_TREE_OBSTACLE,
} from "@/lib/gamebook/mapEngine"
import {
    MONSTER_INTRO_DIALOGUE,
    INTRO_STEP_TELEPORT_TO_CAVE,
    INTRO_LAST_STEP,
    MONSTER_PIONEER_DIALOGUE,
    PIONEER_LAST_STEP,
} from "@/lib/gamebook/dialogue"
import {
    type NpcDefinition,
    getNpcsForMap,
    getNpcCurrentPosition,
    getNpcDialogue,
    WANDER_TICK_MS,
} from "@/lib/gamebook/npcs"
import TileCell from "./TileCell"
import PlayerSprite from "./PlayerSprite"
import { getPusherClient, PUSHER_CLIENT_ENABLED } from "@/lib/pusher-client"
import StartMenu from "./StartMenu"
import InventoryModal from "./InventoryModal"
import ShopModal from "./ShopModal"
import PlayerMapModal from "./PlayerMapModal"
import PiaffiniFlightScreen from "./PiaffiniFlightScreen"
import { PIAFFINI_RESCUE_DIALOGUE } from "@/lib/gamebook/dialogue"
import { parseInventory, hasIntactItem, type InventoryEntry } from "@/lib/gamebook/inventory"
import { findActiveWearableForTile, applySocialDiscount, hasIntactLunettes } from "@/lib/gamebook/items"
import { PEPITO_DIALOGUE_FIRST } from "@/lib/gamebook/dialogue"
import TamagotchiModal from "./TamagotchiModal"
import type { TamagotchiView } from "@/lib/gamebook/tamagotchi"
import BibliothequeModal from "./BibliothequeModal"
import BestioleNamingModal from "./BestioleNamingModal"
import CasinoModal from "./CasinoModal"
import FastTravelModal from "./FastTravelModal"
import { getLevelDetails } from "@/lib/xp"
import { getActiveBicycle } from "@/lib/gamebook/items"

interface Props {
    nickname: string
    userId: string
    initialState: PlayerMapState
    initialTodayReps: number
    initialAvailableEnergy: number
    initialEnergySpent: number
    // v3.8
    initialInventory: InventoryEntry[]
    initialHasBag: boolean
    // v3.8.1 — { treeId → fruits déjà cueillis aujourd'hui par CE user }
    initialFruitCounts: Record<string, number>
    // v3.8.2 — plus haut étage atteint dans la Tour
    initialTowerFloorReached: number
    // v3.10 — ratio de difficulté (1.0 vétéran, < 1.0 onboarding)
    initialDifficultyRatio: number
    // v3.14 — Tamagotchi (vue avec happiness + level recalculés, null si pas adopté)
    initialTamagotchi: TamagotchiView | null
}

const GHOST_COLORS = ["#4080d8", "#d840a0", "#48a830", "#f08020", "#9050d0", "#d8c020", "#20a8c8"]

// v3.19b — Maps où le compagnon tamagotchi est visible (outdoor uniquement)
const OUTDOOR_MAP_IDS = new Set([
    "bourgpates", "route1", "pepiteville", "hautespates",
    "macaron_ile", "grass_sud", "muscuville", "la_mer",
    "mont_pasta_ventoux",
])

// v3.23b — Mont Pasta-Ventoux : calcul BPM via fenêtre glissante de 6 secondes.
function computeCadenceBPM(clicks: number[]): number {
    const now = Date.now()
    const windowMs = 6000
    const recent = clicks.filter((t) => now - t < windowMs)
    return Math.round((recent.length / 6) * 60)
}

// v3.23b — Multiplicateur de coût selon cadence (BPM réel)
//   <30 : 3.0× (épuisement) | 30-59 : 1.5× | 60-80 : 0.5× (idéal) | 81-99 : 1.5× | ≥100 : 3.0×
function cadenceCostMultiplier(bpm: number): number {
    if (bpm < 30) return 3.0
    if (bpm < 60) return 1.5
    if (bpm <= 80) return 0.5
    if (bpm < 100) return 1.5
    return 3.0
}

function colorForUser(id: string): string {
    let hash = 0
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
    return GHOST_COLORS[Math.abs(hash) % GHOST_COLORS.length]
}

type Popup =
    | { kind: "sign"; text: string }
    | { kind: "info"; text: string }
    | { kind: "exercise"; text: string }
    | { kind: "ghost"; text: string }
    | { kind: "pnjChallenge"; pnjId: string; pnjName: string; text: string }
    | null

type Cinematic =
    | { kind: "pioneer"; step: number }
    | { kind: "npcDialogue"; npcId: string; npcName: string; step: number; lines: string[]; energyReward?: number }
    // v3.8 — Cinématique PEPITO offre le sac
    | { kind: "pepitoBag"; step: number }
    // v3.11 — Cinématique PIAFFINI : dialogue puis vol vers Bourg-Boulette
    | { kind: "piaffini"; stage: "dialog"; step: number }
    | { kind: "piaffini"; stage: "flight" }
    // v3.17d — Cinématique cassure des Lunettes (trip → fall → broken, 3 steps)
    | { kind: "lunettesBreak"; step: number }
    | null

// Ticker partagé entre tous les NPCs wanderers pour synchroniser leurs déplacements
function useWanderTicker() {
    const [tick, setTick] = useState<number>(() => Math.floor(Date.now() / WANDER_TICK_MS))
    useEffect(() => {
        const id = setInterval(() => {
            setTick(Math.floor(Date.now() / WANDER_TICK_MS))
        }, 1000)
        return () => clearInterval(id)
    }, [])
    return tick
}

export default function MapClient({
    nickname,
    userId,
    initialState,
    initialTodayReps,
    initialAvailableEnergy,
    initialEnergySpent,
    initialInventory,
    initialHasBag,
    initialFruitCounts,
    initialTowerFloorReached,
    initialDifficultyRatio,
    initialTamagotchi,
}: Props) {
    // ============================================================
    // STATE
    // ============================================================
    const [state, setState] = useState<PlayerMapState>(initialState)
    // === v3.4a : énergie disponible = reps du jour - déjà consommé (persisté) ===
    const [reps, setReps] = useState<number>(initialAvailableEnergy)
    const [totalRepsToday] = useState<number>(initialTodayReps)
    const [energySpent, setEnergySpent] = useState<number>(initialEnergySpent)
    const [otherPlayers, setOtherPlayers] = useState<PlayerSnapshot[]>([])
    const [popup, setPopup] = useState<Popup>(null)
    const [cinematic, setCinematic] = useState<Cinematic>(null)
    const [toast, setToast] = useState<string | null>(null)
    const [animStep, setAnimStep] = useState(0)
    const [errorMsg] = useState<string | null>(null)
    // === v3.8 : inventaire, sac, menu START ===
    const [inventory, setInventory] = useState<InventoryEntry[]>(initialInventory)
    const [hasBag, setHasBag] = useState<boolean>(initialHasBag)
    const [showStartMenu, setShowStartMenu] = useState(false)
    const [showInventory, setShowInventory] = useState(false)
    const [showShop, setShowShop] = useState(false)
    // v3.8.3 — Modal de consultation de la carte des joueurs (item map dans l'inventaire)
    const [showPlayerMap, setShowPlayerMap] = useState(false)
    // v3.14 — Modal du vétérinaire (V3T) : adoption / nourrissage du tamagotchi
    const [showTamagotchi, setShowTamagotchi] = useState(false)
    const [tamagotchi, setTamagotchi] = useState<TamagotchiView | null>(initialTamagotchi)
    // v3.18 — Modal de la bibliothèque (BIBLIO ou comptoir) : navigation hybride
    const [showBibliotheque, setShowBibliotheque] = useState(false)
    // v3.19b — Modal nommage des bestioles à la première rencontre
    const [showBestioleNaming, setShowBestioleNaming] = useState(false)
    // v3.21 — Modal mini-jeu casino roulette
    const [showCasino, setShowCasino] = useState(false)
    // v3.22 — Modal fast travel
    const [showFastTravel, setShowFastTravel] = useState(false)
    // v3.23b — Cadence sur le Mont Pasta-Ventoux : timestamps des derniers clics "pédale"
    const [cadenceClicks, setCadenceClicks] = useState<number[]>([])
    // Tick pour rafraîchir le BPM même si pas de nouveau click
    const [, setBpmTick] = useState(0)
    useEffect(() => {
        if (state.mapId !== "mont_pasta_ventoux") return
        const t = setInterval(() => setBpmTick((x) => x + 1), 500)
        return () => clearInterval(t)
    }, [state.mapId])
    // === v3.8.1 : fruits cueillis aujourd'hui (par CE user). Drive le rendu vide/plein des arbres. ===
    const [fruitCounts, setFruitCounts] = useState<Record<string, number>>(initialFruitCounts)
    // === v3.8.2 : plus haut étage atteint dans la Tour. Drive le bypass-check des escaliers. ===
    const [towerFloorReached, setTowerFloorReached] = useState<number>(initialTowerFloorReached)
    // === v3.10 : ratio de difficulté (multiplie tous les coûts du Gamebook, sauf rewards). ===
    const [difficultyRatio] = useState<number>(initialDifficultyRatio)

    // v3.10 — Helper pour appliquer le ratio (Math.round neutre + min 1).
    // Doit rester aligné avec applyRatio() dans src/lib/gamebook/difficulty.ts.
    const applyDifficultyRatio = (baseValue: number): number => {
        if (difficultyRatio >= 1) return baseValue
        return Math.max(1, Math.round(baseValue * difficultyRatio))
    }

    const moveLockRef = useRef(false)
    const aLockRef = useRef(false)
    const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const map = getMap(state.mapId)

    // v3.8 — Bâtiments dynamiques selon la map courante
    // - bourgpates : OUTDOOR_BUILDINGS_BASE (grotte du Monstre visible selon flag)
    // - pepiteville : PEPITEVILLE_BUILDINGS (toujours visibles)
    // - hautespates : HAUTESPATES_BUILDINGS (tour visible)
    // - ailleurs : aucun bâtiment (intérieurs)
    const buildings: Building[] =
        state.mapId === "bourgpates"
            ? OUTDOOR_BUILDINGS_BASE.map((b) =>
                b.kind === "monsterCave" ? { ...b, visible: state.monsterCaveRevealed } : b
            )
            : state.mapId === "pepiteville"
                ? PEPITEVILLE_BUILDINGS
                : state.mapId === "hautespates"
                    ? HAUTESPATES_BUILDINGS
                    : state.mapId === "macaron_ile"
                        ? MACARONILE_BUILDINGS
                        : state.mapId === "muscuville"
                            ? MUSCUVILLE_BUILDINGS
                            : []

    // v3.8 — Signs selon la map courante
    const signs =
        state.mapId === "bourgpates" ? OUTDOOR_SIGNS
            : state.mapId === "pepiteville" ? PEPITEVILLE_SIGNS
                : state.mapId === "hautespates" ? HAUTESPATES_SIGNS
                    : state.mapId === "macaron_ile" ? MACARONILE_SIGNS
                        : state.mapId === "muscuville" ? MUSCUVILLE_SIGNS
                            : []

    // ============================================================
    // LOAD AUTRES JOUEURS (polling fallback si Pusher off)
    // ============================================================
    const loadOtherPlayers = useCallback(async () => {
        try {
            const res = await fetch("/api/gamebook/players", { cache: "no-store" })
            if (!res.ok) return
            const json = await res.json()
            setOtherPlayers(json.players || [])
        } catch (e) {
            console.warn("[MapClient] loadOtherPlayers failed", e)
        }
    }, [])

    // ============================================================
    // v3.4b : WebSocket Pusher
    // ============================================================
    useEffect(() => {
        // Chargement initial des positions (toujours fait, peu importe Pusher)
        loadOtherPlayers()

        const pusherClient = getPusherClient()

        // Si Pusher n'est pas configuré côté client, fallback sur polling 30s
        if (!pusherClient || !PUSHER_CLIENT_ENABLED) {
            const t = setInterval(loadOtherPlayers, 30_000)
            return () => clearInterval(t)
        }

        // Pusher activé : on subscribe au canal de la map courante
        const channelName = `gamebook-${state.mapId}`
        const channel = pusherClient.subscribe(channelName)

        // Receveur des mouvements d'autres joueurs
        const onMove = (data: {
            userId: string
            nickname?: string
            posX?: number
            posY?: number
            direction?: string
            mapId?: string
        }) => {
            // Ignorer ses propres events (echo)
            if (data.userId === userId) return
            if (data.posX === undefined || data.posY === undefined) return
            setOtherPlayers((prev) => {
                const existing = prev.find((p) => p.id === data.userId)
                if (existing) {
                    return prev.map((p) =>
                        p.id === data.userId
                            ? { ...p, posX: data.posX!, posY: data.posY!, direction: (data.direction as PlayerSnapshot["direction"]) ?? p.direction }
                            : p
                    )
                }
                // Nouveau joueur jamais vu : on déclenche un refresh complet pour avoir son nickname/emoji
                loadOtherPlayers()
                return prev
            })
        }

        // Receveur des pushs (un pote pousse un autre)
        const onPush = (data: {
            userId: string
            nickname?: string
            targetUserId?: string
        }) => {
            if (data.userId === userId) return
            // Visualiser le push : on rafraîchit pour avoir les nouvelles positions
            loadOtherPlayers()
            if (data.nickname) {
                setToast(`${data.nickname} pousse quelqu'un.`)
            }
        }

        // Receveur des déclenchements de cinématiques (ex: pote bat CHAMPIO)
        const onCinematic = (data: {
            userId: string
            nickname?: string
            cinematicId?: string
        }) => {
            if (data.userId === userId) return
            const name = data.nickname ?? "Quelqu'un"
            if (data.cinematicId === "champio_defeated") {
                setToast(`🏆 ${name} a vaincu CHAMPIO !`)
            } else if (data.cinematicId === "tree_cleared") {
                setToast(`🌳 ${name} vient de franchir l'arbre.`)
            } else if (data.cinematicId === "pionnier_badge") {
                setToast(`🏅 ${name} a reçu le badge Pionnier !`)
            } else if (data.cinematicId) {
                setToast(`${name} déclenche un événement.`)
            }
        }

        channel.bind("player:move", onMove)
        channel.bind("player:push", onPush)
        channel.bind("cinematic:trigger", onCinematic)

        // Polling de sécurité moins fréquent en cas de désync (toutes les 60s)
        const safetyPoll = setInterval(loadOtherPlayers, 60_000)

        return () => {
            channel.unbind("player:move", onMove)
            channel.unbind("player:push", onPush)
            channel.unbind("cinematic:trigger", onCinematic)
            pusherClient.unsubscribe(channelName)
            clearInterval(safetyPoll)
        }
    }, [state.mapId, userId, loadOtherPlayers])

    // ============================================================
    // SAUVEGARDE DEBOUNCED
    // ============================================================
    const saveState = useCallback((s: PlayerMapState) => {
        if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
        saveDebounceRef.current = setTimeout(async () => {
            try {
                await fetch("/api/gamebook/state", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(s),
                })
            } catch (e) {
                console.warn("[MapClient] save failed", e)
            }
        }, 500)
    }, [])

    useEffect(() => {
        saveState(state)
    }, [state, saveState])

    // ============================================================
    // ANIMATION JAMBES
    // ============================================================
    useEffect(() => {
        const t = setInterval(() => setAnimStep((s) => (s + 1) % 2), 400)
        return () => clearInterval(t)
    }, [])

    // ============================================================
    // TOAST AUTO-CLEAR
    // ============================================================
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3500)
            return () => clearTimeout(t)
        }
    }, [toast])

    // ============================================================
    // BLOQUEURS POUR LE MOUVEMENT (autres joueurs sur la même map)
    // ============================================================
    const otherPlayersOnThisMap = otherPlayers.filter((p) => p.mapId === state.mapId)

    // ============================================================
    // NPCs sur la map courante (positions calculées en temps réel)
    // v3.16 — Les bestioles de grass_sud fuient si le tamagotchi du joueur est libéré (recovered)
    // v3.19b — Critère mis à jour : recovered (et non plus level >= 23)
    // ============================================================
    const wanderTick = useWanderTicker()
    const bestiolesFlee = tamagotchi?.recovered === true
    const npcsOnMap = getNpcsForMap(state.mapId).filter((npc) => {
        if (npc.id.startsWith("bestiole_") && bestiolesFlee) return false
        return true
    })
    const npcsWithPos = npcsOnMap.map((npc) => {
        const pos = getNpcCurrentPosition(npc, wanderTick * WANDER_TICK_MS, map)
        return { npc, x: pos.x, y: pos.y, direction: pos.direction }
    })

    // Les NPCs interceptors qui se déclenchent automatiquement quand le joueur arrive à côté
    // (les Bridge PNJs sont gérés séparément dans handleA, ceux-ci sont les NPCs de map courante)
    const npcBlockingPositions = npcsWithPos.map((n) => ({ x: n.x, y: n.y }))

    // Combine joueurs + NPCs pour le calcul de blocage
    const blockingPositions = [
        ...otherPlayersOnThisMap.map((p) => ({ x: p.posX, y: p.posY })),
        ...npcBlockingPositions,
    ]

    // ============================================================
    // DÉCLENCHER LE DIALOGUE D'UN NPC
    // ============================================================
    const triggerNpcDialogue = useCallback(
        (npc: NpcDefinition) => {
            // v3.11 — Flags conditionnels (JOJO/JOJETTE post-PIAFFINI)
            // v3.17 — Flag npcsTalkedTo pour basculer sur dialoguesAfterRevisit (5 PNJ tristes, RAVIOLI, LINGUINI...)
            const lines = getNpcDialogue(npc, state.phase, {
                piaffiniRescued: state.piaffiniRescued === true,
                npcsTalkedTo: state.npcsTalkedTo ?? [],
            })
            setCinematic({
                kind: "npcDialogue",
                npcId: npc.id,
                npcName: npc.name,
                step: 0,
                lines,
                energyReward: npc.energyReward,
            })
        },
        [state.phase, state.piaffiniRescued, state.npcsTalkedTo]
    )

    // ============================================================
    // v3.5 : DÉCLENCHER UN DÉFI DE PNJ DU PONT
    // ============================================================
    const triggerBridgePnjChallenge = useCallback(
        (bridgePnj: (typeof BRIDGE_PNJS)[number]) => {
            const challenge = bridgePnj.challenge
            let challengeText = ""
            if (challenge.kind === "exercise") {
                // v3.9 — texte générique (le seuil exact dépend du nombre de joueurs déjà
                // vaincus ; il sera communiqué via le message d'erreur en cas d'échec).
                const label =
                    challenge.exercise === "PUSHUP" ? "pompes"
                        : challenge.exercise === "SQUAT" ? "squats"
                            : challenge.exercise === "GAINAGE" ? "secondes de gainage"
                                : challenge.exercise === "PULLUP" ? "tractions"
                                    : "cardio"
                challengeText = `${bridgePnj.name} t'interpelle !\n\n"Fais ta séance de ${label} aujourd'hui et je te laisse passer pour de bon."\n\nAppuie sur A pour tenter le défi.`
            } else {
                // v3.9 — CHAMPIO accepte 3 chemins (top1 hier + badge, top3 hier, top1 aujourd'hui)
                challengeText = `${bridgePnj.name} te toise.\n\n"Pour passer, tu dois être :\n- le #1 cumulé d'HIER (+ badge Star)\n- ou top 3 d'HIER\n- ou le #1 cumulé d'AUJOURD'HUI"\n\nAppuie sur A pour tenter.`
            }
            setPopup({
                kind: "pnjChallenge",
                pnjId: bridgePnj.id,
                pnjName: bridgePnj.name,
                text: challengeText,
            })
        },
        []
    )

    // ============================================================
    // v3.19b — Bestioles : attack mechanic + naming
    // - 1re rencontre : ouvre le modal nommage (puis API encounter + popup "Aïe sans perte")
    // - Suivantes : appel direct API + popup "-10 reps"
    // ============================================================
    const triggerBestioleEncounter = useCallback(() => {
        const firstEncountered = (state as { bestiolesFirstEncountered?: boolean }).bestiolesFirstEncountered === true
        if (!firstEncountered) {
            setShowBestioleNaming(true)
            return
        }
        ; (async () => {
            try {
                const res = await fetch("/api/gamebook/bestiole/encounter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                })
                const data = await res.json()
                if (data.ok) {
                    if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                    if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                    setToast(data.message || "Les bestioles te mordent.")
                } else if (data.reason) {
                    setToast(data.reason)
                }
            } catch (e) {
                console.warn("[MapClient] bestiole/encounter failed", e)
            }
        })()
    }, [state])

    // ============================================================
    // v3.17c — NAGEUR (la_mer) : 3 niveaux de dialogue
    // 1er visit : lore "cherche un trésor"
    // 2e+ visit (avant défi réussi) : défi 50 pompes → +100 reps
    // 2e+ visit (après défi réussi) : ONE PIECE + indices casinos
    // ============================================================
    const triggerNageurDialog = useCallback(() => {
        const talked = state.npcsTalkedTo?.includes("lamer_nageur") === true
        const defiDone = (state as { nageurDefiCompleted?: boolean }).nageurDefiCompleted === true
        let lines: string[]
        if (!talked) {
            // 1er — lore
            lines = [
                "Salut salut ! Moi c'est NAGEUR.",
                "Je me balade dans le coin. Je cherche un trésor, quelque part par ici.",
                "Pas de détails. Si jamais tu trouves quelque chose qui brille, fais-moi signe.",
            ]
        } else if (!defiDone) {
            // 2e — défi 50 pompes
            lines = [
                "Tu reviens ! T'as l'air en forme.",
                "J'te propose un défi : si tu fais 50 pompes dans la journée, je te file mon économie : +100 reps.",
                "Reviens me parler quand t'as fait les 50. Je vérifie en direct.",
            ]
        } else {
            // 3e+ — ONE PIECE
            lines = [
                "Ahhh tu reviens encore ! Champion, vraiment.",
                "Tu sais, moi le vrai truc que je cherche... c'est le ONE PIECE.",
                "Les petits trésors planqués dans les casinos, c'est cool, mais le ONE PIECE c'est autre chose.",
                "*Il regarde l'horizon, rêveur.* Un jour. Un jour je le trouverai.",
            ]
        }
        setCinematic({
            kind: "npcDialogue",
            npcId: "lamer_nageur",
            npcName: "NAGEUR",
            step: 0,
            lines,
        })
    }, [state])

    // ============================================================
    // v3.4a : SPEND ENERGY (appel API serveur, source de vérité)
    // v3.8.1 : accepte un flag wearBoots pour décrémenter la durabilité des baskets côté serveur
    // v3.17 : wearItemKey remplace wearBoots — supporte boots / chaussures_course / brassards
    // v3.17d : wearItemKeys (array) — supporte usure de plusieurs items en un appel (chaussures + lunettes)
    // ============================================================
    const spendEnergy = useCallback(async (amount: number, reason: string, wearItemKeys: string[] = []): Promise<boolean> => {
        if (amount <= 0) return true
        try {
            const res = await fetch("/api/gamebook/spend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, reason, wearItemKeys }),
            })
            const data = await res.json()
            if (!data.ok) {
                // Resync depuis le serveur en cas de désaccord
                if (typeof data.availableEnergy === "number") {
                    setReps(data.availableEnergy)
                }
                setToast(data.reason || "Pas assez d'énergie.")
                return false
            }
            // Succès : on aligne le state local sur le serveur
            if (typeof data.availableEnergy === "number") {
                setReps(data.availableEnergy)
            }
            if (typeof data.energySpentToday === "number") {
                setEnergySpent(data.energySpentToday)
            }
            // v3.8.1 : resync inventory (usure baskets/chaussures/brassards)
            if (Array.isArray(data.inventory)) {
                setInventory(data.inventory)
            }
            // v3.17d — Gestion des items cassés (peut inclure plusieurs items à la fois)
            const brokenList: string[] = Array.isArray(data.brokenItemKeys) ? data.brokenItemKeys : []
            // Lunettes : cinématique dédiée trip→fall→broken
            if (brokenList.includes("lunettes")) {
                setCinematic({ kind: "lunettesBreak", step: 0 })
            }
            // Autres wearables : toast simple
            for (const brokenKey of brokenList) {
                if (brokenKey === "lunettes") continue  // déjà géré par cinématique
                const label = brokenKey === "chaussures_course" ? "Tes chaussures de course viennent de céder."
                    : brokenKey === "brassards" ? "Tes brassards de nage viennent de lâcher."
                        : brokenKey === "boots" ? "Tes baskets viennent de céder."
                            : "Un de tes équipements vient de céder."
                setToast(`${label} Faut en racheter.`)
            }
            return true
        } catch (e) {
            console.warn("[MapClient] spendEnergy failed", e)
            setToast("Erreur réseau, réessaie.")
            return false
        }
    }, [])

    // ============================================================
    // v3.4b : BROADCAST via Pusher (fire and forget, no-op si Pusher off)
    // ============================================================
    const broadcast = useCallback(async (payload: {
        type: "player:move" | "player:push" | "cinematic:trigger"
        mapId: string
        posX?: number
        posY?: number
        direction?: string
        targetUserId?: string
        cinematicId?: string
    }) => {
        try {
            await fetch("/api/gamebook/broadcast", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
        } catch {
            // silent : si le broadcast échoue, on continue (les autres verront au prochain poll)
        }
    }, [])

    // ============================================================
    // DÉPLACEMENT
    // ============================================================
    const tryMove = useCallback(
        (d: Direction) => {
            if (moveLockRef.current) return
            moveLockRef.current = true
            setTimeout(() => {
                moveLockRef.current = false
            }, 220)

            if (state.phase === "introMonster") return
            if (popup) {
                setPopup(null)
                return
            }
            // Si une cinématique est en cours (NPC ou Pionnier), on l'avance plutôt que de bouger
            if (cinematic) {
                pressA()
                return
            }

            // v3.23b — Mont Pasta-Ventoux : override movement logic
            // - up : avance 1 case (cost = bike.costPerCase × cadenceMult) + ajoute click au cadence tracker
            // - down : recule 1 case gratuit (descente volontaire, pas de click)
            // - left/right : bloqué (reste sur le chemin)
            if (state.mapId === "mont_pasta_ventoux") {
                if (d === "left" || d === "right") {
                    setState((s) => ({ ...s, direction: d }))
                    setToast("Reste sur le chemin du Mont.")
                    return
                }
                const activeBike = getActiveBicycle(inventory)
                if (!activeBike) {
                    setToast("Tu n'as pas de vélo. Comment es-tu arrivé ici ?")
                    return
                }
                const goingUp = d === "up"
                const newY = goingUp ? state.posY - 1 : state.posY + 1
                // Bounds : y=1 = sommet (cinematic v3.23c à venir), y=H-2 = entrée sud
                if (newY < 1) {
                    // Sommet atteint
                    setState((s) => ({ ...s, posY: 1, direction: "up" }))
                    setPopup({
                        kind: "info",
                        text: "🏔️ TU ATTEINS LE SOMMET DU MONT PASTA-VENTOUX !\n\nLa vue est magnifique. Tu sens que tu as accompli quelque chose de grand.\n\n(Badge Conquérant + concours intersalle arrivent dans le prochain patch.)",
                    })
                    return
                }
                if (newY > map.height - 2) {
                    setState((s) => ({ ...s, direction: d }))
                    return
                }
                // Avancement
                setState((s) => ({ ...s, posX: 3, posY: newY, direction: d }))
                if (goingUp) {
                    // Ajoute click au tracker cadence
                    const now = Date.now()
                    setCadenceClicks((prev) => [...prev.filter((t) => now - t < 10000), now])
                    // Coût = bike.costPerCase × cadenceMultiplier
                    const bpm = computeCadenceBPM(cadenceClicks)
                    const mult = cadenceCostMultiplier(bpm)
                    const baseCost = activeBike.def.capabilities.canRide?.costPerCase ?? 8
                    const cost = Math.max(1, Math.round(baseCost * mult))
                    setReps((r) => Math.max(0, r - cost))
                    // Wear le vélo
                    spendEnergy(cost, "mont_climb", [activeBike.entry.itemKey]).catch(() => { /* silent */ })
                }
                return
            }

            const result = tryComputeMove(state, d, map, buildings, blockingPositions)

            // v3.12 — Check waterShallow (canal) : conditions d'entrée selon swim_set + firstSwimDone
            if (!("blocked" in result)) {
                const targetTile = map.tiles[result.nextState.posY]?.[result.nextState.posX]
                if (targetTile === "waterShallow") {
                    const hasSwimSet = hasIntactItem(inventory, "swim_set")
                    if (!hasSwimSet) {
                        setToast("Tu n'as pas l'équipement pour nager. Va voir JOJO.")
                        setState((s) => ({ ...s, direction: d }))
                        return
                    }
                    if (!state.firstSwimDone) {
                        setToast("Brrr ! L'eau est trop froide. T'oseras pas y aller seul...")
                        setState((s) => ({ ...s, direction: d }))
                        return
                    }
                    // OK : le joueur peut entrer dans l'eau, le mouvement se poursuit normalement.
                }
            }

            // v3.8.4 — Bloquer le contournement des PNJ du pont via Échap-popup.
            // Si le joueur EST déjà dans la ligne de vue d'un PNJ non-vaincu, il ne
            // peut quitter cette zone qu'en : (a) restant dans la ligne de vue du
            // MÊME PNJ, ou (b) reculant vers le sud.
            if (state.mapId === "route1" && !("blocked" in result)) {
                const defeated = state.bridgePnjDefeated ?? []
                const currentWatcher = bridgePnjSeeingPlayer(BRIDGE_PNJS, defeated, state.posX, state.posY)
                if (currentWatcher) {
                    const nextWatcher = bridgePnjSeeingPlayer(
                        BRIDGE_PNJS,
                        defeated,
                        result.nextState.posX,
                        result.nextState.posY,
                    )
                    const sameWatcher = !!nextWatcher && nextWatcher.id === currentWatcher.id
                    const isRetreatingSouth = d === "down"
                    if (!sameWatcher && !isRetreatingSouth) {
                        const pnjName = BRIDGE_PNJS.find((p) => p.id === currentWatcher.id)?.name ?? currentWatcher.id
                        setToast(`${pnjName} t'a interpelé. Affronte-le (A) ou recule.`)
                        setState((s) => ({ ...s, direction: d }))
                        return
                    }
                }
            }

            if ("blocked" in result) {
                // On change quand même la direction du sprite
                setState((s) => ({ ...s, direction: d }))

                // Cas spécial : l'arbre obstacle
                if (result.reason === "TREE_OBSTACLE") {
                    if (state.phase !== "playing") {
                        setToast("L'arbre te bloque. Pousse-le après l'intro du Monstre.")
                        return
                    }
                    // v3.10 — coût ajusté selon le ratio de difficulté
                    // v3.17 — + discount social Lunettes
                    const ratioTreeCost = applyDifficultyRatio(COST_TREE_OBSTACLE)
                    const adjustedTreeCost = applySocialDiscount(ratioTreeCost, inventory)
                    if (reps < adjustedTreeCost) {
                        setToast(`L'arbre coûte ${adjustedTreeCost} reps. T'en as ${reps}.`)
                        return
                    }
                    // Pousser l'arbre : on tente le débit côté serveur
                    ; (async () => {
                        const ok = await spendEnergy(adjustedTreeCost, "tree_obstacle")
                        if (!ok) return
                        setState((s) => ({ ...s, treeObstacleCleared: true, direction: d }))
                        setToast(`Tu pousses l'arbre. -${adjustedTreeCost} reps.`)
                        // v3.4b : broadcast (premier à franchir l'arbre = événement)
                        broadcast({
                            type: "cinematic:trigger",
                            mapId: state.mapId,
                            cinematicId: "tree_cleared",
                        })
                        // Déclencher la cinématique Pionnier
                        setTimeout(() => {
                            if (!state.pioneerBadgeAwarded) {
                                setCinematic({ kind: "pioneer", step: 0 })
                            }
                        }, 400)
                    })()
                    return
                }

                // === v3.3 : si bloqué par un NPC, on peut le pousser (comme un joueur) ===
                let dx = 0, dy = 0
                if (d === "up") dy = -1
                else if (d === "down") dy = 1
                else if (d === "left") dx = -1
                else if (d === "right") dx = 1
                const targetX = state.posX + dx
                const targetY = state.posY + dy
                const blockingNpc = npcsWithPos.find((n) => n.x === targetX && n.y === targetY)
                if (blockingNpc) {
                    // v3.19b — Bestiole rework : attack mechanic au lieu du dialog standard
                    if (blockingNpc.npc.id.startsWith("bestiole_")) {
                        triggerBestioleEncounter()
                        return
                    }
                    // Le PNJ "interceptor" déclenche son dialogue automatiquement
                    if (blockingNpc.npc.interaction === "interceptor") {
                        triggerNpcDialogue(blockingNpc.npc)
                        return
                    }
                    // Sinon (interactive), on tente de le pousser comme un joueur
                    if (state.phase !== "playing") {
                        setToast(`${blockingNpc.npc.name} te regarde. Va falloir lui parler (appuie sur A).`)
                        return
                    }
                    // v3.10 — coût push ajusté selon le ratio
                    // v3.17 — + discount social Lunettes
                    const ratioPushCost = applyDifficultyRatio(COST_PUSH)
                    const adjustedPushCost = applySocialDiscount(ratioPushCost, inventory)
                    if (reps < adjustedPushCost) {
                        setToast(`Pousser ${blockingNpc.npc.name} coûte ${adjustedPushCost} reps. T'en as ${reps}.`)
                        return
                    }
                    // On consomme `adjustedPushCost` reps via l'API serveur (source de vérité)
                    ; (async () => {
                        const ok = await spendEnergy(adjustedPushCost, "push_npc")
                        if (!ok) return
                        setToast(`Tu pousses ${blockingNpc.npc.name}. -${adjustedPushCost} reps.`)
                    })()
                    return
                }

                setToast(result.reason)
                return
            }

            // Énergie suffisante ?
            if (state.phase === "playing" && reps < result.repsCost) {
                setState((s) => ({ ...s, direction: d }))
                setToast("Plus d'énergie. File faire des reps.")
                return
            }

            // Apply
            setState(result.nextState)

            // v3.17c — Détection de la case cachée du casino de Bourg-Boulette (5, 6).
            // Si le joueur marche dessus pour la 1re fois → grant +50 reps via API.
            if (
                result.nextState.mapId === "casino" &&
                result.nextState.posX === 5 &&
                result.nextState.posY === 6 &&
                !(state as { bourgCasinoCoinsFound?: boolean }).bourgCasinoCoinsFound
            ) {
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/casino/coin-found", { method: "POST" })
                        const data = await res.json()
                        if (data.ok && typeof data.reward === "number") {
                            setToast(`J'ai trouvé de l'énergie, trop bien ! +${data.reward} reps.`)
                            if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                            if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                            setState((s) => ({ ...s, bourgCasinoCoinsFound: true }))
                        }
                    } catch (e) {
                        console.warn("[MapClient] casino/coin-found failed", e)
                    }
                })()
            }

            // v3.22 — Mouvement gratuit dans les intérieurs (bâtiments) : skip cost
            if (result.repsCost > 0 && !INDOOR_MAP_IDS.has(state.mapId)) {
                // v3.17 — On résout le wearable actif pour la tile sur laquelle on entre.
                // - waterShallow : brassards (tile-restricted) priorité, sinon boots/chaussures
                // - autre tile   : boots ou chaussures_course (plus haute moveCostReduction gagne)
                const enteringTile = map.tiles[result.nextState.posY]?.[result.nextState.posX]
                const activeWearable = enteringTile
                    ? findActiveWearableForTile(inventory, enteringTile)
                    : null
                const reduction = activeWearable?.def.capabilities.canWear?.moveCostReduction ?? 0
                const baseCost = Math.max(0, result.repsCost - reduction)
                // v3.10 — Ratio de difficulté (onboarding paye moins de reps par case)
                const ratioCost = applyDifficultyRatio(baseCost)
                // v3.17 — Discount social (Lunettes -10%)
                const adjustedCost = applySocialDiscount(ratioCost, inventory)
                // Débit local immédiat pour la fluidité
                setReps((r) => Math.max(0, r - adjustedCost))
                // v3.17d — Construction de la liste des wearables à user (actif + lunettes si intactes)
                const wearKeys: string[] = []
                if (activeWearable?.entry.itemKey) wearKeys.push(activeWearable.entry.itemKey)
                if (hasIntactLunettes(inventory)) wearKeys.push("lunettes")
                spendEnergy(adjustedCost, "move", wearKeys).catch(() => {/* silent */ })
            }

            // v3.4b : broadcast Pusher (fire and forget)
            broadcast({
                type: "player:move",
                mapId: result.nextState.mapId,
                posX: result.nextState.posX,
                posY: result.nextState.posY,
                direction: result.nextState.direction,
            })

            // === v3.5 : DÉTECTION LIGNE DE VUE DES PNJ DU PONT ===
            // Quand le joueur arrive sur une case partageant la ligne ou colonne
            // d'un PNJ du pont non vaincu, ce PNJ l'interpelle.
            if (result.nextState.mapId === "route1") {
                const defeated = result.nextState.bridgePnjDefeated ?? []
                const watcher = bridgePnjSeeingPlayer(
                    BRIDGE_PNJS,
                    defeated,
                    result.nextState.posX,
                    result.nextState.posY,
                )
                if (watcher) {
                    // On a un PNJ qui interpelle. Délai léger pour que le mouvement s'affiche d'abord.
                    setTimeout(() => {
                        const fullPnj = BRIDGE_PNJS.find((p) => p.id === watcher.id)
                        if (fullPnj) triggerBridgePnjChallenge(fullPnj)
                    }, 200)
                    return
                }
            }

            if (result.leftToOutdoor) {
                setToast(`Tu sors.`)
            }

            // === v3.3 : entrée AUTOMATIQUE dans un bâtiment ===
            if (result.enteredBuilding) {
                const targetMap = getMap(
                    result.enteredBuilding === "monsterCave" ? "cave" : result.enteredBuilding
                )
                setToast(`Tu entres : ${targetMap.name}`)
                return
            }

            // Trigger intro Monstre (première fois dans les hautes herbes)
            if (result.triggersIntro) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        phase: "introMonster",
                        introStep: 0,
                        hasEnteredTallGrass: true,
                    }))
                }, 250)
                return
            }

            // Transition Bourg-Boulette → Route 1
            // Quand le joueur (en phase 'playing') marche sur grassTall, il sort de la carte
            // et arrive en bas de la Route 1.
            if (
                state.mapId === "bourgpates" &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall" &&
                state.phase === "playing"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: ROUTE1_SPAWN_FROM_SOUTH.mapId,
                        posX: ROUTE1_SPAWN_FROM_SOUTH.posX,
                        posY: ROUTE1_SPAWN_FROM_SOUTH.posY,
                        direction: ROUTE1_SPAWN_FROM_SOUTH.direction,
                    }))
                    setToast("ROUTE 1 — Pont Pépite d'Azuria")
                }, 200)
            }

            // === v3.8 : Transition Route 1 nord → Pépiteville (gate CHAMPIO) ===
            // Quand le joueur arrive sur la case ROUTE1_NORTH_GATE (sortie nord du pont),
            // on vérifie qu'il a vaincu CHAMPIO. Sinon, il reste là avec un message.
            if (
                state.mapId === "route1" &&
                result.nextState.posX === ROUTE1_NORTH_GATE.x &&
                result.nextState.posY === ROUTE1_NORTH_GATE.y
            ) {
                const defeated = result.nextState.bridgePnjDefeated ?? []
                if (defeated.includes("pnj_champio")) {
                    setTimeout(() => {
                        setState((s) => ({
                            ...s,
                            mapId: PEPITEVILLE_SPAWN_FROM_SOUTH.mapId,
                            posX: PEPITEVILLE_SPAWN_FROM_SOUTH.posX,
                            posY: PEPITEVILLE_SPAWN_FROM_SOUTH.posY,
                            direction: PEPITEVILLE_SPAWN_FROM_SOUTH.direction,
                        }))
                        setToast("PÉPITEVILLE")
                    }, 200)
                } else {
                    setToast("Tu sens qu'il te manque quelque chose avant de passer.")
                }
            }

            // === v3.11 : Détection PIAFFINI au sommet de la Tour ===
            // Si le joueur arrive sur une case adjacente à PIAFFINI (en (3,3) sur tower_floor_5)
            // et n'a pas encore sauvé PIAFFINI, on déclenche la cinématique automatiquement.
            if (
                result.nextState.mapId === "tower_floor_5" &&
                !result.nextState.piaffiniRescued
            ) {
                const px = result.nextState.posX
                const py = result.nextState.posY
                const adjacentToPiaffini =
                    (px === 3 && py === 2) || (px === 3 && py === 4) ||
                    (px === 2 && py === 3) || (px === 4 && py === 3)
                if (adjacentToPiaffini) {
                    setTimeout(() => {
                        setCinematic({ kind: "piaffini", stage: "dialog", step: 0 })
                    }, 200)
                    return
                }
            }

            // === v3.17c : Transition Bourg-Boulette sud → LA MER (nord) ===
            // (avant v3.17c, on téléportait directement à Macaron'île — désormais on passe par la_mer)
            if (
                state.mapId === "bourgpates" &&
                result.nextState.posY === 15 &&  // OUTDOOR_H - 1 = 15
                (result.nextState.posX === 7 || result.nextState.posX === 8) &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "waterShallow"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: LAMER_SPAWN_FROM_BOURG.mapId,
                        posX: LAMER_SPAWN_FROM_BOURG.posX,
                        posY: LAMER_SPAWN_FROM_BOURG.posY,
                        direction: LAMER_SPAWN_FROM_BOURG.direction,
                    }))
                    setToast("LA MER")
                }, 200)
            }
            // === v3.17c : Transitions LA MER ↔ Bourg / Macaron'île ===
            // la_mer (4, 0) → retour Bourg-Boulette
            if (
                state.mapId === "la_mer" &&
                result.nextState.posY === 0 &&
                result.nextState.posX === 4
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: BOURG_SPAWN_FROM_LAMER.mapId,
                        posX: BOURG_SPAWN_FROM_LAMER.posX,
                        posY: BOURG_SPAWN_FROM_LAMER.posY,
                        direction: BOURG_SPAWN_FROM_LAMER.direction,
                    }))
                    setToast("BOURG-BOULETTE")
                }, 200)
            }
            // la_mer (4, H-1) → Macaron'île canal entry
            if (
                state.mapId === "la_mer" &&
                result.nextState.posY === map.height - 1 &&
                result.nextState.posX === 4
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: MACARONILE_SPAWN_FROM_LAMER.mapId,
                        posX: MACARONILE_SPAWN_FROM_LAMER.posX,
                        posY: MACARONILE_SPAWN_FROM_LAMER.posY,
                        direction: MACARONILE_SPAWN_FROM_LAMER.direction,
                    }))
                    setToast("MACARON'ÎLE — Canal nord")
                }, 200)
            }
            // Retour : si on est sur macaron_ile (7, 0) → la_mer (au lieu de bourgpates direct)
            if (
                state.mapId === "macaron_ile" &&
                result.nextState.posY === 0 &&
                result.nextState.posX === 7
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: LAMER_SPAWN_FROM_MACARONILE.mapId,
                        posX: LAMER_SPAWN_FROM_MACARONILE.posX,
                        posY: LAMER_SPAWN_FROM_MACARONILE.posY,
                        direction: LAMER_SPAWN_FROM_MACARONILE.direction,
                    }))
                    setToast("LA MER")
                }, 200)
            }

            // === v3.8.7 : Transition Pépiteville nord ↔ Hautes-Pâtes via hautes herbes ===
            // Le joueur marche sur une case grassTall :
            //  - Depuis pepiteville → spawn dans Hautes-Pâtes (au-dessus de la bande sud)
            //  - Depuis hautespates → spawn dans Pépiteville (sous la bande nord)
            // Pas de gating (accès libre une fois Pépiteville atteinte).
            if (
                state.mapId === "pepiteville" &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: HAUTESPATES_SPAWN_FROM_SOUTH.mapId,
                        posX: HAUTESPATES_SPAWN_FROM_SOUTH.posX,
                        posY: HAUTESPATES_SPAWN_FROM_SOUTH.posY,
                        direction: HAUTESPATES_SPAWN_FROM_SOUTH.direction,
                    }))
                    setToast("HAUTES-PÂTES")
                }, 200)
            }
            if (
                state.mapId === "hautespates" &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: PEPITEVILLE_SPAWN_FROM_NORTH.mapId,
                        posX: PEPITEVILLE_SPAWN_FROM_NORTH.posX,
                        posY: PEPITEVILLE_SPAWN_FROM_NORTH.posY,
                        direction: PEPITEVILLE_SPAWN_FROM_NORTH.direction,
                    }))
                    setToast("PÉPITEVILLE")
                }, 200)
            }

            // === v3.16 : Transitions sud Macaron'île ↔ grass_sud ↔ Muscuville ===
            // Macaron'île sud (grassTall col 6/7 ligne 21) → grass_sud
            if (
                state.mapId === "macaron_ile" &&
                result.nextState.posY === map.height - 1 &&
                (result.nextState.posX === 6 || result.nextState.posX === 7) &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: GRASS_SUD_SPAWN_FROM_NORTH.mapId,
                        posX: GRASS_SUD_SPAWN_FROM_NORTH.posX,
                        posY: GRASS_SUD_SPAWN_FROM_NORTH.posY,
                        direction: GRASS_SUD_SPAWN_FROM_NORTH.direction,
                    }))
                    if (bestiolesFlee) {
                        setToast("Les bestioles s'écartent à la vue de ton compagnon.")
                    } else {
                        setToast("HAUTES HERBES DU SUD")
                    }
                }, 200)
            }
            // grass_sud nord (grassTall col 4 ligne 0) → retour Macaron'île
            if (
                state.mapId === "grass_sud" &&
                result.nextState.posY === 0 &&
                result.nextState.posX === 4
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: MACARONILE_SPAWN_FROM_GRASS_SUD.mapId,
                        posX: MACARONILE_SPAWN_FROM_GRASS_SUD.posX,
                        posY: MACARONILE_SPAWN_FROM_GRASS_SUD.posY,
                        direction: MACARONILE_SPAWN_FROM_GRASS_SUD.direction,
                    }))
                    setToast("MACARON'ÎLE")
                }, 200)
            }
            // grass_sud sud (grassTall col 4 ligne H-1) → Muscuville
            if (
                state.mapId === "grass_sud" &&
                result.nextState.posY === map.height - 1 &&
                result.nextState.posX === 4
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: MUSCUVILLE_SPAWN_FROM_NORTH.mapId,
                        posX: MUSCUVILLE_SPAWN_FROM_NORTH.posX,
                        posY: MUSCUVILLE_SPAWN_FROM_NORTH.posY,
                        direction: MUSCUVILLE_SPAWN_FROM_NORTH.direction,
                    }))
                    setToast("MUSCUVILLE")
                }, 200)
            }
            // v3.23b — Muscuville sud → Mont Pasta-Ventoux (gated par vélo)
            if (
                state.mapId === "muscuville" &&
                result.nextState.posY === map.height - 1 &&
                result.nextState.posX === 8 &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall"
            ) {
                const activeBike = getActiveBicycle(inventory)
                if (!activeBike) {
                    setTimeout(() => {
                        setState((s) => ({ ...s, posY: map.height - 2 }))
                        setPopup({
                            kind: "info",
                            text: "⛰️ MONT PASTA-VENTOUX\n\nLa montagne se dresse devant toi. Tu ne peux pas la gravir à pied.\n\nVa voir PELOTON au magasin de vélos pour acheter une monture.",
                        })
                    }, 100)
                } else {
                    setTimeout(() => {
                        setState((s) => ({
                            ...s,
                            mapId: "mont_pasta_ventoux",
                            posX: 3,
                            posY: 101,  // Sommet est à y=1 (MONT_H-3=101 = entrée sud)
                            direction: "up",
                        }))
                        setToast(`🚴 Tu enfourches ton ${activeBike.def.name.toLowerCase()}. Direction le sommet !`)
                    }, 200)
                }
            }
            // v3.23b — Mont nord (cinematic au sommet à venir v3.23c) + retour Mont sud → Muscuville
            if (
                state.mapId === "mont_pasta_ventoux" &&
                result.nextState.posY === map.height - 2 &&
                map.tiles[result.nextState.posY]?.[result.nextState.posX] === "grassTall"
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: "muscuville",
                        posX: 8,
                        posY: 14,
                        direction: "up",
                    }))
                    setToast("MUSCUVILLE")
                }, 200)
            }
            // Muscuville nord (grassTall col 8 ligne 0) → retour grass_sud
            if (
                state.mapId === "muscuville" &&
                result.nextState.posY === 0 &&
                result.nextState.posX === 8
            ) {
                setTimeout(() => {
                    setState((s) => ({
                        ...s,
                        mapId: GRASS_SUD_SPAWN_FROM_SOUTH.mapId,
                        posX: GRASS_SUD_SPAWN_FROM_SOUTH.posX,
                        posY: GRASS_SUD_SPAWN_FROM_SOUTH.posY,
                        direction: GRASS_SUD_SPAWN_FROM_SOUTH.direction,
                    }))
                    setToast("HAUTES HERBES DU SUD")
                }, 200)
            }
        },
        [state, map, buildings, blockingPositions, reps, popup, cinematic, npcsWithPos, triggerNpcDialogue, triggerBridgePnjChallenge, broadcast, spendEnergy, bestiolesFlee]
    )

    // ============================================================
    // BOUTON A
    // ============================================================
    const pressA = useCallback(() => {
        if (aLockRef.current) return
        aLockRef.current = true
        setTimeout(() => {
            aLockRef.current = false
        }, 300)

        // v3.8 — si une modal est ouverte, le A est géré par la modal elle-même
        if (showStartMenu || showInventory || showShop || showPlayerMap || showTamagotchi || showBibliotheque || showBestioleNaming || showCasino || showFastTravel) return

        // v3.11 — Cinématique PIAFFINI (dialogue au sommet, puis vol)
        if (cinematic?.kind === "piaffini" && cinematic.stage === "dialog") {
            const next = cinematic.step + 1
            if (next > PIAFFINI_RESCUE_DIALOGUE.length - 1) {
                // Fin du dialogue → on bascule en mode "flight" (l'écran de vol)
                setCinematic({ kind: "piaffini", stage: "flight" })
                return
            }
            setCinematic({ kind: "piaffini", stage: "dialog", step: next })
            return
        }

        // v3.17d — Cinématique Lunettes cassée (3 étapes : trip → fall → broken)
        if (cinematic?.kind === "lunettesBreak") {
            const next = cinematic.step + 1
            if (next >= 3) {
                setCinematic(null)
                return
            }
            setCinematic({ kind: "lunettesBreak", step: next })
            return
        }

        // v3.8 — Cinématique PEPITO (offre le sac)
        if (cinematic?.kind === "pepitoBag") {
            const next = cinematic.step + 1
            if (next > PEPITO_DIALOGUE_FIRST.length - 1) {
                // Fin de cinématique : call grant-bag côté serveur
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/grant-bag", { method: "POST" })
                        const data = await res.json()
                        if (data.ok && data.hasBag === true) {
                            setHasBag(true)
                            setToast("Tu reçois un sac. Utilise START pour l'ouvrir.")
                        } else if (data.reason) {
                            setToast(data.reason)
                        }
                    } catch (e) {
                        console.warn("[MapClient] grant-bag failed", e)
                        setToast("Erreur réseau, réessaie.")
                    }
                })()
                setCinematic(null)
                return
            }
            setCinematic({ kind: "pepitoBag", step: next })
            return
        }

        // Cinématique Pionnier (après l'arbre)
        if (cinematic?.kind === "pioneer") {
            const next = cinematic.step + 1
            if (next > PIONEER_LAST_STEP) {
                // Fin de cinématique : claim le badge côté serveur
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/bridge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "claimPioneerBadge" }),
                        })
                        const data = await res.json()
                        if (data.ok && data.awarded) {
                            setState((s) => ({ ...s, pioneerBadgeAwarded: true }))
                            setToast("Badge PIONNIER reçu ! +200 XP")
                            // v3.4b : broadcast pour notifier les autres joueurs
                            broadcast({
                                type: "cinematic:trigger",
                                mapId: state.mapId,
                                cinematicId: "pionnier_badge",
                            })
                        }
                    } catch (e) {
                        console.warn("[MapClient] claimPioneerBadge failed", e)
                    }
                })()
                setCinematic(null)
                return
            }
            setCinematic({ kind: "pioneer", step: next })
            return
        }

        // === v3.3 : Cinématique dialogue NPC ===
        if (cinematic?.kind === "npcDialogue") {
            const next = cinematic.step + 1
            if (next >= cinematic.lines.length) {
                // Fin du dialogue : appliquer la récompense d'énergie si applicable
                const npcId = cinematic.npcId
                const energyReward = cinematic.energyReward
                const isGymGuy = npcId === "gym_guy"

                // Mémoriser qu'on a parlé à ce NPC
                setState((s) => {
                    const newTalked = s.npcsTalkedTo.includes(npcId)
                        ? s.npcsTalkedTo
                        : [...s.npcsTalkedTo, npcId]
                    return { ...s, npcsTalkedTo: newTalked }
                })

                // v3.20 — LE MONSTRE : grant amulette à la fin du dialogue (si hasBag + pas déjà reçue)
                if (npcId === "le_monstre" && hasBag) {
                    const hasAmuletteAlready = inventory.some((e) => e.itemKey === "amulette_monstre")
                    if (!hasAmuletteAlready) {
                        ; (async () => {
                            try {
                                const res = await fetch("/api/gamebook/monstre/grant-amulette", { method: "POST" })
                                const data = await res.json()
                                if (data.ok && Array.isArray(data.inventory)) {
                                    setInventory(data.inventory)
                                    setToast("🦴 Tu reçois l'Amulette du Monstre. Tes équipements s'useront moitié moins vite.")
                                } else if (data.reason) {
                                    setToast(data.reason)
                                }
                            } catch (e) {
                                console.warn("[MapClient] monstre/grant-amulette failed", e)
                            }
                        })()
                    }
                }

                // v3.17 — LINGUINI : +1 luck par jour (idempotent serveur)
                if (npcId === "linguini") {
                    ; (async () => {
                        try {
                            const res = await fetch("/api/gamebook/luck/talk", { method: "POST" })
                            const data = await res.json()
                            if (data.ok && data.granted === true) {
                                setToast(`+1 ✨ chance ! (Total : ${data.luck})`)
                            } else if (data.ok && data.granted === false) {
                                setToast("LINGUINI a besoin de recharger ses vibes. Reviens demain.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] luck/talk failed", e)
                        }
                    })()
                }

                // v3.24a — MARCO / POLO : capitaines d'équipe, +30 reps 1×/jour
                if (npcId === "casino_captain_red" || npcId === "casino_captain_yellow") {
                    const targetTeam = npcId === "casino_captain_red" ? "RED" : "YELLOW"
                    ; (async () => {
                        try {
                            const res = await fetch("/api/gamebook/team/captain-bonus", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ team: targetTeam }),
                            })
                            const data = await res.json()
                            if (data.ok && typeof data.reward === "number") {
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setToast(`+${data.reward} reps de ${targetTeam === "RED" ? "MARCO" : "POLO"} !`)
                            } else if (data.reason) {
                                setToast(data.reason)
                            }
                        } catch (e) {
                            console.warn("[MapClient] team/captain-bonus failed", e)
                        }
                    })()
                }

                // v3.17c — NAGEUR : si on a vu le dialogue défi (2e visite) et qu'on a fait 50 pompes
                // aujourd'hui, on grant +100 reps via le serveur (idempotent via nageurDefiCompleted).
                if (npcId === "lamer_nageur" && !(state as { nageurDefiCompleted?: boolean }).nageurDefiCompleted) {
                    const talkedBefore = state.npcsTalkedTo?.includes("lamer_nageur") === true
                    if (talkedBefore) {
                        ; (async () => {
                            try {
                                const res = await fetch("/api/gamebook/nageur/defi", { method: "POST" })
                                const data = await res.json()
                                if (data.ok && typeof data.reward === "number") {
                                    setToast(`Défi réussi ! +${data.reward} reps de la part du NAGEUR.`)
                                    if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                    if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                    setState((s) => ({ ...s, nageurDefiCompleted: true }))
                                } else if (data.reason) {
                                    // Pas assez de pompes ou autre — silence sauf message explicite
                                    if (data.pushupsToday !== undefined) {
                                        setToast(`${data.reason}`)
                                    }
                                }
                            } catch (e) {
                                console.warn("[MapClient] nageur/defi failed", e)
                            }
                        })()
                    }
                }

                // === v3.4a : récompense gym guy via API serveur (source de vérité) ===
                if (isGymGuy && energyReward && state.phase === "playing" && !state.gymGuyEnergyGiven) {
                    const rewardNpcName = cinematic.npcName
                    ; (async () => {
                        try {
                            const res = await fetch("/api/gamebook/grant-gym-energy", {
                                method: "POST",
                            })
                            const data = await res.json()
                            if (data.ok) {
                                if (typeof data.availableEnergy === "number") {
                                    setReps(data.availableEnergy)
                                }
                                if (typeof data.energySpentToday === "number") {
                                    setEnergySpent(data.energySpentToday)
                                }
                                setState((s) => ({ ...s, gymGuyEnergyGiven: true }))
                                setToast(`+${data.reward ?? energyReward} reps offerts par ${rewardNpcName} !`)
                            } else {
                                setToast(data.reason || "BUFFY hausse les épaules.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] grant-gym-energy failed", e)
                        }
                    })()
                }

                // === v3.8 : récompense DURUM (gym_pepite) via route dédiée (idempotente serveur) ===
                if (npcId === "durum" && energyReward && state.phase === "playing") {
                    const rewardNpcName = cinematic.npcName
                    ; (async () => {
                        try {
                            const res = await fetch("/api/gamebook/grant-durum-energy", { method: "POST" })
                            const data = await res.json()
                            if (data.ok) {
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setToast(`+${data.reward ?? energyReward} reps offerts par ${rewardNpcName} !`)
                            } else if (data.reason) {
                                // No-op si déjà donné, on n'affiche pas pour ne pas spammer
                            }
                        } catch (e) {
                            console.warn("[MapClient] grant-durum-energy failed", e)
                        }
                    })()
                }

                setCinematic(null)
                return
            }
            setCinematic({ ...cinematic, step: next })
            return
        }

        // Intro Monstre : faire défiler
        if (state.phase === "introMonster") {
            const next = state.introStep + 1

            // Étape téléportation
            if (state.introStep === INTRO_STEP_TELEPORT_TO_CAVE) {
                setState((s) => ({
                    ...s,
                    introStep: next,
                    monsterCaveRevealed: true,
                    mapId: "cave",
                    posX: 4,
                    posY: 4,
                    direction: "down",
                }))
                return
            }

            // Fin du dialogue
            if (next > INTRO_LAST_STEP) {
                setState((s) => ({ ...s, phase: "playing", introStep: 0 }))
                setToast("L'énergie est activée. 10 reps = 1 case.")
                return
            }

            setState((s) => ({ ...s, introStep: next }))
            return
        }

        // Popup ouverte : si pnjChallenge → tenter le défi, sinon fermer
        if (popup) {
            if (popup.kind === "pnjChallenge") {
                const pnjId = popup.pnjId
                const pnjName = popup.pnjName
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/bridge", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "challengePnj", pnjId }),
                        })
                        const data = await res.json()
                        if (data.ok) {
                            setState((s) => ({
                                ...s,
                                bridgePnjDefeated: data.defeated || [...(s.bridgePnjDefeated || []), pnjId],
                            }))
                            // v3.9 — message spécial si CHAMPIO + badge Star reçu
                            let victoryText = `${pnjName} s'incline et te laisse passer.`
                            if (data.championStarAwarded) {
                                victoryText = `${pnjName} s'incline avec un sifflement admiratif.\n\n"Star du Pont d'Hier — tiens, prends ce badge. +${data.xp ?? 200} XP."`
                            }
                            setPopup({ kind: "info", text: victoryText })
                            // v3.4b : broadcast CHAMPIO uniquement (les autres sont triviaux)
                            if (pnjId === "pnj_champio") {
                                broadcast({
                                    type: "cinematic:trigger",
                                    mapId: state.mapId,
                                    cinematicId: "champio_defeated",
                                })
                            }
                        } else {
                            setPopup({
                                kind: "info",
                                text: `${pnjName} : "${data.reason || "Pas encore."}"`,
                            })
                        }
                    } catch (e) {
                        console.warn("[MapClient] challengePnj failed", e)
                        setPopup({ kind: "info", text: "Erreur réseau. Réessaie." })
                    }
                })()
                return
            }
            setPopup(null)
            return
        }

        // Cible devant le joueur
        const front = frontTile(state)
        if (front.x < 0 || front.y < 0 || front.x >= map.width || front.y >= map.height) {
            setToast("Y'a rien à interagir.")
            return
        }

        // PNJ du pont devant ?
        if (state.mapId === "route1") {
            const bridgePnj = BRIDGE_PNJS.find((p) => p.x === front.x && p.y === front.y)
            if (bridgePnj) {
                // v3.5 : vaincu = pour toujours (plus de reset quotidien)
                const defeated = state.bridgePnjDefeated ?? []
                if (defeated.includes(bridgePnj.id)) {
                    setPopup({
                        kind: "info",
                        text: `${bridgePnj.name} te reconnaît.\n\n"Passe, champion. Tu as déjà gagné ton respect ici."`,
                    })
                    return
                }
                // Afficher le défi
                triggerBridgePnjChallenge(bridgePnj)
                return
            }
        }

        // Joueur devant (autre user)
        const ghostInFront = otherPlayersOnThisMap.find((p) => p.posX === front.x && p.posY === front.y)
        if (ghostInFront) {
            // v3.12 — Push à l'eau : si la case où A serait poussé est waterShallow,
            // on tente le "push to water" plutôt que le push normal (qui coûte 30 reps).
            // Le serveur vérifiera côté target : a swim_set, n'a pas firstSwimDone, est sur bourgpates.
            const dx = state.direction === "left" ? -1 : state.direction === "right" ? 1 : 0
            const dy = state.direction === "up" ? -1 : state.direction === "down" ? 1 : 0
            const tileWhereTargetGoes = map.tiles[ghostInFront.posY + dy]?.[ghostInFront.posX + dx]
            if (tileWhereTargetGoes === "waterShallow" && state.mapId === "bourgpates") {
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/water/push", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ targetUserId: ghostInFront.id }),
                        })
                        const data = await res.json()
                        if (data.ok) {
                            // Refresh des autres joueurs pour voir A disparaître de la map
                            loadOtherPlayers()
                            const ecText = data.ecAwarded ? `+${data.ecAwarded} EmberCoins.` : ""
                            const badgeText = data.badgeAwarded ? ` Badge Pousseur de potes +${data.xp ?? 100} XP !` : ""
                            setPopup({
                                kind: "info",
                                text: `Tu pousses ${ghostInFront.nickname} dans le canal !\n\n${ecText}${badgeText}`,
                            })
                        } else {
                            setPopup({ kind: "info", text: data.reason || "Tu ne peux pas pousser cette personne dans l'eau." })
                        }
                    } catch (e) {
                        console.warn("[MapClient] water/push failed", e)
                        setToast("Erreur réseau, réessaie.")
                    }
                })()
                return
            }
            handlePushAttempt(ghostInFront)
            return
        }

        // === v3.3 : NPC devant ? ===
        const npcInFront = npcsWithPos.find((n) => n.x === front.x && n.y === front.y)
        if (npcInFront) {
            const npcId = npcInFront.npc.id
            // === v3.8 : interactions spéciales ===
            // PEPITO (Pépiteville, backup) ou MAMAN (Bourg-Boulette, sortie cave) : si pas de sac, cinématique d'offre
            if ((npcId === "pepito" || npcId === "maman") && !hasBag) {
                setCinematic({ kind: "pepitoBag", step: 0 })
                return
            }
            // NUTRIPATES (vendeur) : ouvre le shop si on a un sac, sinon dialogue de refus
            if (npcId === "shop_keeper") {
                if (!hasBag) {
                    setPopup({
                        kind: "info",
                        text: "NUTRIPATES te toise.\n\n\"Pas de sac, pas de service. C'est la base du commerce. Va voir PEPITO dehors.\"",
                    })
                    return
                }
                setShowShop(true)
                return
            }
            // v3.14 — V3T (vétérinaire) : ouvre la modal Tamagotchi (adoption ou suivi)
            if (npcId === "veterinaire_keeper") {
                setShowTamagotchi(true)
                return
            }
            // v3.18 — BIBLIO (bibliothécaire) : ouvre la modal Bibliothèque
            if (npcId === "bibliotheque_keeper") {
                setShowBibliotheque(true)
                return
            }
            // v3.20 — LE MONSTRE : offre l'amulette si hasBag, sinon refuse
            if (npcId === "le_monstre") {
                if (!hasBag) {
                    setPopup({
                        kind: "info",
                        text: "Le Monstre te regarde longuement.\n\n\"Reviens quand tu auras ton sac. Va voir PEPITO d'abord.\"",
                    })
                    return
                }
                const hasAmulette = inventory.some(
                    (e) => e.itemKey === "amulette_monstre"
                )
                if (hasAmulette) {
                    triggerNpcDialogue(npcInFront.npc)
                    return
                }
                // Première visite avec sac : dialog cinématique + grant amulette à la fin
                triggerNpcDialogue(npcInFront.npc)
                return
            }
            // v3.14 — TRENETTE : même mécanique que NUTRIPATES (ouvre le shop, requiert un sac)
            if (npcId === "shop_keeper_macaron") {
                if (!hasBag) {
                    setPopup({
                        kind: "info",
                        text: "TRENETTE hausse un sourcil.\n\n\"T'as pas de sac, comment tu veux que je te file quoi que ce soit ? Demande à mon frère NUTRIPATES.\"",
                    })
                    return
                }
                setShowShop(true)
                return
            }
            // v3.23 — PELOTON (bike seller) : ouvre le shop des vélos
            if (npcId === "bike_seller") {
                if (!hasBag) {
                    setPopup({
                        kind: "info",
                        text: "PELOTON te regarde. \"Sans sac, pas de vélo. Va voir MAMAN d'abord.\"",
                    })
                    return
                }
                setShowShop(true)
                return
            }
            // v3.17c — NAGEUR (la_mer) : 3 niveaux de dialogue + défi 50 pompes
            if (npcId === "lamer_nageur") {
                triggerNageurDialog()
                return
            }
            triggerNpcDialogue(npcInFront.npc)
            return
        }

        // Panneau ? (Bourg-Boulette ou Pépiteville — partout où signs n'est pas vide)
        // L'ouverture des portes est automatique via le moteur, géré ailleurs.
        if (signs.length > 0) {
            const sign = signs.find((s) => s.x === front.x && s.y === front.y)
            if (sign) {
                setPopup({ kind: "sign", text: sign.text })
                return
            }
        }

        // Interaction avec une tuile
        const tile = map.tiles[front.y][front.x]

        // v3.8.8 — Dans le shop, parler à NUTRIPATES via son comptoir.
        // (NUTRIPATES est en (4, 2), le comptoir en y=3 entre lui et le joueur.
        // Donc le joueur s'approche du comptoir et appuie A devant.)
        if (state.mapId === "shop_interior" && tile === "shopCounter") {
            if (!hasBag) {
                setPopup({
                    kind: "info",
                    text: "NUTRIPATES te toise depuis son comptoir.\n\n\"Pas de sac, pas de service. C'est la base du commerce. Va voir PEPITO dehors.\"",
                })
                return
            }
            setShowShop(true)
            return
        }

        // v3.13 — Dans le shop de Macaron'île, TRENETTE est au même endroit.
        if (state.mapId === "shop_macaron" && tile === "shopCounter") {
            if (!hasBag) {
                setPopup({
                    kind: "info",
                    text: "TRENETTE hausse un sourcil.\n\n\"T'as pas de sac, comment tu veux que je te file quoi que ce soit ?\"",
                })
                return
            }
            setShowShop(true)
            return
        }

        // v3.23 — Dans le bike shop de Muscuville, PELOTON est derrière le comptoir
        if (state.mapId === "bike_shop" && tile === "shopCounter") {
            if (!hasBag) {
                setPopup({
                    kind: "info",
                    text: "PELOTON te regarde. \"Sans sac, pas de vélo. Va voir MAMAN d'abord.\"",
                })
                return
            }
            setShowShop(true)
            return
        }

        // v3.14 — Chez le vétérinaire V3T, parler via le comptoir = ouvrir le modal Tamagotchi.
        if (state.mapId === "veterinaire" && tile === "shopCounter") {
            setShowTamagotchi(true)
            return
        }

        // v3.21.1 — Cage d'animal : popup descriptif
        if (state.mapId === "veterinaire" && tile === "animalCage") {
            setPopup({
                kind: "info",
                text: "Une cage métallique. À l'intérieur, un petit compagnon se repose.\n\nV3T t'observe : \"Chaque cage abrite un animal qui attend l'humain qui saura le mériter. Approche du comptoir si tu veux rencontrer le tien.\"",
            })
            return
        }

        // v3.18 — Chez BIBLIO (bibliothèque), parler via le comptoir = ouvrir le modal Bibliothèque.
        if (state.mapId === "bibliotheque" && tile === "shopCounter") {
            setShowBibliotheque(true)
            return
        }

        // v3.21 — Roulette des casinos : presser A sur la rouletteWheel ouvre le mini-jeu
        if ((state.mapId === "casino" || state.mapId === "casino_pepite") && tile === "rouletteWheel") {
            setShowCasino(true)
            return
        }

        // v3.18 — Dans la bibliothèque : interactions sur bookshelf / statue / lectern via BIBLIOTHEQUE_TOPICS
        if (state.mapId === "bibliotheque" && (tile === "bookshelf" || tile === "statue" || tile === "lectern" || tile === "shopShelf")) {
            const topic = BIBLIOTHEQUE_TOPICS.find((t) => t.x === front.x && t.y === front.y)
            if (topic) {
                if (topic.kind === "animal_joueur") {
                    setPopup({
                        kind: "info",
                        text: `${topic.title}\n\nCe rayon est dédié aux animaux du bestiaire correspondant aux joueurs actifs.\n\nPour la liste à jour + les défis d'adoption, va voir BIBLIO au comptoir central.`,
                    })
                } else {
                    setPopup({ kind: "info", text: `${topic.title}\n\n${topic.text}` })
                }
                return
            }
            // Tile sans topic dédié
            if (tile === "statue") {
                setPopup({ kind: "info", text: "Une statue de pierre. Visage neutre, posture impassible. Elle veille sur les rayons depuis des siècles." })
                return
            }
            if (tile === "lectern") {
                setPopup({ kind: "info", text: "Un pupitre de lecture. Quelques pages ouvertes. Tu pourrais consulter ici si tu avais un livre en main." })
                return
            }
            setPopup({ kind: "info", text: "Un rayon de livres. Trop poussiéreux pour distinguer un titre précis." })
            return
        }

        // v3.17c — Tableau dans la Tour : look up dans PAPA_TABLEAUX
        if (tile === "painting") {
            const tableau = PAPA_TABLEAUX.find(
                (t) => t.mapId === state.mapId && t.x === front.x && t.y === front.y
            )
            if (tableau) {
                const isMyPapa =
                    tableau.nicknameMatch !== null &&
                    tableau.nicknameMatch.toLowerCase() === nickname.toLowerCase()
                const alreadyClaimed = (state as { papaBoostClaimed?: boolean }).papaBoostClaimed === true
                if (isMyPapa && !alreadyClaimed) {
                    // Grant +100 reps via API (idempotent serveur)
                    ; (async () => {
                        try {
                            const res = await fetch("/api/gamebook/painting/papa-boost", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ nicknameMatch: tableau.nicknameMatch }),
                            })
                            const data = await res.json()
                            if (data.ok && typeof data.reward === "number") {
                                setPopup({
                                    kind: "info",
                                    text: `${tableau.lore}\n\n*Tu reconnais ton père ${tableau.papaName}. Tu te sens revigoré.*\n\n+${data.reward} reps`,
                                })
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setState((s) => ({ ...s, papaBoostClaimed: true }))
                            } else {
                                setPopup({ kind: "info", text: tableau.lore })
                            }
                        } catch (e) {
                            console.warn("[MapClient] papa-boost failed", e)
                            setPopup({ kind: "info", text: tableau.lore })
                        }
                    })()
                } else {
                    setPopup({ kind: "info", text: tableau.lore })
                }
                return
            }
            // Pas dans PAPA_TABLEAUX → tableau décoratif générique
            setPopup({ kind: "info", text: "Un tableau accroché au mur. La toile est trop ancienne pour deviner le sujet." })
            return
        }

        // v3.8.2 — Escalier devant ? (Tour des Pâtes Aiguës)
        if (tile === "stairsUp" || tile === "stairsDown") {
            const direction: "up" | "down" = tile === "stairsUp" ? "up" : "down"
            ; (async () => {
                try {
                    const res = await fetch("/api/gamebook/tower/climb", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ direction }),
                    })
                    const data = await res.json()
                    if (data.ok && data.spawn) {
                        setState((s) => ({
                            ...s,
                            mapId: data.spawn.mapId,
                            posX: data.spawn.posX,
                            posY: data.spawn.posY,
                            direction: data.spawn.direction,
                        }))
                        if (typeof data.towerFloorReached === "number") {
                            setTowerFloorReached(data.towerFloorReached)
                        }
                        setToast(direction === "up" ? `Tu montes (étage ${data.floor}).` : `Tu descends (étage ${data.floor}).`)
                    } else {
                        setToast(data.reason || "Tu ne peux pas monter.")
                    }
                } catch (e) {
                    console.warn("[MapClient] tower/climb failed", e)
                    setToast("Erreur réseau, réessaie.")
                }
            })()
            return
        }

        // v3.8.1 — Arbre fruitier devant ?
        if (tile === "appleTree") {
            const tree = PEPITEVILLE_APPLE_TREES.find((t) => t.x === front.x && t.y === front.y)
            if (tree) {
                ; (async () => {
                    try {
                        const res = await fetch("/api/gamebook/take-fruit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ treeId: tree.id }),
                        })
                        const data = await res.json()
                        if (data.ok) {
                            if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                            if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                            // v3.8.1 hybride — sync local des compteurs pour le rendu visuel
                            if (data.fruitsTaken && typeof data.fruitsTaken === "object") {
                                const counts = (data.fruitsTaken as { counts?: Record<string, number> }).counts
                                if (counts && typeof counts === "object") {
                                    setFruitCounts({ ...counts })
                                }
                            }
                            const remaining = typeof data.remaining === "number" ? data.remaining : 0
                            setToast(`Tu cueilles un fruit. +${data.reward} reps. (Reste ${remaining}/3 sur cet arbre)`)
                        } else {
                            setToast(data.reason || "L'arbre ne donne rien.")
                        }
                    } catch (e) {
                        console.warn("[MapClient] take-fruit failed", e)
                        setToast("Erreur réseau, réessaie.")
                    }
                })()
                return
            }
        }

        if (tile === "machineSquat") return doExercise("Squats")
        if (tile === "machinePushup") return doExercise("Pompes")
        if (tile === "machinePullup") return doExercise("Tractions")
        if (tile === "machineCardio") return doExercise("Cardio")
        if (tile === "machineGainage") return doExercise("Gainage")
        if (tile === "table") return setPopup({ kind: "info", text: "Table de jeu.\n\nDes parieurs s'agitent. Pas pour toi pour l'instant." })
        if (tile === "slotMachine") return setPopup({ kind: "info", text: "Machine à sous.\n\n*BIPS et CLINQ*\n\nÉlégamment hors de prix." })
        if (tile === "rouletteWheel") return setPopup({ kind: "info", text: "Roulette.\n\nLa boule tourne. Tu n'as rien à miser. Tant mieux pour toi." })
        if (tile === "bookshelf") return setPopup({ kind: "info", text: "Une bibliothèque.\n\nDes livres sur la pasta, la physique des nouilles, l'art du sarcasme." })
        if (tile === "potion") return setPopup({ kind: "info", text: "Une potion d'énergie.\n\n[Bientôt : tu pourras en acheter pour stocker tes reps.]" })
        if (tile === "monsterDesk") return setPopup({ kind: "info", text: "Le bureau du Monstre.\n\nDes parchemins, un encrier renversé, une fiole de sauce." })

        setToast("Rien d'intéressant.")
    }, [state, map, buildings, otherPlayersOnThisMap, popup, cinematic, npcsWithPos, triggerNpcDialogue, triggerBridgePnjChallenge, reps, broadcast, hasBag, showStartMenu, showInventory, showShop, showPlayerMap, showTamagotchi, showBibliotheque, nickname])

    // ============================================================
    // EXERCICES (la salle de muscu : pour l'instant juste un texte)
    // ============================================================
    const doExercise = (name: string) => {
        setPopup({
            kind: "exercise",
            text: `${name.toUpperCase()}\n\nPour gagner de l'énergie, fais tes vraies reps dans l'onglet "Saisie" de PushQuest.\n\nRecharge ensuite cette page.`,
        })
    }

    // ============================================================
    // POUSSER UN AUTRE JOUEUR
    // ============================================================
    const handlePushAttempt = (target: PlayerSnapshot) => {
        if (state.phase !== "playing") {
            setPopup({
                kind: "ghost",
                text: `${target.nickname}${target.todayRank ? ` · #${target.todayRank} du jour (${target.todayReps} reps)` : ""}\n\nDernière visite : ${target.lastSeenAgo}\n\n(Tu pourras le pousser après l'intro du Monstre.)`,
            })
            return
        }
        // v3.10 — coût ajusté selon le ratio
        // v3.17 — + discount social Lunettes
        const ratioPushCostForPlayer = applyDifficultyRatio(COST_PUSH)
        const adjustedPushCostForPlayer = applySocialDiscount(ratioPushCostForPlayer, inventory)
        if (reps < adjustedPushCostForPlayer) {
            setPopup({
                kind: "ghost",
                text: `${target.nickname}\n\nIl te bloque le passage.\n\nIl faut ${adjustedPushCostForPlayer} reps pour le pousser. Tu en as ${reps}.`,
            })
            return
        }
        // Calculer où il peut aller
        const newTarget = computePushTarget(
            target.posX,
            target.posY,
            state.direction,
            map,
            buildings,
            otherPlayersOnThisMap
                .filter((p) => p.id !== target.id)
                .map((p) => ({ x: p.posX, y: p.posY }))
        )
        if (!newTarget) {
            setToast(`${target.nickname} ne peut pas reculer plus.`)
            return
        }
        // Appliquer : débit local + persistance serveur (coût ajusté v3.10)
        setReps((r) => r - adjustedPushCostForPlayer)
        spendEnergy(adjustedPushCostForPlayer, "push_player").catch(() => {/* silent */ })
        setOtherPlayers((ps) =>
            ps.map((p) => (p.id === target.id ? { ...p, posX: newTarget.x, posY: newTarget.y } : p))
        )
        setToast(`Tu pousses ${target.nickname}. -${adjustedPushCostForPlayer} reps.`)
        // v3.4b : broadcast Pusher
        broadcast({
            type: "player:push",
            mapId: state.mapId,
            targetUserId: target.id,
        })
    }

    // ============================================================
    // CLAVIER (debug PC)
    // ============================================================
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // v3.8 — si une modal est ouverte, on ne gère pas les touches ici
            // (StartMenu/InventoryModal/ShopModal/PlayerMapModal écoutent leurs propres events)
            if (showStartMenu || showInventory || showShop || showPlayerMap || showTamagotchi || showBibliotheque || showBestioleNaming || showCasino || showFastTravel) return

            if (state.phase === "introMonster") {
                if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "a") {
                    e.preventDefault()
                    pressA()
                }
                return
            }
            if (popup) {
                if (e.key === "Enter" || e.key === " " || e.key === "Escape" || e.key.toLowerCase() === "a") {
                    e.preventDefault()
                    setPopup(null)
                }
                return
            }
            if (e.key === "ArrowUp") { e.preventDefault(); tryMove("up") }
            if (e.key === "ArrowDown") { e.preventDefault(); tryMove("down") }
            if (e.key === "ArrowLeft") { e.preventDefault(); tryMove("left") }
            if (e.key === "ArrowRight") { e.preventDefault(); tryMove("right") }
            if (e.key.toLowerCase() === "a" || e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                pressA()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [state.phase, popup, tryMove, pressA, showStartMenu, showInventory, showShop, showPlayerMap, showTamagotchi, showBibliotheque])

    // ============================================================
    // RESET
    // ============================================================
    const handleReset = async () => {
        if (!confirm("Réinitialiser ta position dans le Gamebook ?")) return
        await fetch("/api/gamebook/state", { method: "DELETE" })
        window.location.reload()
    }

    // ============================================================
    // RENDU
    // ============================================================
    if (errorMsg) {
        return (
            <div style={{ padding: 20, color: "#fff", background: "#111", minHeight: "100vh" }}>
                <p>Erreur : {errorMsg}</p>
                <Link href="/" style={{ color: "#9bf" }}>Retour</Link>
            </div>
        )
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                background: "#111",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "6px",
                fontFamily: "'Courier New', monospace",
                gap: "6px",
                boxSizing: "border-box",
                userSelect: "none",
            }}
        >
            <style jsx global>{`
                @keyframes gbBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0.3; } }
                @keyframes bobUp { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
                @keyframes pulseSign { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
                @keyframes monsterAppear { 0% { opacity: 0; transform: translateY(-20px) scale(0.5); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes flowerSway { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
                @keyframes ghostFloat { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
            `}</style>

            {/* HUD TOP */}
            <div
                style={{
                    width: "min(94vw, 380px)",
                    background: "#2a2a2a",
                    border: "2px solid #555",
                    padding: "5px 10px",
                    color: "#fff",
                    fontSize: "10px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    letterSpacing: "1px",
                }}
            >
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <Link href="/" style={{ color: "#9bf", textDecoration: "none" }}>
                        <ArrowLeft size={12} />
                    </Link>
                    <span style={{ fontWeight: "bold" }}>📍 {map.name}</span>
                </div>
                {state.phase === "playing" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>⚡</span>
                        <strong style={{ color: reps < 10 ? "#f80" : "#fff" }}>{reps}</strong>
                        <span style={{ opacity: 0.6, fontSize: "8px" }}>/ {totalRepsToday}</span>
                    </div>
                ) : (
                    <div style={{ opacity: 0.6, fontSize: "9px" }}>EXPLORATION</div>
                )}
            </div>

            {/* v3.23b — Jauge cadence (BPM) visible uniquement sur le Mont Pasta-Ventoux */}
            {state.mapId === "mont_pasta_ventoux" && (() => {
                const bpm = computeCadenceBPM(cadenceClicks)
                const mult = cadenceCostMultiplier(bpm)
                const zoneColor =
                    mult === 0.5 ? "#4cd964" :
                        mult === 1.5 ? "#ffd43b" :
                            "#ff5252"
                const zoneLabel =
                    mult === 0.5 ? "IDÉAL ×0.5" :
                        mult === 1.5 ? (bpm < 60 ? "TROP LENT ×1.5" : "TROP RAPIDE ×1.5") :
                            (bpm < 30 ? "ÉPUISEMENT ×3" : "EXPLOSION ×3")
                // Position du curseur sur l'échelle 0-130 BPM (clampée)
                const cursorPct = Math.max(0, Math.min(100, (Math.min(bpm, 130) / 130) * 100))
                return (
                    <div
                        style={{
                            width: "min(94vw, 380px)",
                            background: "#1f1f1f",
                            border: "2px solid #555",
                            borderTop: "none",
                            padding: "6px 10px",
                            color: "#fff",
                            fontSize: "10px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontWeight: "bold" }}>🚴 CADENCE</span>
                            <span style={{ fontWeight: "bold", color: zoneColor }}>{bpm} BPM</span>
                            <span style={{ fontSize: "9px", color: zoneColor }}>{zoneLabel}</span>
                        </div>
                        {/* Barre de zones : rouge 0-30 / orange 30-60 / vert 60-80 / orange 80-100 / rouge 100-130 */}
                        <div style={{ position: "relative", height: 10, borderRadius: 2, overflow: "hidden", display: "flex" }}>
                            <div style={{ width: `${(30 / 130) * 100}%`, background: "#ff5252" }} />
                            <div style={{ width: `${(30 / 130) * 100}%`, background: "#ffd43b" }} />
                            <div style={{ width: `${(20 / 130) * 100}%`, background: "#4cd964" }} />
                            <div style={{ width: `${(20 / 130) * 100}%`, background: "#ffd43b" }} />
                            <div style={{ width: `${(30 / 130) * 100}%`, background: "#ff5252" }} />
                            {/* Curseur */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: -2,
                                    left: `${cursorPct}%`,
                                    width: 2,
                                    height: 14,
                                    background: "#fff",
                                    boxShadow: "0 0 4px rgba(255,255,255,0.8)",
                                    transform: "translateX(-1px)",
                                }}
                            />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8px", color: "#888", marginTop: 2 }}>
                            <span>0</span>
                            <span>30</span>
                            <span>60</span>
                            <span style={{ color: "#4cd964" }}>80</span>
                            <span>100</span>
                            <span>130</span>
                        </div>
                    </div>
                )
            })()}

            {/* ÉCRAN */}
            <div
                style={{
                    background: "#222",
                    padding: "5px",
                    borderRadius: "4px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
                    position: "relative",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        background: state.mapId === "cave" ? "#a89888" : "#7bb858",
                        overflow: "hidden",
                        border: "2px solid #000",
                    }}
                >
                    {/* Grille */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))`,
                            gridTemplateRows: `repeat(${map.height}, 1fr)`,
                            width: "min(94vw, 380px)",
                            aspectRatio: `${map.width} / ${map.height}`,
                        }}
                    >
                        {map.tiles.map((row, y) =>
                            row.map((tile, x) => {
                                // v3.8.1 — arbre fruitier déjà cueilli 3 fois aujourd'hui par cet user
                                // → on rend la variante "vide" (sans fruits). Compteur perso, visuel perso.
                                let effectiveTile = tile
                                if (tile === "appleTree") {
                                    const tree = PEPITEVILLE_APPLE_TREES.find((t) => t.x === x && t.y === y)
                                    if (tree && (fruitCounts[tree.id] ?? 0) >= 3) {
                                        effectiveTile = "appleTreeEmpty"
                                    }
                                }
                                return <TileCell key={`${x}-${y}`} tile={effectiveTile} x={x} y={y} />
                            })
                        )}
                    </div>

                    {/* Bâtiments (Bourg-Boulette + Pépiteville — v3.8) */}
                    {buildings.map((b) =>
                        b.visible ? (
                            <BuildingSprite
                                key={`${b.kind}-${b.x}-${b.y}`}
                                building={b}
                                mapW={map.width}
                                mapH={map.height}
                            />
                        ) : null
                    )}

                    {/* Panneaux (Bourg-Boulette + Pépiteville — v3.8) */}
                    {signs.map((s, i) => (
                        <SignSpriteR key={`sign-${i}-${s.x}-${s.y}`} x={s.x} y={s.y} mapW={map.width} mapH={map.height} />
                    ))}

                    {/* Autres joueurs */}
                    {otherPlayersOnThisMap.map((g) => (
                        <GhostSpriteR
                            key={g.id}
                            ghost={g}
                            animStep={animStep}
                            mapW={map.width}
                            mapH={map.height}
                            color={colorForUser(g.id)}
                        />
                    ))}

                    {/* PNJ du pont (Route 1 uniquement) */}
                    {state.mapId === "route1" &&
                        BRIDGE_PNJS.map((pnj) => {
                            // v3.5 : vaincu = pour toujours (dimmed définitivement)
                            const defeatedForever = (state.bridgePnjDefeated ?? []).includes(pnj.id)
                            return (
                                <BridgePnjSprite
                                    key={pnj.id}
                                    pnj={pnj}
                                    mapW={map.width}
                                    mapH={map.height}
                                    animStep={animStep}
                                    dimmed={defeatedForever}
                                    direction={pnj.facing}
                                />
                            )
                        })}

                    {/* === v3.3 : NPCs sur la map courante === */}
                    {npcsWithPos.map((n) => (
                        <NpcSprite
                            key={n.npc.id}
                            npc={n.npc}
                            x={n.x}
                            y={n.y}
                            direction={n.direction}
                            mapW={map.width}
                            mapH={map.height}
                            animStep={animStep}
                        />
                    ))}

                    {/* Monstre pendant intro */}
                    {state.phase === "introMonster" &&
                        state.introStep < INTRO_STEP_TELEPORT_TO_CAVE + 1 &&
                        state.mapId === "bourgpates" && (
                            <MonsterSpriteR x={state.posX} y={state.posY - 1} mapW={map.width} mapH={map.height} />
                        )}

                    {/* Monstre pendant cinématique pionnier (sur Route 1, près de l'arbre) */}
                    {cinematic?.kind === "pioneer" && state.mapId === "route1" && (
                        <MonsterSpriteR x={state.posX} y={state.posY - 1} mapW={map.width} mapH={map.height} />
                    )}

                    {/* Joueur principal */}
                    <PlayerOnMap
                        x={state.posX}
                        y={state.posY}
                        direction={state.direction}
                        animStep={animStep}
                        mapW={map.width}
                        mapH={map.height}
                        hasLunettes={hasIntactLunettes(inventory)}
                    />

                    {/* v3.19b — Compagnon tamagotchi (visible si récupéré, outdoor maps uniquement) */}
                    {tamagotchi?.recovered && OUTDOOR_MAP_IDS.has(state.mapId) && (() => {
                        const details = getLevelDetails(tamagotchi.displayLevel ?? tamagotchi.currentLevel)
                        // Position : 1 case derrière le joueur (selon direction)
                        let cx = state.posX
                        let cy = state.posY
                        if (state.direction === "up") cy = state.posY + 1
                        else if (state.direction === "down") cy = state.posY - 1
                        else if (state.direction === "left") cx = state.posX + 1
                        else if (state.direction === "right") cx = state.posX - 1
                        // Clamp dans la map (sinon on l'affiche pas)
                        if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) return null
                        return (
                            <div
                                style={{
                                    position: "absolute",
                                    left: `${(cx / map.width) * 100}%`,
                                    top: `${(cy / map.height) * 100}%`,
                                    width: `${(1 / map.width) * 100}%`,
                                    height: `${(1 / map.height) * 100}%`,
                                    zIndex: 9,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    pointerEvents: "none",
                                    transition: "left 0.15s, top 0.15s",
                                    fontSize: "calc(min(100%, 1.4em))",
                                }}
                                title={`${tamagotchi.name} (${details.name})`}
                            >
                                <span style={{ fontSize: "70%", lineHeight: 1 }}>{details.emoji}</span>
                            </div>
                        )
                    })()}

                    {/* Scanlines */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backgroundImage:
                                "repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)",
                            pointerEvents: "none",
                        }}
                    />

                    {/* TOAST */}
                    {toast && (
                        <div
                            style={{
                                position: "absolute",
                                top: "6px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                background: "rgba(0,0,0,0.85)",
                                color: "#fff",
                                padding: "4px 10px",
                                fontSize: "10px",
                                borderRadius: "3px",
                                maxWidth: "90%",
                            }}
                        >
                            {toast}
                        </div>
                    )}

                    {/* DIALOGUE INTRO */}
                    {state.phase === "introMonster" && (
                        <DialogueBox
                            speaker="MONSTRE SPAGHETTI"
                            text={MONSTER_INTRO_DIALOGUE[state.introStep]}
                            onNext={pressA}
                        />
                    )}

                    {/* DIALOGUE PIONNIER (après l'arbre) */}
                    {cinematic?.kind === "pioneer" && (
                        <DialogueBox
                            speaker="MONSTRE SPAGHETTI"
                            text={MONSTER_PIONEER_DIALOGUE[cinematic.step]}
                            onNext={pressA}
                        />
                    )}

                    {/* === v3.3 : DIALOGUE NPC === */}
                    {cinematic?.kind === "npcDialogue" && (
                        <DialogueBox
                            speaker={cinematic.npcName}
                            text={cinematic.lines[cinematic.step]}
                            onNext={pressA}
                        />
                    )}

                    {/* === v3.8 : DIALOGUE PEPITO (offre le sac) === */}
                    {cinematic?.kind === "pepitoBag" && (
                        <DialogueBox
                            speaker="PEPITO"
                            text={PEPITO_DIALOGUE_FIRST[cinematic.step]}
                            onNext={pressA}
                        />
                    )}

                    {/* === v3.11 : DIALOGUE PIAFFINI (rencontre au sommet) === */}
                    {cinematic?.kind === "piaffini" && cinematic.stage === "dialog" && (
                        <DialogueBox
                            speaker="PIAFFINI"
                            text={PIAFFINI_RESCUE_DIALOGUE[cinematic.step]}
                            onNext={pressA}
                        />
                    )}

                    {/* === v3.17d : CINÉMATIQUE LUNETTES CASSÉES (trip → fall → broken) === */}
                    {cinematic?.kind === "lunettesBreak" && (
                        <DialogueBox
                            speaker="🕶️"
                            text={
                                cinematic.step === 0
                                    ? "*Tu trébuches sur une pierre invisible.*"
                                    : cinematic.step === 1
                                        ? "*Tes lunettes glissent et tombent par terre dans un cliquetis.*"
                                        : "*Elles sont brisées net. Plus de classe, plus de discount.*"
                            }
                            onNext={pressA}
                        />
                    )}

                    {/* POPUP */}
                    {popup && <PopupBox text={popup.text} onClose={() => setPopup(null)} />}
                </div>
            </div>

            {/* CONTROLS */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 48px)",
                        gridTemplateRows: "repeat(3, 48px)",
                        gap: "3px",
                    }}
                >
                    <div />
                    <DPad dir="up" onPress={() => tryMove("up")} active={state.direction === "up"} />
                    <div />
                    <DPad dir="left" onPress={() => tryMove("left")} active={state.direction === "left"} />
                    <div style={{ background: "#222", border: "2px solid #555" }} />
                    <DPad dir="right" onPress={() => tryMove("right")} active={state.direction === "right"} />
                    <div />
                    <DPad dir="down" onPress={() => tryMove("down")} active={state.direction === "down"} />
                    <div />
                </div>

                {/* v3.8 — Bouton START (gris, plus petit, à gauche du A). Désactivé si pas encore de sac. */}
                <button
                    onClick={(e) => {
                        e.preventDefault()
                        if (hasBag) setShowStartMenu(true)
                    }}
                    onTouchStart={(e) => {
                        e.preventDefault()
                        if (hasBag) setShowStartMenu(true)
                    }}
                    disabled={!hasBag}
                    style={{
                        background: hasBag ? "#666" : "#3a3a3a",
                        color: hasBag ? "#fff" : "#777",
                        border: "2px solid #fff",
                        width: "44px",
                        height: "44px",
                        fontSize: "8px",
                        fontFamily: "'Courier New', monospace",
                        fontWeight: "bold",
                        letterSpacing: 1,
                        cursor: hasBag ? "pointer" : "not-allowed",
                        touchAction: "manipulation",
                        userSelect: "none",
                        borderRadius: "50%",
                        boxShadow: hasBag ? "0 3px 0 #333, 0 4px 8px rgba(0,0,0,0.4)" : "none",
                        opacity: hasBag ? 1 : 0.55,
                    }}
                    title={hasBag ? "Ouvrir le menu" : "Trouve un sac d'abord."}
                >
                    START
                </button>

                <button
                    onClick={(e) => { e.preventDefault(); pressA() }}
                    onTouchStart={(e) => { e.preventDefault(); pressA() }}
                    style={{
                        background: "#c83838",
                        color: "#fff",
                        border: "3px solid #fff",
                        width: "60px",
                        height: "60px",
                        fontSize: "22px",
                        fontFamily: "'Courier New', monospace",
                        fontWeight: "bold",
                        cursor: "pointer",
                        touchAction: "manipulation",
                        userSelect: "none",
                        borderRadius: "50%",
                        boxShadow: "0 4px 0 #882020, 0 6px 12px rgba(0,0,0,0.5)",
                    }}
                >
                    A
                </button>
            </div>

            {/* v3.8 — Modals : StartMenu, InventoryModal, ShopModal */}
            {showStartMenu && (
                <StartMenu
                    onSelect={(entry) => {
                        if (entry === "bag") {
                            setShowStartMenu(false)
                            setShowInventory(true)
                        } else if (entry === "travel") {
                            setShowStartMenu(false)
                            setShowFastTravel(true)
                        }
                    }}
                    onClose={() => setShowStartMenu(false)}
                />
            )}

            {/* v3.22 — Modal fast travel (villes débloquées) */}
            {showFastTravel && (
                <FastTravelModal
                    visitedTowns={(state as { visitedTowns?: string[] }).visitedTowns ?? []}
                    currentMapId={state.mapId}
                    onTravel={async (townId) => {
                        try {
                            const res = await fetch("/api/gamebook/travel", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ townId }),
                            })
                            const data = await res.json()
                            if (data.ok && data.spawn) {
                                setState((s) => ({
                                    ...s,
                                    mapId: data.spawn.mapId,
                                    posX: data.spawn.posX,
                                    posY: data.spawn.posY,
                                    direction: data.spawn.direction,
                                }))
                                setShowFastTravel(false)
                                setToast(`Voyage rapide effectué.`)
                            } else if (data.reason) {
                                setToast(data.reason)
                            }
                        } catch (e) {
                            console.warn("[MapClient] travel failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onClose={() => setShowFastTravel(false)}
                />
            )}
            {showInventory && (
                <InventoryModal
                    inventory={inventory}
                    availableEnergy={reps}
                    onView={(_itemKey, kind) => {
                        if (kind === "playerMap") {
                            setShowInventory(false)
                            setShowPlayerMap(true)
                        }
                        // v3.17 — "treasureMap" : la carte aux trésors n'a pas de modal dédié,
                        // elle agit passivement (marker visuel quand on entre dans le casino).
                        // On affiche juste un hint à l'utilisateur.
                        if (kind === "treasureMap") {
                            setToast("La carte indique des lieux. Va explorer les casinos avec attention.")
                        }
                    }}
                    onUse={async (itemKey, action, amount) => {
                        try {
                            const res = await fetch("/api/gamebook/inventory/use", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ itemKey, action, amount }),
                            })
                            const data = await res.json()
                            if (data.ok) {
                                if (Array.isArray(data.inventory)) setInventory(data.inventory)
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                            } else {
                                setToast(data.reason || "Action impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] inventory/use failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onClose={() => setShowInventory(false)}
                />
            )}
            {/* v3.8.3 — Carte des joueurs */}
            {showPlayerMap && (
                <PlayerMapModal onClose={() => setShowPlayerMap(false)} />
            )}

            {/* v3.18 — Modal de la bibliothèque (BIBLIO) */}
            {showBibliotheque && (
                <BibliothequeModal
                    currentPlayerTamagotchi={tamagotchi}
                    onClose={() => setShowBibliotheque(false)}
                />
            )}

            {/* v3.21 — Mini-jeu casino roulette rouge/noir */}
            {showCasino && (
                <CasinoModal
                    availableEnergy={reps}
                    isLucky={(state as { lastLuckTalkDate?: string }).lastLuckTalkDate === new Date().toISOString().slice(0, 10)}
                    betsToday={(state as { casinoBetsToday?: number }).casinoBetsToday ?? 0}
                    maxBets={10}
                    onBet={async (color) => {
                        try {
                            const res = await fetch("/api/gamebook/casino/bet", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ color }),
                            })
                            const data = await res.json()
                            if (data.ok) {
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setState((s) => ({ ...s, casinoBetsToday: data.betsToday } as PlayerMapState))
                                return data
                            } else {
                                return { error: data.reason || "Pari impossible." }
                            }
                        } catch {
                            return { error: "Erreur réseau, réessaie." }
                        }
                    }}
                    onClose={() => setShowCasino(false)}
                />
            )}

            {/* v3.19b — Modal nommage des bestioles (première rencontre) */}
            {showBestioleNaming && (
                <BestioleNamingModal
                    onClose={() => setShowBestioleNaming(false)}
                    onSubmit={async (name) => {
                        try {
                            const res = await fetch("/api/gamebook/bestiole/encounter", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name }),
                            })
                            const data = await res.json()
                            if (data.ok) {
                                setState((s) => ({
                                    ...s,
                                    bestiolesFirstEncountered: true,
                                    bestiolesSpeciesName: data.speciesName ?? name,
                                }))
                                setToast(data.message || `Tu nommes l'espèce "${name}".`)
                            } else if (data.reason) {
                                setToast(data.reason)
                            }
                        } catch (e) {
                            console.warn("[MapClient] bestiole/encounter (naming) failed", e)
                            setToast("Erreur réseau, réessaie.")
                        } finally {
                            setShowBestioleNaming(false)
                        }
                    }}
                />
            )}

            {/* v3.14 — Modal du vétérinaire (V3T) : Tamagotchi */}
            {showTamagotchi && (
                <TamagotchiModal
                    tamagotchi={tamagotchi}
                    availableEnergy={reps}
                    onAdopt={async (name) => {
                        try {
                            const res = await fetch("/api/gamebook/tamagotchi/adopt", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ name }),
                            })
                            const data = await res.json()
                            if (data.ok) {
                                if (data.tamagotchi) setTamagotchi(data.tamagotchi)
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setToast(`Tu adoptes ${data.tamagotchi?.name ?? "ton tamagotchi"}.`)
                            } else {
                                setToast(data.reason || "Adoption impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] tamagotchi/adopt failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onFeed={async () => {
                        try {
                            const res = await fetch("/api/gamebook/tamagotchi/feed", { method: "POST" })
                            const data = await res.json()
                            if (data.ok) {
                                if (data.tamagotchi) setTamagotchi(data.tamagotchi)
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                            } else {
                                setToast(data.reason || "Nourrissage impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] tamagotchi/feed failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onCheckDefis={async () => {
                        try {
                            const res = await fetch("/api/gamebook/tamagotchi/check-defis", { method: "POST" })
                            const data = await res.json()
                            if (data.ok) {
                                if (data.tamagotchi) setTamagotchi(data.tamagotchi)
                                const newlyDone: number[] = Array.isArray(data.newlyCompleted) ? data.newlyCompleted : []
                                if (newlyDone.length > 0) {
                                    setToast(`✨ ${newlyDone.length} défi(s) validé(s) !`)
                                } else {
                                    setToast("Aucun nouveau défi validé pour l'instant.")
                                }
                            } else {
                                setToast(data.reason || "Vérification impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] tamagotchi/check-defis failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onLiberer={async () => {
                        try {
                            const res = await fetch("/api/gamebook/tamagotchi/liberer", { method: "POST" })
                            const data = await res.json()
                            if (data.ok) {
                                if (data.tamagotchi) setTamagotchi(data.tamagotchi)
                                setToast(`🎉 Ton animal te suit désormais ! +${data.xp ?? 100} XP (Badge Animal Totem)`)
                            } else {
                                setToast(data.reason || "Libération impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] tamagotchi/liberer failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onClose={() => setShowTamagotchi(false)}
                />
            )}

            {/* v3.11 — Cinématique vol PIAFFINI vers Bourg-Boulette */}
            {cinematic?.kind === "piaffini" && cinematic.stage === "flight" && (
                <PiaffiniFlightScreen
                    onDone={async () => {
                        try {
                            const res = await fetch("/api/gamebook/piaffini/rescue", { method: "POST" })
                            const data = await res.json()
                            if (data.ok && data.spawn) {
                                // Téléport + flag piaffiniRescued + ajout swim_set à l'inventaire local
                                setState((s) => ({
                                    ...s,
                                    mapId: data.spawn.mapId,
                                    posX: data.spawn.posX,
                                    posY: data.spawn.posY,
                                    direction: data.spawn.direction,
                                    piaffiniRescued: true,
                                }))
                                if (Array.isArray(data.inventory)) {
                                    setInventory(data.inventory)
                                }
                                setCinematic(null)
                                // Popup post-cinématique : JOJO accourt et explique le cadeau
                                if (!data.alreadyRescued) {
                                    setPopup({
                                        kind: "info",
                                        text: "JOJO accourt vers toi.\n\n\"Pioupiou ! Tu m'as ramené PIAFFINI ! Tiens, c'était le maillot et les palmes de ma grand-mère. Avec ça, tu pourras explorer les eaux du sud.\"\n\n(Tu reçois le Set de Nage 🏊 et 200 XP.)",
                                    })
                                }
                            } else {
                                console.warn("[MapClient] piaffini/rescue failed", data)
                                setCinematic(null)
                            }
                        } catch (e) {
                            console.warn("[MapClient] piaffini/rescue failed", e)
                            setCinematic(null)
                        }
                    }}
                />
            )}

            {showShop && (
                <ShopModal
                    inventory={inventory}
                    availableEnergy={reps}
                    nickname={nickname}
                    difficultyRatio={difficultyRatio}
                    shop={state.mapId === "shop_macaron" ? "trenette" : state.mapId === "bike_shop" ? "muscuville_bikes" : "nutripates"}
                    onBuy={async (itemKey) => {
                        try {
                            const res = await fetch("/api/gamebook/shop/buy", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ itemKey }),
                            })
                            const data = await res.json()
                            if (data.ok) {
                                if (Array.isArray(data.inventory)) setInventory(data.inventory)
                                if (typeof data.availableEnergy === "number") setReps(data.availableEnergy)
                                if (typeof data.energySpentToday === "number") setEnergySpent(data.energySpentToday)
                                setToast("NUTRIPATES note dans son carnet. \"Bon choix. Ou pas, on verra.\"")
                            } else {
                                setToast(data.reason || "Achat impossible.")
                            }
                        } catch (e) {
                            console.warn("[MapClient] shop/buy failed", e)
                            setToast("Erreur réseau, réessaie.")
                        }
                    }}
                    onClose={(purchaseMade) => {
                        setShowShop(false)
                        if (!purchaseMade) {
                            // v3.8.9 — sarcasme NUTRIPATES quand on ferme sans rien acheter
                            const sarcasms = [
                                "NUTRIPATES soupire. \"Tu reviendras quand tu sauras ce que tu veux.\"",
                                "NUTRIPATES : \"Encore un curieux. Au moins t'as fait l'aller-retour, c'est de l'exercice.\"",
                                "NUTRIPATES : \"Pas pressé ? Moi non plus, j'ai toute la décennie.\"",
                                "NUTRIPATES marmonne. \"On vient, on regarde, on repart. La vraie pâte, c'est de poser ses sous.\"",
                            ]
                            setToast(sarcasms[Math.floor(Math.random() * sarcasms.length)])
                        }
                    }}
                />
            )}

            {/* FOOTER DEBUG */}
            <div style={{ marginTop: "3px", display: "flex", gap: "8px", alignItems: "center" }}>
                <div style={{ color: "#666", fontSize: "9px", letterSpacing: "1px" }}>
                    {nickname} · ({state.posX},{state.posY}) · {state.phase}
                </div>
                <button
                    onClick={handleReset}
                    style={{
                        background: "transparent",
                        color: "#666",
                        border: "1px solid #666",
                        fontSize: "9px",
                        padding: "2px 6px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                        letterSpacing: "1px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                >
                    <RotateCcw size={9} /> RESET
                </button>
            </div>
        </div>
    )
}

// ============================================================
// SOUS-COMPOSANTS (couches absolues par-dessus la grille)
// ============================================================

function PlayerOnMap({
    x, y, direction, animStep, mapW, mapH, hasLunettes,
}: { x: number; y: number; direction: Direction; animStep: number; mapW: number; mapH: number; hasLunettes?: boolean }) {
    return (
        <div
            style={{
                position: "absolute",
                left: `${(x / mapW) * 100}%`,
                top: `${(y / mapH) * 100}%`,
                width: `${(1 / mapW) * 100}%`,
                height: `${(1 / mapH) * 100}%`,
                zIndex: 10,
                transition: "left 0.15s, top 0.15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <PlayerSprite direction={direction} animStep={animStep} color="#c83838" hasLunettes={hasLunettes} />
        </div>
    )
}

function GhostSpriteR({
    ghost, animStep, mapW, mapH, color,
}: { ghost: PlayerSnapshot; animStep: number; mapW: number; mapH: number; color: string }) {
    return (
        <div
            style={{
                position: "absolute",
                left: `${(ghost.posX / mapW) * 100}%`,
                top: `${(ghost.posY / mapH) * 100}%`,
                width: `${(1 / mapW) * 100}%`,
                height: `${(1 / mapH) * 100}%`,
                zIndex: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "ghostFloat 3s infinite ease-in-out",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "-32%",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    fontSize: "7px",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    whiteSpace: "nowrap",
                    fontFamily: "monospace",
                    pointerEvents: "none",
                    display: "flex",
                    gap: 3,
                    alignItems: "center",
                }}
            >
                <span>{ghost.emoji}</span>
                <span>{ghost.nickname}</span>
                {ghost.todayRank && ghost.todayRank <= 3 && (
                    <span style={{ color: "#ffd700" }}>#{ghost.todayRank}</span>
                )}
            </div>
            <PlayerSprite direction={ghost.direction} animStep={animStep} color={color} />
        </div>
    )
}

function MonsterSpriteR({
    x, y, mapW, mapH,
}: { x: number; y: number; mapW: number; mapH: number }) {
    const monsterPasta = "#f8e88c"
    const monsterSauce = "#d84030"
    return (
        <div
            style={{
                position: "absolute",
                left: `${(x / mapW) * 100}%`,
                top: `${(y / mapH) * 100}%`,
                width: `${(1 / mapW) * 100}%`,
                height: `${(1 / mapH) * 100}%`,
                zIndex: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                animation: "bobUp 1s infinite ease-in-out, monsterAppear 0.4s",
            }}
        >
            <div style={{ position: "relative", width: "90%", height: "90%" }}>
                <div style={{
                    position: "absolute", top: "10%", left: "20%", width: "60%", height: "60%",
                    background: monsterPasta, borderRadius: "50%", border: "1px solid #000",
                    boxShadow: `inset -2px -2px 0 ${monsterSauce}`,
                }}>
                    <div style={{ position: "absolute", top: "30%", left: "20%", width: "15%", height: "15%", background: "#000", borderRadius: "50%" }} />
                    <div style={{ position: "absolute", top: "30%", right: "20%", width: "15%", height: "15%", background: "#000", borderRadius: "50%" }} />
                    <div style={{ position: "absolute", bottom: "20%", left: "30%", width: "40%", height: "5%", background: monsterSauce, borderRadius: "50%" }} />
                </div>
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} style={{
                        position: "absolute", bottom: "10%", left: `${15 + i * 20}%`,
                        width: "8%", height: "30%", background: monsterPasta,
                        borderRadius: "0 0 4px 4px", border: "1px solid #000",
                        transform: `rotate(${(i - 1.5) * 8}deg)`,
                        transformOrigin: "top center",
                        animation: `bobUp ${1 + i * 0.2}s infinite ease-in-out`,
                    }} />
                ))}
            </div>
        </div>
    )
}

function BuildingSprite({
    building, mapW, mapH,
}: { building: Building; mapW: number; mapH: number }) {
    const left = `${(building.x / mapW) * 100}%`
    const top = `${(building.y / mapH) * 100}%`
    const width = `${(building.w / mapW) * 100}%`
    const height = `${(building.h / mapH) * 100}%`
    const doorLeft = `${((building.x + building.doorX) / mapW) * 100}%`
    const doorTop = `${((building.y + building.doorY) / mapH) * 100}%`
    const cellW = `${(1 / mapW) * 100}%`
    const cellH = `${(1 / mapH) * 100}%`

    if (building.kind === "monsterCave") {
        return (
            <div style={{
                position: "absolute", left, top, width, height,
                background: "#1f4818", border: "2px solid #000",
                borderRadius: "30% 30% 0 0",
                boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.6)",
                animation: "monsterAppear 0.8s",
            }}>
                <div style={{
                    position: "absolute", left: "30%", right: "30%", top: "50%", bottom: 0,
                    background: "#000", borderRadius: "40% 40% 0 0",
                }} />
            </div>
        )
    }

    // v3.8.2 — Tour des Pâtes Aiguës : sprite étroit et haut avec créneaux
    if (building.kind === "tower") {
        return (
            <>
                <div style={{ position: "absolute", left, top, width, height, display: "flex", flexDirection: "column" }}>
                    {/* Créneaux du toit */}
                    <div style={{
                        background: "transparent", height: "12%", position: "relative",
                        display: "flex", justifyContent: "space-around", alignItems: "flex-end",
                    }}>
                        <div style={{ background: "#5a5a6a", width: "18%", height: "100%", border: "1px solid #3a3a48" }} />
                        <div style={{ background: "#5a5a6a", width: "18%", height: "100%", border: "1px solid #3a3a48" }} />
                        <div style={{ background: "#5a5a6a", width: "18%", height: "100%", border: "1px solid #3a3a48" }} />
                        <div style={{ background: "#5a5a6a", width: "18%", height: "100%", border: "1px solid #3a3a48" }} />
                    </div>
                    {/* Corps de la tour : pierre grise avec ouvertures */}
                    <div style={{
                        background: "#7a7a8a", flex: 1, border: "2px solid #3a3a48", position: "relative",
                        backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 8px, rgba(0,0,0,0.15) 8px, rgba(0,0,0,0.15) 9px)",
                    }}>
                        {/* Petite fenêtre haute */}
                        <div style={{
                            position: "absolute", top: "15%", left: "40%", right: "40%", height: "12%",
                            background: "#88c8f0",
                            border: "1px solid #3a3a48",
                            borderRadius: "30% 30% 0 0",
                        }} />
                        {/* Plaque du nom */}
                        <div style={{
                            position: "absolute", top: "45%", left: "10%", right: "10%",
                            textAlign: "center", fontSize: "6px", color: "#2a2a38", fontWeight: "bold", letterSpacing: "0.5px",
                        }}>
                            TOUR
                        </div>
                    </div>
                </div>
                {/* Porte de la tour */}
                <div style={{
                    position: "absolute", left: doorLeft, top: doorTop, width: cellW, height: cellH,
                    background: "#603018", border: "1px solid #000", zIndex: 3,
                    borderRadius: "30% 30% 0 0",
                }}>
                    <div style={{
                        position: "absolute", right: "25%", top: "45%", width: "10%", height: "10%",
                        background: "#ffe838", borderRadius: "50%",
                    }} />
                </div>
            </>
        )
    }

    // v3.8 : kind="shop" → toit bleu + label SHOP
    // v3.13 : kind="veterinaire" → toit vert + label VÉTO
    // v3.15 : kind="bibliotheque" → toit violet + label BIBLIO
    // Sinon (gym, casino) → toit rouge classique
    // v3.22 : displayName custom (TRENETTE / VÉTO / BIBLIO...) + label rendu sur la DROITE en gros
    const isGym = building.kind === "gym"
    const isShop = building.kind === "shop"
    const isVet = building.kind === "veterinaire"
    const isBiblio = building.kind === "bibliotheque"
    const roofColor = isShop ? "#3060c0" : isVet ? "#48a868" : isBiblio ? "#8050a0" : "#c84838"
    const roofDarkColor = isShop ? "#1a3878" : isVet ? "#205838" : isBiblio ? "#502868" : "#883020"
    const fallbackLabel = isGym ? "MUSCU" : isShop ? "SHOP" : isVet ? "VÉTO" : isBiblio ? "BIBLIO" : "CASINO"
    const label = building.displayName ?? fallbackLabel
    return (
        <>
            <div style={{ position: "absolute", left, top, width, height, display: "flex", flexDirection: "column" }}>
                <div style={{
                    background: roofColor, height: "40%",
                    borderTop: `2px solid ${roofDarkColor}`, borderLeft: `2px solid ${roofDarkColor}`, borderRight: `2px solid ${roofDarkColor}`,
                    position: "relative",
                }}>
                    <div style={{
                        position: "absolute", inset: 0,
                        backgroundImage: `repeating-linear-gradient(90deg, transparent 0, transparent 6px, ${roofDarkColor} 6px, ${roofDarkColor} 7px)`,
                    }} />
                </div>
                <div style={{
                    background: "#f8e8b8", flex: 1, border: "2px solid #c8a868", position: "relative",
                }}>
                    <div style={{
                        position: "absolute", top: "20%", left: "15%", width: "20%", height: "30%",
                        background: "#5878d8", border: "1px solid #c8a868",
                        backgroundImage: "linear-gradient(90deg, transparent 49%, #c8a868 49%, #c8a868 51%, transparent 51%), linear-gradient(0deg, transparent 49%, #c8a868 49%, #c8a868 51%, transparent 51%)",
                    }} />
                    <div style={{
                        position: "absolute", top: "20%", right: "15%", width: "20%", height: "30%",
                        background: "#5878d8", border: "1px solid #c8a868",
                        backgroundImage: "linear-gradient(90deg, transparent 49%, #c8a868 49%, #c8a868 51%, transparent 51%), linear-gradient(0deg, transparent 49%, #c8a868 49%, #c8a868 51%, transparent 51%)",
                    }} />
                    {/* v3.22 — Label déporté à droite du bâtiment, fond blanc opaque pour lisibilité maximale */}
                    <div style={{
                        position: "absolute",
                        top: "55%",
                        left: "100%",
                        marginLeft: "4px",
                        background: "rgba(255, 255, 255, 0.95)",
                        color: roofDarkColor,
                        padding: "2px 6px",
                        fontSize: "12px",
                        fontWeight: 900,
                        letterSpacing: "1px",
                        whiteSpace: "nowrap",
                        border: `2px solid ${roofDarkColor}`,
                        borderRadius: "3px",
                        zIndex: 4,
                        pointerEvents: "none",
                    }}>
                        {label}
                    </div>
                </div>
            </div>
            <div style={{
                position: "absolute", left: doorLeft, top: doorTop, width: cellW, height: cellH,
                background: "#603018", border: "1px solid #000", zIndex: 3,
            }}>
                <div style={{
                    position: "absolute", right: "20%", top: "40%", width: "10%", height: "10%",
                    background: "#ffe838", borderRadius: "50%",
                }} />
            </div>
        </>
    )
}

function SignSpriteR({
    x, y, mapW, mapH,
}: { x: number; y: number; mapW: number; mapH: number }) {
    return (
        <div style={{
            position: "absolute",
            left: `${(x / mapW) * 100}%`,
            top: `${(y / mapH) * 100}%`,
            width: `${(1 / mapW) * 100}%`,
            height: `${(1 / mapH) * 100}%`,
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2,
        }}>
            <div style={{
                width: "70%", height: "70%", background: "#a07040", border: "1px solid #000",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "8px", color: "#fff", fontWeight: "bold",
                animation: "pulseSign 2s infinite",
            }}>!</div>
        </div>
    )
}

function DialogueBox({
    speaker, text, onNext,
}: { speaker: string; text: string; onNext: () => void }) {
    return (
        <div
            style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                right: "8px",
                background: "#fff",
                border: "3px solid #000",
                borderRadius: "6px",
                padding: "8px 10px",
                boxShadow: "0 0 0 1px #000, inset 0 0 0 1px #888",
                zIndex: 20,
                cursor: "pointer",
            }}
            onClick={(e) => { e.stopPropagation(); onNext() }}
        >
            <div style={{ fontSize: "8px", color: "#c83838", fontWeight: "bold", letterSpacing: "1px", marginBottom: "3px" }}>
                {speaker}
            </div>
            <div style={{ fontSize: "11px", color: "#000", lineHeight: "1.4", paddingRight: "20px" }}>
                {text}
            </div>
            <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "10px", color: "#000", animation: "gbBlink 0.7s infinite" }}>
                ▼ A
            </div>
        </div>
    )
}

function PopupBox({ text, onClose }: { text: string; onClose: () => void }) {
    return (
        <div
            style={{
                position: "absolute",
                bottom: "8px",
                left: "8px",
                right: "8px",
                background: "#fff",
                border: "3px solid #000",
                borderRadius: "6px",
                padding: "10px",
                zIndex: 20,
                cursor: "pointer",
            }}
            onClick={onClose}
        >
            <div style={{ fontSize: "10px", color: "#000", whiteSpace: "pre-wrap", lineHeight: "1.4" }}>
                {text}
            </div>
            <div style={{ position: "absolute", bottom: "4px", right: "8px", fontSize: "10px", color: "#000", animation: "gbBlink 0.7s infinite" }}>
                ▼ A
            </div>
        </div>
    )
}

function DPad({ dir, onPress, active }: { dir: Direction; onPress: () => void; active: boolean }) {
    const arrows: Record<Direction, string> = { up: "▲", down: "▼", left: "◀", right: "▶" }
    const pressedRef = useRef(false)
    const handleDown = (e: React.SyntheticEvent) => {
        e.preventDefault()
        if (pressedRef.current) return
        pressedRef.current = true
        onPress()
    }
    const handleUp = () => {
        pressedRef.current = false
    }
    return (
        <button
            onMouseDown={handleDown}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onTouchStart={handleDown}
            onTouchEnd={handleUp}
            onTouchCancel={handleUp}
            style={{
                background: active ? "#888" : "#444",
                border: active ? "2px solid #fff" : "2px solid #666",
                color: "#fff",
                fontSize: "18px",
                cursor: "pointer",
                fontFamily: "monospace",
                userSelect: "none",
                touchAction: "manipulation",
                padding: 0,
                borderRadius: "4px",
            }}
        >
            {arrows[dir]}
        </button>
    )
}

function BridgePnjSprite({
    pnj,
    mapW,
    mapH,
    animStep,
    dimmed,
    direction,
}: {
    pnj: { id: string; name: string; x: number; y: number; color: string }
    mapW: number
    mapH: number
    animStep: number
    dimmed: boolean
    direction: "left" | "right"
}) {
    return (
        <div
            style={{
                position: "absolute",
                left: `${(pnj.x / mapW) * 100}%`,
                top: `${(pnj.y / mapH) * 100}%`,
                width: `${(1 / mapW) * 100}%`,
                height: `${(1 / mapH) * 100}%`,
                zIndex: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: dimmed ? 0.4 : 1,
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "-32%",
                    background: "rgba(0,0,0,0.8)",
                    color: "#fff",
                    fontSize: "7px",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    whiteSpace: "nowrap",
                    fontFamily: "monospace",
                    pointerEvents: "none",
                    border: dimmed ? "1px solid #888" : "1px solid #ffd700",
                }}
            >
                {dimmed ? `${pnj.name} ✓` : `⚔ ${pnj.name}`}
            </div>
            <PlayerSprite direction={direction} animStep={animStep} color={pnj.color} />
        </div>
    )
}

function NpcSprite({
    npc,
    x,
    y,
    direction,
    mapW,
    mapH,
    animStep,
}: {
    npc: NpcDefinition
    x: number
    y: number
    direction: Direction
    mapW: number
    mapH: number
    animStep: number
}) {
    // v3.8.9 — Si le NPC définit un sprite.emoji, on l'affiche tel quel
    // (au lieu d'un sprite humain coloré). Utile pour PIAFFINI (🐦) et autres
    // créatures qui ne sont pas des humains.
    const hasEmoji = typeof npc.sprite.emoji === "string" && npc.sprite.emoji.length > 0

    return (
        <div
            style={{
                position: "absolute",
                left: `${(x / mapW) * 100}%`,
                top: `${(y / mapH) * 100}%`,
                width: `${(1 / mapW) * 100}%`,
                height: `${(1 / mapH) * 100}%`,
                zIndex: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "left 0.4s ease, top 0.4s ease",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: "-32%",
                    background: "rgba(0,0,0,0.7)",
                    color: "#fff",
                    fontSize: "7px",
                    padding: "1px 4px",
                    borderRadius: "2px",
                    whiteSpace: "nowrap",
                    fontFamily: "monospace",
                    pointerEvents: "none",
                    border: npc.interaction === "interceptor"
                        ? "1px solid #ffd700"
                        : "1px solid #88ccff",
                }}
            >
                {npc.interaction === "interceptor" ? `⚔ ${npc.name}` : `${npc.name}`}
            </div>
            {hasEmoji ? (
                <div
                    style={{
                        fontSize: "180%",
                        lineHeight: 1,
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                        animation: "bobUp 1.4s infinite ease-in-out",
                        userSelect: "none",
                    }}
                >
                    {npc.sprite.emoji}
                </div>
            ) : (
                <PlayerSprite direction={direction} animStep={animStep} color={npc.sprite.color} />
            )}
        </div>
    )
}
