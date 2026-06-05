// src/app/api/gamebook/yellow/saiyan/route.ts
//
// Nexus Jaune Éclair — ENTRAÎNEMENT SAIYAN : évalue, pour des fenêtres
// [dernier level-up → hier], la règle PushQuest (amende → 0 / quota dépassé
// chaque jour → 2 / sinon → 1). Le client envoie les dates de début distinctes ;
// on renvoie le contexte par date. Gated feature flag (comme /save).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"
import { getSaiyanWindow } from "@/lib/gamebook/yellow/server/playerStats"
import type { SaiyanWindow } from "@/lib/gamebook/yellow/data/saiyanConfig"
import { getTodayISO } from "@/lib/challenge"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!(await isNexusYellowEnabled(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 404 })

    const today = getTodayISO()
    let sinceList: string[] = []
    try {
        const body = await req.json()
        if (Array.isArray(body?.since)) {
            const arr = (body.since as unknown[]).filter((s): s is string => typeof s === "string")
            sinceList = [...new Set(arr)]
        }
    } catch { /* corps vide / invalide → liste vide */ }

    const windows: Record<string, SaiyanWindow> = {}
    try {
        await Promise.all(sinceList.map(async (since) => {
            windows[since] = await getSaiyanWindow(userId, since)
        }))
    } catch {
        // En cas d'échec, on ne renvoie rien de punitif : le client retombe sur 1 point/niveau.
        return NextResponse.json({ ok: true, today, windows: {} })
    }
    return NextResponse.json({ ok: true, today, windows })
}
