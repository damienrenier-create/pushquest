// src/app/api/gamebook/yellow/frontier/route.ts
//
// ZONE DE COMBAT — persistance serveur du profil Frontier (solde de Jetons de Combat + records + symboles).
//  GET  : renvoie le profil du joueur (défauts si absent / table pas encore créée).
//  POST : { action: "recordRun" }  → crédite des JC + met à jour le meilleur record d'une salle (+symbole).
//         { action: "spend" }      → débite des JC (boutique), refuse si solde insuffisant.
//
// Pattern GATÉ `(prisma as any).frontierProfile` (cf. duel-gift / hall-of-fame) : COMPILE avant
// `npm run db:push` (qui crée la table FrontierProfile). Try/catch → NEUTRE tant que la table n'existe pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const DEFAULTS = { jc: 0, towerBest: 0, factoryBest: 0, domeBest: 0, symbols: [] as string[] }

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

function pickProfile(p: any) {
    return {
        jc: p?.jc ?? 0,
        towerBest: p?.towerBest ?? 0,
        factoryBest: p?.factoryBest ?? 0,
        domeBest: p?.domeBest ?? 0,
        symbols: Array.isArray(p?.symbols) ? p.symbols : [],
    }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const fp = (prisma as any).frontierProfile
        const p = await fp.findUnique({ where: { userId: auth.userId } })
        return NextResponse.json({ ok: true, profile: p ? pickProfile(p) : { ...DEFAULTS } })
    } catch {
        return NextResponse.json({ ok: true, profile: { ...DEFAULTS } }) // table pas encore créée → neutre
    }
}

const BEST_FIELD: Record<string, "towerBest" | "factoryBest" | "domeBest"> = {
    TOWER: "towerBest", FACTORY: "factoryBest", DOME: "domeBest",
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const action = typeof body?.action === "string" ? body.action : ""

    try {
        const fp = (prisma as any).frontierProfile

        if (action === "recordRun") {
            const bestField = BEST_FIELD[String(body.mode)]
            if (!bestField) return NextResponse.json({ error: "Bad mode" }, { status: 400 })
            const streak = Math.max(0, Math.floor(Number(body.streak) || 0))
            const jcEarned = Math.max(0, Math.floor(Number(body.jcEarned) || 0))
            const symbol = typeof body.symbol === "string" ? body.symbol : null

            const existing = await fp.findUnique({ where: { userId: auth.userId } })
            const cur = pickProfile(existing)
            const symbols = [...cur.symbols]
            if (symbol && !symbols.includes(symbol)) symbols.push(symbol)
            const data = {
                jc: cur.jc + jcEarned,
                [bestField]: Math.max(cur[bestField], streak),
                symbols,
            }
            const saved = await fp.upsert({
                where: { userId: auth.userId },
                create: { userId: auth.userId, ...data },
                update: data,
            })
            return NextResponse.json({ ok: true, profile: pickProfile(saved) })
        }

        if (action === "spend") {
            const amount = Math.max(0, Math.floor(Number(body.amount) || 0))
            const symbol = typeof body.symbol === "string" ? body.symbol : null
            const existing = await fp.findUnique({ where: { userId: auth.userId } })
            const jc = existing?.jc ?? 0
            if (jc < amount) return NextResponse.json({ ok: false, reason: "insufficient", jc })
            const symbols = [...pickProfile(existing).symbols]
            if (symbol && !symbols.includes(symbol)) symbols.push(symbol) // achat d'un symbole de prestige (atomique)
            const saved = await fp.update({ where: { userId: auth.userId }, data: { jc: jc - amount, ...(symbol ? { symbols } : {}) } })
            return NextResponse.json({ ok: true, jc: saved.jc, symbols: pickProfile(saved).symbols })
        }

        return NextResponse.json({ error: "Bad action" }, { status: 400 })
    } catch {
        return NextResponse.json({ ok: false, reason: "no-table" }) // table pas encore créée → neutre
    }
}
