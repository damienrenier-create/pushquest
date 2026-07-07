import { describe, it, expect, beforeEach } from "vitest"
import {
    resetForIntro,
    setBerrySecretKnown,
    isBerrySecretKnown,
    harvestBerryTree,
    isBerryTreeHarvested,
    getPlayer,
} from "./playerStore"

describe("récolte de baies (playerStore)", () => {
    beforeEach(() => resetForIntro()) // remet secret=false, sac vide, suivi de récolte à zéro

    it("gate : sans le secret révélé, aucune récolte", () => {
        expect(isBerrySecretKnown()).toBe(false)
        expect(harvestBerryTree("yellow_route_nord", 1, 3, "2026-07-07", "baie_soin")).toBe(false)
        expect(getPlayer().items["baie_soin"] ?? 0).toBe(0)
    })

    it("récolte : +1 au sac, arbre marqué, refus d'un 2e passage le même jour (anti-refarm)", () => {
        setBerrySecretKnown()
        expect(isBerrySecretKnown()).toBe(true)
        const day = "2026-07-07"
        expect(harvestBerryTree("yellow_route_nord", 1, 3, day, "baie_soin")).toBe(true)
        expect(getPlayer().items["baie_soin"]).toBe(1)
        expect(isBerryTreeHarvested("yellow_route_nord", 1, 3, day)).toBe(true)
        // même arbre, même jour → refus, sac inchangé
        expect(harvestBerryTree("yellow_route_nord", 1, 3, day, "baie_soin")).toBe(false)
        expect(getPlayer().items["baie_soin"]).toBe(1)
        // un AUTRE arbre le même jour → ok
        expect(harvestBerryTree("yellow_route_nord", 10, 3, day, "baie_pure")).toBe(true)
        expect(getPlayer().items["baie_pure"]).toBe(1)
    })

    it("le suivi de récolte se réinitialise au jour suivant", () => {
        setBerrySecretKnown()
        expect(harvestBerryTree("yellow_route_nord", 1, 3, "2026-07-07", "baie_soin")).toBe(true)
        expect(isBerryTreeHarvested("yellow_route_nord", 1, 3, "2026-07-07")).toBe(true)
        // jour suivant : le même arbre est de nouveau récoltable
        expect(isBerryTreeHarvested("yellow_route_nord", 1, 3, "2026-07-08")).toBe(false)
        expect(harvestBerryTree("yellow_route_nord", 1, 3, "2026-07-08", "baie_vive")).toBe(true)
        expect(getPlayer().items["baie_soin"]).toBe(1)
        expect(getPlayer().items["baie_vive"]).toBe(1)
    })
})
