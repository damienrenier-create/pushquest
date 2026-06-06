import { describe, it, expect } from "vitest"
import { createBattle, resolveTurnPvp } from "./engine"
import { createMonInstance } from "./factory"

function freshBattle(seed = 12345) {
    const a = [createMonInstance("feuillichot", 12), createMonInstance("plumiot", 12)]
    const b = [createMonInstance("cailloutchi", 12)]
    return createBattle(a, b, { isWild: false, seed, pvp: true })
}

const MOVE0 = { kind: "move" as const, moveIndex: 0 }

describe("resolveTurnPvp (combat joueur vs joueur)", () => {
    it("DÉTERMINISTE : même seed + mêmes actions → état strictement identique", () => {
        const s1 = resolveTurnPvp(freshBattle(), MOVE0, MOVE0)
        const s2 = resolveTurnPvp(freshBattle(), MOVE0, MOVE0)
        expect(s1.player.team[0].currentHp).toBe(s2.player.team[0].currentHp)
        expect(s1.enemy.team[0].currentHp).toBe(s2.enemy.team[0].currentHp)
        expect(s1.seed).toBe(s2.seed)
        expect(s1.events.length).toBe(s2.events.length)
    })

    it("produit des événements, avance le tour, garde le flag pvp", () => {
        const before = freshBattle()
        const s = resolveTurnPvp(before, MOVE0, MOVE0)
        expect(s.events.length).toBeGreaterThan(0)
        expect(s.turn).toBe(before.turn + 1)
        expect(s.pvp).toBe(true)
    })

    it("gère un switch côté A (le Daemon de tête change)", () => {
        const s = resolveTurnPvp(freshBattle(), { kind: "switch", teamIndex: 1 }, MOVE0)
        expect(s.player.activeIndex).toBe(1)
    })

    it("seeds différents → résultats potentiellement différents (RNG bien seedé)", () => {
        // On compare plusieurs seeds : au moins un doit diverger (sinon RNG ignoré).
        const ref = resolveTurnPvp(freshBattle(1), MOVE0, MOVE0)
        const others = [2, 3, 4, 5, 6].map((sd) => resolveTurnPvp(freshBattle(sd), MOVE0, MOVE0))
        const someDiffer = others.some(
            (o) => o.player.team[0].currentHp !== ref.player.team[0].currentHp
                || o.enemy.team[0].currentHp !== ref.enemy.team[0].currentHp,
        )
        expect(someDiffer).toBe(true)
    })
})
