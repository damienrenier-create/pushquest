import { describe, it, expect } from "vitest"
import { hydratePlayer, spendReps, isBallLocked, trackBallLockSpend, getPlayer } from "./playerStore"

// VŒU DU GÉNIE : « ni utiliser ni acheter de Ball tant que 1000⚡ pas dépensées ». Le verrou = ballLockRemaining,
// réduit à CHAQUE dépense de reps ; à 0 il se lève tout seul. (Les gates usage/achat lisent isBallLocked().)
const setup = (lock: number, reps = 5000) => hydratePlayer({ reps, repsCap: 100000, repsBankedTotal: 0, ballLockRemaining: lock })

describe("Vœu du génie — verrou Ball (ballLockRemaining)", () => {
    it("verrou actif tant que remaining > 0", () => {
        setup(1000)
        expect(isBallLocked()).toBe(true)
        expect(getPlayer().ballLockRemaining).toBe(1000)
    })

    it("chaque dépense (spendReps) réduit le verrou, qui se lève à 0", () => {
        setup(1000)
        expect(spendReps(400)).toBe(true)
        expect(getPlayer().ballLockRemaining).toBe(600)
        expect(isBallLocked()).toBe(true)
        expect(spendReps(600)).toBe(true)
        expect(getPlayer().ballLockRemaining).toBe(0)
        expect(isBallLocked()).toBe(false)
    })

    it("le verrou ne descend jamais sous 0 (dépense > restant)", () => {
        setup(100)
        expect(spendReps(999)).toBe(true)
        expect(getPlayer().ballLockRemaining).toBe(0)
        expect(isBallLocked()).toBe(false)
    })

    it("sans verrou (0), dépenser ne crée pas de valeur négative", () => {
        setup(0)
        expect(spendReps(100)).toBe(true)
        expect(getPlayer().ballLockRemaining).toBe(0)
        expect(isBallLocked()).toBe(false)
    })

    it("trackBallLockSpend décrémente aussi (dépenses hors spendReps : casino, CT, super-pasta…)", () => {
        setup(500)
        trackBallLockSpend(200)
        expect(getPlayer().ballLockRemaining).toBe(300)
    })
})
