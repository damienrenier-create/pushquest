import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { getMove } from "./moves"
import { moveCategory } from "../battle/typeChart"

const bst = (id: string) => { const s = getSpecies(id)!.baseStats; return s.hp + s.atk + s.def + s.spe + s.spc }

describe("RUN 3 — les 3 starters (triangle Métal › Fée › Combat › Métal)", () => {
    it("2 nouvelles attaques : Griffe d'Acier (Métal 40) + Bourrasque Féerique (Fée 40)", () => {
        expect(getMove("griffe_acier")).toMatchObject({ type: "METAL", power: 40 })
        expect(getMove("bourrasque_feerique")).toMatchObject({ type: "FEE", power: 40 })
    })

    it("🔩 MÉTAL (Éléfer→Barrisfer→Colosfer) : pur Métal, BST calqués sur l'EAU, évo L16/L36", () => {
        for (const id of ["elefer", "barrisfer", "colosfer"]) expect(getSpecies(id)!.types).toEqual(["METAL"])
        expect(bst("elefer")).toBe(bst("gouttiny"))   // 246
        expect(bst("barrisfer")).toBe(bst("ondulo"))  // 318
        expect(bst("colosfer")).toBe(bst("razmaree")) // 424
        expect(getSpecies("elefer")!.evolution).toEqual({ toId: "barrisfer", method: { kind: "LEVEL", level: 16 } })
        expect(getSpecies("barrisfer")!.evolution).toEqual({ toId: "colosfer", method: { kind: "LEVEL", level: 36 } })
        expect(getSpecies("colosfer")!.evolution).toBeUndefined()
    })

    it("🧚 FÉE (Cornaïve→Astracorne→Lunarque) : pur Fée, BST calqués sur la PLANTE, évo L16/L32", () => {
        for (const id of ["cornaive", "astracorne", "lunarque"]) expect(getSpecies(id)!.types).toEqual(["FEE"])
        expect(bst("cornaive")).toBe(bst("feuillichot"))  // 245
        expect(bst("astracorne")).toBe(bst("broutame"))   // 322
        expect(bst("lunarque")).toBe(bst("sylvapuce"))    // 435
        expect(getSpecies("cornaive")!.evolution?.toId).toBe("astracorne")
        expect(getSpecies("astracorne")!.evolution).toEqual({ toId: "lunarque", method: { kind: "LEVEL", level: 32 } })
    })

    it("🦗 COMBAT/INSECTE (Coccipoing→Coccombat→Coccimpératrice) : BST calqués sur le FEU", () => {
        for (const id of ["coccipoing", "coccombat", "coccimperatrice"]) expect(getSpecies(id)!.types).toEqual(["COMBAT", "INSECTE"])
        expect(bst("coccipoing")).toBe(bst("braisille"))      // 254
        expect(bst("coccombat")).toBe(bst("flamkure"))        // 332
        expect(bst("coccimperatrice")).toBe(bst("pyrokoss"))  // 446
        expect(getSpecies("coccipoing")!.evolution?.toId).toBe("coccombat")
        expect(getSpecies("coccombat")!.evolution?.toId).toBe("coccimperatrice")
    })

    it("tous les moves des 9 learnsets existent (aucune faute de frappe)", () => {
        const all = ["elefer", "barrisfer", "colosfer", "cornaive", "astracorne", "lunarque", "coccipoing", "coccombat", "coccimperatrice"]
        for (const id of all) for (const e of getSpecies(id)!.learnset) {
            expect(getMove(e.moveId), `${id} → ${e.moveId} introuvable`).toBeTruthy()
        }
    })

    it("learnsets « propres » : hors basiques Normal, chaque attaque de dégâts tape sur la STAT offensive du rôle", () => {
        const check = (ids: string[], cat: "PHYSICAL" | "SPECIAL") => {
            for (const id of ids) for (const e of getSpecies(id)!.learnset) {
                const mv = getMove(e.moveId)!
                if (mv.power > 0 && mv.type !== "NORMAL") expect(moveCategory(mv.type), `${id} → ${e.moveId}`).toBe(cat)
            }
        }
        check(["elefer", "barrisfer", "colosfer"], "PHYSICAL")          // Métal + couverture Sol/Combat = physique
        check(["coccipoing", "coccombat", "coccimperatrice"], "PHYSICAL") // Combat + Insecte = physique
        check(["cornaive", "astracorne", "lunarque"], "SPECIAL")        // Fée + Psy = spécial
    })

    it("capstones à L66 comme les finals run 1", () => {
        expect(getSpecies("colosfer")!.learnset.at(-1)).toMatchObject({ level: 66, moveId: "poing_meteore" })
        expect(getSpecies("lunarque")!.learnset.at(-1)).toMatchObject({ level: 66, moveId: "cataclysme_lunaire" })
        expect(getSpecies("coccimperatrice")!.learnset.at(-1)).toMatchObject({ level: 66, moveId: "coup_de_boutoir" })
    })
})
