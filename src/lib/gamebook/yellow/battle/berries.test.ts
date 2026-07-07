import { describe, it, expect } from "vitest"
import { pinchBerry } from "./berries"
import { HELD_ITEMS, BERRY_IDS, HELD_ITEM_LIST } from "../data/heldItems"

describe("baies réactives (objets tenus consommables)", () => {
    it("les 7 baies existent, catégorie « baie », bons champs d'effet", () => {
        expect(BERRY_IDS).toHaveLength(7)
        for (const id of BERRY_IDS) {
            const b = HELD_ITEMS[id]
            expect(b, id).toBeDefined()
            expect(b.category, id).toBe("baie")
        }
        expect(HELD_ITEMS.baie_soin.berryHealFrac).toBe(0.30)
        expect(HELD_ITEMS.baie_pure.berryCureStatus).toBe(true)
        expect(HELD_ITEMS.baie_fougue.berryBoostStat).toBe("atk")
        expect(HELD_ITEMS.baie_eclat.berryBoostStat).toBe("spc")
        expect(HELD_ITEMS.baie_vive.berryBoostStat).toBe("spe")
        expect(HELD_ITEMS.baie_roc.berryBoostStat).toBe("def")
        expect(HELD_ITEMS.baie_phenix.berryRevive).toBe(true)
    })

    it("les baies ne sont PAS vendues en boutique (récoltées sur les arbres)", () => {
        const shop = HELD_ITEM_LIST.map((i) => i.id)
        for (const id of BERRY_IDS) expect(shop).not.toContain(id)
    })

    it("pinchBerry : soin sous ⅓ PV, boost stat sous ¼ PV, rien au-dessus ni à 0 PV", () => {
        const soin = HELD_ITEMS.baie_soin, fougue = HELD_ITEMS.baie_fougue, pure = HELD_ITEMS.baie_pure
        expect(pinchBerry(soin, 0.5)).toBeNull()                        // au-dessus d'⅓
        expect(pinchBerry(soin, 0.30)).toEqual({ kind: "heal", frac: 0.30 })
        expect(pinchBerry(fougue, 0.30)).toBeNull()                     // 0.30 > ¼ → pas encore
        expect(pinchBerry(fougue, 0.20)).toEqual({ kind: "stat", stat: "atk" })
        expect(pinchBerry(HELD_ITEMS.baie_roc, 0.2)).toEqual({ kind: "stat", stat: "def" })
        expect(pinchBerry(pure, 0.1)).toBeNull()                        // baie pure n'est pas une « pinch » berry
        expect(pinchBerry(soin, 0)).toBeNull()                          // K.O. → rien (géré par la Baie Phénix)
        expect(pinchBerry(undefined, 0.1)).toBeNull()
    })
})
