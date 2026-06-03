// src/lib/gamebook/yellow/battle/damage.ts
//
// Nexus Jaune Éclair — calcul des dégâts (fonction PURE et testable).
// Formule canonique Gen 3+ décomposée en couches (base → crit → STAB → type → aléa)
// pour pouvoir tester/ajuster chaque modificateur indépendamment.

import type { PokeType } from "./types"
import { typeEffectiveness } from "./typeChart"

export interface DamageInput {
    level: number
    /** Puissance de l'attaque (> 0). */
    power: number
    /** Stat offensive EFFECTIVE (atk ou spa, post-stage/statut). */
    attack: number
    /** Stat défensive EFFECTIVE (def ou spd, post-stage). */
    defense: number
    /** STAB : le type de l'attaque ∈ types de l'attaquant. */
    stab: boolean
    /** Multiplicateur d'efficacité de type (0 / 0.25 / 0.5 / 1 / 2 / 4). */
    typeEff: number
    /** Coup critique. */
    isCrit: boolean
    /** Facteur aléatoire 0.85..1.00 (Rng.damageFactor()). */
    randomFactor: number
}

export interface DamageResult {
    damage: number
    isCrit: boolean
    typeEff: number
    /** Couches intermédiaires (debug / affichage). */
    breakdown: { base: number; afterCrit: number; afterStab: number; afterType: number }
}

const CRIT_MULT = 1.5
const STAB_MULT = 1.5

/** Dégâts d'une attaque offensive. Renvoie 0 si typeEff === 0 (immunité). */
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
// Couches isolées (réutilisables / testables)
// ============================================================

/** STAB : le type de l'attaque appartient-il à l'attaquant ? */
export function hasStab(moveType: PokeType, attackerTypes: PokeType[]): boolean {
    return attackerTypes.includes(moveType)
}

export { typeEffectiveness }

/** Probabilité de critique (0..1) selon le palier (Gen 2+). */
export function critProbability(critStage = 0): number {
    const table = [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2]
    return table[Math.max(0, Math.min(table.length - 1, critStage))]
}
