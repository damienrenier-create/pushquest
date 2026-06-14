import { describe, it, expect } from "vitest"
import { rollWildEncounter, hasEncounters } from "./encounters"
import { getSpecies } from "./species"
import { Rng } from "../battle/rng"
import { createBattle, resolveTurn } from "../battle/engine"
import { createMonInstance } from "../battle/factory"
import type { MonInstance, MajorStatus } from "../battle/types"

const MAP = "yellow_maison_hantee"
const isGhostOrPsy = (id: string) => {
    const t = getSpecies(id)?.types ?? []
    return t.includes("SPECTRE") || t.includes("PSY")
}

describe("Maison hantée — zone de rencontres", () => {
    const r = new Rng(424242)
    const rng = () => r.next()
    const seen: Record<string, MonInstance> = {}
    for (let i = 0; i < 6000; i++) {
        const mon = rollWildEncounter({ mapId: MAP, x: 10, y: 8, leadLevel: 28, weakestTeamLevel: 18, strongestTeamLevel: 40, rng })
        if (mon && !seen[mon.speciesId]) seen[mon.speciesId] = mon
    }

    it("zone reconnue + ne fait apparaître QUE des Spectre/Psy (évolutions incluses)", () => {
        expect(hasEncounters(MAP)).toBe(true)
        for (const id of Object.keys(seen)) expect(isGhostOrPsy(id), `${id} n'est ni Spectre ni Psy`).toBe(true)
    })

    it("Brook (commun) apparaît au niveau 20 ; Hibouh (15-18)", () => {
        expect(seen.brook, "Brook absent").toBeTruthy()
        expect(seen.brook.level).toBe(20)
        expect(seen.hibouh, "Hibouh absent").toBeTruthy()
        expect(seen.hibouh.level).toBeGreaterThanOrEqual(15)
        expect(seen.hibouh.level).toBeLessThanOrEqual(18)
    })

    it("Bouh = kamikaze : ouvre par Détonation, capturable Super Ball+ OU statut", () => {
        const b = seen.bouh
        expect(b, "Bouh absent").toBeTruthy()
        expect(b.level).toBe(30)
        expect(b.moves.some((m) => m.moveId === "detonation")).toBe(true)
        const cfg = b as unknown as { openingMoves?: string[]; captureMinBallBonus?: number; captureStatusBypassesBall?: boolean }
        expect(cfg.openingMoves).toContain("detonation")
        expect(cfg.captureMinBallBonus).toBe(2)
        expect(cfg.captureStatusBypassesBall).toBe(true)
    })

    it("Vipember = le + fort de l'équipe +5 (levelMode strongestTeam)", () => {
        expect(seen.vipember, "Vipember absent").toBeTruthy()
        expect(seen.vipember.level).toBe(45) // strongestTeamLevel(40) + 5
    })

    it("Regnantaur / Enclumind au niveau 45 ; Namicha ouvre par Mirage", () => {
        expect(seen.regnantaur?.level).toBe(45)
        expect(seen.enclumind?.level).toBe(45)
        const n = seen.namicha as unknown as { openingMoves?: string[] }
        expect(seen.namicha?.moves.some((m) => m.moveId === "mirage")).toBe(true)
        expect(n.openingMoves).toContain("mirage")
    })
})

describe("Détonation — l'attaquant reste à 1 PV (kamikaze)", () => {
    it("après Détonation, le lanceur tombe à 1 PV (pas K.O.) — émet l'event de dislocation + un PV de 1", () => {
        const attacker = createMonInstance("brookhante", 50)
        attacker.moves = [{ moveId: "detonation", pp: 5, ppMax: 5 }]
        // Ennemi très faible → Détonation le met K.O. d'emblée, donc PAS de riposte qui achèverait
        // l'attaquant à 1 PV → on peut vérifier l'état final ET l'event.
        const start = createBattle([attacker], [createMonInstance("cailloutchi", 6, { owned: false })], { isWild: true, seed: 5 })
        const after = resolveTurn(start, { kind: "move", moveIndex: 0 })
        expect(after.events.some((e) => e.kind === "message" && e.text?.includes("disloque"))).toBe(true)
        expect(after.player.team[after.player.activeIndex].currentHp).toBe(1)
    })
})

function wildMon(speciesId: string, level: number, cfg: { currentHp?: number; status?: MajorStatus; captureMinBallBonus?: number; captureStatusBypassesBall?: boolean }): MonInstance {
    const m = createMonInstance(speciesId, level, { owned: false })
    if (cfg.currentHp != null) m.currentHp = cfg.currentHp
    if (cfg.status) m.status = cfg.status
    const { currentHp: _h, status: _s, ...battle } = cfg
    Object.assign(m, battle)
    return m
}
const ricochet = (events: { kind: string; text?: string }[]) => events.some((e) => e.kind === "message" && e.text?.includes("ricoche"))

describe("Bouh — capture Super Ball+ OU statut", () => {
    const mk = () => [createMonInstance("cailloutchi", 40)]
    it("Poké Ball sans statut → ricoche (échec)", () => {
        const wild = [wildMon("bouh", 30, { captureMinBallBonus: 2, captureStatusBypassesBall: true, currentHp: 1 })]
        const after = resolveTurn(createBattle(mk(), wild, { isWild: true, seed: 3 }), { kind: "ball", itemId: "poke_ball" })
        expect(after.outcome).not.toBe("caught")
        expect(ricochet(after.events)).toBe(true)
    })
    it("Poké Ball + statut → le statut shunte le verrou (pas de ricochet)", () => {
        const wild = [wildMon("bouh", 30, { captureMinBallBonus: 2, captureStatusBypassesBall: true, status: "SLEEP", currentHp: 1 })]
        const after = resolveTurn(createBattle(mk(), wild, { isWild: true, seed: 3 }), { kind: "ball", itemId: "poke_ball" })
        expect(ricochet(after.events)).toBe(false)
    })
    it("Super Ball sans statut → pas de ricochet (Ball assez forte)", () => {
        const wild = [wildMon("bouh", 30, { captureMinBallBonus: 2, captureStatusBypassesBall: true, currentHp: 1 })]
        const after = resolveTurn(createBattle(mk(), wild, { isWild: true, seed: 3 }), { kind: "ball", itemId: "super_ball" })
        expect(ricochet(after.events)).toBe(false)
    })
})
