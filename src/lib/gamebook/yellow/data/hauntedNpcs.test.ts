import { describe, it, expect } from "vitest"
import { createMonInstance } from "../battle/factory"
import { hydratePlayer, getPlayer, recordHhCollectorWin, applyTradeEvolution } from "../store/playerStore"
import { buildHhCollectorTeam, HH_COLLECTOR_INTRO_LINES, HH_COLLECTOR_REMINDER_LINES, HH_TRADE_GIVE, HH_TRADE_RECEIVE } from "./hauntedNpcs"
import { getSpecies } from "./species"
import { getMove } from "./moves"

describe("Roctaur → Rochison par échange (désormais via troc entre joueurs réels)", () => {
    it("un Roctaur reçu par échange évolue aussitôt en Rochison", () => {
        const roc = createMonInstance("roctaur", 30, { owned: true })
        hydratePlayer({ team: [roc] })
        const evo = applyTradeEvolution(roc.uid)
        expect(evo).toBeTruthy()
        expect(evo!.toId).toBe("rochison")
        expect(getPlayer().team[0].speciesId).toBe("rochison")
    })
})

describe("Maison hantée — PNJ1 BROCANTEUR : Roctaur → MORROW", () => {
    it("le BROCANTEUR DEMANDE un Roctaur et donne un Morrow", () => {
        expect(HH_TRADE_GIVE).toBe("roctaur")
        expect(HH_TRADE_RECEIVE).toBe("morrow")
    })
    it("Morrow ne trade-évolue PAS (l'échange ne le transforme pas)", () => {
        const m = createMonInstance("morrow", 30, { owned: true })
        hydratePlayer({ team: [m] })
        expect(applyTradeEvolution(m.uid)).toBeNull()
    })
    it("Morrow : Glace/Psy, dexNo 138, attaquant spécial (SPÉ dominant), BST ≥ 438", () => {
        const sp = getSpecies("morrow")!
        expect(sp.types).toEqual(["GLACE", "PSY"])
        expect(sp.dexNo).toBe(138)
        const s = sp.baseStats
        expect(Object.values(s).reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(438)
        expect(s.spc).toBeGreaterThanOrEqual(Math.max(s.hp, s.atk, s.def, s.spe))
    })
    it("kit charmeur : Hypnose (sommeil) + STAB Glace ET Psy", () => {
        const ids = getSpecies("morrow")!.learnset.map((l) => l.moveId)
        expect(ids).toContain("hypnose")
        const types = ids.map((id) => getMove(id)?.type)
        expect(types).toContain("GLACE")
        expect(types).toContain("PSY")
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

    it("équipe de 6, réguliers ≤ 40 + AS Ombrapanthe à 42, un SEUL spectre", () => {
        const team = buildHhCollectorTeam(60) // joueur très haut niveau
        expect(team.length).toBe(6)
        const lvl = (id: string) => team.find((m) => m.speciesId === id)!.level
        expect(lvl("gloutanoir")).toBe(39)
        expect(lvl("magmator")).toBe(40)
        expect(lvl("ombrapanthe")).toBe(42) // l'AS
        for (const m of team) if (m.speciesId !== "ombrapanthe") expect(m.level).toBeLessThanOrEqual(40)
        // il CHERCHE les spectres → il en possède peu : un seul (son AS panthère)
        const spectres = team.filter((m) => getSpecies(m.speciesId)!.types.includes("SPECTRE"))
        expect(spectres.length).toBe(1)
    })

    it("le collectionneur scale vers le bas pour un petit joueur (réguliers ≤ niveau joueur, AS = +2)", () => {
        const team = buildHhCollectorTeam(25)
        for (const m of team) if (m.speciesId !== "ombrapanthe") expect(m.level).toBeLessThanOrEqual(25)
        expect(team.find((m) => m.speciesId === "ombrapanthe")!.level).toBe(27) // cap 25 + 2
    })

    it("l'intro explique CLAIREMENT la mécanique : garder les spectres dans l'équipe", () => {
        const blob = HH_COLLECTOR_INTRO_LINES.join(" ").toLowerCase()
        expect(blob).toContain("équipe") // il faut les GARDER dans l'équipe
        expect(blob).toMatch(/3 (victoires|fois)/) // l'objectif chiffré est dit
        // le rappel court existe et est plus bref que le topo complet
        expect(HH_COLLECTOR_REMINDER_LINES.length).toBeGreaterThan(0)
        expect(HH_COLLECTOR_REMINDER_LINES.length).toBeLessThan(HH_COLLECTOR_INTRO_LINES.length)
    })
})
