// src/app/api/gamebook/yellow/hall-of-fame/energy/route.ts
//
// Nexus Jaune Éclair — réclamation de la RÉCOMPENSE CROISÉE de la Ligue.
//  GET : le joueur réclame ses dons d'énergie en attente (un autre joueur est devenu Champion) →
//        on les marque réclamés et on renvoie les pseudos des champions. Le CLIENT applique alors
//        +1/3 de SON quota (repsCap) par don (le serveur ne connaît pas le cap de chacun).
//
// Mêmes garde-fous gated que duel-gift/ : neutre tant que la table n'existe pas.

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

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const eg = (prisma as any).leagueEnergyGrant // table gated, créée par db:push
        const rows = (await eg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            orderBy: { createdAt: "asc" },
            take: 50,
            select: { id: true, fromNickname: true },
        })) as { id: string; fromNickname: string }[]
        if (rows.length > 0) {
            await eg.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { claimed: true } })
        }
        // `grants` = nb de sacres à récompenser ; `champions` = pseudos (pour la notif).
        return NextResponse.json({ ok: true, grants: rows.length, champions: rows.map((r) => r.fromNickname) })
    } catch {
        return NextResponse.json({ ok: true, grants: 0, champions: [] }) // table pas encore créée → neutre
    }
}
