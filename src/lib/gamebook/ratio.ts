// src/lib/gamebook/ratio.ts
//
// v3.23e — Module unifié du ratio d'onboarding pour le Gamebook/Nexus.
//
// ============================================================================
// DOCTRINE OFFICIELLE (validée 2026-05-25)
// ============================================================================
// "Tout est ratio-aware SAUF : XP de badges, récompenses EC, multiplicateurs
//  sans dimension physique, et malus (valeurs négatives)."
//
// Concrètement :
// - reps_reward (pommiers, BUFFY, papa, capitaine, etc.) → applyRatioToReward
// - reps_cost (mouvement, push, arbre obstacle, feed, etc.) → applyRatioToCost
// - prix d'achat (shop items)                              → applyRatioToCost
// - seuil exo (pompes/squats/gainage à valider pour PNJ)   → applyRatioToThreshold
// - XP gagné par un badge                                  → keepFixedXp (no-op)
// - EC gagné par une action                                → keepFixedEc (no-op)
// - Multiplicateurs (×0.5 cadence, ×1.1 lunettes, etc.)    → keepFixedMultiplier (no-op)
// - Malus reps (Maléfica -30)                              → keepFixedMalus (no-op)
//
// Pour toute nouvelle constante du Gamebook, **utiliser un de ces 7 helpers**
// pour rendre explicite l'intention vis-à-vis du ratio. Si tu n'es pas sûr,
// utilise applyRatioToReward (le cas le plus courant).
// ============================================================================
//
// Calcul du ratio (cf. getUserDifficultyRatio) :
//   ratio = max(0.1, userDailyTarget / standardDailyTarget)
//   1.0 = standard (vétéran), <1.0 = onboarding réduit (ex 0.2 = -80%).
//
// Math.max(1, ...) protège contre les valeurs à 0 (pas d'actions gratuites
// involontaires). C'est la raison pour laquelle on bypass pour les valeurs
// négatives (malus) : sinon Math.max(1, -X) = 1 → bonus inversé.

import prisma from "@/lib/prisma"
import { getDailyTargetForUserOnDate, getRequiredRepsForDate, getTodayISO } from "@/lib/challenge"

/** Plancher du ratio. Évite ratio=0 (actions gratuites involontaires). */
const MIN_RATIO = 0.1

/**
 * Retourne le ratio actuel d'un user. Calculé à la volée (pas figé) :
 *   ratio = userDailyTarget / standardDailyTarget
 *
 * Évolue naturellement avec l'onboarding (le quota du user grimpe jour
 * après jour, le standard aussi) — donc pas besoin de gate explicite.
 * Quand le user rejoint le standard, le ratio devient 1.0 et c'est no-op.
 */
export async function getUserDifficultyRatio(userId: string): Promise<number> {
    const user = await (prisma as any).user.findUnique({
        where: { id: userId },
    })
    if (!user) return 1.0
    const today = getTodayISO()
    const userTarget = getDailyTargetForUserOnDate(user, today)
    const standardTarget = getRequiredRepsForDate(today)
    if (standardTarget <= 0 || userTarget >= standardTarget) return 1.0
    return Math.max(MIN_RATIO, userTarget / standardTarget)
}

/**
 * Coeur du système : applique le ratio à une valeur positive.
 * Math.round pour neutralité statistique. Math.max(1, ...) pour ne jamais
 * tomber à 0 (sinon coût gratuit ou seuil bypassable).
 *
 * NE PAS appeler directement. Utilise les helpers sémantiques ci-dessous
 * (applyRatioToReward / Cost / Threshold) pour rendre l'intention explicite.
 */
function applyRatioCore(baseValue: number, ratio: number): number {
    if (ratio >= 1.0) return baseValue
    return Math.max(1, Math.round(baseValue * ratio))
}

// ============================================================================
// HELPERS QUI APPLIQUENT LE RATIO
// ============================================================================

/**
 * Récompense en reps (énergie) que le user reçoit (pommiers, BUFFY, papa,
 * capitaine, Nageur défi, case casino, contest_hall, Franss-joke, etc.).
 *
 * Onboarding reçoit moins en absolu mais le même % de son quota → équilibré.
 */
export function applyRatioToReward(baseReps: number, ratio: number): number {
    if (baseReps < 0) {
        // Sécurité : un reward négatif est un malus déguisé. Ne devrait pas arriver
        // mais on protège quand même. Pour les vrais malus, utilise keepFixedMalus.
        console.warn("[ratio] applyRatioToReward called with negative value:", baseReps)
        return baseReps
    }
    return applyRatioCore(baseReps, ratio)
}

/**
 * Coût en reps (énergie) que le user paye (déplacement, push, arbre obstacle,
 * tamagotchi feed, gourde, etc.) ET prix d'achat dans les shops.
 *
 * Onboarding paye moins en absolu mais le même % de son quota → équilibré.
 */
export function applyRatioToCost(baseReps: number, ratio: number): number {
    if (baseReps < 0) {
        console.warn("[ratio] applyRatioToCost called with negative value:", baseReps)
        return baseReps
    }
    return applyRatioCore(baseReps, ratio)
}

/**
 * Seuil d'exercice à valider (nombre de pompes/squats/tractions/secondes
 * de gainage) pour passer un défi PNJ (Pont, Tour, contest_hall, Nageur,
 * Tamagotchi défis).
 *
 * Onboarding a un seuil plus bas en absolu mais qui représente le même
 * % d'effort par rapport à son quota → équilibré.
 */
export function applyRatioToThreshold(baseExoCount: number, ratio: number): number {
    if (baseExoCount < 0) {
        console.warn("[ratio] applyRatioToThreshold called with negative value:", baseExoCount)
        return baseExoCount
    }
    return applyRatioCore(baseExoCount, ratio)
}

// ============================================================================
// HELPERS NO-OP (documente l'intention de NE PAS appliquer le ratio)
// ============================================================================

/**
 * XP gagné par un badge. **N'applique pas le ratio.** Un badge a la même
 * valeur XP pour tous les joueurs (sinon ça crée des décalages au moment
 * où un onboarding rejoint le standard).
 */
export function keepFixedXp(xp: number): number {
    return xp
}

/**
 * EC (EmberCoins) gagné par une action. **N'applique pas le ratio.** EC est
 * une monnaie partagée inter-joueurs : pas de variations onboarding.
 */
export function keepFixedEc(ec: number): number {
    return ec
}

/**
 * Multiplicateur sans dimension physique (×0.5 cadence Mont, ×1.1 lunettes,
 * ×10 gain casino pattern, etc.). **N'applique pas le ratio.** Ce sont des
 * coefficients, pas des reps absolues.
 */
export function keepFixedMultiplier(mult: number): number {
    return mult
}

/**
 * Malus en reps (perte d'énergie). Maléfica -30 par exemple. **N'applique pas
 * le ratio.** Sinon Math.max(1, ratio×(-30)) inverserait le signe. Le malus
 * frappe à pleine intensité même en onboarding (assumé : on apprend par
 * la douleur, peu importe le quota).
 */
export function keepFixedMalus(reps: number): number {
    return reps
}

/**
 * Mise/gain de casino. **N'applique pas le ratio.** Décision produit :
 * un casino est neutre, les mises sont fixes pour tous (10-50 reps).
 * Un onboarding qui mise prend exactement le même risque qu'un vétéran.
 */
export function keepFixedCasinoStake(reps: number): number {
    return reps
}

// ============================================================================
// LEGACY ALIAS — backwards compat tant que toutes les routes ne sont pas migrées
// ============================================================================

/** @deprecated Utilise applyRatioToReward, applyRatioToCost ou applyRatioToThreshold pour exprimer l'intention. */
export const applyRatio = applyRatioCore
