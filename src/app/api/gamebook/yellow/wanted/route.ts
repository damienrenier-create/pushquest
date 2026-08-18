// src/app/api/gamebook/yellow/wanted/route.ts
//
// USINE — LE GRAND MARCHAND, face DEMANDE (« wanted »). Un joueur poste ce qu'il CHERCHE (espèce + prix indicatif
//   en JC ou reps). D'autres proposent leur Daemon et NÉGOCIENT le prix (ping-pong). ESCROW SYMÉTRIQUE, zéro perte :
//   • Le Daemon du vendeur est engagé (drapeau `listed`, retiré de sa save qu'à l'accord — géré côté client).
//   • L'ACHETEUR ne bloque/paie QUE quand il est EN LIGNE (contre-offre ou acceptation). JC : bloqué SERVEUR
//     (FrontierProfile). Reps : bloqué CÔTÉ CLIENT (save de l'acheteur) — le serveur ne fait que router les reps qui
//     CROISENT vers un joueur hors-ligne via TradeDelivery.reps (paiement au vendeur / remboursement à l'acheteur).
//   • Le vendeur qui accepte utilise le montant DÉJÀ bloqué → sûr même si l'acheteur est hors-ligne.
//
// Gaté `(prisma as any).*` → compile avant db:push, neutre tant que les tables n'existent pas.

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isNexusYellowEnabled } from "@/lib/gamebook/yellow/featureFlag"

export const dynamic = "force-dynamic"
const MAX_WANTED = 3

async function requireYellow() {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id
    const nickname = (session?.user as { nickname?: string; name?: string })?.nickname || (session?.user as { name?: string })?.name || "Dresseur"
    if (!userId) return { ok: false as const, status: 401 }
    if (!(await isNexusYellowEnabled(userId))) return { ok: false as const, status: 404 }
    return { ok: true as const, userId, nickname }
}
function validMon(m: unknown): m is Record<string, unknown> & { uid: string } {
    return !!m && typeof m === "object" && typeof (m as { speciesId?: unknown }).speciesId === "string" && typeof (m as { uid?: unknown }).uid === "string" && !!(m as { uid?: string }).uid
}
const posInt = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0))

/** JC serveur : ajoute (delta>0) ou retire (delta<0) des JC à un joueur. Best-effort, borné ≥0. */
async function addJc(userId: string, delta: number) {
    try {
        const fp = (prisma as any).frontierProfile
        const p = await fp.findUnique({ where: { userId } })
        const jc = Math.max(0, Math.floor(Number(p?.jc) || 0))
        await fp.upsert({ where: { userId }, create: { userId, jc: Math.max(0, jc + delta) }, update: { jc: Math.max(0, jc + delta) } })
    } catch { /* table absente → no-op */ }
}
async function getJc(userId: string): Promise<number> {
    try { const p = await (prisma as any).frontierProfile.findUnique({ where: { userId } }); return Math.max(0, Math.floor(Number(p?.jc) || 0)) } catch { return 0 }
}

export async function GET() {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    try {
        const W = (prisma as any).tradeWanted, O = (prisma as any).tradeWantedOffer
        const [myWanted, otherWanted, offersAsBuyer, offersAsSeller] = await Promise.all([
            W.findMany({ where: { ownerId: auth.userId }, orderBy: { createdAt: "desc" } }),
            W.findMany({ where: { ownerId: { not: auth.userId } }, orderBy: { createdAt: "desc" }, take: 60 }),
            O.findMany({ where: { buyerId: auth.userId }, orderBy: { createdAt: "desc" } }),
            O.findMany({ where: { sellerId: auth.userId }, orderBy: { createdAt: "desc" } }),
        ])
        return NextResponse.json({ ok: true, myWanted, otherWanted, offersAsBuyer, offersAsSeller })
    } catch {
        return NextResponse.json({ ok: true, myWanted: [], otherWanted: [], offersAsBuyer: [], offersAsSeller: [] })
    }
}

export async function POST(req: NextRequest) {
    const auth = await requireYellow()
    if (!auth.ok) return NextResponse.json({ error: "Forbidden" }, { status: auth.status })
    let body: any
    try { body = await req.json() } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }) }
    const action = typeof body?.action === "string" ? body.action : ""

    try {
        const W = (prisma as any).tradeWanted, O = (prisma as any).tradeWantedOffer, D = (prisma as any).tradeDelivery

        // ── POSTER une annonce « je cherche » ──
        if (action === "postWanted") {
            const speciesId = String(body.speciesId || "")
            const priceKind = body.priceKind === "reps" ? "reps" : "jc"
            const price = posInt(body.price)
            const note = String(body.note || "").slice(0, 120).trim()
            if (!speciesId) return NextResponse.json({ error: "Bad species" }, { status: 400 })
            if (await W.count({ where: { ownerId: auth.userId } }) >= MAX_WANTED) return NextResponse.json({ ok: false, reason: "full" }, { status: 200 })
            const wanted = await W.create({ data: { ownerId: auth.userId, ownerNickname: auth.nickname, speciesId, priceKind, price, note } })
            return NextResponse.json({ ok: true, wanted })
        }

        // ── ANNULER son annonce : rembourse + délivre le retour de chaque offre en cours ──
        if (action === "cancelWanted") {
            const wanted = await W.findUnique({ where: { id: String(body.wantedId || "") } })
            if (!wanted || wanted.ownerId !== auth.userId) return NextResponse.json({ error: "Not owner" }, { status: 403 })
            const offers = await O.findMany({ where: { wantedId: wanted.id } })
            const tx: any[] = []
            for (const of of offers) {
                tx.push(D.create({ data: { recipientId: of.sellerId, unlockUid: of.sellerUid, note: "Annonce retirée" } })) // rendre le Daemon du vendeur
                if (of.escrowedByBuyer > 0) { // rembourser l'acheteur (lui = owner, mais peut être hors-ligne côté reps)
                    if (of.priceKind === "jc") await addJc(auth.userId, of.escrowedByBuyer)
                    else tx.push(D.create({ data: { recipientId: of.buyerId, reps: of.escrowedByBuyer, note: "Remboursement (annonce retirée)" } }))
                }
            }
            tx.push(O.deleteMany({ where: { wantedId: wanted.id } }))
            tx.push(W.delete({ where: { id: wanted.id } }))
            await prisma.$transaction(tx)
            return NextResponse.json({ ok: true })
        }

        // ── OFFRIR (vendeur) : propose son Daemon à un prix (= prix annonce par défaut). Escrow Daemon côté client. ──
        if (action === "offerWanted") {
            if (!validMon(body.mon)) return NextResponse.json({ error: "Bad mon" }, { status: 400 })
            const wanted = await W.findUnique({ where: { id: String(body.wantedId || "") } })
            if (!wanted) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            if (wanted.ownerId === auth.userId) return NextResponse.json({ error: "Own wanted" }, { status: 400 })
            const price = posInt(body.price ?? wanted.price)
            const offer = await O.create({ data: { wantedId: wanted.id, buyerId: wanted.ownerId, buyerNickname: wanted.ownerNickname, sellerId: auth.userId, sellerNickname: auth.nickname, monJson: body.mon, sellerUid: body.mon.uid, priceKind: wanted.priceKind, price, lastBy: "seller", escrowedByBuyer: 0 } })
            return NextResponse.json({ ok: true, offer })
        }

        // ── CONTRE-OFFRE. Par l'ACHETEUR : bloque le nouveau prix (JC serveur ; reps déjà débité côté client). Par le
        //    VENDEUR : rembourse le blocage acheteur (JC serveur ; reps via livraison car acheteur hors-ligne possible). ──
        if (action === "counterWanted") {
            const offer = await O.findUnique({ where: { id: String(body.offerId || "") } })
            if (!offer) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            const isBuyer = offer.buyerId === auth.userId, isSeller = offer.sellerId === auth.userId
            if (!isBuyer && !isSeller) return NextResponse.json({ error: "Not party" }, { status: 403 })
            const newPrice = posInt(body.price)

            if (isBuyer) {
                // Rembourser l'ancien blocage acheteur puis bloquer le nouveau.
                if (offer.priceKind === "jc") {
                    if (offer.escrowedByBuyer > 0) await addJc(auth.userId, offer.escrowedByBuyer) // rendre l'ancien
                    if (await getJc(auth.userId) < newPrice) { if (offer.escrowedByBuyer > 0) await addJc(auth.userId, -offer.escrowedByBuyer); return NextResponse.json({ ok: false, reason: "insufficient" }, { status: 200 }) }
                    await addJc(auth.userId, -newPrice) // bloquer le nouveau
                }
                // reps : le client a déjà ajusté sa save (rendre l'ancien + débiter le nouveau) avant l'appel.
                await O.update({ where: { id: offer.id }, data: { price: newPrice, lastBy: "buyer", escrowedByBuyer: newPrice } })
            } else {
                // Vendeur contre : le blocage de l'acheteur n'a plus lieu d'être → remboursé.
                if (offer.escrowedByBuyer > 0) {
                    if (offer.priceKind === "jc") await addJc(offer.buyerId, offer.escrowedByBuyer)
                    else await D.create({ data: { recipientId: offer.buyerId, reps: offer.escrowedByBuyer, note: "Remboursement (contre-offre)" } })
                }
                await O.update({ where: { id: offer.id }, data: { price: newPrice, lastBy: "seller", escrowedByBuyer: 0 } })
            }
            return NextResponse.json({ ok: true })
        }

        // ── ANNULER une offre (vendeur) : rend son Daemon + rembourse un éventuel blocage acheteur. ──
        if (action === "cancelOffer") {
            const offer = await O.findUnique({ where: { id: String(body.offerId || "") } })
            if (!offer || offer.sellerId !== auth.userId) return NextResponse.json({ error: "Not seller" }, { status: 403 })
            const tx: any[] = [D.create({ data: { recipientId: offer.sellerId, unlockUid: offer.sellerUid, note: "Offre annulée" } })]
            if (offer.escrowedByBuyer > 0) {
                if (offer.priceKind === "jc") await addJc(offer.buyerId, offer.escrowedByBuyer)
                else tx.push(D.create({ data: { recipientId: offer.buyerId, reps: offer.escrowedByBuyer, note: "Remboursement (offre annulée)" } }))
            }
            tx.push(O.delete({ where: { id: offer.id } }))
            await prisma.$transaction(tx)
            return NextResponse.json({ ok: true })
        }

        // ── ACCEPTER : la partie qui n'a PAS fixé le prix courant accepte. Exécute l'échange. ──
        if (action === "accept") {
            const offer = await O.findUnique({ where: { id: String(body.offerId || "") } })
            if (!offer) return NextResponse.json({ ok: false, reason: "gone" }, { status: 200 })
            const isBuyer = offer.buyerId === auth.userId, isSeller = offer.sellerId === auth.userId
            if (!isBuyer && !isSeller) return NextResponse.json({ error: "Not party" }, { status: 403 })
            // Seul le NON-lastBy peut accepter (on accepte la proposition de l'AUTRE).
            if ((offer.lastBy === "seller" && !isBuyer) || (offer.lastBy === "buyer" && !isSeller)) return NextResponse.json({ error: "Not your turn" }, { status: 400 })

            const price = posInt(offer.price)
            const tx: any[] = []
            // PAIEMENT au vendeur.
            if (offer.lastBy === "buyer") {
                // Le vendeur accepte le prix de l'acheteur → l'acheteur a DÉJÀ bloqué (escrowedByBuyer). On verse au vendeur.
                if (offer.priceKind === "jc") await addJc(offer.sellerId, offer.escrowedByBuyer)
                else tx.push(D.create({ data: { recipientId: offer.sellerId, reps: offer.escrowedByBuyer, note: `Vente à ${offer.buyerNickname}` } }))
            } else {
                // L'acheteur (EN LIGNE) accepte le prix du vendeur → il paie MAINTENANT. JC : débité serveur. Reps : déjà
                //   débité côté client avant l'appel. Dans les deux cas, on verse le prix au vendeur.
                if (offer.priceKind === "jc") {
                    if (await getJc(auth.userId) < price) return NextResponse.json({ ok: false, reason: "insufficient" }, { status: 200 })
                    await addJc(auth.userId, -price); await addJc(offer.sellerId, price)
                } else {
                    tx.push(D.create({ data: { recipientId: offer.sellerId, reps: price, note: `Vente à ${offer.buyerNickname}` } }))
                }
            }
            // LIVRAISON du Daemon : au vendeur → retirer (removeUid) ; à l'acheteur → ajouter (addMon).
            tx.push(D.create({ data: { recipientId: offer.sellerId, removeUid: offer.sellerUid, note: `Vendu à ${offer.buyerNickname}` } }))
            tx.push(D.create({ data: { recipientId: offer.buyerId, monJson: offer.monJson, note: `Reçu de ${offer.sellerNickname}` } }))
            // Les AUTRES offres sur cette annonce : rendues (Daemon + remboursement acheteur).
            const others = await O.findMany({ where: { wantedId: offer.wantedId, id: { not: offer.id } } })
            for (const of of others) {
                tx.push(D.create({ data: { recipientId: of.sellerId, unlockUid: of.sellerUid, note: "Annonce satisfaite" } }))
                if (of.escrowedByBuyer > 0) {
                    if (of.priceKind === "jc") await addJc(of.buyerId, of.escrowedByBuyer)
                    else tx.push(D.create({ data: { recipientId: of.buyerId, reps: of.escrowedByBuyer, note: "Remboursement (annonce satisfaite)" } }))
                }
            }
            tx.push(O.deleteMany({ where: { wantedId: offer.wantedId } }))
            tx.push(W.delete({ where: { id: offer.wantedId } }))
            await prisma.$transaction(tx)
            return NextResponse.json({ ok: true })
        }

        return NextResponse.json({ error: "Bad action" }, { status: 400 })
    } catch {
        return NextResponse.json({ ok: false, reason: "unavailable" }, { status: 200 })
    }
}
