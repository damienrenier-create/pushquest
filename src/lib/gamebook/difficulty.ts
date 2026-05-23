// src/lib/gamebook/difficulty.ts
//
// v3.10 — Système de réduction proportionnelle pour les joueurs en onboarding.
//
// Un user en onboarding a un quota quotidien plus faible (30 reps day 1,
// +3 par jour, +2 le dimanche) que les vétérans (quota = jour de l'année,
// ≈145 reps aujourd'hui).
//
// Pour que les nouveaux jouent avec le même % d'effort, tous les coûts du
// Gamebook sont multipliés par le ratio :
//     ratio = userDailyTarget / standardDailyTarget
//
// Effet : un onboarding (quota 30) à un jour où le standard est 150 paye 20%
// des coûts vétérans. Les rewards (fruits, BUFFY, DURUM) ne sont PAS affectées
// volontairement, c'est un bonus de découverte.

import prisma from "@/lib/prisma"
import { getDailyTargetForUserOnDate, getRequiredRepsForDate, getTodayISO } from "@/lib/challenge"

/** Plancher du ratio pour éviter les coûts à 0. */
const MIN_RATIO = 0.1

/**
 * Retourne le ratio de difficulté du user (1.0 = standard, < 1.0 = onboarding réduit).
 * Toujours floored à MIN_RATIO.
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
 * Applique un ratio à un coût/seuil. Arrondi à l'entier supérieur,
 * minimum 1 (jamais 0 pour ne pas casser les checks "amount > 0").
 */
export function applyRatio(baseValue: number, ratio: number): number {
    if (ratio >= 1.0) return baseValue
    return Math.max(1, Math.ceil(baseValue * ratio))
}
