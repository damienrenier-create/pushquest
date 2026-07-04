import { describe, it, expect } from "vitest"
import { applyFirstGameCheat, firstGameClawback, settleFirstGame, FIRST_GAME_GIFT, FIRST_GAME_CHEAT_CAP } from "./soloSession"

describe("poker — 1re partie (solo, house-funded)", () => {
    it("constantes attendues", () => {
        expect(FIRST_GAME_GIFT).toBe(100)
        expect(FIRST_GAME_CHEAT_CAP).toBe(1000)
    })

    describe("triche plafond (applyFirstGameCheat)", () => {
        it("sous le plafond : rien repris", () => {
            expect(applyFirstGameCheat(100)).toEqual({ stack: 100, taken: 0 })
            expect(applyFirstGameCheat(1000)).toEqual({ stack: 1000, taken: 0 })
        })
        it("au-dessus : plafonné à 1000, excédent repris", () => {
            expect(applyFirstGameCheat(1200)).toEqual({ stack: 1000, taken: 200 })
            expect(applyFirstGameCheat(5000)).toEqual({ stack: 1000, taken: 4000 })
        })
    })

    describe("clawback à la sortie (firstGameClawback)", () => {
        it("tapis ≤ 200 : rien à rendre, on garde tout", () => {
            expect(firstGameClawback(0)).toEqual({ repay: 0, kept: 0 })
            expect(firstGameClawback(100)).toEqual({ repay: 0, kept: 100 })
            expect(firstGameClawback(200)).toEqual({ repay: 0, kept: 200 })
        })
        it("200 < tapis ≤ 500 : rends 100", () => {
            expect(firstGameClawback(201)).toEqual({ repay: 100, kept: 101 })
            expect(firstGameClawback(300)).toEqual({ repay: 100, kept: 200 })
            expect(firstGameClawback(500)).toEqual({ repay: 100, kept: 400 })
        })
        it("tapis > 500 : rends 200 (intérêts)", () => {
            expect(firstGameClawback(501)).toEqual({ repay: 200, kept: 301 })
            expect(firstGameClawback(1000)).toEqual({ repay: 200, kept: 800 })
        })
    })

    describe("règlement complet (settleFirstGame) : plafond PUIS clawback", () => {
        it("perdu : garde 0 (aucune perte réelle)", () => {
            expect(settleFirstGame(0)).toEqual({ capped: 0, cheatTaken: 0, repay: 0, kept: 0 })
        })
        it("petit gain sous 200 : garde tout, house-funded", () => {
            expect(settleFirstGame(150)).toEqual({ capped: 150, cheatTaken: 0, repay: 0, kept: 150 })
        })
        it("gros gain : plafonné 1000 puis −200 → garde 800 (maximum absolu)", () => {
            expect(settleFirstGame(3000)).toEqual({ capped: 1000, cheatTaken: 2000, repay: 200, kept: 800 })
        })
        it("gain moyen 600 : pas de triche, −200 → garde 400", () => {
            expect(settleFirstGame(600)).toEqual({ capped: 600, cheatTaken: 0, repay: 200, kept: 400 })
        })
        it("le kept ne dépasse JAMAIS 800 (cap 1000 − intérêts 200)", () => {
            for (const s of [0, 50, 200, 201, 500, 501, 999, 1000, 1001, 9999]) {
                expect(settleFirstGame(s).kept).toBeLessThanOrEqual(800)
            }
        })
    })
})
