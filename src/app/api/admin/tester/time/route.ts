// src/app/api/admin/tester/time/route.ts
//
// Panneau testeur — simule le passage à minuit.
// Body :
//   { skipToMidnight: true }   → force tous les champs *Date à un jour antérieur
//                                pour déclencher le reset des compteurs daily
//                                au prochain GET /state.
//   { advanceHours: number }   → idem mais en avançant l'horloge (utile pour
//                                tester des cooldowns < 24h)

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireTester } from "@/lib/admin/requireTester"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"

const DATE_FIELDS = [
    "energySpentDate",
    "casinoBetsDate",
    "lottoPouleDate",
    "stopOuEncoreDate",
    "cockfightDate",
    "slotMachinesDate",
    "casinoBoostDate",
    "casinoCroupierTalkedToday",
    "lastTeamCaptainBonusDate",
    "lastArenaDate",
    "vetoMuscuLastVisitDate",
    "lastLuckTalkDate",
    "lastHotelSleepDate",
    "lastDailyDecayDate",
    "happyFlowerLastDate",
] as const

export async function POST(req: NextRequest) {
    const auth = await requireTester()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const userId = auth.userId

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* empty */ }

    if (body.skipToMidnight === true || typeof body.advanceHours === "number") {
        // On simule le passage à minuit en backdate-ant tous les champs *Date d'un jour.
        // Les routes joueur reseteront naturellement leur compteur au prochain accès.
        const data: Record<string, string> = {}
        for (const f of DATE_FIELDS) {
            data[f] = "1970-01-01"  // valeur lexicographiquement inférieure à n'importe quel today
        }
        await (prisma as any).gamebookProgress.update({
            where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
            data,
        })
        return NextResponse.json({
            ok: true,
            action: body.skipToMidnight ? "skipToMidnight" : "advanceHours",
            fieldsReset: DATE_FIELDS,
        })
    }

    return NextResponse.json({ ok: false, reason: "skipToMidnight or advanceHours required" }, { status: 400 })
}
