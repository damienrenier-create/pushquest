// src/app/api/gamebook/yellow/shiny-gift/route.ts
//
// Nexus Jaune Éclair — FÊTE SHINY (récompense croisée, calquée sur hall-of-fame/energy & duel-gift).
//  POST : un joueur signale qu'il a CROISÉ ou CAPTURÉ un shiny → +50 énergie pour TOUS les joueurs
//         (un don ShinyGift par bénéficiaire). Idempotent par eventKey (kind:uid) → 1 fête / événement.
//  GET  : réclame les dons en attente au login → renvoie le total d'énergie + les événements (pour
//         l'annonce du Dieu Spaghetti). Crédit HORS-plafond côté client.
//
// Tables gated (try/catch) → NEUTRE tant que `db:push` n'a pas créé ShinyGift.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled, YELLOW_CHAPTER_ID } from "@/lib/gamebook/yellow/featureFlag"
import { fanOutSponsorGift } from "@/lib/gamebook/yellow/sponsorGift"

export const dynamic = "force-dynamic"
const SHINY_ENERGY = 50
const SPONSOR_SHINY_ENERGY = 500 // PARRAINAGE : ×10 de la fête communautaire → grosse prime pour le pote quand on CAPTURE un shiny

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId }
}

// Un joueur croise/capture un shiny → +50 énergie pour TOUT LE MONDE (idempotent par eventKey).
export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: { kind?: unknown; uid?: unknown; speciesId?: unknown }
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const kind = body.kind === "captured" ? "captured" : body.kind === "encounter" ? "encounter" : null
    const uid = typeof body.uid === "string" ? body.uid.slice(0, 80) : ""
    const speciesId = typeof body.speciesId === "string" ? body.speciesId.slice(0, 60) : ""
    if (!kind || !uid) return NextResponse.json({ error: "bad_params" }, { status: 400 })
    const eventKey = `${kind}:${uid}`

    try {
        const sg = prisma.shinyGift
        // Idempotence : la fête n'a lieu qu'UNE fois par événement (anti-refresh / re-POST).
        const dup = await sg.findFirst({ where: { eventKey }, select: { id: true } })
        if (dup) return NextResponse.json({ ok: true, skipped: "dup" })

        const me = await prisma.user.findUnique({ where: { id: auth.userId }, select: { nickname: true } })
        if (!me) return NextResponse.json({ error: "Forbidden" }, { status: 401 })

        // TOUS les joueurs ayant une partie Nexus Jaune (le découvreur INCLUS — il fête aussi).
        const players = (await prisma.gamebookProgress.findMany({
            where: { chapterId: YELLOW_CHAPTER_ID }, select: { userId: true },
        })) as { userId: string }[]
        if (players.length > 0) {
            await sg.createMany({
                data: players.map((p) => ({ toUserId: p.userId, fromUserId: auth.userId, fromNickname: me.nickname, kind, speciesId, eventKey, energy: SHINY_ENERGY })),
            })
        }
        // PARRAINAGE : un shiny CAPTURÉ par un pote → grosse prime (+500⚡) pour son parrain + ses filleuls.
        // (En plus de la fête communautaire de 50 ci-dessus.) Idempotent : le POST entier l'est via eventKey (dup).
        if (kind === "captured") {
            await fanOutSponsorGift(prisma, auth.userId, me.nickname, "shiny", SPONSOR_SHINY_ENERGY, speciesId)
        }
        return NextResponse.json({ ok: true, granted: players.length })
    } catch {
        return NextResponse.json({ ok: true, skipped: "no-table" }) // table pas encore créée → neutre
    }
}

// Réclamation au login : crédite les dons en attente, renvoie le total + les événements à annoncer.
export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const sg = prisma.shinyGift
        const pending = (await sg.findMany({
            where: { toUserId: auth.userId, claimed: false },
            select: { id: true, kind: true, speciesId: true, fromNickname: true, energy: true },
            take: 200,
        })) as { id: string; kind: string; speciesId: string; fromNickname: string; energy: number }[]
        if (pending.length === 0) return NextResponse.json({ ok: true, energy: 0, count: 0, events: [] })
        await sg.updateMany({ where: { id: { in: pending.map((g) => g.id) } }, data: { claimed: true } })
        const energy = pending.reduce((a, g) => a + (g.energy ?? SHINY_ENERGY), 0)
        // événements distincts (pour l'annonce) — on borne à 6 pour la notif
        const events = pending.slice(0, 6).map((g) => ({ kind: g.kind, speciesId: g.speciesId, fromNickname: g.fromNickname }))
        return NextResponse.json({ ok: true, energy, count: pending.length, events })
    } catch {
        return NextResponse.json({ ok: true, energy: 0, count: 0, events: [] })
    }
}
