"use client"

// src/app/gamebook/CockfightModal.tsx
//
// v3.24b-3 — Modal Combats de Coqs.
// 4 coqs avec stats différentes, mise 20-200, 1×/jour à 21h+.

import { useState } from "react"

interface Props { onClose: () => void }

const COCKS = [
    { id: "rocky",     name: "ROCKY",     emoji: "🐓", prob: 50, payout: 1.8,  description: "Favori. Solide." },
    { id: "el_diablo", name: "EL DIABLO", emoji: "🔥", prob: 30, payout: 3.0,  description: "Bon mais imprévisible." },
    { id: "torpedo",   name: "TORPEDO",   emoji: "💨", prob: 15, payout: 6.0,  description: "Rapide mais fragile." },
    { id: "lucky",     name: "LUCKY",     emoji: "🍀", prob: 5,  payout: 18.0, description: "Outsider. Coup de chance ?" },
]

export default function CockfightModal({ onClose }: Props) {
    const [stake, setStake] = useState<number>(20)
    const [pick, setPick] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<{ won: boolean; message: string; winnerName: string } | null>(null)

    const submit = async () => {
        if (!pick || busy) return
        setBusy(true)
        try {
            const res = await fetch("/api/gamebook/casino/cockfight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cockId: pick, stake }),
            })
            const data = await res.json()
            if (data.ok) {
                setResult({ won: data.won, message: data.message, winnerName: data.winnerName })
            } else {
                setResult({ won: false, message: data.reason || "Impossible.", winnerName: "" })
            }
        } catch {
            setResult({ won: false, message: "Erreur réseau.", winnerName: "" })
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9000, padding: 16, fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #a04040", borderRadius: 6,
                    padding: 16, maxWidth: 400, width: "100%",
                    maxHeight: "90vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🐓 COMBATS DE COQS
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                    1 pari par jour, à partir de 21h. Mise 20-200 reps.
                </div>

                {!result && (
                    <>
                        <div style={{ fontSize: 11, marginBottom: 6 }}>Choisis ton coq :</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                            {COCKS.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => setPick(c.id)}
                                    style={{
                                        background: pick === c.id ? "#a04040" : "#3a3a3a",
                                        color: "#fff", border: "1px solid #fff",
                                        padding: 10, textAlign: "left",
                                        fontFamily: "monospace", fontSize: 11,
                                        cursor: "pointer",
                                    }}
                                >
                                    <div style={{ fontWeight: "bold", marginBottom: 2 }}>
                                        {c.emoji} {c.name} <span style={{ opacity: 0.7, fontWeight: "normal" }}>— ×{c.payout}</span>
                                    </div>
                                    <div style={{ opacity: 0.7, fontSize: 10 }}>
                                        {c.description} ({c.prob}% de gagner)
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div style={{ fontSize: 11, marginBottom: 6 }}>Mise :</div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                            {[20, 50, 100, 200].map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setStake(v)}
                                    style={{
                                        flex: 1,
                                        background: stake === v ? "#a04040" : "#3a3a3a",
                                        color: "#fff", border: "1px solid #fff",
                                        padding: 8, fontSize: 11, fontWeight: "bold",
                                        cursor: "pointer", fontFamily: "monospace",
                                    }}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={submit}
                            disabled={!pick || busy}
                            style={{
                                width: "100%", background: pick ? "#a04040" : "#444",
                                color: "#fff", border: "1px solid #fff",
                                padding: 12, fontSize: 13, fontWeight: "bold",
                                cursor: pick && !busy ? "pointer" : "not-allowed",
                                fontFamily: "monospace",
                            }}
                        >
                            {busy ? "..." : `PARIER ${stake} REPS`}
                        </button>
                    </>
                )}

                {result && (
                    <div style={{
                        padding: 12,
                        background: result.won ? "#2a4020" : "#402020",
                        border: "1px solid " + (result.won ? "#4a8030" : "#a04040"),
                        fontSize: 12, lineHeight: 1.6,
                    }}>
                        {result.message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#a04040", color: "#fff", border: "none",
                        padding: "10px", fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    QUITTER
                </button>
            </div>
        </div>
    )
}
