import { describe, it, expect } from "vitest"
import { buildAceTeam } from "./ace"
import type { PokeType } from "../battle/types"

// NG+ (2e run) : ACE remplace les 3 Panthéon par tonytony/enclumind/tortoracle et Divin Pâte par le NÉMÉSIS.
// La RÈGLE d'ACE est inchangée : tout au niveau CLIQUET, chaque espèce rétro-évoluée au bon stade pour ce niveau.
describe("ACE NG+ — équipe Némésis", () => {
    const base = { aceLevel: 5, playerLastTypes: ["FEU"] as PokeType[], badgeCount: 0 }

    it("NG+ : trio thématisé + Némésis à la place de Divin Pâte (6 slots, tous au niveau cliquet)", () => {
        const { team } = buildAceTeam({ ...base, ngplus: true, nemesisSpeciesId: "custom_nem_x_s1" })
        expect(team).toHaveLength(6)
        expect(team.every((m) => m.level === 5)).toBe(true) // niveau cliquet uniforme
        expect(team[0].speciesId).toBe("tonytony")          // slot 1 = tonytony (souche = lui-même)
        expect(team[3].speciesId).toBe("custom_nem_x_s1")   // slot 4 = Némésis (non enregistré → id inchangé au niv 5)
        expect(team.some((m) => m.speciesId === "pantheon")).toBe(false) // plus de Panthéon en NG+
    })

    it("NG+ sans custom (fallback) : slot 4 = lignée Nouillon (Divin Pâte)", () => {
        const { team } = buildAceTeam({ ...base, ngplus: true })
        expect(team[3].speciesId).toBe("nouillon") // ACE_NOUILLON_BASE rétro-évolué au niv 5
    })

    it("stade respecte le niveau : enclumind rétro-évolué à sa souche au niv 5", () => {
        const { team } = buildAceTeam({ ...base, ngplus: true, nemesisSpeciesId: "custom_nem_x_s1" })
        expect(team[1].speciesId).toBe("forgeotin") // enclumind (final) → souche forgeotin au niv 5
    })

    it("run normal (non-NG+) : Panthéon inchangé (slot 1 = pantheon à 0 badge)", () => {
        const { team } = buildAceTeam({ ...base })
        expect(team[0].speciesId).toBe("pantheon")
        expect(team.some((m) => m.speciesId === "tonytony")).toBe(false)
    })
})
