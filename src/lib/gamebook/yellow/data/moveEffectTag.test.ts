import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { getMove, MOVES } from "./moves"
import { moveEffectTag } from "./moveEffectTag"

// RÉSUMÉ D'EFFET (31/10/2026) : tous les effets d'une attaque, plus seulement le premier. Ronces Vampires (Florapanthe) a
// révélé le trou : une attaque qui pose la graine et cinq baisses n'en affichait qu'une.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const tag = (id: string, style: "long" | "short" = "long") => moveEffectTag(getMove(id)!, style)

describe("résumé d'effet d'une attaque", () => {
    it("une attaque à un seul effet s'affiche comme avant", () => {
        expect(tag("lance_flammes")).toBe("Brûlure (10%)")
        expect(tag("danse_lames")).toBe("+2 ATQ")
        expect(tag("vampigraine")).toBe("Graines parasites (drain par tour)")
        expect(tag("toxik")).toBe("Poison grave")
        expect(tag("griffe_spectrale")).toBe("Taux de critique élevé")
        expect(tag("eveil_divin")).toBe("+1 SPÉ (à coup sûr)")
        expect(tag("poing_meteore")).toBe("+1 ATQ (20%)")
        expect(tag("charge")).toBeNull()
        expect(tag("lance_flammes", "short")).toBe("Brûlure 10%") // en français, plus de code brut « BURN »
        expect(tag("danse_lames", "short")).toBe("+2 ATQ")
    })
    it("plusieurs effets : tous listés, baisses regroupées par cible et par cran", () => {
        expect(tag("ronces_vampires")).toBe("Graines parasites (drain par tour) · -1 VIT/DÉF/ATQ/SPÉ/Préc. adv. (à coup sûr)")
        expect(tag("ronces_vampires", "short")).toBe("Graines parasites (drain par tour) · -1 VIT/DÉF/ATQ/SPÉ/Préc. adv.")
        expect(tag("onde_cerebrale")).toBe("-1 VIT/Préc./DÉF adv. (à coup sûr)")
        expect(tag("sig_maree_dacier")).toBe("-1 VIT adv. · +1 DÉF (à coup sûr)")
        expect(tag("boutefeu")).toBe("Recul : 33% des dégâts subis · Brûlure (10%)")
        expect(tag("essaim_vorace")).toContain("Vol de PV : 20%"); expect(tag("essaim_vorace")).toContain("+1 VIT")
    })
    it("aucune attaque ne produit un résumé vide ou avec un code brut de statut", () => {
        for (const mv of Object.values(MOVES)) {
            const t = moveEffectTag(mv)
            if (t === null) continue
            expect(t.length, mv.id).toBeGreaterThan(0)
            expect(t, mv.id).not.toMatch(/\b(BURN|TOXIC|PARALYSIS|FREEZE|SLEEP|SEEDED|OSMOSED|CONFUSION)\b/)
        }
    })
    it("câblage : le combat et la comparaison à l'apprentissage lisent ce module", () => {
        const bs = read("src/app/gamebook/yellow/battle/BattleScreen.tsx")
        expect(bs).toContain("import { moveEffectTag } from \"@/lib/gamebook/yellow/data/moveEffectTag\"")
        expect(bs).not.toContain("function moveEffectTag(")
        const mc = read("src/app/gamebook/yellow/MoveCompare.tsx")
        expect(mc).toContain("const effectTag = (mv: MoveData): string | null => moveEffectTag(mv, \"short\")")
    })
})
