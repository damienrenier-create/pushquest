import { describe, it, expect } from "vitest"
import { buildAceTeam, bestCounter, aceTargetLevel, aceReward, aceEnergyBudget, speciesAtLevel, ACE_PANTHERS, ACE_PANTHERS_EVOLVED, ACE_BOX } from "./ace"
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

    it("buildAceTeam : 6 mons, 3 Panthéons, nouillon+feu évolués, contre adapté — TOUS au niveau cliquet", () => {
        const { team, counterSpecies } = buildAceTeam({ aceLevel: 40, playerLastTypes: ["FEU"] })
        expect(team).toHaveLength(6)
        expect(team.slice(0, 3).map((m) => m.speciesId)).toEqual(ACE_PANTHERS)
        expect(team[2].speciesId).toBe("pantheon") // slot 3 = Panthéon (plus de panthère élite)
        expect(team.every((m) => m.level === 40)).toBe(true) // TOUTE l'équipe au niveau CLIQUET d'ACE
        expect(team[3].speciesId).toBe("divinpate") // nouillon évolué à niv 40
        expect(team[4].speciesId).toBe("pyrokoss")  // braisille évolué à niv 40
        expect(ACE_BOX).toContain(counterSpecies)
        expect(team[5].speciesId).toBe(counterSpecies) // slot 6 = contre adaptatif (au niveau d'ACE)
    })

    it("au BADGE ÉCLAIR, les 3 Panthéon d'ACE évoluent en panthères élémentaires", () => {
        const evolved = buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"], hasElecBadge: true })
        expect(evolved.team.slice(0, 3).map((m) => m.speciesId)).toEqual(ACE_PANTHERS_EVOLVED)
        const base = buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"] }) // sans badge → Panthéon de base
        expect(base.team.slice(0, 3).map((m) => m.speciesId)).toEqual(ACE_PANTHERS)
    })

    it("CLIQUET : buildAceTeam prend le niveau fourni TEL QUEL (aucune recalibration sur le joueur)", () => {
        // Le bug corrigé : ACE recalibrait son niveau à CHAQUE rencontre sur le meilleur Daemon
        // du joueur. Désormais buildAceTeam ne fait que refléter le niveau cliquet (figé entre
        // deux défaites, monté uniquement par recordAceDefeat → aceTargetLevel).
        expect(buildAceTeam({ aceLevel: 12, playerLastTypes: ["EAU"] }).team[0].level).toBe(12)
        expect(buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"] }).team[0].level).toBe(50)
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
