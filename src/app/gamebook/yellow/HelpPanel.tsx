"use client"

// Nexus Jaune Éclair — AIDE : glossaire CENTRALISÉ de toutes les astuces (mêmes fiches que les panneaux du parc,
//   source unique TOPICS). Liste des sujets → détail. Ouvert depuis le menu pause (📖 Aide).

import { useState } from "react"
import { TOPICS } from "./ParkSignPanel"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

export default function HelpPanel({ onClose }: { onClose: () => void }) {
    const [idx, setIdx] = useState<number | null>(null)
    const topic = idx != null ? TOPICS[idx] : null
    return (
        <div style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: CREAM, color: INK, border: `3px solid ${INK}`, borderRadius: 12, padding: 14, width: "min(440px, 96vw)", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 8px 30px #000a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.3 }}>📖 MANUEL DU DRESSEUR</div>
                    <button onClick={onClose} style={{ background: INK, color: CREAM, border: "none", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800 }}>✕</button>
                </div>

                {topic ? (
                    <>
                        <button onClick={() => setIdx(null)} style={{ background: "transparent", color: INK, border: `1px solid ${DARK}`, borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontWeight: 800, fontSize: 11, marginBottom: 10 }}>← Tous les sujets</button>
                        <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 8 }}>{topic.t}</div>
                        <div>{topic.body}</div>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>Toutes les astuces du jeu, réunies. Choisis un sujet :</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {TOPICS.map((t, i) => (
                                <button key={i} onClick={() => setIdx(i)} style={{ textAlign: "left", background: "#fff8e6", border: `1px solid ${DARK}`, borderRadius: 8, padding: "9px 11px", cursor: "pointer", color: INK, fontFamily: "inherit", fontWeight: 700, fontSize: 13 }}>{t.t}</button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
