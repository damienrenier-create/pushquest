import { describe, it, expect } from "vitest"
import { computeMensuration, weightModeOf, formatSize, formatWeight, isPhysicalWeight, DEX_SIZE, type DexSize } from "./dexMensurations"
import { SPECIES } from "./species"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"

const IV = (v: number) => ({ hp: v, atk: v, def: v, spe: v, spc: v })
const R: DexSize = { size: [1, 2], weight: [10, 50], quip: "" }

describe("Mensurations dynamiques", () => {
    it("TAILLE ∝ moyenne des IV (0 → min, 15 → max)", () => {
        const phys = { hp: 100, atk: 100, def: 100, spe: 10, spc: 10 }
        expect(computeMensuration(R, IV(0), phys).sizeM).toBeCloseTo(1, 5)
        expect(computeMensuration(R, IV(15), phys).sizeM).toBeCloseTo(2, 5)
        expect(computeMensuration(R, IV(7.5), phys).sizeM).toBeCloseTo(1.5, 5)
    })

    it("archétype PHYSIQUE : IV parfaits → poids MAX (montagne de muscle)", () => {
        const phys = { hp: 100, atk: 100, def: 100, spe: 10, spc: 10 }
        expect(computeMensuration(R, IV(0), phys).weightKg).toBeCloseTo(10, 5)
        expect(computeMensuration(R, IV(15), phys).weightKg).toBeCloseTo(50, 5)
        expect(computeMensuration(R, IV(15), phys).physical).toBe(true)
    })

    it("archétype VITESSE/SPÉ : IV parfaits → poids MIN (aérodynamique)", () => {
        const spd = { hp: 10, atk: 10, def: 10, spe: 100, spc: 100 }
        expect(computeMensuration(R, IV(0), spd).weightKg).toBeCloseTo(50, 5)  // IV nuls → lourd
        expect(computeMensuration(R, IV(15), spd).weightKg).toBeCloseTo(10, 5) // IV parfaits → léger
        expect(computeMensuration(R, IV(15), spd).physical).toBe(false)
    })

    it("override weightMode prime sur les stats de base", () => {
        const physStats = { hp: 100, atk: 100, def: 100, spe: 10, spc: 10 } // dérivé = physique
        expect(isPhysicalWeight(physStats)).toBe(true)
        const rOverride: DexSize = { ...R, weightMode: "special" }
        expect(weightModeOf(rOverride, physStats)).toBe("special")
        expect(computeMensuration(rOverride, IV(15), physStats).weightKg).toBeCloseTo(10, 5) // léger malgré stats physiques
    })

    it("formatage taille/poids (cm/m, g/kg/t)", () => {
        expect(formatSize(0.35)).toBe("35 cm")
        expect(formatSize(1.47)).toBe("1.47 m")
        expect(formatSize(18.4)).toBe("18.4 m")
        expect(formatWeight(0.34)).toBe("340 g")
        expect(formatWeight(42.3)).toBe("42.3 kg")
        expect(formatWeight(12500)).toBe("12.5 t")
    })

    it("COUVERTURE : toutes les espèces ont des mensurations valides + dans l'échelle (0.05 m – 50 m)", () => {
        const all = [...Object.values(SPECIES), ...FUSION_BASE_SPECIES]
        const missing = all.filter((s) => !(s.id in DEX_SIZE)).map((s) => s.id)
        expect(missing, `sans mensurations: ${missing.join(", ")}`).toEqual([])
        expect(Object.keys(DEX_SIZE).length).toBe(all.length)
        for (const [id, r] of Object.entries(DEX_SIZE)) {
            expect(r.size[0], `size min<max ${id}`).toBeLessThan(r.size[1])
            expect(r.weight[0], `weight min<max ${id}`).toBeLessThan(r.weight[1])
            expect(r.size[0], `échelle min ${id}`).toBeGreaterThanOrEqual(0.05)
            expect(r.size[1], `échelle max ${id}`).toBeLessThanOrEqual(50)
            expect(r.quip.length, `quip ${id}`).toBeGreaterThan(10)
        }
    })
})
