import { describe, it, expect } from "vitest"
import type { SpeciesData } from "../battle/types"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { registerCustomSpecies } from "./species"
import { fusionPairError } from "./fusiodex"

// Enregistre les fusions de base pour que isFusionSpeciesId (getSpecies.dexNo ≥ 500) les reconnaisse en test.
registerCustomSpecies(FUSION_BASE_SPECIES)
// Simule un Daemon CUSTOM (Créateur de Daemon) : id « custom_… », dexNo ≥ 500 comme les vrais (ex. shady_s3 de Franss).
registerCustomSpecies([{ id: "custom_test_shady_s3", dexNo: 901, name: "Shadow", types: ["NORMAL", "SPECTRE"], baseStats: { hp: 90, atk: 130, def: 75, spe: 130, spc: 28 }, learnset: [{ level: 1, moveId: "charge" }], catchRate: 3, baseExp: 200, rarity: "RARE", growthRate: "medium_fast", sprite: "" } as unknown as SpeciesData])

describe("fusionPairError — règles de paire (Autel + roster de Ligue)", () => {
    it("deux fois la MÊME espèce → interdit", () => {
        expect(fusionPairError("feuillichot", "feuillichot")).toMatch(/MÊME espèce/)
    })

    it("MégamonarX (stade ULTIME) → jamais fusionnable, quel que soit le partenaire", () => {
        expect(fusionPairError("megamonarx", "feuillichot")).toMatch(/stade ultime/)
        expect(fusionPairError("feuillichot", "megamonarx")).toMatch(/stade ultime/)
        expect(fusionPairError("megamonarx", "mottelave")).toMatch(/stade ultime/) // même face à une fusion
    })

    it("SUPER-FUSION : une fusion + un Daemon NORMAL → interdit (les 2 sens)", () => {
        expect(fusionPairError("mottelave", "feuillichot")).toMatch(/une AUTRE fusion/)
        expect(fusionPairError("feuillichot", "ukognofy")).toMatch(/une AUTRE fusion/)
    })

    it("SUPER-FUSION : deux fusions natives/capturées → AUTORISÉ (null)", () => {
        expect(fusionPairError("mottelave", "dractriss")).toBeNull()
        expect(fusionPairError("ukognofy", "mottelave")).toBeNull()
    })

    it("deux Daemons NORMAUX différents → fusion classique AUTORISÉE (null)", () => {
        expect(fusionPairError("feuillichot", "broutame")).toBeNull()
    })

    it("BUG FIX : un Daemon CUSTOM (dexNo≥500) fusionne comme un NORMAL, pas comme une fusion (cas Shadow de Franss)", () => {
        expect(fusionPairError("custom_test_shady_s3", "ombrapanthe")).toBeNull()   // custom + normal → AUTORISÉ
        expect(fusionPairError("custom_test_shady_s3", "feuillichot")).toBeNull()   // idem, autre normal
        expect(fusionPairError("custom_test_shady_s3", "mottelave")).toMatch(/une AUTRE fusion/) // custom (=normal) + VRAIE fusion → interdit
    })
})
