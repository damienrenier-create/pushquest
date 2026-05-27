"use client"

// src/app/gamebook/PastagoneCuisineModal.tsx
//
// v4.0 Phase 4.D — RIGATONI cuisine Pastagone : shop bouffe + énigme BOLOGNION cachée.
// Phase 4.D = squelette UI ; les achats + énigme arrivent en Phase 5 et 7.

import { useState, useEffect } from "react"

interface Props {
    onClose: () => void
}

interface CuisineItem {
    key: string
    label: string
    desc: string
    cost: number
    effect: string
}

// Catalogue cuisine Pastagone (consommables — implémentation full Phase 5)
const CUISINE_ITEMS: CuisineItem[] = [
    { key: "steak_nerveux",  label: "🥩 Steak nerveux",   desc: "+50 HP combat sur un Daemon (use in fight)", cost: 80,  effect: "heal_in_fight" },
    { key: "os_a_moelle",    label: "🦴 Os à moelle",      desc: "+20 happiness sur un Daemon",                cost: 60,  effect: "happiness" },
    { key: "espresso_canin", label: "☕ Espresso canin",   desc: "+2 Vitesse pour 1 combat (use in fight)",    cost: 100, effect: "vitesse_buff" },
]

export default function PastagoneCuisineModal({ onClose }: Props) {
    const [puzzleStep, setPuzzleStep] = useState(0)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        // Lit l'état de l'énigme côté serveur
        ; (async () => {
            try {
                const r = await fetch("/api/gamebook/state")
                if (r.ok) {
                    const j = await r.json()
                    const p = j?.state?.pastagoneCuisinePuzzle ?? {}
                    const done = (p.step1 ? 1 : 0) + (p.step2 ? 1 : 0) + (p.step3 ? 1 : 0)
                    setPuzzleStep(done)
                }
            } catch { /* silent */ }
        })()
    }, [])

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
                    border: "3px solid #d4a060", borderRadius: 6,
                    padding: 16, maxWidth: 440, width: "100%",
                    maxHeight: "94vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    🍝 RIGATONI — CUISINE
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                    « Bienvenue dans ma cuisine. La meilleure bouffe pour chien-Daemon de Pastagone.
                    Et si tu fouilles bien… il paraît qu'un fantôme de pâte rôde la nuit. »
                </div>

                <div style={{ fontSize: 10, fontWeight: "bold", marginBottom: 6, color: "#d4a060" }}>
                    🍴 MENU
                </div>
                {CUISINE_ITEMS.map((item) => (
                    <div
                        key={item.key}
                        style={{
                            background: "#2a2a2a", border: "1px solid #555",
                            padding: 8, marginBottom: 6, fontSize: 10,
                        }}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{item.label}</strong>
                            <span style={{ color: "#ffd54f" }}>{item.cost} reps</span>
                        </div>
                        <div style={{ opacity: 0.7, marginTop: 2 }}>{item.desc}</div>
                        <button
                            disabled
                            onClick={() => setMessage("Achat indisponible pour l'instant (Phase 5 à venir).")}
                            style={{
                                marginTop: 6, padding: "4px 8px",
                                background: "#444", color: "#888",
                                border: "1px solid #666", fontSize: 9,
                                fontFamily: "monospace", cursor: "not-allowed",
                            }}
                        >
                            ACHETER (à venir)
                        </button>
                    </div>
                ))}

                {/* Indication discrète de l'énigme BOLOGNION (Phase 7) */}
                <div style={{
                    marginTop: 12, padding: 10, fontSize: 10,
                    background: "#202020", border: "1px dashed #666",
                    lineHeight: 1.5, opacity: 0.7,
                }}>
                    🍝 <strong>Quelque chose se cache dans cette cuisine.</strong><br />
                    Trois sacs de pâtes différents. Trois étapes à reproduire dans le bon ordre.
                    {puzzleStep > 0 && (
                        <div style={{ marginTop: 4, color: "#d4a060" }}>
                            Tu as déjà découvert {puzzleStep}/3 étapes.
                        </div>
                    )}
                    <div style={{ fontSize: 9, marginTop: 4, fontStyle: "italic" }}>
                        (Mécanique énigme implémentée en Phase 7.)
                    </div>
                </div>

                {message && (
                    <div style={{
                        marginTop: 10, padding: 8,
                        background: "#222", border: "1px solid #555", fontSize: 10,
                    }}>
                        {message}
                    </div>
                )}

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 12, width: "100%",
                        background: "#80a0d0", color: "#000", border: "none",
                        padding: 10, fontSize: 12, fontWeight: "bold",
                        letterSpacing: 2, cursor: "pointer", fontFamily: "monospace",
                    }}
                >
                    SORTIR
                </button>
            </div>
        </div>
    )
}
