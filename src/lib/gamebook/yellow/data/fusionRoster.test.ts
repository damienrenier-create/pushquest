import { describe, it, expect } from "vitest"
import { parseSave, emptySave } from "../storage/save"

// ATELIER DE FUSION — le roster (jusqu'à 6 paires {a,b} d'uids parents) est persisté. parseSave doit être DÉFENSIF
// (ancienne save sans le champ, valeurs hostiles) et borné à 6, comme les autres champs.
describe("fusionRoster — persistance", () => {
    it("emptySave = [] ; parseSave filtre les entrées invalides et borne à 6", () => {
        expect(emptySave().fusionRoster).toEqual([])
        const parsed = parseSave({
            fusionRoster: [
                { a: "u1", b: "u2" },   // ok
                { a: "u3", b: "u4" },   // ok
                { a: 5, b: "u6" },      // a non-string → filtré
                { a: "u7" },            // b manquant → filtré
                "nope",                 // non-objet → filtré
                null,                   // → filtré
            ],
        })
        expect(parsed.fusionRoster).toEqual([{ a: "u1", b: "u2" }, { a: "u3", b: "u4" }])
    })

    it("ancienne save (champ absent) → [] ; non-tableau → [] ; cap à 6 paires", () => {
        expect(parseSave({}).fusionRoster).toEqual([])
        expect(parseSave({ fusionRoster: "x" as unknown as [] }).fusionRoster).toEqual([])
        const seven = Array.from({ length: 7 }, (_, i) => ({ a: `a${i}`, b: `b${i}` }))
        expect(parseSave({ fusionRoster: seven }).fusionRoster.length).toBe(6)
    })
})
