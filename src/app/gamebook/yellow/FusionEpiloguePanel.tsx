"use client"

// ÉPILOGUE « Maître de la Chimère » — écran de fin (épique) après le sacre sur la Ligue de Fusion. 3 actes :
//   I. Revue des 6 dresseurs + le meilleur contre de chacun · II. Ton équipe légendaire (roster vainqueur) ·
//   III. Ce qu'il te reste à accomplir (checklist dynamique). Lecture seule ; le contenu vient de data/fusionEpilogue.

import { EPILOGUE_TRAINERS, type EpilogueQuest } from "@/lib/gamebook/yellow/data/fusionEpilogue"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"

export interface EpilogueRosterMon { name: string; sprite: string; types: string[]; level: number; bst: number }

export default function FusionEpiloguePanel({ tierLabel, roster, quests, onClose }: {
    tierLabel: string; roster: EpilogueRosterMon[]; quests: EpilogueQuest[]; onClose: () => void
}) {
    const star = roster.length ? roster.reduce((b, m) => (m.bst > b.bst ? m : b), roster[0]) : null // le + puissant
    const doneCount = quests.filter((q) => q.done).length

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={S.crown}>🍝👑</div>
                <div style={S.title}>MAÎTRE DE LA CHIMÈRE</div>
                <div style={S.sub}>Ligue de Fusion — palier {tierLabel} vaincu</div>

                <div style={S.act}>⚔️ ACTE I — La Ligue en revue</div>
                <div style={S.rows}>
                    {EPILOGUE_TRAINERS.map((t) => (
                        <div key={t.name} style={S.trRow}>
                            <span style={S.trIcon}>{t.icon}</span>
                            <span style={S.trName}>{t.name}<span style={S.trTheme}> · {t.theme}</span></span>
                            <span style={S.trCounter}>▶ {t.counter}</span>
                        </div>
                    ))}
                </div>

                <div style={S.act}>🧬 ACTE II — Ton équipe légendaire</div>
                <div style={S.grid}>
                    {roster.map((m, i) => {
                        const ring = m.types[0] ? tc(m.types[0]) : "#6a5a8a"
                        return (
                            <div key={`${m.name}-${i}`} style={{ ...S.card, borderColor: ring }}>
                                {star && m === star && <span style={S.starBadge} title="Le plus puissant">⭐</span>}
                                <div style={S.frame}>
                                    {m.sprite ? <img src={m.sprite} alt={m.name} style={S.spr} /> : <div style={S.ph}>?</div>}
                                </div>
                                <div style={S.cname}>{m.name}</div>
                                <div style={S.chips}>{m.types.map((t) => <span key={t} style={{ ...S.chip, background: tc(t) }}>{t}</span>)}</div>
                                <div style={S.lvl}>Niv {m.level}</div>
                            </div>
                        )
                    })}
                </div>

                <div style={S.act}>🗺️ ACTE III — Ce qui t'attend encore <span style={S.progress}>({doneCount}/{quests.length})</span></div>
                <div style={S.rows}>
                    {quests.map((q) => (
                        <div key={q.label} style={{ ...S.quest, opacity: q.done ? 0.55 : 1 }}>
                            <span style={S.qMark}>{q.done ? "✅" : q.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ ...S.qLabel, textDecoration: q.done ? "line-through" : "none" }}>{q.label}</div>
                                {!q.done && <div style={S.qHint}>{q.hint}</div>}
                            </div>
                        </div>
                    ))}
                </div>

                <button style={S.done} onClick={onClose}>Le Nexus est à toi. Continue ta légende ! ✦</button>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9600, background: "rgba(6,4,12,0.94)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "14px 10px", fontFamily: "'Courier New', monospace" },
    sheet: { width: "100%", maxWidth: 480, background: "radial-gradient(760px 380px at 50% -8%, #3a2c10 0%, #211734 45%, #120c1e 100%)", border: "2px solid #ffd54a", borderRadius: 16, padding: "16px 16px 20px", color: "#f6efff", boxShadow: "0 0 40px rgba(255,213,74,0.28)" },
    crown: { textAlign: "center", fontSize: 40, lineHeight: 1, filter: "drop-shadow(0 0 12px #ffd54a88)" },
    title: { textAlign: "center", fontSize: 24, fontWeight: 900, letterSpacing: 2, color: "#ffe36b", textShadow: "0 0 16px #ffb02066", marginTop: 4 },
    sub: { textAlign: "center", fontSize: 11.5, opacity: 0.8, marginTop: 2, marginBottom: 6 },
    act: { fontSize: 12.5, fontWeight: 800, letterSpacing: 1, color: "#ffd54a", borderBottom: "1px solid #4a3c68", paddingBottom: 5, marginTop: 18, marginBottom: 8 },
    progress: { fontSize: 11, opacity: 0.7, fontWeight: 700 },
    rows: { display: "flex", flexDirection: "column", gap: 5 },
    trRow: { display: "flex", alignItems: "baseline", gap: 6, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 9px", flexWrap: "wrap" },
    trIcon: { fontSize: 15 },
    trName: { fontSize: 12.5, fontWeight: 800, minWidth: 120 },
    trTheme: { fontSize: 10.5, opacity: 0.6, fontWeight: 600 },
    trCounter: { fontSize: 11, color: "#9be7a0", flex: 1 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 9 },
    card: { position: "relative", background: "radial-gradient(110px 80px at 50% 20%, #251b46, #14112a)", border: "1px solid", borderRadius: 11, padding: "8px 5px 7px", textAlign: "center" },
    starBadge: { position: "absolute", top: 4, right: 6, fontSize: 13 },
    frame: { height: 62, display: "flex", alignItems: "center", justifyContent: "center" },
    spr: { maxWidth: 66, maxHeight: 62, imageRendering: "pixelated", filter: "drop-shadow(0 2px 3px #0008)" },
    ph: { fontSize: 28, opacity: 0.4, fontWeight: 900 },
    cname: { fontSize: 11, fontWeight: 800, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    chips: { display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap", margin: "3px 0 1px" },
    chip: { fontSize: 7.5, fontWeight: 800, color: "#161018", padding: "1px 5px", borderRadius: 999 },
    lvl: { fontSize: 10, opacity: 0.7 },
    quest: { display: "flex", alignItems: "flex-start", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "7px 9px" },
    qMark: { fontSize: 15, width: 20, textAlign: "center" },
    qLabel: { fontSize: 12, fontWeight: 700 },
    qHint: { fontSize: 10, opacity: 0.65, lineHeight: 1.4, marginTop: 2 },
    done: { width: "100%", marginTop: 16, padding: "11px", background: "linear-gradient(180deg,#ffd54a,#f0a830)", border: "none", borderRadius: 10, color: "#2a1c02", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 900, cursor: "pointer", letterSpacing: 0.3 },
}
