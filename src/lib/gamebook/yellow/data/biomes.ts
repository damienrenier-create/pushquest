// src/lib/gamebook/yellow/data/biomes.ts
//
// Nexus Jaune Éclair — influence des BIOMES sur les rencontres sauvages.
// Les Daemons popent sur les hautes herbes (walkable) ; leur probabilité est
// modulée par la PROXIMITÉ de la case aux éléments du décor (eau, montagne,
// sapins), qui eux ne sont PAS walkable. Intensité en 4 paliers dégressifs.

export type Biome = "water" | "mountain" | "sapin"

interface Rect { x0: number; y0: number; x1: number; y1: number } // inclusif

// Régions-sources d'influence par carte (coordonnées tuiles, cf. maps.ts).
const BIOME_REGIONS: Record<string, Partial<Record<Biome, Rect[]>>> = {
    yellow_route_nord: {
        // 4 plans d'eau.
        water: [
            { x0: 35, y0: 3, x1: 40, y1: 7 },
            { x0: 5, y0: 25, x1: 10, y1: 29 },
            { x0: 28, y0: 12, x1: 33, y1: 16 },
            { x0: 13, y0: 20, x1: 18, y1: 24 },
        ],
        // Bande montagne nord + bloc montagne.
        mountain: [
            { x0: 4, y0: 0, x1: 41, y1: 3 },
            { x0: 4, y0: 4, x1: 8, y1: 13 },
        ],
        // Bordures boisées est/ouest (forêt de sapins).
        sapin: [
            { x0: 0, y0: 0, x1: 1, y1: 39 },
            { x0: 42, y0: 0, x1: 43, y1: 39 },
        ],
    },
    yellow_grotte: {
        // Le LAC (haut-gauche, cf. grotte.png) — source d'influence "eau" pour Loutrille/Têtardoc.
        water: [{ x0: 1, y0: 2, x1: 9, y1: 7 }],
    },
}

/** Distance de Chebyshev d'un point à un rectangle (0 si dedans). */
function rectDistance(x: number, y: number, r: Rect): number {
    const dx = Math.max(r.x0 - x, 0, x - r.x1)
    const dy = Math.max(r.y0 - y, 0, y - r.y1)
    return Math.max(dx, dy)
}

/** Distance (cases) de la position au biome le plus proche, ou Infinity si absent. */
export function biomeDistance(mapId: string, x: number, y: number, biome: Biome): number {
    const rects = BIOME_REGIONS[mapId]?.[biome]
    if (!rects || rects.length === 0) return Infinity
    let best = Infinity
    for (const r of rects) best = Math.min(best, rectDistance(x, y, r))
    return best
}

/** Multiplicateur d'AFFINITÉ (le type "chez lui" se densifie en approchant). */
export function affinityMult(dist: number): number {
    if (dist <= 2) return 4      // cœur
    if (dist <= 5) return 2.5    // proche
    if (dist <= 7) return 1.5    // moyen
    return 1                     // hors zone (poche neutre)
}

/** Multiplicateur de RÉPULSION (le type qui fuit le biome se raréfie en approchant). */
export function repulsionMult(dist: number): number {
    if (dist <= 2) return 0.25
    if (dist <= 5) return 0.5
    if (dist <= 7) return 0.8
    return 1
}

export function hasBiomeRegions(mapId: string): boolean {
    return mapId in BIOME_REGIONS
}
