// src/app/api/gamebook/yellow/troc/route.ts
//
// USINE — LE GRAND MARCHAND : ÉCHANGE ASYNCHRONE de Daemons, escrow SOFT (aucune suppression au dépôt).
//   • DÉPÔT/OFFRE : le serveur garde un SNAPSHOT + l'uid du Daemon ; le CLIENT ne fait que POSER un drapeau
//     "listed" (le Daemon reste dans sa boîte, grisé). Rien n'est supprimé → impossible de perdre un Daemon.
//   • ÉCHANGE CONCLU : chaque partie reçoit une LIVRAISON (TradeDelivery, canal hors save) qui dit quoi AJOUTER
//     (le Daemon reçu) et quel uid RETIRER (son Daemon donné) — appliqué au chargement, ajout AVANT retrait.
//   • RETRAIT/REFUS : livraison de simple DÉVERROUILLAGE (unlockUid) → le Daemon rendu redevient utilisable.
//
//  GET                       → listings mien/autres, offres reçues/envoyées, livraisons en attente.
//  POST deposit {mon,wantNote}→ pose un snapshot sur l'étal (max 3). POST withdraw {listingId}.
//  POST offer {listingId,mon} / cancelOffer {offerId} / respond {offerId,accept}.
//  POST claim                → RENVOIE les livraisons (sans supprimer). POST ackClaim {ids} → supprime après application.
//
// Pattern gaté `(prisma as any).tradeListing/…` : compile avant db:push, NEUTRE tant que les tables n'existent pas.

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

/** Daemon valide = objet avec speciesId + uid (string). Stocké verbatim (snapshot). */
function validMon(m: unknown): m is Record<string, unknown> & { uid: string } {
    return !!m && typeof m === "object" && typeof (m as { speciesId?: unknown }).speciesId === "string" && typeof (m as { uid?: unknown }).uid === "string" && !!(m as { uid?: string }).uid
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
            const listing = await L.create({ data: { ownerId: auth.userId, ownerNickname: auth.nickname, ownerUid: body.mon.uid, monJson: body.mon, wantNote } })
            return NextResponse.json({ ok: true, listing })
        }

        if (action === "withdraw") {
            const listingId = String(body.listingId || "")
            const listing = await L.findUnique({ where: { id: listingId } })
            if (!listing || listing.ownerId !== auth.userId) return NextResponse.json({ error: "Not owner" }, { status: 403 })
            const offers = await O.findMany({ where: { listingId } })
            // Les proposeurs récupèrent leur Daemon (simple DÉVERROUILLAGE — il n'a jamais quitté leur boîte). Puis on
            //   supprime offres + étal. L'owner (en ligne) délistera SON Daemon côté client.
            await prisma.$transaction([
                ...offers.map((of: any) => D.create({ data: { recipientId: of.offererId, unlockUid: of.offererUid, note: "Étal retiré" } })),
                O.deleteMany({ where: { listingId } }),
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
            const offer = await O.create({ data: { listingId, ownerId: listing.ownerId, offererId: auth.userId, offererNickname: auth.nickname, offererUid: body.mon.uid, monJson: body.mon } })
            return NextResponse.json({ ok: true, offer })
        }

        if (action === "cancelOffer") {
            const offerId = String(body.offerId || "")
            const offer = await O.findUnique({ where: { id: offerId } })
            if (!offer || offer.offererId !== auth.userId) return NextResponse.json({ error: "Not offerer" }, { status: 403 })
            await O.delete({ where: { id: offerId } }) // le proposeur (en ligne) délistera SON Daemon côté client
            return NextResponse.json({ ok: true })
        }

        if (action === "respond") {
            const offerId = String(body.offerId || "")
            const accept = !!body.accept
            const offer = await O.findUnique({ where: { id: offerId } })
            if (!offer || offer.ownerId !== auth.userId) return NextResponse.json({ error: "Not owner" }, { status: 403 })

            if (!accept) {
                // REFUS : le proposeur (peut être hors ligne) reçoit un DÉVERROUILLAGE de son Daemon.
                await prisma.$transaction([
                    D.create({ data: { recipientId: offer.offererId, unlockUid: offer.offererUid, note: "Offre refusée" } }),
                    O.delete({ where: { id: offerId } }),
                ])
                return NextResponse.json({ ok: true, accepted: false })
            }

            const listing = await L.findUnique({ where: { id: offer.listingId } })
            if (!listing) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            const otherOffers = await O.findMany({ where: { listingId: offer.listingId, id: { not: offerId } } })
            // SWAP : l'owner (moi) reçoit le Daemon proposé + retire le sien ; le proposeur reçoit le mien + retire le sien.
            //   Les DEUX passent par une livraison (même l'owner en ligne) → source de vérité unique, robuste au crash.
            await prisma.$transaction([
                D.create({ data: { recipientId: auth.userId, monJson: offer.monJson, removeUid: listing.ownerUid, note: `Échange avec ${offer.offererNickname}` } }),
                D.create({ data: { recipientId: offer.offererId, monJson: listing.monJson, removeUid: offer.offererUid, note: `Échange avec ${auth.nickname}` } }),
                ...otherOffers.map((of: any) => D.create({ data: { recipientId: of.offererId, unlockUid: of.offererUid, note: "Étal déjà échangé" } })),
                O.deleteMany({ where: { listingId: offer.listingId } }),
                L.delete({ where: { id: offer.listingId } }),
            ])
            return NextResponse.json({ ok: true, accepted: true })
        }

        if (action === "claim") {
            // PEEK : on renvoie les livraisons SANS supprimer. Le client applique (add/remove/unlock) puis ackClaim.
            const deliveries = await D.findMany({ where: { recipientId: auth.userId }, orderBy: { createdAt: "asc" } })
            return NextResponse.json({ ok: true, deliveries })
        }

        if (action === "ackClaim") {
            const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)).filter(Boolean) : []
            if (ids.length) await D.deleteMany({ where: { id: { in: ids }, recipientId: auth.userId } })
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: "Bad action" }, { status: 400 })
    } catch {
        // Tables absentes (pré-migration) ou erreur : action neutre. Le client, ayant reçu !ok, NE modifie RIEN.
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 200 })
    }
}
