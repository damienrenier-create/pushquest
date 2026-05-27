"use client"

// src/app/gamebook/PastagoneArmurerieModal.tsx
//
// v4.0 Phase 4.D — PESTO Jr armurerie Pastagone : équipements pour Daemon.
// Phase 4.D = squelette UI ; les achats réels arrivent en Phase 5.

interface Props {
    onClose: () => void
}

interface WearableItem {
    key: string
    label: string
    desc: string
    cost: number
    bonus: string
}

const WEARABLES: WearableItem[] = [
    { key: "collier_renforce",   label: "🦴 Collier renforcé",   desc: "Protection cervicale rigide",    cost: 120, bonus: "+3 DÉFENSE, durabilité 5 combats" },
    { key: "muselière_dressage", label: "🥊 Muselière dressage", desc: "Force le Daemon à mordre fort",  cost: 130, bonus: "+4 ATTAQUE, durabilité 5 combats" },
    { key: "harnais_leger",      label: "🪶 Harnais léger",      desc: "Aérodynamique, super stretch",   cost: 110, bonus: "+3 VITESSE, durabilité 5 combats" },
    { key: "plaque_mentale",     label: "🧠 Plaque mentale",      desc: "Stimule l'intuition combat",     cost: 140, bonus: "+3 INTELLIGENCE, durabilité 5 combats" },
]

export default function PastagoneArmurerieModal({ onClose }: Props) {
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
                    border: "3px solid #80c060", borderRadius: 6,
                    padding: 16, maxWidth: 440, width: "100%",
                    maxHeight: "94vh", overflowY: "auto",
                }}
            >
                <div style={{ fontSize: 13, fontWeight: "bold", letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
                    🗡️ PESTO JR — ARMURERIE
                </div>
                <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                    « Mon père, le Père PESTO, m'a légué l'usinage. Ici j'arme les Daemons.
                    Cher mais durable. »
                </div>

                {WEARABLES.map((item) => (
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
                        <div style={{ opacity: 0.85, marginTop: 2, color: "#80c060" }}>{item.bonus}</div>
                        <button
                            disabled
                            style={{
                                marginTop: 6, padding: "4px 8px",
                                background: "#444", color: "#888",
                                border: "1px solid #666", fontSize: 9,
                                fontFamily: "monospace", cursor: "not-allowed",
                            }}
                        >
                            ACHETER (Phase 5 à venir)
                        </button>
                    </div>
                ))}

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
