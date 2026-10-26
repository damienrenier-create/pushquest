import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { PHYSICAL_ENERGY_REWARD, PHYSICAL_ENERGY_REWARD_MULT_NGPLUS, physEnergyBase, physEnergyRewardLabel, physScaledReward } from "./labDefis"

// 26/10/2026 (Sartay) : « run 2 : les défis du prof Chen doivent rapporter beaucoup plus d'énergie (5× plus qu'actuellement) ».
describe("défis physiques de Chen — récompense ×5 au run 2", () => {
    it("base : 100 ⚡ en run 1, 500 ⚡ en run 2 ; le répétable garde sa rampe ×1,05 par réussite", () => {
        expect(PHYSICAL_ENERGY_REWARD).toBe(100)
        expect(PHYSICAL_ENERGY_REWARD_MULT_NGPLUS).toBe(5)
        expect(physEnergyBase(false)).toBe(100)
        expect(physEnergyBase(true)).toBe(500)
        expect(physScaledReward(physEnergyBase(true), 0)).toBe(500)
        expect(physScaledReward(physEnergyBase(true), 3)).toBe(Math.floor(500 * 1.05 ** 3)) // 578
        expect(physScaledReward(physEnergyBase(false), 3)).toBe(Math.floor(100 * 1.05 ** 3)) // 115
        expect(physEnergyRewardLabel(true)).toBe("+500 énergie")
        expect(physEnergyRewardLabel(false)).toBe("+100 énergie")
    })
    it("câblage LabPanel : crédit ET libellés passent par physEnergyBase(ngplus) — plus aucun 100 codé en dur", () => {
        const lp = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/LabPanel.tsx"), "utf8")
        expect(lp).toContain("grantReps(physEnergyBase(ngplus))")
        expect(lp).toContain("grantReps(physScaledReward(physEnergyBase(ngplus), wins))")
        expect(lp).toContain("physScaledReward(physEnergyBase(ngplus), w)")
        expect(lp).toContain("x.kind === \"squat150\" ? physEnergyRewardLabel(ngplus) : x.reward")
        expect(lp).not.toContain("PHYSICAL_ENERGY_REWARD")
    })
})
