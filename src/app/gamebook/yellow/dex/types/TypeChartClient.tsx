"use client"

// Nexus Jaune Éclair — table des types (15×15) + règles. Lecture pure du moteur
// (typeChart.ts) : la matrice reflète toujours les vraies données de combat.
// Style natif GBC (cohérent avec /dex).

import { useState } from "react"
import { useRouter } from "next/navigation"
import { POKE_TYPES, type PokeType } from "@/lib/gamebook/yellow/battle/types"
import { typeMultiplier, moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import { TYPE_COLORS, TYPE_ABBR } from "../dexShared"

// Présentation d'un multiplicateur de case.
function cellStyle(mult: number): { bg: string; txt: string; label: string } {
    if (mult === 2) return { bg: "#3aa860", txt: "#fff", label: "2" }
    if (mult === 0.5) return { bg: "#e0533a", txt: "#fff", label: "0.5" }
    if (mult === 0) return { bg: "#2a2a2a", txt: "#fff", label: "0" }
    return { bg: "transparent", txt: "#9a9a8a", label: "" } // ×1 : neutre, laissé vide
}

const PHYSICAL = POKE_TYPES.filter((t) => moveCategory(t) === "PHYSICAL")
const SPECIAL = POKE_TYPES.filter((t) => moveCategory(t) === "SPECIAL")

export default function TypeChartClient({ initialType = null }: { initialType?: PokeType | null }) {
    const router = useRouter()
    // Croix de survol : type attaquant (ligne) + type défenseur (colonne) sous le curseur.
    const [hovAtk, setHovAtk] = useState<PokeType | null>(null)
    const [hovDef, setHovDef] = useState<PokeType | null>(null)
    // Type « épinglé » (arrivée depuis un badge) : surligne sa ligne ET sa colonne.
    const [pinned, setPinned] = useState<PokeType | null>(initialType)

    return (
        <div style={S.root}>
            <div style={S.wrap}>
                <button onClick={() => router.push("/gamebook/yellow/dex")} style={S.back}>← Dex</button>
                <h1 style={S.title}>📊 TABLE DES TYPES</h1>
                <div style={S.sub}>Efficacité d&apos;une attaque (ligne) contre un Daemon défenseur (colonne).</div>

                {/* Légende */}
                <div style={S.legend}>
                    <span style={S.legItem}><span style={{ ...S.legSwatch, background: "#3aa860" }}>2</span> Super efficace</span>
                    <span style={S.legItem}><span style={{ ...S.legSwatch, background: "#e0533a", fontSize: 8 }}>0.5</span> Peu efficace</span>
                    <span style={S.legItem}><span style={{ ...S.legSwatch, background: "#2a2a2a" }}>0</span> Aucun effet</span>
                    <span style={S.legItem}><span style={{ ...S.legSwatch, background: "#46462e", color: "#9a9a8a" }}> </span> Normal (×1)</span>
                </div>

                {/* Matrice */}
                <div style={S.scroll} onMouseLeave={() => { setHovAtk(null); setHovDef(null) }}>
                    <table style={S.table}>
                        <thead>
                            <tr>
                                <th style={{ ...S.corner }}>
                                    <span style={S.cornerAtk}>ATQ ↓</span>
                                    <span style={S.cornerDef}>DÉF →</span>
                                </th>
                                {POKE_TYPES.map((d) => (
                                    <th
                                        key={d}
                                        style={{ ...S.colHead, background: TYPE_COLORS[d], ...(hovDef === d || pinned === d ? S.headOn : {}) }}
                                        title={d}
                                        onMouseEnter={() => { setHovDef(d); setHovAtk(null) }}
                                        onClick={() => setPinned(d)}
                                    >{TYPE_ABBR[d]}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {POKE_TYPES.map((atk) => (
                                <tr key={atk}>
                                    <th
                                        style={{ ...S.rowHead, background: TYPE_COLORS[atk], ...(hovAtk === atk || pinned === atk ? S.headOn : {}) }}
                                        title={atk}
                                        onMouseEnter={() => { setHovAtk(atk); setHovDef(null) }}
                                        onClick={() => setPinned(atk)}
                                    >{TYPE_ABBR[atk]}</th>
                                    {POKE_TYPES.map((def) => {
                                        const c = cellStyle(typeMultiplier(atk, def))
                                        const inRow = hovAtk === atk || pinned === atk
                                        const inCol = hovDef === def || pinned === def
                                        const cross = inRow || inCol
                                        const exact = (hovAtk === atk && hovDef === def) || (pinned === atk && pinned === def)
                                        return (
                                            <td
                                                key={def}
                                                onMouseEnter={() => { setHovAtk(atk); setHovDef(def) }}
                                                style={{
                                                    ...S.cell,
                                                    background: cross && c.bg === "transparent" ? "rgba(245,208,32,0.20)" : c.bg,
                                                    color: c.txt,
                                                    filter: cross ? "brightness(1.32)" : "none",
                                                    boxShadow: exact ? "inset 0 0 0 2px #fff" : "none",
                                                }}
                                            >{c.label}</td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Règles */}
                <div style={S.panel}>
                    <div style={S.panelTitle}>RÈGLES</div>
                    <ul style={S.rules}>
                        <li>Une attaque <b>super efficace</b> (×2) double les dégâts ; <b>peu efficace</b> (×½) les divise par deux ; <b>aucun effet</b> (×0) n&apos;inflige rien.</li>
                        <li>Daemon à <b>deux types</b> : les multiplicateurs se <b>cumulent</b> (ex. ×2 et ×2 = ×4 ; ×2 et ×½ = ×1).</li>
                        <li><b>STAB</b> : une attaque du même type que le Daemon qui la lance gagne un bonus de puissance.</li>
                        <li>Règle Gen 1 : la catégorie <b>Physique / Spécial</b> dépend du <b>type de l&apos;attaque</b>, pas de l&apos;attaque elle-même.</li>
                    </ul>

                    <div style={S.catRow}>
                        <div style={S.catCol}>
                            <div style={S.catTitle}>Types PHYSIQUES (utilisent ATQ/DÉF)</div>
                            <div style={S.catChips}>{PHYSICAL.map((t) => <span key={t} onClick={() => setPinned(t)} style={{ ...S.chip, background: TYPE_COLORS[t], cursor: "pointer" }}>{t}</span>)}</div>
                        </div>
                        <div style={S.catCol}>
                            <div style={S.catTitle}>Types SPÉCIAUX (utilisent SPÉ)</div>
                            <div style={S.catChips}>{SPECIAL.map((t) => <span key={t} onClick={() => setPinned(t)} style={{ ...S.chip, background: TYPE_COLORS[t], cursor: "pointer" }}>{t}</span>)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#1a1a1a", color: "#f8f8e8", fontFamily: "'Courier New', monospace", padding: 16 },
    wrap: { maxWidth: 760, margin: "0 auto" },
    back: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "5px 12px", color: "#c8c8c8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 12 },
    title: { fontSize: 18, fontWeight: 900, letterSpacing: 2, marginBottom: 4 },
    sub: { fontSize: 11, opacity: 0.7, marginBottom: 12 },

    legend: { display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12, fontSize: 10, opacity: 0.9 },
    legItem: { display: "flex", alignItems: "center", gap: 5 },
    legSwatch: { width: 18, height: 18, borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#fff", border: "1px solid #000" },

    scroll: { overflowX: "auto", border: "2px solid #000", borderRadius: 8, background: "#46462e", marginBottom: 14, WebkitOverflowScrolling: "touch" },
    table: { borderCollapse: "collapse", margin: 0, width: "100%" },
    corner: { width: 56, height: 48, background: "#1c1408", position: "relative", padding: 0 },
    cornerAtk: { position: "absolute", top: 4, left: 5, fontSize: 9, fontWeight: 700, color: "#c8c8b0" },
    cornerDef: { position: "absolute", bottom: 4, right: 5, fontSize: 9, fontWeight: 700, color: "#c8c8b0" },
    colHead: { fontSize: 11, fontWeight: 900, color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,0.5)", border: "1px solid #1c1408", padding: "6px 0" },
    rowHead: { fontSize: 11, fontWeight: 900, color: "#fff", textShadow: "0 1px 1px rgba(0,0,0,0.5)", border: "1px solid #1c1408", padding: "6px 8px", textAlign: "center" },
    cell: { height: 36, textAlign: "center", fontSize: 15, fontWeight: 900, border: "1px solid #2e2e1e", transition: "filter 0.08s" },
    headOn: { boxShadow: "inset 0 0 0 2px #fff", filter: "brightness(1.2)" },

    panel: { background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 10, padding: "12px 14px" },
    panelTitle: { fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 10, opacity: 0.8 },
    rules: { margin: 0, paddingLeft: 18, fontSize: 11, lineHeight: 1.6, display: "flex", flexDirection: "column", gap: 5 },
    catRow: { display: "flex", flexWrap: "wrap", gap: 12, marginTop: 14 },
    catCol: { flex: 1, minWidth: 200 },
    catTitle: { fontSize: 9, fontWeight: 700, opacity: 0.65, marginBottom: 5, letterSpacing: 0.3 },
    catChips: { display: "flex", flexWrap: "wrap", gap: 4 },
    chip: { fontSize: 8, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.3, textShadow: "0 1px 1px rgba(0,0,0,0.4)" },
    chipBig: { fontSize: 11, padding: "4px 10px", borderRadius: 5 },
}
