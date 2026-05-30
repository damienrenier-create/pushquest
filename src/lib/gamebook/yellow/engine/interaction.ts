// Nexus II — moteur d'interaction (fonctions pures).
//
// Quand le joueur presse A, on regarde la tile DEVANT lui (selon sa direction).
// Si un NPC s'y trouve → on déclenche son dialogue. Logique stateless, juste
// du calcul de coordonnées + lookup dans la liste de NPCs.

import type { NpcDefinition } from "@/lib/gamebook/npcs"
import type { Direction, PlayerState } from "./types"

export interface TileCoord {
    x: number
    y: number
}

const FACING_DELTAS: Record<Direction, TileCoord> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
}

export function getFacingTile(player: PlayerState): TileCoord {
    const d = FACING_DELTAS[player.direction]
    return { x: player.posX + d.x, y: player.posY + d.y }
}

export function findNpcAt(npcs: NpcDefinition[], x: number, y: number, mapId: string): NpcDefinition | null {
    return npcs.find((n) => n.mapId === mapId && n.initialX === x && n.initialY === y) ?? null
}

export function getNpcInFrontOfPlayer(player: PlayerState, npcs: NpcDefinition[]): NpcDefinition | null {
    const tile = getFacingTile(player)
    return findNpcAt(npcs, tile.x, tile.y, player.mapId)
}
