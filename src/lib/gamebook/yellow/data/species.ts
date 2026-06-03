// src/lib/gamebook/yellow/data/species.ts
//
// Nexus Jaune Éclair — registre des espèces (Daemons). Data-driven & extensible.
// Amorce : une petite famille d'évolution + quelques sauvages de Route Nord,
// suffisante pour exercer combat / XP / évolution / Pokédex.
//
// Les sprites pointent vers /yellow/sprites/dex/* (à fournir dans public/).

import type { SpeciesData } from "../battle/types"

export const SPECIES: Record<string, SpeciesData> = {
    // --- Famille starter PLANTE (2 stades) ---
    pousstout: {
        id: "pousstout", dexNo: 1, name: "Pousstout", types: ["PLANTE"],
        baseStats: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "fouet_lianes" },
            { level: 10, moveId: "vampigraine" },
            { level: 16, moveId: "mega_sangsue" },
        ],
        evolution: { toId: "flordaemon", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE",
        description: "Une graine vivante qui puise sa force dans les reps de son dresseur.",
        sprite: "/yellow/sprites/dex/pousstout.png",
    },
    flordaemon: {
        id: "flordaemon", dexNo: 2, name: "Flordaemon", types: ["PLANTE", "PSY"],
        baseStats: { hp: 60, atk: 62, def: 63, spa: 90, spd: 90, spe: 60 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 20, moveId: "mega_sangsue" },
            { level: 24, moveId: "onde_folie" },
        ],
        catchRate: 30, baseExp: 142, rarity: "RARE",
        description: "Forme éveillée de Pousstout. Sa fleur émet une lumière apaisante.",
        sprite: "/yellow/sprites/dex/flordaemon.png",
    },

    // --- Sauvages de Route Nord ---
    rongeur: {
        id: "rongeur", dexNo: 10, name: "Rongeur", types: ["NORMAL"],
        baseStats: { hp: 40, atk: 45, def: 40, spa: 25, spd: 30, spe: 60 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "vive_attaque" },
            { level: 12, moveId: "bélier" },
        ],
        catchRate: 200, baseExp: 30, rarity: "COMMON",
        description: "Petit rongeur véloce des hautes herbes. Premier adversaire classique.",
        sprite: "/yellow/sprites/dex/rongeur.png",
    },
    piafeu: {
        id: "piafeu", dexNo: 11, name: "Piafeu", types: ["FEU", "VOL"],
        baseStats: { hp: 40, atk: 56, def: 40, spa: 60, spd: 40, spe: 70 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "flammeche" },
            { level: 14, moveId: "double_pied" },
        ],
        catchRate: 120, baseExp: 50, rarity: "UNCOMMON",
        description: "Oiseau au plumage incandescent. Rare au lever du jour sur Route Nord.",
        sprite: "/yellow/sprites/dex/piafeu.png",
    },
    galet: {
        id: "galet", dexNo: 12, name: "Galet", types: ["ROCHE"],
        baseStats: { hp: 50, atk: 60, def: 95, spa: 20, spd: 30, spe: 25 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "rugissement_p" },
        ],
        catchRate: 150, baseExp: 45, rarity: "COMMON",
        description: "Un caillou animé, dur comme la pierre. Lent mais résistant.",
        sprite: "/yellow/sprites/dex/galet.png",
    },
}

export function getSpecies(id: string): SpeciesData | null {
    return SPECIES[id] ?? null
}

export const SPECIES_IDS = Object.keys(SPECIES)
export const DEX_COUNT = SPECIES_IDS.length

/** Espèce par numéro de Pokédex (pour l'écran Pokédex). */
export function speciesByDexNo(dexNo: number): SpeciesData | null {
    return Object.values(SPECIES).find((s) => s.dexNo === dexNo) ?? null
}
