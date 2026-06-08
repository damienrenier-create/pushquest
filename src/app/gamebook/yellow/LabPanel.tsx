"use client"

// Nexus Jaune Éclair — TERMINAL D'EXPÉRIENCES (labo, étage de l'infirmerie).
// Le joueur choisit une catégorie de récompense, sélectionne un défi physique RÉEL
// (vérifié sur ses vraies reps PushQuest), a jusqu'à minuit pour le réussir, puis
// le scientifique (PNJ 5,3) lui remet le butin. [Phase 1 : squelette du menu.]

import { useState } from "react"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

const CATS = [
    { key: "energie", icon: "⚡", label: "Énergie", desc: "Gagne de l'énergie de combat." },
    { key: "ct", icon: "💿", label: "CT (attaques)", desc: "Débloque une Capsule Technique." },
    { key: "autre", icon: "🎁", label: "Surprise", desc: "Daemon, objet rare, mystère…" },
]

export default function LabPanel() {
    const open = useGameStore((s) => s.labOpen)
    const close = useGameStore((s) => s.closeLab)
    const [cat, setCat] = useState<string | null>(null)
    if (!open) return null
    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🖥️ TERMINAL D'EXPÉRIENCES <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>Labo scientifique</span></div>
                <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                    <div style={{ fontSize: 12, color: INK, lineHeight: 1.5, marginBottom: 10 }}>
                        Choisis une récompense à viser. Tu auras jusqu'à <b>minuit</b> pour réussir le défi physique (sur tes vraies reps PushQuest), puis le <b>scientifique</b> te remettra ton dû.
                    </div>
                    {CATS.map((c) => (
                        <button key={c.key} onClick={() => setCat(c.key)} style={{ ...card, ...(cat === c.key ? cardOn : {}) }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{c.icon} {c.label}</div>
                            <div style={{ fontSize: 11, color: INK, opacity: 0.75 }}>{c.desc}</div>
                        </button>
                    ))}
                    {cat && (
                        <div style={{ marginTop: 12, padding: 10, border: `2px dashed ${DARK}`, borderRadius: 8, fontSize: 12, color: INK }}>
                            🚧 Les défis de cette catégorie arrivent très bientôt.
                        </div>
                    )}
                </div>
                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const card: React.CSSProperties = { display: "block", width: "100%", background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: 10, marginBottom: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }
const cardOn: React.CSSProperties = { border: "2px solid #3a8ee0", background: "#eaf4ff" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
