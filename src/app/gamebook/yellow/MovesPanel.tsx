"use client"

// Nexus Jaune Éclair — POKÉDEX DES ATTAQUES (glossaire des capacités).
// Liste TOUTES les attaques avec un résumé d'effet CLAIR, DÉRIVÉ des données
// structurées (move.effect / power / accuracy / priority) — pas seulement la
// description en texte libre. Ainsi deux moves proches (ex. Mur de Fer = Déf +1
// vs Carapace Diamant = Déf +2) se distinguent au premier coup d'œil.
// Lecture seule, zéro logique de combat. Ouvert depuis le menu PAUSE.

import { useMemo, useState } from "react"
import { MOVES } from "@/lib/gamebook/yellow/data/moves"
import { CTS } from "@/lib/gamebook/yellow/data/cts"
import { moveCategory } from "@/lib/gamebook/yellow/battle/typeChart"
import type { MoveData, PokeType, StageKey, MajorStatus, VolatileStatus } from "@/lib/gamebook/yellow/battle/types"

const CREAM = "#f4ecd4", INK = "#2a1c10", DARK = "#cdbb86"

// Nom FR lisible des types + couleur de la pastille.
const TYPE_FR: Record<PokeType, string> = {
    NORMAL: "Normal", FEU: "Feu", EAU: "Eau", PLANTE: "Plante", ELEC: "Élec", GLACE: "Glace",
    COMBAT: "Combat", POISON: "Poison", SOL: "Sol", VOL: "Vol", PSY: "Psy", INSECTE: "Insecte",
    ROCHE: "Roche", SPECTRE: "Spectre", DRAGON: "Dragon", FEE: "Fée", METAL: "Métal",
}
const TYPE_COLOR: Record<PokeType, string> = {
    NORMAL: "#9a9a82", FEU: "#e8623a", EAU: "#3a8ee0", PLANTE: "#4caf50", ELEC: "#f5c518", GLACE: "#5fc7d8",
    COMBAT: "#c0392b", POISON: "#9b59b6", SOL: "#caa15a", VOL: "#8eb4e8", PSY: "#e84a8a", INSECTE: "#9abb2a",
    ROCHE: "#b8a060", SPECTRE: "#6a5acd", DRAGON: "#7b5cd6", FEE: "#d85ab8", METAL: "#8a97a8",
}
const STAT_FR: Record<StageKey, string> = { atk: "Attaque", def: "Défense", spe: "Vitesse", spc: "Spécial", acc: "Précision", eva: "Esquive" }
const STATUS_FR: Record<MajorStatus, string> = { NONE: "", BURN: "Brûlure", POISON: "Poison", TOXIC: "Poison grave", PARALYSIS: "Paralysie", SLEEP: "Sommeil", FREEZE: "Gel" }
const VOL_FR: Record<VolatileStatus, string> = { CONFUSION: "Confusion", SEEDED: "Vampigraine (draine chaque tour)", FLINCH: "Peur", TRAPPED: "Piégé", RECHARGE: "Doit récupérer" }

// moveId → libellé de CT (ex. "CT02"), pour l'affichage + le tri par n° de CT.
const CT_BY_MOVE: Record<string, { label: string; num: number }> = {}
CTS.forEach((c, i) => { CT_BY_MOVE[c.moveId] = { label: c.label, num: i } })

/** Catégorie lisible : Statut (power 0) sinon Physique/Spécial (déduit du type, Gen 1). */
function category(m: MoveData): "Statut" | "Physique" | "Spécial" | "Adaptatif" {
    if (m.power <= 0) return "Statut"
    if (m.effect?.adaptiveStab) return "Adaptatif" // type/catégorie dépendent du Daemon → pas de valeur fixe ici
    return moveCategory(m.type) === "PHYSICAL" ? "Physique" : "Spécial"
}

/** Résumé d'effet CLAIR, construit depuis les données structurées (la source de vérité). */
function effectBits(m: MoveData): string[] {
    const bits: string[] = []
    if (m.priority && m.priority > 0) bits.push("Frappe en priorité")
    const fx = m.effect
    if (!fx) return bits
    const ch = fx.chance != null && fx.chance < 100 ? ` (${fx.chance}%)` : ""
    if (fx.adaptiveStab) bits.push("Type & catégorie s'adaptent au Daemon porteur (sa meilleure stat) → STAB toujours garanti")
    if (fx.twoTurn) bits.push("Décharge en 2 tours (charge puis libère)")
    if (fx.multiHit) bits.push(`Frappe ${fx.multiHit[0]}–${fx.multiHit[1]} fois`)
    if (fx.statChanges) {
        for (const sc of fx.statChanges) {
            const who = sc.target === "self" ? "soi" : "cible"
            const sign = sc.stages > 0 ? `+${sc.stages}` : `${sc.stages}`
            bits.push(`${STAT_FR[sc.stat]} ${sign} (${who})${ch}`)
        }
    }
    if (fx.inflictStatus) bits.push(`Inflige : ${STATUS_FR[fx.inflictStatus]}${ch}`)
    if (fx.inflictVolatile) bits.push(`${VOL_FR[fx.inflictVolatile]}${ch}`)
    if (fx.flinch) bits.push(`Peut apeurer${ch}`)
    if (fx.drainPct) bits.push(`Draine ${fx.drainPct}% des dégâts en PV`)
    if (fx.recoilPct) bits.push(`Recul : ${fx.recoilPct}% des dégâts subis`)
    if (fx.healPct) bits.push(`Soigne ${fx.healPct}% des PV max`)
    if (fx.highCrit) bits.push("Taux de coup critique élevé")
    return bits
}

type SortKey = "az" | "type" | "ct"
const SORTS: { key: SortKey; label: string }[] = [
    { key: "az", label: "A→Z" },
    { key: "type", label: "Par type" },
    { key: "ct", label: "Par CT" },
]

export default function MovesPanel({ close }: { close: () => void }) {
    const [sort, setSort] = useState<SortKey>("az")
    const [query, setQuery] = useState("")

    const list = useMemo(() => {
        const all = Object.values(MOVES)
        const q = query.trim().toLowerCase()
        const filtered = q ? all.filter((m) => m.name.toLowerCase().includes(q) || TYPE_FR[m.type].toLowerCase().includes(q)) : all
        const byName = (a: MoveData, b: MoveData) => a.name.localeCompare(b.name, "fr")
        if (sort === "az") return [...filtered].sort(byName)
        if (sort === "type") return [...filtered].sort((a, b) => a.type === b.type ? byName(a, b) : TYPE_FR[a.type].localeCompare(TYPE_FR[b.type], "fr"))
        // "ct" : les attaques associées à une CT d'abord (par n° de CT), puis le reste (A→Z).
        return [...filtered].sort((a, b) => {
            const ca = CT_BY_MOVE[a.id], cb = CT_BY_MOVE[b.id]
            if (ca && cb) return ca.num - cb.num
            if (ca) return -1
            if (cb) return 1
            return byName(a, b)
        })
    }, [sort, query])

    return (
        <div onClick={close} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>⚔️ POKÉDEX DES ATTAQUES <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 600 }}>{Object.keys(MOVES).length} capacités</span></div>

                <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderBottom: `2px solid ${DARK}`, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="🔍 Rechercher…"
                        style={search}
                    />
                    {SORTS.map((s) => (
                        <button key={s.key} onClick={() => setSort(s.key)} style={{ ...chip, ...(sort === s.key ? chipOn : {}) }}>{s.label}</button>
                    ))}
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
                    {list.length === 0 && <div style={muted}>Aucune attaque ne correspond.</div>}
                    {list.map((m) => {
                        const bits = effectBits(m)
                        const ct = CT_BY_MOVE[m.id]
                        return (
                            <div key={m.id} style={card}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{m.name}</span>
                                    <span style={{ ...typeChip, background: TYPE_COLOR[m.type] }}>{TYPE_FR[m.type]}</span>
                                    <span style={catChip}>{category(m)}</span>
                                    {ct && <span style={ctChip}>{ct.label}</span>}
                                </div>
                                <div style={{ fontSize: 11, color: INK, opacity: 0.85, marginTop: 3 }}>
                                    {m.power > 0 ? <>💥 Puiss. <b>{m.power}</b> · </> : null}
                                    🎯 {m.accuracy === 0 ? "ne rate jamais" : `${m.accuracy}%`} · PP {m.pp}
                                </div>
                                {bits.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                                        {bits.map((b, i) => <span key={i} style={effChip}>{b}</span>)}
                                    </div>
                                )}
                                {m.description && <div style={{ fontSize: 11, color: INK, opacity: 0.7, fontStyle: "italic", marginTop: 5 }}>{m.description}</div>}
                            </div>
                        )
                    })}
                </div>

                <button onClick={close} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, height: "82%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14, display: "flex", justifyContent: "space-between", alignItems: "baseline" }
const muted: React.CSSProperties = { fontSize: 12, color: INK, opacity: 0.6, textAlign: "center", padding: 20 }
const card: React.CSSProperties = { background: "#fff8e8", border: `2px solid ${DARK}`, borderRadius: 8, padding: "7px 9px", marginBottom: 8 }
const chip: React.CSSProperties = { background: "#fff", border: `2px solid ${DARK}`, borderRadius: 14, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: INK, cursor: "pointer", fontFamily: "inherit" }
const chipOn: React.CSSProperties = { background: INK, color: CREAM, border: `2px solid ${INK}` }
const search: React.CSSProperties = { flex: 1, minWidth: 120, background: "#fff", border: `2px solid ${DARK}`, borderRadius: 14, padding: "5px 10px", fontSize: 12, color: INK, fontFamily: "inherit", outline: "none" }
const typeChip: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#fff", padding: "2px 7px", borderRadius: 10, letterSpacing: 0.4, textShadow: "0 1px 1px rgba(0,0,0,0.35)" }
const catChip: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: INK, background: "#e8dcb8", border: `1px solid ${DARK}`, padding: "2px 6px", borderRadius: 10 }
const ctChip: React.CSSProperties = { fontSize: 9, fontWeight: 800, color: "#1b5fa6", background: "#dcebfb", border: "1px solid #9cc4ec", padding: "2px 6px", borderRadius: 10 }
const effChip: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: INK, background: "#efe6c8", border: `1px solid ${DARK}`, padding: "2px 7px", borderRadius: 8 }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
