"use client"

// src/app/gamebook/CasinoModal.tsx
//
// v3.21 — Mini-jeu roulette rouge/noir.
// Stake 10 reps, win = +20 reps (net +10), 30 % / 60 % si LINGUINI talked today.
// Max 10 paris/jour (info renvoyée par le serveur).

import { useState } from "react"

interface BetResult {
    won: boolean
    drawnColor: "red" | "black"
    playerColor: "red" | "black"
    isLucky: boolean
    netReps: number
    availableEnergy: number
    betsToday: number
    maxBets: number
}

interface Props {
    availableEnergy: number
    isLucky: boolean  // si lastLuckTalkDate === today
    betsToday: number
    maxBets: number
    onBet: (color: "red" | "black") => Promise<BetResult | { error: string }>
    onClose: () => void
}

export default function CasinoModal({ availableEnergy, isLucky, betsToday, maxBets, onBet, onClose }: Props) {
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<BetResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [localBetsToday, setLocalBetsToday] = useState(betsToday)
    const [localEnergy, setLocalEnergy] = useState(availableEnergy)

    const canBet = !busy && localBetsToday < maxBets && localEnergy >= 10

    const handleBet = async (color: "red" | "black") => {
        if (!canBet) return
        setBusy(true)
        setError(null)
        try {
            const res = await onBet(color)
            if ("error" in res) {
                setError(res.error)
            } else {
                setResult(res)
                setLocalBetsToday(res.betsToday)
                setLocalEnergy(res.availableEnergy)
            }
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                zIndex: 9000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a",
                    border: "3px solid #c08040",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 300,
                    maxWidth: 380,
                    width: "100%",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold" }}>🎰 ROULETTE</div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "1px solid #fff",
                            color: "#fff",
                            padding: "2px 8px",
                            fontSize: 10,
                            cursor: "pointer",
                            letterSpacing: 2,
                        }}
                    >
                        FERMER
                    </button>
                </div>

                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 14, lineHeight: 1.5 }}>
                    Mise <strong>10 reps</strong>. Gagne <strong>+10 reps net</strong>.
                    {isLucky && (
                        <span style={{ marginLeft: 6, color: "#48a868", fontStyle: "italic" }}>
                            ✨ Tu te sens étrangement chanceux aujourd'hui.
                        </span>
                    )}
                </div>

                <div style={{ fontSize: 9, opacity: 0.6, marginBottom: 12 }}>
                    Énergie : {localEnergy} reps · Paris aujourd'hui : {localBetsToday}/{maxBets}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button
                        onClick={() => handleBet("red")}
                        disabled={!canBet}
                        style={{
                            flex: 1,
                            background: canBet ? "#c84838" : "#444",
                            color: "#fff",
                            border: "2px solid #fff",
                            padding: "12px",
                            fontFamily: "monospace",
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: 2,
                            cursor: canBet ? "pointer" : "not-allowed",
                        }}
                    >
                        🔴 ROUGE
                    </button>
                    <button
                        onClick={() => handleBet("black")}
                        disabled={!canBet}
                        style={{
                            flex: 1,
                            background: canBet ? "#2a2a2a" : "#444",
                            color: "#fff",
                            border: "2px solid #fff",
                            padding: "12px",
                            fontFamily: "monospace",
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: 2,
                            cursor: canBet ? "pointer" : "not-allowed",
                        }}
                    >
                        ⚫ NOIR
                    </button>
                </div>

                {result && (
                    <div
                        style={{
                            background: result.won ? "#205838" : "#582020",
                            border: "1px solid #fff",
                            padding: 10,
                            borderRadius: 4,
                            marginBottom: 8,
                            fontSize: 11,
                            lineHeight: 1.5,
                        }}
                    >
                        {result.won ? (
                            <>
                                <strong>{result.drawnColor === "red" ? "🔴 ROUGE" : "⚫ NOIR"} sort !</strong>{" "}
                                Tu gagnes <strong>+{result.netReps} reps</strong>.
                            </>
                        ) : (
                            <>
                                <strong>{result.drawnColor === "red" ? "🔴 ROUGE" : "⚫ NOIR"} sort.</strong>{" "}
                                Tu misais sur {result.playerColor === "red" ? "🔴 rouge" : "⚫ noir"}.{" "}
                                <strong>-10 reps.</strong>
                            </>
                        )}
                    </div>
                )}

                {error && (
                    <div style={{ fontSize: 10, color: "#f08080", marginBottom: 6 }}>{error}</div>
                )}

                {localBetsToday >= maxBets && (
                    <div style={{ fontSize: 10, opacity: 0.7, marginTop: 6, fontStyle: "italic" }}>
                        Plus de paris autorisés aujourd'hui. Reviens demain.
                    </div>
                )}
            </div>
        </div>
    )
}
