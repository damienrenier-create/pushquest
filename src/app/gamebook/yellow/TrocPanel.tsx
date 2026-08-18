"use client"

// USINE — LE GRAND MARCHAND : échange ASYNCHRONE, escrow SOFT (aucune suppression au dépôt).
//   • Déposer/proposer un Daemon de la RÉSERVE (PC) = poser un drapeau "listed" (il reste en boîte, grisé, verrouillé).
//   • Les livraisons (échange conclu / retour) sont appliquées à l'ouverture : on AJOUTE le reçu, puis on RETIRE le
//     donné (jamais l'inverse → aucune perte), et on déliste les Daemons rendus. Puis on acquitte (2 phases).

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { fusionMaskedView, GROTTE_ENTERED_MARKER } from "@/lib/gamebook/yellow/data/fusiodex"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { ivTotal } from "@/lib/gamebook/yellow/data/ivConfig"
import { getPlayer, listMonForTrade, unlistMon, removeTradedMon, addTradedMonToPc, reconcileListedMons, grantReps } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { fetchTroc, postTrocDeposit, postTrocWithdraw, postTrocOffer, postTrocCancelOffer, postTrocRespond, postTrocClaim, postTrocAck, type TrocState, type TrocListing, type TrocOffer } from "@/lib/gamebook/yellow/frontier/trocApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"
import WantedTab from "./WantedTab"

function monLabel(raw: unknown): { name: string; sub: string } {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m?.speciesId)
    if (!sp) return { name: "Daemon", sub: "" }
    const iv = m.ivs ? ivTotal(m.ivs) : 0
    const it = getHeldItem(m.heldItem) // l'objet tenu part avec le Daemon échangé
    return { name: `${m.shiny ? "✨ " : ""}${m.nickname || sp.name}`, sub: `Niv ${m.level} · ${sp.types.join("/")} · IV ${iv}/75${it ? ` · 🎒 ${it.name}` : ""}` }
}
function MonChip({ raw, foreign = false }: { raw: unknown; foreign?: boolean }) {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m?.speciesId)
    if (!sp) return <div style={{ fontWeight: 800, fontSize: 12 }}>Daemon</div>
    // ANTI-SPOILER : Daemon d'AUTRUI (foreign) → fusion masquée en MissingNo/« ??? » tant que le viewer n'a pas vu la Grotte.
    const view = fusionMaskedView(m.speciesId, !foreign || getPlayer().defeatedTrainers.includes(GROTTE_ENTERED_MARKER))
    if (view.masked) return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={view.sprite} alt="" width={40} height={40} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
            <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>???</div>
                <div style={{ fontSize: 9, opacity: 0.65 }}>Fusion inconnue · niv {m.level} — visite la Grotte du Nexus</div>
            </div>
        </div>
    )
    const { name, sub } = monLabel(raw)
    const st = fullStats(m, sp)
    const moves = (m.moves ?? []).map((s) => getMove(s.moveId)).filter(Boolean)
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={sp.sprite} alt="" width={40} height={40} style={{ imageRendering: "pixelated", flexShrink: 0 }} />
            <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{name}</div>
                <div style={{ fontSize: 9, opacity: 0.65 }}>{sub}</div>
                <div style={{ fontSize: 9, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>PV {st.hp} · Atq {st.atk} · Déf {st.def} · Vit {st.spe} · Spé {st.spc}</div>
                {moves.length > 0 && <div style={{ fontSize: 9, opacity: 0.7 }}>⚔️ {moves.map((mv) => mv!.name).join(" · ")}</div>}
            </div>
        </div>
    )
}

const box: React.CSSProperties = { background: "#20202c", border: "1px solid #3a3550", borderRadius: 8, padding: 8, marginBottom: 6 }
const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#15151f", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontWeight: 800, fontSize: 11 })
const sectionTitle: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: "#e0a458", margin: "10px 0 5px", textTransform: "uppercase", letterSpacing: 0.4 }
const wantStyle: React.CSSProperties = { fontSize: 10, color: "#8ab6c9", marginTop: 4, fontStyle: "italic" }

export default function TrocPanel({ onClose, onToast }: { onClose: () => void; onToast?: (m: string) => void }) {
    const [st, setSt] = useState<TrocState | null>(null)
    const [busy, setBusy] = useState(false)
    const [tab, setTab] = useState<"etal" | "wanted">("etal") // OFFRE (étal) | DEMANDE (recherches)
    const [sortBy, setSortBy] = useState<"niveau" | "nom" | "type" | "iv">("niveau") // tri du sélecteur de dépôt
    const [picker, setPicker] = useState<null | { kind: "deposit" } | { kind: "offer"; listingId: string; ownerNickname: string }>(null)
    const [wantNote, setWantNote] = useState("")

    // Applique les livraisons en attente : AJOUT (reçu) puis RETRAIT (donné) puis DÉVERROUILLAGE (rendu), enfin ACK.
    const applyDeliveries = async () => {
        const res = await postTrocClaim()
        const ds = res.ok ? (res.deliveries ?? []) : []
        if (!ds.length) return
        let received = 0, repsGot = 0
        for (const d of ds) {
            if (d.monJson) { if (addTradedMonToPc(d.monJson)) received++ } // AJOUT d'abord (jamais de perte)
            if (d.removeUid) removeTradedMon(d.removeUid)                  // puis RETRAIT du Daemon donné
            if (d.unlockUid) unlistMon(d.unlockUid)                        // ou simple DÉVERROUILLAGE (offre rendue)
            if (d.reps > 0) { grantReps(d.reps); repsGot += d.reps }       // MARKET WANTED : paiement/remboursement en reps
        }
        persistYellowSave()
        if (repsGot > 0) onToast?.(`⚡ +${repsGot} reps reçus (échange).`)
        await postTrocAck(ds.map((d) => d.id)) // acquittement APRÈS persistance (au pire on réapplique → doublon, jamais perte)
        if (received > 0) onToast?.(`📦 ${received} Daemon(s) reçu(s) au PC !`)
    }
    const refresh = async () => {
        let s = await fetchTroc()
        if (s.deliveries.length > 0) { await applyDeliveries(); s = await fetchTroc() }
        reconcileListedMons([...s.myListings.map((l) => l.id), ...s.offersSent.map((o) => o.id)]) // auto-réparation
        setSt(s)
    }
    useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const guard = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }

    const doDeposit = (mon: MonInstance) => guard(async () => {
        const r = await postTrocDeposit(mon, wantNote)
        if (r?.ok && r.listing?.id) { listMonForTrade(mon.uid, r.listing.id); persistYellowSave(); setPicker(null); setWantNote(""); onToast?.("🛒 Daemon posé sur l'étal (grisé dans ta boîte)."); await refresh() }
        else if (r?.reason === "full") onToast?.("Étal plein (3 max).")
        else onToast?.("Échange indisponible pour l'instant.")
    })
    const doOffer = (listingId: string, mon: MonInstance) => guard(async () => {
        const r = await postTrocOffer(listingId, mon)
        if (r?.ok && r.offer?.id) { listMonForTrade(mon.uid, r.offer.id); persistYellowSave(); setPicker(null); onToast?.("🤝 Offre envoyée (Daemon grisé)."); await refresh() }
        else if (r?.reason === "gone") { onToast?.("Cet étal n'existe plus."); await refresh() }
        else onToast?.("Échange indisponible pour l'instant.")
    })
    const doWithdraw = (l: TrocListing) => guard(async () => {
        const r = await postTrocWithdraw(l.id)
        if (r?.ok) { if (l.ownerUid) unlistMon(l.ownerUid); persistYellowSave(); onToast?.("Étal retiré — Daemon rendu."); await refresh() }
    })
    const doCancel = (o: TrocOffer) => guard(async () => {
        const r = await postTrocCancelOffer(o.id)
        if (r?.ok) { if (o.offererUid) unlistMon(o.offererUid); persistYellowSave(); onToast?.("Offre annulée."); await refresh() }
    })
    const doRespond = (offerId: string, accept: boolean) => guard(async () => {
        const r = await postTrocRespond(offerId, accept)
        if (r?.ok) { onToast?.(accept ? "✅ Échange conclu !" : "Offre refusée."); await refresh() } // le swap est appliqué via les livraisons dans refresh()
        else if (r?.reason === "gone") { onToast?.("Étal déjà échangé."); await refresh() }
    })

    const pc0 = getPlayer().pc.filter((m) => m.tradeState !== "listed") // on ne propose que les Daemons LIBRES (pas déjà sur l'étal)
    const pc = [...pc0].sort((a, b) => {
        const sa = getSpecies(a.speciesId), sb = getSpecies(b.speciesId)
        if (sortBy === "niveau") return b.level - a.level
        if (sortBy === "nom") return (a.nickname || sa?.name || "").localeCompare(b.nickname || sb?.name || "")
        if (sortBy === "type") return (sa?.types[0] || "").localeCompare(sb?.types[0] || "")
        return (b.ivs ? ivTotal(b.ivs) : 0) - (a.ivs ? ivTotal(a.ivs) : 0) // iv
    })

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#15151f", color: "#fff", border: "2px solid #e0a458", borderRadius: 14, padding: 14, width: "min(460px, 96vw)", maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🛒 LE GRAND MARCHAND</div>
                    <button onClick={onClose} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Échange asynchrone. Ton Daemon posé reste dans ta boîte, <b>grisé</b>, jusqu&apos;à l&apos;échange — rien n&apos;est jamais perdu.</div>

                {/* Deux faces du marché : OFFRE (l'étal) | DEMANDE (les recherches) */}
                <div style={{ display: "flex", gap: 6, margin: "6px 0 8px" }}>
                    {(["etal", "wanted"] as const).map((t) => (
                        <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "6px 4px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800, background: tab === t ? "#e0a458" : "#332e4a", color: tab === t ? "#15151f" : "#fff" }}>{t === "etal" ? "🛒 Étal" : "🔎 Recherches"}</button>
                    ))}
                </div>

                {tab === "wanted" ? (
                    <WantedTab onToast={onToast} claim={applyDeliveries} />
                ) : picker ? (
                    <>
                        <div style={sectionTitle}>{picker.kind === "deposit" ? "Choisis un Daemon à déposer" : `Proposer à ${(picker as any).ownerNickname}`}</div>
                        {picker.kind === "deposit" && (
                            <input value={wantNote} onChange={(e) => setWantNote(e.target.value)} maxLength={120}
                                placeholder="Ce que tu cherches (optionnel) — ex. « un EAU niv 50 »"
                                style={{ width: "100%", boxSizing: "border-box", background: "#20202c", border: "1px solid #3a3550", borderRadius: 8, padding: "7px 9px", color: "#fff", fontFamily: "inherit", fontSize: 11, marginBottom: 8 }} />
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 11 }}>
                            <span style={{ opacity: 0.6 }}>Trier :</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} style={{ background: "#20202c", color: "#fff", border: "1px solid #3a3550", borderRadius: 6, padding: "3px 6px", fontSize: 11 }}>
                                <option value="niveau">Niveau ↓</option>
                                <option value="nom">Nom</option>
                                <option value="type">Type</option>
                                <option value="iv">IV ↓</option>
                            </select>
                        </div>
                        {pc.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Aucun Daemon libre dans ta réserve (PC). Dépose d&apos;abord un Daemon au PC d&apos;un Centre.</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {pc.map((m) => (
                                    <button key={m.uid} disabled={busy} onClick={() => picker.kind === "deposit" ? doDeposit(m) : doOffer((picker as any).listingId, m)} style={{ textAlign: "left", ...box, cursor: busy ? "default" : "pointer", color: "#fff", opacity: busy ? 0.6 : 1, marginBottom: 0 }}>
                                        <MonChip raw={m} />
                                    </button>
                                ))}
                            </div>
                        )}
                        <button onClick={() => setPicker(null)} style={{ ...btn("#555"), color: "#fff", marginTop: 8 }}>← Retour</button>
                    </>
                ) : st == null ? (
                    <div style={{ fontSize: 12, opacity: 0.7, padding: "10px 0" }}>Chargement…</div>
                ) : (
                    <>
                        {/* MON ÉTAL + offres reçues */}
                        <div style={sectionTitle}>Mon étal ({st.myListings.length}/3)</div>
                        {st.myListings.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Rien déposé.</div>}
                        {st.myListings.map((l) => {
                            const offers = st.offersReceived.filter((o) => o.listingId === l.id)
                            return (
                                <div key={l.id} style={box}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <MonChip raw={l.monJson} />
                                        <button disabled={busy} onClick={() => doWithdraw(l)} style={btn("#c98a8a")}>Retirer</button>
                                    </div>
                                    {l.wantNote ? <div style={wantStyle}>🔎 cherche : {l.wantNote}</div> : null}
                                    {offers.length > 0 && <div style={{ fontSize: 9, opacity: 0.6, margin: "6px 0 3px" }}>Offres reçues :</div>}
                                    {offers.map((o) => (
                                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, background: "#191922", borderRadius: 6, padding: "5px 7px", marginTop: 4 }}>
                                            <div><div style={{ fontSize: 9, opacity: 0.6 }}>{o.offererNickname} propose :</div><MonChip raw={o.monJson} foreign /></div>
                                            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                                <button disabled={busy} onClick={() => doRespond(o.id, true)} style={btn("#7ac98a")}>✓</button>
                                                <button disabled={busy} onClick={() => doRespond(o.id, false)} style={btn("#c98a8a")}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        })}
                        {st.myListings.length < 3 && <button disabled={busy} onClick={() => setPicker({ kind: "deposit" })} style={{ ...btn("#e0a458"), marginBottom: 4 }}>+ Déposer un Daemon</button>}

                        {/* ÉTALS DES AUTRES */}
                        <div style={sectionTitle}>Étals des autres dresseurs</div>
                        {st.otherListings.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Aucun étal pour l&apos;instant.</div>}
                        {st.otherListings.map((l) => {
                            const already = st.offersSent.some((o) => o.listingId === l.id)
                            return (
                                <div key={l.id} style={box}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                        <div><div style={{ fontSize: 9, opacity: 0.6 }}>{l.ownerNickname}</div><MonChip raw={l.monJson} foreign /></div>
                                        {already
                                            ? <span style={{ fontSize: 10, opacity: 0.6 }}>offre envoyée</span>
                                            : <button disabled={busy} onClick={() => setPicker({ kind: "offer", listingId: l.id, ownerNickname: l.ownerNickname })} style={btn("#8ab6c9")}>Proposer</button>}
                                    </div>
                                    {l.wantNote ? <div style={wantStyle}>🔎 cherche : {l.wantNote}</div> : null}
                                </div>
                            )
                        })}

                        {/* MES OFFRES ENVOYÉES */}
                        {st.offersSent.length > 0 && <>
                            <div style={sectionTitle}>Mes offres envoyées</div>
                            {st.offersSent.map((o) => (
                                <div key={o.id} style={{ ...box, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                    <MonChip raw={o.monJson} />
                                    <button disabled={busy} onClick={() => doCancel(o)} style={btn("#c98a8a")}>Annuler</button>
                                </div>
                            ))}
                        </>}
                    </>
                )}
            </div>
        </div>
    )
}
