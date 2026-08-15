// src/app/api/gamebook/yellow/genie-offer/route.ts
//
// VŒU GÉNIE « offre partagée » (Mools) — le génie propose `amount`⚡ aux `maxResponders` PREMIERS autres joueurs
// qui répondent (dans l'ordre où ils se connectent). ACCEPTER → +amount pour eux (crédité côté client). REFUSER →
// +pushupPerRefusal pompes à la DETTE de la source (FrontierProfile, server-authoritative). Non-réponse → l'offre
// passe naturellement au joueur suivant (on n'enregistre QUE les réponses). Se ferme à `maxResponders` réponses.
//
//  GET  : renvoie l'offre OUVERTE pour laquelle CE joueur est éligible (pas la source, pas déjà répondu, quota non
//         atteint, monde live/ngplus) — sinon { offer: null }.
//  POST : { response: "accept" | "refuse" } → enregistre la réponse + applique l'effet. accept → renvoie amount
//         (le client crédite). refuse → dette de la source +N (serveur).
//
// Pattern gaté `(prisma as any).genieOffer` (cf. duel-gift/frontier) : COMPILE avant db:push, NEUTRE via try/catch.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

type Resp = { userId: string; nickname: string; response: "ACCEPTED" | "REFUSED"; at: string }

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

const respList = (o: unknown): Resp[] => (Array.isArray(o) ? (o as Resp[]) : [])

/** Monde actif du joueur (via sa save gamebook). run3/replay → l'énergie ne s'applique pas → offre différée. */
async function activeWorldOf(userId: string): Promise<string | undefined> {
    const prog = await prisma.gamebookProgress.findFirst({ where: { userId, chapterId: "yellow" }, select: { flags: true } })
    return (prog?.flags as { activeWorld?: string } | null)?.activeWorld
}

/** Première offre OUVERTE éligible pour `userId` (pas source, quota libre, pas déjà répondu). */
function eligibleOffer(offers: any[], userId: string): any | null {
    for (const offer of offers) {
        if (offer.sourceUserId === userId) continue
        const responses = respList(offer.responses)
        if (responses.length >= (offer.maxResponders ?? 5)) continue
        if (responses.some((r) => r.userId === userId)) continue
        return offer
    }
    return null
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const go = (prisma as any).genieOffer
        const offers = await go.findMany({ where: { status: "OPEN" } })
        const offer = eligibleOffer(offers, auth.userId)
        if (!offer) return NextResponse.json({ ok: true, offer: null })
        const aw = await activeWorldOf(auth.userId)
        if (aw === "run3" || aw === "replay") return NextResponse.json({ ok: true, offer: null }) // différé (mauvais monde)
        return NextResponse.json({
            ok: true,
            offer: { id: offer.id, sourceNickname: offer.sourceNickname, amount: offer.amount, pushupPerRefusal: offer.pushupPerRefusal },
        })
    } catch {
        return NextResponse.json({ ok: true, offer: null }) // table pas encore créée → neutre
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { response?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const response: "ACCEPTED" | "REFUSED" | null =
        body.response === "accept" ? "ACCEPTED" : body.response === "refuse" ? "REFUSED" : null
    if (!response) return NextResponse.json({ error: "Bad response" }, { status: 400 })

    try {
        const go = (prisma as any).genieOffer
        const offers = await go.findMany({ where: { status: "OPEN" } })
        const offer = eligibleOffer(offers, auth.userId)
        if (!offer) return NextResponse.json({ ok: false, reason: "no-offer" })

        const aw = await activeWorldOf(auth.userId)
        if (aw === "run3" || aw === "replay") return NextResponse.json({ ok: false, reason: "wrong-world" }) // reviens en jeu normal

        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        const responses: Resp[] = [
            ...respList(offer.responses),
            { userId: auth.userId, nickname: me?.nickname ?? "?", response, at: new Date().toISOString() },
        ]
        const willClose = responses.length >= (offer.maxResponders ?? 5)

        // REFUS → +pushupPerRefusal à la DETTE de la source (baseline déjà posée à la création de la campagne).
        if (response === "REFUSED") {
            const fp = (prisma as any).frontierProfile
            const cur = await fp.findUnique({ where: { userId: offer.sourceUserId }, select: { pushupDebtOwed: true } })
            await fp.upsert({
                where: { userId: offer.sourceUserId },
                create: { userId: offer.sourceUserId, pushupDebtOwed: offer.pushupPerRefusal }, // fallback (baseline 0) — la création pose normalement la baseline
                update: { pushupDebtOwed: (cur?.pushupDebtOwed ?? 0) + offer.pushupPerRefusal },
            })
        }

        await go.update({ where: { id: offer.id }, data: { responses, ...(willClose ? { status: "CLOSED" } : {}) } })

        // ACCEPT → le client crédite +amount localement (grantReps + persist, cohérent avec le modèle d'énergie du jeu).
        return NextResponse.json({ ok: true, response, amount: response === "ACCEPTED" ? offer.amount : 0, closed: willClose })
    } catch {
        return NextResponse.json({ ok: false, reason: "no-table" })
    }
}
