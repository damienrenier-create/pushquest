"use client"

// src/app/gamebook/VideurModal.tsx
//
// v3.24c-4 — Modal interactif du PORTIER ARRABBIATA (videur Team Boulette).
// 3 boutons : OUI honnête / OUI menteur / NON.
//
// L'option "OUI honnête" et "OUI menteur" sont visuellement IDENTIQUES côté joueur —
// pas de hint UI sur ce qu'il faut choisir. La seule différence : avoir parlé au Père Pesto
// avant. Si tu cliques "OUI" sans avoir le flag pere → tu es traité comme menteur.

import { useState } from "react"

type VideurChoice = "yes_honest" | "yes_lying" | "no"

interface Props {
    onChoose: (choice: VideurChoice) => Promise<void>
    onClose: () => void
}

export default function VideurModal({ onChoose, onClose }: Props) {
    const [busy, setBusy] = useState(false)

    const handle = async (choice: VideurChoice) => {
        if (busy) return
        setBusy(true)
        try {
            await onChoose(choice)
        } finally {
            setBusy(false)
            onClose()
        }
    }

    return (
        <div
            style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 9000, padding: 16,
                fontFamily: "'Courier New', monospace",
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a", color: "#fff",
                    border: "3px solid #883030",
                    borderRadius: 6,
                    padding: 16,
                    maxWidth: 380, width: "100%",
                }}
            >
                <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold", marginBottom: 10 }}>
                    🕴️ PORTIER ARRABBIATA
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 14, fontStyle: "italic", opacity: 0.85 }}>
                    Le portier croise les bras, te toise.<br />
                    « Tu connais le mot de passe ? »
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <button
                        onClick={() => handle("yes_honest")}
                        disabled={busy}
                        style={{
                            background: "#3a3a3a",
                            color: "#fff",
                            border: "1px solid #fff",
                            padding: "10px 12px",
                            fontFamily: "monospace",
                            fontSize: 12,
                            letterSpacing: 1,
                            cursor: busy ? "wait" : "pointer",
                        }}
                    >
                        « OUI, je le connais. »
                    </button>
                    <button
                        onClick={() => handle("yes_lying")}
                        disabled={busy}
                        style={{
                            background: "#3a3a3a",
                            color: "#fff",
                            border: "1px solid #fff",
                            padding: "10px 12px",
                            fontFamily: "monospace",
                            fontSize: 12,
                            letterSpacing: 1,
                            cursor: busy ? "wait" : "pointer",
                        }}
                    >
                        « Oui, bien sûr ! »
                    </button>
                    <button
                        onClick={() => handle("no")}
                        disabled={busy}
                        style={{
                            background: "#3a3a3a",
                            color: "#fff",
                            border: "1px solid #fff",
                            padding: "10px 12px",
                            fontFamily: "monospace",
                            fontSize: 12,
                            letterSpacing: 1,
                            cursor: busy ? "wait" : "pointer",
                        }}
                    >
                        « Non, je ne le connais pas. »
                    </button>
                </div>
                <button
                    onClick={onClose}
                    disabled={busy}
                    style={{
                        marginTop: 12,
                        width: "100%",
                        background: "#222",
                        color: "#888",
                        border: "1px solid #555",
                        padding: "6px",
                        fontSize: 10,
                        cursor: "pointer",
                    }}
                >
                    QUITTER (j'ai pas envie de répondre)
                </button>
            </div>
        </div>
    )
}
