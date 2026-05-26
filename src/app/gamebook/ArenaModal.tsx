"use client"

// src/app/gamebook/ArenaModal.tsx
//
// v3.24d — Modal Arène Manouche. Combat tamagotchi du joueur vs IA.
// Stats des 6 propriétés affichées, log de combat, récompense.

import { useState } from "react"

interface Stats {
    force: number; vitesse: number; defense: number; hp: number; bonheur: number; intelligence: number
}

interface Result {
    won: boolean
    message: string
    opponent: { name: string; emoji: string; level: number; stats: Stats }
    playerStats: Stats
    log: string[]
}

interface Props {
    onClose: () => void
}

export default function ArenaModal({ onClose }: Props) {
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState<Result | null>(null)
    const [error, setError] = useState<string | null>(null)

    const launch = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try {
            const res = await fetch("/api/gamebook/arena/fight", { method: "POST" })
            const data = await res.json()
            if (data.ok) {
                setResult(data)
            } else {
                setError(data.reason || "Impossible.")
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
                    border: "3px solid #a06030", borderRadius: 6,
                    padding: 16, maxWidth: 420, width: "100%",
                    maxHeight: "90vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🎻 ARÈNE MANOUCHE
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                    Ton animal vs un sauvage du Nexus. 1 combat / jour.
                </div>

                {!result && !error && (
                    <button
                        onClick={launch}
                        disabled={busy}
                        style={{
                            width: "100%", background: "#a06030", color: "#fff",
                            border: "1px solid #fff", padding: 14,
                            fontSize: 13, fontWeight: "bold",
                            cursor: busy ? "wait" : "pointer",
                            fontFamily: "monospace", letterSpacing: 2,
                            marginBottom: 12,
                        }}
                    >
                        {busy ? "..." : "🥊 COMBATTRE"}
                    </button>
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
                    <>
                        <div style={{
                            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12,
                        }}>
                            <div style={{ background: "#2a3a2a", padding: 8, fontSize: 10 }}>
                                <div style={{ fontWeight: "bold", marginBottom: 4 }}>TON ANIMAL</div>
                                <div>F : {result.playerStats.force}</div>
                                <div>V : {result.playerStats.vitesse}</div>
                                <div>D : {result.playerStats.defense}</div>
                                <div>HP : {result.playerStats.hp}</div>
                                <div>I : {result.playerStats.intelligence}</div>
                                <div style={{ opacity: 0.7 }}>♥ : {result.playerStats.bonheur}</div>
                            </div>
                            <div style={{ background: "#3a2a2a", padding: 8, fontSize: 10 }}>
                                <div style={{ fontWeight: "bold", marginBottom: 4 }}>
                                    {result.opponent.emoji} {result.opponent.name}
                                </div>
                                <div>F : {result.opponent.stats.force}</div>
                                <div>V : {result.opponent.stats.vitesse}</div>
                                <div>D : {result.opponent.stats.defense}</div>
                                <div>HP : {result.opponent.stats.hp}</div>
                                <div>I : {result.opponent.stats.intelligence}</div>
                                <div style={{ opacity: 0.7 }}>Lv {result.opponent.level}</div>
                            </div>
                        </div>

                        <div style={{
                            background: "#0a0a0a", padding: 8, fontSize: 9,
                            maxHeight: 120, overflowY: "auto", marginBottom: 12,
                            border: "1px solid #555", lineHeight: 1.5,
                        }}>
                            {result.log.map((l, i) => (
                                <div key={i}>{l}</div>
                            ))}
                        </div>

                        <div style={{
                            padding: 10,
                            background: result.won ? "#2a4020" : "#402020",
                            border: "1px solid " + (result.won ? "#4a8030" : "#a04040"),
                            fontSize: 12, lineHeight: 1.5,
                        }}>
                            {result.message}
                        </div>
                    </>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
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
