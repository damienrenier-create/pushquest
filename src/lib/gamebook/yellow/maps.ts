// Nexus II "jaune éclair" — registre des maps de la suite narrative.
//
// Convention : tous les ids commencent par `yellow_` pour éviter toute collision
// avec les maps v3 (lasagnas_*, muscuville, macaronile, etc.).
//
// Phase scaffolding : une seule map d'entrée 14×12 (plus grande que le viewport
// 10×9 pour démontrer le scroll caméra style Pokémon). L'Architecte se trouve
// en haut, le joueur spawn en bas — il doit marcher vers lui en voyant la map
// défiler sous lui.

import type { MapData, TileType } from "@/lib/gamebook/mapEngine"
import { YELLOW_ENTRANCE_MAP_ID } from "./featureFlag"

// === yellow_entrance : salle d'attente 14×12 avec colonnes décoratives ===
// Plus grande que le viewport (10×9) pour démontrer la caméra qui suit le joueur.
function buildYellowEntrance(): TileType[][] {
    const W = 14, H = 12
    const m: TileType[][] = []
    for (let y = 0; y < H; y++) {
        const row: TileType[] = []
        for (let x = 0; x < W; x++) {
            if (y === 0) row.push("wallH")
            else if (x === 0 || x === W - 1 || y === H - 1) row.push("wallV")
            else row.push("floorTile")
        }
        m.push(row)
    }
    // Quelques colonnes décoratives au milieu pour briser la monotonie + tester
    // la collision avec des murs intérieurs.
    m[5][4] = "wallV"
    m[5][9] = "wallV"
    m[8][4] = "wallV"
    m[8][9] = "wallV"
    return m
}

export const YELLOW_MAPS: Record<string, MapData> = {
    [YELLOW_ENTRANCE_MAP_ID]: {
        id: YELLOW_ENTRANCE_MAP_ID,
        name: "NEXUS II — ENTRÉE",
        tiles: buildYellowEntrance(),
        width: 14,
        height: 12,
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
