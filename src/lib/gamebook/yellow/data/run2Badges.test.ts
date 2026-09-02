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

    it("markers de récolte/zone/échange → hauts faits instrumentés (Phase 3)", () => {
        const markers = [
            "ach_berry:baie_soin", "ach_berry:baie_pure", "ach_berry:baie_fougue", "ach_berry:baie_eclat",
            "ach_berry:baie_vive", "ach_berry:baie_roc", "ach_berry:baie_phenix", "ach_berry:baie_phenix_survive",
            "ach_run2ghost_win", "ach_arena_revanche", "ach_trade_shiny",
            "y_frere_frisquet", "y_frere_grelot", "y_frere_glagla", "y_frere_givre", "y_frere_blizzard", // 5 Frères Glaçon
            "y_plage_pecheur", "y_plage_nageuse", "y_plage_marin", // 3 Spectres de la Plage
        ]
        const i = badgeInputFromSave({ defeatedTrainers: markers, pokedex: { seen: [], caught: [] }, team: [], pc: [], badges: [] }, undefined, "fun")
        const ids = new Set(run2EarnedBadgeIds(i))
        for (const id of ["r2_berry_soin", "r2_berry_pure", "r2_berry_fougue", "r2_berry_eclat", "r2_berry_vive", "r2_berry_roc", "r2_berry_phenix",
            "r2_berry_phenix_survive", "r2_pnj_grotte", "r2_arena_revanche", "r2_trade_shiny", "r2_grotte_gelee", "r2_plage_hantee"]) {
            expect(ids.has(id)).toBe(true)
        }
    })

    it("il ne reste que 2 hauts faits `todo` (carillon CT + pokédex du Remix)", () => {
        expect(RUN2_BADGES.filter((b) => b.todo).map((b) => b.id).sort()).toEqual(["r2_carillon", "r2_dex_complete"])
    })

    it("Grotte Gelée : 4 frères sur 5 ne suffisent pas (il faut BLIZZARD aussi)", () => {
        const partial = ["y_frere_frisquet", "y_frere_grelot", "y_frere_glagla", "y_frere_givre"] // manque l'aîné
        const i = badgeInputFromSave({ defeatedTrainers: partial, pokedex: { seen: [], caught: [] }, team: [], pc: [], badges: [] }, undefined, "fun")
        expect(new Set(run2EarnedBadgeIds(i)).has("r2_grotte_gelee")).toBe(false)
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
