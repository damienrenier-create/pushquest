import { describe, it, expect } from "vitest"
import { hydratePlayer, snapshotFusionChampionRoster, getFusionChampionRoster } from "./playerStore"
import type { MonInstance } from "../battle/types"

const mon = (uid: string, speciesId: string): MonInstance => ({
    uid, speciesId, level: 50, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 },
    currentHp: 100, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true,
})

describe("SALLE ULTIME — gel & reconstruction du roster de fusion (reflet)", () => {
    it("snapshot puis get : les parents du roster sont gelés À PLAT [a,b,a,b], clone profond", () => {
        const original = mon("a1", "razmaree")
        hydratePlayer({
            reps: 0, repsCap: 1000, repsBankedTotal: 0,
            team: [original, mon("b1", "magnetor"), mon("a2", "cerfeuillu"), mon("b2", "pyrokoss")],
            fusionRoster: [{ a: "a1", b: "b1" }, { a: "a2", b: "b2" }],
        })
        snapshotFusionChampionRoster("bronze")
        const flat = getFusionChampionRoster("bronze")
        expect(flat.map((m) => m.speciesId)).toEqual(["razmaree", "magnetor", "cerfeuillu", "pyrokoss"]) // paires à plat, ordre du roster
        expect(getFusionChampionRoster("argent")).toEqual([]) // un autre palier reste vide

        // CLONE PROFOND : muter l'instance d'équipe d'origine APRÈS le gel ne change pas le snapshot.
        original.level = 1
        expect(getFusionChampionRoster("bronze")[0].level).toBe(50)
    })

    it("roster incomplet (parent manquant) : la paire est simplement ignorée", () => {
        hydratePlayer({
            reps: 0, repsCap: 1000, repsBankedTotal: 0,
            team: [mon("a1", "razmaree")], // b1 absent
            fusionRoster: [{ a: "a1", b: "b1" }],
        })
        snapshotFusionChampionRoster("or")
        expect(getFusionChampionRoster("or")).toEqual([]) // paire incomplète → rien gelé (pas de crash)
    })
})
