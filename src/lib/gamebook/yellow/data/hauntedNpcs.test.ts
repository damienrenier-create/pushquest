import { describe, it, expect } from "vitest"
import { createMonInstance } from "../battle/factory"
import { hydratePlayer, getPlayer, recordHhCollectorWin, applyTradeEvolution } from "../store/playerStore"
import { buildHhCollectorTeam } from "./hauntedNpcs"

describe("Maison hantée — PNJ1 BROCANTEUR (échange → rochison)", () => {
    it("un Roctaur reçu par échange évolue aussitôt en Rochison", () => {
        const roc = createMonInstance("roctaur", 30, { owned: true })
        hydratePlayer({ team: [roc] })
        const evo = applyTradeEvolution(roc.uid)
        expect(evo).toBeTruthy()
        expect(evo!.toId).toBe("rochison")
        expect(getPlayer().team[0].speciesId).toBe("rochison")
    })
})

describe("Maison hantée — PNJ2 COLLECTIONNEUR de spectres (CT26)", () => {
    it("récompense la CT26 à 3 victoires ET 3 spectres DISTINCTS", () => {
        hydratePlayer({ ownedCts: [], hhSpectresShown: [], hhCollectorWins: 0 })
        expect(recordHhCollectorWin(["brook"]).rewarded).toBe(false)   // 1 victoire, 1 spectre
        expect(recordHhCollectorWin(["hibouh"]).rewarded).toBe(false)  // 2 victoires, 2 spectres
        const r = recordHhCollectorWin(["sporbeo"])                    // 3 victoires, 3 spectres → CT
        expect(r.rewarded).toBe(true)
        expect(r.wins).toBe(3)
        expect(r.shown).toBe(3)
        expect(getPlayer().ownedCts).toContain("ct26")
    })

    it("pas de CT si < 3 spectres distincts (même spectre répété 3×)", () => {
        hydratePlayer({ ownedCts: [], hhSpectresShown: [], hhCollectorWins: 0 })
        recordHhCollectorWin(["brook"])
        recordHhCollectorWin(["brook"])
        const r = recordHhCollectorWin(["brook"]) // 3 victoires mais 1 seul spectre distinct
        expect(r.wins).toBe(3)
        expect(r.shown).toBe(1)
        expect(r.rewarded).toBe(false)
        expect(getPlayer().ownedCts).not.toContain("ct26")
    })

    it("pas de CT à 3 spectres mais < 3 victoires", () => {
        hydratePlayer({ ownedCts: [], hhSpectresShown: [], hhCollectorWins: 0 })
        const r = recordHhCollectorWin(["brook", "hibouh", "sporbeo"]) // 1 victoire, 3 spectres d'un coup
        expect(r.shown).toBe(3)
        expect(r.wins).toBe(1)
        expect(r.rewarded).toBe(false)
    })

    it("son équipe a l'AS Ombrapanthe (panthère SPECTRE) au-dessus des 3 spectres", () => {
        const team = buildHhCollectorTeam(40)
        expect(team.length).toBe(4)
        const ace = team.find((m) => m.speciesId === "ombrapanthe")
        expect(ace).toBeTruthy()
        expect(ace!.level).toBe(42) // niveau +2
    })
})
