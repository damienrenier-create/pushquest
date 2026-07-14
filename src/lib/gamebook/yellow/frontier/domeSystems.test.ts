import { describe, it, expect } from "vitest"
import { DOME_BUDGETS, maxUnlockedTier, roundBudget, distributeDomeTraining } from "./domeBudgets"
import { DOME_BLINDS, clampBet, sizePct, domeEnergyRefund, domeJcReward, domeFinalPlacement } from "./domeEconomy"
import { DOME_TIERS } from "./domeTypes"

describe("Dôme — budgets & escalade", () => {
    it("les 5 tiers ont un budget, EV ≤ 510, difficulté croissante", () => {
        let prevStreak = -1, prevLevel = -1
        for (const t of DOME_TIERS) {
            const b = DOME_BUDGETS[t]
            expect(b.evPerMon).toBeLessThanOrEqual(510)
            expect(b.streak).toBeGreaterThan(prevStreak) // difficulté monte
            expect(b.level).toBeGreaterThanOrEqual(prevLevel)
            prevStreak = b.streak; prevLevel = b.level
        }
    })

    it("maxUnlockedTier : déblocage par titres", () => {
        expect(maxUnlockedTier(0)).toBe("BRONZE")
        expect(maxUnlockedTier(1)).toBe("ARGENT")
        expect(maxUnlockedTier(2)).toBe("ARGENT")
        expect(maxUnlockedTier(3)).toBe("OR")
        expect(maxUnlockedTier(6)).toBe("DIAMANT")
        expect(maxUnlockedTier(10)).toBe("MAITRE")
        expect(maxUnlockedTier(999)).toBe("MAITRE")
    })

    it("distributeDomeTraining : EV plafonné 252/stat & ≤510 total ; budget 0 = aucun entraînement", () => {
        const bs = { hp: 80, atk: 120, def: 70, spe: 90, spc: 60 } // atk > spc → offensif = atk
        const t = distributeDomeTraining(bs, 510, 36)
        const evTotal = Object.values(t.ev).reduce((s, v) => s + (v ?? 0), 0)
        expect(evTotal).toBeLessThanOrEqual(510)
        for (const v of Object.values(t.ev)) expect(v ?? 0).toBeLessThanOrEqual(252)
        expect(t.ev.atk ?? 0).toBeGreaterThan(0) // EV sur la stat offensive
        expect((t.allocated.atk ?? 0) + (t.allocated.hp ?? 0)).toBeGreaterThan(0) // Saiyan alloué
        const zero = distributeDomeTraining(bs, 0, 0)
        expect(Object.values(zero.ev).reduce((s, v) => s + (v ?? 0), 0)).toBe(0)
        expect(Object.values(zero.allocated).reduce((s, v) => s + (v ?? 0), 0)).toBe(0)
    })

    it("roundBudget : la finale (round 2) durcit + relève l'IA ; le quart (0) = base ; EV plafonné 510", () => {
        const base = DOME_BUDGETS.OR
        expect(roundBudget(base, 0)).toEqual(base)
        const fin = roundBudget(base, 2)
        expect(fin.evPerMon).toBeGreaterThan(base.evPerMon)
        expect(fin.saiyanPerMon).toBeGreaterThan(base.saiyanPerMon)
        expect(fin.streak).toBeGreaterThan(base.streak)
        expect(fin.aiLevel).toBe("hof") // ace → hof en finale
        // EV plafonné même sur un tier déjà à 510
        expect(roundBudget(DOME_BUDGETS.MAITRE, 2).evPerMon).toBe(510)
    })
})

describe("Dôme — économie poker (faucet-safe)", () => {
    it("sizePct : 1⚡→1 % … 500⚡→100 %, monotone", () => {
        expect(sizePct(1)).toBeCloseTo(1, 5)
        expect(sizePct(500)).toBeCloseTo(100, 5)
        expect(sizePct(250)).toBeGreaterThan(sizePct(50))
    })

    it("remboursement : jamais > mise (faucet-safe) ; barème 500⚡", () => {
        expect(domeEnergyRefund(500, 1)).toBe(500) // 100 %
        expect(domeEnergyRefund(500, 2)).toBe(350) // 70 %
        expect(domeEnergyRefund(500, 3)).toBe(250) // 50 % (demi)
        expect(domeEnergyRefund(500, 4)).toBe(125) // 25 % (quart)
        expect(domeEnergyRefund(500, 0)).toBe(0)   // éliminé
        expect(domeEnergyRefund(1, 1)).toBe(0)     // petite mise → ~0 (1 %)
        // INVARIANT dur : on ne rend JAMAIS plus que la mise
        for (const bet of [1, 20, 75, 150, 300, 500, 999]) {
            for (const p of [1, 2, 3, 4] as const) expect(domeEnergyRefund(bet, p)).toBeLessThanOrEqual(bet)
        }
    })

    it("Jetons ∝ mise et tier ; classement module ; 0 si éliminé", () => {
        expect(domeJcReward(20, "BRONZE", 1)).toBe(4)
        expect(domeJcReward(150, "OR", 1)).toBe(75)
        expect(domeJcReward(500, "MAITRE", 1)).toBe(500)
        expect(domeJcReward(500, "MAITRE", 2)).toBe(200)
        expect(domeJcReward(500, "MAITRE", 0)).toBe(0)
        // plus tu mises, plus tu gagnes ; plus le tier est haut, plus tu gagnes
        expect(domeJcReward(300, "MAITRE", 1)).toBeGreaterThan(domeJcReward(100, "MAITRE", 1))
        expect(domeJcReward(100, "MAITRE", 1)).toBeGreaterThan(domeJcReward(100, "BRONZE", 1))
    })

    it("domeFinalPlacement : victoire→1er, sinon quart(0)→4e / demi(1)→3e / finale(2)→2e ; + faucet-safe de bout en bout", () => {
        expect(domeFinalPlacement(true, 2)).toBe(1)  // champion
        expect(domeFinalPlacement(false, 2)).toBe(2) // perd la finale
        expect(domeFinalPlacement(false, 1)).toBe(3) // éliminé en demi
        expect(domeFinalPlacement(false, 0)).toBe(4) // éliminé en quart
        // bout en bout : quel que soit le round/issue, le remboursement ne dépasse JAMAIS la mise (énergie réelle)
        for (const bet of [1, 30, 150, 300, 500]) {
            for (const [won, round] of [[true, 2], [false, 2], [false, 1], [false, 0]] as const) {
                const p = domeFinalPlacement(won, round)
                expect(domeEnergyRefund(bet, p)).toBeLessThanOrEqual(bet)
            }
        }
    })

    it("clampBet : borné par les blinds du tier ET la bourse", () => {
        expect(clampBet(9999, "OR", 9999)).toBe(DOME_BLINDS.OR.max) // plafond tier
        expect(clampBet(0, "OR", 9999)).toBe(DOME_BLINDS.OR.min)    // plancher tier
        expect(clampBet(9999, "MAITRE", 120)).toBe(120)             // borné par la bourse
        // bourse insuffisante pour la mise MINIMALE du tier → 0 (« ne peut pas miser »), jamais le plancher
        expect(clampBet(20, "BRONZE", 0)).toBe(0)
        expect(clampBet(75, "ARGENT", 3)).toBe(0)
        expect(clampBet(20, "BRONZE", -5)).toBe(0)
    })
})
