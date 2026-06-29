import { describe, it, expect } from "vitest"
import { selectRiggedWinning, parseLuck } from "./luck"
import { red, straight } from "./bets"
import { resolveSpin } from "./engine"
import type { Rng } from "../battle/rng"

const yes = { chance: () => true } as unknown as Rng   // le tirage 25% passe toujours
const no = { chance: () => false } as unknown as Rng   // le tirage 25% échoue toujours

describe("roulette — jeton de chance (SÉCURITÉ anti-jackpot)", () => {
    it("luckMax : petite mise → un numéro gagnant, gain net ∈ ]0, cap]", () => {
        const bets = [red(5)] // rouge paie 1:1 → net +5 sur un rouge
        const n = selectRiggedWinning(bets, { kind: "luckMax", cap: 200 }, yes)
        expect(n).not.toBeNull()
        const net = resolveSpin(n!, bets).net
        expect(net).toBeGreaterThan(0)
        expect(net).toBeLessThanOrEqual(200)
    })

    it("luckMax : grosse mise (jackpot potentiel) → AUCUN truquage (null)", () => {
        const bets = [straight(18, 200)] // plein : payout 200×36, net 7000 ≫ cap → interdit
        expect(selectRiggedWinning(bets, { kind: "luckMax", cap: 200 }, yes)).toBeNull()
    })

    it("luckMax : si même le plus petit gain dépasse le cap → null", () => {
        const bets = [red(50)] // net +50 ; cap 40 < 50 → rien d'éligible
        expect(selectRiggedWinning(bets, { kind: "luckMax", cap: 40 }, yes)).toBeNull()
    })

    it("luck25 : ne truque que si le tirage 25% passe", () => {
        const bets = [red(5)]
        expect(selectRiggedWinning(bets, { kind: "luck25", cap: 200 }, no)).toBeNull()
        expect(selectRiggedWinning(bets, { kind: "luck25", cap: 200 }, yes)).not.toBeNull()
    })

    it("parseLuck : valide la forme + borne le cap", () => {
        expect(parseLuck(null)).toBeNull()
        expect(parseLuck("{bad")).toBeNull()
        expect(parseLuck(JSON.stringify({ kind: "luckMax", cap: 200 }))).toEqual({ kind: "luckMax", cap: 200 })
        expect(parseLuck(JSON.stringify({ kind: "x", cap: 5 }))).toBeNull()
        expect(parseLuck(JSON.stringify({ kind: "luck25", cap: -5 }))).toBeNull()
    })
})
