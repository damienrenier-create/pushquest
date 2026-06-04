// src/lib/gamebook/yellow/data/species.ts
//
// Nexus Jaune Éclair — registre des espèces (Daemons ORIGINAUX, STRICT Gen 1).
// 5 stats de base : hp, atk, def, spe, spc. Extensible jusqu'à 151.
// Sprites = chemins /yellow/sprites/dex/* (à fournir dans public/).

import type { SpeciesData } from "../battle/types"

export const SPECIES: Record<string, SpeciesData> = {
    // ============================================================
    // ROSTER DES 18 (2 triangles : Plante/Eau/Feu + Combat/Roche/Vol).
    // Daemons ORIGINAUX (noms/designs/sprites maison). Les baseStats ci-dessous
    // sont des valeurs d'ÉQUILIBRAGE MAISON, pas une table externe : ajuste
    // librement n'importe quel nombre (hp/atk/def/spe/spc) ici.
    // ============================================================

    // --- Ligne PLANTE (starter) ---
    feuillichot: {
        id: "feuillichot", dexNo: 1, name: "Feuillichot", types: ["PLANTE"],
        baseStats: { hp: 48, atk: 48, def: 52, spe: 44, spc: 62 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 4, moveId: "fouet_lianes" },
            { level: 10, moveId: "vampigraine" },
            { level: 16, moveId: "mega_sangsue" },
            { level: 22, moveId: "tempete_verte" },
        ],
        evolution: { toId: "broutame", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Plante — endurant",
        description: "Pousse-lapin espiègle. Plus son dresseur transpire, plus elle verdit.",
        sprite: "/yellow/sprites/dex/feuillichot.png",
    },
    broutame: {
        id: "broutame", dexNo: 2, name: "Broutame", types: ["PLANTE"],
        baseStats: { hp: 64, atk: 60, def: 70, spe: 57, spc: 80 },
        learnset: [
            { level: 1, moveId: "fouet_lianes" },
            { level: 1, moveId: "vampigraine" },
            { level: 20, moveId: "mega_sangsue" },
            { level: 28, moveId: "tempete_verte" },
            { level: 34, moveId: "danse_lames" },
        ],
        evolution: { toId: "sylvapuce", method: { kind: "LEVEL", level: 32 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Plante — endurant",
        description: "Faon aux bois bourgeonnants. Broute la lumière du matin pour gagner en vigueur.",
        sprite: "/yellow/sprites/dex/broutame.png",
    },
    sylvapuce: {
        id: "sylvapuce", dexNo: 3, name: "Sylvapuce", types: ["PLANTE"],
        baseStats: { hp: 84, atk: 80, def: 88, spe: 76, spc: 102 },
        learnset: [
            { level: 1, moveId: "tempete_verte" },
            { level: 1, moveId: "vampigraine" },
            { level: 1, moveId: "mega_sangsue" },
            { level: 40, moveId: "belier" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Plante — mur special",
        description: "Cerf-forêt centenaire. Là où il se repose fleurit une clairière.",
        sprite: "/yellow/sprites/dex/sylvapuce.png",
    },

    // --- Ligne EAU (starter) ---
    gouttiny: {
        id: "gouttiny", dexNo: 4, name: "Gouttiny", types: ["EAU"],
        baseStats: { hp: 46, atk: 48, def: 66, spe: 42, spc: 52 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 6, moveId: "pistolet_a_o" },
            { level: 18, moveId: "coup_d_givre" },
            { level: 30, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "ondulo", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Eau — défensif",
        description: "Goutte d'eau espiègle qui rebondit partout. Adore éclabousser.",
        sprite: "/yellow/sprites/dex/gouttiny.png",
    },
    ondulo: {
        id: "ondulo", dexNo: 5, name: "Ondulo", types: ["EAU"],
        baseStats: { hp: 62, atk: 62, def: 82, spe: 56, spc: 66 },
        learnset: [
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "charge" },
            { level: 24, moveId: "coup_d_givre" },
            { level: 34, moveId: "hydrocanon" },
        ],
        evolution: { toId: "razmaree", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Eau — défensif",
        description: "Amphibien surfeur ; chevauche ses propres vagues pour esquiver.",
        sprite: "/yellow/sprites/dex/ondulo.png",
    },
    razmaree: {
        id: "razmaree", dexNo: 6, name: "Razmarée", types: ["EAU"],
        baseStats: { hp: 82, atk: 82, def: 104, spe: 74, spc: 86 },
        learnset: [
            { level: 1, moveId: "hydrocanon" },
            { level: 1, moveId: "pistolet_a_o" },
            { level: 1, moveId: "coup_d_givre" },
            { level: 42, moveId: "mur_de_fer" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Eau — tank",
        description: "Gardien des marées. Quand il inspire, l'eau baisse à des mètres à la ronde.",
        sprite: "/yellow/sprites/dex/razmaree.png",
    },

    // --- Ligne FEU (starter) ---
    braisille: {
        id: "braisille", dexNo: 7, name: "Braisille", types: ["FEU"],
        baseStats: { hp: 42, atk: 54, def: 44, spe: 66, spc: 52 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "flammeche" },
            { level: 20, moveId: "belier" },
            { level: 30, moveId: "lance_flammes" },
        ],
        evolution: { toId: "flamkure", method: { kind: "LEVEL", level: 16 } },
        catchRate: 45, baseExp: 64, rarity: "RARE", growthRate: "medium_fast", role: "Starter Feu — rapide offensif",
        description: "Renardeau de braise qui crépite d'impatience. S'éteint si on le néglige.",
        sprite: "/yellow/sprites/dex/braisille.png",
    },
    flamkure: {
        id: "flamkure", dexNo: 8, name: "Flamkure", types: ["FEU"],
        baseStats: { hp: 60, atk: 68, def: 56, spe: 84, spc: 66 },
        learnset: [
            { level: 1, moveId: "flammeche" },
            { level: 1, moveId: "charge" },
            { level: 30, moveId: "lance_flammes" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "pyrokoss", method: { kind: "LEVEL", level: 36 } },
        catchRate: 45, baseExp: 141, rarity: "RARE", growthRate: "medium_fast", role: "Feu — rapide offensif",
        description: "Jeune fauve de flammes ; sa fourrure brûle plus fort à l'échauffement.",
        sprite: "/yellow/sprites/dex/flamkure.png",
    },
    pyrokoss: {
        id: "pyrokoss", dexNo: 9, name: "Pyrokoss", types: ["FEU"],
        baseStats: { hp: 80, atk: 88, def: 76, spe: 104, spc: 88 },
        learnset: [
            { level: 1, moveId: "lance_flammes" },
            { level: 1, moveId: "flammeche" },
            { level: 1, moveId: "belier" },
            { level: 44, moveId: "seisme" },
        ],
        catchRate: 45, baseExp: 208, rarity: "RARE", growthRate: "medium_fast", role: "Feu — sweeper",
        description: "Lion de lave. Chaque pas laisse une empreinte de magma.",
        sprite: "/yellow/sprites/dex/pyrokoss.png",
    },

    // --- Ligne VOL (Normal/Vol) ---
    plumiot: {
        id: "plumiot", dexNo: 10, name: "Plumiot", types: ["NORMAL", "VOL"],
        baseStats: { hp: 42, atk: 46, def: 42, spe: 58, spc: 36 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 5, moveId: "picpic" },
            { level: 12, moveId: "vive_attaque" },
            { level: 20, moveId: "tornade" },
        ],
        evolution: { toId: "faukon", method: { kind: "LEVEL", level: 18 } },
        catchRate: 120, baseExp: 50, rarity: "COMMON", growthRate: "medium_fast", role: "Vol — early bird",
        description: "Oisillon ébouriffé qui tombe plus qu'il ne vole. Courageux pour deux.",
        sprite: "/yellow/sprites/dex/plumiot.png",
    },
    faukon: {
        id: "faukon", dexNo: 11, name: "Faukon", types: ["NORMAL", "VOL"],
        baseStats: { hp: 64, atk: 62, def: 56, spe: 73, spc: 52 },
        learnset: [
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "vive_attaque" },
            { level: 24, moveId: "tornade" },
            { level: 34, moveId: "belier" },
        ],
        evolution: { toId: "aquilothan", method: { kind: "LEVEL", level: 36 } },
        catchRate: 90, baseExp: 122, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Vol — rapide",
        description: "Faucon vif comme l'éclair ; fond sur ses proies en piqué.",
        sprite: "/yellow/sprites/dex/faukon.png",
    },
    aquilothan: {
        id: "aquilothan", dexNo: 12, name: "Aquilothan", types: ["NORMAL", "VOL"],
        baseStats: { hp: 84, atk: 82, def: 76, spe: 104, spc: 72 },
        learnset: [
            { level: 1, moveId: "tornade" },
            { level: 1, moveId: "picpic" },
            { level: 1, moveId: "belier" },
            { level: 40, moveId: "coup_d_boule" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Vol — sweeper",
        description: "Empereur des cieux. Son envergure projette l'ombre d'un nuage.",
        sprite: "/yellow/sprites/dex/aquilothan.png",
    },

    // --- Ligne ROCHE/SOL ---
    cailloutchi: {
        id: "cailloutchi", dexNo: 13, name: "Cailloutchi", types: ["ROCHE", "SOL"],
        baseStats: { hp: 42, atk: 78, def: 100, spe: 22, spc: 32 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 8, moveId: "jet_pierres" },
            { level: 16, moveId: "jet_de_sable" },
            { level: 26, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "roctaur", method: { kind: "LEVEL", level: 25 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Roche — mur lent",
        description: "Chevreau de pierre aux yeux ronds. Encaisse sans broncher, lent à démarrer.",
        sprite: "/yellow/sprites/dex/cailloutchi.png",
    },
    roctaur: {
        id: "roctaur", dexNo: 14, name: "Roctaur", types: ["ROCHE", "SOL"],
        baseStats: { hp: 58, atk: 94, def: 118, spe: 34, spc: 46 },
        learnset: [
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "charge" },
            { level: 30, moveId: "seisme" },
            { level: 36, moveId: "mur_de_fer" },
        ],
        evolution: { toId: "rochison", method: { kind: "TRADE" } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Roche — tank",
        description: "Bélier rocheux ; charge en faisant trembler le sol.",
        sprite: "/yellow/sprites/dex/roctaur.png",
    },
    rochison: {
        id: "rochison", dexNo: 15, name: "Rochison", types: ["ROCHE", "SOL"],
        baseStats: { hp: 82, atk: 112, def: 134, spe: 46, spc: 56 },
        learnset: [
            { level: 1, moveId: "seisme" },
            { level: 1, moveId: "jet_pierres" },
            { level: 1, moveId: "mur_de_fer" },
            { level: 44, moveId: "belier" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Roche — tank offensif",
        description: "Bison de roche. On l'a longtemps pris pour un menhir avant qu'il ne charge.",
        sprite: "/yellow/sprites/dex/rochison.png",
    },

    // --- Ligne COMBAT ---
    couperin: {
        id: "couperin", dexNo: 16, name: "Couperin", types: ["COMBAT"],
        baseStats: { hp: 42, atk: 80, def: 38, spe: 72, spc: 34 },
        learnset: [
            { level: 1, moveId: "charge" },
            { level: 7, moveId: "double_pied" },
            { level: 18, moveId: "poing_karate" },
            { level: 28, moveId: "danse_lames" },
        ],
        evolution: { toId: "frappard", method: { kind: "LEVEL", level: 28 } },
        catchRate: 120, baseExp: 60, rarity: "COMMON", growthRate: "medium_fast", role: "Combat — frêle agressif",
        description: "Renard méditant aux poings bandés. S'entraîne sur tout ce qui dépasse.",
        sprite: "/yellow/sprites/dex/couperin.png",
    },
    frappard: {
        id: "frappard", dexNo: 17, name: "Frappard", types: ["COMBAT"],
        baseStats: { hp: 66, atk: 104, def: 62, spe: 94, spc: 58 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "double_pied" },
            { level: 30, moveId: "belier" },
            { level: 36, moveId: "danse_lames" },
        ],
        evolution: { toId: "maitrezenc", method: { kind: "LEVEL", level: 36 } },
        catchRate: 60, baseExp: 142, rarity: "UNCOMMON", growthRate: "medium_fast", role: "Combat — rapide offensif",
        description: "Combattant discipliné ; enchaîne les séries comme un athlète à l'entraînement.",
        sprite: "/yellow/sprites/dex/frappard.png",
    },
    maitrezenc: {
        id: "maitrezenc", dexNo: 18, name: "Maîtrezenc", types: ["COMBAT"],
        baseStats: { hp: 86, atk: 124, def: 82, spe: 110, spc: 78 },
        learnset: [
            { level: 1, moveId: "poing_karate" },
            { level: 1, moveId: "belier" },
            { level: 1, moveId: "double_pied" },
            { level: 44, moveId: "seisme" },
        ],
        catchRate: 45, baseExp: 210, rarity: "RARE", growthRate: "medium_fast", role: "Combat — sweeper",
        description: "Maître sensei au calme olympien. Un seul crochet fend la pierre.",
        sprite: "/yellow/sprites/dex/maitrezenc.png",
    },

    // --- Famille PLANTE (starter, 2 stades) ---
    pousstout: {
        id: "pousstout", dexNo: 51, name: "Pousstout", types: ["PLANTE", "POISON"],
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
        id: "flordaemon", dexNo: 52, name: "Flordaemon", types: ["PLANTE", "PSY"],
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
        id: "rongeur", dexNo: 53, name: "Rongeur", types: ["NORMAL"],
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
        id: "piafeu", dexNo: 54, name: "Piafeu", types: ["FEU", "VOL"],
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
        id: "galet", dexNo: 55, name: "Galet", types: ["ROCHE", "SOL"],
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
        id: "bulle", dexNo: 56, name: "Bulle", types: ["EAU"],
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
