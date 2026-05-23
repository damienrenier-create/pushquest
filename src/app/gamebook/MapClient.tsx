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
    BOOTS_MOVE_COST_REDUCTION,
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
import { parseInventory, hasIntactItem, type InventoryEntry } from "@/lib/gamebook/inventory"
import { PEPITO_DIALOGUE_FIRST } from "@/lib/gamebook/dialogue"

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
}

const GHOST_COLORS = ["#4080d8", "#d840a0", "#48a830", "#f08020", "#9050d0", "#d8c020", "#20a8c8"]

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
    // === v3.8.1 : fruits cueillis aujourd'hui (par CE user). Drive le rendu vide/plein des arbres. ===
    const [fruitCounts, setFruitCounts] = useState<Record<string, number>>(initialFruitCounts)
    // === v3.8.2 : plus haut étage atteint dans la Tour. Drive le bypass-check des escaliers. ===
    const [towerFloorReached, setTowerFloorReached] = useState<number>(initialTowerFloorReached)

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
                    : []

    // v3.8 — Signs selon la map courante
    const signs =
        state.mapId === "bourgpates" ? OUTDOOR_SIGNS
            : state.mapId === "pepiteville" ? PEPITEVILLE_SIGNS
                : state.mapId === "hautespates" ? HAUTESPATES_SIGNS
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
    // ============================================================
    const wanderTick = useWanderTicker()
    const npcsOnMap = getNpcsForMap(state.mapId)
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
            const lines = getNpcDialogue(npc, state.phase)
            setCinematic({
                kind: "npcDialogue",
                npcId: npc.id,
                npcName: npc.name,
                step: 0,
                lines,
                energyReward: npc.energyReward,
            })
        },
        [state.phase]
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
    // v3.4a : SPEND ENERGY (appel API serveur, source de vérité)
    // v3.8.1 : accepte un flag wearBoots pour décrémenter la durabilité des baskets côté serveur
    // ============================================================
    const spendEnergy = useCallback(async (amount: number, reason: string, wearBoots = false): Promise<boolean> => {
        if (amount <= 0) return true
        try {
            const res = await fetch("/api/gamebook/spend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, reason, wearBoots }),
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
            // v3.8.1 : resync inventory (usure baskets)
            if (Array.isArray(data.inventory)) {
                setInventory(data.inventory)
            }
            if (data.bootsBroken === true) {
                setToast("Tes baskets viennent de céder. Faut en racheter une paire.")
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

            const result = tryComputeMove(state, d, map, buildings, blockingPositions)

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
                    if (reps < COST_TREE_OBSTACLE) {
                        setToast(`L'arbre coûte ${COST_TREE_OBSTACLE} reps. T'en as ${reps}.`)
                        return
                    }
                    // Pousser l'arbre : on tente le débit côté serveur
                    ; (async () => {
                        const ok = await spendEnergy(COST_TREE_OBSTACLE, "tree_obstacle")
                        if (!ok) return
                        setState((s) => ({ ...s, treeObstacleCleared: true, direction: d }))
                        setToast(`Tu pousses l'arbre. -${COST_TREE_OBSTACLE} reps.`)
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
                    if (reps < COST_PUSH) {
                        setToast(`Pousser ${blockingNpc.npc.name} coûte ${COST_PUSH} reps. T'en as ${reps}.`)
                        return
                    }
                    // On consomme 30 reps via l'API serveur (source de vérité)
                    ; (async () => {
                        const ok = await spendEnergy(COST_PUSH, "push_npc")
                        if (!ok) return
                        setToast(`Tu pousses ${blockingNpc.npc.name}. -${COST_PUSH} reps.`)
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
            if (result.repsCost > 0) {
                // v3.8.1 — Si l'user a des baskets intactes, réduction de COST_MOVE
                const hasBoots = hasIntactItem(inventory, "boots")
                const adjustedCost = hasBoots
                    ? Math.max(0, result.repsCost - BOOTS_MOVE_COST_REDUCTION)
                    : result.repsCost
                // Débit local immédiat pour la fluidité
                setReps((r) => Math.max(0, r - adjustedCost))
                // Persistance serveur en arrière-plan (fire and forget, resync si échec)
                spendEnergy(adjustedCost, "move", hasBoots).catch(() => {/* silent */ })
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
        },
        [state, map, buildings, blockingPositions, reps, popup, cinematic, npcsWithPos, triggerNpcDialogue, triggerBridgePnjChallenge, broadcast, spendEnergy]
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
        if (showStartMenu || showInventory || showShop || showPlayerMap) return

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
            handlePushAttempt(ghostInFront)
            return
        }

        // === v3.3 : NPC devant ? ===
        const npcInFront = npcsWithPos.find((n) => n.x === front.x && n.y === front.y)
        if (npcInFront) {
            const npcId = npcInFront.npc.id
            // === v3.8 : interactions spéciales ===
            // PEPITO : si le sac n'a pas encore été donné, déclencher la cinématique d'offre
            if (npcId === "pepito" && !hasBag) {
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
    }, [state, map, buildings, otherPlayersOnThisMap, popup, cinematic, npcsWithPos, triggerNpcDialogue, triggerBridgePnjChallenge, reps, broadcast, hasBag, showStartMenu, showInventory, showShop, showPlayerMap])

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
        if (reps < COST_PUSH) {
            setPopup({
                kind: "ghost",
                text: `${target.nickname}\n\nIl te bloque le passage.\n\nIl faut ${COST_PUSH} reps pour le pousser. Tu en as ${reps}.`,
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
        // Appliquer : débit local + persistance serveur
        setReps((r) => r - COST_PUSH)
        spendEnergy(COST_PUSH, "push_player").catch(() => {/* silent */ })
        setOtherPlayers((ps) =>
            ps.map((p) => (p.id === target.id ? { ...p, posX: newTarget.x, posY: newTarget.y } : p))
        )
        setToast(`Tu pousses ${target.nickname}. -${COST_PUSH} reps.`)
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
            if (showStartMenu || showInventory || showShop || showPlayerMap) return

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
    }, [state.phase, popup, tryMove, pressA, showStartMenu, showInventory, showShop, showPlayerMap])

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
                    />

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
                        }
                    }}
                    onClose={() => setShowStartMenu(false)}
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

            {showShop && (
                <ShopModal
                    inventory={inventory}
                    availableEnergy={reps}
                    nickname={nickname}
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
    x, y, direction, animStep, mapW, mapH,
}: { x: number; y: number; direction: Direction; animStep: number; mapW: number; mapH: number }) {
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
            <PlayerSprite direction={direction} animStep={animStep} color="#c83838" />
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
    // Sinon (gym, casino) → toit rouge classique
    const isGym = building.kind === "gym"
    const isShop = building.kind === "shop"
    const roofColor = isShop ? "#3060c0" : "#c84838"
    const roofDarkColor = isShop ? "#1a3878" : "#883020"
    const label = isGym ? "MUSCU" : isShop ? "SHOP" : "CASINO"
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
                    <div style={{
                        position: "absolute", top: "55%", left: 0, right: 0,
                        textAlign: "center", fontSize: "7px", color: roofDarkColor, fontWeight: "bold", letterSpacing: "1px",
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
