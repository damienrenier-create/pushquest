import { describe, it, expect } from "vitest"
import { purchasableCts, getCt } from "./cts"
import { hydratePlayer, getPlayer, teachCt } from "../store/playerStore"
import { createMonInstance } from "../battle/factory"

describe("CT — achat unique (toute CT) + Météores (ct31)", () => {
    it("ct31 : Météores, universelle, la + chère", () => {
        const ct = getCt("ct31")!
        expect(ct.moveId).toBe("meteores")
        expect(ct.universal).toBe(true)
        expect(ct.price).toBeGreaterThanOrEqual(1000)
    })

    it("purchasableCts retire TOUTE CT déjà achetée (pas seulement Météores)", () => {
        expect(purchasableCts([]).some((c) => c.id === "ct01")).toBe(true)
        expect(purchasableCts([], ["ct01"]).some((c) => c.id === "ct01")).toBe(false)
        expect(purchasableCts([], ["ct31"]).some((c) => c.id === "ct31")).toBe(false)
    })

    it("acheter une CT l'enregistre (boughtCts), déduit le prix, puis re-achat impossible", () => {
        const mon = createMonInstance("tonytony", 30, { owned: true })
        hydratePlayer({ team: [mon], reps: 5000, badges: [], boughtCts: [] })
        const price = getCt("ct31")!.price
        const r = teachCt(mon.uid, "ct31")
        expect(r.ok).toBe(true)
        expect(getPlayer().boughtCts).toContain("ct31")
        expect(getPlayer().reps).toBe(5000 - price)
        const r2 = teachCt(getPlayer().team[0].uid, "ct31")
        expect(r2.ok).toBe(false)
        expect(r2.reason).toBe("locked")
    })
})
