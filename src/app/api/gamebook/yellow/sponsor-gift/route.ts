// src/app/api/gamebook/yellow/sponsor-gift/route.ts
//
// PARRAINAGE — réclamation des BONUS MUTUELS parrain↔filleul (calqué sur shiny-gift/GET).
//  GET : renvoie les dons en attente au login (arène / shiny) et les marque réclamés. Le CLIENT crédite
//        l'énergie (hors-plafond) et fait annoncer par le Dieu Spaghetti. Le montant "arène" est calculé
//        côté client (1/10 du repsCap du bénéficiaire) → energy=0 côté serveur pour ce type.
//
// Aucun POST : les dons sont créés côté serveur par arena-champions & shiny-gift (fanOutSponsorGift).
// Table gated (try/catch) → NEUTRE tant que db:push n'a pas créé SponsorGift.

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

// Réclamation au login : crédite les dons en attente, renvoie la liste (kind/energy/detail/pote) à annoncer.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const sg = (prisma as any).sponsorGift // table gated (créée par db:push)
        const pending = (await sg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            select: { id: true, kind: true, energy: true, detail: true, fromNickname: true },
            take: 200,
        })) as { id: string; kind: string; energy: number; detail: string | null; fromNickname: string }[]
        if (pending.length === 0) return NextResponse.json({ ok: true, gifts: [] })
        await sg.updateMany({ where: { id: { in: pending.map((g) => g.id) } }, data: { claimed: true } })
        const gifts = pending.map((g) => ({ kind: g.kind, energy: g.energy ?? 0, detail: g.detail ?? "", fromNickname: g.fromNickname }))
        return NextResponse.json({ ok: true, gifts })
    } catch {
        return NextResponse.json({ ok: true, gifts: [] }) // table pas encore créée → neutre
    }
}
