import { describe, it, expect } from "vitest"
import { RUN2_BADGES, evaluateRun2Badges, run2FunScoreWithMedals, run2EarnedBadgeIds, RUN2_MAX_POINTS, PANTHER_IDS } from "./run2Badges"
import { badgeInputFromSave } from "./run1Badges"

const mon = (speciesId: string, level = 40, shiny = false) => ({ uid: `${speciesId}-${level}`, speciesId, level, shiny, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE" as const, statusCounter: 0, exp: 0, moves: [], owned: true })

describe("run2Badges — échelle & barème", () => {
    it("54 hauts faits, ids UNIQUES, tous préfixés r2_", () => {
        expect(RUN2_BADGES).toHaveLength(54)
        expect(new Set(RUN2_BADGES.map((b) => b.id)).size).toBe(54)
        for (const b of RUN2_BADGES) expect(b.id.startsWith("r2_")).toBe(true)
    })
    it("le total maxi (×1) vaut 2580 pts (spec artefact)", () => {
        expect(RUN2_MAX_POINTS).toBe(2580)
    })

    it("save vierge : rien gagné ; les badges `todo` sont révélés mais jamais gagnés", () => {
        const i = badgeInputFromSave({ pokedex: { seen: [], caught: [] }, team: [], pc: [], badges: [] }, undefined, "fun")
        const r = evaluateRun2Badges(i)
        expect(r.earnedCount).toBe(0)
        for (const b of r.badges.filter((x) => x.todo)) { expect(b.earned).toBe(false); expect(b.revealed).toBe(true) }
    })

    it("champion re-sacré, arènes, captures & shiny → hauts faits gagnés", () => {
        const caught = ["ukognos", "gekraise", "merorem", "morrow", "orcaline", "pantheon", ...PANTHER_IDS]
        const i = badgeInputFromSave({
            isChampion: true,
            badges: ["plante", "roche", "feu", "elec", "glace"], // 5 arènes
            aceWins: 7,
            boughtCts: ["ct1"],
            items: { master_ball: 1 },
            pokedex: { seen: [], caught },
            team: [mon("pyropanthe", 60, true), mon("aquapanthe", 60, true), mon("voltapanthe", 60, true), mon("florapanthe", 60, true), mon("panthegel", 60, true), mon("ombrapanthe", 60, true)],
            pc: [],
        }, undefined, "fun")
        const ids = new Set(run2EarnedBadgeIds(i))
        expect(ids.has("r2_double")).toBe(true)       // 250
        expect(ids.has("r2_arenas5")).toBe(true)      // 160
        expect(ids.has("r2_arena1")).toBe(true)       // 20
        expect(ids.has("r2_ukognos")).toBe(true)      // 160
        expect(ids.has("r2_panthers6")).toBe(true)    // 100
        expect(ids.has("r2_pantheon_evo")).toBe(true) // 100
        expect(ids.has("r2_ace7")).toBe(true)         // 60
        expect(ids.has("r2_ct_bought")).toBe(true)    // 60
        expect(ids.has("r2_master_ball")).toBe(true)  // 35
        expect(ids.has("r2_shiny6")).toBe(true)       // 160
        expect(ids.has("r2_shiny1")).toBe(true)       // 35
        expect(ids.has("r2_team6")).toBe(true)        // 10
        expect(ids.has("r2_merorem")).toBe(true)
        // todo jamais gagné, même « riche »
        for (const b of RUN2_BADGES.filter((b) => b.todo)) expect(ids.has(b.id)).toBe(false)
    })

    it("médaille OR ×1,6 : score pondéré par rang", () => {
        const i = badgeInputFromSave({ isChampion: true, badges: [], pokedex: { seen: [], caught: [] }, team: [], pc: [] }, undefined, "fun")
        // r2_double (250) gagné. OR sur ce badge → 250 × 1,6 = 400.
        const orAll = run2FunScoreWithMedals(i, () => 0)     // rang 0 = OR partout
        const normalAll = run2FunScoreWithMedals(i, () => 9) // rang ≥3 = ×1
        expect(normalAll).toBe(250)
        expect(orAll).toBe(400)
    })
})
