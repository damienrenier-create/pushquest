import { describe, it, expect } from "vitest"
import { purchasableCts, getCt } from "./cts"
import { hydratePlayer, getPlayer, teachCt } from "../store/playerStore"
import { createMonInstance } from "../battle/factory"

describe("CT31 Météores — achat unique (one-time) au shop", () => {
    it("ct31 : Météores, oneTime, chère, universelle", () => {
        const ct = getCt("ct31")!
        expect(ct.moveId).toBe("meteores")
        expect(ct.oneTime).toBe(true)
        expect(ct.universal).toBe(true)
        expect(ct.price).toBeGreaterThanOrEqual(1000)
    })

    it("purchasableCts : présente au départ, retirée une fois achetée", () => {
        expect(purchasableCts([]).some((c) => c.id === "ct31")).toBe(true)
        expect(purchasableCts([], ["ct31"]).some((c) => c.id === "ct31")).toBe(false)
    })

    it("acheter Météores : enseigne, déduit le prix, l'enregistre, puis re-achat impossible", () => {
        const mon = createMonInstance("tonytony", 30, { owned: true })
        hydratePlayer({ team: [mon], reps: 5000, badges: [], boughtCts: [] })
        const r = teachCt(mon.uid, "ct31")
        expect(r.ok).toBe(true)
        expect(getPlayer().boughtCts).toContain("ct31")
        expect(getPlayer().reps).toBe(5000 - 1500)
        // achat unique : on ne peut plus la racheter
        const r2 = teachCt(getPlayer().team[0].uid, "ct31")
        expect(r2.ok).toBe(false)
        expect(r2.reason).toBe("locked")
    })
})
