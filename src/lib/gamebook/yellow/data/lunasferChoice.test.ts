import { describe, it, expect, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { computeFusion, setFusionTypeChoiceResolver, optionalForcedType } from "./fusionSpecies"
import { fusionParentFromInstance } from "./fusionMon"
import { createMonInstance } from "../battle/factory"
import { emptySave, parseSave } from "../storage/save"

// Sartay, 28/10/2026 : « Lunasfer est une fusion synergique de la licorne et de l'éléphant de métal qui prend le type Dragon…
// je voudrais que le joueur puisse avoir le choix et faire en sorte que Lunasfer reste Fée/Métal ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const P = (id: string) => fusionParentFromInstance(createMonInstance(id, 50))
afterEach(() => setFusionTypeChoiceResolver(null))

describe("Lunasfer (Colosfer × Lunarque) : Dragon ou Fée/Métal, au choix du joueur", () => {
    it("par défaut : DRAGON, attaques offensives converties", () => {
        const f = computeFusion(P("colosfer"), P("lunarque"))
        expect(f.name).toBe("Lunasfer")
        expect(f.types).toEqual(["DRAGON"])
        expect(Object.keys(f.moveTypes).length).toBeGreaterThan(0)
        expect(optionalForcedType("lunarque", "colosfer")).toBe("DRAGON")
    })
    it("« types des parents » : Fée/Métal, même nom, attaques d'origine, sans attaque Dragon imposée", () => {
        setFusionTypeChoiceResolver(() => ({ natural: true }))
        for (const [a, b] of [["colosfer", "lunarque"], ["lunarque", "colosfer"]]) {
            const f = computeFusion(P(a), P(b))
            expect(f.name).toBe("Lunasfer")
            expect([...f.types].sort()).toEqual(["FEE", "METAL"])
            expect(f.moveTypes).toEqual({})
            expect(f.moves).not.toContain("draco_charge")
        }
    })
    it("les autres fusions inédites gardent leur type imposé (Coccilune reste Glace)", () => {
        setFusionTypeChoiceResolver(() => ({ natural: true }))
        expect(computeFusion(P("lunarque"), P("coccimperatrice")).types).toEqual(["GLACE"])
        expect(optionalForcedType("lunarque", "coccimperatrice")).toBeNull()
    })
    it("le choix est sauvegardé et l'atelier propose les deux boutons", () => {
        const s = parseSave(JSON.parse(JSON.stringify({ ...emptySave(), fusionTypeChoices: { "colosfer>lunarque": { natural: true } } })))
        expect(s.fusionTypeChoices?.["colosfer>lunarque"]?.natural).toBe(true)
        const ui = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ui).toContain("const forced = optionalForcedType(a.speciesId, b.speciesId)")
        expect(ui).toContain("(types des parents)")
    })
})
