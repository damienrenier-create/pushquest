"use client"

// USINE — LE GRAND MARCHAND : échange ASYNCHRONE de Daemons.
//   • Dépôt/offre : on retire le Daemon du PC UNIQUEMENT après confirmation serveur (escrow) → jamais de perte.
//   • Réclamation : à l'ouverture (et après chaque action), les livraisons en attente sont ajoutées au PC.
//   Seuls les Daemons de la RÉSERVE (PC) sont échangeables (l'équipe reste intouchée → aucun soft-lock).

import { useEffect, useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { getHeldItem } from "@/lib/gamebook/yellow/data/heldItems"
import { ivTotal } from "@/lib/gamebook/yellow/data/ivConfig"
import { getPlayer, releaseFromPc, addTradedMonToPc } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { fetchTroc, postTrocDeposit, postTrocWithdraw, postTrocOffer, postTrocCancelOffer, postTrocRespond, postTrocClaim, type TrocState } from "@/lib/gamebook/yellow/frontier/trocApi"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

function monLabel(raw: unknown): { name: string; sub: string } {
    const m = raw as MonInstance & { nickname?: string }
    const sp = getSpecies(m?.speciesId)
    if (!sp) return { name: "Daemon", sub: "" }
    const iv = m.ivs ? ivTotal(m.ivs) : 0
    const it = getHeldItem(m.heldItem) // l'objet tenu part avec le Daemon échangé
    return { name: `${m.shiny ? "✨ " : ""}${m.nickname || sp.name}`, sub: `Niv ${m.level} · ${sp.types.join("/")} · IV ${iv}/75${it ? ` · 🎒 ${it.name}` : ""}` }
}

function MonChip({ raw }: { raw: unknown }) {
    const { name, sub } = monLabel(raw)
    return (
        <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>{name}</div>
            <div style={{ fontSize: 9, opacity: 0.65 }}>{sub}</div>
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
    const [picker, setPicker] = useState<null | { kind: "deposit" } | { kind: "offer"; listingId: string; ownerNickname: string }>(null)
    const [wantNote, setWantNote] = useState("") // « ce que je cherche » (optionnel) — attaché au dépôt

    const refresh = async () => {
        const s = await fetchTroc()
        if (s.deliveries.length > 0) {
            const res = await postTrocClaim()
            if (res.ok && res.mons?.length) {
                let n = 0
                for (const d of res.mons) { if (addTradedMonToPc(d.mon)) n++ }
                if (n > 0) { persistYellowSave(); onToast?.(`📦 ${n} Daemon(s) récupéré(s) au PC !`) }
            }
            setSt(await fetchTroc())
        } else setSt(s)
    }
    useEffect(() => { refresh() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const guard = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }

    const doDeposit = (mon: MonInstance) => guard(async () => {
        const r = await postTrocDeposit(mon, wantNote)
        if (r?.ok) { releaseFromPc(mon.uid); persistYellowSave(); setPicker(null); setWantNote(""); onToast?.("🛒 Daemon déposé sur l'étal."); await refresh() }
        else if (r?.reason === "full") onToast?.("Étal plein (3 max).")
        else onToast?.("Échange indisponible pour l'instant.")
    })
    const doOffer = (listingId: string, mon: MonInstance) => guard(async () => {
        const r = await postTrocOffer(listingId, mon)
        if (r?.ok) { releaseFromPc(mon.uid); persistYellowSave(); setPicker(null); onToast?.("🤝 Offre envoyée !"); await refresh() }
        else if (r?.reason === "gone") { onToast?.("Cet étal n'existe plus."); await refresh() }
        else onToast?.("Échange indisponible pour l'instant.")
    })
    const doWithdraw = (listingId: string) => guard(async () => { const r = await postTrocWithdraw(listingId); if (r?.ok) { onToast?.("Étal retiré."); await refresh() } })
    const doCancel = (offerId: string) => guard(async () => { const r = await postTrocCancelOffer(offerId); if (r?.ok) { onToast?.("Offre annulée."); await refresh() } })
    const doRespond = (offerId: string, accept: boolean) => guard(async () => {
        const r = await postTrocRespond(offerId, accept)
        if (r?.ok) { onToast?.(accept ? "✅ Échange conclu !" : "Offre refusée."); await refresh() }
        else if (r?.reason === "gone") { onToast?.("Étal déjà échangé."); await refresh() }
    })

    const pc = getPlayer().pc

    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#15151f", color: "#fff", border: "2px solid #e0a458", borderRadius: 14, padding: 14, width: "min(460px, 96vw)", maxHeight: "90vh", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🛒 LE GRAND MARCHAND</div>
                    <button onClick={onClose} style={{ background: "#332e4a", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>
                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4 }}>Échange asynchrone : dépose des Daemons de ta RÉSERVE (PC), d&apos;autres dresseurs proposent les leurs. Quand vous êtes d&apos;accord, j&apos;échange.</div>

                {picker ? (
                    <>
                        <div style={sectionTitle}>{picker.kind === "deposit" ? "Choisis un Daemon à déposer" : `Proposer à ${(picker as any).ownerNickname}`}</div>
                        {picker.kind === "deposit" && (
                            <input value={wantNote} onChange={(e) => setWantNote(e.target.value)} maxLength={120}
                                placeholder="Ce que tu cherches (optionnel) — ex. « un EAU niv 50 »"
                                style={{ width: "100%", boxSizing: "border-box", background: "#20202c", border: "1px solid #3a3550", borderRadius: 8, padding: "7px 9px", color: "#fff", fontFamily: "inherit", fontSize: 11, marginBottom: 8 }} />
                        )}
                        {pc.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.7 }}>Ta réserve (PC) est vide. Dépose d&apos;abord un Daemon au PC d&apos;un Centre.</div>
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
                                        <button disabled={busy} onClick={() => doWithdraw(l.id)} style={btn("#c98a8a")}>Retirer</button>
                                    </div>
                                    {l.wantNote ? <div style={wantStyle}>🔎 cherche : {l.wantNote}</div> : null}
                                    {offers.length > 0 && <div style={{ fontSize: 9, opacity: 0.6, margin: "6px 0 3px" }}>Offres reçues :</div>}
                                    {offers.map((o) => (
                                        <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, background: "#191922", borderRadius: 6, padding: "5px 7px", marginTop: 4 }}>
                                            <div><div style={{ fontSize: 9, opacity: 0.6 }}>{o.offererNickname} propose :</div><MonChip raw={o.monJson} /></div>
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
                                        <div><div style={{ fontSize: 9, opacity: 0.6 }}>{l.ownerNickname}</div><MonChip raw={l.monJson} /></div>
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
                                    <button disabled={busy} onClick={() => doCancel(o.id)} style={btn("#c98a8a")}>Annuler</button>
                                </div>
                            ))}
                        </>}
                    </>
                )}
            </div>
        </div>
    )
}
