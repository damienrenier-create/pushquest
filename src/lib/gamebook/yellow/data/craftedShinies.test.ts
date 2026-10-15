import { describe, it, expect } from "vitest"
import { CRAFTED_SHINY_IDS, CRAFTED_SHINY_CHANCE, craftedShinyUnlocked, rollCraftedShiny } from "./craftedShinies"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// SHINY CRAFTÉS — la règle pure. Trois choses à tenir : la porte (Dôme Fusion atteint, pas avant), le taux
// (« hyper rare, mais moins qu'un shiny » : 1/256 pour le groupe contre 1/512), et l'équité entre les quatre.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("la porte : avoir atteint le Dôme Fusion", () => {
    it("prologue de l'Autel vu → éligible ; épreuve gagnée → éligible ; rien → non", () => {
        expect(craftedShinyUnlocked((m) => m === "fusion_prologue_seen")).toBe(true)
        expect(craftedShinyUnlocked((m) => m === "fusion_unlocked")).toBe(true)
        expect(craftedShinyUnlocked(() => false)).toBe(false)
        expect(craftedShinyUnlocked((m) => m === "fusleague_or"), "l'or seul ne suffit pas (il implique le reste, mais la porte est l'arrivée)").toBe(false)
    })
})

describe("le taux", () => {
    it("1/256 : plus rare que tout, moins qu'un shiny (1/512)", () => {
        expect(CRAFTED_SHINY_CHANCE).toBe(1 / 256)
        expect(CRAFTED_SHINY_CHANCE).toBeGreaterThan(1 / 512)
    })

    it("sur 1 000 000 de jets déterministes, ~1/256 sortent (et jamais plus de 2 jets consommés)", () => {
        let x = 12345
        const rng = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296 }
        let hits = 0
        for (let i = 0; i < 1_000_000; i++) if (rollCraftedShiny(rng)) hits++
        expect(hits / 1_000_000).toBeGreaterThan(1 / 256 * 0.85)
        expect(hits / 1_000_000).toBeLessThan(1 / 256 * 1.15)
    })

    it("raté → un seul jet consommé ; réussi → deux (le second choisit la lignée)", () => {
        let n = 0
        rollCraftedShiny(() => { n++; return 0.99 }); expect(n).toBe(1)
        n = 0
        expect(rollCraftedShiny(() => { n++; return 0 })).toBe(CRAFTED_SHINY_IDS[0]); expect(n).toBe(2)
    })
})

describe("l'équité entre les quatre", () => {
    it("les 4 lignées sortent, et à parts égales (±15 %)", () => {
        let x = 777
        const rng = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296 }
        const counts: Record<string, number> = {}
        for (let i = 0; i < 2_000_000; i++) { const p = rollCraftedShiny(rng); if (p) counts[p] = (counts[p] ?? 0) + 1 }
        const total = Object.values(counts).reduce((a, b) => a + b, 0)
        for (const id of CRAFTED_SHINY_IDS) {
            expect(counts[id], id).toBeGreaterThan(0)
            expect(counts[id] / total, id).toBeGreaterThan(0.25 * 0.85)
            expect(counts[id] / total, id).toBeLessThan(0.25 * 1.15)
        }
    })

    it("un rng défaillant ne sort jamais du tableau", () => {
        expect(CRAFTED_SHINY_IDS).toContain(rollCraftedShiny(() => 0))
        let k = 0
        expect(CRAFTED_SHINY_IDS).toContain(rollCraftedShiny(() => (k++ === 0 ? 0 : 0.999999)))
    })
})
