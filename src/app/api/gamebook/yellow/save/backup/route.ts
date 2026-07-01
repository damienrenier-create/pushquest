// src/app/api/gamebook/yellow/save/backup/route.ts
//
// Nexus Jaune Éclair — SAUVEGARDE DE SÉCURITÉ avant un reset. Copie la save courante
// (GamebookProgress.flags du chapitre "yellow") dans la colonne `history` (inutilisée par
// le Nexus) AVANT que resetYellowChapter() ne l'écrase. Aucune migration, coût ~nul.
// Garde les 5 derniers backups. Permet d'annuler un reset (accidentel ou non).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { MAX_HISTORY } from "@/lib/gamebook/yellow/storage/saveGuard"

export const dynamic = "force-dynamic"

const MAX_BACKUPS = MAX_HISTORY

export async function POST() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const row = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
        select: { flags: true, history: true },
    })
    if (!row?.flags) return NextResponse.json({ ok: true, backed: false })

    // On NE sauvegarde QUE si la save a du contenu réel (évite de backup une partie déjà vierge,
    // ce qui écraserait les backups utiles avec du vide).
    const f = row.flags as { team?: unknown[]; badges?: unknown[]; pokedex?: { caught?: unknown[] } }
    const meaningful = (f?.team?.length ?? 0) > 0 || (f?.badges?.length ?? 0) > 0 || (f?.pokedex?.caught?.length ?? 0) > 0
    if (!meaningful) return NextResponse.json({ ok: true, backed: false })

    const prev: unknown[] = Array.isArray(row.history) ? row.history : []
    const entry = { at: new Date().toISOString(), reason: "pre-reset", flags: row.flags }
    const history = [...prev, entry].slice(-MAX_BACKUPS)

    await (prisma as any).gamebookProgress.update({
        where: { userId_chapterId: { userId, chapterId: YELLOW_CHAPTER_ID } },
        data: { history: history as unknown as object },
    })
    return NextResponse.json({ ok: true, backed: true, count: history.length })
}
