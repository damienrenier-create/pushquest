import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"
import { getSpecies } from "./species"

// RNG déterministe : renvoie la séquence donnée, puis 0.5 une fois épuisée.
function seqRng(seq: number[]): () => number {
    let i = 0
    return () => (i < seq.length ? seq[i++] : 0.5)
}
// [passe le taux, saute le légendaire, jet dragon, choix de base, niveau].
const seq = (dragonRoll: number, baseRoll = 0, lvlRoll = 0) => seqRng([0.01, 0.99, dragonRoll, baseRoll, lvlRoll])

describe("Hautes herbes — dragons rares (plus fort = plus rare, jamais en forme finale)", () => {
    it("un dragon PEUT pop au palier 1 (à la place du type du jour)", () => {
        const mon = rollWildEncounter({ mapId: "yellow_hautes_herbes", x: 4, y: 6, leadLevel: 10, rng: seq(0.001), dayKey: "2026-06-16" })
        expect(mon).toBeTruthy()
        expect(getSpecies(mon!.speciesId)!.types).toContain("DRAGON")
    })

    it("au même seuil, le palier 1 sort un dragon mais PAS le palier 3 (bien plus rare)", () => {
        const t = 0.015 // entre 1/50 (palier1 = 0.02) et 1/500 (palier3 = 0.002)
        const p1 = rollWildEncounter({ mapId: "yellow_hautes_herbes", x: 4, y: 6, leadLevel: 45, rng: seq(t), dayKey: "2026-06-16" })
        const p3 = rollWildEncounter({ mapId: "yellow_hautes_herbes", x: 22, y: 6, leadLevel: 45, rng: seq(t), dayKey: "2026-06-16" })
        expect(p1 && getSpecies(p1.speciesId)!.types.includes("DRAGON")).toBe(true)
        expect(!p3 || !getSpecies(p3.speciesId)!.types.includes("DRAGON")).toBe(true)
    })

    it("JAMAIS la forme définitive : un dragon au palier 3 (haut niveau) reste évolutif", () => {
        // base[0]=draclet @ niv 38 → Wyverion (pas Draconarque) ; il lui reste une évolution.
        const draco = rollWildEncounter({ mapId: "yellow_hautes_herbes", x: 22, y: 6, leadLevel: 50, rng: seq(0.001, 0, 0), dayKey: "2026-06-16" })
        expect(draco).toBeTruthy()
        expect(getSpecies(draco!.speciesId)!.evolution, "doit pouvoir encore évoluer (pas une finale)").toBeTruthy()
        // base[2]=glacirex @ haut niveau → reste Glacirex (pas Cryotyran, la finale).
        const trex = rollWildEncounter({ mapId: "yellow_hautes_herbes", x: 22, y: 6, leadLevel: 50, rng: seq(0.001, 0.7, 0.99), dayKey: "2026-06-16" })
        expect(trex!.speciesId).not.toBe("cryotyran")
        expect(getSpecies(trex!.speciesId)!.evolution).toBeTruthy()
    })
})
