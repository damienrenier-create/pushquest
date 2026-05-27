"use client"

// src/app/gamebook/StopOuEncoreModal.tsx
//
// v3.24b-2 — Modal "Stop ou encore".
// Start → continue (crash 30%) ou cashout.

import { useState } from "react"

interface Props {
    onClose: () => void
}

interface Session {
    stake: number
    currentPot: number
    step: number
    alive: boolean
}

export default function StopOuEncoreModal({ onClose }: Props) {
    const [stake, setStake] = useState<number>(10)
    const [session, setSession] = useState<Session | null>(null)
    const [message, setMessage] = useState<string>("")
    const [busy, setBusy] = useState(false)
    const [crashed, setCrashed] = useState(false)
    const [cashed, setCashed] = useState(false)

    const call = async (action: "start" | "continue" | "cashout") => {
        if (busy) return
        setBusy(true)
        try {
            const res = await fetch("/api/gamebook/casino/stop", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, stake }),
            })
            const data = await res.json()
            if (data.ok) {
                if (data.session) setSession(data.session as Session)
                if (data.crashed) setCrashed(true)
                if (data.cashedOut) setCashed(true)
                setMessage(data.message || "")
            } else {
                setMessage(data.reason || "Action impossible.")
            }
        } catch {
            setMessage("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    const inSession = session?.alive === true

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
                    border: "3px solid #80a0d0", borderRadius: 6,
                    padding: 16, maxWidth: 360, width: "100%",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    🚦 STOP OU ENCORE
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                    3 essais/jour. Continue tant que tu veux… ou prends ce que tu as.
                </div>

                {!inSession && !crashed && !cashed && (
                    <>
                        <div style={{ fontSize: 11, marginBottom: 8 }}>Mise initiale :</div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                            {[1, 5, 10, 20].map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setStake(v)}
                                    style={{
                                        flex: 1,
                                        background: stake === v ? "#80a0d0" : "#3a3a3a",
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
                            onClick={() => call("start")}
                            disabled={busy}
                            style={{
                                width: "100%", background: "#4a8030", color: "#fff",
                                border: "1px solid #fff", padding: 12,
                                fontSize: 13, fontWeight: "bold",
                                cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
                            }}
                        >
                            DÉMARRER ({stake} reps)
                        </button>
                    </>
                )}

                {inSession && (
                    <>
                        <div style={{
                            background: "#2a2a2a", border: "1px solid #555",
                            padding: 10, marginBottom: 12, textAlign: "center",
                        }}>
                            <div style={{ fontSize: 9, opacity: 0.6, letterSpacing: 1 }}>POT COURANT</div>
                            <div style={{ fontSize: 28, fontWeight: "bold", color: "#80a0d0" }}>
                                {session?.currentPot} reps
                            </div>
                            <div style={{ fontSize: 9, opacity: 0.5 }}>
                                Étape {session?.step}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={() => call("continue")}
                                disabled={busy}
                                style={{
                                    flex: 1, background: "#806030", color: "#fff",
                                    border: "1px solid #fff", padding: 12,
                                    fontSize: 12, fontWeight: "bold",
                                    cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
                                }}
                            >
                                ENCORE (×1.5)
                            </button>
                            <button
                                onClick={() => call("cashout")}
                                disabled={busy}
                                style={{
                                    flex: 1, background: "#4a8030", color: "#fff",
                                    border: "1px solid #fff", padding: 12,
                                    fontSize: 12, fontWeight: "bold",
                                    cursor: busy ? "wait" : "pointer", fontFamily: "monospace",
                                }}
                            >
                                STOP 💰
                            </button>
                        </div>
                    </>
                )}

                {message && (
                    <div style={{
                        marginTop: 12, padding: 10,
                        background: crashed ? "#402020" : cashed ? "#2a4020" : "#222",
                        border: "1px solid " + (crashed ? "#a04040" : cashed ? "#4a8030" : "#555"),
                        fontSize: 11, lineHeight: 1.5,
                    }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
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
