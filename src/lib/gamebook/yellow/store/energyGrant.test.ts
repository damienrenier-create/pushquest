import { describe, it, expect } from "vitest"
import { shouldCreditEnergyGrant } from "./saveManager"

// CANAL D'ÉNERGIE ANTI-ÉCRASEMENT — le cadeau (vœu génie / admin) ne doit se créditer QU'EN live/ngplus.
// En run3 (énergie source-unique) et en replay (bulle jetable), le cadeau reste EN ATTENTE côté serveur.
describe("shouldCreditEnergyGrant", () => {
    it("crédite en LIVE quand un montant est en attente", () => {
        expect(shouldCreditEnergyGrant(5000, "live")).toBe(true)
    })
    it("crédite en NG+ quand un montant est en attente", () => {
        expect(shouldCreditEnergyGrant(1000, "ngplus")).toBe(true)
    })
    it("NE crédite PAS en run3 (énergie source-unique)", () => {
        expect(shouldCreditEnergyGrant(5000, "run3")).toBe(false)
    })
    it("NE crédite PAS en replay (bulle jetable)", () => {
        expect(shouldCreditEnergyGrant(5000, "replay")).toBe(false)
    })
    it("ne crédite rien si aucun montant en attente", () => {
        expect(shouldCreditEnergyGrant(0, "live")).toBe(false)
        expect(shouldCreditEnergyGrant(undefined, "live")).toBe(false)
    })
})
