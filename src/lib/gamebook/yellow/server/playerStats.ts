// src/lib/gamebook/yellow/server/playerStats.ts
//
// Nexus Jaune Éclair — pont MÉTA : convertit les vraies stats PushQuest du jour
// (pompes / squats / quota) en contexte de rencontre sauvage (WildPlayerCtx).
// SERVEUR uniquement (accès Prisma). Le client le récupère via /player-stats.

import prisma from "@/lib/prisma"
import { getTodayISO, getYesterdayISO, getDailyTargetWithModifiers } from "@/lib/challenge"
import type { WildPlayerCtx } from "../data/encounters"

/** Reps réalisées HIER (créditées au portefeuille du chapitre, plafonnées côté client). */
export async function getYesterdayReps(userId: string): Promise<number> {
    const date = getYesterdayISO()
    const sets = await (prisma as any).exerciseSet.findMany({ where: { userId, date } })
    return (sets as { reps: number }[]).reduce((a, s) => a + s.reps, 0)
}

/** Contexte neutre (aucun bonus) — repli si on n'a pas de données. */
export function neutralWildCtx(): WildPlayerCtx {
    return { pompes: 0, squats: 0, quotaReached: false, overshoot: 0 }
}

/**
 * Stats d'effort du jour normalisées pour moduler les rencontres :
 * - pompes / squats : reps du jour rapportées au quota (cap 1) → boost Combat / Roche-Sol
 * - quotaReached : total du jour ≥ quota → boost Élec
 * - overshoot : dépassement du quota rapporté au quota (cap 1) → boost des rares
 */
export async function getWildPlayerCtx(userId: string): Promise<WildPlayerCtx> {
    const date = getTodayISO()
    const [user, sets] = await Promise.all([
        (prisma as any).user.findUnique({ where: { id: userId } }),
        (prisma as any).exerciseSet.findMany({ where: { userId, date } }),
    ])
    if (!user) return neutralWildCtx()

    const sum = (ex: string) =>
        (sets as { exercise: string; reps: number }[])
            .filter((s) => s.exercise === ex)
            .reduce((a, s) => a + s.reps, 0)
    const pushups = sum("PUSHUP")
    const squats = sum("SQUAT")
    const total = (sets as { reps: number }[]).reduce((a, s) => a + s.reps, 0)

    let quota = 1
    try {
        const { target } = await getDailyTargetWithModifiers(user, date, prisma)
        quota = Math.max(1, target)
    } catch {
        /* quota indisponible → on garde 1 (overshoot/quotaReached restent prudents) */
    }

    return {
        pompes: Math.min(1, pushups / quota),
        squats: Math.min(1, squats / quota),
        quotaReached: total >= quota,
        overshoot: Math.min(1, Math.max(0, (total - quota) / quota)),
    }
}
