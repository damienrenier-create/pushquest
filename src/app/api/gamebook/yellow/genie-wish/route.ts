// src/app/api/gamebook/yellow/genie-wish/route.ts
//
// Nexus Jaune Éclair — arc « La Lampe & le Génie ». Les 3 vœux d'un joueur (table GenieWish).
//  POST {action:"submit", wish1,wish2,wish3} : le joueur énonce ses 3 vœux au génie → ligne SUBMITTED
//        (pseudo TRUSTÉ serveur, one-shot via userId @unique).
//  POST {action:"respond", accepted:[bool,bool,bool]} : après le retour du génie, le joueur accepte/refuse
//        chaque vœu → status RESOLVED.
//  GET  : lit les vœux du joueur (onglet 🧞). `?claim=1` marque le retour du génie « vu » (pop-up 1×).
//
// NB : on utilise (prisma as any).genieWish (comme duel-gift/) → le code COMPILE avant `npm run db:push`
// (qui crée la table ET régénère le client). Les try/catch rendent la feature NEUTRE tant que la table
// n'existe pas. Le créateur fixe condition1/2/3 + passe status→PROPOSED directement en base.

import { NextRequest, NextResponse } from "next/server"
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

const clampWish = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 280) : "")

// Lecture des vœux du joueur (onglet 🧞). ?claim=1 → marque le retour du génie comme vu (pop-up une fois).
export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const gw = (prisma as any).genieWish
        const row = await gw.findUnique({ where: { userId: auth.userId } })
        if (!row) return NextResponse.json({ ok: true, wish: null, justReturned: false })
        const justReturned = row.status === "PROPOSED" && !row.proposedSeen
        if (new URL(req.url).searchParams.get("claim") === "1" && justReturned) {
            await gw.update({ where: { userId: auth.userId }, data: { proposedSeen: true } })
        }
        return NextResponse.json({ ok: true, wish: row, justReturned })
    } catch {
        return NextResponse.json({ ok: true, wish: null, justReturned: false }) // table pas encore créée → neutre
    }
}

// Soumettre les 3 vœux, ou répondre (accepter/refuser) après le retour du génie.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { action?: unknown; wish1?: unknown; wish2?: unknown; wish3?: unknown; accepted?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }

    try {
        const gw = (prisma as any).genieWish

        // — Le joueur accepte / refuse ses vœux après le retour du génie —
        if (body.action === "respond") {
            const acc = Array.isArray(body.accepted) ? body.accepted : []
            const existing = await gw.findUnique({ where: { userId: auth.userId }, select: { status: true } })
            if (!existing || existing.status !== "PROPOSED") return NextResponse.json({ ok: true, skipped: "not-proposed" })
            await gw.update({
                where: { userId: auth.userId },
                data: { status: "RESOLVED", accepted1: !!acc[0], accepted2: !!acc[1], accepted3: !!acc[2] },
            })
            return NextResponse.json({ ok: true })
        }

        // — Le joueur énonce ses 3 vœux —
        const wish1 = clampWish(body.wish1), wish2 = clampWish(body.wish2), wish3 = clampWish(body.wish3)
        if (!wish1 && !wish2 && !wish3) return NextResponse.json({ error: "empty" }, { status: 400 })
        const dup = await gw.findUnique({ where: { userId: auth.userId }, select: { id: true } })
        if (dup) return NextResponse.json({ ok: true, skipped: "exists" }) // one-shot
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        await gw.create({ data: { userId: auth.userId, nickname: me?.nickname ?? "?", wish1, wish2, wish3 } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
