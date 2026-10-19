import { describe, it, expect } from "vitest"
import { buildFusionLeagueTeam } from "./fusionLeague"
import { buildFusion, fusionParentFromInstance } from "./fusionMon"
import { fusionWeights, fusionSynergy } from "./fusionSpecies"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import type { StatKey } from "../battle/types"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LE CONSEIL PROFITE DES SYNERGIES (décision Sartay, 19/10/2026). Cas réel : l'Impérafer de KOGA (Coccimpératrice ×
// Colosfer) est désormais une paire synergique (starters du run 3) → en Ligue il est BOOSTÉ (0,7/0,5) et garde son
// identité (COMBAT/MÉTAL, nom curé, attaques curées : ses STAB tiennent).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]

describe("Impérafer (KOGA)", () => {
    it("la paire est une synergie", () => {
        expect(fusionSynergy("coccimperatrice", "colosfer")?.key).toBe("pair:coccimperatrice|colosfer")
    })

    it("en Ligue : COMBAT/MÉTAL, nom curé, quel que soit le palier où il figure", () => {
        for (const tier of ["bronze", "argent", "or"] as const) {
            const imp = buildFusionLeagueTeam("koga", tier).find((f) => getSpecies(f.speciesId)?.name === "Impérafer")
            if (!imp) continue // remplacé à ce palier
            expect(new Set(imp.result.types), tier).toEqual(new Set(["COMBAT", "METAL"]))
        }
    })

    it("une fusion curée (nom imposé) reçoit bien le BOOST de synergie : poids 0,7/0,5, pas 0,6/0,45", () => {
        const a = createMonInstance("coccimperatrice", 80, {}), b = createMonInstance("colosfer", 80, {})
        const built = buildFusion(a, b, { name: "Impérafer", moves: ["crochet_maitre", "poing_meteore", "seisme", "danse_lames"] })
        const pa = fusionParentFromInstance(a), pb = fusionParentFromInstance(b)
        const expected = (mode: "boosted" | "normal") => {
            const wA = fusionWeights(pa.stats, mode), wB = fusionWeights(pb.stats, mode)
            return Object.fromEntries(KEYS.map((k) => [k, Math.round(wA[k] * pa.stats[k] + wB[k] * pb.stats[k])]))
        }
        expect(built.result.stats).toEqual(expected("boosted"))
        expect(built.result.stats).not.toEqual(expected("normal"))
    })
})
