import { describe, it, expect } from "vitest"
import { buildNemesisChallengeTeam, buildNemesisReward, isNemesisChallengePlayer, nemesisChallengeFor, nemesisBattleTrainerId, nemesisRewardSpeciesFromTrainerId, nemesisRewardBlockedMarker } from "./nemesisChallenge"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import type { MonInstance } from "../battle/types"

// Équipe RÉELLE de Jacanon (au moment du build) — types variés → couverture large des contres.
const JACANON_TEAM: Array<[string, number]> = [
    ["jerbiwat", 87],   // PSY/ÉLEC
    ["razmaree", 76],   // EAU
    ["druidours", 57],  // COMBAT/PLANTE
    ["draconarque", 50],// VOL/DRAGON
    ["rochison", 49],   // ROCHE/SOL
    ["naiadrak", 39],   // EAU
]
const team: MonInstance[] = JACANON_TEAM.map(([id, lvl]) => createMonInstance(id, lvl, { owned: true }))

describe("Défi némésis — générateur d'équipe", () => {
    it("un contre par membre, au MÊME niveau", () => {
        const nem = buildNemesisChallengeTeam(team)
        expect(nem).toHaveLength(team.length)
        nem.forEach((n, i) => expect(n.level).toBe(team[i].level))
    })

    it("chaque némésis est SUPER-EFFICACE (≥2×) contre le membre qu'il vise", () => {
        const nem = buildNemesisChallengeTeam(team)
        nem.forEach((n, i) => {
            const nemTypes = getSpecies(n.speciesId)!.types
            const targetTypes = getSpecies(team[i].speciesId)!.types
            const bestEff = Math.max(...nemTypes.map((t) => typeEffectiveness(t, targetTypes)))
            expect(bestEff, `${n.speciesId} vs ${team[i].speciesId}`).toBeGreaterThanOrEqual(2)
        })
    })

    it("les némésis sont au BON stade pour leur niveau (finales aux hauts niveaux)", () => {
        const nem = buildNemesisChallengeTeam(team)
        // aucune espèce ne doit encore pouvoir évoluer À ce niveau (sinon un stade trop précoce a été fielded)
        nem.forEach((n) => {
            const evo = getSpecies(n.speciesId)?.evolution
            const lvl = evo ? (evo.method as { level?: number }).level : undefined
            if (typeof lvl === "number") expect(n.level, `${n.speciesId} devrait déjà avoir évolué`).toBeLessThan(lvl)
        })
    })

    it("ignore proprement les espèces inconnues (custom non résolues)", () => {
        const withGhost = [...team, { ...team[0], speciesId: "custom_zzz_unknown_s1" }]
        expect(buildNemesisChallengeTeam(withGhost)).toHaveLength(team.length) // le fantôme est sauté
    })
})

describe("Défi némésis — récompense + registre par joueur", () => {
    it("récompense PARFAITE niv 5, croissance lente, possédée (espèce paramétrable)", () => {
        for (const sp of ["caninombre", "pyropanthe"]) {
            const r = buildNemesisReward(sp)
            expect(r.speciesId).toBe(sp)
            expect(r.level).toBe(5)
            expect(r.owned).toBe(true)
            expect(r.growthMult).toBe(1.25)
            expect(Object.values(r.ivs).every((v) => v === 15)).toBe(true) // génétique parfaite
        }
    })

    it("registre : Jacanon→Caninombre, Mools→Pyropanthe (insensible casse/espaces), autres = aucun défi", () => {
        expect(nemesisChallengeFor("Jacanon")?.rewardSpecies).toBe("caninombre")
        expect(nemesisChallengeFor("  jacanon ")?.rewardSpecies).toBe("caninombre")
        expect(nemesisChallengeFor("Mools")?.rewardSpecies).toBe("pyropanthe")
        expect(nemesisChallengeFor("MOOLS")?.rewardSpecies).toBe("pyropanthe")
        expect(nemesisChallengeFor("Sartay")).toBeNull()
        expect(nemesisChallengeFor("")).toBeNull()
        expect(isNemesisChallengePlayer("Jacanon")).toBe(true)
        expect(isNemesisChallengePlayer("Mools")).toBe(true)
        expect(isNemesisChallengePlayer("PersonneDInconnu")).toBe(false)
    })

    it("trainerId de combat porte l'espèce (round-trip) + marqueur de blocage par espèce", () => {
        expect(nemesisRewardSpeciesFromTrainerId(nemesisBattleTrainerId("pyropanthe"))).toBe("pyropanthe")
        expect(nemesisRewardSpeciesFromTrainerId(nemesisBattleTrainerId("caninombre"))).toBe("caninombre")
        expect(nemesisRewardSpeciesFromTrainerId("y_nemesis_challenge")).toBeNull() // ancien id sans suffixe → null (sûr)
        expect(nemesisRewardSpeciesFromTrainerId("y_arena_druide")).toBeNull()
        expect(nemesisRewardBlockedMarker("pyropanthe")).toBe("pyropanthe_blocked")
        expect(nemesisRewardBlockedMarker("caninombre")).toBe("caninombre_blocked") // rétro-compat Jacanon
    })
})
