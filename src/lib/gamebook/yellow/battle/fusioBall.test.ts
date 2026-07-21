import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { registerCustomSpecies } from "../data/species"
import { FUSION_BASE_SPECIES } from "../data/fusionBaseSpecies"

const hasMsg = (st: BattleState, sub: string) => st.events.some((e) => e.kind === "message" && e.text.includes(sub))
const isMiss = (st: BattleState) => st.events.some((e) => e.kind === "ball" && e.action === "miss")
const isCaught = (st: BattleState) => st.events.some((e) => e.kind === "ball" && e.action === "result" && e.caught === true)

// FUSIO-BALL — seul vecteur pour capturer un Daemon FUSIONNÉ ; sans effet sur les autres.
describe("Fusio-Ball — verrou exclusif fusion", () => {
    registerCustomSpecies(FUSION_BASE_SPECIES) // rend les fusions résolvables (comme en jeu)
    const player = () => createMonInstance("rochison", 50)

    it("une AUTRE Ball (même Master / Super Méga) sur une FUSION → ricoche, jamais capturée", () => {
        for (const ball of ["poke_ball", "master_ball", "super_mega_nexus_ball"]) {
            const s = createBattle([player()], [createMonInstance("mottelave", 10)], { isWild: true, seed: 1 })
            const after = resolveTurn(s, { kind: "ball", itemId: ball })
            expect(after.outcome, ball).not.toBe("caught")
            expect(isCaught(after), ball).toBe(false)
            expect(isMiss(after), ball).toBe(true)
            expect(hasMsg(after, "FUSIO-BALL"), ball).toBe(true)
        }
    })

    it("la Fusio-Ball sur une NON-fusion → refusée (aucune prise)", () => {
        const s = createBattle([player()], [createMonInstance("mottoche", 10)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "fusio_ball" })
        expect(after.outcome).not.toBe("caught")
        expect(isCaught(after)).toBe(false)
        expect(hasMsg(after, "n'agit QUE sur les Daemons fusionnés")).toBe(true)
    })

    it("Fusio-Ball : seuil de PV ∝ BST — ricoche tant que trop vigoureux, capture GARANTIE une fois assez affaibli", () => {
        // À pleins PV → au-dessus du seuil (BST) → la Fusio-Ball ne prend pas encore (« trop vigoureux »).
        const full = createMonInstance("mottelave", 15)
        const a1 = resolveTurn(createBattle([player()], [full], { isWild: true, seed: 1 }), { kind: "ball", itemId: "fusio_ball" })
        expect(a1.outcome).not.toBe("caught")
        expect(hasMsg(a1, "vigoureux")).toBe(true)
        // Affaibli (1 PV) → sous le seuil → capture GARANTIE (comme une Master).
        const weak = createMonInstance("mottelave", 15); weak.currentHp = 1
        const a2 = resolveTurn(createBattle([player()], [weak], { isWild: true, seed: 1 }), { kind: "ball", itemId: "fusio_ball" })
        expect(a2.outcome).toBe("caught")
    })

    it("NON-RÉGRESSION : capture normale (non-fusion, Master-Ball) toujours garantie", () => {
        const s = createBattle([player()], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
    })
})
