import { describe, it, expect, beforeEach } from "vitest"
import { jcRewardForWin } from "./engine"
import {
    startTowerRun, applyWinFromBattle, applyLossFromBattle, quitRun, endRun, getRun,
} from "./runStore"

beforeEach(() => endRun())

describe("runStore — cycle de série Tour", () => {
    it("démarre une série active (streak 0, vague 1)", () => {
        const r = startTowerRun({ levelRule: "L50", playerTopLevel: 50, seed: 42 })
        expect(r.status).toBe("active")
        expect(r.streak).toBe(0)
        expect(getRun()?.opponent.length).toBe(3)
    })

    it("3 victoires : streak monte, JC cumulés, adversaire renouvelé", () => {
        startTowerRun({ levelRule: "L50", playerTopLevel: 50, seed: 7 })
        let jc = 0
        for (let i = 1; i <= 3; i++) {
            const r = applyWinFromBattle(25)!
            jc += jcRewardForWin("L50", i)
            expect(r.streak).toBe(i)
            expect(r.jc).toBe(jc)
            expect(r.opponent.length).toBe(3)
        }
    })

    it("défaite → série terminée ; win ensuite = no-op", () => {
        startTowerRun({ levelRule: "L100", playerTopLevel: 100, seed: 5 })
        applyWinFromBattle(40)
        const lost = applyLossFromBattle()!
        expect(lost.status).toBe("ended")
        const after = applyWinFromBattle(40)!
        expect(after.streak).toBe(lost.streak)
    })

    it("forfait garde les JC ; endRun vide le run", () => {
        startTowerRun({ levelRule: "ADAPT", playerTopLevel: 60, seed: 9 })
        applyWinFromBattle(20)
        const jcBefore = getRun()!.jc
        const q = quitRun()!
        expect(q.status).toBe("ended")
        expect(q.jc).toBe(jcBefore)
        endRun()
        expect(getRun()).toBeNull()
    })

    it("déterministe : même graine → même 1re vague", () => {
        const a = startTowerRun({ levelRule: "L50", playerTopLevel: 50, seed: 123 })
        const ids1 = a.opponent.map(m => m.speciesId)
        endRun()
        const b = startTowerRun({ levelRule: "L50", playerTopLevel: 50, seed: 123 })
        expect(b.opponent.map(m => m.speciesId)).toEqual(ids1)
    })

    it("sans run actif : apply* renvoie null", () => {
        endRun()
        expect(applyWinFromBattle(10)).toBeNull()
        expect(applyLossFromBattle()).toBeNull()
        expect(quitRun()).toBeNull()
    })
})
