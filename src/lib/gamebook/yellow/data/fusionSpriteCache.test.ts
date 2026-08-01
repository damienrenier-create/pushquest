import { describe, it, expect } from "vitest"
import { fusionPairKey, canonicalPair, canGenerate, nextStatusAfterAttempt, withinTotalBudget, MAX_ATTEMPTS } from "./fusionSpriteCache"

describe("fusionSpriteCache — logique pure", () => {
    it("pairKey est ORDRE-INDÉPENDANT (A+B == B+A)", () => {
        expect(fusionPairKey("divinpate", "razmaree")).toBe(fusionPairKey("razmaree", "divinpate"))
        expect(fusionPairKey("aaa", "bbb")).toBe("aaa__bbb")
        expect(canonicalPair("razmaree", "divinpate")).toEqual(["divinpate", "razmaree"])
    })

    it("canGenerate : absente=oui, PENDING<MAX=oui, READY/FAILED=non, PENDING atteignant MAX=non", () => {
        expect(canGenerate(null)).toBe(true)
        expect(canGenerate({ status: "PENDING", attempts: 0 })).toBe(true)
        expect(canGenerate({ status: "PENDING", attempts: MAX_ATTEMPTS })).toBe(false)
        expect(canGenerate({ status: "READY", attempts: 1 })).toBe(false)
        expect(canGenerate({ status: "FAILED", attempts: 2 })).toBe(false)
    })

    it("nextStatusAfterAttempt : succès→READY ; échec→PENDING puis FAILED au bout de MAX", () => {
        expect(nextStatusAfterAttempt(0, true)).toEqual({ status: "READY", attempts: 1 })
        expect(nextStatusAfterAttempt(0, false)).toEqual({ status: "PENDING", attempts: 1 })
        expect(nextStatusAfterAttempt(1, false)).toEqual({ status: "FAILED", attempts: 2 }) // 2e échec = abandon définitif
    })

    it("withinTotalBudget : borne le coût total à vie", () => {
        expect(withinTotalBudget(0, 250)).toBe(true)
        expect(withinTotalBudget(249, 250)).toBe(true)
        expect(withinTotalBudget(250, 250)).toBe(false)
        expect(withinTotalBudget(999, 250)).toBe(false)
    })
})
