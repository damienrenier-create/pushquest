import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"

// Dégâts subis par la cible quand le lanceur (rapide) utilise Draco-Rage.
function dracoRageDelta(attackerId: string, atkLvl: number, defenderId: string, defLvl: number): number {
    const s0 = createBattle(
        [createMonInstance(attackerId, atkLvl, { moveIds: ["draco_rage"] })],
        [createMonInstance(defenderId, defLvl)],
        { isWild: true, seed: 3 },
    )
    const before = s0.enemy.team[s0.enemy.activeIndex].currentHp
    const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
    const after = s1.enemy.team[s1.enemy.activeIndex].currentHp
    return before - after
}

describe("Draco-Rage — dégâts fixes 40 (façon Gen 1)", () => {
    it("inflige exactement 40 PV, même contre une énorme Défense (Rochison déf 138)", () => {
        // Draconarque (rapide) frappe en premier ; la Défense ne doit RIEN changer aux dégâts fixes.
        expect(dracoRageDelta("draconarque", 70, "rochison", 60)).toBe(40)
    })

    it("toujours 40 contre un Dragon — AUCUN bonus d'efficacité ×2", () => {
        // Dragon→Dragon serait ×2 pour une attaque normale ; les dégâts fixes l'ignorent.
        expect(dracoRageDelta("draconarque", 70, "goshendofy", 30)).toBe(40)
    })
})
