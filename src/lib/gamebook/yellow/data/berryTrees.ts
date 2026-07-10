// src/lib/gamebook/yellow/data/berryTrees.ts
//
// ARBRES FERTILES — récolte de baies (post-Ligue). Chaque jour, sur chaque carte concernée,
// 3 arbres parmi ~30 candidats portent une baie (type aléatoire). Le tirage est DÉTERMINISTE
// par (carte, jour) → tous les appareils voient les mêmes arbres, et un refresh ne re-tire pas.
// Coords choisies par échantillonnage « farthest-point » sur les tuiles `tree` (bien réparties).
// Seules ROUTE NORD et VILLE JAUNE sont concernées (choix produit Sartay).

import { BERRY_IDS } from "./heldItems"

/** Nombre d'arbres portant une baie par carte et par jour. */
export const BERRIES_PER_MAP_PER_DAY = 3

/** % des baies du jour dont l'icône est VISIBLE sur la carte. Réglé à 100 (choix Sartay 10/07 : « c'est mieux
 *  quand on les voit un petit peu ») → les 3 baies du jour de chaque carte affichent leur petite icône sur
 *  l'arbre. Ça reste discret (3 arbres/carte/jour seulement) tout en rendant la récolte trouvable. */
export const BERRY_VISIBLE_PCT = 100

/** Arbres candidats (tuiles `tree`) par carte. 30 par carte, bien répartis. */
export const BERRY_TREE_SPOTS: Record<string, ReadonlyArray<{ x: number; y: number }>> = {
    yellow_route_nord: [
        { x: 1, y: 3 }, { x: 10, y: 3 }, { x: 19, y: 3 }, { x: 25, y: 3 }, { x: 31, y: 3 },
        { x: 42, y: 4 }, { x: 27, y: 9 }, { x: 4, y: 11 }, { x: 22, y: 11 }, { x: 38, y: 11 },
        { x: 13, y: 12 }, { x: 33, y: 17 }, { x: 5, y: 19 }, { x: 11, y: 19 }, { x: 42, y: 19 },
        { x: 22, y: 20 }, { x: 29, y: 22 }, { x: 36, y: 24 }, { x: 1, y: 26 }, { x: 20, y: 26 },
        { x: 42, y: 27 }, { x: 14, y: 28 }, { x: 26, y: 29 }, { x: 7, y: 30 }, { x: 1, y: 34 },
        { x: 42, y: 34 }, { x: 9, y: 35 }, { x: 16, y: 35 }, { x: 31, y: 35 }, { x: 21, y: 39 },
    ],
    yellow_entrance: [
        { x: 18, y: 0 }, { x: 24, y: 2 }, { x: 30, y: 3 }, { x: 36, y: 3 }, { x: 13, y: 4 },
        { x: 42, y: 4 }, { x: 7, y: 5 }, { x: 19, y: 9 }, { x: 32, y: 10 }, { x: 42, y: 11 },
        { x: 28, y: 12 }, { x: 7, y: 13 }, { x: 0, y: 15 }, { x: 19, y: 15 }, { x: 23, y: 18 },
        { x: 42, y: 19 }, { x: 0, y: 20 }, { x: 6, y: 20 }, { x: 13, y: 23 }, { x: 6, y: 25 },
        { x: 42, y: 26 }, { x: 19, y: 30 }, { x: 6, y: 31 }, { x: 13, y: 34 }, { x: 42, y: 34 },
        { x: 18, y: 35 }, { x: 31, y: 35 }, { x: 37, y: 35 }, { x: 26, y: 37 }, { x: 21, y: 39 },
    ],
}

/** Cartes où des baies poussent. */
export const BERRY_MAP_IDS = Object.keys(BERRY_TREE_SPOTS)

// Hash FNV-1a déterministe (32 bits) → tirage stable, sans RNG partagé.
function fnv1a(str: string): number {
    let h = 2166136261 >>> 0
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i)
        h = Math.imul(h, 16777619)
    }
    return h >>> 0
}

export interface BerryTree {
    x: number
    y: number
    berryId: string
    /** L'icône est-elle affichée sur la carte ? (BERRY_VISIBLE_PCT ; = 100 aujourd'hui → toutes les baies du jour affichent leur icône.) */
    visible: boolean
}

/** Les BERRIES_PER_MAP_PER_DAY arbres portant une baie ce jour-là sur cette carte (déterministe). `day` = la
 *  clé-jour du jeu ("YYYY-MM-DD") ou un entier (tests) — seule sa valeur textuelle compte pour le hash. */
export function berriesForDay(mapId: string, day: string | number): BerryTree[] {
    const spots = BERRY_TREE_SPOTS[mapId]
    if (!spots || spots.length === 0) return []
    // Trie les indices par hash(carte, jour, i) et garde les 3 premiers → 3 arbres/jour.
    const ranked = spots
        .map((_, i) => ({ i, h: fnv1a(`${mapId}:${day}:${i}`) }))
        .sort((a, b) => a.h - b.h)
        .slice(0, Math.min(BERRIES_PER_MAP_PER_DAY, spots.length))
    return ranked.map(({ i }) => {
        const berryId = BERRY_IDS[fnv1a(`${mapId}:${day}:${i}:b`) % BERRY_IDS.length]
        const visible = fnv1a(`${mapId}:${day}:${i}:vis`) % 100 < BERRY_VISIBLE_PCT // ~30% affichées
        return { x: spots[i].x, y: spots[i].y, berryId, visible }
    })
}

/** La baie présente sur la tuile (x,y) de cette carte ce jour-là, ou null. */
export function berryAtTile(mapId: string, x: number, y: number, day: string | number): string | null {
    for (const t of berriesForDay(mapId, day)) {
        if (t.x === x && t.y === y) return t.berryId
    }
    return null
}
