import { describe, it, expect } from "vitest"
import { buildAceTeam, bestCounter, aceTargetLevel, aceReward, aceEnergyBudget, speciesAtLevel, ACE_PANTHERS, ACE_BOX } from "./ace"
import { getSpecies } from "./species"

describe("ACE — scaling + équipe + contre adaptatif", () => {
    it("niveau-cible = max(pic, meilleur joueur + 2) — ne régresse jamais", () => {
        expect(aceTargetLevel(0, 10)).toBe(12)
        expect(aceTargetLevel(30, 10)).toBe(30) // pic conservé (ne descend pas)
        expect(aceTargetLevel(20, 25)).toBe(27) // suit le joueur (+2)
    })

    it("speciesAtLevel suit la chaîne d'évolution", () => {
        expect(speciesAtLevel("nouillon", 10)).toBe("nouillon")
        expect(speciesAtLevel("nouillon", 16)).toBe("vermisaint")
        expect(speciesAtLevel("nouillon", 34)).toBe("divinpate")
        expect(speciesAtLevel("braisille", 36)).toBe("pyrokoss")
    })

    it("bestCounter renvoie une espèce de la box super-efficace contre le type joueur", () => {
        const cFeu = bestCounter(["FEU"]) // Eau/Roche/Sol ×2
        expect(ACE_BOX).toContain(cFeu)
        expect(Math.max(...getSpecies(cFeu)!.types.map((t) => typeEff(t, ["FEU"])))).toBe(2)
        const cEau = bestCounter(["EAU"]) // Plante/Élec ×2
        expect(Math.max(...getSpecies(cEau)!.types.map((t) => typeEff(t, ["EAU"])))).toBe(2)
    })

    it("buildAceTeam : 6 mons, 3 panthères (slot3=feu), nouillon+feu évolués, contre adapté", () => {
        const { team, counterSpecies } = buildAceTeam({
            acePeak: 40, playerBestLevel: 30, playerLastTypes: ["FEU"], playerLastLevel: 28, box: {},
        })
        expect(team).toHaveLength(6)
        expect(team.slice(0, 3).map((m) => m.speciesId)).toEqual(ACE_PANTHERS)
        expect(team[2].speciesId).toBe("pyropanthe") // slot 3 = panthère de feu
        expect(team.slice(0, 5).every((m) => m.level === 40)).toBe(true) // fixes au niveau-cible
        expect(team[3].speciesId).toBe("divinpate") // nouillon évolué à niv 40
        expect(team[4].speciesId).toBe("pyrokoss")  // braisille évolué à niv 40
        expect(ACE_BOX).toContain(counterSpecies)
        expect(team[5].speciesId).toBe(counterSpecies)
        expect(team[5].level).toBe(28) // contre au niveau du dernier Daemon joueur (box vide)
    })

    it("le contre respecte la mémoire box (ne descend pas sous le niveau mémorisé)", () => {
        const c = bestCounter(["FEU"])
        const { team } = buildAceTeam({ acePeak: 40, playerBestLevel: 30, playerLastTypes: ["FEU"], playerLastLevel: 10, box: { [c]: 25 } })
        expect(team[5].level).toBe(25) // max(box 25, dernier 10)
    })

    it("récompenses + budget énergie (inchangés)", () => {
        expect(aceReward(1).itemId).toBe("poke_ball")
        expect(aceReward(12).gift).toBe("pantheon")
        expect(aceEnergyBudget(200)).toBe(300)
    })
})

// helper local
import { typeEffectiveness } from "../battle/typeChart"
function typeEff(t: string, def: string[]): number {
    return typeEffectiveness(t as never, def as never[])
}
