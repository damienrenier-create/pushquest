import { describe, it, expect } from "vitest"
import { computeFusion, fusionWeights, type FusionParent } from "./fusionSpecies"
import type { StatKey } from "../battle/types"

// Génétique boostée + fusions inédites + synergies (07/08). On travaille en stats ÉGALES (100 partout) → le poids
// appliqué se lit directement : fused[stat] = wA·100 + wB·100. Top-3 (hp/atk/déf) = dominant, bas-2 (vit/spé) = récessif.
const EQ: Record<StatKey, number> = { hp: 100, atk: 100, def: 100, spe: 100, spc: 100 }
function P(speciesId: string, opts: { shiny?: boolean; types?: string[] } = {}): FusionParent {
    return { name: speciesId, types: (opts.types ?? ["NORMAL"]) as FusionParent["types"], stats: { ...EQ }, level: 50, moves: [], speciesId, shiny: opts.shiny }
}

describe("génétique de fusion — tiers de poids", () => {
    it("fusionWeights : normal 0.6/0.45 · boosted 0.7/0.5 · shiny 0.8/0.6 · all(mimimoy) 0.7", () => {
        expect(fusionWeights(EQ, "normal").hp).toBe(0.6); expect(fusionWeights(EQ, "normal").spc).toBe(0.45)
        expect(fusionWeights(EQ, "boosted").hp).toBe(0.7); expect(fusionWeights(EQ, "boosted").spc).toBe(0.5)
        expect(fusionWeights(EQ, "shiny").hp).toBe(0.8); expect(fusionWeights(EQ, "shiny").spc).toBe(0.6)
        const all = fusionWeights(EQ, "all"); expect(Object.values(all).every((w) => w === 0.7)).toBe(true)
    })
    it("paire NORMALE (aucune synergie) → 0.6/0.45", () => {
        const f = computeFusion(P("draclet"), P("nouillon"))
        expect(f.stats.hp).toBe(120)  // dominant : 0.6+0.6
        expect(f.stats.spc).toBe(90)  // récessif : 0.45+0.45
    })
})

describe("fusions INÉDITES nommées (type MONO forcé + boost)", () => {
    it("Cerfeuillu × Pyrokoss → Cendrecerf, TÉNÈBRES mono, boosté", () => {
        const f = computeFusion(P("sylvapuce"), P("pyrokoss"))
        expect(f.name).toBe("Cendrecerf")
        expect(f.types).toEqual(["TENEBRES"])
        expect(f.stats.hp).toBe(140); expect(f.stats.spc).toBe(100) // 0.7/0.5
    })
    it("Cerfeuillu × Razmarée → Bourbicerf, SOL mono", () => {
        const f = computeFusion(P("sylvapuce"), P("razmaree"))
        expect(f.name).toBe("Bourbicerf"); expect(f.types).toEqual(["SOL"]); expect(f.stats.hp).toBe(140)
    })
    it("Pyrokoss × Razmarée → Vaporêve, SPECTRE mono", () => {
        const f = computeFusion(P("pyrokoss"), P("razmaree"))
        expect(f.name).toBe("Vaporêve"); expect(f.types).toEqual(["SPECTRE"]); expect(f.stats.hp).toBe(140)
    })
    it("Crocavern × Alirocaillus → Crocaroc, boosté, type CALCULÉ (pas forcé)", () => {
        const f = computeFusion(P("crocavern", { types: ["ROCHE", "PLANTE"] }), P("alirocaillus", { types: ["VOL", "ROCHE"] }))
        expect(f.name).toBe("Crocaroc"); expect(f.stats.hp).toBe(140)
        expect(f.types.length).toBeGreaterThanOrEqual(1) // type dérivé, non forcé
    })
    it("ordre des parents indifférent (nom/type identiques)", () => {
        expect(computeFusion(P("pyrokoss"), P("sylvapuce")).name).toBe("Cendrecerf")
    })
})

describe("synergies", () => {
    it("2 PANTHÈRES → boosté (0.7/0.5)", () => {
        const f = computeFusion(P("florapanthe", { types: ["PLANTE"] }), P("pyropanthe", { types: ["FEU"] }))
        expect(f.stats.hp).toBe(140); expect(f.stats.spc).toBe(100)
    })
    it("1 seule panthère → PAS de boost", () => {
        expect(computeFusion(P("florapanthe"), P("draclet")).stats.hp).toBe(120)
    })
    it("merorem × tonytony → boosté", () => {
        expect(computeFusion(P("merorem"), P("tonytony")).stats.hp).toBe(140)
    })
    it("MIMIMOY parent → ses stats à 0.7 partout (dominant ET récessif)", () => {
        const f = computeFusion(P("mimimoy"), P("draclet"))
        expect(f.stats.hp).toBe(130)  // mimimoy 0.7 + autre 0.6 (dominant)
        expect(f.stats.spc).toBe(115) // mimimoy 0.7 + autre 0.45 (récessif)
    })
    it("2 SHINY → tier max 0.8/0.6 (l'emporte sur le boost)", () => {
        const f = computeFusion(P("florapanthe", { shiny: true, types: ["PLANTE"] }), P("pyropanthe", { shiny: true, types: ["FEU"] }))
        expect(f.stats.hp).toBe(160); expect(f.stats.spc).toBe(120) // 0.8/0.6
    })
    it("1 seul shiny → pas le tier shiny (reste normal ici)", () => {
        expect(computeFusion(P("draclet", { shiny: true }), P("nouillon")).stats.hp).toBe(120)
    })
})
