import { describe, it, expect } from "vitest"
import {
    initialAceTeam, speciesAtLevel, progressAceTeam, aceReward, aceEnergyBudget,
} from "./ace"
import { getSpecies } from "./species"

// RNG déterministe pour les tests.
function rng() {
    let s = 12345
    return () => { s = (s * 16807) % 2147483647; return (s & 0x7fffffff) / 2147483647 }
}
const sum = (t: { level: number }[]) => t.reduce((a, m) => a + m.level, 0)
const typesOf = (id: string) => getSpecies(id)?.types ?? []

describe("ACE — équipe & progression", () => {
    it("équipe de départ : 6 Daemons niv 4 (3 Panthéon, Nouillon, Braisille, Fennaise)", () => {
        const t = initialAceTeam()
        expect(t).toHaveLength(6)
        expect(t.every((m) => m.level === 4)).toBe(true)
        expect(t.map((m) => m.speciesId)).toEqual(["pantheon", "pantheon", "pantheon", "nouillon", "braisille", "fennaise"])
    })

    it("speciesAtLevel suit la chaîne d'évolution", () => {
        expect(speciesAtLevel("braisille", 4)).toBe("braisille")
        expect(speciesAtLevel("braisille", 20)).toBe("flamkure")
        expect(speciesAtLevel("braisille", 40)).toBe("pyrokoss")
        expect(speciesAtLevel("draclet", 30)).toBe("wyverion")
        expect(speciesAtLevel("draclet", 45)).toBe("draconarque")
    })

    it("chaque défaite ajoute +5 niveaux au total (3×+1, 1×+2)", () => {
        const t0 = initialAceTeam()
        const t1 = progressAceTeam(t0, 1, 10, rng())
        expect(sum(t1)).toBe(sum(t0) + 5)
        // 4 Daemons distincts modifiés
        const changed = t1.filter((m, i) => m.level !== t0[i].level).length
        expect(changed).toBe(4)
    })

    it("palier 5 : les 2 slots Feu deviennent Eau (mêmes niveaux)", () => {
        const t = progressAceTeam(initialAceTeam(), 5, 10, rng())
        expect(typesOf(t[4].speciesId)).toContain("EAU")
        expect(typesOf(t[5].speciesId)).toContain("EAU")
        // slots 0-3 inchangés d'espèce
        expect(t.slice(0, 4).map((m) => m.speciesId)).toEqual(["pantheon", "pantheon", "pantheon", "nouillon"])
    })

    it("palier 15 : les 3 Panthéon évoluent (ténèbre/élec/glace)", () => {
        const t = progressAceTeam(initialAceTeam(), 15, 10, rng())
        expect(t.slice(0, 3).map((m) => m.speciesId)).toEqual(["ombrapanthe", "voltapanthe", "panthegel"])
    })

    it("palier 35 : équipe finale à 6, sans Nouillon, Draclet au niveau du meilleur joueur", () => {
        // On part d'une équipe déjà avancée (panthères évoluées) pour le test.
        const base = initialAceTeam()
        base[0] = { speciesId: "ombrapanthe", level: 40 }
        base[1] = { speciesId: "voltapanthe", level: 40 }
        base[2] = { speciesId: "panthegel", level: 40 }
        base[4] = { speciesId: "razmaree", level: 38 }
        base[5] = { speciesId: "razmaree", level: 38 }
        const t = progressAceTeam(base, 35, 50, rng())
        expect(t).toHaveLength(6)
        expect(t.some((m) => m.speciesId === "nouillon")).toBe(false)
        // 3 panthères + draclet-line + lavapetit-line + braisille-line
        expect(t.slice(0, 3).map((m) => m.speciesId)).toEqual(["ombrapanthe", "voltapanthe", "panthegel"])
        expect(["draclet", "wyverion", "draconarque"]).toContain(t[3].speciesId) // au niveau ~50 → draconarque
        expect(t[3].speciesId).toBe("draconarque")
        expect(typesOf(t[4].speciesId)).toContain("ROCHE") // lavapetit-line (Roche/Feu)
        expect(typesOf(t[5].speciesId)).toContain("FEU")  // braisille-line
    })

    it("récompenses : ball ×5, reps ×5, super_ball, Panthéon, puis remboursement", () => {
        expect(aceReward(1).itemId).toBe("poke_ball")
        expect(aceReward(5).itemId).toBe("poke_ball")
        expect(aceReward(6).reps).toBe(100)
        expect(aceReward(10).reps).toBe(100)
        expect(aceReward(11).itemId).toBe("super_ball")
        expect(aceReward(12).gift).toBe("pantheon")
        expect(aceReward(13).refund).toBe(true)
        expect(aceReward(99).refund).toBe(true)
    })

    it("budget d'énergie = 1,5× les reps du joueur", () => {
        expect(aceEnergyBudget(200)).toBe(300)
        expect(aceEnergyBudget(0)).toBe(0)
        expect(aceEnergyBudget(333)).toBe(499)
    })
})
