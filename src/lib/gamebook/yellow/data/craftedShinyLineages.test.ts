import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { SPECIES, getSpecies, CANONIZED_CUSTOM_ALIAS, isDexHidden } from "./species"
import { CANONIZED_CUSTOM_SPRITES } from "../create/customSpecies"
import { speciesAtLevel } from "./ace"
import { CRAFTED_SHINY_IDS } from "./craftedShinies"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// SHINY CRAFTÉS — les 4 lignées canonisées (15/10/2026). Portées FIDÈLEMENT depuis buildCustomSpecies sur les
// specs réelles des saves (Kingme, Tom, TomGotrails, Rob) : stats, évolutions, talent, courbe. Ce test fige ce
// portage — une dérive ici, c'est un joueur qui ne reconnaît plus SA création.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const LINEAGES = [
    { owner: "Kingme",      key: "custom_cmuhdss6u0003lcg_chadine",    ids: ["chadine", "arlpol", "lesleo"],          dex: [226, 227, 228], types: ["EAU", "COMBAT"],      bst: [236, 319, 414], evo: [16, 34], growth: "medium_slow", talent: "affinite_elem" },
    { owner: "Tom",         key: "custom_cmtifg0cn0001146_stashex",    ids: ["stashex", "stashex2", "stashex3"],      dex: [229, 230, 231], types: ["PSY"],                bst: [240, 324, 420], evo: [16, 34], growth: "medium_slow", talent: "poigne_fer" },
    { owner: "TomGotrails", key: "custom_cmtj184wc00276w9_ewokid",     ids: ["ewokid", "endorix", "wooky"],           dex: [232, 233, 234], types: ["DRAGON", "PLANTE"],   bst: [254, 343, 445], evo: [16, 34], growth: "medium_slow", talent: "chanceux" },
    { owner: "Rob",         key: "custom_cmti9xukc002h7k2_dracominus", ids: ["dracominus", "spectragon", "thanadrak"], dex: [235, 236, 237], types: ["DRAGON", "SPECTRE"], bst: [271, 366, 475], evo: [22, 40], growth: "slow",        talent: "coup_dur" },
] as const

const bstOf = (id: string) => { const b = SPECIES[id].baseStats; return b.hp + b.atk + b.def + b.spc + b.spe }

describe("les 4 lignées sont dans SPECIES, fidèles aux créations", () => {
    for (const L of LINEAGES) {
        it(`${L.ids[0]} → ${L.ids[1]} → ${L.ids[2]} (${L.owner}) : dex ${L.dex[0]}-${L.dex[2]}, ${L.types.join("/")}, BST ${L.bst.join("/")}, évo ${L.evo.join("/")}`, () => {
            L.ids.forEach((id, i) => {
                const sp = SPECIES[id]
                expect(sp, id).toBeDefined()
                expect(sp.dexNo, id).toBe(L.dex[i])
                expect(sp.types, id).toEqual(L.types)
                expect(bstOf(id), id).toBe(L.bst[i])
                expect(sp.growthRate, id).toBe(L.growth)
                expect(sp.secretTalent, id).toBe(L.talent)
                expect(sp.hiddenUntilCaught, `${id} : surprise → caché tant que non capturé`).toBe(true)
                expect(sp.runThreeOnly, `${id} : hors des totaux dex run 1/2`).toBe(true)
                expect(sp.sprite, id).toBe(`/yellow/sprites/dex/${id}.png`)
            })
            expect(SPECIES[L.ids[0]].evolution).toEqual({ toId: L.ids[1], method: { kind: "LEVEL", level: L.evo[0] } })
            expect(SPECIES[L.ids[1]].evolution).toEqual({ toId: L.ids[2], method: { kind: "LEVEL", level: L.evo[1] } })
            expect(SPECIES[L.ids[2]].evolution, "stade final").toBeUndefined()
        })
    }

    it("le stade suit le niveau (speciesAtLevel) : c'est ce que voit le joueur à la rencontre", () => {
        expect(speciesAtLevel("chadine", 5)).toBe("chadine")
        expect(speciesAtLevel("chadine", 20)).toBe("arlpol")
        expect(speciesAtLevel("chadine", 60)).toBe("lesleo")
        expect(speciesAtLevel("dracominus", 21)).toBe("dracominus")
        expect(speciesAtLevel("dracominus", 30)).toBe("spectragon")
        expect(speciesAtLevel("dracominus", 75)).toBe("thanadrak")
    })

    it("dexNo 226-237 : aucune collision avec le reste du dex", () => {
        const byDex = new Map<number, string[]>()
        for (const sp of Object.values(SPECIES)) byDex.set(sp.dexNo, [...(byDex.get(sp.dexNo) ?? []), sp.id])
        for (let n = 226; n <= 237; n++) expect(byDex.get(n), `dex ${n}`).toHaveLength(1)
    })

    it("CRAFTED_SHINY_IDS pointe sur les 4 stades 1, tous résolvables", () => {
        expect([...CRAFTED_SHINY_IDS].sort()).toEqual(LINEAGES.map((L) => L.ids[0]).sort())
        for (const id of CRAFTED_SHINY_IDS) expect(getSpecies(id)?.id).toBe(id)
    })
})

describe("le joueur créateur retrouve SA créature (registres de canonisation)", () => {
    for (const L of LINEAGES) {
        it(`${L.owner} : sprites par stade + alias _s3 → ${L.ids[2]}`, () => {
            expect(CANONIZED_CUSTOM_SPRITES[L.key]).toEqual(L.ids.map((id) => `/yellow/sprites/dex/${id}.png`))
            expect(CANONIZED_CUSTOM_ALIAS[`${L.key}_s3`]).toBe(L.ids[2])
        })
    }

    it("les 12 sprites existent dans public/", () => {
        for (const L of LINEAGES) for (const id of L.ids) {
            const p = path.join(process.cwd(), "public/yellow/sprites/dex", `${id}.png`)
            expect(fs.existsSync(p), p).toBe(true)
            expect(fs.statSync(p).size, p).toBeGreaterThan(10_000)
        }
    })
})

describe("dex tiéré : invisibles en run 1/2 tant que non capturés, visibles une fois capturés", () => {
    it("run 2 champion, rien capturé → masqué ; capturé en run 1 → visible (Pokédex cumulatif)", () => {
        for (const L of LINEAGES) {
            const sp = SPECIES[L.ids[0]]
            expect(isDexHidden(sp, [], true, true, false), L.ids[0]).toBe(true)
            expect(isDexHidden(sp, [L.ids[0]], false, false, false), L.ids[0]).toBe(false)
        }
    })
})
