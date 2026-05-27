"use client"

// src/app/gamebook/PastagoneInfirmerieModal.tsx
//
// v4.0 Phase 4.D — FUSILLI (infirmerie Pastagone) soigne ton Daemon leader.
// 50 reps / soin, max 3/jour.

import { useState } from "react"

interface Props {
    onClose: () => void
    onHealed?: (leader: { name: string; currentHp: number; maxHp: number }) => void
}

export default function PastagoneInfirmerieModal({ onClose, onHealed }: Props) {
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const heal = async () => {
        if (busy) return
        setBusy(true); setMessage(null)
        try {
            const r = await fetch("/api/gamebook/pastagone/infirmerie-heal", { method: "POST" })
            const j = await r.json()
            setMessage(j.message ?? j.reason ?? "")
            if (j.ok && j.leader && onHealed) onHealed(j.leader)
        } catch {
            setMessage("Erreur réseau.")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9100, padding: 16, fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #c060a0", borderRadius: 6,
                    padding: 16, maxWidth: 380, width: "100%",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    🩺 INFIRMIER FUSILLI
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                    « Le combat t'a éclaté ? Je rafistole ton Daemon, mais ça va te coûter 50 reps.
                    Et faut pas que t'abuses : 3 soins par jour, pas plus. »
                </div>

                <button
                    onClick={heal}
                    disabled={busy}
                    style={{
                        width: "100%",
                        background: busy ? "#444" : "#c060a0",
                        color: "#fff", border: "1px solid #fff",
                        padding: 10, fontSize: 12, fontFamily: "monospace",
                        cursor: busy ? "wait" : "pointer", fontWeight: "bold",
                        letterSpacing: 1,
                    }}
                >
                    🩺 SOIGNER (50 reps)
                </button>

                {message && (
                    <div style={{ marginTop: 10, padding: 8, background: "#222", border: "1px solid #555", fontSize: 10, lineHeight: 1.5 }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 10, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    FERMER
                </button>
            </div>
        </div>
    )
}
