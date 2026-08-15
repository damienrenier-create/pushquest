// src/lib/gamebook/yellow/server/playerStats.ts
//
// Nexus Jaune Éclair — pont MÉTA : convertit les vraies stats PushQuest du jour
// (pompes / squats / quota) en contexte de rencontre sauvage (WildPlayerCtx).
// SERVEUR uniquement (accès Prisma). Le client le récupère via /player-stats.

import prisma from "@/lib/prisma"
import { getTodayISO, getYesterdayISO, getDailyTargetWithModifiers, getDailyTargetForUserOnDate, getDatesInRangeToYesterday } from "@/lib/challenge"
import { ownQuotaTotal } from "@/lib/quota"
import type { WildPlayerCtx } from "../data/encounters"
import type { SaiyanWindow } from "../data/saiyanConfig"

/** Reps réalisées HIER (créditées au portefeuille du chapitre, plafonnées côté client). */
export async function getYesterdayReps(userId: string): Promise<number> {
    const date = getYesterdayISO()
    const sets = await (prisma as any).exerciseSet.findMany({ where: { userId, date } })
    return (sets as { reps: number }[]).reduce((a, s) => a + s.reps, 0)
}

/**
 * Totaux de reps pour le crédit "high-water" de l'énergie :
 * - totalToDate    : somme de TOUTES les reps jusqu'à AUJOURD'HUI inclus (en direct).
 * - throughYesterday : somme jusqu'à HIER inclus (sert à initialiser le pic sans flood).
 */
export async function getRepsTotals(userId: string): Promise<{ totalToDate: number; throughYesterday: number }> {
    const today = getTodayISO()
    const yesterday = getYesterdayISO()
    const [allAgg, yAgg] = await Promise.all([
        (prisma as any).exerciseSet.aggregate({ _sum: { reps: true }, where: { userId, date: { lte: today } } }),
        (prisma as any).exerciseSet.aggregate({ _sum: { reps: true }, where: { userId, date: { lte: yesterday } } }),
    ])
    return {
        totalToDate: Math.max(0, allAgg?._sum?.reps ?? 0),
        throughYesterday: Math.max(0, yAgg?._sum?.reps ?? 0),
    }
}

/**
 * ENTRAÎNEMENT SAIYAN — évalue la fenêtre [since → hier] pour un joueur :
 * - hadFine : au moins une amende (FineRecord) tombée dans la fenêtre.
 * - quotaEveryDay : quota DÉPASSÉ (reps > cible) chaque jour terminé (≥ 1 jour).
 * Fenêtre sans jour terminé (since aujourd'hui/futur) → { false, false } = 1 point/niveau.
 */
export async function getSaiyanWindow(userId: string, since: string): Promise<SaiyanWindow> {
    const yesterday = getYesterdayISO()
    if (since > yesterday) return { hadFine: false, quotaEveryDay: false }
    const dates = getDatesInRangeToYesterday(since)
    if (dates.length === 0) return { hadFine: false, quotaEveryDay: false }

    const [fine, user, sets] = await Promise.all([
        (prisma as any).fineRecord.findFirst({ where: { userId, date: { gte: since, lte: yesterday } } }),
        (prisma as any).user.findUnique({ where: { id: userId } }),
        (prisma as any).exerciseSet.findMany({ where: { userId, date: { gte: since, lte: yesterday } } }),
    ])
    if (!user) return { hadFine: !!fine, quotaEveryDay: false }

    const repsByDate: Record<string, number> = {}
    for (const s of sets as { date: string; reps: number }[]) repsByDate[s.date] = (repsByDate[s.date] ?? 0) + s.reps

    let quotaEveryDay = true
    let missedQuota = false
    for (const d of dates) {
        const target = getDailyTargetForUserOnDate(user, d)
        const reps = repsByDate[d] ?? 0
        if (reps <= target) quotaEveryDay = false // "dépassé" = strictement >
        if (reps < target) missedQuota = true      // quota RATÉ ce jour-là
    }
    // INVITÉ (hors-concours, jamais amendé financièrement) : la pénalité Saiyan (0 point)
    // vient du quota RATÉ, pas du FineRecord → même exigence que tout le monde (faut faire
    // ses reps). Joueurs normaux : inchangés (FineRecord + ses exemptions).
    const hadFine = user.isGuest ? missedQuota : !!fine
    return { hadFine, quotaEveryDay }
}

// ════════════ DÉFIS PHYSIQUES DU LABO (validation serveur, vraies reps) ════════════

/** Total des reps d'un exercice AUJOURD'HUI (reps brutes). Sert au snapshot-delta du défi « 50 pompes/1h ». */
export async function getTodayExerciseTotal(userId: string, exercise: string): Promise<number> {
    const date = getTodayISO()
    const sets = await (prisma as any).exerciseSet.findMany({ where: { userId, date, exercise }, select: { reps: true } })
    return (sets as { reps: number }[]).reduce((a, s) => a + Math.max(0, s.reps), 0)
}

/** Plus grosse SÉRIE unique d'un exercice (à vie). Sert au défi « 150 squats en 1 série ». */
export async function getMaxSingleSet(userId: string, exercise: string): Promise<number> {
    const agg = await (prisma as any).exerciseSet.aggregate({ _max: { reps: true }, where: { userId, exercise } })
    return Math.max(0, agg?._max?.reps ?? 0)
}

/** Progression du quota du jour : effort PROPRE (setEffort, hors reps offertes) vs cible. Défi « quota×2 ». */
export async function getDayQuotaProgress(userId: string): Promise<{ total: number; quota: number }> {
    const date = getTodayISO()
    const [user, sets] = await Promise.all([
        (prisma as any).user.findUnique({ where: { id: userId } }),
        (prisma as any).exerciseSet.findMany({ where: { userId, date }, select: { date: true, exercise: true, reps: true, offeredToUserId: true } }),
    ])
    const total = ownQuotaTotal((sets ?? []) as { date: string; exercise: string; reps: number; offeredToUserId?: string | null }[], date)
    let quota = 1
    if (user) {
        try { const { target } = await getDailyTargetWithModifiers(user, date, prisma); quota = Math.max(1, target) } catch { /* défaut 1 */ }
    }
    return { total, quota }
}

/** Contexte neutre (aucun bonus) — repli si on n'a pas de données. */
export function neutralWildCtx(): WildPlayerCtx {
    return { pompes: 0, squats: 0, quotaReached: false, overshoot: 0, quotaRatio: 0, quota: 150 }
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

    // VŒU GÉNIE (Mools) : DETTE DE POMPES restante (server-authoritative → anti-triche). + CADEAU d'énergie en attente
    //   (canal anti-écrasement). Défensif : profil/colonnes absents → 0. On ne requête le cumul de pompes QUE si une
    //   dette existe (rare). Une seule lecture FrontierProfile pour les deux.
    let pushupDebt = 0
    let energyGrantPending = 0
    try {
        const fp = await (prisma as any).frontierProfile.findUnique({ where: { userId }, select: { pushupDebtOwed: true, pushupDebtBaseline: true, energyGrantPending: true } })
        energyGrantPending = Math.max(0, fp?.energyGrantPending ?? 0)
        const owed = fp?.pushupDebtOwed ?? 0
        if (owed > 0) {
            const agg = await (prisma as any).exerciseSet.aggregate({ where: { userId, exercise: "PUSHUP" }, _sum: { reps: true } })
            const cumulative = agg?._sum?.reps ?? 0
            pushupDebt = Math.max(0, owed - Math.max(0, cumulative - (fp?.pushupDebtBaseline ?? 0)))
        }
    } catch { /* profil / colonnes absents → pas de dette / pas de cadeau */ }

    return {
        pompes: Math.min(1, pushups / quota),
        squats: Math.min(1, squats / quota),
        quotaReached: total >= quota,
        overshoot: Math.min(1, Math.max(0, (total - quota) / quota)),
        quotaRatio: Math.min(1, Math.max(0, total / quota)),
        quota, // valeur brute → scale le coût des attaques en combat
        ...(pushupDebt > 0 ? { pushupDebt } : {}),
        ...(energyGrantPending > 0 ? { energyGrantPending } : {}),
    }
}
