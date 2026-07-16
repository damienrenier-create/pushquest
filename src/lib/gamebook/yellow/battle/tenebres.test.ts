import { describe, it, expect } from "vitest"
import { typeMultiplier, typeEffectiveness, moveCategory } from "./typeChart"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"

// Type TÉNÈBRES (Dark) — introduit comme némésis-type de Shady (NORMAL/SPECTRE sans faiblesse). Table = vraie Dark.
describe("Type TÉNÈBRES — table Dark de référence", () => {
    it("EN ATTAQUE : ×2 Spectre/Psy · ×0.5 Combat/Fée/Ténèbres · ×1 sinon", () => {
        expect(typeMultiplier("TENEBRES", "SPECTRE")).toBe(2)
        expect(typeMultiplier("TENEBRES", "PSY")).toBe(2)
        expect(typeMultiplier("TENEBRES", "COMBAT")).toBe(0.5)
        expect(typeMultiplier("TENEBRES", "FEE")).toBe(0.5)
        expect(typeMultiplier("TENEBRES", "TENEBRES")).toBe(0.5)
        expect(typeMultiplier("TENEBRES", "NORMAL")).toBe(1)
    })
    it("EN DÉFENSE : faible Combat/Insecte/Fée · résiste Spectre/Ténèbres · IMMUNISÉ au Psy", () => {
        expect(typeMultiplier("COMBAT", "TENEBRES")).toBe(2)
        expect(typeMultiplier("INSECTE", "TENEBRES")).toBe(2)
        expect(typeMultiplier("FEE", "TENEBRES")).toBe(2)
        expect(typeMultiplier("SPECTRE", "TENEBRES")).toBe(0.5)
        expect(typeMultiplier("TENEBRES", "TENEBRES")).toBe(0.5)
        expect(typeMultiplier("PSY", "TENEBRES")).toBe(0) // immunité anti-Psy
    })
    it("est un type SPÉCIAL (frappe la Spé-déf)", () => {
        expect(moveCategory("TENEBRES")).toBe("SPECIAL")
    })
    it("Onde Obscure & Dévoreur d'Ombres sont bien des moves TÉNÈBRES spéciaux", () => {
        expect(getMove("onde_obscure")!.type).toBe("TENEBRES")
        expect(getMove("devoreur_ombres")!.effect?.drainPct).toBe(50)
        expect(moveCategory(getMove("onde_obscure")!.type)).toBe("SPECIAL")
    })
})

describe("Némésis Ombraroth (TÉNÈBRES/SPECTRE) — hard-counter de Shadow (NORMAL/SPECTRE)", () => {
    const shadow = getSpecies("shadow")!, ombra = getSpecies("ombraroth")!
    it("est IMMUNISÉ à l'offense physique de Shadow (Normal/Combat/priorité = ×0), ne prend que le Spectre ×1", () => {
        expect(typeEffectiveness("NORMAL", ombra.types)).toBe(0)  // dont la priorité Vive-Attaque
        expect(typeEffectiveness("COMBAT", ombra.types)).toBe(0)  // Crochet du Maître
        expect(typeEffectiveness("SPECTRE", ombra.types)).toBe(1) // seule Griffe Spectrale passe (neutre)
    })
    it("OHKO : TÉNÈBRES ×2 (spécial) sur la Spé-déf catastrophique de Shadow, et il est PLUS RAPIDE", () => {
        expect(typeEffectiveness("TENEBRES", shadow.types)).toBe(2)
        expect(shadow.baseStats.spc).toBeLessThanOrEqual(30)          // Spé-déf ~28 = cible molle
        expect(ombra.baseStats.spe).toBeGreaterThan(shadow.baseStats.spe) // 135 > 130 → outspeed
    })
    it("Shady est bien mappé sur Ombryx dans CANONICAL_NEMESIS (l'ACE de Franss le forge)", async () => {
        const { CANONICAL_NEMESIS } = await import("../data/species")
        expect(CANONICAL_NEMESIS["shady"]).toBe("ombryx")
        expect(CANONICAL_NEMESIS["custom_cmpgu4uq5000069d_shady_s3"]).toBe("ombryx")
    })
})
