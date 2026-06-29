// GET /api/gamebook/yellow/roulette/stats
//
// Statistiques du casino pour le carrousel du CROUPIER : numéros chauds/froids,
// numéro le plus / le moins sorti, top 10 des mises et des gains (jour / semaine / ever),
// et le joueur du jour. Lecture seule, agrégée sur RouletteRound + RouletteBet.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { colorOf } from "@/lib/gamebook/yellow/roulette/wheel"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const now = Date.now()
    const dayStart = new Date(new Date().setHours(0, 0, 0, 0))
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    try {
        // --- Chaud / froid : sur les 300 dernières manches résolues ---
        const rounds = await prisma.rouletteRound.findMany({
            where: { status: "RESOLVED", winningNumber: { not: null } },
            orderBy: { resolvedAt: "desc" }, take: 300,
            select: { winningNumber: true },
        })
        const count = new Map<number, number>()
        for (let n = 0; n <= 36; n++) count.set(n, 0)
        for (const r of rounds) if (r.winningNumber != null) count.set(r.winningNumber, (count.get(r.winningNumber) ?? 0) + 1)
        const ranked = [...count.entries()].map(([n, c]) => ({ n, c, color: colorOf(n) }))
        const hot = [...ranked].sort((a, b) => b.c - a.c || a.n - b.n).slice(0, 5)
        const cold = [...ranked].sort((a, b) => a.c - b.c || a.n - b.n).slice(0, 5)
        const totalSpins = rounds.length

        // --- Top mises (staked) & gains (net>0) : jour / semaine / ever ---
        const topBy = async (field: "staked" | "net", from?: Date) => {
            const rows = await prisma.rouletteBet.findMany({
                where: { ...(field === "net" ? { net: { gt: 0 } } : {}), ...(from ? { createdAt: { gte: from } } : {}) },
                orderBy: { [field]: "desc" }, take: 10,
                select: { nickname: true, staked: true, net: true, createdAt: true },
            })
            return rows.map((r) => ({ nickname: r.nickname, amount: field === "net" ? (r.net ?? 0) : r.staked }))
        }
        const [betsEver, betsWeek, betsDay, winsEver, winsWeek, winsDay] = await Promise.all([
            topBy("staked"), topBy("staked", weekAgo), topBy("staked", dayStart),
            topBy("net"), topBy("net", weekAgo), topBy("net", dayStart),
        ])

        return NextResponse.json({
            ok: true,
            totalSpins,
            hot, cold,
            mostDrawn: hot[0] ?? null,
            leastDrawn: cold[0] ?? null,
            topBets: { ever: betsEver, week: betsWeek, day: betsDay },
            topWins: { ever: winsEver, week: winsWeek, day: winsDay },
            playerOfDay: winsDay[0] ?? null,
        })
    } catch {
        return NextResponse.json({ ok: true, totalSpins: 0, hot: [], cold: [], topBets: { ever: [], week: [], day: [] }, topWins: { ever: [], week: [], day: [] }, playerOfDay: null })
    }
}
