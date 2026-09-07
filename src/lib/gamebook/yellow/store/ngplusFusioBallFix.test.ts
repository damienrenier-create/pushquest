import { describe, it, expect } from "vitest"
import { fixNgplusFusioBalls } from "./playerStore"

// CORRECTIF run 2 : les Fusio-Balls du kit de départ fun (inutiles hors fusion) → Nexus-Balls (poke_ball) au chargement.
describe("fixNgplusFusioBalls — conversion Fusio→Nexus au chargement du run 2", () => {
    it("convertit les fusio_ball en poke_ball (1:1) et retire les fusio_ball", () => {
        const out = fixNgplusFusioBalls({ fusio_ball: 10 })
        expect(out.poke_ball).toBe(10)
        expect(out.fusio_ball).toBeUndefined()
    })

    it("CUMULE avec les poke_ball existantes", () => {
        const out = fixNgplusFusioBalls({ fusio_ball: 10, poke_ball: 3, super_ball: 2 })
        expect(out.poke_ball).toBe(13)
        expect(out.fusio_ball).toBeUndefined()
        expect(out.super_ball).toBe(2) // le reste du sac intact
    })

    it("idempotent : un 2e passage ne change rien (plus de fusio_ball)", () => {
        const once = fixNgplusFusioBalls({ fusio_ball: 10 })
        const twice = fixNgplusFusioBalls(once)
        expect(twice).toEqual(once)
    })

    it("no-op (identité) si aucune fusio_ball", () => {
        const bag = { poke_ball: 5, super_ball: 1 }
        expect(fixNgplusFusioBalls(bag)).toBe(bag) // même référence → aucune écriture inutile
    })
})
