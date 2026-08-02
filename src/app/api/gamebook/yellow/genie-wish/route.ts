// src/app/api/gamebook/yellow/genie-wish/route.ts
//
// Nexus Jaune Éclair — arc « La Lampe & le Génie ». Les 3 vœux d'un joueur, formulés UN PAR UN (table GenieWish).
// Cycle par vœu N : le joueur FORMULE wishN → le créateur pose conditionN (le dilemme) en base → le joueur
// TRANCHE acceptedN (accepte/refuse) → le vœu N+1 se débloque. Le serveur dérive l'étape courante des colonnes
// (wish1-3 / condition1-3 / accepted1-3) → pas besoin que le client suive l'index.
//  POST {action:"submit", wish}     : formule le vœu de l'étape courante (crée la ligne au 1er).
//  POST {action:"respond", accepted}: tranche le dilemme en attente (accepte/refuse).
//  GET (?claim=1)                   : lit la ligne + `justReturned` (un dilemme est prêt et le pop-up pas encore vu).
//
// (prisma as any).genieWish + try/catch → compile et reste NEUTRE avant `npm run db:push`. Le créateur pose
// conditionN + remet proposedSeen=false directement en base pour déclencher le retour du génie.

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

interface Row {
    wish1: string; wish2: string; wish3: string
    condition1: string | null; condition2: string | null; condition3: string | null
    accepted1: boolean | null; accepted2: boolean | null; accepted3: boolean | null
    proposedSeen: boolean
}
/** État par vœu dérivé d'une ligne : submitted / proposed (condition posée) / resolved (tranché). */
function derive(row: Row) {
    const submitted = [row.wish1, row.wish2, row.wish3].map((x) => !!(x && String(x).trim()))
    const proposed = [row.condition1, row.condition2, row.condition3].map((x) => x != null && x !== "")
    const resolved = [row.accepted1, row.accepted2, row.accepted3].map((x) => x === true || x === false)
    return { submitted, proposed, resolved }
}

// Lecture des vœux (onglet 🧞 + machine à états du modal). ?claim=1 = marque le retour du génie « vu » (pop-up 1×).
export async function GET(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const gw = (prisma as any).genieWish
        const row = await gw.findUnique({ where: { userId: auth.userId } })
        if (!row) return NextResponse.json({ ok: true, wish: null, justReturned: false })
        const { proposed, resolved } = derive(row)
        const pending = proposed.some((p: boolean, i: number) => p && !resolved[i]) // un dilemme attend le joueur
        const justReturned = pending && !row.proposedSeen
        if (new URL(req.url).searchParams.get("claim") === "1" && justReturned) {
            await gw.update({ where: { userId: auth.userId }, data: { proposedSeen: true } })
        }
        return NextResponse.json({ ok: true, wish: row, justReturned })
    } catch {
        return NextResponse.json({ ok: true, wish: null, justReturned: false }) // table pas encore créée → neutre
    }
}

// Formuler le vœu de l'étape courante, ou trancher le dilemme en attente.
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { action?: unknown; wish?: unknown; accepted?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }

    try {
        const gw = (prisma as any).genieWish

        // — Trancher le dilemme en attente (accepter/refuser le vœu dont la condition est posée) —
        if (body.action === "respond") {
            const acc = !!body.accepted
            const row = await gw.findUnique({ where: { userId: auth.userId } })
            if (!row) return NextResponse.json({ ok: true, skipped: "no-row" })
            const { proposed, resolved } = derive(row)
            const idx = proposed.findIndex((p: boolean, i: number) => p && !resolved[i])
            if (idx < 0) return NextResponse.json({ ok: true, skipped: "no-dilemma" })
            await gw.update({ where: { userId: auth.userId }, data: { [`accepted${idx + 1}`]: acc } })
            return NextResponse.json({ ok: true })
        }

        // — Formuler le vœu de l'étape courante (1 seul à la fois) —
        const text = clampWish(body.wish)
        if (!text) return NextResponse.json({ error: "empty" }, { status: 400 })
        const row = await gw.findUnique({ where: { userId: auth.userId } })
        if (!row) {
            const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
            await gw.create({ data: { userId: auth.userId, nickname: me?.nickname ?? "?", wish1: text } })
            return NextResponse.json({ ok: true })
        }
        const { submitted, resolved } = derive(row)
        // Étape formulable = 1er vœu vide dont le précédent est TRANCHÉ (ou le tout premier).
        let idx = -1
        for (let n = 0; n < 3; n++) { if (!submitted[n] && (n === 0 || resolved[n - 1])) { idx = n; break } }
        if (idx < 0) return NextResponse.json({ ok: true, skipped: "no-step" }) // rien à formuler (en attente / terminé)
        await gw.update({ where: { userId: auth.userId }, data: { [`wish${idx + 1}`]: text } })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}
