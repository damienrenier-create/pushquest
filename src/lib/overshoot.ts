/**
 * overshoot.ts — Logique pure du "Défi du Dépassement de Quota".
 * Points = somme, sur la période, du % de dépassement du quota perso de chaque jour.
 *   points_jour = max(0, floor((total_reps_jour - quota_jour) / quota_jour * 100))
 *   total_reps_jour = pompes + tractions + squats + floor(gainage / 5)
 * Plancher 0 (pile le quota ou en dessous = 0). Pas de plafond.
 * Aucun import Prisma — logique pure.
 */
import { getDailyTargetForUserOnDate } from "./challenge";

export interface OvershootSet {
    date: string;
    exercise: string;
    reps: number;
}

/** Total de reps d'une journée selon la convention de l'app (PLANK compté /5). */
export function dayTotalReps(sets: OvershootSet[]): number {
    return sets.reduce(
        (sum, s) => sum + (s.exercise === "PLANK" ? Math.floor(s.reps / 5) : s.reps),
        0
    );
}

/** Liste des dates ISO (YYYY-MM-DD) de start à end inclus. */
export function datesInRange(startISO: string, endISO: string): string[] {
    const out: string[] = [];
    const cur = new Date(startISO + "T00:00:00Z");
    const end = new Date(endISO + "T00:00:00Z");
    while (cur <= end) {
        out.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
}

/**
 * Points de dépassement d'un joueur sur une liste de dates.
 * `user` doit porter `onboardingStartedAt` (pour le quota d'onboarding).
 * `sets` = les ExerciseSet du joueur (toutes dates, on filtre ici).
 */
export function overshootPointsForUser(
    user: any,
    sets: OvershootSet[],
    dates: string[]
): number {
    let points = 0;
    for (const d of dates) {
        const quota = getDailyTargetForUserOnDate(user, d);
        if (quota <= 0) continue;
        const total = dayTotalReps(sets.filter(s => s.date === d));
        if (total > quota) {
            points += Math.floor(((total - quota) / quota) * 100);
        }
    }
    return points;
}
