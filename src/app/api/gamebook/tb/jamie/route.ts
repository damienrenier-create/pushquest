// src/app/api/gamebook/tb/jamie/route.ts
//
// v3.24c-6 — POST : JAMIE (petit frère de JAMES) remet la clé du bureau d'IL CAPO
// si les 3 sbires (meowth/jessie/giovanni) ont été battus.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

const CHAPTER_ID = "map_v3"
const REQUIRED_SBIRES = ["meowth", "jessie", "giovanni"]

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

    const keyHeld = (progress as { tbBossKeyHeld?: boolean }).tbBossKeyHeld === true
    if (keyHeld) {
        return NextResponse.json({
            ok: true,
            alreadyHeld: true,
            message: "JAMIE chuchote : « T'as déjà la clé. Va voir le boss. Et... fais attention. »",
        })
    }

    const done: string[] = Array.isArray((progress as { tbBarDefisDone?: unknown }).tbBarDefisDone)
        ? ((progress as { tbBarDefisDone: unknown[] }).tbBarDefisDone as string[])
        : []
    const missing = REQUIRED_SBIRES.filter((s) => !done.includes(s))

    if (missing.length > 0) {
        return NextResponse.json({
            ok: false,
            missing,
            message: `JAMIE se cache encore : « Il en reste ${missing.length} à battre... ${missing.map((s) => s.toUpperCase()).join(", ")}. »`,
        })
    }

    // Tous les sbires battus → remet la clé
    await (prisma as any).gamebookProgress.update({
        where: { id: progress.id },
        data: { tbBossKeyHeld: true },
    })

    return NextResponse.json({
        ok: true,
        keyGiven: true,
        message: "JAMIE sort une vieille clé rouillée de sa poche : « Tiens. C'est la clé du bureau d'IL CAPO. Promets-moi de gagner... pour mon grand frère. »",
    })
}
