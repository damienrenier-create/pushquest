import { describe, it, expect } from "vitest"
import { createRace, stepRace, ranking, progressOf, type Entrant, type RaceState } from "./engine"
import { getTrack } from "./track"
import { Rng } from "../battle/rng"

const BAL = { hp: 90, atk: 90, def: 90, spe: 90, spc: 90 }
const field = (n: number): Entrant[] => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `Pilote ${i}`, base: BAL, isPlayer: false }))
const IDLE = { throttle: false, brake: false, steer: 0, nitro: false }

function run(race: RaceState, maxSecs = 400): number {
    const dt = 1 / 60
    let steps = 0
    while (race.status !== "finished" && steps < maxSecs / dt) { stepRace(race, IDLE, dt); steps++ }
    return steps * dt
}

describe("moteur de course", () => {
    it("grille + décompte : 6 pilotes, départ après le compte à rebours", () => {
        const race = createRace(getTrack("test_ring"), field(6), new Rng(1))
        expect(race.racers).toHaveLength(6)
        expect(race.status).toBe("countdown")
        const dt = 1 / 60
        for (let i = 0; i < Math.round(3.1 / dt); i++) stepRace(race, IDLE, dt)
        expect(race.status).toBe("racing")
    })

    it("les IA bouclent le circuit et TOUTES finissent la course", () => {
        const race = createRace(getTrack("test_ring"), field(6), new Rng(7))
        run(race)
        expect(race.status).toBe("finished")
        for (const r of race.racers) {
            expect(r.finished).toBe(true)
            expect(r.lap).toBe(race.track.laps)
            expect(r.finishTime).toBeGreaterThan(0)
        }
    })

    it("classement : arrivés d'abord, triés par temps", () => {
        const race = createRace(getTrack("test_ring"), field(6), new Rng(3))
        run(race)
        const rk = ranking(race)
        for (let i = 1; i < rk.length; i++) expect(rk[i - 1].finishTime).toBeLessThanOrEqual(rk[i].finishTime)
    })

    it("la course se termine dès que le JOUEUR a fini — les retardataires sont finalisés (pas de boucle infinie)", () => {
        const ents: Entrant[] = [
            { id: "player", name: "Toi", base: BAL, isPlayer: true },
            { id: "ai0", name: "IA0", base: BAL, isPlayer: false },
            { id: "ai1", name: "IA1", base: BAL, isPlayer: false },
        ]
        const race = createRace(getTrack("test_ring"), ents, new Rng(2))
        const dt = 1 / 60
        for (let i = 0; i < Math.round(3.1 / dt); i++) stepRace(race, IDLE, dt) // fin du décompte
        expect(race.status).toBe("racing")
        // Le joueur franchit la ligne (simulé) → la course DOIT se clore au pas suivant.
        const player = race.racers.find((r) => r.isPlayer)!
        player.finished = true
        player.finishTime = race.time
        stepRace(race, IDLE, dt)
        expect(race.status).toBe("finished")
        for (const r of race.racers) expect(r.finished).toBe(true) // retardataires marqués finis
    })

    it("garde-fou de temps : la course ne tourne jamais au-delà du plafond (IA coincée)", () => {
        const race = createRace(getTrack("test_ring"), field(6), new Rng(11))
        const dt = 1 / 60
        // On avance jusqu'au plafond dur, quoi qu'il arrive, la course doit être finie.
        for (let i = 0; i < Math.round(245 / dt) && race.status !== "finished"; i++) stepRace(race, IDLE, dt)
        expect(race.status).toBe("finished")
        for (const r of race.racers) expect(r.finished).toBe(true)
    })

    it("un pilote plus RAPIDE (grosse Vitesse) devance un pilote lent, toutes choses égales", () => {
        const ents: Entrant[] = [
            { id: "fast", name: "Rapide", base: { ...BAL, spe: 140 }, isPlayer: false },
            { id: "slow", name: "Lent", base: { ...BAL, spe: 40 }, isPlayer: false },
        ]
        const race = createRace(getTrack("test_ring"), ents, new Rng(5))
        run(race)
        const fast = race.racers.find((r) => r.id === "fast")!
        const slow = race.racers.find((r) => r.id === "slow")!
        expect(fast.finishTime).toBeLessThan(slow.finishTime)
    })
})
