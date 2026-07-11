import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { rollWildEncounter } from "./encounters"

const BST = (id: string) => Object.values(getSpecies(id)!.baseStats).reduce((a, b) => a + b, 0)

describe("Centrale Psy run 3 — les 5 espèces inédites", () => {
    it("dexNo / types / BST corrects et runThreeOnly", () => {
        const expected = [
            { id: "gekosmic", dex: 156, types: ["ROCHE", "PSY"], bst: 410 },
            { id: "hypnoppo", dex: 157, types: ["PSY"], bst: 268 },
            { id: "teleppo", dex: 158, types: ["PSY"], bst: 354 },
            { id: "omnhippo", dex: 159, types: ["PSY"], bst: 435 },
            { id: "karmaki", dex: 160, types: ["PLANTE", "PSY"], bst: 430 },
        ]
        for (const e of expected) {
            const sp = getSpecies(e.id)
            expect(sp, e.id).toBeDefined()
            expect(sp!.dexNo, e.id).toBe(e.dex)
            expect(sp!.types, e.id).toEqual(e.types)
            expect(BST(e.id), e.id).toBe(e.bst)
            expect(sp!.runThreeOnly, e.id).toBe(true)
        }
    })

    it("Karmaki : pivot défensif (top bulk, ATQ/VIT dumpées, double STAB spécial)", () => {
        const s = getSpecies("karmaki")!.baseStats
        expect(s).toEqual({ hp: 103, atk: 50, def: 102, spe: 60, spc: 115 })
        expect(s.atk).toBeLessThan(s.spc) // mono-special : l'ATQ ne porte rien
    })

    it("chaîne d'évolution hippo : Hypnoppo →(16) Téléppo →(34) Omnhippo (final)", () => {
        expect(getSpecies("hypnoppo")!.evolution?.toId).toBe("teleppo")
        expect(getSpecies("teleppo")!.evolution?.toId).toBe("omnhippo")
        expect(getSpecies("omnhippo")!.evolution).toBeUndefined()
    })
})

describe("Patience (Karmaki) — puissance dynamique", () => {
    it("le move existe : PSY, spécial, dynamicPower 'lowHp'", () => {
        const m = getMove("patience")!
        expect(m).toBeDefined()
        expect(m.type).toBe("PSY")
        expect(m.effect?.dynamicPower).toBe("lowHp")
    })
    it("Karmaki l'apprend à L66 (capstone Sage Karmique)", () => {
        expect(getSpecies("karmaki")!.learnset.some((l) => l.moveId === "patience" && l.level === 66)).toBe(true)
    })
})

describe("Centrale Psy run 3 — pool de rencontres (RUN3_ZONES.yellow_centrale)", () => {
    const roll = (caught: string[] = []) =>
        rollWildEncounter({ mapId: "yellow_centrale", x: 5, y: 5, leadLevel: 40, run3: true, encounterCount: 999, rng: Math.random, caughtSpecies: caught })

    it("100% PSY : toute espèce tirée contient le type PSY (aucune fuite hors-thème)", () => {
        const seen = new Set<string>()
        for (let i = 0; i < 8000; i++) { const m = roll(); if (m) seen.add(m.speciesId) }
        expect(seen.size).toBeGreaterThan(6)
        for (const id of seen) expect(getSpecies(id)?.types ?? [], id).toContain("PSY")
    })

    it("les 4 inédites finissent par apparaître (Hypnoppo, Téléppo, Karmaki, Omnhippo)", () => {
        const seen = new Set<string>()
        for (let i = 0; i < 30000; i++) { const m = roll(); if (m) seen.add(m.speciesId) }
        for (const id of ["hypnoppo", "teleppo", "karmaki", "omnhippo"]) expect(seen.has(id), id).toBe(true)
    })

    it("Omnhippo = pépite catchOnce : ne repop plus une fois au Pokédex", () => {
        for (let i = 0; i < 20000; i++) expect(roll(["omnhippo"])?.speciesId).not.toBe("omnhippo")
    })
})
