import { describe, it, expect } from "vitest"
import { buildUkognofy, ukognofyFailCount, isUkognofyGone, nextUkognofyFailMarker, UKOGNOFY_CAUGHT_MARKER, UKOGNOFY_FAIL_MARKERS } from "./ukognofy"
import { getSpecies } from "./species"
import { getMove } from "./moves"

describe("Ukognofy — légendaire (Goshendofy+Ukognos)", () => {
    it("buildUkognofy : DRAGON/FÉE niv 100, moveset d'ace valide", () => {
        const f = buildUkognofy()
        const sp = getSpecies(f.speciesId)!
        expect(sp.name).toBe("Ukognofy")
        expect(sp.sprite).toBe("/yellow/sprites/dex/fusion/ukognofy.png") // sprite dédié, PAS MissingNo
        expect(sp.types.sort()).toEqual(["DRAGON", "FEE"])
        expect(f.instance.level).toBe(100)
        expect(f.instance.moves).toHaveLength(4)
        for (const m of f.instance.moves) expect(getMove(m.moveId), m.moveId).toBeTruthy()
    })

    it("compteur d'échecs : disparaît après 3 rencontres sans capture", () => {
        const set = new Set<string>()
        const isDef = (m: string) => set.has(m)
        expect(isUkognofyGone(isDef)).toBe(false)
        // 3 échecs successifs → poser le prochain marker à chaque fois
        for (let i = 1; i <= 3; i++) {
            const next = nextUkognofyFailMarker(isDef)
            expect(next).toBe(UKOGNOFY_FAIL_MARKERS[i - 1])
            set.add(next!)
            expect(ukognofyFailCount(isDef)).toBe(i)
        }
        expect(nextUkognofyFailMarker(isDef)).toBeNull() // plus d'essai
        expect(isUkognofyGone(isDef)).toBe(true)         // disparu à jamais
    })

    it("capture → disparaît aussi (même sans 3 échecs)", () => {
        const set = new Set<string>([UKOGNOFY_CAUGHT_MARKER])
        expect(isUkognofyGone((m) => set.has(m))).toBe(true)
    })
})
