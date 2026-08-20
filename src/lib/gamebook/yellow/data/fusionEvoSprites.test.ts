import { describe, it, expect } from "vitest"
import { evolvedFusionStageInfo, isEvolvedFusionStage, evolvedFusionStageIds, fusionStageNeedsGenSprite, evoSpriteKey } from "./fusionEvoSprites"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"

describe("fusionEvoSprites — dérivation des lignées évolutives", () => {
    it("les stades de BASE (5 fusions + zones) ne sont PAS des stades évolués", () => {
        for (const base of ["mottelave", "nouiflot", "sporemante", "ruffardoc", "dractriss", "voltaile", "rocaptere"])
            expect(isEvolvedFusionStage(base)).toBe(false)
    })

    it("chaîne Dractriss : voltriss=S2 (prev dractriss), draconvolt=S3 (prev voltriss)", () => {
        expect(evolvedFusionStageInfo("voltriss")).toEqual({ prevId: "dractriss", stage: 2, totalStages: 3 })
        expect(evolvedFusionStageInfo("draconvolt")).toEqual({ prevId: "voltriss", stage: 3, totalStages: 3 })
    })

    it("chaîne Mottelave à 5 stades : scorieve→basaltor→siderobloc→sideralithe", () => {
        expect(evolvedFusionStageInfo("scorieve")).toEqual({ prevId: "mottelave", stage: 2, totalStages: 5 })
        expect(evolvedFusionStageInfo("basaltor")?.prevId).toBe("scorieve")
        expect(evolvedFusionStageInfo("siderobloc")?.prevId).toBe("basaltor")
        expect(evolvedFusionStageInfo("sideralithe")).toEqual({ prevId: "siderobloc", stage: 5, totalStages: 5 })
    })

    it("chaîne évolutive secrète Rocaptère : fissuraillus=S2, magmaillus=S3", () => {
        expect(evolvedFusionStageInfo("fissuraillus")).toEqual({ prevId: "rocaptere", stage: 2, totalStages: 3 })
        expect(evolvedFusionStageInfo("magmaillus")).toEqual({ prevId: "fissuraillus", stage: 3, totalStages: 3 })
    })

    it("needsGenSprite : true pour placeholder MissingNo (scorieve), false pour sprite maison (voltriss/draconvolt)", () => {
        expect(fusionStageNeedsGenSprite("scorieve")).toBe(true)
        expect(fusionStageNeedsGenSprite("voltriss")).toBe(false)   // sprite maison fourni
        expect(fusionStageNeedsGenSprite("draconvolt")).toBe(false) // sprite maison fourni
    })

    it("tout stade évolué existe dans FUSION_BASE_SPECIES et a un prev résoluble", () => {
        const ids = new Set(FUSION_BASE_SPECIES.map((s) => s.id))
        for (const id of evolvedFusionStageIds()) {
            expect(ids.has(id)).toBe(true)
            expect(ids.has(evolvedFusionStageInfo(id)!.prevId)).toBe(true)
        }
    })

    it("clé de cache littérale = fusevo:<id>", () => {
        expect(evoSpriteKey("scorieve")).toBe("fusevo:scorieve")
    })
})
