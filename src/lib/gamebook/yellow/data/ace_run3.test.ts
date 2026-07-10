import { describe, it, expect } from "vitest"
import { buildAceTeam, aceReward } from "./ace"
import type { PokeType } from "../battle/types"

// RUN 3 (concours) : ACE sort une équipe FIXE de 6 — contre-starter (némésis) EN TÊTE + Gékraise + Orcaline +
// Lavapetit(→Magmator au niveau) + 2 Panthéon. Aucun contre adaptatif. Récompenses : Balls + Panthéon, JAMAIS de reps.
describe("ACE run 3 — équipe fixe + récompenses sans énergie", () => {
    const base = { aceLevel: 60, playerLastTypes: ["FEU"] as PokeType[], badgeCount: 3 }

    it("6 slots au niveau d'ACE, contre-starter en tête, formes évoluées naturelles", () => {
        const { team } = buildAceTeam({ ...base, run3: true, nemesisSpeciesId: "coccipoing" })
        expect(team).toHaveLength(6)
        expect(team.every((m) => m.level === 60)).toBe(true)
        expect(team[0].speciesId).toBe("coccimperatrice") // némésis coccipoing → finale au niv 60, EN TÊTE (survit au slice)
        const ids = team.map((m) => m.speciesId)
        expect(ids).toContain("gekraise")
        expect(ids).toContain("orcaline")
        expect(ids).toContain("magmator")               // lavapetit évolué (17→37) au niv 60
        expect(ids.filter((s) => s === "pantheon")).toHaveLength(2)
        expect(ids).not.toContain("lavapetit")          // jamais un lavapetit niveau 60 (forme non naturelle)
    })

    it("fallback si starter inconnu : némésis = lignée Nouillon", () => {
        const { team } = buildAceTeam({ ...base, run3: true })
        expect(team[0].speciesId).toBe("divinpate") // nouillon → finale au niv 60
    })

    it("aceReward run 3 : Balls oui, reps/refund JAMAIS", () => {
        for (const n of [1, 2, 3, 4, 5, 6, 8, 9]) {
            const r = aceReward(n, true)
            expect(r.reps, `win ${n}`).toBeUndefined()
            expect(r.refund, `win ${n}`).toBeFalsy()
        }
        expect(aceReward(1, true).itemId).toBe("poke_ball_plus") // Ball conservée
        expect(aceReward(7, true).gift).toBe("pantheon")         // Panthéon (espèce, pas énergie) conservé
    })

    it("run 1 (non-run3) : reps toujours présents (régression)", () => {
        expect(aceReward(1, false).reps).toBe(100)
        expect(aceReward(8, false).refund).toBe(true)
    })
})
