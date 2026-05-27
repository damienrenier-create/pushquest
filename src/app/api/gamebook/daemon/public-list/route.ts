// src/app/api/gamebook/daemon/public-list/route.ts
//
// v4.0 — GET : liste les Daemons publics (de tous les joueurs adoptés) pour le
// bestiaire du véto à Macaron'île. Permet de voir l'animal de ses potes dans les cages.
//
// Filtré : pas les comptes isSystem (exclus du social), pas les Daemons en cours d'adoption
// (recovered=false). Ordre : adoptedAt (createdAt du Daemon).

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
    const session = await getServerSession(authOptions)
    if (!session?.user || !(session.user as { id?: string }).id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const callerId = (session.user as { id: string }).id

    // Fetch tous les Daemons slot 1 (leader) avec utilisateur non-system non-tester, recovered=true
    const rows = await (prisma as any).daemon.findMany({
        where: {
            slotIndex: 1,
            recovered: true,
            user: { isSystem: false, isTester: false },
        },
        select: {
            id: true,
            name: true,
            speciesLevel: true,
            type: true,
            morphology: true,
            unlockedAt: true,
            createdAt: true,
            userId: true,
            user: { select: { nickname: true } },
        },
        orderBy: { createdAt: "asc" },
    })

    const daemons = rows.map((d: { id: string; name: string; speciesLevel: number; type: string; morphology: string; unlockedAt: Date | null; userId: string; user: { nickname: string } }) => ({
        id: d.id,
        name: d.name,
        speciesLevel: d.speciesLevel,
        type: d.type,
        morphology: d.morphology,
        unlocked: d.unlockedAt !== null,
        nickname: d.user.nickname,
        isOwn: d.userId === callerId,
    }))

    return NextResponse.json({ ok: true, daemons })
}
