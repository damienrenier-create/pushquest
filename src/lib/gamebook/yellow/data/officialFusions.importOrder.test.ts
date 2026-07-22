// Garde-fou anti-TDZ (revue adversariale) : importe fusionLeague AVANT officialFusions — l'ordre « à risque »
// du cycle fusionMon → officialFusions → fusionLeague. Le registre officialFusions DOIT rester bâti PARESSEUSEMENT
// (au 1er appel). S'il redevenait EAGER (construit au top-level), ce simple import lèverait un ReferenceError
// (FUSION_LEAGUE en zone morte temporelle). Ce test échouerait alors au CHARGEMENT → régression attrapée tôt.
import "./fusionLeague"
import { officialFusionForParents } from "./officialFusions"
import { describe, it, expect } from "vitest"

describe("officialFusions — garde-fou ordre d'import (anti-TDZ)", () => {
    it("se charge et résout même quand fusionLeague est importé en premier", () => {
        expect(officialFusionForParents("morrow", "orcaline")?.name).toBe("Morcaline")
    })
})
