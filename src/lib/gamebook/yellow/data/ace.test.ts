import { describe, it, expect } from "vitest"
import { buildAceTeam, bestCounter, aceTargetLevel, aceReward, aceEnergyBudget, speciesAtLevel, levelEvosRemaining, baseSpeciesOf, ACE_PANTHERS, ACE_PANTHERS_EVOLVED, ACE_BOX } from "./ace"
import { getSpecies } from "./species"

describe("ACE — scaling + équipe + contre adaptatif", () => {
    it("niveau-cible = max(pic, MOYENNE joueur + 2) — ne régresse jamais", () => {
        expect(aceTargetLevel(0, 10)).toBe(12)
        expect(aceTargetLevel(30, 10)).toBe(30) // pic conservé (ne descend pas)
        expect(aceTargetLevel(20, 25)).toBe(27) // suit le joueur (+2)
    })

    it("À BAS NIVEAU, AUCUN Daemon d'ACE n'est sur-évolué (régression : plus de finale stade-3 au niv 4)", () => {
        // Après un reset, ACE est à bas niveau : chaque mon (contre inclus) doit être au STADE adapté
        // au niveau, jamais une finale posée trop tôt.
        for (const types of [["FEU"], ["EAU"], ["PLANTE"], ["DRAGON"], []] as const) {
            const { team } = buildAceTeam({ aceLevel: 4, playerLastTypes: [...types] })
            for (const m of team) {
                expect(m.speciesId).toBe(speciesAtLevel(baseSpeciesOf(m.speciesId), 4))
            }
        }
    })

    it("speciesAtLevel suit la chaîne d'évolution", () => {
        expect(speciesAtLevel("nouillon", 10)).toBe("nouillon")
        expect(speciesAtLevel("nouillon", 16)).toBe("vermisaint")
        expect(speciesAtLevel("nouillon", 34)).toBe("divinpate")
        expect(speciesAtLevel("braisille", 36)).toBe("pyrokoss")
    })

    it("levelEvosRemaining : évolutions LEVEL restantes → borne de spawn (100 − n) pour les noEvolve", () => {
        expect(levelEvosRemaining("nouillon")).toBe(2)    // 3 stades → base ≤98
        expect(levelEvosRemaining("vermisaint")).toBe(1)  // stade 2 → ≤99
        expect(levelEvosRemaining("divinpate")).toBe(0)   // final → aucun cap
        expect(levelEvosRemaining("namicha")).toBe(1)     // lignée 2 stades (→Namizeus) → base ≤99
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

    it("PALIERS : les Panthéon d'ACE évoluent au fil des badges (0-2→0, 3→1, 4→2, 5→3)", () => {
        const at = (badgeCount: number) => buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"], badgeCount }).team.slice(0, 3).map((m) => m.speciesId)
        expect(at(0)).toEqual(ACE_PANTHERS)                                            // aucune évoluée
        expect(at(2)).toEqual(ACE_PANTHERS)                                            // toujours aucune avant 3 badges
        expect(at(3)).toEqual(["pyropanthe", "pantheon", "pantheon"])                  // 1re évoluée
        expect(at(4)).toEqual(["pyropanthe", "voltapanthe", "pantheon"])               // 2 évoluées
        expect(at(5)).toEqual(ACE_PANTHERS_EVOLVED)                                    // les 3
        // sans badgeCount fourni → 0 évoluée (rétro-compat).
        expect(buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"] }).team.slice(0, 3).map((m) => m.speciesId)).toEqual(ACE_PANTHERS)
    })

    it("CLIQUET : buildAceTeam prend le niveau fourni TEL QUEL (aucune recalibration sur le joueur)", () => {
        // Le bug corrigé : ACE recalibrait son niveau à CHAQUE rencontre sur le meilleur Daemon
        // du joueur. Désormais buildAceTeam ne fait que refléter le niveau cliquet (figé entre
        // deux défaites, monté uniquement par recordAceDefeat → aceTargetLevel).
        expect(buildAceTeam({ aceLevel: 12, playerLastTypes: ["EAU"] }).team[0].level).toBe(12)
        expect(buildAceTeam({ aceLevel: 50, playerLastTypes: ["EAU"] }).team[0].level).toBe(50)
    })

    it("récompenses : 1-3 Ball+ & 100 reps · 4-6 Super Ball & 150 reps · 7 Panthéon · 8+ remboursement", () => {
        expect(aceReward(1).itemId).toBe("poke_ball_plus")
        expect(aceReward(3).reps).toBe(100)
        expect(aceReward(4).itemId).toBe("super_ball")
        expect(aceReward(6).reps).toBe(150)
        expect(aceReward(7).gift).toBe("pantheon")
        expect(aceReward(8).refund).toBe(true)
        expect(aceEnergyBudget(200)).toBe(300)
    })
})

// helper local
import { typeEffectiveness } from "../battle/typeChart"
function typeEff(t: string, def: string[]): number {
    return typeEffectiveness(t as never, def as never[])
}
