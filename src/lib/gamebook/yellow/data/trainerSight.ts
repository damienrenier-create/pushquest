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
    // GUETTEUR RAOUL — planté 15 cases sous l'entrée de la grotte (12,3), il surveille
    // la colonne x=12 vers le SUD (couloir walkable de (12,19) à (12,27)).
    { trainerId: "y_trainer_raoul", mapId: "yellow_route_nord", x: 12, y: 18, facing: "down", range: 8 },
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
