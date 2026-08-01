"use client"

// Vue PLEIN ÉCRAN de comparaison de fusion (style Fusiodex) : les 2 PARENTS côte à côte + le FUSIONNÉ, avec un
// tableau stat-par-stat qui met en évidence l'AMÉLIORATION (vert = la fusion ≥ les 2 parents, ambre = entre les
// deux, rouge = sous les deux). Sort du cadre Game Boy (overlay fixe plein viewport). Lecture seule, jetable.

import { useState } from "react"
import type { MonInstance, StatKey } from "@/lib/gamebook/yellow/battle/types"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { computeFusion } from "@/lib/gamebook/yellow/data/fusionSpecies"
import { fusionParentFromInstance } from "@/lib/gamebook/yellow/data/fusionMon"
import { officialFusionForParents } from "@/lib/gamebook/yellow/data/officialFusions"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"
const STAT_ROWS: [StatKey, string][] = [["hp", "PV"], ["atk", "Attaque"], ["def", "Défense"], ["spe", "Vitesse"], ["spc", "Spéciale"]]

function Sprite({ src, ring, size, label }: { src?: string; ring: string; size: number; label?: string }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ width: size, height: size, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", border: `2px solid ${ring}`, boxShadow: `0 0 14px ${ring}55`, position: "relative" }}>
            {!src || err ? <span style={{ fontSize: size * 0.4, opacity: 0.8 }}>{label ?? "🧬"}</span>
                : <img src={src} alt="" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

function TypeChips({ types, small }: { types: string[]; small?: boolean }) {
    return (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", marginTop: 3 }}>
            {types.map((t) => <span key={t} style={{ fontSize: small ? 8.5 : 10, fontWeight: 800, color: "#161018", padding: small ? "1px 6px" : "2px 9px", borderRadius: 999, background: tc(t) }}>{t}</span>)}
        </div>
    )
}

export function FusionCompareView({ a, b, onClose }: { a: MonInstance; b: MonInstance; onClose: () => void }) {
    const spA = getSpecies(a.speciesId), spB = getSpecies(b.speciesId)
    if (!spA || !spB) return null
    const statsA = fullStats(a, spA), statsB = fullStats(b, spB)
    const result = computeFusion(fusionParentFromInstance(a), fusionParentFromInstance(b))
    const fusSprite = officialFusionForParents(a.speciesId, b.speciesId)?.sprite
    const nameA = a.nickname || spA.name, nameB = b.nickname || spB.name
    const bstA = STAT_ROWS.reduce((s, [k]) => s + statsA[k], 0)
    const bstB = STAT_ROWS.reduce((s, [k]) => s + statsB[k], 0)
    const bstF = STAT_ROWS.reduce((s, [k]) => s + result.stats[k], 0)
    // Couleur d'une valeur de fusion vs les 2 parents : vert ≥ max, rouge ≤ min, ambre entre.
    const cmpColor = (v: number, pa: number, pb: number) => {
        const hi = Math.max(pa, pb), lo = Math.min(pa, pb)
        return v >= hi ? "#7ee0a0" : v <= lo ? "#e08a8a" : "#e6d36a"
    }

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <span style={S.title}>🧬 APERÇU DE FUSION</span>
                    <button style={S.close} onClick={onClose}>✕</button>
                </div>

                {/* PARENTS */}
                <div style={S.parentsRow}>
                    {[{ n: nameA, sp: spA, st: statsA, bst: bstA }, { n: nameB, sp: spB, st: statsB, bst: bstB }].map((p, i) => (
                        <div key={i} style={S.parentCard}>
                            <div style={S.parentHead}>{i === 0 ? "①" : "②"} {p.n.toUpperCase()}</div>
                            <Sprite src={p.sp.sprite} ring={tc(p.sp.types[0])} size={64} />
                            <TypeChips types={p.sp.types} small />
                            <div style={S.parentBst}>BST {p.bst}</div>
                        </div>
                    ))}
                </div>

                <div style={S.arrow}>⬇ FUSION ⬇</div>

                {/* FUSIONNÉ */}
                <div style={S.fusionCard}>
                    <Sprite src={fusSprite} ring={tc(result.types[0])} size={84} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.fusionName}>{result.name}</div>
                        <TypeChips types={result.types} />
                        <div style={{ ...S.fusionBst, color: bstF >= Math.max(bstA, bstB) ? "#7ee0a0" : "#d9b8ff" }}>N.{result.level} · BST {bstF} {bstF > Math.max(bstA, bstB) ? `(+${bstF - Math.max(bstA, bstB)})` : ""}</div>
                    </div>
                </div>

                {/* TABLEAU COMPARATIF */}
                <table style={S.table}>
                    <thead>
                        <tr><th style={S.thStat}>Stat</th><th style={S.thP}>① {shortName(nameA)}</th><th style={S.thP}>② {shortName(nameB)}</th><th style={S.thF}>Fusion</th></tr>
                    </thead>
                    <tbody>
                        {STAT_ROWS.map(([k, lbl]) => {
                            const v = result.stats[k], pa = statsA[k], pb = statsB[k]
                            return (
                                <tr key={k}>
                                    <td style={S.tdStat}>{lbl}</td>
                                    <td style={S.tdP}>{pa}</td>
                                    <td style={S.tdP}>{pb}</td>
                                    <td style={{ ...S.tdF, color: cmpColor(v, pa, pb), fontWeight: 800 }}>{v}</td>
                                </tr>
                            )
                        })}
                        <tr style={S.bstRow}>
                            <td style={S.tdStat}>BST</td><td style={S.tdP}>{bstA}</td><td style={S.tdP}>{bstB}</td>
                            <td style={{ ...S.tdF, color: bstF >= Math.max(bstA, bstB) ? "#7ee0a0" : "#e6d36a", fontWeight: 900 }}>{bstF}</td>
                        </tr>
                    </tbody>
                </table>

                <div style={S.moves}>⚔️ {result.moves.map((id) => getMove(id)?.name ?? id).join(" · ")}</div>
                <div style={S.legend}><span style={{ color: "#7ee0a0" }}>■</span> mieux que les 2 &nbsp; <span style={{ color: "#e6d36a" }}>■</span> entre &nbsp; <span style={{ color: "#e08a8a" }}>■</span> sous les 2</div>
                <button style={S.doneBtn} onClick={onClose}>← Retour</button>
            </div>
        </div>
    )
}

function shortName(n: string) { return n.length > 8 ? n.slice(0, 7) + "…" : n }

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "14px 10px", fontFamily: "'Courier New', monospace" },
    sheet: { width: "100%", maxWidth: 460, background: "radial-gradient(700px 340px at 50% -6%, #2a1c50 0%, #170f28 55%, #0f0b18 100%)", border: "2px solid #6a5a8a", borderRadius: 16, padding: "14px 14px 18px", color: "#f3ecff", boxShadow: "0 12px 44px rgba(0,0,0,0.5)" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    title: { fontSize: 15, fontWeight: 900, letterSpacing: 2, color: "#e6d2ff", textShadow: "0 0 12px #9a5aff66" },
    close: { background: "rgba(30,22,48,0.7)", border: "1px solid #6a5a8a", borderRadius: 8, color: "#c9b8e8", fontSize: 14, cursor: "pointer", padding: "2px 10px" },
    parentsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    parentCard: { display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "rgba(36,29,56,0.7)", border: "1px solid #4a3a6a", borderRadius: 12, padding: "10px 8px" },
    parentHead: { fontSize: 11.5, fontWeight: 800, color: "#f6efff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" },
    parentBst: { fontSize: 10.5, opacity: 0.85, marginTop: 1 },
    arrow: { textAlign: "center", fontSize: 12, fontWeight: 800, letterSpacing: 3, color: "#b98aff", margin: "10px 0" },
    fusionCard: { display: "flex", gap: 12, alignItems: "center", background: "rgba(124,79,192,0.12)", border: "1px solid #8a5ae0", borderRadius: 12, padding: "10px 12px" },
    fusionName: { fontSize: 17, fontWeight: 900, letterSpacing: 0.5, color: "#fff" },
    fusionBst: { fontSize: 12, fontWeight: 700, marginTop: 4 },
    table: { width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 12.5, fontVariantNumeric: "tabular-nums" },
    thStat: { textAlign: "left", padding: "5px 6px", fontSize: 10, opacity: 0.7, borderBottom: "1px solid #3a2e56" },
    thP: { textAlign: "center", padding: "5px 4px", fontSize: 10, opacity: 0.7, borderBottom: "1px solid #3a2e56", width: 70 },
    thF: { textAlign: "center", padding: "5px 4px", fontSize: 10, color: "#d9b8ff", borderBottom: "1px solid #3a2e56", width: 70 },
    tdStat: { textAlign: "left", padding: "5px 6px", fontWeight: 700, opacity: 0.9 },
    tdP: { textAlign: "center", padding: "5px 4px", opacity: 0.8 },
    tdF: { textAlign: "center", padding: "5px 4px" },
    bstRow: { borderTop: "2px solid #3a2e56" },
    moves: { fontSize: 11, opacity: 0.9, lineHeight: 1.5, marginTop: 12, background: "rgba(36,29,56,0.5)", borderRadius: 8, padding: "8px 10px" },
    legend: { fontSize: 9.5, opacity: 0.7, marginTop: 8, textAlign: "center" },
    doneBtn: { width: "100%", marginTop: 12, background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", border: "1px solid #c79cff", borderRadius: 10, color: "#fff", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 800, padding: "9px", cursor: "pointer" },
}
