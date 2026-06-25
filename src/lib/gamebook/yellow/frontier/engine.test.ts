import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { SPECIES } from "../data/species"
import {
    resolveFrontierLevel, generateFrontierTeam, generateBossTeam, isBossWave,
    frontierRefundPct, frontierEnergyRefund, frontierNetEnergyCost, jcRewardForWin,
    E_REF, BOSS_EVERY,
} from "./engine"

const bst = (id: string) => { const b = (SPECIES[id] as any).baseStats; return b.hp + b.atk + b.def + b.spe + b.spc }

describe("Frontier — règles de niveau", () => {
    it("L50/L100 fixes, ADAPT = niveau du plus haut (clampé 5..100)", () => {
        expect(resolveFrontierLevel("L50", 30)).toBe(50)
        expect(resolveFrontierLevel("L100", 30)).toBe(100)
        expect(resolveFrontierLevel("ADAPT", 37)).toBe(37)
        expect(resolveFrontierLevel("ADAPT", 250)).toBe(100) // clamp haut
        expect(resolveFrontierLevel("ADAPT", 0)).toBe(50)    // défaut
    })
})

describe("Frontier — génération d'adversaires (déterministe)", () => {
    it("même seed → même équipe (reproductible)", () => {
        const a = generateFrontierTeam(new Rng(123), { streak: 10, level: 50 })
        const b = generateFrontierTeam(new Rng(123), { streak: 10, level: 50 })
        expect(a.map(m => m.speciesId)).toEqual(b.map(m => m.speciesId))
    })
    it("équipe de 3 espèces DISTINCTES, toutes au niveau demandé", () => {
        for (let s = 0; s < 50; s++) {
            const team = generateFrontierTeam(new Rng(s * 2654435761), { streak: 15, level: 50 })
            expect(team.length).toBe(3)
            expect(new Set(team.map(m => m.speciesId)).size).toBe(3) // pas de doublon
            for (const m of team) expect(m.level).toBe(50)
        }
    })
    it("difficulté croissante : BST moyen plus haut en série 30 qu'en série 1", () => {
        const avg = (streak: number) => {
            let tot = 0, n = 0
            for (let s = 0; s < 60; s++) for (const m of generateFrontierTeam(new Rng(s * 40503 + streak), { streak, level: 100 })) { tot += bst(m.speciesId); n++ }
            return tot / n
        }
        expect(avg(30)).toBeGreaterThan(avg(1))
    })
    it("ne tire JAMAIS un Daemon `exclusive` (uniques réservés aux boss/scénario)", () => {
        const exclusives = Object.values(SPECIES as any).filter((s: any) => s.exclusive).map((s: any) => s.id)
        expect(exclusives.length).toBeGreaterThanOrEqual(5)
        for (let s = 0; s < 200; s++) {
            for (const m of generateFrontierTeam(new Rng(s * 7919 + 1), { streak: 40, level: 100 })) {
                expect(exclusives).not.toContain(m.speciesId)
            }
        }
    })
    it("boss : BST moyen ≥ équipe normale de même série", () => {
        const mean = (gen: () => { speciesId: string }[]) => { let t = 0, n = 0; for (let s = 0; s < 50; s++) for (const m of gen.call(null)) { t += bst(m.speciesId); n++ }; return t / n }
        // (on régénère avec un seed variable côté boucle)
        let bossTot = 0, bossN = 0, normTot = 0, normN = 0
        for (let s = 0; s < 60; s++) {
            for (const m of generateBossTeam(new Rng(s + 11), 20, 100)) { bossTot += bst(m.speciesId); bossN++ }
            for (const m of generateFrontierTeam(new Rng(s + 11), { streak: 20, level: 100 })) { normTot += bst(m.speciesId); normN++ }
        }
        expect(bossTot / bossN).toBeGreaterThanOrEqual(normTot / normN)
        void mean
    })
})

describe("Frontier — remboursement d'énergie (victoire)", () => {
    it("0 dépensé → 10 % ; ≥ E_REF → 100 % ; bornes [10,100], paliers de 10", () => {
        expect(frontierRefundPct(0)).toBe(10)
        expect(frontierRefundPct(E_REF)).toBe(100)
        expect(frontierRefundPct(1000)).toBe(100)
        for (let e = 0; e <= 120; e += 3) {
            const p = frontierRefundPct(e)
            expect(p % 10).toBe(0)
            expect(p).toBeGreaterThanOrEqual(10)
            expect(p).toBeLessThanOrEqual(100)
        }
    })
    it("monotone croissant avec l'énergie dépensée", () => {
        let prev = 0
        for (let e = 0; e <= E_REF; e += 6) { const p = frontierRefundPct(e); expect(p).toBeGreaterThanOrEqual(prev); prev = p }
    })
    it("remboursement + coût net cohérents", () => {
        const spent = 50
        const refund = frontierEnergyRefund(spent)
        expect(refund).toBe(Math.floor(spent * frontierRefundPct(spent) / 100))
        expect(frontierNetEnergyCost(spent)).toBe(spent - refund)
    })
})

describe("Frontier — Jetons de Combat & cadence des boss", () => {
    it("boss tous les 7 combats", () => {
        expect(isBossWave(BOSS_EVERY)).toBe(true)
        expect(isBossWave(14)).toBe(true)
        expect(isBossWave(1)).toBe(false)
        expect(isBossWave(8)).toBe(false)
        expect(isBossWave(0)).toBe(false)
    })
    it("récompense : L100 > ADAPT > L50, et boss ×5", () => {
        expect(jcRewardForWin("L100", 1)).toBeGreaterThan(jcRewardForWin("ADAPT", 1))
        expect(jcRewardForWin("ADAPT", 1)).toBeGreaterThan(jcRewardForWin("L50", 1))
        expect(jcRewardForWin("L50", 7)).toBe(jcRewardForWin("L50", 1) * 5) // 7e = boss
    })
})
