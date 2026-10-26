import { describe, it, expect } from "vitest"
import { setActiveWorld, applyAcceptedGenieWishEffects, genieCatchCharges, getPlayer, GENIE_RUN3_ALLOWED_KINDS } from "./playerStore"

// 26/10/2026 — Kingme (en plein run 3) accepte « 5 captures garanties » : avant, applyAcceptedGenieWishEffects refusait TOUT
// en run 3 → jamais de charges (« le génie m'a menti »). Désormais seuls les effets GENIE_RUN3_ALLOWED_KINDS passent en run 3.
describe("vœux du génie pendant le run 3 (économie scellée, sauf captures garanties)", () => {
    it("captures garanties : appliquées en run 3 ; énergie : toujours en attente d'un vrai monde", () => {
        setActiveWorld("run3")
        expect(GENIE_RUN3_ALLOWED_KINDS.has("guaranteed_captures")).toBe(true)
        expect(GENIE_RUN3_ALLOWED_KINDS.has("energy")).toBe(false)
        const repsBefore = getPlayer().reps
        expect(applyAcceptedGenieWishEffects({ accepted2: true, effect2: JSON.stringify([{ kind: "energy", amount: 15000 }]), condition2: "x", round: 0 })).toBe(false)
        expect(getPlayer().reps).toBe(repsBefore) // rien versé en run 3
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx2") // et le vœu reste À PAYER (pas marqué)
        expect(applyAcceptedGenieWishEffects({ accepted3: true, effect3: JSON.stringify([{ kind: "guaranteed_captures", amount: 5 }]), condition3: "x", round: 0 })).toBe(true)
        expect(genieCatchCharges()).toBe(5)
        expect(getPlayer().defeatedTrainers).toContain("genie_fx3") // marqué : pas re-payé au retour en live
        // un vœu MIXTE (captures + énergie) attend aussi un vrai monde : jamais de demi-paiement
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify([{ kind: "guaranteed_captures", amount: 2 }, { kind: "energy", amount: 100 }]), condition1: "x", round: 0 })).toBe(false)
        expect(genieCatchCharges()).toBe(5)
        setActiveWorld("live")
    })
})
