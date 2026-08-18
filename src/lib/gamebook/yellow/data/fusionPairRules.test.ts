import { describe, it, expect } from "vitest"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { registerCustomSpecies } from "./species"
import { fusionPairError } from "./fusiodex"

// Enregistre les fusions de base pour que isFusionSpeciesId (getSpecies.dexNo ≥ 500) les reconnaisse en test.
registerCustomSpecies(FUSION_BASE_SPECIES)

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
})
