"use client"

// src/app/gamebook/TreeBookModal.tsx
//
// v3.25 — Modal d'affichage du Livre des Arbres (Pokédex des arbres).
// Affiche les 9 espèces. Espèces non découvertes : silhouette floutée.

import { TREE_KIND_CONFIGS } from "@/lib/gamebook/maps"

interface Props {
    discovered: string[]
    onClose: () => void
}

export default function TreeBookModal({ discovered, onClose }: Props) {
    const kinds = Object.values(TREE_KIND_CONFIGS)
    const total = kinds.length
    const found = kinds.filter((c) => discovered.includes(c.kind)).length

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
                    border: "3px solid #4a8030",
                    borderRadius: 6,
                    padding: 16,
                    maxWidth: 420, width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                }}
            >
                <div style={{ fontSize: 14, fontWeight: "bold", marginBottom: 4, letterSpacing: 2 }}>
                    📗 LIVRE DES ARBRES
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12 }}>
                    {found} / {total} espèces découvertes
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {kinds.map((c) => {
                        const isDiscovered = discovered.includes(c.kind)
                        return (
                            <div
                                key={c.kind}
                                style={{
                                    background: isDiscovered ? "#252525" : "#0a0a0a",
                                    border: "1px solid " + (isDiscovered ? "#4a8030" : "#333"),
                                    padding: 10,
                                    fontSize: 11,
                                    color: isDiscovered ? "#fff" : "#444",
                                }}
                            >
                                <div style={{ fontSize: 26, marginBottom: 4, filter: isDiscovered ? "none" : "blur(4px)" }}>
                                    {isDiscovered ? c.emoji : "❓"}
                                </div>
                                <div style={{ fontWeight: "bold", marginBottom: 2 }}>
                                    {isDiscovered ? c.label : "???"}
                                </div>
                                {isDiscovered ? (
                                    <>
                                        <div style={{ opacity: 0.7 }}>
                                            {c.bonusReps > 0 ? `+${c.bonusReps}` : c.bonusReps < 0 ? `${c.bonusReps}` : "spécial"} reps / fruit
                                        </div>
                                        <div style={{ opacity: 0.7 }}>
                                            max {c.maxPerDay}/jour
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ opacity: 0.5 }}>Non rencontré</div>
                                )}
                            </div>
                        )
                    })}
                </div>

                <button
                    onClick={onClose}
                    style={{
                        marginTop: 16,
                        width: "100%",
                        background: "#4a8030",
                        color: "#fff",
                        border: "none",
                        padding: "10px",
                        fontSize: 12,
                        fontWeight: "bold",
                        letterSpacing: 2,
                        cursor: "pointer",
                        fontFamily: "monospace",
                    }}
                >
                    REFERMER LE LIVRE
                </button>
            </div>
        </div>
    )
}
