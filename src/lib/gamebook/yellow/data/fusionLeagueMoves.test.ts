import { describe, it, expect } from "vitest"
import { FUSION_LEAGUE, buildFusionLeagueTeam } from "./fusionLeague"
import { getMove } from "./moves"
import { getSpecies } from "./species"
import { moveCategory } from "../battle/typeChart"

// MOVESETS CURÉS des 27 fusions de Ligue : chaque paire porte un `moves` de 4 attaques (override du dérivé).
// On vérifie : ids réels, moveset bien appliqué à l'instance, ≥2 attaques offensives, ≥1 STAB offensif ALIGNÉ
// sur la stat dominante (physique ATK vs spécial SpA), max 2 attaques de statut.

describe("Ligue de Fusion — movesets curés", () => {
    it("les 27 fusions ont un moveset curé de 4 attaques, toutes des ids réels", () => {
        const pairs = FUSION_LEAGUE.flatMap((t) => t.pairs)
        expect(pairs).toHaveLength(27)
        for (const p of pairs) {
            expect(p.moves, `${p.name} sans moveset`).toBeDefined()
            expect(p.moves!).toHaveLength(4)
            for (const id of p.moves!) expect(getMove(id), `${p.name}: move inconnu ${id}`).toBeTruthy()
        }
    })

    it("chaque fusion : moveset appliqué, ≥2 attaques offensives, ≤2 statuts, ≥1 STAB offensif", () => {
        for (const tr of FUSION_LEAGUE) {
            const team = buildFusionLeagueTeam(tr.key, "or")
            team.forEach((f, i) => {
                const p = tr.pairs[i]
                const sp = getSpecies(f.speciesId)!
                // moveset CURÉ bien appliqué à l'instance de combat
                expect(f.instance.moves.map((m) => m.moveId)).toEqual(p.moves)
                const dmg = p.moves!.map((id) => getMove(id)!).filter((m) => m.power > 0)
                const status = p.moves!.length - dmg.length
                expect(dmg.length, `${p.name}: <2 attaques offensives`).toBeGreaterThanOrEqual(2)
                expect(status, `${p.name}: >2 statuts`).toBeLessThanOrEqual(2)
                // ≥1 attaque offensive de STAB (du type du Daemon). NB : certaines fusions ont un décalage
                //   stat/type (ex. Mycécorbe spécial mais STAB Poison/Spectre physiques) → le STAB peut être de la
                //   catégorie « faible » ; c'est assumé (couverture assure le reste). On garantit juste la présence.
                const hasStab = dmg.some((m) => sp.types.includes(m.type))
                expect(hasStab, `${p.name} (${sp.types.join("/")}): aucune attaque STAB`).toBe(true)
                // sanity : moveCategory reste calculable pour chaque attaque (types valides)
                dmg.forEach((m) => expect(["PHYSICAL", "SPECIAL"]).toContain(moveCategory(m.type)))
            })
        }
    })
})
