import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { rollWildEncounter } from "./encounters"
import { run2BlackjackCtPool } from "./cts"
import { ctDefiOptions } from "./labDefis"

const BST = (id: string) => Object.values(getSpecies(id)!.baseStats).reduce((a, b) => a + b, 0)

describe("Maison Combat + Grotte run 3 — nouvelles espèces (161-164)", () => {
    it("dexNo / types / BST corrects + runThreeOnly", () => {
        const exp = [
            { id: "otama", dex: 161, types: ["COMBAT", "EAU"], bst: 220 },
            { id: "gamaruto", dex: 162, types: ["COMBAT", "EAU"], bst: 344 },
            { id: "uzumaro", dex: 163, types: ["COMBAT", "EAU"], bst: 480 },
            { id: "wistree", dex: 164, types: ["SPECTRE", "PLANTE"], bst: 430 },
        ]
        for (const e of exp) {
            const s = getSpecies(e.id)
            expect(s, e.id).toBeDefined()
            expect(s!.dexNo, e.id).toBe(e.dex)
            expect(s!.types, e.id).toEqual(e.types)
            expect(BST(e.id), e.id).toBe(e.bst)
            expect(s!.runThreeOnly, e.id).toBe(true)
        }
    })

    it("grenouilles : évolutions TARDIVES (25/45) + croissance LENTE ; Wistree mono", () => {
        expect(getSpecies("otama")!.evolution).toMatchObject({ toId: "gamaruto", method: { level: 25 } })
        expect(getSpecies("gamaruto")!.evolution).toMatchObject({ toId: "uzumaro", method: { level: 45 } })
        expect(getSpecies("uzumaro")!.evolution).toBeUndefined()
        for (const id of ["otama", "gamaruto", "uzumaro"]) expect(getSpecies(id)!.growthRate, id).toBe("slow")
        expect(getSpecies("wistree")!.evolution).toBeUndefined()
    })

    it("Uzumaro : tank-sétuppeur (peu de PV vs gros murs) + learnset jusqu'au niv 80", () => {
        const s = getSpecies("uzumaro")!.baseStats
        expect(s.hp).toBeLessThan(s.def) // peu de PV, gros mur
        expect(s.hp).toBeLessThan(s.spc)
        expect(Math.max(...getSpecies("uzumaro")!.learnset.map((l) => l.level))).toBe(80)
    })
})

describe("Nouveaux moves signature", () => {
    it("Mitra-Poing : COMBAT, power 150, focusCharge", () => {
        const m = getMove("mitra_poing")!
        expect(m.type).toBe("COMBAT"); expect(m.power).toBe(150); expect(m.effect?.focusCharge).toBe(true)
    })
    it("Vol d'Éclat : PLANTE, stealBoosts", () => {
        const m = getMove("vol_d_eclat")!
        expect(m.type).toBe("PLANTE"); expect(m.effect?.stealBoosts).toBe(true)
    })
    it("Uzumaro n'apprend PAS Mitra-Poing au niveau (réservé à la CT du Collectionneur)", () => {
        expect(getSpecies("uzumaro")!.learnset.some((l) => l.moveId === "mitra_poing")).toBe(false)
    })
})

describe("Pools run 3", () => {
    const roll = (mapId: string) => rollWildEncounter({ mapId, x: 5, y: 5, leadLevel: 40, run3: true, encounterCount: 999, rng: Math.random, caughtSpecies: [] })

    it("Maison Combat : 100% COMBAT + les 3 grenouilles apparaissent", () => {
        const seen = new Set<string>()
        for (let i = 0; i < 15000; i++) { const m = roll("yellow_maison_hantee"); if (m) seen.add(m.speciesId) }
        expect(seen.size).toBeGreaterThan(6)
        for (const id of seen) expect(getSpecies(id)?.types ?? [], id).toContain("COMBAT")
        for (const id of ["otama", "gamaruto", "uzumaro"]) expect(seen.has(id), id).toBe(true)
    })

    it("Grotte : Forgeotin RETIRÉ, Wistree AJOUTÉ", () => {
        const seen = new Set<string>()
        for (let i = 0; i < 25000; i++) { const m = roll("yellow_grotte"); if (m) seen.add(m.speciesId) }
        expect(seen.has("forgeotin")).toBe(false)
        expect(seen.has("wistree")).toBe(true)
    })
})

describe("CT58 (Mitra-Poing) — exclusivité Collectionneur run 3 (source UNIQUE)", () => {
    it("ABSENTE du pool de récompense blackjack run 2", () => {
        expect(run2BlackjackCtPool()).not.toContain("ct58")
    })
    it("ABSENTE du défi CT du labo (jamais proposée en run 1/2)", () => {
        expect(ctDefiOptions().some((o) => o.ctId === "ct58")).toBe(false)
    })
})
