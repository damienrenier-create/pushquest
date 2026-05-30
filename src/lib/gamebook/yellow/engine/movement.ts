// Nexus II — moteur de mouvement (fonctions pures, zéro effet de bord).
//
// tryMove(player, dir, map) → nouveau PlayerState (immuable). Si la case cible
// est bloquante (mur, hors map), le joueur tourne sur place mais ne se déplace
// pas — comportement standard Pokémon GBC.

import type { MapData } from "@/lib/gamebook/mapEngine"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import type { Direction, PlayerState } from "./types"

const DIR_DELTAS: Record<Direction, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
}

export function tryMove(player: PlayerState, dir: Direction, map: MapData): PlayerState {
    const { dx, dy } = DIR_DELTAS[dir]
    const nx = player.posX + dx
    const ny = player.posY + dy

    // Hors carte : tourner mais ne pas avancer (face vers le bord)
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        return { ...player, direction: dir }
    }

    const tile = map.tiles[ny][nx]
    if (isBlockingTile(tile)) {
        return { ...player, direction: dir }
    }

    return { mapId: player.mapId, posX: nx, posY: ny, direction: dir }
}
