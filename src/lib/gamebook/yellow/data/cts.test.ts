import { describe, it, expect } from "vitest"
import { CTS, getCt, canLearnCt, purchasableCts, type BadgeId } from "./cts"
import { getMove } from "./moves"
import { getSpecies } from "./species"

describe("catalogue des CT", () => {
    it("toutes les CT enseignent une attaque existante", () => {
        for (const ct of CTS) {
            expect(getMove(ct.moveId), `${ct.id} → ${ct.moveId}`).not.toBeNull()
        }
    })
    it("ids et labels uniques", () => {
        expect(new Set(CTS.map((c) => c.id)).size).toBe(CTS.length)
        expect(new Set(CTS.map((c) => c.label)).size).toBe(CTS.length)
    })
    it("getCt récupère par id", () => {
        expect(getCt("ct01")?.moveId).toBe("danse_lames")
        expect(getCt("zzz")).toBeNull()
    })

    it("CT universelle = apprenable par tout Daemon", () => {
        const sp = getSpecies("feuillichot")! // Plante
        expect(canLearnCt(sp, getCt("ct01")!)).toBe(true) // danse_lames universel
    })
    it("CT typée = seulement si le type colle", () => {
        const feu = getSpecies("braisille")
        const plante = getSpecies("feuillichot")
        const ctFeu = getCt("ct08")! // lance_flammes (FEU)
        if (feu) expect(canLearnCt(feu, ctFeu)).toBe(true)
        if (plante) expect(canLearnCt(plante, ctFeu)).toBe(false)
    })

    it("purchasableCts respecte les badges", () => {
        const none = purchasableCts([])
        expect(none.some((c) => c.badge === "feu")).toBe(false)
        expect(none.some((c) => c.champion)).toBe(false)
        expect(none.every((c) => !c.badge && !c.champion)).toBe(true)

        const feu = purchasableCts(["feu"])
        expect(feu.some((c) => c.badge === "feu")).toBe(true)
        expect(feu.some((c) => c.badge === "eau")).toBe(false)

        const all3: BadgeId[] = ["feu", "plante", "eau"]
        expect(purchasableCts(all3).some((c) => c.champion)).toBe(true)
    })

    it("une CT cadeau (gift) n'est JAMAIS en vente + ct17 est un cadeau gratuit", () => {
        const gifts = CTS.filter((c) => c.gift)
        expect(gifts.length).toBeGreaterThan(0)
        const all3: BadgeId[] = ["feu", "plante", "eau"]
        for (const g of gifts) expect(purchasableCts(all3).some((c) => c.id === g.id)).toBe(false)
        expect(getCt("ct17")?.gift).toBe(true)
        expect(getCt("ct17")?.price).toBe(0)
    })
})
