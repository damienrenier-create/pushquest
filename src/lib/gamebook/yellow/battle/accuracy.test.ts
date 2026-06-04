import { describe, it, expect } from "vitest"
import { hitChance, accuracyCheck } from "./accuracy"
import { neutralStages } from "./types"
import type { BattleMon, MoveData, StatStages } from "./types"
import { Rng } from "./rng"

// Combattant minimal : hitChance/accuracyCheck ne lisent que .stages.acc / .stages.eva.
function mon(stages: Partial<StatStages> = {}): BattleMon {
    return { stages: { ...neutralStages(), ...stages } } as BattleMon
}

const move = (accuracy: number): MoveData => ({
    id: "m", name: "Test", type: "NORMAL", power: 40, accuracy, pp: 20,
})

describe("hitChance (Précision × stage précision × stage esquive)", () => {
    it("précision pure quand aucun stage", () => {
        expect(hitChance(move(100), mon(), mon())).toBe(100)
        expect(hitChance(move(70), mon(), mon())).toBe(70)
    })

    it("l'esquive adverse (+1) réduit la précision (×3/4)", () => {
        expect(hitChance(move(100), mon(), mon({ eva: 1 }))).toBeCloseTo(75, 6)
    })

    it("la précision de l'attaquant (+1) augmente le taux (×4/3)", () => {
        expect(hitChance(move(100), mon({ acc: 1 }), mon())).toBeCloseTo(400 / 3, 6)
    })

    it("acc et eva se composent", () => {
        // +1 acc (×4/3) et +1 eva adverse (×3/4) → s'annulent.
        expect(hitChance(move(90), mon({ acc: 1 }), mon({ eva: 1 }))).toBeCloseTo(90, 6)
    })

    it("précision <= 0 = coup garanti (Infinity)", () => {
        expect(hitChance(move(0), mon(), mon())).toBe(Infinity)
    })
})

describe("accuracyCheck (jet de précision, RNG seedé)", () => {
    it("coup garanti touche toujours, quel que soit le RNG", () => {
        for (let s = 0; s < 20; s++) {
            expect(accuracyCheck(move(0), mon(), mon(), new Rng(s))).toBe(true)
        }
    })

    it("précision >= 100 touche toujours", () => {
        for (let s = 0; s < 20; s++) {
            expect(accuracyCheck(move(100), mon(), mon(), new Rng(s))).toBe(true)
        }
    })

    it("est déterministe pour une même seed", () => {
        const a = accuracyCheck(move(50), mon(), mon(), new Rng(99))
        const b = accuracyCheck(move(50), mon(), mon(), new Rng(99))
        expect(a).toBe(b)
    })

    it("respecte statistiquement la probabilité (~50% sur 2000 jets seedés)", () => {
        let hits = 0
        const N = 2000
        const rng = new Rng(2024) // un seul flux seedé → reproductible
        for (let i = 0; i < N; i++) if (accuracyCheck(move(50), mon(), mon(), rng)) hits++
        // tolérance large : on vérifie l'ordre de grandeur, pas une valeur exacte.
        expect(hits / N).toBeGreaterThan(0.42)
        expect(hits / N).toBeLessThan(0.58)
    })
})
