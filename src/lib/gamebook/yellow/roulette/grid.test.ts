import { describe, it, expect } from "vitest"
import { buildTapis, numberAt } from "./tapis"
import type { BetType } from "./bets"
import { pointToZone, dpadMove, zoneToBet } from "./grid"

const TAPIS = buildTapis()
const countByType = (t: BetType) => TAPIS.filter((z) => z.type === t).length

describe("dictionnaire du tapis (layout EU)", () => {
    it("numberAt : rangées haut/milieu/bas correctes", () => {
        expect(numberAt(0, 0)).toBe(3); expect(numberAt(1, 0)).toBe(2); expect(numberAt(2, 0)).toBe(1)
        expect(numberAt(0, 11)).toBe(36); expect(numberAt(2, 11)).toBe(34)
    })
    it("compte exact de chaque type (≈157 zones)", () => {
        expect(countByType("STRAIGHT")).toBe(37)  // 0 + 36
        expect(countByType("SPLIT")).toBe(60)      // 33 H + 24 V + 3 (zéro)
        expect(countByType("STREET")).toBe(14)     // 12 + 2 trios du zéro
        expect(countByType("CORNER")).toBe(23)     // 22 + carré 0-1-2-3
        expect(countByType("SIXLINE")).toBe(11)
        expect(countByType("COLUMN")).toBe(3)
        expect(countByType("DOZEN")).toBe(3)
        expect(["RED", "BLACK", "EVEN", "ODD", "LOW", "HIGH"].reduce((a, t) => a + countByType(t as BetType), 0)).toBe(6)
        expect(TAPIS).toHaveLength(157)
        expect(new Set(TAPIS.map((z) => z.id)).size).toBe(157) // ids uniques
    })
    it("couvertures clés : carré, sixain, colonne, douzaine, carré du zéro", () => {
        const corner = TAPIS.find((z) => z.id === "corner:2-3-5-6")!
        expect(corner.numbers).toEqual([2, 3, 5, 6])
        const six = TAPIS.find((z) => z.type === "SIXLINE" && z.numbers.includes(1))!
        expect(six.numbers.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6])
        expect(TAPIS.find((z) => z.id === "column:3")!.numbers).toContain(36)
        expect(TAPIS.find((z) => z.id === "dozen:1")!.numbers).toEqual(Array.from({ length: 12 }, (_, i) => i + 1))
        expect(TAPIS.find((z) => z.id === "corner:0-1-2-3")!.numbers).toEqual([0, 1, 2, 3])
    })
})

describe("pointToZone (snapping tactile)", () => {
    it("centre d'une case → PLEIN", () => {
        const z = pointToZone(1.5, 0.5, TAPIS)! // centre de la case du 3
        expect(z.type).toBe("STRAIGHT"); expect(z.numbers).toEqual([3])
    })
    it("légèrement au centre → reste PLEIN", () => {
        expect(pointToZone(1.6, 0.6, TAPIS)!.type).toBe("STRAIGHT")
    })
    it("près d'une arête droite → CHEVAL", () => {
        const z = pointToZone(1.95, 0.5, TAPIS)!
        expect(z.type).toBe("SPLIT"); expect(z.numbers).toEqual([3, 6])
    })
    it("près d'un coin → CARRÉ", () => {
        const z = pointToZone(1.96, 0.96, TAPIS)!
        expect(z.type).toBe("CORNER"); expect(z.numbers).toEqual([2, 3, 5, 6])
    })
    it("bandes extérieures : douzaine / colonne / rouge (point-dans-boîte)", () => {
        expect(pointToZone(3, 3.5, TAPIS)!.type).toBe("DOZEN")
        expect(pointToZone(13.5, 0.5, TAPIS)!.id).toBe("column:3")
        expect(pointToZone(6, 4.5, TAPIS)!.type).toBe("RED")
    })
})

describe("dpadMove (navigation double résolution)", () => {
    it("monter depuis le 1 s'arrête sur l'intersection cheval 1-2", () => {
        const id = dpadMove("straight:1", "up", TAPIS)
        const z = TAPIS.find((x) => x.id === id)!
        expect(z.type).toBe("SPLIT"); expect(z.numbers).toEqual([1, 2])
    })
    it("aller à droite depuis le 1 s'arrête sur le cheval 1-4", () => {
        const id = dpadMove("straight:1", "right", TAPIS)
        expect(TAPIS.find((x) => x.id === id)!.numbers).toEqual([1, 4])
    })
    it("zoneToBet attache la mise", () => {
        const z = TAPIS.find((x) => x.id === "straight:17")!
        expect(zoneToBet(z, 25)).toEqual({ type: "STRAIGHT", numbers: [17], chips: 25, zoneId: "straight:17" })
    })
})
