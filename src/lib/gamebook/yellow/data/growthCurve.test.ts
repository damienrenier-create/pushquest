import { describe, it, expect } from "vitest"
import { SPECIES } from "./species"
import { growthInfo, growthMult } from "./growthCurve"
import { expForLevel, levelFromExp } from "../battle/xp"

const VALID_MULTS = [0.8, 0.9, 1.0, 1.1, 1.25]

describe("growthCurve — courbe de progression par espèce (BST final + flag exclusif)", () => {
    it("classe TOUTES les espèces (aucune oubliée, multiplicateur valide)", () => {
        for (const sp of Object.values(SPECIES)) {
            const info = growthInfo(sp.id)
            expect(VALID_MULTS, `${sp.id} mult=${info.mult}`).toContain(info.mult)
            expect(info.mult).toBeGreaterThan(0)
            expect(info.bst).toBeGreaterThan(0)
        }
    })

    it("seuils par BST final : colossal ≥500 / puissant ≥460 / solide ≥435 / modeste ≥400 / frêle <400", () => {
        expect(growthInfo("megalithe").tier).toBe("colossal") // 535
        expect(growthInfo("megalithe").mult).toBe(1.25)
        expect(growthInfo("cornaissant").tier).toBe("modeste") // final 426
        expect(growthInfo("cornaissant").mult).toBe(0.9)
        expect(growthInfo("hibouh").tier).toBe("frele") // final 396
        expect(growthInfo("hibouh").mult).toBe(0.8)
    })

    it("lignée golem = courbe PAR STADE : faible monte vite (Mottoche ×0.80), grind au sommet (Mégalithe ×1.25)", () => {
        expect(SPECIES["mottoche"].rarity).toBe("COMMON")
        expect(growthInfo("mottoche").byStage).toBe(true)
        expect(growthInfo("mottoche").tier).toBe("frele") // BST courant 156 (et NON le final 535)
        expect(growthMult("mottoche")).toBe(0.8)
        expect(growthInfo("diamantine").tier).toBe("frele") // 394
        expect(growthInfo("amadiam").tier).toBe("solide") // 446 — le grind commence à ramper
        expect(growthInfo("golemini").tier).toBe("puissant") // 492
        expect(growthInfo("megalithe").tier).toBe("colossal") // 535 — sommet
        expect(growthMult("megalithe")).toBe(1.25)
    })

    it("hors lignée golem, un commun fort garde le BST FINAL (Colibraise → solide, pas frêle)", () => {
        expect(SPECIES["colibraise"].rarity).toBe("COMMON")
        expect(growthInfo("colibraise").byStage).toBe(false)
        expect(growthInfo("colibraise").tier).toBe("solide") // final 456, même si sa base fait 252
    })

    it("exclusif = plancher ×1.10, mais le BST peut pousser plus haut", () => {
        // Goshendofy (exclusif + BST 590) → colossal ×1.25 (le BST gagne).
        expect(growthInfo("goshendofy").exclusive).toBe(true)
        expect(growthInfo("goshendofy").tier).toBe("colossal")
        expect(growthMult("goshendofy")).toBe(1.25)
        // Orcaline / Sylvebarbe (exclusifs + puissants 460-499) → ×1.10.
        expect(growthMult("orcaline")).toBe(1.1)
        expect(growthMult("sylvebarbe")).toBe(1.1)
        // Tonytony (exclusif + BST 415 = modeste) → le plancher RELÈVE 0.90 → 1.10.
        expect(growthInfo("tonytony").tier).toBe("modeste")
        expect(growthInfo("tonytony").exclusive).toBe(true)
        expect(growthMult("tonytony")).toBe(1.1)
        // Gékroc (exclusif + BST 410 = modeste) → plancher → 1.10.
        expect(growthMult("gekroc")).toBe(1.1)
    })

    it("future-proof : espèce inconnue → solide ×1.0 (jamais de crash)", () => {
        expect(growthMult("daemon_inexistant_xyz")).toBe(1.0)
        expect(growthInfo("daemon_inexistant_xyz").tier).toBe("solide")
    })

    it("scale bien l'XP NÉCESSAIRE (et NON l'XP gagnée)", () => {
        const base = expForLevel(50) // courbe de référence ×1.0
        expect(expForLevel(50, "megalithe")).toBe(Math.round(base * 1.25)) // colosse = plus d'XP
        expect(expForLevel(50, "hibouh")).toBe(Math.round(base * 0.8)) // frêle = moins d'XP
        // niveau 1 = 0 XP quelle que soit la courbe.
        expect(expForLevel(1, "megalithe")).toBe(0)
    })

    it("levelFromExp reste l'inverse exact sur la courbe de l'espèce", () => {
        for (const id of ["megalithe", "hibouh", "orcaline", "cornaissant"]) {
            expect(levelFromExp(expForLevel(40, id), id)).toBe(40)
            expect(levelFromExp(expForLevel(40, id) - 1, id)).toBe(39)
        }
    })
})
