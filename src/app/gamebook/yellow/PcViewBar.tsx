"use client"
// src/app/gamebook/yellow/PcViewBar.tsx
//
// PC — barre de VUES et de BOÎTES (projet de Zyran, 28/10/2026 : « créer des sous-boîtes pour classer nos Daemons par type
// ou, mieux, par EV ; j'ai du mal à retrouver mes Daemons Parfaits »). Purement présentationnel : l'état vit dans
// YellowDevClient, les règles dans data/pcView (filtres, compteurs) et data/pcBoxes (boîtes).

import type { CSSProperties } from "react"
import type { StatKey } from "@/lib/gamebook/yellow/battle/types"
import { PC_BOX_NAME_MAX, type PcBoxes } from "@/lib/gamebook/yellow/data/pcBoxes"
import { PC_STATS, type PcBoxSel, type PcFacets, type PcFilter } from "@/lib/gamebook/yellow/data/pcView"
import { TYPE_COLORS, STAT_LABEL } from "./dex/dexShared"

const INK = "#1c1408"
const CREAM = "#f8f8e8"

export type PcGroup = "type" | "ev" | null
/** Saisie d'un nom de boîte : nouvelle boîte (avec les Daemons à y ranger, éventuellement aucun) ou renommage. */
export type PcBoxEdit = { mode: "new"; uids: string[] } | { mode: "rename"; id: string } | null

const chip = (active: boolean, border?: string): CSSProperties => ({
    background: active ? INK : "transparent", color: active ? CREAM : INK, border: `${border ? 2 : 1}px solid ${border ?? INK}`,
    borderRadius: 7, padding: "3px 7px", cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: "inherit", lineHeight: 1.2,
    touchAction: "manipulation",
})
const row: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center", fontSize: 11 }
// 16px : en dessous, iOS zoome sur le champ au focus.
const inputStyle: CSSProperties = { flex: 1, minWidth: 0, fontFamily: "inherit", fontSize: 16, padding: "5px 8px", border: `2px solid ${INK}`, borderRadius: 6, background: "#fffef8", color: INK }
const smallBtn: CSSProperties = { background: "#fff", border: `2px solid ${INK}`, borderRadius: 5, padding: "2px 8px", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", color: INK }
// 16px aussi : iOS zoome de même sur une liste déroulante plus petite.
const selectStyle: CSSProperties = { flex: 1, minWidth: 0, fontSize: 16, padding: "2px 4px", borderRadius: 4, border: "1px solid #cdbb86", background: "#fffef8", color: INK, fontFamily: "inherit" }

/** Libellé du filtre actif (null = aucun). */
export function pcFilterLabel(f: PcFilter): string | null {
    switch (f.kind) {
        case "all": return null
        case "parfait": return "★ Parfaits"
        case "shiny": return "✨ Shiny"
        case "type": return f.type
        case "ev": return `EV ${STAT_LABEL[f.stat]}`
        case "evNone": return "Sans EV"
        case "evFull": return "🔒 Plafond"
        case "evCandy": return "🍬 Bonbon"
    }
}

/** Nom de la vue de boîte : « Tous », « Non rangés » ou le nom de la boîte. */
export function pcBoxLabel(sel: PcBoxSel, boxes?: PcBoxes): string {
    if (sel === "all") return "Tous"
    if (sel === "none") return "Non rangés"
    return boxes?.boxes.find((b) => b.id === sel)?.name ?? "Tous"
}

/** Titre de la vue, ex. « NON RANGÉS · ★ PARFAITS ». Court (fiche d'un Daemon) : la partie la plus précise, sinon « PC ». */
export function pcViewTitle(sel: PcBoxSel, filter: PcFilter, query: string, boxes?: PcBoxes, short = false): string {
    const f = pcFilterLabel(filter)
    const q = query.trim() ? `« ${query.trim()} »` : null
    if (short) return f ?? q ?? (sel === "all" ? "PC" : pcBoxLabel(sel, boxes))
    return [pcBoxLabel(sel, boxes).toUpperCase(), f?.toUpperCase() ?? null, q].filter(Boolean).join(" · ")
}

export interface PcViewBarProps {
    boxes?: PcBoxes
    counts: { all: number; none: number; byBox: Record<string, number> }
    facets: PcFacets
    sel: PcBoxSel
    filter: PcFilter
    query: string
    searchOpen: boolean
    group: PcGroup
    /** Faux dans une bulle de rejeu : aucune boîte n'y est montrée ni créée. */
    canBox: boolean
    edit: PcBoxEdit
    editName: string
    onSel: (sel: PcBoxSel) => void
    onFilter: (f: PcFilter) => void
    /** Vue « EV d'une stat » : filtre + tri par cette stat. */
    onEvStat: (k: StatKey) => void
    onGroup: (g: PcGroup) => void
    onQuery: (q: string) => void
    onSearchOpen: (open: boolean) => void
    onClear: () => void
    onNewBox: () => void
    onRename: (id: string) => void
    onDelete: (id: string) => void
    onEditName: (s: string) => void
    onEditOk: () => void
    onEditCancel: () => void
}

export function PcViewBar(p: PcViewBarProps) {
    const list = p.boxes?.boxes ?? []
    const hasBoxes = p.canBox && list.length > 0
    const selBox = p.canBox && p.sel !== "all" && p.sel !== "none" ? list.find((b) => b.id === p.sel) ?? null : null
    const active = p.filter.kind !== "all" || p.query.trim() !== ""
    const toggle = (f: PcFilter) => p.onFilter(p.filter.kind === f.kind && JSON.stringify(p.filter) === JSON.stringify(f) ? { kind: "all" } : f)
    const evKinds = p.filter.kind === "ev" || p.filter.kind === "evNone" || p.filter.kind === "evFull" || p.filter.kind === "evCandy"
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "0 0 6px" }}>
            {hasBoxes && (
                <div style={row}>
                    <span style={{ opacity: 0.6 }}>📦</span>
                    <button style={chip(p.sel === "all")} aria-pressed={p.sel === "all"} onClick={() => p.onSel("all")}>Tous {p.counts.all}</button>
                    <button style={chip(p.sel === "none")} aria-pressed={p.sel === "none"} onClick={() => p.onSel("none")}>Non rangés {p.counts.none}</button>
                    {list.map((b) => (
                        <button key={b.id} style={chip(p.sel === b.id)} aria-pressed={p.sel === b.id} onClick={() => p.onSel(b.id)}>{b.name} {p.counts.byBox[b.id] ?? 0}</button>
                    ))}
                    <button style={chip(false)} onClick={p.onNewBox} title="Nouvelle boîte">＋</button>
                </div>
            )}
            {selBox && (
                <div style={{ ...row, justifyContent: "space-between", flexWrap: "nowrap" }}>
                    <span style={{ fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📦 {selBox.name} · {p.counts.byBox[selBox.id] ?? 0}</span>
                    <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button style={smallBtn} onClick={() => p.onRename(selBox.id)} title="Renommer la boîte">✏️</button>
                        <button style={smallBtn} onClick={() => p.onDelete(selBox.id)} title="Supprimer la boîte">🗑</button>
                    </span>
                </div>
            )}
            {p.edit && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input
                        autoFocus
                        value={p.editName}
                        placeholder="Nom de la boîte (14 max)"
                        aria-label="Nom de la boîte"
                        onChange={(e) => p.onEditName(Array.from(e.target.value).slice(0, PC_BOX_NAME_MAX).join(""))}
                        onKeyDown={(e) => { if (e.key === "Enter") p.onEditOk(); else if (e.key === "Escape") p.onEditCancel() }}
                        style={inputStyle}
                    />
                    <button style={smallBtn} onClick={p.onEditOk}>OK</button>
                    <button style={smallBtn} onClick={p.onEditCancel} title="Annuler">✖</button>
                </div>
            )}
            <div style={row}>
                <span style={{ opacity: 0.6 }}>VOIR</span>
                <button style={chip(p.filter.kind === "parfait")} aria-pressed={p.filter.kind === "parfait"} onClick={() => toggle({ kind: "parfait" })}>★ Parfaits {p.facets.parfait}</button>
                {(p.facets.shiny > 0 || p.filter.kind === "shiny") && (
                    <button style={chip(p.filter.kind === "shiny")} aria-pressed={p.filter.kind === "shiny"} onClick={() => toggle({ kind: "shiny" })}>✨ Shiny {p.facets.shiny}</button>
                )}
                <button style={chip(p.group === "type" || p.filter.kind === "type")} aria-expanded={p.group === "type"} onClick={() => p.onGroup(p.group === "type" ? null : "type")}>
                    {p.filter.kind === "type" ? p.filter.type : "Type"} ▸
                </button>
                <button style={chip(p.group === "ev" || evKinds)} aria-expanded={p.group === "ev"} onClick={() => p.onGroup(p.group === "ev" ? null : "ev")}>
                    {evKinds ? pcFilterLabel(p.filter) : "EV"} ▸
                </button>
                <button style={chip(p.searchOpen || p.query.trim() !== "")} onClick={() => p.onSearchOpen(!p.searchOpen)} title="Chercher par nom">🔍</button>
                {p.canBox && !hasBoxes && <button style={chip(false)} onClick={p.onNewBox}>＋ Boîte</button>}
                {active && <button style={chip(false)} onClick={p.onClear} title="Tout afficher">✖</button>}
            </div>
            {p.group === "type" && (
                <div style={row}>
                    {p.facets.types.map(([t, n]) => {
                        const on = p.filter.kind === "type" && p.filter.type === t
                        return (
                            <button key={t} style={chip(on, t === "???" ? undefined : TYPE_COLORS[t])} aria-pressed={on} onClick={() => p.onFilter(on ? { kind: "all" } : { kind: "type", type: t })}>{t} {n}</button>
                        )
                    })}
                </div>
            )}
            {p.group === "ev" && (
                <>
                    <div style={row}>
                        {PC_STATS.map((k) => {
                            const on = p.filter.kind === "ev" && p.filter.stat === k
                            return <button key={k} style={chip(on)} aria-pressed={on} onClick={() => (on ? p.onFilter({ kind: "all" }) : p.onEvStat(k))}>{STAT_LABEL[k]} {p.facets.ev[k]}</button>
                        })}
                        <button style={chip(p.filter.kind === "evNone")} aria-pressed={p.filter.kind === "evNone"} onClick={() => toggle({ kind: "evNone" })}>Sans EV {p.facets.evNone}</button>
                        <button style={chip(p.filter.kind === "evFull")} aria-pressed={p.filter.kind === "evFull"} onClick={() => toggle({ kind: "evFull" })}>🔒 Plafond {p.facets.evFull}</button>
                        {(p.facets.evCandy > 0 || p.filter.kind === "evCandy") && (
                            <button style={chip(p.filter.kind === "evCandy")} aria-pressed={p.filter.kind === "evCandy"} onClick={() => toggle({ kind: "evCandy" })}>🍬 Bonbon {p.facets.evCandy}</button>
                        )}
                    </div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>Classé selon sa stat la plus entraînée.</div>
                </>
            )}
            {p.searchOpen && (
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <input autoFocus value={p.query} placeholder="Nom…" aria-label="Chercher un Daemon par nom" onChange={(e) => p.onQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { p.onQuery(""); p.onSearchOpen(false) } }} style={inputStyle} />
                    <button style={smallBtn} onClick={() => { p.onQuery(""); p.onSearchOpen(false) }} title="Effacer la recherche">✖</button>
                </div>
            )}
        </div>
    )
}

export interface PcBulkBarProps {
    count: number
    boxes?: PcBoxes
    sel: PcBoxSel
    /** id de boîte, ou null = « Non rangés ». */
    onAssign: (target: string | null) => void
    onNew: () => void
}

/** « 📦 Ranger ces N dans… » : range d'un coup TOUTE la vue courante (toutes les pages). */
export function PcBulkBar(p: PcBulkBarProps) {
    const list = p.boxes?.boxes ?? []
    return (
        <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, margin: "6px 0 0" }}>
            <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{p.count === 1 ? "📦 Ranger ce Daemon dans" : `📦 Ranger ces ${p.count} dans`}</span>
            <select
                value=""
                aria-label={p.count === 1 ? "Ranger ce Daemon dans une boîte" : `Ranger ces ${p.count} Daemons dans une boîte`}
                onChange={(e) => {
                    const v = e.target.value
                    if (v === "__new") p.onNew()
                    else if (v === "__none") p.onAssign(null)
                    else if (v) p.onAssign(v)
                }}
                style={selectStyle}
            >
                <option value="">choisir…</option>
                {list.filter((b) => b.id !== p.sel).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                {list.length > 0 && p.sel !== "none" && <option value="__none">Non rangés</option>}
                <option value="__new">＋ Nouvelle boîte…</option>
            </select>
        </div>
    )
}
