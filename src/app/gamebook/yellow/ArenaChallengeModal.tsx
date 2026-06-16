"use client"

// Modal de confirmation avant un combat d'ARÈNE JOUEUR (hub Eau / miroir Élec) :
// aperçu de l'équipe adverse + boutons Annuler / COMBATTRE.

import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

export default function ArenaChallengeModal({ title, subtitle, enemyTeam, accent, onFight, onCancel }: {
    title: string
    subtitle: string
    enemyTeam: MonInstance[]
    accent: string
    onFight: () => void
    onCancel: () => void
}) {
    return (
        <div style={overlay} onClick={onCancel}>
            <div style={{ ...box, borderColor: accent }} onClick={(e) => e.stopPropagation()}>
                <div style={{ ...head, color: accent }}>{title}</div>
                <div style={sub}>{subtitle}</div>
                <div style={row}>
                    {enemyTeam.map((m, i) => {
                        const sp = getSpecies(m.speciesId)
                        return (
                            <div key={i} style={card}>
                                {sp?.sprite
                                    ? <img src={sp.sprite} alt={sp.name} style={img} />
                                    : <div style={{ fontSize: 26 }}>❓</div>}
                                <div style={nm}>{m.nickname ?? sp?.name ?? m.speciesId}</div>
                                <div style={lv}>N.{m.level}</div>
                            </div>
                        )
                    })}
                </div>
                <div style={btns}>
                    <button style={cancelBtn} onClick={onCancel}>Annuler</button>
                    <button style={{ ...fightBtn, background: accent }} onClick={onFight}>⚔️ COMBATTRE</button>
                </div>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(8,6,16,0.78)", padding: 14, fontFamily: "inherit",
}
const box: React.CSSProperties = {
    width: "min(420px, 96vw)", maxHeight: "92vh", overflowY: "auto", textAlign: "center", color: "#fff",
    background: "rgba(20,16,40,0.95)", border: "3px solid #ffd54a", borderRadius: 14, padding: "16px 14px",
    boxShadow: "0 0 36px rgba(0,0,0,0.5)",
}
const head: React.CSSProperties = { fontSize: 20, fontWeight: 800, letterSpacing: 0.5, marginBottom: 4 }
const sub: React.CSSProperties = { fontSize: 12, opacity: 0.85, marginBottom: 12 }
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }
const card: React.CSSProperties = { width: 62, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "6px 2px" }
const img: React.CSSProperties = { width: 46, height: 46, objectFit: "contain", imageRendering: "pixelated" }
const nm: React.CSSProperties = { fontSize: 9, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
const lv: React.CSSProperties = { fontSize: 9, opacity: 0.7 }
const btns: React.CSSProperties = { display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }
const cancelBtn: React.CSSProperties = {
    padding: "10px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#fff",
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 10, cursor: "pointer",
}
const fightBtn: React.CSSProperties = {
    padding: "10px 22px", fontFamily: "inherit", fontSize: 14, fontWeight: 800, color: "#1a1400",
    border: "none", borderRadius: 10, cursor: "pointer",
}
