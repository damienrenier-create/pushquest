"use client"

// USINE — MARKET « WANTED » (face demande). Onglet du Grand Marchand : poster ce qu'on cherche, proposer un Daemon,
//   négocier le prix (ping-pong) en JC ou reps. Escrow symétrique : le Daemon du vendeur est engagé (grisé) ; l'acheteur
//   ne bloque/paie que quand il est EN LIGNE. Reps de l'acheteur = ajustés côté client autour de l'appel.

import { useEffect, useState } from "react"
import { SPECIES_IDS, getSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { getPlayer, spendReps, grantReps, listMonForTrade } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { fetchWanted, postWanted, cancelWanted, offerWanted, counterWanted, cancelOffer, acceptWanted, type WantedState, type WantedAd, type WantedOffer, type PriceKind } from "@/lib/gamebook/yellow/frontier/wantedApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

// ANTI-SPOILER : les légendaires ULTRA-SECRETS (MégamonarX/Galijah) ne sont JAMAIS proposés au marché (ni spoiler, ni troc).
const SPECIES_SORTED = [...SPECIES_IDS].filter((id) => !DEX_ULTRA_SECRET.has(id)).sort((a, b) => (getSpecies(a)?.dexNo ?? 0) - (getSpecies(b)?.dexNo ?? 0))
const box: React.CSSProperties = { background: "#20202c", border: "1px solid #3a3550", borderRadius: 8, padding: 8, marginBottom: 6 }
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#15151f", border: "none", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontWeight: 800, fontSize: 11 })
const sect: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "#e0a458", margin: "10px 0 5px", textTransform: "uppercase", letterSpacing: 0.4 }
const priceLabel = (k: PriceKind, n: number) => `${n} ${k === "reps" ? "reps ⚡" : "JC 💠"}`
const monName = (raw: unknown) => { const m = raw as MonInstance; const sp = getSpecies(m?.speciesId); return sp ? `${m.shiny ? "✨" : ""}${m.nickname || sp.name} N.${m.level}` : "Daemon" }

export default function WantedTab({ onToast, claim }: { onToast?: (m: string) => void; claim: () => Promise<void> }) {
    const [st, setSt] = useState<WantedState | null>(null)
    const [busy, setBusy] = useState(false)
    const [note, setNote] = useState<string | null>(null)
    const [newAd, setNewAd] = useState<{ speciesId: string; kind: PriceKind; price: string; note: string } | null>(null)
    const [offerFor, setOfferFor] = useState<WantedAd | null>(null) // annonce pour laquelle on choisit un Daemon à proposer
    const [counterFor, setCounterFor] = useState<{ offer: WantedOffer; price: string } | null>(null)

    const refresh = async () => { await claim(); setSt(await fetchWanted()) }
    useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps
    const guard = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); setNote(null); try { await fn() } finally { setBusy(false) } }
    const pc = getPlayer().pc.filter((m) => m.tradeState !== "listed") // Daemons libres (réserve)

    // ── POSTER une annonce ──
    const doPost = () => guard(async () => {
        if (!newAd?.speciesId) { setNote("Choisis une espèce."); return }
        const r = await postWanted(newAd.speciesId, newAd.kind, Math.max(0, parseInt(newAd.price) || 0), newAd.note)
        if (r?.ok) { setNewAd(null); onToast?.("🔎 Recherche publiée."); await refresh() }
        else if (r?.reason === "full") setNote("Max 3 recherches.")
        else setNote("Indisponible pour l'instant.")
    })
    const doCancelWanted = (id: string) => guard(async () => { const r = await cancelWanted(id); if (r?.ok) { onToast?.("Recherche retirée."); await refresh() } })

    // ── VENDEUR : proposer un Daemon (au prix de l'annonce) ──
    const doOffer = (ad: WantedAd, mon: MonInstance) => guard(async () => {
        const r = await offerWanted(ad.id, mon, ad.price)
        if (r?.ok && r.offer?.id) { listMonForTrade(mon.uid, r.offer.id); persistYellowSave(); setOfferFor(null); onToast?.("🤝 Daemon proposé (grisé)."); await refresh() }
        else if (r?.reason === "gone") { onToast?.("Cette recherche n'existe plus."); await refresh() }
        else setNote("Indisponible pour l'instant.")
    })
    const doCancelOffer = (o: WantedOffer) => guard(async () => { const r = await cancelOffer(o.id); if (r?.ok) { onToast?.("Offre annulée."); await refresh() } })

    // ── VENDEUR : contrer / accepter (pas de reps côté client : serveur gère) ──
    const sellerCounter = (o: WantedOffer, price: number) => guard(async () => { const r = await counterWanted(o.id, price); if (r?.ok) { setCounterFor(null); onToast?.("Contre-offre envoyée."); await refresh() } else setNote("Indisponible.") })
    const sellerAccept = (o: WantedOffer) => guard(async () => { const r = await acceptWanted(o.id); if (r?.ok) { onToast?.("✅ Vente conclue !"); await refresh() } else if (r?.reason === "gone") { await refresh() } else setNote("Indisponible.") })

    // ── ACHETEUR : contrer (bloque le prix ; reps ajustés côté client) ──
    const buyerCounter = (o: WantedOffer, price: number) => guard(async () => {
        const net = price - o.escrowedByBuyer // variation de reps bloqués (>0 = bloquer plus, <0 = rendre)
        if (o.priceKind === "reps") {
            if (net > 0 && getPlayer().reps < net) { setNote("Pas assez de reps pour bloquer ce prix."); return }
            if (net > 0) spendReps(net); else if (net < 0) grantReps(-net); persistYellowSave()
        }
        const r = await counterWanted(o.id, price)
        if (!r?.ok) { if (o.priceKind === "reps") { if (net > 0) grantReps(net); else if (net < 0) spendReps(-net); persistYellowSave() } setNote(r?.reason === "insufficient" ? "Pas assez de JC pour bloquer ce prix." : "Indisponible."); return }
        setCounterFor(null); onToast?.("Contre-offre envoyée (montant bloqué)."); await refresh()
    })
    // ── ACHETEUR : accepter le prix du vendeur (paie MAINTENANT ; reps débités côté client) ──
    const buyerAccept = (o: WantedOffer) => guard(async () => {
        if (o.priceKind === "reps") { if (getPlayer().reps < o.price) { setNote("Pas assez de reps."); return } spendReps(o.price); persistYellowSave() }
        const r = await acceptWanted(o.id)
        if (!r?.ok) { if (o.priceKind === "reps") { grantReps(o.price); persistYellowSave() } setNote(r?.reason === "insufficient" ? "Pas assez de JC." : "Indisponible."); return }
        onToast?.("✅ Échange conclu ! Daemon reçu."); await refresh()
    })

    if (offerFor) {
        const matches = pc.filter((m) => m.speciesId === offerFor.speciesId)
        return (
            <>
                <div style={sect}>Proposer un {getSpecies(offerFor.speciesId)?.name} à {offerFor.ownerNickname}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>Prix de départ : {priceLabel(offerFor.priceKind, offerFor.price)} (négociable ensuite).</div>
                {matches.length === 0 ? <div style={{ fontSize: 12, opacity: 0.7 }}>Aucun {getSpecies(offerFor.speciesId)?.name} libre dans ta réserve (PC).</div>
                    : matches.map((m) => <button key={m.uid} disabled={busy} onClick={() => doOffer(offerFor, m)} style={{ ...box, textAlign: "left", width: "100%", color: "#fff", cursor: "pointer", marginBottom: 4 }}>{monName(m)}</button>)}
                {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 6 }}>{note}</div>}
                <button onClick={() => { setOfferFor(null); setNote(null) }} style={{ ...btn("#555"), color: "#fff", marginTop: 6 }}>← Retour</button>
            </>
        )
    }

    if (st == null) return <div style={{ fontSize: 12, opacity: 0.7, padding: "8px 0" }}>Chargement…</div>

    const offerRow = (o: WantedOffer, side: "buyer" | "seller") => {
        const myTurn = (o.lastBy === "seller" && side === "buyer") || (o.lastBy === "buyer" && side === "seller")
        const other = side === "buyer" ? o.sellerNickname : o.buyerNickname
        const editing = counterFor?.offer.id === o.id
        return (
            <div key={o.id} style={box}>
                <div style={{ fontSize: 11 }}>{side === "buyer" ? `${o.sellerNickname} propose` : "Ton offre"} : <b>{monName(o.monJson)}</b></div>
                <div style={{ fontSize: 11, color: "#ffd54a", marginTop: 2 }}>Prix : <b>{priceLabel(o.priceKind, o.price)}</b> <span style={{ opacity: 0.6, fontWeight: 400 }}>(fixé par {o.lastBy === "seller" ? "le vendeur" : "l'acheteur"})</span></div>
                {editing ? (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, alignItems: "center" }}>
                        <input type="number" value={counterFor!.price} onChange={(e) => setCounterFor({ offer: o, price: e.target.value })} style={{ width: 70, background: "#15151f", color: "#fff", border: "1px solid #3a3550", borderRadius: 6, padding: "4px 6px", fontSize: 12 }} />
                        <span style={{ fontSize: 10, opacity: 0.7 }}>{o.priceKind === "reps" ? "reps" : "JC"}</span>
                        <button disabled={busy} onClick={() => { const p = Math.max(0, parseInt(counterFor!.price) || 0); side === "buyer" ? buyerCounter(o, p) : sellerCounter(o, p) }} style={btn("#7ac98a")}>Envoyer</button>
                        <button disabled={busy} onClick={() => setCounterFor(null)} style={{ ...btn("#555"), color: "#fff" }}>✕</button>
                    </div>
                ) : (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                        {myTurn && <button disabled={busy} onClick={() => side === "buyer" ? buyerAccept(o) : sellerAccept(o)} style={btn("#7ac98a")}>Accepter {priceLabel(o.priceKind, o.price)}</button>}
                        {myTurn && <button disabled={busy} onClick={() => setCounterFor({ offer: o, price: String(o.price) })} style={btn("#8ab6c9")}>Contrer</button>}
                        {!myTurn && <span style={{ fontSize: 10, opacity: 0.6 }}>en attente de {other}…</span>}
                        {side === "seller" && <button disabled={busy} onClick={() => doCancelOffer(o)} style={btn("#c98a8a")}>Annuler</button>}
                    </div>
                )}
            </div>
        )
    }

    return (
        <>
            {/* MES RECHERCHES */}
            <div style={sect}>Mes recherches ({st.myWanted.length}/3)</div>
            {st.myWanted.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Aucune.</div>}
            {st.myWanted.map((ad) => {
                const offers = st.offersAsBuyer.filter((o) => o.wantedId === ad.id)
                return (
                    <div key={ad.id} style={box}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div><b>🔎 {getSpecies(ad.speciesId)?.name ?? ad.speciesId}</b> <span style={{ fontSize: 10, color: "#ffd54a" }}>· {priceLabel(ad.priceKind, ad.price)}</span></div>
                            <button disabled={busy} onClick={() => doCancelWanted(ad.id)} style={btn("#c98a8a")}>Retirer</button>
                        </div>
                        {ad.note ? <div style={{ fontSize: 10, opacity: 0.7, fontStyle: "italic", marginTop: 2 }}>{ad.note}</div> : null}
                        {offers.length > 0 && <div style={{ fontSize: 9, opacity: 0.6, margin: "6px 0 2px" }}>Propositions :</div>}
                        {offers.map((o) => offerRow(o, "buyer"))}
                    </div>
                )
            })}
            {st.myWanted.length < 3 && !newAd && <button disabled={busy} onClick={() => setNewAd({ speciesId: "", kind: "jc", price: "50", note: "" })} style={{ ...btn("#e0a458"), marginBottom: 4 }}>+ Poster une recherche</button>}

            {newAd && (
                <div style={{ ...box, border: "1px solid #e0a458" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 6 }}>Nouvelle recherche</div>
                    <select value={newAd.speciesId} onChange={(e) => setNewAd({ ...newAd, speciesId: e.target.value })} style={{ width: "100%", background: "#15151f", color: "#fff", border: "1px solid #3a3550", borderRadius: 6, padding: "6px", fontSize: 12, marginBottom: 6 }}>
                        <option value="">— espèce recherchée —</option>
                        {SPECIES_SORTED.map((id) => <option key={id} value={id}>N°{getSpecies(id)?.dexNo} {getSpecies(id)?.name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <input type="number" value={newAd.price} onChange={(e) => setNewAd({ ...newAd, price: e.target.value })} style={{ width: 70, background: "#15151f", color: "#fff", border: "1px solid #3a3550", borderRadius: 6, padding: "5px 6px", fontSize: 12 }} />
                        <button onClick={() => setNewAd({ ...newAd, kind: "jc" })} style={{ ...btn(newAd.kind === "jc" ? "#ffd54a" : "#332e4a"), color: newAd.kind === "jc" ? "#15151f" : "#fff" }}>JC 💠</button>
                        <button onClick={() => setNewAd({ ...newAd, kind: "reps" })} style={{ ...btn(newAd.kind === "reps" ? "#ffd54a" : "#332e4a"), color: newAd.kind === "reps" ? "#15151f" : "#fff" }}>reps ⚡</button>
                    </div>
                    <input value={newAd.note} onChange={(e) => setNewAd({ ...newAd, note: e.target.value })} maxLength={120} placeholder="Note (optionnel)" style={{ width: "100%", boxSizing: "border-box", background: "#15151f", color: "#fff", border: "1px solid #3a3550", borderRadius: 6, padding: "5px 6px", fontSize: 11, marginBottom: 6 }} />
                    <div style={{ display: "flex", gap: 6 }}>
                        <button disabled={busy} onClick={doPost} style={btn("#7ac98a")}>Publier</button>
                        <button disabled={busy} onClick={() => { setNewAd(null); setNote(null) }} style={{ ...btn("#555"), color: "#fff" }}>Annuler</button>
                    </div>
                </div>
            )}

            {/* RECHERCHES DES AUTRES */}
            <div style={sect}>Recherches des autres</div>
            {st.otherWanted.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Aucune pour l&apos;instant.</div>}
            {st.otherWanted.map((ad) => {
                const already = st.offersAsSeller.some((o) => o.wantedId === ad.id)
                const iHave = pc.some((m) => m.speciesId === ad.speciesId)
                return (
                    <div key={ad.id} style={box}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                            <div><span style={{ fontSize: 10, opacity: 0.6 }}>{ad.ownerNickname} cherche</span><br /><b>🔎 {getSpecies(ad.speciesId)?.name ?? ad.speciesId}</b> <span style={{ fontSize: 10, color: "#ffd54a" }}>· {priceLabel(ad.priceKind, ad.price)}</span></div>
                            {already ? <span style={{ fontSize: 10, opacity: 0.6 }}>offre en cours</span>
                                : iHave ? <button disabled={busy} onClick={() => setOfferFor(ad)} style={btn("#8ab6c9")}>Proposer</button>
                                    : <span style={{ fontSize: 9, opacity: 0.5 }}>pas en réserve</span>}
                        </div>
                        {ad.note ? <div style={{ fontSize: 10, opacity: 0.7, fontStyle: "italic", marginTop: 2 }}>{ad.note}</div> : null}
                    </div>
                )
            })}

            {/* MES OFFRES (vendeur) */}
            {st.offersAsSeller.length > 0 && <>
                <div style={sect}>Mes propositions</div>
                {st.offersAsSeller.map((o) => offerRow(o, "seller"))}
            </>}
            {note && <div style={{ fontSize: 11, color: "#ff9e6b", marginTop: 8 }}>{note}</div>}
        </>
    )
}
