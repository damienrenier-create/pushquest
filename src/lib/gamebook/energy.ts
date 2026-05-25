// src/lib/gamebook/energy.ts
//
// v3.23f — Modèle d'énergie unifié avec bonusSurplus persistant.
//
// ============================================================================
// MODÈLE
// ============================================================================
// availableEnergy = todayReps - energySpentToday + bonusSurplus
//
// - todayReps         : somme des reps faits aujourd'hui (ExerciseSet)
// - energySpentToday  : énergie dépensée aujourd'hui (mouvement, achats, etc.). Reset à minuit.
// - bonusSurplus      : reps de bonus gagnés (pommes, papa, capitaine, etc.) encore non dépensés.
//                       Positif uniquement. Jamais reset à minuit (fix bug v3.10).
//
// Quand un bonus est gagné  → bonusSurplus += reward
// Quand de l'énergie est dépensée :
//   - on consomme bonusSurplus d'abord (jusqu'à 0)
//   - puis on incrémente energySpentToday avec le reste
//
// À minuit, energySpentToday est remis à 0 (via le check date dans state/spend).
// bonusSurplus reste intact.
// ============================================================================

import prisma from "@/lib/prisma"
import { getTodayISO } from "@/lib/challenge"

// v3.23k — Conversion gainage → énergie : 5 secondes = 1 énergie (cohérent avec le scoring).
// Avant : 1 seconde = 1 énergie (trop généreux).
export const PLANK_SECONDS_PER_ENERGY = 5

/**
 * Somme des reps du jour convertis en énergie utilisable dans le Nexus.
 * Les pompes, squats, tractions comptent rep-pour-rep ; le gainage est divisé par
 * PLANK_SECONDS_PER_ENERGY pour rester aligné avec le système de scoring.
 */
export async function getTodayRepsForEnergy(userId: string): Promise<number> {
    const today = getTodayISO()
    const sets = await prisma.exerciseSet.findMany({
        where: { userId, date: today },
    })
    return sets.reduce((sum: number, s: { exercise: string; reps: number }) => {
        const energyValue = s.exercise === "PLANK"
            ? Math.floor(s.reps / PLANK_SECONDS_PER_ENERGY)
            : s.reps
        return sum + energyValue
    }, 0)
}

interface EnergySnapshot {
    energySpentToday: number
    energySpentDate: string
    bonusSurplus: number
}

/**
 * Lit le snapshot d'énergie courant en gérant le reset minuit.
 * Si la date stockée n'est pas aujourd'hui → energySpentToday rapporté à 0.
 */
export function readEnergySnapshot(progress: unknown, today: string): EnergySnapshot {
    const p = progress as {
        energySpentToday?: number
        energySpentDate?: string
        bonusSurplus?: number
    }
    const storedDate = p.energySpentDate ?? ""
    const storedSpent = p.energySpentToday ?? 0
    const bonusSurplus = Math.max(0, p.bonusSurplus ?? 0)
    return {
        energySpentToday: storedDate === today ? Math.max(0, storedSpent) : 0,
        energySpentDate: today,
        bonusSurplus,
    }
}

/**
 * Calcule l'énergie disponible à partir du snapshot et des reps du jour.
 */
export function computeAvailableEnergy(todayReps: number, snap: EnergySnapshot): number {
    return todayReps - snap.energySpentToday + snap.bonusSurplus
}

/**
 * Calcule le nouveau snapshot après un GRANT (bonus gagné).
 * Ajoute reward au bonusSurplus. Si reward < 0 (malus type Maléfica),
 * on consomme via spendEnergyOnSnapshot (consomme bonusSurplus puis spent).
 */
export function grantRewardOnSnapshot(snap: EnergySnapshot, reward: number, today: string): EnergySnapshot {
    if (reward < 0) {
        // Malus : on traite comme une dépense
        return spendEnergyOnSnapshot(snap, -reward, today)
    }
    return {
        energySpentToday: snap.energySpentToday,
        energySpentDate: today,
        bonusSurplus: snap.bonusSurplus + reward,
    }
}

/**
 * Calcule le nouveau snapshot après une DÉPENSE.
 * Consomme d'abord bonusSurplus, puis incrémente energySpentToday avec le reste.
 */
export function spendEnergyOnSnapshot(snap: EnergySnapshot, amount: number, today: string): EnergySnapshot {
    if (amount <= 0) return { ...snap, energySpentDate: today }
    const fromSurplus = Math.min(snap.bonusSurplus, amount)
    const remaining = amount - fromSurplus
    return {
        energySpentToday: snap.energySpentToday + remaining,
        energySpentDate: today,
        bonusSurplus: snap.bonusSurplus - fromSurplus,
    }
}

/**
 * Helper haut-niveau : grant un reward + retourne le diff à appliquer en DB.
 * Usage :
 *   const diff = await grantReward(userId, 80)
 *   await prisma.gamebookProgress.update({ ..., data: diff })
 *
 * (Pour les routes qui font déjà leur propre update avec d'autres champs.)
 */
export async function grantReward(userId: string, reward: number): Promise<Partial<EnergySnapshot> & { _ok: boolean }> {
    const CHAPTER_ID = "map_v3"
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return { _ok: false }
    const today = getTodayISO()
    const snap = readEnergySnapshot(progress, today)
    const next = grantRewardOnSnapshot(snap, reward, today)
    return {
        _ok: true,
        energySpentToday: next.energySpentToday,
        energySpentDate: today,
        bonusSurplus: next.bonusSurplus,
    }
}
