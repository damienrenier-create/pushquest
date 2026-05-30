// Nexus II — moteur de mouvement (fonctions pures, zéro effet de bord).
//
// tryMove(player, dir, map) → nouveau PlayerState (immuable). Si la case
// cible est bloquante (mur, hors map, bâtiment hors-porte), le joueur tourne
// sur place mais ne se déplace pas — comportement standard Pokémon GBC.
//
// Note : on ne déclenche PAS le warp ici. Le store appelle findExitAt()
// après le move pour décider d'une éventuelle transition. Séparer le
// mouvement du warp permet de tester unitairement les deux indépendamment.

import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import type { YellowBuilding, YellowMapData } from "../maps"
import type { Direction, PlayerState } from "./types"

const DIR_DELTAS: Record<Direction, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
}

/** True si la case (x, y) est à l'intérieur d'un bâtiment ET pas sur sa porte. */
function isBuildingWall(buildings: YellowBuilding[] | undefined, x: number, y: number): boolean {
    if (!buildings) return false
    for (const b of buildings) {
        const inside = x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h
        if (!inside) continue
        const isDoor = x === b.x + b.doorX && y === b.y + b.doorY
        if (!isDoor) return true
    }
    return false
}

export function tryMove(player: PlayerState, dir: Direction, map: YellowMapData): PlayerState {
    const { dx, dy } = DIR_DELTAS[dir]
    const nx = player.posX + dx
    const ny = player.posY + dy

    // Hors carte : tourner mais ne pas avancer
    if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) {
        return { ...player, direction: dir }
    }

    // Tile bloquante (mur, arbre…)
    const tile = map.tiles[ny][nx]
    if (isBlockingTile(tile)) {
        return { ...player, direction: dir }
    }

    // Bâtiment : mur partout sauf à la porte
    if (isBuildingWall(map.buildings, nx, ny)) {
        return { ...player, direction: dir }
    }

    return { mapId: player.mapId, posX: nx, posY: ny, direction: dir }
}
