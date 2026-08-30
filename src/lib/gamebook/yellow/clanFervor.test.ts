import { describe, it, expect, beforeEach } from "vitest"
import { activeClanOf } from "./clanFervor"
import { emptySave } from "./storage/save"
import { resetForIntro, getPlayer, addItem, addCaught, useSuperPastaItem } from "./store/playerStore"
import { createMonInstance } from "./battle/factory"

// Ferveur de clan — clan du monde ACTIF (census) + Super Pasta gratuite du sac (cadeau de badge d'un allié).
describe("ferveur de clan — activeClanOf (clan du monde actif)", () => {
    it("monde LIVE : renvoie le clan top-level", () => {
        const s = emptySave(); s.clan = "air"
        expect(activeClanOf(s)).toBe("air")
    })
    it("monde NG+ actif : renvoie le clan du MONDE IMBRIQUÉ (pas le top-level live)", () => {
        const s = emptySave(); s.activeWorld = "ngplus"; s.clan = "air"; s.ngplusWorld = { ...emptySave(), clan: "roche" }
        expect(activeClanOf(s)).toBe("roche")
    })
    it("REJEU (bulle jetable) : aucun clan compté", () => {
        const s = emptySave(); s.activeWorld = "replay"; s.clan = "air"
        expect(activeClanOf(s)).toBe(null)
    })
    it("aucun pacte : null", () => {
        expect(activeClanOf(emptySave())).toBe(null)
    })
})

describe("ferveur de clan — Super Pasta du sac (gratuite)", () => {
    beforeEach(() => resetForIntro())
    it("useSuperPastaItem : +1 niveau au Daemon choisi et consomme 1 objet", () => {
        addCaught(createMonInstance("plumiot", 10, { owned: true }))
        addItem("super_pasta", 2)
        const before = getPlayer().team[0]
        const r = useSuperPastaItem(before.uid)
        expect(r.ok).toBe(true)
        expect(getPlayer().team[0].level).toBe(before.level + 1)
        expect(getPlayer().items["super_pasta"]).toBe(1) // 1 consommée
    })
    it("sans Super Pasta au sac : refus (reason none)", () => {
        addCaught(createMonInstance("plumiot", 10, { owned: true }))
        const r = useSuperPastaItem(getPlayer().team[0].uid)
        expect(r.ok).toBe(false)
        expect(r.reason).toBe("none")
    })
})
