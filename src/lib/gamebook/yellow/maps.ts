// Nexus II "jaune éclair" — registre des maps de la suite narrative.
//
// Convention : tous les ids commencent par `yellow_` pour éviter toute collision
// avec les maps v3 (lasagnas_*, muscuville, macaronile, etc.).
//
// Phase scaffolding : une seule map d'entrée vide avec PNJ "ARCHITECTE" qui sert
// uniquement à valider que la transition v3 → v2 fonctionne. Le concept narratif
// et les vraies maps arriveront ensuite.

import type { MapData, TileType } from "@/lib/gamebook/mapEngine"
import { YELLOW_ENTRANCE_MAP_ID } from "./featureFlag"

// === yellow_entrance : salle d'attente vide 9x7 ===
function buildYellowEntrance(): TileType[][] {
    const W = 9, H = 7
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
    return m
}

export const YELLOW_MAPS: Record<string, MapData> = {
    [YELLOW_ENTRANCE_MAP_ID]: {
        id: YELLOW_ENTRANCE_MAP_ID,
        name: "NEXUS II — ENTRÉE (placeholder)",
        tiles: buildYellowEntrance(),
        width: 9,
        height: 7,
    },
}

export const YELLOW_MAP_IDS = Object.keys(YELLOW_MAPS)
