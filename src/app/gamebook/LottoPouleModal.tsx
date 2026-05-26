"use client"

// src/app/gamebook/LottoPouleModal.tsx
//
// v3.24b-1 — Modal Lotto Poule : grille 4×4, 1/16, max 1 win/jour.
// Mise 10 reps, gain ×16.

import { useState } from "react"

interface Props {
    onClose: () => void
    onResult?: (won: boolean, netReps: number) => void
}

export default function LottoPouleModal({ onClose, onResult }: Props) {
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<{ won: boolean; draw: number; caseIndex: number; message: string } | null>(null)

    const handleClick = async (idx: number) => {
        if (busy || result) return
        setBusy(true)
        try {
            const res = await fetch("/api/gamebook/casino/lotto-poule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseIndex: idx }),
            })
            const data = await res.json()
            if (data.ok) {
                setResult({ won: data.won, draw: data.draw, caseIndex: idx, message: data.message })
                if (onResult) onResult(!!data.won, data.netReps ?? 0)
            } else {
                setResult({ won: false, draw: -1, caseIndex: idx, message: data.reason || "Impossible." })
            }
        } catch {
            setResult({ won: false, draw: -1, caseIndex: idx, message: "Erreur réseau." })
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
                    border: "3px solid #c0a040", borderRadius: 6,
                    padding: 16, maxWidth: 380, width: "100%",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🐔 LOTTO POULE
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                    Choisis une case. Mise 10 reps, gain ×16. Max 1 gain par jour.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {Array.from({ length: 16 }, (_, i) => {
                        const isDraw = result && result.draw === i
                        const isPicked = result && result.caseIndex === i
                        let bg = "#3a3a3a"
                        if (result) {
                            if (isDraw && isPicked) bg = "#4a8030"   // win
                            else if (isDraw) bg = "#a04040"          // miss (la bonne case)
                            else if (isPicked) bg = "#806030"        // picked but wrong
                        }
                        return (
                            <button
                                key={i}
                                onClick={() => handleClick(i)}
                                disabled={busy || !!result}
                                style={{
                                    background: bg, color: "#fff",
                                    border: "1px solid #fff",
                                    aspectRatio: "1",
                                    fontSize: 16, fontWeight: "bold",
                                    cursor: busy || result ? "default" : "pointer",
                                    fontFamily: "monospace",
                                }}
                            >
                                {result && (isDraw || isPicked)
                                    ? (isDraw ? "🐔" : "✖")
                                    : i + 1}
                            </button>
                        )
                    })}
                </div>

                {result && (
                    <div style={{
                        marginTop: 12, padding: 10,
                        background: result.won ? "#2a4020" : "#402020",
                        border: "1px solid " + (result.won ? "#4a8030" : "#a04040"),
                        fontSize: 11, lineHeight: 1.5,
                    }}>
                        {result.message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#c0a040", color: "#000", border: "none",
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
