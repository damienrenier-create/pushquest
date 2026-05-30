// Nexus II — détection des warps (transitions de map).
//
// Un warp se déclenche quand le joueur ARRIVE sur une case "exit".
// Les warps sont définis dans YELLOW_MAPS[mapId].exits — soit auto-générés
// depuis les bâtiments (porte → intérieur), soit explicites (doorMat → ext).
//
// Fonction pure : pas d'effet de bord, juste un lookup.

import type { YellowExit, YellowMapData } from "../maps"

export function findExitAt(map: YellowMapData, x: number, y: number): YellowExit | null {
    if (!map.exits) return null
    return map.exits.find((e) => e.x === x && e.y === y) ?? null
}
