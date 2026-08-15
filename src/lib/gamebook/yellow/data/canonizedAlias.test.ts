import { describe, it, expect } from "vitest"
import { getSpecies, CANONIZED_CUSTOM_ALIAS } from "./species"

// Les anciens Daemons custom (créés AVANT canonisation) doivent résoudre vers leur espèce CANONIQUE finale
// (repli serveur/spectateur), avec un sprite → plus de MISSINGNO ni de `unknown-species` en génération de fusion.
describe("alias créations canonisées (custom → canonique)", () => {
    it("chaque ancien id custom résout vers l'espèce canonique finale (avec sprite)", () => {
        for (const [customId, canonId] of Object.entries(CANONIZED_CUSTOM_ALIAS)) {
            const sp = getSpecies(customId)
            expect(sp, `getSpecies(${customId}) doit résoudre`).not.toBeNull()
            expect(sp!.id).toBe(canonId)
            expect(sp!.sprite).toBeTruthy()
        }
    })
    it("Jacanon : joeyrrant_s3 → Kangoudead", () => {
        expect(getSpecies("custom_cmsat15v80001wvy_joeyrrant_s3")?.name).toBe("Kangoudead")
    })
})
