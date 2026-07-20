import { describe, it, expect } from "vitest"
import { officialFusions, officialFusionProgress, AUTEL_VISITED_MARKER, FUSION_RULES } from "./fusiodex"
import { FUSION_BASE_IDS } from "./fusionBaseSpecies"
import { visibleDexSpecies } from "./species"

describe("Fusiodex — couche data + anti-spoiler", () => {
    it("officialFusions : 5 fusions officielles, gating par `seen`", () => {
        const none = officialFusions([])
        expect(none).toHaveLength(FUSION_BASE_IDS.length)
        expect(none.every((f) => !f.seen)).toBe(true) // rien d'aperçu → tout masqué

        const seen = officialFusions(["mottelave", "dractriss"])
        expect(seen.find((f) => f.id === "mottelave")?.seen).toBe(true)
        expect(seen.find((f) => f.id === "nouiflot")?.seen).toBe(false)
    })

    it("progression : compte les aperçues sur le total", () => {
        expect(officialFusionProgress([])).toEqual({ seen: 0, total: FUSION_BASE_IDS.length })
        expect(officialFusionProgress(["mottelave", "nouiflot", "inconnu"]).seen).toBe(2)
    })

    it("règles : présentes et non vides", () => {
        expect(FUSION_RULES.length).toBeGreaterThan(5)
        expect(AUTEL_VISITED_MARKER).toBe("autel_visited")
    })

    it("ANTI-SPOILER cœur : aucune fusion officielle n'apparaît dans le Pokédex principal (même post-run)", () => {
        // visibleDexSpecies n'itère que SPECIES → les fusions (custom) n'y sont JAMAIS, quel que soit l'état.
        const dex = visibleDexSpecies(FUSION_BASE_IDS, true, true, true, true, FUSION_BASE_IDS)
        for (const id of FUSION_BASE_IDS) {
            expect(dex.some((s) => s.id === id), `${id} ne doit pas être dans le Pokédex principal`).toBe(false)
        }
    })
})
