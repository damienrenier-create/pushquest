"use client"

// Nexus — Roulette EU : INTÉGRATION (Phase 3). Caisse (achat de jetons) → table → encaissement.
// Économie : on MISE de l'ÉNERGIE (reps) + des TICKETS (divisibles : un ticket de 50 = 50 jetons à
// étaler). L'énergie est débitée à l'achat, recréditée (plafonnée) à l'encaissement. Coexiste avec
// l'ancien casino (transition douce / A-B test). Le numéro gagnant est local en solo (serveur en multi).

import { useState } from "react"
import { usePlayer, spendReps, grantReps, consumeTicket } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import RouletteTable from "./RouletteTable"

export default function RouletteCasinoModal({ onClose }: { onClose: () => void }) {
    const player = usePlayer()
    const [entered, setEntered] = useState(false)
    const [caisse, setCaisse] = useState(0)

    const loadEnergy = (amount: number) => {
        const amt = Math.min(amount, player.reps)
        if (amt <= 0) return
        if (spendReps(amt)) setCaisse((c) => c + amt) // débit immédiat ; recrédité à l'encaissement
    }
    const loadTicket = () => { const v = consumeTicket(); if (v > 0) setCaisse((c) => c + v) }
    const cancel = () => { if (caisse > 0) { grantReps(caisse); persistYellowSave() } onClose() }
    const cashout = (finalBalance: number) => { grantReps(finalBalance); persistYellowSave(); onClose() }

    if (entered) {
        return (
            <div style={overlay}>
                <RouletteTable initialBalance={caisse} onClose={cashout} />
            </div>
        )
    }

    const tickets = player.labDefi.grantedTickets
    return (
        <div style={overlay} onClick={(e) => e.stopPropagation()}>
            <div style={box}>
                <div style={title}>🎡 ROULETTE EUROPÉENNE <span style={beta}>BÊTA</span></div>
                <div style={sub}>Achète des jetons avec ton énergie et/ou tes tickets. L'énergie non jouée t'est rendue à la sortie (dans la limite de ta jauge).</div>

                <div style={row}><span>⚡ Énergie dispo</span><b>{player.reps}/{player.repsCap}</b></div>
                <div style={row}><span>🎟️ Tickets</span><b>{tickets.length ? tickets.join(" · ") : "aucun"}</b></div>
                <div style={{ ...row, borderTop: "1px solid #2f5a40", paddingTop: 8, marginTop: 6 }}><span>🪙 Caisse</span><b style={{ color: "#e0c020", fontSize: 18 }}>{caisse}</b></div>

                <div style={{ fontSize: 11, opacity: 0.8, margin: "10px 0 4px" }}>Charger de l'énergie :</div>
                <div style={btnRow}>
                    {[50, 100, 250].map((a) => (
                        <button key={a} style={chip} disabled={player.reps < a} onClick={() => loadEnergy(a)}>+{a}</button>
                    ))}
                    <button style={chip} disabled={player.reps <= 0} onClick={() => loadEnergy(player.reps)}>+ Max</button>
                    {tickets.length > 0 && <button style={{ ...chip, background: "#6aa0ec" }} onClick={loadTicket}>+ ticket ({tickets[0]})</button>}
                </div>

                <div style={footer}>
                    <button style={ghost} onClick={cancel}>← Annuler</button>
                    <button style={{ ...primary, opacity: caisse > 0 ? 1 : 0.4 }} disabled={caisse <= 0} onClick={() => setEntered(true)}>Entrer à la table ▶</button>
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9400, background: "rgba(6,10,8,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, fontFamily: "'Courier New', monospace", color: "#eef" }
const box: React.CSSProperties = { width: "min(380px, 96vw)", background: "#0e1512", border: "2px solid #1c3a28", borderRadius: 14, padding: 16 }
const title: React.CSSProperties = { fontSize: 16, fontWeight: 800, textAlign: "center", marginBottom: 4 }
const beta: React.CSSProperties = { fontSize: 9, background: "#e0c020", color: "#1a1400", borderRadius: 4, padding: "1px 5px", verticalAlign: "middle" }
const sub: React.CSSProperties = { fontSize: 11, opacity: 0.75, textAlign: "center", marginBottom: 12, lineHeight: 1.4 }
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, padding: "3px 0" }
const btnRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 6 }
const chip: React.CSSProperties = { background: "#1c3a28", color: "#fff", border: "1px solid #2f5a40", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
const footer: React.CSSProperties = { display: "flex", justifyContent: "space-between", marginTop: 16, gap: 8 }
const ghost: React.CSSProperties = { background: "transparent", color: "#9fd", border: "1px solid #2f5a40", borderRadius: 8, padding: "9px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }
const primary: React.CSSProperties = { background: "#e0c020", color: "#1a1400", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
