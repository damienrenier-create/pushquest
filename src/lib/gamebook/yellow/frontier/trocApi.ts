// src/lib/gamebook/yellow/frontier/trocApi.ts
//
// USINE — LE GRAND MARCHAND : client de /api/gamebook/yellow/troc (échange asynchrone). Toutes les mutations
//   renvoient { ok } — l'appelant ne retire un Daemon de sa save qu'APRÈS un ok (escrow confirmé).

const BASE = "/api/gamebook/yellow/troc"

export interface TrocListing { id: string; ownerId: string; ownerNickname: string; monJson: unknown; wantNote?: string; createdAt: string }
export interface TrocOffer { id: string; listingId: string; ownerId: string; offererId: string; offererNickname: string; monJson: unknown; createdAt: string }
export interface TrocDelivery { id: string; recipientId: string; monJson: unknown; note: string; createdAt: string }
export interface TrocState {
    myListings: TrocListing[]
    otherListings: TrocListing[]
    offersReceived: TrocOffer[]
    offersSent: TrocOffer[]
    deliveries: TrocDelivery[]
}

const EMPTY: TrocState = { myListings: [], otherListings: [], offersReceived: [], offersSent: [], deliveries: [] }

export async function fetchTroc(): Promise<TrocState> {
    try {
        const r = await fetch(BASE)
        const j = await r.json()
        return { ...EMPTY, ...(j || {}) }
    } catch { return { ...EMPTY } }
}

async function post(body: Record<string, unknown>): Promise<any> {
    try {
        const r = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        return await r.json()
    } catch { return { ok: false, reason: "unavailable" } }
}

export const postTrocDeposit = (mon: unknown, wantNote?: string) => post({ action: "deposit", mon, wantNote: wantNote ?? "" })
export const postTrocWithdraw = (listingId: string) => post({ action: "withdraw", listingId })
export const postTrocOffer = (listingId: string, mon: unknown) => post({ action: "offer", listingId, mon })
export const postTrocCancelOffer = (offerId: string) => post({ action: "cancelOffer", offerId })
export const postTrocRespond = (offerId: string, accept: boolean) => post({ action: "respond", offerId, accept })
export const postTrocClaim = (): Promise<{ ok: boolean; mons?: { mon: unknown; note: string }[] }> => post({ action: "claim" })
