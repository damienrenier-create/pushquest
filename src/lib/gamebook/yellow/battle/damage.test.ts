import { describe, it, expect } from "vitest"
import { computeDamage, hasStab, critProbabilityGen1, type DamageInput } from "./damage"

// Cas de référence calculé à la main avec la formule Gen 1 :
// base = floor(floor(floor(2*lvl/5 + 2) * power * atk / def) / 50) + 2
// lvl=50, power=80, atk=100, def=100 → 22 ; *80*100/100 = 1760 ; /50 = 35 ; +2 = 37.
const REF: DamageInput = {
    level: 50, power: 80, attack: 100, defense: 100,
    stab: false, typeEff: 1, isCrit: false, randomFactor: 1,
}

describe("computeDamage (formule Gen 1)", () => {
    it("calcule le dégât de base sans modificateur", () => {
        expect(computeDamage(REF).damage).toBe(37)
        expect(computeDamage(REF).breakdown.base).toBe(37)
    })

    it("applique le STAB ×1.5 (tronqué)", () => {
        // floor(37 * 1.5) = 55
        expect(computeDamage({ ...REF, stab: true }).damage).toBe(55)
    })

    it("applique le critique ×2 (Gen 1)", () => {
        expect(computeDamage({ ...REF, isCrit: true }).damage).toBe(74)
        expect(computeDamage({ ...REF, isCrit: true }).breakdown.afterCrit).toBe(74)
    })

    it("applique l'efficacité de type (super efficace ×2, résisté ×0.5)", () => {
        expect(computeDamage({ ...REF, typeEff: 2 }).damage).toBe(74)
        expect(computeDamage({ ...REF, typeEff: 0.5 }).damage).toBe(18) // floor(37*0.5)=18
    })

    it("renvoie 0 si le type est sans effet (×0)", () => {
        const r = computeDamage({ ...REF, typeEff: 0 })
        expect(r.damage).toBe(0)
    })

    it("renvoie 0 pour un move de statut (power <= 0)", () => {
        expect(computeDamage({ ...REF, power: 0 }).damage).toBe(0)
    })

    it("applique le facteur aléatoire 0.85..1.00", () => {
        expect(computeDamage({ ...REF, randomFactor: 0.85 }).damage).toBe(31) // floor(37*0.85)=31
    })

    it("garantit un minimum de 1 dégât quand le coup touche", () => {
        // Attaquant ridicule contre un mur, mais l'attaque touche (typeEff>0).
        const r = computeDamage({
            level: 1, power: 10, attack: 1, defense: 255,
            stab: false, typeEff: 0.25, isCrit: false, randomFactor: 0.85,
        })
        expect(r.damage).toBe(1)
    })

    it("combine crit + STAB + super efficace dans le bon ordre", () => {
        // 37 → crit ×2 = 74 → STAB ×1.5 = 111 → type ×2 = 222.
        const r = computeDamage({ ...REF, isCrit: true, stab: true, typeEff: 2 })
        expect(r.breakdown.afterCrit).toBe(74)
        expect(r.breakdown.afterStab).toBe(111)
        expect(r.breakdown.afterType).toBe(222)
        expect(r.damage).toBe(222)
    })
})

describe("hasStab", () => {
    it("vrai si le type du move est dans les types de l'attaquant", () => {
        expect(hasStab("FEU", ["FEU", "VOL"])).toBe(true)
        expect(hasStab("EAU", ["FEU", "VOL"])).toBe(false)
    })
})

describe("critProbabilityGen1", () => {
    it("normale = floor(baseSpeed/2)/256", () => {
        expect(critProbabilityGen1(100)).toBeCloseTo(50 / 256, 6)
    })
    it("move haute-crit ×8, plafonné à 255/256", () => {
        expect(critProbabilityGen1(100, true)).toBeCloseTo(255 / 256, 6)
        expect(critProbabilityGen1(20, true)).toBeCloseTo(80 / 256, 6) // floor(10)*8=80
    })
})
