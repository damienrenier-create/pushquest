import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { evTotalCap } from "./evConfig"
import { rollWildEncounter, type EncounterCtx } from "./encounters"
import type { MonInstance } from "../battle/types"

function mulberry(seed: number): () => number {
    let a = seed >>> 0
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const NINE = [
    ["rosdrakis", ["DRAGON", "FEE"]], ["dracosidhe", ["DRAGON", "FEE"]],
    ["archeoptix", ["VOL", "FEE"]], ["pterosidhe", ["VOL", "FEE"]],
    ["fulguror", ["ELEC"]], ["rocosaure", ["ROCHE"]], ["givroptere", ["VOL", "GLACE"]],
    ["toxyrm", ["FEE", "POISON"]], ["wyvortal", ["FEE", "POISON"]],
] as const

const ANCIENT_IDS = new Set(["rosdrakis", "dracosidhe", "archeoptix", "pterosidhe", "fulguror", "rocosaure", "givroptere", "toxyrm", "wyvortal"])

describe("Créatures anciennes B2F — 9 late bloomers", () => {
    it("les 9 espèces existent, bons types, flags late-bloomer + postLeague", () => {
        for (const [id, types] of NINE) {
            const sp = getSpecies(id)
            expect(sp, id).toBeTruthy()
            expect([...sp!.types].sort()).toEqual([...types].sort())
            expect(sp!.lateBloomerEv, `${id} lateBloomerEv`).toBe(true)
            expect(sp!.postLeague, `${id} postLeague`).toBe(true)
            expect(sp!.growthRate).toBe("slow")
        }
    })

    it("règle EV durcie : capturé TÔT (niv 5) = +20 % (612), TARD (niv 90) = −20 % (408), milieu ~510", () => {
        const mk = (capturedLevel: number) => ({ speciesId: "fulguror", capturedLevel, level: capturedLevel, ivs: {}, ev: {} } as unknown as MonInstance)
        expect(evTotalCap(mk(5))).toBe(612)   // 510 × 1.20
        expect(evTotalCap(mk(90))).toBe(408)  // 510 × 0.80
        const mid = evTotalCap(mk(48))
        expect(mid).toBeGreaterThan(500); expect(mid).toBeLessThan(520)
        expect(evTotalCap(mk(5))).toBeGreaterThan(evTotalCap(mk(50)))   // monotone décroissant
        expect(evTotalCap(mk(50))).toBeGreaterThan(evTotalCap(mk(90)))
    })

    it("gate B2F : AUCUNE créature ancienne avant la victoire Ligue Fusion, elles POPPENT après", () => {
        const base: EncounterCtx = { mapId: "yellow_grotte_nexus_b2f", x: 10, y: 10, leadLevel: 60, encounterCount: 999 }
        // AVANT (fusionLeagueWon absent) : 6000 rolls, aucune ancienne.
        let ctx: EncounterCtx = { ...base, rng: mulberry(7) }
        for (let i = 0; i < 6000; i++) { const m = rollWildEncounter(ctx); if (m) expect(ANCIENT_IDS.has(m.speciesId), `${m.speciesId} ne devrait PAS pop avant la Ligue Fusion`).toBe(false) }
        // APRÈS (fusionLeagueWon: true) : au moins une ancienne apparaît.
        ctx = { ...base, rng: mulberry(7), fusionLeagueWon: true }
        let found = false
        for (let i = 0; i < 20000 && !found; i++) { const m = rollWildEncounter(ctx); if (m && ANCIENT_IDS.has(m.speciesId)) found = true }
        expect(found, "une créature ancienne devrait pop après la Ligue Fusion").toBe(true)
    })
})
