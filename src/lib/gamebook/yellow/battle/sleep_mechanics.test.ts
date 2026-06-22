import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import { hitChance } from "./accuracy"
import { rollSleepTurns, initialStatusCounter } from "./status"
import { Rng } from "./rng"
import { getMove } from "../data/moves"

describe("sommeil — durée à chaîne dégressive", () => {
    it("rollSleepTurns reste dans [1, 8] et atteint au moins 1 tour", () => {
        let min = 99, max = 0
        for (let seed = 0; seed < 300; seed++) {
            const n = rollSleepTurns(new Rng(seed * 2654435761))
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(8)
            min = Math.min(min, n); max = Math.max(max, n)
        }
        expect(min).toBe(1)         // le tirage le plus court existe
        expect(max).toBeLessThanOrEqual(8) // jamais plus de 8 tours d'incapacité (le 9e = réveil forcé)
    })

    it("initialStatusCounter(SLEEP) = tours d'incapacité + 1 → toujours ≥ 2 (au moins 1 tour raté)", () => {
        for (let seed = 0; seed < 100; seed++) {
            const c = initialStatusCounter("SLEEP", new Rng(seed * 40503))
            expect(c).toBeGreaterThanOrEqual(2) // ≥ 2 → la cible rate AU MOINS 1 tour
            expect(c).toBeLessThanOrEqual(9)     // ≤ 9 → réveil au plus tard au 9e tour
        }
    })
})

describe("Hypnose — précision modulée par la Vitesse, esquive ignorée", () => {
    const hypno = getMove("hypnose")!

    function freshPair() {
        // Même espèce/niveau → vitesses effectives égales au départ.
        const s = createBattle([createMonInstance("rochison", 50)], [createMonInstance("rochison", 50)], { isWild: true, seed: 1 })
        return { caster: s.player.team[s.player.activeIndex], target: s.enemy.team[s.enemy.activeIndex] }
    }

    it("base 40% à vitesse égale", () => {
        const { caster, target } = freshPair()
        expect(hitChance(hypno, caster, target)).toBe(40)
    })

    it("lanceur plus rapide → plus de précision (plafonnée à 80)", () => {
        const { caster, target } = freshPair()
        caster.stages.spe = 2
        const hc = hitChance(hypno, caster, target)
        expect(hc).toBeGreaterThan(40)
        expect(hc).toBeLessThanOrEqual(80)
    })

    it("lanceur plus lent → moins de précision (plancher 15)", () => {
        const { caster, target } = freshPair()
        caster.stages.spe = -2
        const hc = hitChance(hypno, caster, target)
        expect(hc).toBeLessThan(40)
        expect(hc).toBeGreaterThanOrEqual(15)
    })

    it("l'esquive de la cible n'affecte PAS Hypnose", () => {
        const { caster, target } = freshPair()
        target.stages.eva = 6
        expect(hitChance(hypno, caster, target)).toBe(40)
    })

    it("une attaque ordinaire, elle, reste affectée par l'esquive", () => {
        const { caster, target } = freshPair()
        const plaquage = getMove("plaquage")! // accuracy 100, pas de speedScaledAcc
        const base = hitChance(plaquage, caster, target)
        target.stages.eva = 6
        expect(hitChance(plaquage, caster, target)).toBeLessThan(base)
    })
})

describe("Repos — soin + auto-sommeil 1 tour", () => {
    it("soigne, endort le lanceur pile 1 tour, puis réveil", () => {
        // 2 attaques : Repos (slot 1) pour s'endormir, Éboulis (slot 0) pour agir au réveil.
        // (Avec Repos en slot 0, le mon se rendormirait aussitôt réveillé → comportement voulu mais
        //  on veut ici OBSERVER le réveil.)
        const p = createMonInstance("rochison", 50, { moveIds: ["eboulis", "repos"] }) // tank → l'ennemi minime ne le tue pas
        p.currentHp = 10
        let s = createBattle([p], [createMonInstance("plumiot", 2)], { isWild: true, seed: 7 })

        // Tour 1 : Repos (slot 1) → soin + endormissement (compteur 2).
        s = resolveTurn(s, { kind: "move", moveIndex: 1 })
        let me = s.player.team[s.player.activeIndex]
        expect(me.currentHp).toBeGreaterThan(10) // a bien soigné
        expect(me.status).toBe("SLEEP")
        expect(me.statusCounter).toBe(2)

        // Tour 2 : il essaie d'agir mais DORT (rate son tour) → compteur 1.
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        me = s.player.team[s.player.activeIndex]
        expect(me.status).toBe("SLEEP")
        expect(me.statusCounter).toBe(1)

        // Tour 3 : il se réveille et agit (Éboulis) → plus de statut.
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        me = s.player.team[s.player.activeIndex]
        expect(me.status).toBe("NONE")
    })
})
