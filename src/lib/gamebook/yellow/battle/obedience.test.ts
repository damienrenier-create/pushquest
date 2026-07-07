import { describe, it, expect } from "vitest"
import { obedienceCap, disobeyChance, mayDisobey, MAX_OBEDIENCE_BADGES } from "./obedience"

describe("obéissance — cap par badge + proba de désobéissance", () => {
    it("le cap de niveau monte avec les badges (0→20 … 5→100)", () => {
        expect(obedienceCap(0)).toBe(20)
        expect(obedienceCap(1)).toBe(35)
        expect(obedienceCap(2)).toBe(50)
        expect(obedienceCap(3)).toBe(65)
        expect(obedienceCap(4)).toBe(80)
        expect(obedienceCap(5)).toBe(100)
        expect(obedienceCap(MAX_OBEDIENCE_BADGES)).toBe(100)
        expect(obedienceCap(9)).toBe(100) // borné
    })

    it("proba de désobéir : 0 sous le cap, ~4%/niveau au-dessus, plafond 50 %", () => {
        expect(disobeyChance(30, 35)).toBe(0)    // sous le cap
        expect(disobeyChance(35, 35)).toBe(0)    // pile au cap
        expect(disobeyChance(40, 35)).toBe(20)   // +5 → 20 %
        expect(disobeyChance(50, 35)).toBe(50)   // +15 → 60 plafonné à 50 %
        expect(disobeyChance(100, 20)).toBe(50)  // plafond
    })

    it("mayDisobey : UNIQUEMENT les Daemons échangés au-dessus de leur cap", () => {
        expect(mayDisobey(true, 50, 1)).toBe(true)    // échangé L50, 1 badge (cap 35) → oui
        expect(mayDisobey(true, 30, 1)).toBe(false)   // échangé sous le cap → non
        expect(mayDisobey(false, 90, 0)).toBe(false)  // capturé soi-même → JAMAIS
        expect(mayDisobey(undefined, 90, 0)).toBe(false)
        expect(mayDisobey(true, 90, 5)).toBe(false)   // 5 badges → cap 100 → obéit toujours
    })
})
