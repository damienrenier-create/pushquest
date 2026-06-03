// src/lib/gamebook/yellow/battle/damage.ts
//
// Nexus Jaune Éclair — calcul des dégâts (PUR, testable, STRICT Gen 1).
// Le moteur choisit Attaque/Défense OU Spécial/Spécial selon moveCategory(type)
// avant d'appeler computeDamage. Crit Gen 1 : ×2, probabilité liée à la Vitesse de base.

import type { PokeType } from "./types"
import { typeEffectiveness } from "./typeChart"

export interface DamageInput {
    level: number
    power: number
    /** Stat offensive EFFECTIVE (Attaque pour move physique, Spécial pour spécial). */
    attack: number
    /** Stat défensive EFFECTIVE (Défense pour physique, Spécial pour spécial). */
    defense: number
    stab: boolean
    typeEff: number
    isCrit: boolean
    randomFactor: number   // 0.85..1.00 (Rng.damageFactor())
}

export interface DamageResult {
    damage: number
    isCrit: boolean
    typeEff: number
    breakdown: { base: number; afterCrit: number; afterStab: number; afterType: number }
}

const CRIT_MULT = 2     // Gen 1
const STAB_MULT = 1.5

export function computeDamage(i: DamageInput): DamageResult {
    if (i.typeEff === 0 || i.power <= 0) {
        return { damage: 0, isCrit: i.isCrit, typeEff: i.typeEff, breakdown: { base: 0, afterCrit: 0, afterStab: 0, afterType: 0 } }
    }
    // Base : ((2*level/5 + 2) * power * atk / def) / 50 + 2
    const base =
        Math.floor(
            Math.floor(
                (Math.floor((2 * i.level) / 5 + 2) * i.power * i.attack) / i.defense,
            ) / 50,
        ) + 2

    const afterCrit = Math.floor(base * (i.isCrit ? CRIT_MULT : 1))
    const afterStab = Math.floor(afterCrit * (i.stab ? STAB_MULT : 1))
    const afterType = Math.floor(afterStab * i.typeEff)
    const damage = Math.max(1, Math.floor(afterType * i.randomFactor))

    return { damage, isCrit: i.isCrit, typeEff: i.typeEff, breakdown: { base, afterCrit, afterStab, afterType } }
}

// ============================================================
// Couches isolées
// ============================================================

export function hasStab(moveType: PokeType, attackerTypes: PokeType[]): boolean {
    return attackerTypes.includes(moveType)
}

export { typeEffectiveness }

/**
 * Probabilité de critique Gen 1 (0..1) : basée sur la VITESSE DE BASE de l'attaquant.
 * Normal = baseSpeed/512 ; move à haute crit = ×8 (plafonné à ~255/256).
 */
export function critProbabilityGen1(baseSpeed: number, highCrit = false): number {
    const t = Math.floor(baseSpeed / 2) * (highCrit ? 8 : 1)
    return Math.min(255, t) / 256
}
