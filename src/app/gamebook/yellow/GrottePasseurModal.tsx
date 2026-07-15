"use client"

// src/app/gamebook/yellow/GrottePasseurModal.tsx
//
// ZONE DE COMBAT — PASSEUR DE LA GROTTE : contre des Jetons de Combat, téléporte le joueur dans la Grotte du
// Nexus (casse-tête endgame). La dépense passe par le serveur (postSpend, atomique) ; le téléport (onEnter)
// n'a lieu qu'après confirmation serveur du débit.

import { useState, useEffect, type CSSProperties } from "react"
import { fetchFrontierProfile, postSpend } from "@/lib/gamebook/yellow/frontier/frontierApi"

export const GROTTE_ENTRY_COST = 5 // Jetons de Combat par passage (spec)

export default function GrottePasseurModal({ onClose, onEnter }: { onClose: () => void; onEnter: () => void }) {
    const [jc, setJc] = useState<number | null>(null)
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    useEffect(() => { fetchFrontierProfile().then((p) => setJc(p.jc)) }, [])

    const enter = async () => {
        if (busy) return
        if (jc === null) { setMsg("Chargement du solde…"); return }
        if (jc < GROTTE_ENTRY_COST) { setMsg(`Pas assez de Jetons (${GROTTE_ENTRY_COST} requis, ${jc} dispo).`); return }
        setBusy(true); setMsg(null)
        const r = await postSpend(GROTTE_ENTRY_COST)
        setBusy(false)
        if (!r.ok) { setMsg("Passage refusé (solde serveur insuffisant)."); if (typeof r.jc === "number") setJc(r.jc); return }
        onEnter() // débit confirmé → téléport (géré par l'appelant)
    }

    return (
        <div onClick={onClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>⛏️ PASSEUR DE LA GROTTE</div>
                <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10, lineHeight: 1.5 }}>
                        « La Grotte du Nexus est un vrai casse-tête. Le passage te coûtera <b>{GROTTE_ENTRY_COST} Jetons de Combat</b>. »
                    </div>
                    <div style={bar}>💠 Jetons de Combat : <b>{jc ?? "…"}</b></div>
                    {msg && <div style={{ fontSize: 11, color: "#ffcf6b", margin: "8px 0 0" }}>{msg}</div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={enter} disabled={busy} style={{ ...btn, background: "#f1c40f", color: "#1a1a22", opacity: busy ? 0.6 : 1 }}>{busy ? "…" : `⛏️ Entrer (−${GROTTE_ENTRY_COST} 💠)`}</button>
                        <button onClick={onClose} style={{ ...btn, background: "rgba(255,255,255,.15)", color: "#fff" }}>Annuler</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

const overlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }
const box: CSSProperties = { background: "#1e1b2e", color: "#fff", borderRadius: 12, width: "min(360px, 92vw)", overflow: "hidden", border: "1px solid rgba(255,255,255,.15)" }
const header: CSSProperties = { background: "#2a2440", padding: "10px 14px", fontWeight: 800, fontSize: 15 }
const bar: CSSProperties = { background: "rgba(255,255,255,.06)", borderRadius: 8, padding: "6px 10px", fontSize: 13 }
const btn: CSSProperties = { flex: 1, border: "none", borderRadius: 8, padding: "9px 12px", fontWeight: 800, cursor: "pointer", fontSize: 13 }
