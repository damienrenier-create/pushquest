"use client"

// src/app/gamebook/SlotMachineModal.tsx
//
// v3.24b-4 — Modal slot machine 3 reels. Mise 5 reps.

import { useState } from "react"

interface Props { onClose: () => void }

export default function SlotMachineModal({ onClose }: Props) {
    const [busy, setBusy] = useState(false)
    const [reels, setReels] = useState<string[]>(["❓", "❓", "❓"])
    const [message, setMessage] = useState<string>("Tire le levier ! 5 reps par essai.")
    const [lastNet, setLastNet] = useState<number | null>(null)

    const spin = async () => {
        if (busy) return
        setBusy(true)
        setReels(["🎰", "🎰", "🎰"])
        try {
            const res = await fetch("/api/gamebook/casino/slot", { method: "POST" })
            const data = await res.json()
            if (data.ok) {
                setReels(data.reels)
                setMessage(data.message)
                setLastNet(typeof data.net === "number" ? data.net : null)
            } else {
                setMessage(data.reason || "Impossible.")
                setReels(["❓", "❓", "❓"])
            }
        } catch {
            setMessage("Erreur réseau.")
            setReels(["❓", "❓", "❓"])
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
                    padding: 16, maxWidth: 340, width: "100%",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🎰 MACHINE À SOUS
                </div>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12 }}>
                    Mise 5 reps par essai.
                </div>

                <div style={{
                    background: "#0a0a0a", border: "2px solid #c0a040",
                    padding: 20, marginBottom: 12, textAlign: "center",
                    display: "flex", justifyContent: "center", gap: 12,
                }}>
                    {reels.map((r, i) => (
                        <div key={i} style={{
                            fontSize: 40, width: 56, height: 56,
                            background: "#fff", borderRadius: 4,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            {r}
                        </div>
                    ))}
                </div>

                <div style={{
                    padding: 8, marginBottom: 12,
                    background: lastNet && lastNet > 0 ? "#2a4020" : "#222",
                    border: "1px solid #555",
                    fontSize: 11, lineHeight: 1.5, textAlign: "center",
                }}>
                    {message}
                </div>

                <button
                    onClick={spin}
                    disabled={busy}
                    style={{
                        width: "100%", background: busy ? "#444" : "#c0a040",
                        color: "#000", border: "1px solid #fff",
                        padding: 14, fontSize: 13, fontWeight: "bold",
                        cursor: busy ? "wait" : "pointer",
                        fontFamily: "monospace", letterSpacing: 2,
                    }}
                >
                    {busy ? "..." : "🎲 SPIN (5 reps)"}
                </button>

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
