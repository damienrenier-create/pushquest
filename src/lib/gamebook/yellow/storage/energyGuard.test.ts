import { describe, it, expect } from "vitest"
import { energyGuard, ENERGY_SOFT_MULT } from "./saveGuard"

// GARDE ANTI-TRICHE ÉNERGIE : plafonne reps à 2× le cap (invariant universel) + trace les hausses suspectes.
// Règle d'or : NE JAMAIS léser un joueur honnête (reps ≤ 2×cap toujours vrai en jeu → jamais de faux plafonnement).

const S = (reps: number, repsCap: number) => ({ reps, repsCap })

describe("energyGuard — plafond dur (reps ≤ 2× cap)", () => {
    it("reps sous le cap dur → RAS (aucun plafond, aucune trace)", () => {
        expect(energyGuard(S(500, 1000), S(900, 1000))).toEqual({ clampedReps: null, audit: null })
    })
    it("reps dans la zone SOUPLE (cap < reps ≤ 2×cap) → LÉGITIME, pas de plafond (grantRepsSoftCap)", () => {
        expect(energyGuard(S(1000, 1000), S(1800, 1000))).toEqual({ clampedReps: null, audit: null }) // 1.8×cap, ok
        expect(energyGuard(S(1000, 1000), S(2000, 1000))).toEqual({ clampedReps: null, audit: null }) // pile 2×cap, ok
    })
    it("reps > 2×cap → PLAFONNÉ à 2×cap + trace", () => {
        const r = energyGuard(S(1000, 1000), S(50000, 1000))
        expect(r.clampedReps).toBe(1000 * ENERGY_SOFT_MULT) // 2000
        expect(r.audit).toMatch(/energy-clamp/)
    })
    it("cap 0 (save neuve/vide) → aucun plafond (évite de plafonner à 0)", () => {
        expect(energyGuard(S(0, 0), S(0, 0))).toEqual({ clampedReps: null, audit: null })
    })
})

describe("energyGuard — trace des hausses suspectes (sans plafonner)", () => {
    it("grosse hausse SANS relèvement de cap, au-dessus du cap → TRACE (mais pas de plafond, sous 2×cap)", () => {
        // ex. Tom : 11250 → 21250 (+10000), cap inchangé 11250, reps > cap mais < 2×cap
        const r = energyGuard(S(11250, 11250), S(21250, 11250))
        expect(r.clampedReps).toBeNull()          // pas plafonné (21250 < 22500)
        expect(r.audit).toMatch(/energy-audit/)   // mais tracé pour revue
    })
    it("don légitime qui RELÈVE le cap (world start / anniversaire) → PAS de trace", () => {
        // cap monte de 11250 → 21250 (+10000 world start / uncapped) : reps suit, aucune alerte
        expect(energyGuard(S(11250, 11250), S(21250, 21250))).toEqual({ clampedReps: null, audit: null })
    })
    it("hausse modérée sous le cap → PAS de trace (cadeaux capés normaux)", () => {
        expect(energyGuard(S(2000, 11250), S(9000, 11250))).toEqual({ clampedReps: null, audit: null }) // +7000 mais reps < cap
    })
    it("1er enregistrement (prev absent) avec don de départ fun (cap monte) → RAS", () => {
        expect(energyGuard(null, S(10000, 10000))).toEqual({ clampedReps: null, audit: null })
    })
})
