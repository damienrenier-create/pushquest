import { describe, it, expect } from "vitest"
import { hydratePokedex, pokedexCompletion } from "./pokedexStore"
import { PERMANENT_OFF_DEX_SPECIES } from "../data/species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// POKÉDEX — LES FUSIONS CAPTURÉES COMPTENT (demande de Jacanon, 18/10/2026). Les fusions de la Grotte et leurs stades
// évolués (dexNo 500+) et Ukognofy sont HORS du dex permanent : jamais dans le total (anti-spoiler). Mais une fois
// capturées, elles entrent : +1 capturé ET +1 au total — comme un Daemon run-2 qui rentre dans le total à sa capture.
// Jacanon : 12 fusions + Ukognofy capturés qui ne pesaient rien dans son « 227 / 237 ».
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("pokedexCompletion et les espèces hors dex", () => {
    it("les 38 fusions + Ukognofy sont bien hors dex permanent", () => {
        const ids = PERMANENT_OFF_DEX_SPECIES.map((s) => s.id)
        expect(ids).toContain("mottelave"); expect(ids).toContain("sideralithe"); expect(ids).toContain("ukognofy")
        expect(ids.length).toBe(39)
    })

    it("non capturées : aucune n'est dans le total (zéro spoiler)", () => {
        hydratePokedex({ seen: ["mottelave", "ukognofy"], caught: [] })
        const comp = pokedexCompletion(true, true, true, true)
        hydratePokedex({ seen: [], caught: [] })
        expect(comp.total).toBe(pokedexCompletion(true, true, true, true).total)
    })

    it("capturées : +1 capturé ET +1 total par espèce, lignée évoluée comprise (mottelave → … → sideralithe = 5)", () => {
        hydratePokedex({ seen: [], caught: [] })
        const base = pokedexCompletion(true, true, true, true)
        const lineage = ["mottelave", "scorieve", "basaltor", "siderobloc", "sideralithe"]
        hydratePokedex({ seen: lineage, caught: lineage })
        const after = pokedexCompletion(true, true, true, true)
        expect(after.caught).toBe(base.caught + 5)
        expect(after.total).toBe(base.total + 5)
        expect(after.pct).toBeLessThanOrEqual(100)
    })

    it("Ukognofy capturé compte aussi ; une espèce inconnue ne compte pas", () => {
        hydratePokedex({ seen: [], caught: [] })
        const base = pokedexCompletion(true, true, true, true)
        hydratePokedex({ seen: ["ukognofy"], caught: ["ukognofy", "espece_qui_n_existe_pas"] })
        const after = pokedexCompletion(true, true, true, true)
        expect(after.caught).toBe(base.caught + 1)
        expect(after.total).toBe(base.total + 1)
    })

    it("le % ne dépasse jamais 100 même tout capturé", () => {
        const everything = PERMANENT_OFF_DEX_SPECIES.map((s) => s.id)
        hydratePokedex({ seen: everything, caught: everything })
        const comp = pokedexCompletion(true, true, true, true)
        expect(comp.caught).toBeLessThanOrEqual(comp.total)
        expect(comp.pct).toBeLessThanOrEqual(100)
        hydratePokedex({ seen: [], caught: [] })
    })
})
