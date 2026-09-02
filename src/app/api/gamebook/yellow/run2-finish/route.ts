// src/app/api/gamebook/yellow/run2-finish/route.ts
//
// Nexus Jaune Éclair — 🏁 RANG À FINIR (mode fun). Grave la 1re fois qu'un joueur FUN BOUCLE le RUN 2 « Remix »
// (bat la Ligue + son double à la Salle Dorée = re-sacre). L'ORDRE d'arrivée (par `at` croissant) donne le bonus de
// score du run 2 fun (1er ×1,5 … 5e ×1,1, ensuite ×1) — appliqué dans /api/gamebook/yellow/run-scores.
//   POST : enregistre l'arrivée du joueur (idempotent, userId @unique) → { ok, finished:true }.
//
// Table gated (prisma as any).yellowRun2Finish → COMPILE avant db:push, try/catch → feature NEUTRE tant que la table
// n'existe pas. Concept RÉSERVÉ aux comptes fun (gameMode="fun").

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

export async function POST() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true, gameMode: true } })
    if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })
    if (me.gameMode !== "fun") return NextResponse.json({ ok: true, finished: false }) // rang-à-finir = fun uniquement

    try {
        const t = (prisma as any).yellowRun2Finish
        // Idempotent : la 1re arrivée FIGE l'horodatage (donc le rang) ; les suivantes ne le déplacent pas.
        await t.upsert({
            where: { userId: auth.userId },
            create: { userId: auth.userId, nickname: me.nickname },
            update: { nickname: me.nickname },
        })
        return NextResponse.json({ ok: true, finished: true })
    } catch {
        return NextResponse.json({ ok: true, finished: false }) // table pas encore créée → neutre
    }
}
