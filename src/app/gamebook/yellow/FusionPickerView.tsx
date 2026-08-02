"use client"

// Sélecteur de Daemon PLEIN ÉCRAN pour l'Atelier de Fusion (slot Ⓐ ou Ⓑ). Remplace la petite liste déroulante :
// grille de cartes (sprite + type + niveau + BST + 5 stats), RECHERCHE par nom, FILTRE par type, TRI par
// niveau/BST/chaque stat (asc/desc). Les Daemons déjà engagés dans une fusion (ou choisis pour l'autre slot) sont
// grisés et non cliquables. Lecture seule sur les stats LIVE (fullStats) — pur affichage, aucune mutation d'état.

import { useState, useMemo } from "react"
import type { MonInstance, StatKey } from "@/lib/gamebook/yellow/battle/types"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { displayName } from "@/lib/gamebook/yellow/battle/engine"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}
const tc = (t: string) => TYPE_COLOR[t] ?? "#8a7fb0"
const STAT_COLS: [StatKey, string][] = [["hp", "PV"], ["atk", "Atq"], ["def", "Déf"], ["spe", "Vit"], ["spc", "Spé"]]
type SortKey = "bst" | "level" | "name" | StatKey
const SORTS: { key: SortKey; label: string }[] = [
    { key: "bst", label: "BST" }, { key: "level", label: "Niv" },
    { key: "hp", label: "PV" }, { key: "atk", label: "Atq" }, { key: "def", label: "Déf" }, { key: "spe", label: "Vit" }, { key: "spc", label: "Spé" },
    { key: "name", label: "A-Z" },
]

interface Row { m: MonInstance; name: string; types: string[]; sprite?: string; st: Record<StatKey, number> | null; bst: number; disabled: boolean }

export function FusionPickerView({ slot, daemons, disabledUids, onPick, onClose }: {
    slot: "a" | "b"
    daemons: MonInstance[]
    disabledUids: Set<string>
    onPick: (uid: string) => void
    onClose: () => void
}) {
    const [q, setQ] = useState("")
    const [typeFilter, setTypeFilter] = useState<string | null>(null)
    const [sortKey, setSortKey] = useState<SortKey>("bst")
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

    const rows: Row[] = useMemo(() => daemons.map((m) => {
        const sp = getSpecies(m.speciesId)
        const st = sp ? fullStats(m, sp) : null
        const bst = st ? STAT_COLS.reduce((s, [k]) => s + (st[k] ?? 0), 0) : 0
        return { m, name: displayName(m), types: sp?.types ?? [], sprite: sp?.sprite, st, bst, disabled: disabledUids.has(m.uid) }
    }), [daemons, disabledUids])

    const allTypes = useMemo(() => [...new Set(rows.flatMap((r) => r.types))].sort(), [rows])

    const shown = useMemo(() => {
        const term = q.trim().toLowerCase()
        const arr = rows.filter((r) =>
            (!term || r.name.toLowerCase().includes(term) || r.m.speciesId.includes(term)) &&
            (!typeFilter || r.types.includes(typeFilter)))
        const cmp = (a: Row, b: Row) => {
            let d = 0
            if (sortKey === "name") d = a.name.localeCompare(b.name, "fr")
            else if (sortKey === "level") d = a.m.level - b.m.level
            else if (sortKey === "bst") d = a.bst - b.bst
            else d = (a.st?.[sortKey] ?? 0) - (b.st?.[sortKey] ?? 0)
            return sortDir === "desc" ? -d : d
        }
        // Disponibles d'abord, puis tri choisi.
        return [...arr].sort((a, b) => (Number(a.disabled) - Number(b.disabled)) || cmp(a, b))
    }, [rows, q, typeFilter, sortKey, sortDir])

    const setSort = (k: SortKey) => {
        if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        else { setSortKey(k); setSortDir(k === "name" ? "asc" : "desc") }
    }

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                <div style={S.header}>
                    <span style={S.title}>{slot === "a" ? "Ⓐ" : "Ⓑ"} Choisir un Daemon <span style={S.count}>{shown.length}/{rows.length}</span></span>
                    <button style={S.close} onClick={onClose}>✕</button>
                </div>

                <input style={S.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Rechercher un nom…" />

                <div style={S.chips}>
                    <button style={{ ...S.chip, ...(typeFilter === null ? S.chipOn : {}) }} onClick={() => setTypeFilter(null)}>Tous</button>
                    {allTypes.map((t) => (
                        <button key={t} style={{ ...S.chip, background: typeFilter === t ? tc(t) : "#241d3c", color: typeFilter === t ? "#161018" : "#c9b8e8", borderColor: tc(t) }} onClick={() => setTypeFilter(typeFilter === t ? null : t)}>{t}</button>
                    ))}
                </div>

                <div style={S.sortBar}>
                    <span style={S.sortLbl}>Trier</span>
                    {SORTS.map((s) => (
                        <button key={s.key} style={{ ...S.sortBtn, ...(sortKey === s.key ? S.sortBtnOn : {}) }} onClick={() => setSort(s.key)}>
                            {s.label}{sortKey === s.key ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                        </button>
                    ))}
                </div>

                <div style={S.grid}>
                    {shown.map((r) => (
                        <button key={r.m.uid} disabled={r.disabled} onClick={() => !r.disabled && onPick(r.m.uid)}
                            style={{ ...S.card, borderColor: r.types[0] ? tc(r.types[0]) : "#4a3a6a", opacity: r.disabled ? 0.4 : 1, cursor: r.disabled ? "not-allowed" : "pointer" }}>
                            <div style={S.cardTop}>
                                <div style={{ ...S.spriteBox, borderColor: r.types[0] ? tc(r.types[0]) : "#4a3a6a" }}>
                                    {r.sprite ? <img src={r.sprite} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} /> : <span style={{ opacity: 0.6 }}>❔</span>}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={S.name}>{r.name}</div>
                                    <div style={S.chipRow}>{r.types.map((t) => <span key={t} style={{ ...S.tChip, background: tc(t) }}>{t}</span>)}</div>
                                    <div style={S.meta}>N.{r.m.level} · <b style={{ color: r.bst >= 450 ? "#f0c840" : "#d9b8ff" }}>BST {r.bst}</b>{r.disabled ? " · déjà en fusion" : ""}</div>
                                </div>
                            </div>
                            {r.st && (
                                <div style={S.statRow}>
                                    {STAT_COLS.map(([k, lbl]) => (
                                        <span key={k} style={S.stat}><span style={S.statLbl}>{lbl}</span> {r.st![k]}</span>
                                    ))}
                                </div>
                            )}
                        </button>
                    ))}
                    {shown.length === 0 && <div style={S.empty}>Aucun Daemon ne correspond.</div>}
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.94)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "12px 8px", fontFamily: "'Courier New', monospace" },
    sheet: { width: "100%", maxWidth: 620, background: "radial-gradient(700px 340px at 50% -6%, #2a1c50 0%, #170f28 55%, #0f0b18 100%)", border: "2px solid #6a5a8a", borderRadius: 14, padding: "12px 12px 16px", color: "#f3ecff" },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 },
    title: { fontSize: 15, fontWeight: 900, letterSpacing: 1, color: "#e6d2ff" },
    count: { fontSize: 11, opacity: 0.6, marginLeft: 6, fontWeight: 600 },
    close: { background: "rgba(30,22,48,0.7)", border: "1px solid #6a5a8a", borderRadius: 8, color: "#c9b8e8", fontSize: 14, cursor: "pointer", padding: "2px 10px" },
    search: { width: "100%", boxSizing: "border-box", background: "#241d3c", border: "1px solid #4a3a6a", color: "#f3ecff", borderRadius: 8, padding: "8px 11px", fontSize: 13, fontFamily: "'Courier New', monospace", marginBottom: 8 },
    chips: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 },
    chip: { fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999, border: "1px solid #4a3a6a", background: "#241d3c", color: "#c9b8e8", cursor: "pointer" },
    chipOn: { background: "#8a5ae0", color: "#fff", borderColor: "#c79cff" },
    sortBar: { display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", background: "rgba(32,26,48,0.6)", border: "1px solid #3a2e56", borderRadius: 10, padding: "6px 8px", marginBottom: 10 },
    sortLbl: { fontSize: 9.5, fontWeight: 800, letterSpacing: 1, opacity: 0.6, marginRight: 2, textTransform: "uppercase" },
    sortBtn: { background: "rgba(36,29,56,0.9)", border: "1px solid #4a3a6a", borderRadius: 999, padding: "3px 9px", color: "#b8a8d8", fontFamily: "'Courier New', monospace", fontSize: 10.5, fontWeight: 700, cursor: "pointer" },
    sortBtnOn: { background: "linear-gradient(180deg,#8a5ae0,#6a3ac8)", borderColor: "#c79cff", color: "#fff" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 },
    card: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left", background: "rgba(36,29,56,0.72)", border: "1px solid #4a3a6a", borderLeftWidth: 4, borderRadius: 10, padding: "8px 10px", color: "#f3ecff", fontFamily: "'Courier New', monospace" },
    cardTop: { display: "flex", gap: 9, alignItems: "center" },
    spriteBox: { width: 52, height: 52, flexShrink: 0, borderRadius: 10, border: "2px solid #6a5a8a", background: "radial-gradient(circle at 50% 40%, #1a1430, #0d0a16)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
    name: { fontSize: 13, fontWeight: 900, letterSpacing: 0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
    chipRow: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 },
    tChip: { fontSize: 8.5, fontWeight: 800, color: "#161018", padding: "1px 6px", borderRadius: 999 },
    meta: { fontSize: 10.5, opacity: 0.9, marginTop: 4 },
    statRow: { display: "flex", justifyContent: "space-between", gap: 3, borderTop: "1px solid rgba(124,79,192,0.3)", paddingTop: 5, fontSize: 9.5, fontVariantNumeric: "tabular-nums" },
    stat: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
    statLbl: { opacity: 0.6, fontSize: 8 },
    empty: { gridColumn: "1 / -1", textAlign: "center", opacity: 0.6, padding: "20px 0", fontSize: 12 },
}
