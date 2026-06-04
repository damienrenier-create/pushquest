// src/lib/gamebook/yellow/battle/types.ts
//
// Nexus Jaune Éclair — TYPES FONDAMENTAUX (moteur de combat STRICT Gen 1).
// 100% React-free. Spécificités Gen 1 :
//   - 5 stats : HP, Attaque, Défense, Vitesse, SPÉCIAL (unifié, pas de split).
//   - la catégorie physique/spéciale d'un move dépend de son TYPE (cf. typeChart),
//     PAS du move → MoveData n'a donc PAS de champ "category".
//   - 15 types, 4 moves max.

// ============================================================
// Types élémentaires (15 — Gen 1)
// ============================================================

export const POKE_TYPES = [
    "NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE",
    "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE",
    "ROCHE", "SPECTRE", "DRAGON",
] as const
export type PokeType = (typeof POKE_TYPES)[number]

// 5 stats Gen 1 (spc = "Spécial" unifié : sert à l'attaque ET à la défense spéciale).
export type StatKey = "hp" | "atk" | "def" | "spe" | "spc"

/** Stats modifiables par stages en combat (+ précision/esquive), -6..+6. */
export type StageKey = "atk" | "def" | "spe" | "spc" | "acc" | "eva"
export type StatStages = Record<StageKey, number>

// Statuts majeurs (non-volatils, EXCLUSIFS entre eux).
export type MajorStatus =
    | "NONE" | "BURN" | "POISON" | "TOXIC" | "PARALYSIS" | "SLEEP" | "FREEZE"

// Statuts volatils (peuvent coexister, disparaissent au switch/fin de combat).
export type VolatileStatus =
    | "CONFUSION" | "FLINCH" | "SEEDED" | "TRAPPED" | "RECHARGE"

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
    drainPct?: number
    recoilPct?: number
    multiHit?: [number, number]
    healPct?: number
    /** Move à haute chance de critique (Gen 1 : ratio basé sur la vitesse de base ×8). */
    highCrit?: boolean
}

export interface MoveData {
    id: string
    name: string
    type: PokeType
    /** Puissance de base (0 = move de STATUT, ne fait pas de dégâts directs). */
    power: number
    /** Précision 0..100. 0 = ne rate jamais. */
    accuracy: number
    pp: number
    priority?: number
    effect?: MoveEffect
    description?: string
}

/** Un move fait-il des dégâts directs ? (Gen 1 : sinon c'est un move de statut.) */
export function isDamaging(move: MoveData): boolean {
    return move.power > 0
}

export type EvolutionMethod =
    | { kind: "LEVEL"; level: number }
    | { kind: "ITEM"; itemId: string }
    | { kind: "TRADE" }

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "LEGENDARY"

export interface SpeciesData {
    id: string
    dexNo: number
    name: string
    types: PokeType[]                 // 1 ou 2 types
    baseStats: Record<StatKey, number>  // hp, atk, def, spe, spc
    learnset: Array<{ level: number; moveId: string }>
    evolution?: { toId: string; method: EvolutionMethod }
    catchRate: number                 // 0..255
    baseExp: number
    rarity: Rarity
    description: string
    sprite: string
    /** Courbe d'XP (cf. game design). Défaut implicite : "medium_fast" (= L³). */
    growthRate?: "medium_fast" | "fast" | "slow" | "medium_slow"
    /** Rôle de game-design (lisibilité éditoriale, non utilisé par le moteur). */
    role?: string
}

// ============================================================
// Instances concrètes
// ============================================================

export interface MoveSlot {
    moveId: string
    pp: number
    ppMax: number
}

export interface MonInstance {
    uid: string
    speciesId: string
    nickname?: string
    level: number
    exp: number
    ivs: Record<StatKey, number>      // 0..15 (Gen 1 : "DV" sur 4 bits)
    currentHp: number
    status: MajorStatus
    statusCounter: number
    moves: MoveSlot[]
    owned?: boolean
}

export interface BattleMon extends MonInstance {
    stages: StatStages
    volatiles: Partial<Record<VolatileStatus, number>>
}

export function neutralStages(): StatStages {
    return { atk: 0, def: 0, spe: 0, spc: 0, acc: 0, eva: 0 }
}
