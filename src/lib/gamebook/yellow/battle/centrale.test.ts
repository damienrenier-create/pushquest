import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, chooseEnemyAction } from "./engine"
import { Rng } from "./rng"
import { createMonInstance } from "./factory"
import { rollWildEncounter } from "../data/encounters"
import type { MonInstance } from "./types"

// Accès aux champs de combat SAUVAGES attachés à l'instance (hors type MonInstance).
type WildCfg = {
    openingMoves?: string[]
    fleeAfterTurns?: number
    captureMinBallBonus?: number
    captureMult?: number
}
const cfg = (m: MonInstance): WildCfg => m as unknown as WildCfg
const knows = (m: MonInstance, id: string) => m.moves.some((s) => s.moveId === id)

describe("Centrale — câblage des comportements sauvages (spawn)", () => {
    // On tire BEAUCOUP de rencontres seedées et on capture la 1re instance de chaque espèce
    // pour vérifier que les règles de combat/capture sont bien attachées par rollWildEncounter.
    const r = new Rng(20260614)
    const rng = () => r.next()
    const seen: Record<string, MonInstance> = {}
    for (let i = 0; i < 20000; i++) {
        const mon = rollWildEncounter({
            mapId: "yellow_centrale", x: 5, y: 5, leadLevel: 30, weakestTeamLevel: 18, rng,
        })
        if (mon && !seen[mon.speciesId]) seen[mon.speciesId] = mon
    }

    it("toutes les espèces de la Centrale finissent par apparaître", () => {
        for (const id of ["jerbiwat", "electroatiss", "namicha", "boltah", "heatah", "thundah", "zappeureal", "belunode"]) {
            expect(seen[id], `espèce manquante : ${id}`).toBeDefined()
        }
    })

    it("Namicha ouvre par 1 Mirage (et connaît Mirage)", () => {
        const n = seen.namicha
        expect(knows(n, "mirage")).toBe(true)
        expect(cfg(n).openingMoves).toEqual(["mirage"])
    })

    it("Thundah ouvre par 2 Mirage, ne fuit jamais et est dur à capturer", () => {
        const t = seen.thundah
        expect(knows(t, "mirage")).toBe(true)
        expect(cfg(t).openingMoves).toEqual(["mirage", "mirage"])
        expect(cfg(t).fleeAfterTurns).toBeUndefined()
        expect(cfg(t).captureMult).toBe(0.35)
    })

    it("Boltah fuit en ≤5 tours, Heatah en ≤3", () => {
        expect(cfg(seen.boltah).fleeAfterTurns).toBeGreaterThanOrEqual(3)
        expect(cfg(seen.boltah).fleeAfterTurns).toBeLessThanOrEqual(5)
        expect(cfg(seen.heatah).fleeAfterTurns).toBeGreaterThanOrEqual(2)
        expect(cfg(seen.heatah).fleeAfterTurns).toBeLessThanOrEqual(3)
    })

    it("Zappeuréal exige une Hyper Ball+ (ballBonus ≥ 4)", () => {
        expect(cfg(seen.zappeureal).captureMinBallBonus).toBe(4)
    })

    it("Bélunode est dur à capturer (captureMult < 1)", () => {
        expect(cfg(seen.belunode).captureMult).toBe(0.4)
    })

    it("Jerbiwat / Électroatiss restent des sauvages normaux (aucune règle spéciale)", () => {
        for (const id of ["jerbiwat", "electroatiss"]) {
            const m = seen[id]
            expect(cfg(m).openingMoves).toBeUndefined()
            expect(cfg(m).fleeAfterTurns).toBeUndefined()
            expect(cfg(m).captureMinBallBonus).toBeUndefined()
            expect(cfg(m).captureMult).toBeUndefined()
        }
    })
})

// Construit un sauvage avec une config de combat attachée (comme rollWildEncounter).
function wildWith(speciesId: string, level: number, conf: WildCfg & { currentHp?: number }): MonInstance {
    const m = createMonInstance(speciesId, level, { owned: false })
    if (conf.currentHp != null) m.currentHp = conf.currentHp
    const { currentHp: _hp, ...battle } = conf
    Object.assign(m, battle)
    return m
}

describe("Centrale — fuite programmée (engine)", () => {
    it("un sauvage à fleeAfterTurns=1 décroche au 1er tour s'il survit", () => {
        // Miroir de gros Daemons : un seul coup ne met jamais K.O. → le sauvage file.
        const player = [createMonInstance("cailloutchi", 80)]
        const wild = [wildWith("cailloutchi", 80, { fleeAfterTurns: 1 })]
        const start = createBattle(player, wild, { isWild: true, seed: 12345 })
        const after = resolveTurn(start, { kind: "move", moveIndex: 0 })
        expect(after.phase).toBe("ended")
        expect(after.outcome).toBe("enemyfled")
        expect(after.enemy.team[after.enemy.activeIndex].currentHp).toBeGreaterThan(0) // il a FUI, pas été K.O.
    })

    it("un sauvage SANS fleeAfterTurns ne décroche pas tout seul", () => {
        const player = [createMonInstance("cailloutchi", 80)]
        const wild = [createMonInstance("cailloutchi", 80, { owned: false })]
        const start = createBattle(player, wild, { isWild: true, seed: 12345 })
        const after = resolveTurn(start, { kind: "move", moveIndex: 0 })
        expect(after.outcome).not.toBe("enemyfled")
    })
})

describe("Centrale — verrou de Ball (engine)", () => {
    it("une Ball trop faible ricoche sur un sauvage captureMinBallBonus=4 (pas de capture)", () => {
        const player = [createMonInstance("cailloutchi", 50)]
        const wild = [wildWith("zappeureal", 40, { captureMinBallBonus: 4, currentHp: 1 })]
        const start = createBattle(player, wild, { isWild: true, seed: 7 })
        const after = resolveTurn(start, { kind: "ball", itemId: "poke_ball" })
        expect(after.outcome).not.toBe("caught")
        expect(after.events.some((e) => e.kind === "message" && e.text.includes("ricoche"))).toBe(true)
    })

    it("la Master Ball shunte le verrou et capture quand même", () => {
        const player = [createMonInstance("cailloutchi", 50)]
        const wild = [wildWith("zappeureal", 40, { captureMinBallBonus: 4, currentHp: 1 })]
        const start = createBattle(player, wild, { isWild: true, seed: 7 })
        const after = resolveTurn(start, { kind: "ball", itemId: "master_ball" })
        expect(after.outcome).toBe("caught")
    })
})

describe("Centrale — ouverture Mirage (engine)", () => {
    it("un sauvage avec openingMoves=['mirage'] joue Mirage en 1er", () => {
        const wild = wildWith("namicha", 20, { openingMoves: ["mirage"] })
        // Garantit qu'il connaît Mirage (rollWildEncounter le fait ; ici on l'ajoute pour le test).
        if (!knows(wild, "mirage")) wild.moves.push({ moveId: "mirage", pp: 20, ppMax: 20 })
        const start = createBattle([createMonInstance("cailloutchi", 20)], [wild], { isWild: true, seed: 3 })
        const action = chooseEnemyAction(start, new Rng(3))
        expect(action.kind).toBe("move")
        expect(start.enemy.team[start.enemy.activeIndex].moves[action.moveIndex!].moveId).toBe("mirage")
    })
})
