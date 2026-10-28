import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import type { MonInstance, StatKey } from "../battle/types"
import { createMonInstance } from "../battle/factory"
import { fullStats } from "../battle/stats"
import { displayName } from "../battle/engine"
import { getSpecies } from "./species"
import { ivTier } from "./ivConfig"
import { evTotalCap } from "./evConfig"
import {
    computePcView, sortPc, pcScope, pcFacets, pcBoxCounts, isParfait, monTypes, dominantEvStats, isEvFull, matchesQuery,
    normalizeSel, type PcFilter, type PcSortKey,
} from "./pcView"
import type { PcBoxes } from "./pcBoxes"

// Projet de Zyran (25/10/2026) : « classer nos Daemons par type ou, mieux, par EV ; j'ai du mal à retrouver mes Daemons
// Parfaits ». Les vues sont des filtres calculés : elles ne doivent jamais ajouter, perdre ni copier un Daemon.
const mk = (id: string, level: number, o: { ivs?: number; shiny?: boolean; ev?: Partial<Record<StatKey, number>>; nickname?: string; evCandy?: number } = {}): MonInstance =>
    ({ ...createMonInstance(id, level, { ivs: o.ivs ?? 10, shiny: o.shiny, ev: o.ev, nickname: o.nickname }), ...(o.evCandy ? { evCandy: o.evCandy } : {}) })

const PC: MonInstance[] = [
    mk("magnetor", 60, { shiny: true, ev: { atk: 252, spe: 252 } }),
    mk("razmaree", 40, { ev: { hp: 100 } }),
    mk("feuillichot", 12, { ivs: 15 }),
    mk("plumiot", 12, { ivs: 15, nickname: "Zéphyr" }),
    mk("couperin", 30, { ev: { atk: 252, def: 4 }, evCandy: 1 }),
    mk("pampousse", 12),
    mk("ruffiant", 28, { ev: { spc: 80 } }),
    mk("belunode", 41, { ivs: 3 }),
    mk("ro", 37, { shiny: true }),
    { ...mk("elefer", 12), speciesId: "espece_disparue" },
    mk("cailloutchi", 30, { ev: { hp: 252, atk: 252, def: 6 } }),
]
const SORTS: PcSortKey[] = ["recent", "lvl", "hp", "spc", "atk", "def", "spe", "alpha", "iv", "ev"]
const FILTERS: PcFilter[] = [
    { kind: "all" }, { kind: "parfait" }, { kind: "shiny" }, { kind: "type", type: "EAU" }, { kind: "type", type: "???" },
    { kind: "ev", stat: "atk" }, { kind: "evNone" }, { kind: "evFull" }, { kind: "evCandy" },
]
const view = (filter: PcFilter, sort: PcSortKey = "recent", dir = -1, query = "", boxes?: PcBoxes, sel = "all") =>
    computePcView(PC, { sel, filter, query, sort, dir, boxes })

// Tri du PC tel qu'il était écrit dans YellowDevClient avant les vues (28/10/2026), recopié tel quel.
function legacySort(pc: MonInstance[], pcSort: string, pcSortDir: number): MonInstance[] {
    const sortedPc = [...pc]
    if (pcSort === "recent") { if (pcSortDir < 0) sortedPc.reverse() }
    else if (pcSort === "alpha") sortedPc.sort((a, b) => displayName(a).localeCompare(displayName(b)) * pcSortDir)
    else if (pcSort === "lvl") sortedPc.sort((a, b) => (a.level - b.level) * pcSortDir)
    else {
        const k = pcSort as StatKey
        sortedPc.sort((a, b) => {
            const sa = getSpecies(a.speciesId), sb = getSpecies(b.speciesId)
            return ((sa ? fullStats(a, sa)[k] : 0) - (sb ? fullStats(b, sb)[k] : 0)) * pcSortDir
        })
    }
    return sortedPc
}

describe("vues du PC : jamais un Daemon ajouté, perdu ou copié", () => {
    it("« Tous » rend exactement les mêmes objets, quel que soit le tri ; chaque filtre rend un sous-ensemble ; la liste n'est pas modifiée", () => {
        const before = [...PC]
        for (const sort of SORTS) for (const dir of [-1, 1]) {
            const all = view({ kind: "all" }, sort, dir)
            expect(all).toHaveLength(PC.length)
            expect(new Set(all).size).toBe(PC.length)
            expect(all.every((m) => PC.includes(m))).toBe(true)
            for (const f of FILTERS) expect(view(f, sort, dir).every((m) => PC.includes(m))).toBe(true)
        }
        expect(PC).toEqual(before)
        expect(PC.every((m, i) => m === before[i])).toBe(true)
    })
    it("les 8 tris historiques donnent exactement l'ordre d'avant, dans les deux sens", () => {
        const known = PC.filter((m) => getSpecies(m.speciesId)) // l'ancien tri alphabétique levait sur une espèce inconnue
        for (const sort of ["recent", "lvl", "hp", "spc", "atk", "def", "spe", "alpha"] as PcSortKey[]) for (const dir of [-1, 1]) {
            expect(sortPc(known, sort, dir).map((m) => m.uid)).toEqual(legacySort(known, sort, dir).map((m) => m.uid))
        }
    })
    it("Potentiel (IV) ▼ met les Parfaits en tête ; EV trie sur la stat de la vue, sinon sur le total", () => {
        const byIv = sortPc(PC, "iv", -1)
        const nParfait = PC.filter(isParfait).length
        expect(byIv.slice(0, nParfait).every(isParfait)).toBe(true)
        const atkView = view({ kind: "ev", stat: "atk" }, "ev", -1)
        expect(atkView.map((m) => m.ev?.atk)).toEqual([252, 252, 252])
        expect(sortPc(PC, "ev", -1)[0].speciesId).toBe("cailloutchi") // 510 d'EV au total
    })
})

describe("classement", () => {
    it("★ Parfait = le palier de la fiche (somme des IV ≥ 75) : 75 oui, 74 non", () => {
        const m = mk("pampousse", 10, { ivs: 15 })
        expect(isParfait(m)).toBe(true)
        expect(isParfait({ ...m, ivs: { ...m.ivs, spc: 14 } })).toBe(false)
        for (let i = 0; i < 200; i++) {
            const r = () => Math.floor(Math.random() * 16)
            const x = { ...m, ivs: { hp: r(), atk: r(), def: r(), spe: r(), spc: r() } }
            expect(isParfait(x)).toBe(ivTier(x.ivs) === "PARFAIT")
        }
    })
    it("types : un double type compte dans les deux, une espèce inconnue va dans « ??? », ordre du Pokédex, type choisi gardé à 0", () => {
        expect(monTypes(PC[0])).toEqual(["FEU", "METAL"])
        expect(monTypes(PC[9])).toEqual(["???"])
        const f = pcFacets(PC, "DRAGON")
        const keys = f.types.map(([t]) => t)
        expect(keys).toEqual(["NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "COMBAT", "SOL", "VOL", "INSECTE", "ROCHE", "DRAGON", "METAL", "???"])
        expect(f.types.find(([t]) => t === "DRAGON")?.[1]).toBe(0)
        expect(f.types.find(([t]) => t === "EAU")?.[1]).toBe(3) // Razmarée, Bélunode, Rô
    })
    it("EV : rien = Sans EV ; égalité = sous chaque stat ; Plafond même quand le plafond passe sous le total ; Bonbon", () => {
        expect(dominantEvStats(mk("pampousse", 5))).toEqual([])
        expect(dominantEvStats({ ...mk("pampousse", 5), ev: {} })).toEqual([])
        expect(dominantEvStats(PC[0])).toEqual(["atk", "spe"])
        const full = PC[10]
        expect(isEvFull(full)).toBe(evTotalCap(full) <= 510)
        expect(isEvFull({ ...mk("pampousse", 5), ev: { hp: 252, atk: 252, def: 252 } })).toBe(true) // 756 ≥ n'importe quel plafond
        const f = pcFacets(PC)
        expect(f.evCandy).toBe(1)
        const covered = new Set([...view({ kind: "evNone" }), ...(["hp", "atk", "def", "spe", "spc"] as StatKey[]).flatMap((stat) => view({ kind: "ev", stat }))])
        expect(covered.size).toBe(PC.length) // Sans EV + les stats couvrent tout le monde
    })
    it("chaque compteur de puce = la taille de la vue qu'elle ouvre (avec et sans recherche, dans une boîte)", () => {
        const boxes: PcBoxes = { boxes: [{ id: "bx1", name: "Ligue" }], of: { [PC[0].uid]: "bx1", [PC[1].uid]: "bx1", [PC[4].uid]: "bx1" } }
        for (const [sel, query] of [["all", ""], ["all", "o"], ["bx1", ""], ["none", "e"]] as const) {
            const scope = pcScope(PC, sel, query, boxes)
            const f = pcFacets(scope)
            const v = (filter: PcFilter) => view(filter, "recent", -1, query, boxes, sel).length
            expect(f.total).toBe(v({ kind: "all" }))
            expect(f.parfait).toBe(v({ kind: "parfait" }))
            expect(f.shiny).toBe(v({ kind: "shiny" }))
            expect(f.evNone).toBe(v({ kind: "evNone" }))
            expect(f.evFull).toBe(v({ kind: "evFull" }))
            expect(f.evCandy).toBe(v({ kind: "evCandy" }))
            for (const [type, n] of f.types) expect(n).toBe(v({ kind: "type", type }))
            for (const stat of ["hp", "atk", "def", "spe", "spc"] as StatKey[]) expect(f.ev[stat]).toBe(v({ kind: "ev", stat }))
        }
    })
    it("la recherche ignore majuscules et accents, et lit aussi les surnoms", () => {
        expect(matchesQuery(PC[1], "RAZMAREE")).toBe(true)
        expect(matchesQuery(PC[3], "zephyr")).toBe(true)
        expect(matchesQuery(PC[3], "plumiot")).toBe(true)
        expect(view({ kind: "all" }, "recent", -1, "  ro ").map((m) => m.speciesId)).toContain("ro")
    })
    it("câblage de l'écran : la fiche glisse dans la vue FIGÉE à son ouverture ; la recherche ne survit pas à la fermeture du PC", () => {
        const ydc = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/YellowDevClient.tsx"), "utf8")
        expect(ydc).toContain("onClick={() => { setSelected(m); setFicheViewUids(showEv ? sortedPc.map((x) => x.uid) : null) }}")
        expect(ydc).toContain("const ficheList = inTeam ? player.team : (inView && viewList ? viewList : player.pc)")
        expect(ydc).toContain("const closePcUi = () => { setPcBoxEdit(null); setPcSearchOpen(false); setPcQuery(\"\"); setFicheViewUids(null); closePc() }")
        expect(ydc).toContain("const tier = m.ivs ? ivTier(m.ivs) : null")
    })
    it("les boîtes partagent le PC : « Non rangés » + chaque boîte = chaque Daemon une fois ; une boîte disparue → « Tous »", () => {
        const boxes: PcBoxes = { boxes: [{ id: "bx1", name: "A" }, { id: "bx2", name: "B" }], of: { [PC[0].uid]: "bx1", [PC[2].uid]: "bx2", [PC[3].uid]: "bx2", fantome: "bx1" } }
        const parts = [view({ kind: "all" }, "recent", -1, "", boxes, "none"), view({ kind: "all" }, "recent", -1, "", boxes, "bx1"), view({ kind: "all" }, "recent", -1, "", boxes, "bx2")]
        expect(parts.flat()).toHaveLength(PC.length)
        expect(new Set(parts.flat()).size).toBe(PC.length)
        expect(pcBoxCounts(PC, boxes)).toEqual({ all: PC.length, none: PC.length - 3, byBox: { bx1: 1, bx2: 2 } })
        expect(normalizeSel("bx9", boxes)).toBe("all")
        expect(normalizeSel("none", undefined)).toBe("all")
        expect(view({ kind: "all" }, "recent", -1, "", boxes, "bx9")).toHaveLength(PC.length)
    })
})
