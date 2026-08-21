import { describe, it, expect, beforeEach } from "vitest"
import { hydratePokedex, recordSeenZone, recordFirstCatch, seenZonesOf, firstCatchOf, getPokedex } from "../store/pokedexStore"
import { parseSave } from "../storage/save"
import { DEX_LORE } from "./dexLore"
import { getSpecies, registerCustomSpecies, SPECIES } from "./species"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"

registerCustomSpecies(FUSION_BASE_SPECIES) // rend les fusions de base (mottelave…) résolubles par getSpecies

describe("Localisation premium — tracking save-safe (additif)", () => {
    beforeEach(() => hydratePokedex({ seen: [], caught: [] }))

    it("recordSeenZone : dédup + marque l'espèce vue", () => {
        recordSeenZone("glaceer", "yellow_grotte_gelee")
        recordSeenZone("glaceer", "yellow_grotte_gelee") // doublon ignoré
        recordSeenZone("glaceer", "yellow_route_nord")
        expect(seenZonesOf("glaceer")).toEqual(["yellow_grotte_gelee", "yellow_route_nord"])
        expect(getPokedex().seen).toContain("glaceer")
    })

    it("recordFirstCatch : IDEMPOTENT — garde la PREMIÈRE capture", () => {
        recordFirstCatch("guizer", "yellow_grotte_gelee", "2026-01-01")
        recordFirstCatch("guizer", "yellow_plage", "2026-02-02") // 2e capture → n'écrase JAMAIS
        expect(firstCatchOf("guizer")).toEqual({ mapId: "yellow_grotte_gelee", at: "2026-01-01" })
        expect(seenZonesOf("guizer")).toContain("yellow_grotte_gelee") // la zone de 1re capture compte aussi comme croisée
    })

    it("parseSave : round-trip de seenAt / firstCatch", () => {
        const parsed = parseSave({ version: 1, pokedex: {
            seen: ["glaceer"], caught: ["glaceer"],
            seenAt: { glaceer: ["yellow_route_nord"] },
            firstCatch: { glaceer: { mapId: "yellow_route_nord", at: "2026-03-03" } },
        } })
        expect(parsed.pokedex.seenAt).toEqual({ glaceer: ["yellow_route_nord"] })
        expect(parsed.pokedex.firstCatch).toEqual({ glaceer: { mapId: "yellow_route_nord", at: "2026-03-03" } })
    })

    it("parseSave : vieille save SANS les nouveaux champs → objets vides (aucun crash, additif)", () => {
        const parsed = parseSave({ version: 1, pokedex: { seen: ["feuillichot"], caught: [] } })
        expect(parsed.pokedex.seen).toEqual(["feuillichot"])
        expect(parsed.pokedex.seenAt).toEqual({})
        expect(parsed.pokedex.firstCatch).toEqual({})
    })
})

describe("dexLore — intégrité de l'échantillon", () => {
    it("toutes les clés DEX_LORE sont des espèces valides + 3 champs remplis", () => {
        for (const [id, lore] of Object.entries(DEX_LORE)) {
            expect(getSpecies(id), `espèce inconnue: ${id}`).toBeTruthy()
            expect(lore.ecology.length, `ecology ${id}`).toBeGreaterThan(20)
            expect(lore.dicton.length, `dicton ${id}`).toBeGreaterThan(8)
            expect(lore.note.length, `note ${id}`).toBeGreaterThan(20)
        }
    })

    it("COUVERTURE COMPLÈTE : toutes les espèces (species.ts + fusions de base) ont une fiche", () => {
        const all = [...Object.values(SPECIES), ...FUSION_BASE_SPECIES]
        const missing = all.filter((s) => !(s.id in DEX_LORE)).map((s) => s.id)
        expect(missing, `sans fiche premium: ${missing.join(", ")}`).toEqual([])
        expect(Object.keys(DEX_LORE).length).toBe(all.length)
    })
})
