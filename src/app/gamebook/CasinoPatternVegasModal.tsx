"use client"

// src/app/gamebook/CasinoPatternVegasModal.tsx
//
// v3.24b-5 — Modal du pattern Vegas (22 cases, mise 20-100, ×15).
// Un pattern différent par jour de la semaine.

import { useState, useEffect } from "react"
import {
    CASINO_VEGAS_NUM_CASES,
    CASINO_VEGAS_MIN_BET,
    CASINO_VEGAS_MAX_BET,
    CASINO_VEGAS_WIN_MULTIPLIER,
} from "@/lib/gamebook/casino"

interface Props {
    onClose: () => void
}

export default function CasinoPatternVegasModal({ onClose }: Props) {
    const [bets, setBets] = useState<Record<number, number>>({})
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<{ won: boolean; winningCase: number; netGain: number; message: string } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [spinIndex, setSpinIndex] = useState<number>(0)

    useEffect(() => {
        ; (async () => {
            try {
                const r = await fetch("/api/gamebook/state")
                if (r.ok) {
                    const j = await r.json()
                    if (typeof j?.state?.casinoPatternVegasIndex === "number") {
                        setSpinIndex(j.state.casinoPatternVegasIndex)
                    }
                }
            } catch { /* silent */ }
        })()
    }, [])

    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0)
    const placed = Object.keys(bets).length

    const toggleCase = (caseN: number) => {
        if (bets[caseN] !== undefined) {
            const { [caseN]: _drop, ...rest } = bets
            void _drop
            setBets(rest)
        } else {
            setBets({ ...bets, [caseN]: CASINO_VEGAS_MIN_BET })
        }
    }

    const setAmount = (caseN: number, amount: number) => {
        const clamped = Math.max(CASINO_VEGAS_MIN_BET, Math.min(CASINO_VEGAS_MAX_BET, amount))
        setBets({ ...bets, [caseN]: clamped })
    }

    const handleSpin = async () => {
        if (busy || placed === 0) return
        setBusy(true)
        setError(null)
        try {
            const betArr = Object.entries(bets).map(([k, v]) => ({ case: Number(k), amount: v }))
            const res = await fetch("/api/gamebook/casino/pattern-vegas-spin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bets: betArr }),
            })
            const data = await res.json()
            if (data.ok) {
                setResult({ won: data.won, winningCase: data.winningCase, netGain: data.netGain, message: data.message })
                setSpinIndex(data.newSpinIndex)
                setBets({})
            } else {
                setError(data.reason || "Spin refusé.")
            }
        } catch {
            setError("Erreur réseau.")
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
                    border: "3px solid #c84040", borderRadius: 6,
                    padding: 16, maxWidth: 460, width: "100%",
                    maxHeight: "92vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🎰 PATTERN VEGAS (VIP)
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>
                    22 cases, mise {CASINO_VEGAS_MIN_BET}-{CASINO_VEGAS_MAX_BET} reps, gain ×{CASINO_VEGAS_WIN_MULTIPLIER}.
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12 }}>
                    Spin #{spinIndex + 1}.
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(8, 1fr)",
                    gap: 4, marginBottom: 12,
                }}>
                    {Array.from({ length: CASINO_VEGAS_NUM_CASES }, (_, i) => {
                        const placed = bets[i] !== undefined
                        const winning = result && result.winningCase === i
                        let bg = "#3a3a3a"
                        if (result) bg = winning ? "#4a8030" : (placed ? "#806030" : "#222")
                        else if (placed) bg = "#c84040"
                        return (
                            <button
                                key={i}
                                onClick={() => !result && toggleCase(i)}
                                disabled={busy || !!result}
                                style={{
                                    background: bg, color: "#fff",
                                    border: "1px solid #fff",
                                    aspectRatio: "1",
                                    fontSize: 11, fontWeight: "bold",
                                    cursor: result ? "default" : "pointer",
                                    fontFamily: "monospace",
                                    padding: 0,
                                }}
                            >
                                {i}
                                {placed && (
                                    <div style={{ fontSize: 8, opacity: 0.9 }}>{bets[i]}</div>
                                )}
                            </button>
                        )
                    })}
                </div>

                {!result && placed > 0 && (
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6 }}>Ajuster les mises :</div>
                        {Object.entries(bets).map(([k, v]) => (
                            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, width: 40 }}>Case {k}</span>
                                <input
                                    type="number"
                                    min={CASINO_VEGAS_MIN_BET}
                                    max={CASINO_VEGAS_MAX_BET}
                                    value={v}
                                    onChange={(e) => setAmount(Number(k), Number(e.target.value))}
                                    style={{
                                        background: "#222", color: "#fff", border: "1px solid #555",
                                        padding: "4px 6px", fontSize: 11, width: 70,
                                        fontFamily: "monospace",
                                    }}
                                />
                                <span style={{ fontSize: 10, opacity: 0.5 }}>reps</span>
                            </div>
                        ))}
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>
                            Total mise : {totalBet} reps → gain potentiel ×{CASINO_VEGAS_WIN_MULTIPLIER}
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: 10, background: "#402020", border: "1px solid #a04040",
                        fontSize: 11, marginBottom: 12,
                    }}>
                        {error}
                    </div>
                )}

                {result && (
                    <div style={{
                        padding: 10,
                        background: result.won ? "#2a4020" : "#402020",
                        border: "1px solid " + (result.won ? "#4a8030" : "#a04040"),
                        fontSize: 12, lineHeight: 1.5, marginBottom: 12,
                    }}>
                        {result.message}
                    </div>
                )}

                {!result && (
                    <button
                        onClick={handleSpin}
                        disabled={busy || placed === 0}
                        style={{
                            width: "100%",
                            background: placed > 0 ? "#c84040" : "#444",
                            color: "#fff", border: "1px solid #fff",
                            padding: 14, fontSize: 13, fontWeight: "bold",
                            cursor: placed > 0 && !busy ? "pointer" : "not-allowed",
                            fontFamily: "monospace", letterSpacing: 2,
                        }}
                    >
                        {busy ? "..." : `🎲 SPIN (${totalBet} reps)`}
                    </button>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 8, width: "100%",
                        background: "#222", color: "#888", border: "1px solid #555",
                        padding: "8px", fontSize: 11, cursor: "pointer",
                        fontFamily: "monospace",
                    }}
                >
                    QUITTER
                </button>
            </div>
        </div>
    )
}
