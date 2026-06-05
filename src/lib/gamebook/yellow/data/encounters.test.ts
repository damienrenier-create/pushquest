import { describe, it, expect } from "vitest"
import { biomeDistance, affinityMult, repulsionMult } from "./biomes"
import { rollWildEncounter, debugWeights, hasEncounters } from "./encounters"
import { Rng } from "../battle/rng"

const MAP = "yellow_route_nord"
// (20,22) : au bord du plan d'eau {13,20,18,24}, loin montagne/sapins.
const NEAR_WATER = { x: 20, y: 22 }
// (25,32) : centre-bas, loin de tout → poche neutre.
const NEUTRAL = { x: 25, y: 32 }

describe("biomes — distance & paliers", () => {
    it("distance 0 dans une région, croît en s'éloignant", () => {
        expect(biomeDistance(MAP, 36, 5, "water")).toBe(0)      // dans un lac
        expect(biomeDistance(MAP, 20, 22, "water")).toBe(2)     // 2 cases du lac
        expect(biomeDistance(MAP, 5, 2, "mountain")).toBe(0)    // dans la bande nord
        expect(biomeDistance(MAP, 0, 10, "sapin")).toBe(0)      // bordure ouest
    })
    it("poche neutre : loin de tous les biomes (≥ 8)", () => {
        expect(biomeDistance(MAP, NEUTRAL.x, NEUTRAL.y, "water")).toBeGreaterThanOrEqual(8)
        expect(biomeDistance(MAP, NEUTRAL.x, NEUTRAL.y, "mountain")).toBeGreaterThanOrEqual(8)
        expect(biomeDistance(MAP, NEUTRAL.x, NEUTRAL.y, "sapin")).toBeGreaterThanOrEqual(8)
    })
    it("4 paliers d'affinité / répulsion", () => {
        expect([affinityMult(0), affinityMult(2), affinityMult(5), affinityMult(7), affinityMult(8)]).toEqual([4, 4, 2.5, 1.5, 1])
        expect([repulsionMult(2), repulsionMult(5), repulsionMult(7), repulsionMult(8)]).toEqual([0.25, 0.5, 0.8, 1])
    })
})

describe("pondération selon le biome", () => {
    it("près de l'eau : les types Eau dominent, les Vol/Feu se raréfient", () => {
        const w = debugWeights(MAP, NEAR_WATER.x, NEAR_WATER.y)
        expect(w.loutrille).toBeGreaterThan(w.plumiot)   // Eau >> Vol (répulsion eau)
        expect(w.piouflot).toBeGreaterThan(w.plumiot)    // oiseau d'eau attiré
        expect(w.loutrille).toBeGreaterThan(w.fennaise)  // Eau >> Feu (répulsion eau)
    })
    it("poche neutre : les communs dominent, biome sans effet", () => {
        const w = debugWeights(MAP, NEUTRAL.x, NEUTRAL.y)
        expect(w.plumiot).toBe(100)      // commun, aucun multiplicateur
        expect(w.loutrille).toBe(45)     // peu commun, biome inactif
        expect(w.draclet).toBe(5)        // très rare
        expect(w.plumiot).toBeGreaterThan(w.loutrille)
    })
})

describe("bonus joueur (PushQuest), plafonné ×1.8", () => {
    it("les pompes boostent le Combat, plafonné", () => {
        const base = debugWeights(MAP, NEUTRAL.x, NEUTRAL.y)
        const boosted = debugWeights(MAP, NEUTRAL.x, NEUTRAL.y, { pompes: 1, squats: 0, quotaReached: false, overshoot: 0, quotaRatio: 0.5 })
        expect(boosted.couperin).toBeGreaterThan(base.couperin)
        expect(boosted.couperin).toBe(180) // 100 × min(1.8, 1+0.8)
    })
    it("le dépassement de quota booste les rares", () => {
        const w = debugWeights(MAP, NEUTRAL.x, NEUTRAL.y, { pompes: 0, squats: 0, quotaReached: false, overshoot: 1, quotaRatio: 1 })
        expect(w.nouillon).toBeCloseTo(14 * 1.8, 5)
    })
})

describe("rollWildEncounter", () => {
    it("respecte le taux (pas de rencontre si tirage ≥ rate)", () => {
        expect(rollWildEncounter({ mapId: MAP, x: 25, y: 32, leadLevel: 10, rng: () => 0.99 })).toBeNull()
    })
    it("renvoie un Daemon dont le niveau suit le lead (corrélation)", () => {
        const r = new Rng(2024)
        const rng = () => r.next()
        const lead = 20
        let count = 0
        for (let i = 0; i < 800; i++) {
            const mon = rollWildEncounter({ mapId: MAP, x: 25, y: 32, leadLevel: lead, rng })
            if (!mon) continue
            count++
            expect(mon.level).toBeGreaterThanOrEqual(lead - 2)   // jamais trop bas
            expect(mon.level).toBeLessThanOrEqual(lead + 3)      // rares : +1..+2
            expect(mon.level).toBeGreaterThanOrEqual(2)
        }
        expect(count).toBeGreaterThan(0)
    })
    it("zone inconnue → pas de rencontre", () => {
        expect(hasEncounters("nulle_part")).toBe(false)
        expect(rollWildEncounter({ mapId: "nulle_part", x: 0, y: 0, leadLevel: 10 })).toBeNull()
    })
})
