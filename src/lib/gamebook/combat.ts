// src/lib/gamebook/combat.ts
//
// v4.0 Phase 2.A — Cœur du moteur combat (formules pures, types matchups).
//
// AUCUNE dépendance Prisma / React / Next. Lib pure, testable directement.
//
// Formule dégâts Pokémon Gen 1 (adaptée) :
//
//   damage = floor(
//     ((((2 × Level / 5) + 2) × Power × ATK / DEF) / 50) × STAB × Type × Crit × Random
//   ) + 2
//
// avec :
//   - Level    = combatLevel de l'attaquant
//   - Power    = puissance brute de l'attaque
//   - ATK      = Force (physique) ou Intelligence (spéciale) effective de l'attaquant
//   - DEF      = Défense (physique) ou Intelligence (spéciale) effective du défenseur
//   - STAB     = 1.5 si type de l'attaque ∈ types du Daemon attaquant, sinon 1
//   - Type     = produit des matchups (0 / 0.5 / 1 / 2 / 4)
//   - Crit     = 2 si critique, 1 sinon
//   - Random   = nombre uniforme dans [0.85, 1.0]
//
// Hors combat critique, le minimum de dégâts est 1 (sauf immunité = 0).
//
// Coût énergie :
//   effectiveCost = max(1, floor(attack.energyCost × (1 - Int/200)))
//   → Int = 100 → 50% réduction (cap)

import type { Attack } from "./attacks"
import type { DaemonType } from "./daemon"

// ============================================================
// Constantes
// ============================================================
export const STAB_BONUS = 1.5
export const CRIT_MULTIPLIER = 2
export const RANDOM_MIN = 0.85
export const RANDOM_MAX = 1.0
export const INT_ENERGY_REDUCTION_CAP = 0.5  // Int=100 → max 50% off

// ============================================================
// Table de types — 10×10 (matchups)
// ============================================================
// Lecture : TYPE_CHART[attacker][defender] = multiplicateur (0, 0.5, 1, 2)
// Pour l'instant pas de combinaisons de types (un Daemon a UN seul type).

type TypeChart = Record<DaemonType, Partial<Record<DaemonType, number>>>

export const TYPE_CHART: TypeChart = {
    Normal: {
        Roche: 0.5,
        Combat: 1,  // pas d'avantage, mais Combat est super efficace VS Normal
    },
    Feu: {
        Plante: 2,
        Eau: 0.5,
        Roche: 0.5,
        Feu: 0.5,
    },
    Eau: {
        Feu: 2,
        Roche: 2,
        Plante: 0.5,
        Electrique: 0.5,  // électricité dans l'eau = neutre côté défense (cohérent avec gen 1 inverse)
        Eau: 0.5,
    },
    Plante: {
        Eau: 2,
        Roche: 2,
        Feu: 0.5,
        Vol: 0.5,
        Plante: 0.5,
    },
    Electrique: {
        Eau: 2,
        Vol: 2,
        Plante: 0.5,
        Roche: 0,        // l'électricité ne passe pas dans la roche (Gen 1)
        Electrique: 0.5,
    },
    Vol: {
        Plante: 2,
        Combat: 2,
        Electrique: 0.5,
        Roche: 0.5,
    },
    Psy: {
        Combat: 2,
        Psy: 0.5,
    },
    Pate: {
        // Custom : super efficace vs Feu/Eau/Normal (la pâte étouffe / absorbe)
        Feu: 2,
        Eau: 2,
        Normal: 2,
        // Faible vs Combat (les chiens flics croquent la pâte)
        Combat: 0.5,
        Pate: 0.5,
    },
    Combat: {
        Normal: 2,
        Roche: 2,
        Vol: 0.5,
        Psy: 0.5,
    },
    Roche: {
        Feu: 2,
        Vol: 2,
        Eau: 0.5,
        Plante: 0.5,
        Combat: 0.5,
    },
}

/** Renvoie le multiplicateur d'efficacité (0, 0.5, 1, 2). */
export function getTypeEffectiveness(attacker: DaemonType, defender: DaemonType): number {
    const row = TYPE_CHART[attacker]
    if (!row) return 1
    const mult = row[defender]
    return mult === undefined ? 1 : mult
}

/** Renvoie un label humain ("super efficace", "peu efficace", "sans effet"). */
export function typeEffectivenessLabel(mult: number): string | null {
    if (mult === 0) return "Ça n'a aucun effet."
    if (mult >= 2) return "C'est super efficace !"
    if (mult > 0 && mult < 1) return "Ce n'est pas très efficace…"
    return null
}

// ============================================================
// Acteur combat (vue minimaliste pour les formules)
// ============================================================
export interface CombatActor {
    name: string
    type: DaemonType
    combatLevel: number
    /** Force effective (après bonheur, bonus, items). */
    force: number
    /** Défense effective (après bonheur, bonus, items). */
    defense: number
    /** Intelligence effective (après bonheur, bonus, items). */
    intelligence: number
}

// ============================================================
// Coût énergie effectif d'une attaque (réduit par Intelligence)
// ============================================================
export function effectiveEnergyCost(attack: Attack, intelligence: number): number {
    const reduction = Math.min(INT_ENERGY_REDUCTION_CAP, intelligence / 200)
    return Math.max(1, Math.floor(attack.energyCost * (1 - reduction)))
}

// ============================================================
// Roll critique
// ============================================================
export function rollCrit(critRate: number, rng: () => number = Math.random): boolean {
    return rng() < critRate
}

// ============================================================
// Roll touche
// ============================================================
export function rollHit(accuracy: number, rng: () => number = Math.random): boolean {
    // accuracy 0..100 → seuil 0..1
    return rng() < Math.max(0, Math.min(1, accuracy / 100))
}

// ============================================================
// Roll dégâts random (0.85 à 1.0)
// ============================================================
export function rollRandomDamage(rng: () => number = Math.random): number {
    return RANDOM_MIN + rng() * (RANDOM_MAX - RANDOM_MIN)
}

// ============================================================
// Calcul dégâts complet
// ============================================================
export interface DamageResult {
    damage: number
    isCrit: boolean
    typeMult: number
    stab: boolean
    /** Multiplicateur random (0.85-1.0) effectivement utilisé. */
    randomRoll: number
}

export function computeDamage(
    attacker: CombatActor,
    defender: CombatActor,
    attack: Attack,
    opts?: {
        forceCrit?: boolean
        rng?: () => number
    },
): DamageResult {
    const rng = opts?.rng ?? Math.random
    const isCrit = opts?.forceCrit ?? false  // le caller décide du crit (on a la formule séparée)

    const atk = attack.isPhysical ? attacker.force : attacker.intelligence
    const def = attack.isPhysical ? defender.defense : defender.intelligence

    // Formule Gen 1
    const levelTerm = (2 * attacker.combatLevel) / 5 + 2
    const ratio = atk / Math.max(1, def)
    let base = (levelTerm * attack.power * ratio) / 50

    const stab = attack.type === attacker.type
    if (stab) base *= STAB_BONUS

    const typeMult = getTypeEffectiveness(attack.type, defender.type)
    base *= typeMult

    if (isCrit) base *= CRIT_MULTIPLIER

    const randomRoll = rollRandomDamage(rng)
    base *= randomRoll

    let damage = Math.floor(base) + 2

    // Minimum 1 sauf si type-immune
    if (typeMult === 0) damage = 0
    else if (damage < 1) damage = 1

    return { damage, isCrit, typeMult, stab, randomRoll }
}

// ============================================================
// Switch (changer de Daemon en cours de combat)
// ============================================================
export const SWITCH_TURN_COST = 1  // le switch occupe ton tour (l'ennemi attaque gratuitement)

// ============================================================
// Fuite (vs Daemons sauvages uniquement, jamais vs PNJ)
// ============================================================
export const FLEE_HAPPINESS_COST = 10  // -10 happiness sur le leader si tu fuis

/**
 * Probabilité de fuite (style Pokémon Gen 1 simplifié) :
 *   fleeChance = clamp(0.3 + (yourSpeed - enemySpeed) / 200, 0.1, 0.95)
 */
export function fleeChance(yourSpeed: number, enemySpeed: number): number {
    const raw = 0.3 + (yourSpeed - enemySpeed) / 200
    return Math.max(0.1, Math.min(0.95, raw))
}
