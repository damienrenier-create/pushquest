import { describe, it, expect } from "vitest"
import { setWildCtx, combatLockedByDebt, pushupDebtRemaining } from "./playerStore"

// VŒU GÉNIE (Mools) — Phase A : le verrou de combat lit `wildCtx.pushupDebt` (server-authoritative).
// Inerte tant que le serveur ne pose pas de dette (champ absent = 0 = combat libre).
const ctx = (pushupDebt?: number) => ({ pompes: 0, squats: 0, quotaReached: false, overshoot: 0, quotaRatio: 0, pushupDebt })

describe("Verrou de combat par dette de pompes (vœu génie Mools)", () => {
    it("aucune dette (ctx null, ou pushupDebt absent/0) → combat LIBRE", () => {
        setWildCtx(null)
        expect(combatLockedByDebt()).toBe(false)
        expect(pushupDebtRemaining()).toBe(0)
        setWildCtx(ctx(undefined))
        expect(combatLockedByDebt()).toBe(false)
        setWildCtx(ctx(0))
        expect(combatLockedByDebt()).toBe(false)
    })

    it("dette > 0 → combat VERROUILLÉ, nb de pompes restant lisible", () => {
        setWildCtx(ctx(300))
        expect(pushupDebtRemaining()).toBe(300)
        expect(combatLockedByDebt()).toBe(true)
    })

    it("dette épongée (retour à 0) → combat re-LIBRE", () => {
        setWildCtx(ctx(100))
        expect(combatLockedByDebt()).toBe(true)
        setWildCtx(ctx(0))
        expect(combatLockedByDebt()).toBe(false)
        setWildCtx(null)
    })
})
