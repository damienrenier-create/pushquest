// src/lib/gamebook/yellow/data/species.ts
//
// Nexus Jaune Éclair — registre des espèces (Daemons ORIGINAUX, STRICT Gen 1).
// 5 stats de base : hp, atk, def, spe, spc. Extensible jusqu'à 151.
// Sprites = chemins /yellow/sprites/dex/* (à fournir dans public/).

import type { SpeciesData } from "../battle/types"

export const SPECIES: Record<string, SpeciesData> = {
    // --- Famille PLANTE (starter, 2 stades) ---
    pousstout: {
        id: "pousstout", dexNo: 1, name: "Pousstout", types: ["PLANTE", "POISON"],
        baseStats: { hp: 45, atk: 49, def: 49, spe: 45, spc: 65 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "fouet_lianes" },
            { level: 10, moveId: "vampigraine" },
            { level: 13, moveId: "dard_venin" },
            { level: 18, moveId: "mega_sangsue" },
        ],
        evolution: { toId: "flordaemon", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE",
        description: "Une graine vivante qui puise sa force dans les reps de son dresseur.",
        sprite: "/yellow/sprites/dex/pousstout.png",
    },
    flordaemon: {
        id: "flordaemon", dexNo: 2, name: "Flordaemon", types: ["PLANTE", "PSY"],
        baseStats: { hp: 60, atk: 62, def: 63, spe: 60, spc: 90 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 20, moveId: "mega_sangsue" },
            { level: 24, moveId: "onde_folie" },
            { level: 30, moveId: "tempete_verte" },
        ],
        catchRate: 30, baseExp: 142, rarity: "RARE",
        description: "Forme éveillée de Pousstout. Sa fleur émet une lumière apaisante.",
        sprite: "/yellow/sprites/dex/flordaemon.png",
    },

    // --- Sauvages de Route Nord ---
    rongeur: {
        id: "rongeur", dexNo: 10, name: "Rongeur", types: ["NORMAL"],
        baseStats: { hp: 40, atk: 45, def: 40, spe: 60, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "vive_attaque" },
            { level: 12, moveId: "coup_d_boule" },
        ],
        catchRate: 200, baseExp: 30, rarity: "COMMON",
        description: "Petit rongeur véloce des hautes herbes. Premier adversaire classique.",
        sprite: "/yellow/sprites/dex/rongeur.png",
    },
    piafeu: {
        id: "piafeu", dexNo: 11, name: "Piafeu", types: ["FEU", "VOL"],
        baseStats: { hp: 40, atk: 56, def: 40, spe: 70, spc: 60 },
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 7, moveId: "flammeche" },
            { level: 14, moveId: "tornade" },
        ],
        catchRate: 120, baseExp: 50, rarity: "UNCOMMON",
        description: "Oiseau au plumage incandescent. Rare au lever du jour sur Route Nord.",
        sprite: "/yellow/sprites/dex/piafeu.png",
    },
    galet: {
        id: "galet", dexNo: 12, name: "Galet", types: ["ROCHE", "SOL"],
        baseStats: { hp: 50, atk: 60, def: 95, spe: 25, spc: 30 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 14, moveId: "mur_de_fer" },
        ],
        catchRate: 150, baseExp: 45, rarity: "COMMON",
        description: "Un caillou animé, dur comme la pierre. Lent mais résistant.",
        sprite: "/yellow/sprites/dex/galet.png",
    },
    bulle: {
        id: "bulle", dexNo: 13, name: "Bulle", types: ["EAU"],
        baseStats: { hp: 48, atk: 48, def: 50, spe: 55, spc: 60 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 6, moveId: "vive_attaque" },
            { level: 16, moveId: "coup_d_givre" },
        ],
        catchRate: 160, baseExp: 42, rarity: "COMMON",
        description: "Petite créature aquatique espiègle qui adore les flaques de Route Nord.",
        sprite: "/yellow/sprites/dex/bulle.png",
    },
}

export function getSpecies(id: string): SpeciesData | null {
    return SPECIES[id] ?? null
}

export const SPECIES_IDS = Object.keys(SPECIES)
export const DEX_COUNT = SPECIES_IDS.length

export function speciesByDexNo(dexNo: number): SpeciesData | null {
    return Object.values(SPECIES).find((s) => s.dexNo === dexNo) ?? null
}
