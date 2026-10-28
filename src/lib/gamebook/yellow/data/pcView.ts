// src/lib/gamebook/yellow/data/pcView.ts
//
// PC — VUES CALCULÉES (projet de Zyran, 28/10/2026 : « classer nos Daemons par type ou, mieux, par EV ; j'ai du mal à
// retrouver mes Daemons Parfaits »). Filtres ★ Parfaits, ✨ shiny, par type, par EV, recherche par nom, et boîtes du
// joueur (data/pcBoxes). Tout est calculé à l'affichage, rien n'est stocké. React-free mais PAS server-safe (espèces).
// Ne modifie JAMAIS la liste reçue : renvoie un nouveau tableau des MÊMES objets (aucun Daemon ajouté, perdu ni copié).

import type { MonInstance, PokeType, StatKey } from "../battle/types"
import { POKE_TYPES } from "../battle/types"
import { fullStats } from "../battle/stats"
import { getSpecies } from "./species"
import { ivTier, ivTotal } from "./ivConfig"
import { evTotal, evTotalCap } from "./evConfig"
import { boxOf, type PcBoxes } from "./pcBoxes"

export type PcTypeKey = PokeType | "???"
/** Vue de boîte : tout le PC, les Daemons non rangés, ou l'id d'une boîte du joueur. */
export type PcBoxSel = "all" | "none" | string
export type PcFilter =
    | { kind: "all" } | { kind: "parfait" } | { kind: "shiny" } | { kind: "type"; type: PcTypeKey }
    | { kind: "ev"; stat: StatKey } | { kind: "evNone" } | { kind: "evFull" } | { kind: "evCandy" }
export type PcSortKey = "recent" | "lvl" | "hp" | "spc" | "atk" | "def" | "spe" | "alpha" | "iv" | "ev"
export interface PcViewOpts { sel: PcBoxSel; filter: PcFilter; query: string; sort: PcSortKey; dir: number; boxes?: PcBoxes }
export interface PcFacets {
    total: number; parfait: number; shiny: number
    /** Types présents (ordre de POKE_TYPES, "???" en dernier), plus le type choisi même à 0. */
    types: [PcTypeKey, number][]
    /** Daemons rangés sous chaque stat la plus entraînée (une égalité compte dans chaque stat). */
    ev: Record<StatKey, number>
    evNone: number; evFull: number; evCandy: number
}

export const PC_STATS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]
const TYPE_ORDER: PcTypeKey[] = [...POKE_TYPES, "???"]

/** Nom affiché sans jamais lever d'erreur (displayName lève si l'espèce est inconnue). */
export function safeName(m: MonInstance): string {
    return m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId
}

/** Types du Daemon (ceux qu'affichent déjà les lignes du PC) ; espèce inconnue → "???". */
export function monTypes(m: MonInstance): PcTypeKey[] {
    const t = getSpecies(m.speciesId)?.types
    return t && t.length ? [...new Set<PcTypeKey>(t)] : ["???"]
}

/** ★ PARFAIT = le palier de potentiel de la fiche (somme des IV ≥ 75). */
export function isParfait(m: MonInstance): boolean {
    return !!m.ivs && ivTier(m.ivs) === "PARFAIT"
}

/** Stat(s) la(les) plus entraînée(s) : toutes celles à égalité au maximum ; aucune si le Daemon n'a pas d'EV. */
export function dominantEvStats(m: MonInstance): StatKey[] {
    const ev = m.ev ?? {}
    const v = (k: StatKey) => Math.max(0, ev[k] ?? 0)
    const max = Math.max(...PC_STATS.map(v))
    return max > 0 ? PC_STATS.filter((k) => v(k) === max) : []
}

/** 🔒 Plafond d'EV atteint (même test que la fiche : `>=`, le plafond peut passer sous le total). */
export function isEvFull(m: MonInstance): boolean {
    return evTotal(m.ev) >= evTotalCap(m)
}

/** Clé de recherche : sans accents ni majuscules. */
export function searchKey(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

export function matchesQuery(m: MonInstance, query: string): boolean {
    const q = searchKey(query)
    if (!q) return true
    return searchKey(m.nickname ?? "").includes(q) || searchKey(getSpecies(m.speciesId)?.name ?? m.speciesId).includes(q)
}

export function matchesFilter(m: MonInstance, f: PcFilter): boolean {
    switch (f.kind) {
        case "all": return true
        case "parfait": return isParfait(m)
        case "shiny": return !!m.shiny
        case "type": return monTypes(m).includes(f.type)
        case "ev": return dominantEvStats(m).includes(f.stat)
        case "evNone": return evTotal(m.ev) === 0
        case "evFull": return isEvFull(m)
        case "evCandy": return (m.evCandy ?? 0) > 0
    }
}

/** Boîte choisie encore valable ? (supprimée, ou venue d'un autre monde → « Tous »). */
export function normalizeSel(sel: PcBoxSel, boxes?: PcBoxes): PcBoxSel {
    if (sel === "all" || !boxes) return "all"
    if (sel === "none") return "none"
    return boxes.boxes.some((b) => b.id === sel) ? sel : "all"
}

export function inSel(m: MonInstance, sel: PcBoxSel, boxes?: PcBoxes): boolean {
    const s = normalizeSel(sel, boxes)
    if (s === "all") return true
    const b = boxOf(boxes, m.uid)
    return s === "none" ? b === null : b === s
}

/** Tri sur une COPIE. Reprend à l'identique les 8 tris historiques du PC (« Déposé récemment » = ordre de dépôt, inversé
 *  en ▼), plus « Potentiel (IV) » et « EV » (stat choisie dans une vue EV, sinon total). Tri stable, clés calculées une fois. */
export function sortPc(list: readonly MonInstance[], sort: PcSortKey, dir: number, evStat?: StatKey): MonInstance[] {
    const d = dir < 0 ? -1 : 1
    if (sort === "recent") { const out = [...list]; return d < 0 ? out.reverse() : out }
    if (sort === "alpha") {
        const dec = list.map((m) => ({ m, k: safeName(m) }))
        return dec.sort((a, b) => a.k.localeCompare(b.k) * d).map((x) => x.m)
    }
    const key = (m: MonInstance): number => {
        if (sort === "lvl") return m.level
        if (sort === "iv") return m.ivs ? ivTotal(m.ivs) : 0
        if (sort === "ev") return evStat ? Math.max(0, m.ev?.[evStat] ?? 0) : evTotal(m.ev)
        const sp = getSpecies(m.speciesId)
        return sp ? fullStats(m, sp)[sort] : 0
    }
    const dec = list.map((m) => ({ m, k: key(m) }))
    return dec.sort((a, b) => (a.k - b.k) * d).map((x) => x.m)
}

/** Base des compteurs : la boîte choisie ∧ la recherche (avant le filtre). */
export function pcScope(pc: readonly MonInstance[], sel: PcBoxSel, query: string, boxes?: PcBoxes): MonInstance[] {
    return pc.filter((m) => inSel(m, sel, boxes) && matchesQuery(m, query))
}

/** Compteurs des puces : chaque nombre = la taille de la vue que la puce ouvre (sur la même base). */
export function pcFacets(scope: readonly MonInstance[], selectedType?: PcTypeKey): PcFacets {
    const typeCount = new Map<PcTypeKey, number>()
    const ev: Record<StatKey, number> = { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 }
    let parfait = 0, shiny = 0, evNone = 0, evFull = 0, evCandy = 0
    for (const m of scope) {
        if (isParfait(m)) parfait++
        if (m.shiny) shiny++
        for (const t of monTypes(m)) typeCount.set(t, (typeCount.get(t) ?? 0) + 1)
        for (const k of dominantEvStats(m)) ev[k]++
        if (evTotal(m.ev) === 0) evNone++
        if (isEvFull(m)) evFull++
        if ((m.evCandy ?? 0) > 0) evCandy++
    }
    const types = TYPE_ORDER
        .filter((t) => (typeCount.get(t) ?? 0) > 0 || t === selectedType)
        .map((t): [PcTypeKey, number] => [t, typeCount.get(t) ?? 0])
    return { total: scope.length, parfait, shiny, types, ev, evNone, evFull, evCandy }
}

/** Compteurs des boîtes (« Tous », « Non rangés », chaque boîte) sur tout le PC. */
export function pcBoxCounts(pc: readonly MonInstance[], boxes?: PcBoxes): { all: number; none: number; byBox: Record<string, number> } {
    const byBox: Record<string, number> = {}
    for (const b of boxes?.boxes ?? []) byBox[b.id] = 0
    let none = 0
    for (const m of pc) {
        const b = boxOf(boxes, m.uid)
        if (b === null) none++
        else byBox[b] = (byBox[b] ?? 0) + 1
    }
    return { all: pc.length, none, byBox }
}

/** LA vue du PC : boîte ∧ recherche ∧ filtre, puis tri. Nouveau tableau des MÊMES objets, jamais de mutation. */
export function computePcView(pc: readonly MonInstance[], o: PcViewOpts): MonInstance[] {
    const list = pcScope(pc, o.sel, o.query, o.boxes).filter((m) => matchesFilter(m, o.filter))
    return sortPc(list, o.sort, o.dir, o.filter.kind === "ev" ? o.filter.stat : undefined)
}
