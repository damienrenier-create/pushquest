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

    it("CT28 = « Rafale de Crochets » COMBAT multi-coups (2-5×, 20/coup), achetable au shop (Champion)", () => {
        const ct = getCt("ct28")!
        expect(ct.champion).toBe(true)
        expect(ct.gift).toBeFalsy() // c'est une CT du SHOP, pas un cadeau
        const mv = getMove("deluge_crochets")!
        expect(mv.name).toBe("Rafale de Crochets")
        expect(mv.type).toBe("COMBAT")
        expect(mv.power).toBe(20)
        expect(mv.effect?.multiHit).toEqual([2, 5])
        // Combat-only : un Daemon COMBAT peut l'apprendre, pas un non-Combat
        const combat = getSpecies("druidours")! // COMBAT/PLANTE
        expect(canLearnCt(combat, ct)).toBe(true)
        const eau = getSpecies("razmaree")
        if (eau) expect(canLearnCt(eau, ct)).toBe(false)
        // achetable uniquement avec les 3 badges
        const all3: BadgeId[] = ["feu", "plante", "eau"]
        expect(purchasableCts(all3).some((c) => c.id === "ct28")).toBe(true)
        expect(purchasableCts(["feu"]).some((c) => c.id === "ct28")).toBe(false)
    })

    it("le move « Crochet du Maître » d'origine est INTACT (id crochet_maitre, 80, crit)", () => {
        const mv = getMove("crochet_maitre")!
        expect(mv.name).toBe("Crochet du Maître")
        expect(mv.power).toBe(80)
        expect(mv.effect?.highCrit).toBe(true)
    })

    it("alsoTypes (élargissement Gen 1) : CT apprises au-delà du type exact", () => {
        const dragon = getSpecies("draclet")!   // VOL/DRAGON
        const normal = getSpecies("pantheon")!  // NORMAL
        // Souffle Polaire (Glace) : alsoTypes inclut DRAGON + NORMAL
        expect(canLearnCt(dragon, getCt("ct13")!)).toBe(true)
        expect(canLearnCt(normal, getCt("ct13")!)).toBe(true)
        // Séisme (Sol) : alsoTypes ROCHE/DRAGON/NORMAL → un dragon l'apprend
        expect(canLearnCt(dragon, getCt("ct14")!)).toBe(true)
        // Une SIGNATURE sans alsoTypes (Déferlante, Eau) reste réservée au type exact
        expect(getCt("ct27")!.alsoTypes).toBeUndefined()
        expect(canLearnCt(dragon, getCt("ct27")!)).toBe(false) // Vol/Dragon ≠ Eau
    })
})
