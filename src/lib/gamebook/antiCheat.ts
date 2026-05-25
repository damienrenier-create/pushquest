// src/lib/gamebook/antiCheat.ts
//
// v3.6 → v3.23s — Anti-triche suppression de reps (version adoucie).
//
// Quand un user réduit ses reps d'un jour (suppression de set, édition à la baisse,
// ressaisie avec moins), on déclenche une pénalité Gamebook :
//   - Set `gamebookFrozenUntil` à now + 5 min → bloque les mouvements
//   - **PLUS DE RESET de position** (le joueur reste là où il était)
//   - **PLUS DE RESET des flags narratifs** (progression préservée)
//
// La philosophie : on dissuade la triche par un "time-out" court, pas par une
// punition cataclysmique. 5 minutes c'est assez pour décourager l'expérimentation,
// mais ça ne flush pas l'arc narratif du joueur.
//
// Cas d'usage :
//   1. Snapshot des reps AVANT l'opération destructive (par date impactée)
//   2. Exécution de l'opération (delete/edit/upsert)
//   3. detectRepsDropAndPenalize() compare AVANT vs APRÈS et déclenche si baisse
//
// Règles métier :
//   - Détection = "reps du jour ont baissé" (pas "set supprimé") — couvre tous les patterns
//   - Admin exempté SAUF s'il agit sur son propre compte
//   - Comptes `isSystem: true` exemptés
//   - v3.23s : freeze 5 min, pas de reset, le joueur reprend où il était

import prisma from "../prisma"

// v3.23s — Durée du gel adoucie : 24h → 5 minutes. Suffisant pour dissuader
// l'expérimentation sans flusher l'arc narratif.
export const FREEZE_DURATION_MS = 5 * 60 * 1000 // 5 minutes
const CHAPTER_ID = "map_v3"

/**
 * Somme des reps d'un user pour une date donnée, tous exos confondus.
 */
export async function getDayRepsTotal(userId: string, date: string): Promise<number> {
    const sets = await (prisma as any).exerciseSet.findMany({
        where: { userId, date },
    })
    return sets.reduce((sum: number, s: { reps: number }) => sum + s.reps, 0)
}

/**
 * Capture le total de reps pour une liste de dates. Retourne un objet { date: total }.
 * À appeler AVANT l'opération destructive.
 */
export async function captureRepsSnapshot(
    userId: string,
    dates: string[]
): Promise<Record<string, number>> {
    const uniqueDates = Array.from(new Set(dates))
    const totals: Record<string, number> = {}
    for (const date of uniqueDates) {
        totals[date] = await getDayRepsTotal(userId, date)
    }
    return totals
}

/**
 * v3.23s — Déclenche la pénalité adoucie : freeze 5 minutes, SANS reset.
 * Le joueur reprend exactement là où il était avec sa progression intacte.
 * Idempotent : appelable plusieurs fois (reset toujours frozenUntil à now+5min).
 * No-op si l'user n'a pas de GamebookProgress (jamais joué).
 */
export async function triggerCheatPenalty(userId: string): Promise<void> {
    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })

    if (!progress) return

    const frozenUntil = new Date(Date.now() + FREEZE_DURATION_MS)

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: {
            gamebookFrozenUntil: frozenUntil,
            lastSeen: new Date(),
        },
    })
}

export interface DetectOptions {
    /** ID du user qui exécute l'action (admin ou user normal). Si différent de targetUserId
     *  ET que actorIsAdmin === true, on skip la pénalité (admin corrige les données d'un autre). */
    actorUserId?: string
    /** True si l'acteur est admin. Combiné avec actorUserId pour la règle d'exemption. */
    actorIsAdmin?: boolean
}

export interface DetectResult {
    triggered: boolean
    affectedDates: string[]
    skipped?: "admin_other_user" | "system_user" | "no_progress"
}

/**
 * Compare le snapshot pris avant l'opération avec l'état actuel.
 * Si AU MOINS une date a vu son total de reps baisser, déclenche la pénalité.
 *
 * Règles d'exemption :
 *   - Si target user a `isSystem: true` → skip
 *   - Si actor est admin ET actor !== target → skip (correction légitime)
 *
 * @param targetUserId User dont les reps sont modifiées (= victime potentielle de la pénalité)
 * @param snapshot     Résultat de captureRepsSnapshot() pris AVANT l'opération
 * @param options      Options d'exemption (admin)
 */
export async function detectRepsDropAndPenalize(
    targetUserId: string,
    snapshot: Record<string, number>,
    options: DetectOptions = {}
): Promise<DetectResult> {
    if (options.actorIsAdmin && options.actorUserId && options.actorUserId !== targetUserId) {
        return { triggered: false, affectedDates: [], skipped: "admin_other_user" }
    }

    const user = await (prisma as any).user.findUnique({
        where: { id: targetUserId },
        select: { isSystem: true },
    })
    if (user?.isSystem) {
        return { triggered: false, affectedDates: [], skipped: "system_user" }
    }

    const affectedDates: string[] = []
    for (const [date, before] of Object.entries(snapshot)) {
        const after = await getDayRepsTotal(targetUserId, date)
        if (after < before) {
            affectedDates.push(date)
        }
    }

    if (affectedDates.length === 0) {
        return { triggered: false, affectedDates: [] }
    }

    await triggerCheatPenalty(targetUserId)
    return { triggered: true, affectedDates }
}

/**
 * Helper de lecture : true si le user est actuellement frozen (penalty active).
 */
export function isGamebookFrozen(
    progress: { gamebookFrozenUntil?: Date | string | null } | null | undefined
): boolean {
    if (!progress?.gamebookFrozenUntil) return false
    const t = progress.gamebookFrozenUntil instanceof Date
        ? progress.gamebookFrozenUntil.getTime()
        : new Date(progress.gamebookFrozenUntil).getTime()
    return t > Date.now()
}
