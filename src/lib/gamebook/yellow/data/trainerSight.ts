// src/lib/gamebook/yellow/data/trainerSight.ts
//
// CHAMP DE VISION DES DRESSEURS — embuscade à la Pokémon : un dresseur posté regarde
// dans une direction et interpelle le joueur DÈS QU'IL ENTRE dans sa ligne de mire,
// sans qu'on ait besoin de lui parler. Enchaînement côté gameStore.move :
//   pas du joueur dans la ligne de mire → bulle « ! » au-dessus du dresseur
//   → (TRAINER_ALERT_MS plus tard) son intro s'ouvre → combat au bout du dialogue.
//
// Module PUR : aucune dépendance à un store ni à la carte. gameStore lui passe un
// prédicat de blocage (mur/arbre/eau) et un prédicat « déjà battu ».
//
// La direction du regard doit correspondre au sprite affiché (cf. NPC_GEN3_IDLE dans
// MapView, ligne 0 = de face/sud) : un dresseur qui regarde vers le sud surveille la
// colonne SOUS lui.

export type SightFacing = "up" | "down" | "left" | "right"

export interface TrainerSightSpec {
    /** id du dresseur dans data/trainers.ts (= id du PNJ, dérivé par TRAINER_NPCS). */
    trainerId: string
    mapId: string
    x: number
    y: number
    facing: SightFacing
    /** Portée du regard en cases : 1 = la case juste devant, range = la plus lointaine. */
    range: number
}

/** Délai entre l'apparition du « ! » et l'ouverture de l'intro (le temps de la lire). */
export const TRAINER_ALERT_MS = 650

export const TRAINER_SIGHTS: readonly TrainerSightSpec[] = [
    // GUETTEUR RAOUL — planté 11 cases sous l'entrée de la grotte (12,3), il surveille
    // la colonne x=12 vers le SUD (couloir walkable de (12,15) à (12,18)).
    { trainerId: "y_trainer_raoul", mapId: "yellow_route_nord", x: 12, y: 14, facing: "down", range: 4 },

    // === CENTRALE (électrique) — 5 embuscades. La position DOIT être identique à celle de la fiche
    //     TrainerData (data/trainers.ts) : le test générique le vérifie. ===
    { trainerId: "y_leo_centrale", mapId: "yellow_centrale", x: 5, y: 14, facing: "down", range: 5 },
    { trainerId: "y_mia_centrale", mapId: "yellow_centrale", x: 23, y: 34, facing: "left", range: 6 },
    { trainerId: "y_selene_centrale", mapId: "yellow_centrale", x: 38, y: 14, facing: "down", range: 6 },
    { trainerId: "y_noe_centrale", mapId: "yellow_centrale", x: 3, y: 28, facing: "down", range: 5 },
    { trainerId: "y_igor_centrale", mapId: "yellow_centrale", x: 1, y: 1, facing: "down", range: 4 },

    // === GROTTE DU NEXUS B2F (sombre) — 4 embuscades (Léo & Mia récurrents + Ora & Kael). ===
    { trainerId: "y_leo_b2f", mapId: "yellow_grotte_nexus_b2f", x: 16, y: 29, facing: "right", range: 5 },
    { trainerId: "y_mia_b2f", mapId: "yellow_grotte_nexus_b2f", x: 14, y: 23, facing: "right", range: 6 },
    { trainerId: "y_ora_b2f", mapId: "yellow_grotte_nexus_b2f", x: 45, y: 16, facing: "down", range: 5 },
    { trainerId: "y_kael_b2f", mapId: "yellow_grotte_nexus_b2f", x: 19, y: 15, facing: "up", range: 4 },

    // === AQUA ARENA (bateau) — 4 embuscades d'équipage. Les 2 BOSS ne sont PAS ici : ils s'affrontent
    //     via une plaque de défi (cf. gameStore.move → yellow_aqua_arena, y=27). Facings validés sur la grille
    //     walkable annotée : left/right ajustés là où le regard "voulu" butait sur une paroi. ===
    { trainerId: "y_aqua_n1", mapId: "yellow_aqua_arena", x: 4, y: 18, facing: "down", range: 5 },
    { trainerId: "y_aqua_n2", mapId: "yellow_aqua_arena", x: 22, y: 20, facing: "left", range: 4 },
    { trainerId: "y_aqua_n3", mapId: "yellow_aqua_arena", x: 15, y: 36, facing: "right", range: 2 },
    { trainerId: "y_aqua_n4", mapId: "yellow_aqua_arena", x: 6, y: 37, facing: "right", range: 6 },

    // === GROTTE GELÉE — le 6e PNJ « rouquin » (SVEN) : embuscade façon Mia/Léo, regarde l'EST (couloir ligne 23,
    //     colonnes 10→16). Ré-affrontable 1×/jour (cf. wrapper de prédicat dans gameStore.move). ===
    { trainerId: "y_rouquin_gelee", mapId: "yellow_grotte_gelee", x: 9, y: 23, facing: "right", range: 7 },

    // === PLAGE — 3 dresseurs à vue (embuscade façon Mia). Facings validés sur la grille walkable (cône ≥ 6 cases). ===
    { trainerId: "y_plage_pecheur", mapId: "yellow_plage", x: 10, y: 15, facing: "down", range: 6 },
    { trainerId: "y_plage_nageuse", mapId: "yellow_plage", x: 14, y: 25, facing: "left", range: 6 },
    { trainerId: "y_plage_marin", mapId: "yellow_plage", x: 8, y: 30, facing: "up", range: 6 },
]

const STEP: Record<SightFacing, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
}

/**
 * Cases effectivement surveillées, de la plus proche à la plus lointaine. Le regard
 * s'arrête net au 1er obstacle (un arbre ou un mur coupe la ligne de mire).
 */
export function sightTiles(
    spec: TrainerSightSpec,
    isBlocked: (x: number, y: number) => boolean,
): { x: number; y: number }[] {
    const { dx, dy } = STEP[spec.facing]
    const tiles: { x: number; y: number }[] = []
    for (let i = 1; i <= spec.range; i++) {
        const x = spec.x + dx * i
        const y = spec.y + dy * i
        if (isBlocked(x, y)) break
        tiles.push({ x, y })
    }
    return tiles
}

/**
 * Le joueur (px,py) est-il dans la ligne de mire d'un dresseur PAS ENCORE BATTU ?
 * Renvoie le dresseur qui l'a repéré, sinon null.
 */
export function trainerSpotting(
    mapId: string,
    px: number,
    py: number,
    isBlocked: (x: number, y: number) => boolean,
    isDefeated: (trainerId: string) => boolean,
): TrainerSightSpec | null {
    for (const spec of TRAINER_SIGHTS) {
        if (spec.mapId !== mapId) continue
        if (isDefeated(spec.trainerId)) continue
        if (sightTiles(spec, isBlocked).some((t) => t.x === px && t.y === py)) return spec
    }
    return null
}
