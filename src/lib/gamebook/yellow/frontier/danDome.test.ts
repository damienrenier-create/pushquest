import { describe, it, expect } from "vitest"
import { createDome, danTeamToSpecs, DOME_SIZE } from "./dome"
import { DAN_POOL } from "./danTeams"
import { Rng } from "../battle/rng"

const playerTeam = [{ speciesId: "razmaree", level: 100 }, { speciesId: "pyrokoss", level: 100 }]

describe("danTeamToSpecs — traduction d'une équipe désignée en adversaires", () => {
    const t = DAN_POOL[0]
    it("porte le moveset + l'objet imposés, au niveau du dan", () => {
        const specs = danTeamToSpecs(t, 100, "none")
        expect(specs.length).toBe(6)
        expect(specs[0].speciesId).toBe(t.mons[0].speciesId)
        expect(specs[0].moveIds).toEqual(t.mons[0].moveIds)
        expect(specs[0].heldItemId).toBe(t.mons[0].heldItemId)
        expect(specs.every((s) => s.level === 100)).toBe(true)
    })
    it("applique le shiny selon le grade : none=0, half=3, full=6", () => {
        expect(danTeamToSpecs(t, 100, "none").filter((s) => s.shiny).length).toBe(0)
        expect(danTeamToSpecs(t, 100, "half").filter((s) => s.shiny).length).toBe(3)
        expect(danTeamToSpecs(t, 100, "full").filter((s) => s.shiny).length).toBe(6)
    })
})

describe("createDome — bracket de la Voie du Maître (équipes désignées)", () => {
    it("remplit les 7 adversaires avec des équipes DÉSIGNÉES du pool (moveset + shiny du grade)", () => {
        const state = createDome(new Rng(42), { level: 100, streak: 46, playerTeam, danShiny: "full" })
        const foes = state.entrants.filter((e) => !e.isPlayer)
        expect(foes.length).toBe(DOME_SIZE - 1)
        const poolSpecies = new Set(DAN_POOL.flatMap((t) => t.mons.map((m) => m.speciesId)))
        for (const f of foes) {
            expect(f.team.length).toBe(6)
            for (const m of f.team) {
                expect(poolSpecies.has(m.speciesId), `${m.speciesId} hors pool désigné`).toBe(true)
                expect(m.moveIds && m.moveIds.length).toBe(4) // moveset imposé
                expect(m.shiny).toBe(true)                    // grade full → toute l'équipe shiny
            }
        }
    })
    it("tire des équipes désignées DISTINCTES (pas 7 fois la même)", () => {
        const state = createDome(new Rng(7), { level: 100, streak: 34, playerTeam, danShiny: "none" })
        const foes = state.entrants.filter((e) => !e.isPlayer)
        // signature = 1er speciesId de chaque équipe (unique par équipe du pool → distinctes)
        const leads = foes.map((f) => f.team[0].speciesId)
        expect(new Set(leads).size).toBe(foes.length)
    })
    it("tiers normaux (danShiny absent) = toujours procédural, aucun moveset imposé", () => {
        const state = createDome(new Rng(1), { level: 60, streak: 9, playerTeam })
        const foes = state.entrants.filter((e) => !e.isPlayer)
        expect(foes.every((f) => f.team.every((m) => m.moveIds === undefined))).toBe(true)
    })
})
