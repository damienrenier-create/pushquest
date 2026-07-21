import { describe, it, expect } from "vitest"
import {
    FUSION_LEAGUE, FUSION_TIERS, allFusionLeaguePairs,
    buildFusionLeagueTeam, disposeFusionLeagueTeam,
} from "./fusionLeague"
import { getSpecies } from "./species"

describe("Ligue de Fusion — data", () => {
    it("42 parents, dédup contrôlée : seule la réutilisation ASSUMÉE de Glacyran est tolérée", () => {
        const pairs = allFusionLeaguePairs()
        expect(pairs.length).toBe(21)
        const parents = pairs.flatMap((p) => [p.a, p.b])
        expect(parents.length).toBe(42)
        // Exception DÉLIBÉRÉE : aucun final Glace n'étant libre, Glacyran (#4) recompose 2 finals déjà pris
        //   (Orcaline de #1 + Cryotyran de #14). Le test garde donc contre tout NOUVEAU doublon accidentel.
        const KNOWN_REUSED = ["cryotyran", "orcaline"]
        const seen = new Set<string>(), dupes = new Set<string>()
        for (const p of parents) { if (seen.has(p)) dupes.add(p); seen.add(p) }
        expect([...dupes].sort()).toEqual(KNOWN_REUSED)
    })

    it("toutes les espèces parents existent + 21 noms de fusion distincts", () => {
        for (const p of allFusionLeaguePairs()) {
            expect(getSpecies(p.a), `parent ${p.a}`).not.toBeNull()
            expect(getSpecies(p.b), `parent ${p.b}`).not.toBeNull()
        }
        const names = allFusionLeaguePairs().map((p) => p.name)
        expect(new Set(names).size).toBe(21)
    })

    it("chaque dresseur bâtit son équipe (bronze) : bon nombre, noms FIGÉS, niveau du palier", () => {
        for (const tr of FUSION_LEAGUE) {
            const team = buildFusionLeagueTeam(tr.key, "bronze")
            try {
                expect(team.length).toBe(tr.pairs.length)
                team.forEach((f, i) => {
                    const sp = getSpecies(f.speciesId)
                    expect(sp).not.toBeNull()
                    expect(sp!.name).toBe(tr.pairs[i].name)          // nom figé appliqué
                    expect(f.instance.level).toBe(FUSION_TIERS.bronze.level) // niveau = max(parents) = palier
                    expect(f.instance.frozenStats).toBeDefined()
                    expect(f.instance.frozenSpd).toBeDefined()       // Déf Spé séparée présente
                })
            } finally {
                disposeFusionLeagueTeam(team)
            }
            // dé-fusion propre : les espèces disparaissent du registre
            for (const f of team) expect(getSpecies(f.speciesId)).toBeNull()
        }
    })

    it("le type LORE est respecté (Conseil 4)", () => {
        const lore: Record<string, string> = { lorelei: "GLACE", bruno: "COMBAT", agatha: "SPECTRE", peter: "DRAGON" }
        for (const [key, type] of Object.entries(lore)) {
            const team = buildFusionLeagueTeam(key, "bronze")
            try {
                for (const f of team) {
                    const sp = getSpecies(f.speciesId)!
                    expect(sp.types, `${sp.name} doit garder ${type}`).toContain(type)
                }
            } finally { disposeFusionLeagueTeam(team) }
        }
    })

    it("scaling des paliers : Or (niv 100) > Bronze (niv 80), stats plus hautes", () => {
        const bronze = buildFusionLeagueTeam("lorelei", "bronze")
        const or = buildFusionLeagueTeam("lorelei", "or")
        try {
            expect(bronze[0].instance.level).toBe(80)
            expect(or[0].instance.level).toBe(100)
            // même fusion (Morcaline), parents plus forts → PV gelés plus hauts en Or.
            expect(or[0].instance.frozenStats!.hp).toBeGreaterThan(bronze[0].instance.frozenStats!.hp)
        } finally {
            disposeFusionLeagueTeam(bronze)
            disposeFusionLeagueTeam(or)
        }
    })
})
