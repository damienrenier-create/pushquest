// Nexus II — store externe Zustand.
//
// Sépare l'état du jeu de React. Aucun composant ne possède le state ; ils
// le lisent via useGameStore(selector) qui ne re-render QUE le composant
// concerné (au lieu de tout l'arbre comme useState).
//
// Les actions (move, pressA…) appellent les fonctions pures du moteur et
// remplacent le state immuable. Tout est testable unitairement hors React.

import { create } from "zustand"
import type { MapData } from "@/lib/gamebook/mapEngine"
import type { Direction, PlayerState } from "../engine/types"
import { createInitialPlayer } from "../engine/types"
import { tryMove } from "../engine/movement"
import { getNpcInFrontOfPlayer } from "../engine/interaction"
import { YELLOW_MAPS } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"

export interface ActiveDialogue {
    npcId: string
    npcName: string
    lines: string[]
    lineIndex: number
}

interface GameStore {
    // === STATE ===
    player: PlayerState
    map: MapData
    dialogue: ActiveDialogue | null
    hydrated: boolean // true une fois que l'état serveur a été chargé

    // === ACTIONS ===
    move: (dir: Direction) => void
    pressA: () => void
    pressB: () => void
    setMap: (mapId: string, spawnX: number, spawnY: number) => void
    hydrate: (loaded: PlayerState) => void
}

// === PERSISTANCE SERVEUR ===
// Debounce 3s sur l'envoi : si le joueur bouge en rafale, on n'envoie QUE la
// dernière position après 3s d'inactivité. Limite drastiquement le trafic Neon.
let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave(player: PlayerState) {
    if (typeof window === "undefined") return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
        fetch("/api/gamebook/yellow/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                mapId: player.mapId,
                posX: player.posX,
                posY: player.posY,
                direction: player.direction,
            }),
        }).catch((e) => console.warn("[yellow] save failed", e))
    }, 3000)
}

// Spawn par défaut : bas-centre de yellow_entrance (14×12), face nord.
// Le joueur doit marcher vers le haut pour atteindre l'Architecte en (7, 2).
const DEFAULT_SPAWN = { x: 7, y: 10 }

export const useGameStore = create<GameStore>((set, get) => ({
    player: createInitialPlayer(YELLOW_ENTRANCE_MAP_ID, DEFAULT_SPAWN.x, DEFAULT_SPAWN.y, "up"),
    map: YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID],
    dialogue: null,
    hydrated: false,

    move: (dir) => {
        const { player, map, dialogue } = get()
        // Mouvement bloqué pendant un dialogue : le joueur doit fermer avant de bouger.
        if (dialogue) return
        const next = tryMove(player, dir, map)
        // Pas de changement (mur sans changement de direction) → on évite un save inutile
        const unchanged =
            next.posX === player.posX &&
            next.posY === player.posY &&
            next.direction === player.direction
        set({ player: next })
        if (!unchanged) scheduleSave(next)
    },

    pressA: () => {
        const { player, dialogue } = get()

        // Si un dialogue est ouvert : avancer à la ligne suivante (ou fermer si dernière).
        if (dialogue) {
            const nextIndex = dialogue.lineIndex + 1
            if (nextIndex >= dialogue.lines.length) {
                set({ dialogue: null })
            } else {
                set({ dialogue: { ...dialogue, lineIndex: nextIndex } })
            }
            return
        }

        // Sinon : chercher un NPC devant le joueur et déclencher son dialogue.
        const npc = getNpcInFrontOfPlayer(player, YELLOW_NPCS)
        if (!npc) return
        set({
            dialogue: {
                npcId: npc.id,
                npcName: npc.name,
                lines: npc.dialoguesAfter,
                lineIndex: 0,
            },
        })
    },

    pressB: () => {
        // B = quitter / annuler. Pour l'instant : ferme un dialogue ouvert.
        const { dialogue } = get()
        if (dialogue) set({ dialogue: null })
    },

    setMap: (mapId, spawnX, spawnY) => {
        const map = YELLOW_MAPS[mapId]
        if (!map) {
            console.warn(`[gameStore] Map inconnue : ${mapId}`)
            return
        }
        const player = createInitialPlayer(mapId, spawnX, spawnY)
        set({ map, player, dialogue: null })
        scheduleSave(player)
    },

    hydrate: (loaded) => {
        const map = YELLOW_MAPS[loaded.mapId] ?? YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID]
        set({ player: loaded, map, hydrated: true })
    },
}))
