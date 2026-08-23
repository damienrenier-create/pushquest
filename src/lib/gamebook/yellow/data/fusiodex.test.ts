import { describe, it, expect } from "vitest"
import { officialFusions, officialFusionProgress, fusionRootSpeciesIds, fusionEvolutionChain, AUTEL_VISITED_MARKER, FUSION_RULES } from "./fusiodex"
import { FUSION_BASE_IDS, FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { leagueFusionSpecies } from "./leagueFusionDex"
import { visibleDexSpecies, registerCustomSpecies } from "./species"

// Les fusions (base + évolutions) sont des espèces CUSTOM (hors SPECIES) → à enregistrer pour résoudre les lignées.
registerCustomSpecies(FUSION_BASE_SPECIES)

describe("Fusiodex — couche data + anti-spoiler", () => {
    it("officialFusions : RACINES Grotte (stades évolués exclus) + fusions de LIGUE, gating par `seen`", () => {
        const roots = fusionRootSpeciesIds()
        const ligueCount = leagueFusionSpecies().length
        const none = officialFusions([])
        expect(none).toHaveLength(roots.size + ligueCount) // racines Grotte + fusions de Ligue (non capturables)
        expect(none.every((f) => !f.seen)).toBe(true) // rien d'aperçu → tout masqué
        expect(none.some((f) => f.id === "mottelave")).toBe(true) // une racine Grotte
        expect(none.some((f) => roots.has(f.id))).toBe(true)
        expect(none.some((f) => f.id === "siderobloc")).toBe(false) // une forme évoluée Grotte n'est jamais listée

        const seen = officialFusions(["mottelave", "dractriss"])
        expect(seen.find((f) => f.id === "mottelave")?.seen).toBe(true)
        expect(seen.find((f) => f.id === "nouiflot")?.seen).toBe(false)
    })

    it("progression : compte les aperçues sur le total (racines Grotte + Ligue)", () => {
        const total = fusionRootSpeciesIds().size + leagueFusionSpecies().length
        expect(officialFusionProgress([])).toEqual({ seen: 0, total })
        expect(officialFusionProgress(["mottelave", "nouiflot", "inconnu"]).seen).toBe(2)
    })

    it("lignée d'évolution (révélée à la capture) : Mottelave → … → Sidérobloc (Noyau) → Sidéralithe", () => {
        const chain = fusionEvolutionChain("mottelave")
        expect(chain[0].id).toBe("mottelave")
        expect(chain.map((s) => s.id)).toContain("siderobloc")
        expect(chain.map((s) => s.id)).toContain("sideralithe")
        // Basaltor → Sidérobloc via le NOYAU DE MÉTAL (méthode par OBJET, libellé = nom de l'objet).
        const basaltor = chain.find((s) => s.id === "basaltor")
        expect(basaltor?.toNextLabel?.toLowerCase()).toContain("noyau")
        expect(chain[chain.length - 1].toNextLabel).toBeUndefined() // stade final = pas de suite
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
