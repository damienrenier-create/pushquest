import { describe, it, expect } from "vitest"
import { jcRewardForWin } from "./engine"
import {
    startFrontierRun, applyFrontierWin, applyFrontierLoss, quitFrontierRun, currentWaveNumber,
    type FrontierRunState,
} from "./run"

const start = (over: Partial<{ seed: number; level: any; top: number }> = {}): FrontierRunState =>
    startFrontierRun({ mode: "TOWER", levelRule: (over.level ?? "L50"), playerTopLevel: over.top ?? 50, seed: over.seed ?? 42 })

describe("Frontier run — démarrage", () => {
    it("série active, streak 0, vague 1 prête (équipe de 3 au bon niveau)", () => {
        const s = start()
        expect(s.status).toBe("active")
        expect(s.streak).toBe(0)
        expect(currentWaveNumber(s)).toBe(1)
        expect(s.opponent.length).toBe(3)
        expect(s.opponent.every(m => m.level === 50)).toBe(true)
        expect(s.isBoss).toBe(false) // vague 1 n'est pas un boss
    })
    it("ADAPT : niveau calé sur le plus haut Daemon du joueur", () => {
        const s = start({ level: "ADAPT", top: 41 })
        expect(s.level).toBe(41)
        expect(s.opponent.every(m => m.level === 41)).toBe(true)
    })
})

describe("Frontier run — victoires", () => {
    it("chaque victoire : streak++, JC cumulés (= barème), nouvelle vague valide", () => {
        let s = start()
        s = applyFrontierWin(s, 30)
        expect(s.streak).toBe(1)
        expect(s.jc).toBe(jcRewardForWin("L50", 1))
        expect(s.lastReward).toBe(jcRewardForWin("L50", 1))
        expect(s.lastRefund).toBeGreaterThan(0)
        expect(s.opponent.length).toBe(3) // nouvelle vague prête
        expect(currentWaveNumber(s)).toBe(2)
    })
    it("la 7e victoire est un BOSS (récompense ×5) et la vague 7 est marquée boss", () => {
        let s = start()
        for (let i = 0; i < 6; i++) s = applyFrontierWin(s, 20) // 6 victoires
        expect(s.streak).toBe(6)
        expect(currentWaveNumber(s)).toBe(7)
        expect(s.isBoss).toBe(true)                 // la vague 7 (à venir) est un boss
        const before = s.jc
        s = applyFrontierWin(s, 20)                  // on gagne le boss
        expect(s.lastReward).toBe(jcRewardForWin("L50", 7))
        expect(s.jc - before).toBe(jcRewardForWin("L50", 1) * 5)
    })
    it("déterministe : même graine → même séquence d'adversaires sur 10 vagues", () => {
        const seq = (seed: number) => { let s = start({ seed }); const out: string[] = []; for (let i = 0; i < 10; i++) { out.push(s.opponent.map(m => m.speciesId).join("|")); s = applyFrontierWin(s, 25) } return out }
        expect(seq(777)).toEqual(seq(777))
        expect(seq(777)).not.toEqual(seq(778)) // graines différentes → séquences différentes
    })
})

describe("Frontier run — fin de série", () => {
    it("défaite → série terminée, puis victoire ignorée (no-op)", () => {
        let s = start()
        s = applyFrontierWin(s, 20)
        const atLoss = applyFrontierLoss(s)
        expect(atLoss.status).toBe("ended")
        const after = applyFrontierWin(atLoss, 20)
        expect(after.streak).toBe(atLoss.streak) // pas d'avancée après la fin
        expect(after.status).toBe("ended")
    })
    it("forfait : termine la série en gardant les JC", () => {
        let s = start()
        s = applyFrontierWin(s, 20)
        const jcBefore = s.jc
        const q = quitFrontierRun(s)
        expect(q.status).toBe("ended")
        expect(q.jc).toBe(jcBefore)
    })
})
