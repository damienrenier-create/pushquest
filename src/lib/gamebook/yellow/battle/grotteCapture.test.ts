import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import type { MonInstance } from "./types"

// RÈGLE GROTTE DU NEXUS : `captureRequiresDamage` → aucune capture tant que la cible est à PLEINS PV. La Master shunte.
const hasMsg = (st: BattleState, sub: string) => st.events.some((e) => e.kind === "message" && e.text.includes(sub))
const isMiss = (st: BattleState) => st.events.some((e) => e.kind === "ball" && e.action === "miss")
const isCaught = (st: BattleState) => st.events.some((e) => e.kind === "ball" && e.action === "result" && e.caught === true)

const player = () => createMonInstance("rochison", 50)
function grotteWild(hpFrac: number): MonInstance {
    const w = createMonInstance("plumiot", 5, { owned: false })
    w.captureRequiresDamage = true
    w.currentHp = Math.max(1, Math.round(w.currentHp * hpFrac))
    return w
}

describe("Grotte du Nexus — pas de capture à pleins PV", () => {
    it("à 100% PV : la Ball ricoche (message dédié), jamais capturé", () => {
        const s = createBattle([player()], [grotteWild(1)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "poke_ball" })
        expect(after.outcome).not.toBe("caught")
        expect(isCaught(after)).toBe(false)
        expect(isMiss(after)).toBe(true)
        expect(hasMsg(after, "pleins PV")).toBe(true)
    })

    it("affaibli (1 PV) : la règle ne s'applique plus (pas le ricochet dédié)", () => {
        const s = createBattle([player()], [grotteWild(0.01)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "poke_ball" })
        expect(hasMsg(after, "pleins PV")).toBe(false) // le verrou PV pleins ne se déclenche pas
    })

    it("Master-Ball : shunte la règle même à pleins PV (capture garantie)", () => {
        const s = createBattle([player()], [grotteWild(1)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
    })

    it("NON-RÉGRESSION : un sauvage NORMAL (hors grotte) se capture à pleins PV", () => {
        const s = createBattle([player()], [createMonInstance("plumiot", 2, { owned: false })], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
        expect(hasMsg(after, "pleins PV")).toBe(false)
    })
})
