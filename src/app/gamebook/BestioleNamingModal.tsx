"use client"

// src/app/gamebook/BestioleNamingModal.tsx
//
// v3.19b — Modal qui s'ouvre à la PREMIÈRE rencontre avec les bestioles des hautes herbes du sud.
// Permet au joueur de donner un nom à l'espèce. Le nom est sauvé côté serveur lors du POST encounter.

import { useState } from "react"

interface Props {
    onSubmit: (name: string) => Promise<void>
    onClose: () => void
}

export default function BestioleNamingModal({ onSubmit, onClose }: Props) {
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const trimmed = name.trim()
    const isValid = trimmed.length >= 1 && trimmed.length <= 24 && /^[\p{L}\p{N} '-]+$/u.test(trimmed)

    const handleSubmit = async () => {
        if (!isValid) {
            setError("Nom invalide (1 à 24 caractères, lettres/chiffres).")
            return
        }
        if (busy) return
        setBusy(true)
        setError(null)
        try {
            await onSubmit(trimmed)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.92)",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                zIndex: 9100,
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
                    border: "3px solid #806040",
                    borderRadius: 6,
                    padding: 18,
                    minWidth: 280,
                    maxWidth: 380,
                    width: "100%",
                }}
            >
                <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold", marginBottom: 12 }}>
                    🐛 ESPÈCE INCONNUE
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 14, opacity: 0.9 }}>
                    Aïe ! Les bestioles sortent des hautes herbes et te mordent.
                    Tu recules — sans perte d'énergie cette fois.
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 12, opacity: 0.8 }}>
                    Personne ne sait comment elles s'appellent. <strong>Tu décides du nom de cette espèce.</strong>
                </div>
                <input
                    type="text"
                    value={name}
                    maxLength={24}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    placeholder="Mordipiks, Bzzgnards, Ravagecules..."
                    style={{
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #806040",
                        padding: "8px 10px",
                        fontFamily: "monospace",
                        fontSize: 12,
                        letterSpacing: 1,
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: 8,
                    }}
                />
                {error && (
                    <div style={{ fontSize: 10, color: "#f08080", marginBottom: 6 }}>{error}</div>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={busy || !isValid}
                    style={{
                        background: isValid && !busy ? "#806040" : "#333",
                        color: "#fff",
                        border: "1px solid #fff",
                        padding: "9px 12px",
                        fontFamily: "'Courier New', monospace",
                        fontSize: 11,
                        fontWeight: "bold",
                        letterSpacing: 2,
                        cursor: isValid && !busy ? "pointer" : "not-allowed",
                        width: "100%",
                    }}
                >
                    NOMMER L'ESPÈCE
                </button>
            </div>
        </div>
    )
}
