// src/lib/gamebook/yellow/frontier/wantedApi.ts
//
// USINE — MARKET « WANTED » (face demande) : client de /api/gamebook/yellow/wanted.
//   Reps : pour les actions de l'ACHETEUR (contre-offre / acceptation d'un prix vendeur), le CLIENT ajuste sa save
//   AVANT l'appel (rendre l'ancien blocage + débiter le nouveau). Le serveur route le reste via livraisons.

const BASE = "/api/gamebook/yellow/wanted"

export type PriceKind = "jc" | "reps"
export interface WantedAd { id: string; ownerId: string; ownerNickname: string; speciesId: string; priceKind: PriceKind; price: number; note?: string; createdAt: string }
export interface WantedOffer {
    id: string; wantedId: string; buyerId: string; buyerNickname: string; sellerId: string; sellerNickname: string
    monJson: unknown; sellerUid?: string; priceKind: PriceKind; price: number; lastBy: "seller" | "buyer"; escrowedByBuyer: number; createdAt: string
}
export interface WantedState {
    myWanted: WantedAd[]
    otherWanted: WantedAd[]
    offersAsBuyer: WantedOffer[]  // offres reçues sur MES annonces
    offersAsSeller: WantedOffer[] // MES offres sur les annonces des autres
}
const EMPTY: WantedState = { myWanted: [], otherWanted: [], offersAsBuyer: [], offersAsSeller: [] }

export async function fetchWanted(): Promise<WantedState> {
    try { const r = await fetch(BASE); const j = await r.json(); return { ...EMPTY, ...(j || {}) } } catch { return { ...EMPTY } }
}
async function post(body: Record<string, unknown>): Promise<any> {
    try { const r = await fetch(BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); return await r.json() } catch { return { ok: false, reason: "unavailable" } }
}

export const postWanted = (speciesId: string, priceKind: PriceKind, price: number, note?: string) => post({ action: "postWanted", speciesId, priceKind, price, note: note ?? "" })
export const cancelWanted = (wantedId: string) => post({ action: "cancelWanted", wantedId })
export const offerWanted = (wantedId: string, mon: unknown, price: number) => post({ action: "offerWanted", wantedId, mon, price })
export const counterWanted = (offerId: string, price: number) => post({ action: "counterWanted", offerId, price })
export const cancelOffer = (offerId: string) => post({ action: "cancelOffer", offerId })
export const acceptWanted = (offerId: string) => post({ action: "accept", offerId })
