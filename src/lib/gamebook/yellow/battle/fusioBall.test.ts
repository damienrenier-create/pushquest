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

    it("la Fusio-Ball GARANTIT la capture d'une FUSION (stats Master), même à PLEINS PV (Grotte)", () => {
        const wild = createMonInstance("mottelave", 5)
        wild.captureRequiresDamage = true // règle Grotte : la Fusio-Ball GARANTIE la shunte (comme la Master)
        const s = createBattle([player()], [wild], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "fusio_ball" })
        expect(hasMsg(after, "Seule une FUSIO-BALL")).toBe(false) // pas le message de refus fusion
        expect(after.outcome).toBe("caught")                       // capture garantie
    })

    it("NON-RÉGRESSION : capture normale (non-fusion, Master-Ball) toujours garantie", () => {
        const s = createBattle([player()], [createMonInstance("plumiot", 2)], { isWild: true, seed: 1 })
        const after = resolveTurn(s, { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
    })
})
