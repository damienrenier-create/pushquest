"use client"

// src/app/gamebook/CasinoPatternModal.tsx
//
// v3.24b — Modal du casino pattern de Muscuville.
// Le joueur place des mises (10-50 reps) sur une ou plusieurs cases (0-10).
// Spin → la roulette tombe sur PATTERN[spinIndex % 20]. Gain = mise × 10.
// 5 wins d'affilée → banqueroute + badge "Casseur de banque" (200 XP).

import { useState } from "react"
import {
    CASINO_NUM_CASES,
    CASINO_MIN_BET,
    CASINO_MAX_BET,
    CASINO_WIN_MULTIPLIER,
    CASINO_BANKRUPT_STREAK,
} from "@/lib/gamebook/casino"

interface SpinResult {
    winningCase: number
    totalBet: number
    totalWin: number
    netGain: number
    newSpinIndex: number
    newWinStreak: number
    bankrupt: boolean
    badgeAwarded: boolean
}

interface Props {
    availableEnergy: number
    currentSpinIndex: number
    currentWinStreak: number
    bankruptUntil: Date | string | null
    onSpin: (bets: { case: number; amount: number }[]) => Promise<SpinResult | { error: string }>
    onClose: () => void
}

export default function CasinoPatternModal({
    availableEnergy,
    currentSpinIndex,
    currentWinStreak,
    bankruptUntil,
    onSpin,
    onClose,
}: Props) {
    const [bets, setBets] = useState<Record<number, number>>({})  // case -> amount
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<SpinResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [localEnergy, setLocalEnergy] = useState(availableEnergy)
    const [localSpinIndex, setLocalSpinIndex] = useState(currentSpinIndex)
    const [localWinStreak, setLocalWinStreak] = useState(currentWinStreak)

    const bankruptActive = bankruptUntil && new Date(bankruptUntil).getTime() > Date.now()

    const totalBet = Object.values(bets).reduce((a, b) => a + b, 0)
    const placedCases = Object.keys(bets).map(Number)
    const canSpin = !busy && !bankruptActive && placedCases.length > 0 && totalBet > 0 && totalBet <= localEnergy

    const toggleCase = (caseN: number) => {
        if (bets[caseN] !== undefined) {
            const { [caseN]: _, ...rest } = bets
            void _
            setBets(rest)
        } else {
            setBets({ ...bets, [caseN]: CASINO_MIN_BET })
        }
    }

    const setAmount = (caseN: number, amount: number) => {
        const clamped = Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, amount))
        setBets({ ...bets, [caseN]: clamped })
    }

    const handleSpin = async () => {
        if (!canSpin) return
        setBusy(true)
        setError(null)
        setResult(null)
        try {
            const payload = Object.entries(bets).map(([c, a]) => ({ case: Number(c), amount: a }))
            const res = await onSpin(payload)
            if ("error" in res) {
                setError(res.error)
            } else {
                setResult(res)
                setLocalEnergy((e) => e + res.netGain)
                setLocalSpinIndex(res.newSpinIndex)
                setLocalWinStreak(res.newWinStreak)
                setBets({})
            }
        } catch (e) {
            setError(`Erreur réseau : ${(e as Error).message ?? e}`)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
                padding: 12,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: "#1a1a1a", border: "3px solid #e74c3c", borderRadius: 8,
                    padding: 16, maxWidth: 460, width: "100%", color: "#fff",
                    fontFamily: "monospace", maxHeight: "90vh", overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ margin: 0, marginBottom: 8, color: "#f1c40f", fontSize: 16 }}>
                    🎰 ROULETTE PATTERN — MUSCUVILLE
                </h2>

                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 10, lineHeight: 1.4 }}>
                    11 cases (0-10). Mise <strong>{CASINO_MIN_BET}-{CASINO_MAX_BET} reps</strong> par case.
                    Gain : mise × <strong>{CASINO_WIN_MULTIPLIER}</strong> sur la case gagnante.
                </div>

                {/* Status bar */}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 10, background: "#0f0f0f", padding: 6, borderRadius: 4 }}>
                    <span>⚡ <strong>{localEnergy}</strong></span>
                    <span>🎯 Spin #<strong>{localSpinIndex + 1}</strong></span>
                    <span>🔥 Streak <strong style={{ color: localWinStreak >= 3 ? "#f1c40f" : "#fff" }}>{localWinStreak}</strong></span>
                </div>

                {bankruptActive ? (
                    <div style={{ background: "#2c1010", padding: 12, borderRadius: 4, textAlign: "center", marginBottom: 10 }}>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>💥</div>
                        <div style={{ fontSize: 12, color: "#e74c3c", fontWeight: "bold" }}>CASINO EN BANQUEROUTE</div>
                        <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>
                            Reviens après {bankruptUntil ? new Date(bankruptUntil).toLocaleString("fr-FR") : "..."}.
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Grille des cases */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 10 }}>
                            {Array.from({ length: CASINO_NUM_CASES }, (_, i) => {
                                const active = bets[i] !== undefined
                                return (
                                    <button
                                        key={i}
                                        onClick={() => toggleCase(i)}
                                        disabled={busy}
                                        style={{
                                            background: active ? "#e74c3c" : "#333",
                                            border: active ? "2px solid #f1c40f" : "1px solid #555",
                                            color: "#fff", padding: "8px 4px", fontSize: 14, fontWeight: "bold",
                                            cursor: busy ? "not-allowed" : "pointer", borderRadius: 3,
                                            fontFamily: "monospace",
                                        }}
                                    >
                                        {i}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Liste des mises actives + slider mise */}
                        {placedCases.length > 0 && (
                            <div style={{ background: "#0f0f0f", padding: 8, borderRadius: 4, marginBottom: 10 }}>
                                <div style={{ fontSize: 10, marginBottom: 6, color: "#f1c40f" }}>Tes mises :</div>
                                {placedCases.map((c) => (
                                    <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 10 }}>
                                        <span style={{ width: 24, color: "#f1c40f", fontWeight: "bold" }}>{c}</span>
                                        <input
                                            type="range"
                                            min={CASINO_MIN_BET}
                                            max={CASINO_MAX_BET}
                                            step={1}
                                            value={bets[c]}
                                            onChange={(e) => setAmount(c, Number(e.target.value))}
                                            disabled={busy}
                                            style={{ flex: 1 }}
                                        />
                                        <span style={{ width: 36, textAlign: "right" }}>{bets[c]} ⚡</span>
                                        <button
                                            onClick={() => toggleCase(c)}
                                            disabled={busy}
                                            style={{
                                                background: "#333", color: "#e74c3c", border: "1px solid #555",
                                                padding: "1px 6px", fontSize: 10, cursor: "pointer", borderRadius: 2,
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                                <div style={{ marginTop: 6, fontSize: 10, textAlign: "right" }}>
                                    Total : <strong style={{ color: totalBet > localEnergy ? "#e74c3c" : "#fff" }}>{totalBet} ⚡</strong>
                                </div>
                            </div>
                        )}

                        {/* Bouton spin */}
                        <button
                            onClick={handleSpin}
                            disabled={!canSpin}
                            style={{
                                width: "100%", padding: "10px",
                                background: canSpin ? "#e74c3c" : "#333",
                                color: "#fff", border: "none", borderRadius: 4,
                                fontSize: 14, fontWeight: "bold", letterSpacing: "1px",
                                cursor: canSpin ? "pointer" : "not-allowed",
                                fontFamily: "monospace",
                            }}
                        >
                            {busy ? "..." : "🎰 SPIN"}
                        </button>
                    </>
                )}

                {/* Résultat du spin */}
                {result && (
                    <div style={{
                        marginTop: 10, padding: 10, background: result.totalWin > 0 ? "#103010" : "#301010",
                        border: `2px solid ${result.totalWin > 0 ? "#4cd964" : "#e74c3c"}`, borderRadius: 4,
                    }}>
                        <div style={{ fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>
                            La boule tombe sur la case <span style={{ color: "#f1c40f", fontSize: 16 }}>{result.winningCase}</span>
                        </div>
                        {result.totalWin > 0 ? (
                            <>
                                <div style={{ fontSize: 11, color: "#4cd964" }}>
                                    ✅ Gain : <strong>+{result.totalWin} reps</strong> (net {result.netGain > 0 ? "+" : ""}{result.netGain})
                                </div>
                                {result.bankrupt ? (
                                    <div style={{ marginTop: 6, padding: 6, background: "#1f1f00", borderRadius: 3, fontSize: 11 }}>
                                        <div style={{ color: "#f1c40f", fontWeight: "bold" }}>💰 BANQUEROUTE !</div>
                                        <div style={{ fontSize: 9, opacity: 0.8 }}>
                                            Le casino ferme 24h.
                                            {result.badgeAwarded && " Badge Casseur de banque +200 XP débloqué !"}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4 }}>
                                        Streak {result.newWinStreak}. Continue.
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{ fontSize: 11, color: "#e74c3c" }}>
                                ❌ Mise perdue : -{result.totalBet} reps. Streak reset.
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <div style={{ marginTop: 8, padding: 6, background: "#301010", color: "#e74c3c", fontSize: 10, borderRadius: 3 }}>
                        {error}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%", padding: 6,
                        background: "#333", color: "#fff", border: "1px solid #555",
                        fontSize: 10, cursor: "pointer", borderRadius: 3, fontFamily: "monospace",
                    }}
                >
                    QUITTER
                </button>
            </div>
        </div>
    )
}
