// src/lib/gamebook/yellow/data/encounters.ts
//
// Nexus Jaune Éclair — tables de rencontres sauvages par zone (Daemons ORIGINAUX).
// `rate` = probabilité d'une rencontre à chaque pas sur une case de hautes herbes.

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"

interface EncounterEntry { speciesId: string; min: number; max: number; weight: number }
interface ZoneEncounters { rate: number; entries: EncounterEntry[] }

export const ENCOUNTERS: Record<string, ZoneEncounters> = {
    yellow_route_nord: {
        rate: 0.14,
        entries: [
            { speciesId: "rongeur", min: 3, max: 6, weight: 50 },
            { speciesId: "bulle", min: 3, max: 6, weight: 25 },
            { speciesId: "galet", min: 4, max: 7, weight: 20 },
            { speciesId: "piafeu", min: 5, max: 8, weight: 5 },
        ],
    },
}

/** Une zone a-t-elle des rencontres ? */
export function hasEncounters(mapId: string): boolean {
    return mapId in ENCOUNTERS
}

/**
 * Tire (ou non) une rencontre sauvage pour une zone. Renvoie un Daemon prêt au
 * combat, ou null si pas de rencontre ce pas-ci.
 */
export function rollWildEncounter(mapId: string): MonInstance | null {
    const zone = ENCOUNTERS[mapId]
    if (!zone) return null
    if (Math.random() >= zone.rate) return null

    const total = zone.entries.reduce((a, e) => a + e.weight, 0)
    let r = Math.random() * total
    let chosen = zone.entries[0]
    for (const e of zone.entries) {
        if (r < e.weight) { chosen = e; break }
        r -= e.weight
    }
    const level = chosen.min + Math.floor(Math.random() * (chosen.max - chosen.min + 1))
    return createMonInstance(chosen.speciesId, level)
}
