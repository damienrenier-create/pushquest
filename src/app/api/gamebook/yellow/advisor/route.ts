// src/app/api/gamebook/yellow/advisor/route.ts
//
// Nexus Jaune Éclair — CONSEILLER (PNJ à côté du Centre Daemon).
// POST : le joueur pose une question → stockée en base (AdvisorQuestion).
// GET  : renvoie MES questions + leurs réponses (le créateur répond en base via `answer`).
//
// NB : on utilise (prisma as any).advisorQuestion comme la route save/ (gated feature) →
// le code compile même avant `npm run db:push` (qui crée la table ET régénère le client).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const MAX_LEN = 500 // garde-fou anti-spam (question raisonnablement courte)

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    const rows = await (prisma as any).advisorQuestion.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, question: true, answer: true, createdAt: true, answeredAt: true },
    })
    return NextResponse.json({ ok: true, questions: rows })
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { question?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }

    const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_LEN) : ""
    if (question.length < 3) return NextResponse.json({ error: "Question trop courte" }, { status: 400 })

    // Anti-flood léger : pas plus d'une question toutes les 30 s par joueur.
    const last = await (prisma as any).advisorQuestion.findFirst({
        where: { userId: auth.userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
    })
    if (last && Date.now() - new Date(last.createdAt).getTime() < 30_000) {
        return NextResponse.json({ error: "Doucement ! Attends un peu avant de reposer une question." }, { status: 429 })
    }

    const created = await (prisma as any).advisorQuestion.create({
        data: { userId: auth.userId, question },
        select: { id: true, question: true, answer: true, createdAt: true, answeredAt: true },
    })
    return NextResponse.json({ ok: true, question: created })
}
