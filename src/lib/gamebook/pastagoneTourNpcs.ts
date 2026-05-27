// src/lib/gamebook/pastagoneTourNpcs.ts
//
// v4.0 Phase 6 — Pool de 25 PNJ pour la Tour de Garde Pastagone.
//
// 5 grades × 5 noms uniques par grade. 1 PNJ visible à la fois en Tour de Garde,
// rotation aléatoire toutes les 10 minutes OU après un combat.
//
// Chaque PNJ est un chien-flic avec un grade qui détermine ses stats de combat
// (force/vitesse/défense/intelligence/endurance) et le type d'attaques.

export type TourGrade = "saintbernard" | "pitbull" | "mastiff" | "chihuahua" | "doberman_light"

export interface TourNpc {
    id: string
    name: string
    grade: TourGrade
    emoji: string
    /** Combat stats template (chaque PNJ peut overrider). */
    combatLevel: number
    type: "Combat" | "Normal" | "Roche" | "Vol"
    morphology: "crocs"
    attacksEquipped: string[]
    happiness: number
    /** Multiplier de stats sur la base (par grade). */
    statsMultiplier?: number
    /** XP bonus % vs un combat wild de même level. */
    xpBonusPct?: number
    /** Phrase d'intro avant le combat. */
    introLine: string
}

// ============================================================
// 🛡️ Saint-Bernard (DEF dominante)
// ============================================================
const SAINTBERNARD_TEMPLATE = {
    grade: "saintbernard" as const,
    emoji: "🐕",
    combatLevel: 8,
    type: "Combat" as const,
    morphology: "crocs" as const,
    attacksEquipped: ["morsure", "coup_d_ecaille"],
    happiness: 60,
    statsMultiplier: 1.0,
    xpBonusPct: 10,
}
const SAINTBERNARDS: TourNpc[] = [
    { ...SAINTBERNARD_TEMPLATE, id: "tour_sb1", name: "Sergent JAMES",     introLine: "« Au boulot, intrus. Faut bien quelqu'un pour faire les heures sup'. »" },
    { ...SAINTBERNARD_TEMPLATE, id: "tour_sb2", name: "Lieutenant WILL",   introLine: "« Tu rentres dans la danse. Espère pas un step easy. »" },
    { ...SAINTBERNARD_TEMPLATE, id: "tour_sb3", name: "Caporal BUCHER",    introLine: "« Mon chien-Daemon a peu de gloire, mais beaucoup de patience. »" },
    { ...SAINTBERNARD_TEMPLATE, id: "tour_sb4", name: "Brigadier MONROE",  introLine: "« Bref. T'es là pour quoi déjà ? Ah oui, te faire défoncer. »" },
    { ...SAINTBERNARD_TEMPLATE, id: "tour_sb5", name: "Inspecteur GARRETT", introLine: "« Procédure standard : 1) bagarre, 2) bagarre, 3) re-bagarre. »" },
]

// ============================================================
// 💪 Pitbull (ATK dominante)
// ============================================================
const PITBULL_TEMPLATE = {
    grade: "pitbull" as const,
    emoji: "🐺",
    combatLevel: 9,
    type: "Combat" as const,
    morphology: "crocs" as const,
    attacksEquipped: ["croc_fatal", "morsure"],
    happiness: 40,
    statsMultiplier: 1.1,
    xpBonusPct: 15,
}
const PITBULLS: TourNpc[] = [
    { ...PITBULL_TEMPLATE, id: "tour_pb1", name: "Pitbull HUNTER",  introLine: "« Aboie pas. Encaisse. »" },
    { ...PITBULL_TEMPLATE, id: "tour_pb2", name: "Pitbull MAX",     introLine: "« On va voir si t'as de la viande sous l'os. »" },
    { ...PITBULL_TEMPLATE, id: "tour_pb3", name: "Pitbull SCAR",    introLine: "« J'aime ce moment. Avant les cris. »" },
    { ...PITBULL_TEMPLATE, id: "tour_pb4", name: "Pitbull RIPPER",  introLine: "« 30 secondes. C'est tout ce qu'il te reste. »" },
    { ...PITBULL_TEMPLATE, id: "tour_pb5", name: "Pitbull BLAZE",   introLine: "« Si tu cours, c'est pire. *grogne* »" },
]

// ============================================================
// 🐂 Mastiff (END dominante)
// ============================================================
const MASTIFF_TEMPLATE = {
    grade: "mastiff" as const,
    emoji: "🐶",
    combatLevel: 9,
    type: "Combat" as const,
    morphology: "crocs" as const,
    attacksEquipped: ["coup_d_ecaille", "morsure"],
    happiness: 55,
    statsMultiplier: 1.15,
    xpBonusPct: 12,
}
const MASTIFFS: TourNpc[] = [
    { ...MASTIFF_TEMPLATE, id: "tour_mt1", name: "Mastiff BRUNO",    introLine: "« Patience. Endurance. Ma marque. »" },
    { ...MASTIFF_TEMPLATE, id: "tour_mt2", name: "Mastiff THOR",     introLine: "« Tu vas pas me lâcher, je vais pas te lâcher. »" },
    { ...MASTIFF_TEMPLATE, id: "tour_mt3", name: "Mastiff CRUSHER",  introLine: "« Tu vas te fatiguer avant moi. Toujours. »" },
    { ...MASTIFF_TEMPLATE, id: "tour_mt4", name: "Mastiff TANK",     introLine: "« Garde un peu d'énergie. Pour quand tu fuiras. »" },
    { ...MASTIFF_TEMPLATE, id: "tour_mt5", name: "Mastiff GOLEM",    introLine: "« Trois heures. Mon record. Tu tiendras combien ? »" },
]

// ============================================================
// 🐀 Chihuahua (tuto / faiblard)
// ============================================================
const CHIHUAHUA_TEMPLATE = {
    grade: "chihuahua" as const,
    emoji: "🐕‍🦺",
    combatLevel: 4,
    type: "Combat" as const,
    morphology: "crocs" as const,
    attacksEquipped: ["picpic", "charge"],
    happiness: 75,
    statsMultiplier: 0.7,
    xpBonusPct: -10,
}
const CHIHUAHUAS: TourNpc[] = [
    { ...CHIHUAHUA_TEMPLATE, id: "tour_ch1", name: "Chihuahua PRESCO",  introLine: "« GRRRRR ! (Couinement.) »" },
    { ...CHIHUAHUA_TEMPLATE, id: "tour_ch2", name: "Chihuahua TIPSY",   introLine: "« Je suis petit mais j'ai un badge ! »" },
    { ...CHIHUAHUA_TEMPLATE, id: "tour_ch3", name: "Chihuahua MOJO",    introLine: "« Le boss m'a mis là pour faire le quota. »" },
    { ...CHIHUAHUA_TEMPLATE, id: "tour_ch4", name: "Chihuahua TACO",    introLine: "« T'as l'air costaud. Hmm. *recule* »" },
    { ...CHIHUAHUA_TEMPLATE, id: "tour_ch5", name: "Chihuahua POPCORN", introLine: "« J'ai pas mangé, j'ai pas dormi, j'ai pas envie. »" },
]

// ============================================================
// 💀 Doberman-light (mini-boss)
// ============================================================
const DOBERMAN_TEMPLATE = {
    grade: "doberman_light" as const,
    emoji: "🦮",
    combatLevel: 14,
    type: "Combat" as const,
    morphology: "crocs" as const,
    attacksEquipped: ["croc_fatal", "ultime_uppercut", "morsure"],
    happiness: 50,
    statsMultiplier: 1.4,
    xpBonusPct: 30,
}
const DOBERMANS: TourNpc[] = [
    { ...DOBERMAN_TEMPLATE, id: "tour_db1", name: "Doberman VEGA",   introLine: "« Tu commences à m'intéresser, dresseur. »" },
    { ...DOBERMAN_TEMPLATE, id: "tour_db2", name: "Doberman NYX",    introLine: "« Lieutenant du Boss. Va falloir tenir 60 secondes. »" },
    { ...DOBERMAN_TEMPLATE, id: "tour_db3", name: "Doberman REX",    introLine: "« On finit ça en une morsure ? »" },
    { ...DOBERMAN_TEMPLATE, id: "tour_db4", name: "Doberman ZORA",   introLine: "« Sortez les premiers secours en avance, ça gagnera du temps. »" },
    { ...DOBERMAN_TEMPLATE, id: "tour_db5", name: "Doberman ARES",   introLine: "« Le boss m'observe. Pas le droit de te laisser passer. »" },
]

export const TOUR_NPC_POOL: TourNpc[] = [
    ...CHIHUAHUAS,
    ...SAINTBERNARDS,
    ...PITBULLS,
    ...MASTIFFS,
    ...DOBERMANS,
]

/** Pick deterministically un PNJ depuis l'array (Mulberry32-like). */
export function pickTourNpcDeterministic(seed: number): TourNpc {
    // Mulberry32 hash
    let t = (seed | 0)
    t = (t + 0x6D2B79F5) | 0
    let h = Math.imul(t ^ (t >>> 15), 1 | t)
    h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h
    const idx = ((h ^ (h >>> 14)) >>> 0) % TOUR_NPC_POOL.length
    return TOUR_NPC_POOL[idx]
}

export function pickTourNpcRandom(): TourNpc {
    return TOUR_NPC_POOL[Math.floor(Math.random() * TOUR_NPC_POOL.length)]
}

export function findTourNpcById(id: string): TourNpc | null {
    return TOUR_NPC_POOL.find((n) => n.id === id) ?? null
}
