// src/app/api/gamebook/tamagotchi/turn-talk/route.ts
//
// v3.27 — POST : interaction "se retourner vers son animal".
// Logique des 3 paliers dans une minute :
//   - 1ʳᵉ interaction : dialogue (l'animal va bien)
//   - 2ᵉ interaction (< 60s plus tard) : autre dialogue
//   - 3ᵉ interaction (< 60s plus tard) : retourne { choice: true } pour
//     déclencher un modal Parler / Ranger côté client
//
// Reset si > 60s d'inactivité.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { parseTamagotchi } from "@/lib/gamebook/tamagotchi"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const WINDOW_MS = 60_000

const LINES_FIRST = [
    "*Tu te penches vers lui. Il lève la tête, content.*",
    "*Il te lèche la main, ravi.*",
    "*Il pousse un petit cri joyeux quand tu le regardes.*",
]
const LINES_SECOND = [
    "*Il pose sa patte sur ton genou, comme pour dire \"encore ?\".*",
    "*Il tourne autour de toi en attendant quelque chose.*",
    "*Il te fixe avec ses grands yeux. Il aimerait que tu joues, ou que tu travailles dur — peu importe.*",
]

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export async function POST() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = (session.user as { id: string }).id

    const progress = await (prisma as any).gamebookProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId: CHAPTER_ID } },
    })
    if (!progress) return NextResponse.json({ ok: false, reason: "No progress" }, { status: 400 })

    const tam = parseTamagotchi((progress as { tamagotchi?: unknown }).tamagotchi)
    if (!tam || !tam.recovered) {
        return NextResponse.json({ ok: false, reason: "Pas d'animal récupéré." })
    }

    const inBag = (progress as { tamagotchiInBag?: boolean }).tamagotchiInBag === true
    if (inBag) {
        return NextResponse.json({ ok: false, reason: "L'animal est dans le sac." })
    }

    // Sliding window des interactions
    const now = Date.now()
    const raw = (progress as { tamagotchiInteractionsAt?: unknown }).tamagotchiInteractionsAt
    const past: number[] = Array.isArray(raw)
        ? (raw as unknown[])
            .map((x) => (typeof x === "string" ? new Date(x).getTime() : (typeof x === "number" ? x : NaN)))
            .filter((n) => Number.isFinite(n) && now - n <= WINDOW_MS)
        : []
    const count = past.length + 1
    const next = [...past, now].slice(-5).map((n) => new Date(n).toISOString())

    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tamagotchiInteractionsAt: next },
    })

    if (count === 1) {
        return NextResponse.json({
            ok: true,
            palier: 1,
            line: pick(LINES_FIRST),
        })
    }
    if (count === 2) {
        return NextResponse.json({
            ok: true,
            palier: 2,
            line: pick(LINES_SECOND),
        })
    }
    // 3+ : choix Parler / Ranger
    return NextResponse.json({
        ok: true,
        palier: 3,
        choice: true,
        name: tam.name,
    })
}
