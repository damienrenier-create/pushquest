// src/app/api/gamebook/yellow/lab-defi/route.ts
//
// Nexus Jaune Éclair — validation SERVEUR des défis PHYSIQUES du labo (vraies reps PushQuest).
// Gated (isNexusYellowEnabled, comme /save & /player-stats). Le défi CT et le casino sont
// 100 % client (déterministes) → ils ne passent PAS par ici.
//
// POST body : { action: "start" | "check", kind, startSnapshot?, startedAt? }
//   - start  → pour "pushup1h" : renvoie le total PUSHUP du jour (snapshot anti-triche) + l'heure serveur.
//   - check  → valide selon le défi :
//       pushup1h : (total PUSHUP du jour − startSnapshot) ≥ 50 ET (now − startedAt) ≤ 1h
//       squat150 : plus grosse SÉRIE de SQUAT (à vie) ≥ 150
//       quota2x  : effort propre du jour ≥ 2 × quota
//   Le compte CRÉATEUR est validé d'office (test).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { isCreatorAccount } from "@/lib/gamebook/creator"
import { getTodayExerciseTotal, getMaxSingleSet, getDayQuotaProgress } from "@/lib/gamebook/yellow/server/playerStats"

export const dynamic = "force-dynamic"

const PUSHUP_TARGET = 50
const PUSHUP_WINDOW_MS = 60 * 60 * 1000
const SQUAT_SET_TARGET = 150

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    let body: { action?: string; kind?: string; startSnapshot?: number; startedAt?: string }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }) }
    const action = body.action === "check" ? "check" : "start"
    const kind = body.kind ?? ""
    const nowMs = Date.now()

    if (action === "start") {
        // Seul "pushup1h" a besoin d'un snapshot (delta anti-ré-encodage). Les autres : juste l'heure serveur.
        if (kind === "pushup1h") {
            const snapshot = await getTodayExerciseTotal(userId, "PUSHUP")
            return NextResponse.json({ ok: true, snapshot, now: new Date(nowMs).toISOString() })
        }
        return NextResponse.json({ ok: true, now: new Date(nowMs).toISOString() })
    }

    // action === "check"
    const isCreator = await isCreatorAccount(userId)
    if (kind === "pushup1h") {
        const start = body.startedAt ? Date.parse(body.startedAt) : NaN
        const total = await getTodayExerciseTotal(userId, "PUSHUP")
        const delta = total - Math.max(0, Math.floor(body.startSnapshot ?? 0))
        const inWindow = !Number.isNaN(start) && (nowMs - start) <= PUSHUP_WINDOW_MS
        const validated = isCreator || (delta >= PUSHUP_TARGET && inWindow)
        return NextResponse.json({ ok: true, validated, delta, target: PUSHUP_TARGET, inWindow, expired: !inWindow })
    }
    if (kind === "squat150") {
        const maxSet = await getMaxSingleSet(userId, "SQUAT")
        const validated = isCreator || maxSet >= SQUAT_SET_TARGET
        return NextResponse.json({ ok: true, validated, maxSet, target: SQUAT_SET_TARGET })
    }
    if (kind === "quota2x") {
        const { total, quota } = await getDayQuotaProgress(userId)
        const target = quota * 2
        const validated = isCreator || total >= target
        return NextResponse.json({ ok: true, validated, total, quota, target })
    }
    return NextResponse.json({ ok: false, reason: "kind invalide" }, { status: 400 })
}
