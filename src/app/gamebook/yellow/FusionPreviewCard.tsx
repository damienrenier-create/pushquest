"use client"

// Carte d'aperçu RICHE d'un fusionné (visuel façon FUSIODEX) : sprite couleur (anneau teinté par le type),
// nom, chips de type colorées, niveau + BST, barres de stats visuelles, et liste des attaques. Réutilisée
// à l'Autel de la Chimère ET à l'Atelier de Fusion pour VOIR ce que donnera la fusion AVANT de la créer.

import { useState } from "react"
import type { FusionStats } from "@/lib/gamebook/yellow/data/fusionSpecies"
import { getMove } from "@/lib/gamebook/yellow/data/moves"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const typeColor = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"
const STAT_LABELS: [keyof FusionStats, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]

function Sprite({ src, ring, size = 62 }: { src?: string; ring: string; size?: number }) {
    const [err, setErr] = useState(false)
    return (
        <div style={{ width: size, height: size, borderRadius: 14, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", border: `2px solid ${ring}`, boxShadow: `0 0 0 2px ${ring}44, 0 0 12px ${ring}55` }}>
            {!src || err
                ? <span style={{ fontSize: size * 0.42, opacity: 0.8 }}>🧬</span>
                : <img src={src} alt="" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />}
        </div>
    )
}

export function FusionPreviewCard({ name, types, stats, moves, level, spriteSrc }: {
    name: string
    types: string[]
    stats: FusionStats
    moves: string[]
    level: number
    /** Sprite de la fusion OFFICIELLE (si la paire en est une) ; sinon placeholder 🧬. */
    spriteSrc?: string
}) {
    const bst = STAT_LABELS.reduce((s, [k]) => s + (stats[k] ?? 0), 0)
    const ring = types[0] ? typeColor(types[0]) : "#6a5a8a"
    const CAP = 180
    return (
        <div style={{ border: `1px solid ${ring}88`, borderRadius: 12, padding: "11px 12px", margin: "8px 0", background: "rgba(124,79,192,0.09)", display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                <Sprite src={spriteSrc} ring={ring} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.5, color: "#f6efff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
                        {types.map((t) => (
                            <span key={t} style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, color: "#161018", padding: "2px 9px", borderRadius: 999, background: typeColor(t), textShadow: "0 1px 0 rgba(255,255,255,0.25)" }}>{t}</span>
                        ))}
                    </div>
                    <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 5 }}>N.{level} · <b style={{ color: bst >= 500 ? "#f0c840" : "#d9b8ff" }}>BST {bst}</b></div>
                </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
                {STAT_LABELS.map(([k, lbl]) => {
                    const v = stats[k] ?? 0
                    const pct = Math.max(4, Math.min(100, (v / CAP) * 100))
                    const col = v >= 130 ? "#7ee0a0" : v >= 90 ? "#e6d36a" : "#c79cff"
                    return (
                        <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                            <span style={{ width: 24, opacity: 0.75, fontWeight: 700 }}>{lbl}</span>
                            <span style={{ width: 28, textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: 0.92 }}>{v}</span>
                            <span style={{ flex: 1, height: 6, background: "#120f1c", borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: col, borderRadius: 4 }} /></span>
                        </div>
                    )
                })}
            </div>
            {moves.length > 0 && (
                <div style={{ fontSize: 10.5, opacity: 0.9, lineHeight: 1.5, borderTop: "1px solid rgba(124,79,192,0.3)", paddingTop: 7 }}>
                    ⚔️ {moves.map((id) => getMove(id)?.name ?? id).join(" · ")}
                </div>
            )}
        </div>
    )
}
