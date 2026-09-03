// src/app/api/gamebook/yellow/chen-gift/route.ts
//
// MODE FUN — CADEAU DU PROF. CHEN (fan-out communautaire).
//  POST : un joueur fun réclame son cadeau de bienvenue (2 max) → TOUS les AUTRES joueurs fun reçoivent un don
//         d'énergie hors-plafond (200 au 1er passage du joueur, 500 au 2e), réclamé à leur prochaine connexion.
//         Le PALIER est dérivé SERVEUR (eventKey "chen:<userId>:<tier>") → anti-triche + idempotence.
//  GET  : réclame les dons en attente au login → renvoie le total d'énergie + les déclencheurs (annonce).
//
// Gated FUN-only (me.gameMode==="fun"). Table FunChenGrant via (prisma as any) + try/catch → NEUTRE avant db:push.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const TIER_ENERGY = { 1: 200, 2: 500 } as const // don aux AUTRES fun : 1er passage → 200, 2e → 500

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Un joueur FUN réclame son cadeau Chen → don communautaire aux AUTRES joueurs fun (palier dérivé serveur).
export async function POST() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true, gameMode: true } })
        if (!me) return NextResponse.json({ ok: false, reason: "no-user" })
        if (me.gameMode !== "fun") return NextResponse.json({ ok: false, reason: "not-fun" }) // GATING fun

        const fg = (prisma as any).funChenGrant
        const key1 = `chen:${auth.userId}:1`, key2 = `chen:${auth.userId}:2`
        // PALIER dérivé SERVEUR (eventKey déjà émis ?) : 1er cadeau → tier 1 (200), 2e → tier 2 (500), sinon épuisé.
        const has1 = await fg.findFirst({ where: { eventKey: key1 }, select: { id: true } })
        const has2 = has1 ? await fg.findFirst({ where: { eventKey: key2 }, select: { id: true } }) : null
        const tier: 0 | 1 | 2 = !has1 ? 1 : !has2 ? 2 : 0
        if (tier === 0) return NextResponse.json({ ok: false, reason: "maxed" })

        const energy = TIER_ENERGY[tier]
        const eventKey = tier === 1 ? key1 : key2
        // Destinataires = TOUS les AUTRES joueurs fun (jamais soi-même).
        const others = (await prisma.user.findMany({
            where: { gameMode: "fun", id: { not: auth.userId } }, select: { id: true },
        })) as { id: string }[]
        if (others.length > 0) {
            await fg.createMany({
                data: others.map((o) => ({ toUserId: o.id, fromUserId: auth.userId, fromNickname: me.nickname, tier, eventKey, energy })),
            })
        }
        return NextResponse.json({ ok: true, tier, sharedAmount: energy, granted: others.length })
    } catch {
        return NextResponse.json({ ok: false, reason: "no-table" }) // table pas encore créée → neutre
    }
}

// Réclamation au login : crédite les dons Chen en attente (hors-plafond souple côté client), renvoie total + déclencheurs.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const fg = (prisma as any).funChenGrant
        const pending = (await fg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            select: { id: true, energy: true, tier: true, fromNickname: true }, take: 200,
        })) as { id: string; energy: number; tier: number; fromNickname: string }[]
        if (pending.length === 0) return NextResponse.json({ ok: true, energy: 0, count: 0, events: [], chenEnergy: 0, clanEnergy: 0, chenFrom: [], clanFrom: [] })
        await fg.updateMany({ where: { id: { in: pending.map((g) => g.id) } }, data: { claimed: true } })
        const energy = pending.reduce((a, g) => a + (g.energy ?? 200), 0)
        const events = pending.slice(0, 6).map((g) => ({ fromNickname: g.fromNickname, tier: g.tier }))
        // tier 9 = don du CHEF DE CLAN (≠ 1/2 = Prof Chen) → énergie + expéditeurs ventilés pour un message dédié.
        const isClan = (t: number) => t === 9
        const chenEnergy = pending.filter((g) => !isClan(g.tier)).reduce((a, g) => a + (g.energy ?? 200), 0)
        const clanEnergy = pending.filter((g) => isClan(g.tier)).reduce((a, g) => a + (g.energy ?? 500), 0)
        const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))]
        const chenFrom = uniq(pending.filter((g) => !isClan(g.tier)).map((g) => g.fromNickname))
        const clanFrom = uniq(pending.filter((g) => isClan(g.tier)).map((g) => g.fromNickname))
        return NextResponse.json({ ok: true, energy, count: pending.length, events, chenEnergy, clanEnergy, chenFrom, clanFrom })
    } catch {
        return NextResponse.json({ ok: true, energy: 0, count: 0, events: [] })
    }
}
