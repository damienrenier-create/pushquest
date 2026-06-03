// src/lib/gamebook/yellow/battle/types.ts
//
// Nexus Jaune Éclair — TYPES FONDAMENTAUX du moteur de combat.
// 100% React-free : aucune dépendance UI ici. Tout le reste du moteur
// (rng, typeChart, stats, damage, status, engine, ai) s'appuie dessus.

// ============================================================
// Types élémentaires
// ============================================================

export const POKE_TYPES = [
    "NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "COMBAT",
    "VOL", "PSY", "ROCHE", "SPECTRE", "GLACE", "TENEBRES",
] as const
export type PokeType = (typeof POKE_TYPES)[number]

// Stats canoniques (séparation physique / spécial comme Gen 3+).
export type StatKey = "hp" | "atk" | "def" | "spa" | "spd" | "spe"

/** Stats modifiables par stages en combat (+ précision/esquive), -6..+6. */
export type StageKey = "atk" | "def" | "spa" | "spd" | "spe" | "acc" | "eva"
export type StatStages = Record<StageKey, number>

export type MoveCategory = "PHYSICAL" | "SPECIAL" | "STATUS"

// Statuts majeurs (non-volatils, EXCLUSIFS entre eux).
export type MajorStatus =
    | "NONE" | "BURN" | "POISON" | "TOXIC" | "PARALYSIS" | "SLEEP" | "FREEZE"

// Statuts volatils (peuvent coexister, disparaissent au switch/fin de combat).
export type VolatileStatus =
    | "CONFUSION" | "FLINCH" | "SEEDED" | "TRAPPED" | "PROTECT" | "RECHARGE"

// ============================================================
// Données statiques (data/)
// ============================================================

export interface MoveEffect {
    /** Probabilité (0..100) d'appliquer l'effet secondaire. Défaut 100. */
    chance?: number
    inflictStatus?: Exclude<MajorStatus, "NONE">
    inflictVolatile?: VolatileStatus
    statChanges?: Array<{ target: "self" | "target"; stat: StageKey; stages: number }>
    flinch?: boolean
    /** % des dégâts infligés rendus en PV à l'attaquant. */
    drainPct?: number
    /** % des dégâts infligés subis en recul par l'attaquant. */
    recoilPct?: number
    /** Coups multiples [min, max]. */
    multiHit?: [number, number]
    /** Soin en % des PV max (attaques de statut type Soin). */
    healPct?: number
    /** Multiplicateur de chance de critique (1 = normal, 8 = quasi garanti). */
    critStage?: number
}

export interface MoveData {
    id: string
    name: string
    type: PokeType
    category: MoveCategory
    /** Puissance de base (0 pour les attaques de statut). */
    power: number
    /** Précision 0..100. 0 = ne rate jamais (touche toujours). */
    accuracy: number
    /** Points de Pouvoir (nombre d'utilisations). */
    pp: number
    /** Priorité (-7..+5). Défaut 0. */
    priority?: number
    effect?: MoveEffect
    /** Texte court affiché ("Une attaque puissante !"). */
    description?: string
}

export type EvolutionMethod =
    | { kind: "LEVEL"; level: number }
    | { kind: "ITEM"; itemId: string }
    | { kind: "HAPPINESS" }

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY"

export interface SpeciesData {
    id: string
    dexNo: number
    name: string
    types: PokeType[]                 // 1 ou 2 types
    baseStats: Record<StatKey, number>
    learnset: Array<{ level: number; moveId: string }>
    evolution?: { toId: string; method: EvolutionMethod }
    /** 0..255 (plus bas = plus dur à capturer). */
    catchRate: number
    /** Base d'XP cédée à la défaite. */
    baseExp: number
    rarity: Rarity
    description: string
    /** Chemin public, ex "/yellow/sprites/dex/loupiote.png". */
    sprite: string
}

// ============================================================
// Instances concrètes (un monstre réel : équipe, sauvage, dresseur)
// ============================================================

export interface MoveSlot {
    moveId: string
    pp: number
    ppMax: number
}

export interface MonInstance {
    /** Identifiant unique d'instance (≠ speciesId). */
    uid: string
    speciesId: string
    nickname?: string
    level: number
    exp: number
    ivs: Record<StatKey, number>      // 0..31
    currentHp: number
    status: MajorStatus
    /** Compteur lié au statut (tours de sommeil restants, paliers toxic…). */
    statusCounter: number
    moves: MoveSlot[]
    happiness?: number
    /** True une fois capturé par le joueur (sinon sauvage/dresseur). */
    owned?: boolean
}

/** Monstre tel qu'il existe DANS un combat (instance + état runtime). */
export interface BattleMon extends MonInstance {
    stages: StatStages
    volatiles: Partial<Record<VolatileStatus, number>>
}

// ============================================================
// Helpers de construction d'état neutre
// ============================================================

export function neutralStages(): StatStages {
    return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }
}
