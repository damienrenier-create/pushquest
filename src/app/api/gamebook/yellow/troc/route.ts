// src/app/api/gamebook/yellow/troc/route.ts
//
// USINE — LE GRAND MARCHAND : ÉCHANGE ASYNCHRONE de Daemons.
//   • ESCROW : un Daemon déposé (étal) ou proposé (offre) est stocké côté serveur ; le CLIENT ne le retire de sa
//     save qu'APRÈS confirmation de l'escrow (ordre sûr → si l'appel échoue, aucun Daemon n'est perdu).
//   • LIVRAISON : le résultat d'un échange (ou un retour) est déposé dans TradeDelivery — canal serveur→client HORS
//     save (anti-écrasement). Le destinataire le RÉCLAME (add au PC) puis l'acquitte (suppression atomique).
//
//  GET               → { listings mien/autres, offres reçues/envoyées, livraisons en attente }.
//  POST deposit      → { mon } : pose un Daemon sur l'étal (max 3/joueur).
//  POST withdraw     → { listingId } : retire son étal (Daemon rendu + offres reçues rendues à leurs proposeurs).
//  POST offer        → { listingId, mon } : propose un Daemon pour un étal.
//  POST cancelOffer  → { offerId } : annule son offre (Daemon rendu).
//  POST respond      → { offerId, accept } : l'owner accepte (SWAP) ou refuse (retour au proposeur).
//  POST claim        → réclame + supprime ses livraisons (renvoie les Daemons à ajouter au PC).
//
// Pattern GATÉ `(prisma as any).tradeListing/…` : compile avant `npm run db:push`. try/catch → NEUTRE tant que les
//   tables n'existent pas (toutes les actions dégradent proprement sans rien casser).

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"

const MAX_LISTINGS = 3

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const nickname = (session?.user as { nickname?: string; name?: string })?.nickname || (session?.user as { name?: string })?.name || "Dresseur"
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId, nickname }
}

/** Un Daemon valide = objet avec un speciesId string. (On stocke le blob verbatim ; le client le ré-hydrate.) */
function validMon(m: unknown): m is Record<string, unknown> {
    return !!m && typeof m === "object" && typeof (m as { speciesId?: unknown }).speciesId === "string"
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const L = (prisma as any).tradeListing, O = (prisma as any).tradeOffer, D = (prisma as any).tradeDelivery
        const [myListings, otherListings, offersReceived, offersSent, deliveries] = await Promise.all([
            L.findMany({ where: { ownerId: auth.userId }, orderBy: { createdAt: "desc" } }),
            L.findMany({ where: { ownerId: { not: auth.userId } }, orderBy: { createdAt: "desc" }, take: 60 }),
            O.findMany({ where: { ownerId: auth.userId }, orderBy: { createdAt: "desc" } }),
            O.findMany({ where: { offererId: auth.userId }, orderBy: { createdAt: "desc" } }),
            D.findMany({ where: { recipientId: auth.userId }, orderBy: { createdAt: "asc" } }),
        ])
        return NextResponse.json({ ok: true, myListings, otherListings, offersReceived, offersSent, deliveries })
    } catch {
        return NextResponse.json({ ok: true, myListings: [], otherListings: [], offersReceived: [], offersSent: [], deliveries: [] })
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })

    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const action = typeof body?.action === "string" ? body.action : ""

    try {
        const L = (prisma as any).tradeListing, O = (prisma as any).tradeOffer, D = (prisma as any).tradeDelivery

        if (action === "deposit") {
            if (!validMon(body.mon)) return NextResponse.json({ error: "Bad mon" }, { status: 400 })
            const count = await L.count({ where: { ownerId: auth.userId } })
            if (count >= MAX_LISTINGS) return NextResponse.json({ ok: false, reason: "full" }, { status: 200 })
            const wantNote = (typeof body.wantNote === "string" ? body.wantNote : "").slice(0, 120).trim()
            const listing = await L.create({ data: { ownerId: auth.userId, ownerNickname: auth.nickname, monJson: body.mon, wantNote } })
            return NextResponse.json({ ok: true, listing })
        }

        if (action === "withdraw") {
            const listingId = String(body.listingId || "")
            const listing = await L.findUnique({ where: { id: listingId } })
            if (!listing || listing.ownerId !== auth.userId) return NextResponse.json({ error: "Not owner" }, { status: 403 })
            // Rendre les Daemons proposés à leurs proposeurs, puis rendre l'étal à l'owner. Enfin supprimer.
            const offers = await O.findMany({ where: { listingId } })
            await prisma.$transaction([
                ...offers.map((of: any) => D.create({ data: { recipientId: of.offererId, monJson: of.monJson, note: "Offre annulée (étal retiré)" } })),
                O.deleteMany({ where: { listingId } }),
                D.create({ data: { recipientId: auth.userId, monJson: listing.monJson, note: "Retour d'étal" } }),
                L.delete({ where: { id: listingId } }),
            ])
            return NextResponse.json({ ok: true })
        }

        if (action === "offer") {
            if (!validMon(body.mon)) return NextResponse.json({ error: "Bad mon" }, { status: 400 })
            const listingId = String(body.listingId || "")
            const listing = await L.findUnique({ where: { id: listingId } })
            if (!listing) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            if (listing.ownerId === auth.userId) return NextResponse.json({ error: "Own listing" }, { status: 400 })
            const offer = await O.create({ data: { listingId, ownerId: listing.ownerId, offererId: auth.userId, offererNickname: auth.nickname, monJson: body.mon } })
            return NextResponse.json({ ok: true, offer })
        }

        if (action === "cancelOffer") {
            const offerId = String(body.offerId || "")
            const offer = await O.findUnique({ where: { id: offerId } })
            if (!offer || offer.offererId !== auth.userId) return NextResponse.json({ error: "Not offerer" }, { status: 403 })
            await prisma.$transaction([
                D.create({ data: { recipientId: auth.userId, monJson: offer.monJson, note: "Offre annulée" } }),
                O.delete({ where: { id: offerId } }),
            ])
            return NextResponse.json({ ok: true })
        }

        if (action === "respond") {
            const offerId = String(body.offerId || "")
            const accept = !!body.accept
            const offer = await O.findUnique({ where: { id: offerId } })
            if (!offer || offer.ownerId !== auth.userId) return NextResponse.json({ error: "Not owner" }, { status: 403 })
            const listing = await L.findUnique({ where: { id: offer.listingId } })

            if (!accept) {
                // REFUS : le Daemon proposé revient au proposeur.
                await prisma.$transaction([
                    D.create({ data: { recipientId: offer.offererId, monJson: offer.monJson, note: "Offre refusée" } }),
                    O.delete({ where: { id: offerId } }),
                ])
                return NextResponse.json({ ok: true, accepted: false })
            }

            // ACCEPT : SWAP. L'owner reçoit le Daemon proposé ; le proposeur reçoit le Daemon de l'étal.
            if (!listing) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            const otherOffers = await O.findMany({ where: { listingId: offer.listingId, id: { not: offerId } } })
            await prisma.$transaction([
                D.create({ data: { recipientId: auth.userId, monJson: offer.monJson, note: `Échange avec ${offer.offererNickname}` } }),
                D.create({ data: { recipientId: offer.offererId, monJson: listing.monJson, note: `Échange avec ${auth.nickname}` } }),
                // Les autres offres sur cet étal reviennent à leurs proposeurs.
                ...otherOffers.map((of: any) => D.create({ data: { recipientId: of.offererId, monJson: of.monJson, note: "Étal déjà échangé" } })),
                O.deleteMany({ where: { listingId: offer.listingId } }),
                L.delete({ where: { id: offer.listingId } }),
            ])
            return NextResponse.json({ ok: true, accepted: true })
        }

        if (action === "claim") {
            const deliveries = await D.findMany({ where: { recipientId: auth.userId }, orderBy: { createdAt: "asc" } })
            if (deliveries.length === 0) return NextResponse.json({ ok: true, mons: [] })
            const ids = deliveries.map((d: any) => d.id)
            await D.deleteMany({ where: { id: { in: ids } } })
            return NextResponse.json({ ok: true, mons: deliveries.map((d: any) => ({ mon: d.monJson, note: d.note })) })
        }

        return NextResponse.json({ error: "Bad action" }, { status: 400 })
    } catch {
        // Tables absentes (pré-migration) ou erreur : action neutre. Le client, ayant reçu !ok, NE retire RIEN de sa save.
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 200 })
    }
}
