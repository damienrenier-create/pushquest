import { describe, it, expect } from "vitest"
import { computeFusion, fuseStats, fuseTypes, fusionName, fusionWeights, typeRepStat, type FusionParent } from "./fusionSpecies"
import { SPECIES } from "./species"
import type { PokeType } from "../battle/types"

// Parent bâti depuis une espèce (stats de BASE = illustration ; en réel le module reçoit les stats finales).
const P = (id: string, level = 50): FusionParent => {
    const sp = SPECIES[id]
    return { name: sp.name, types: sp.types, stats: sp.baseStats, level }
}

describe("fusion — génétique des stats", () => {
    it("poids : 2 hautes = 0,6 (dominantes), 2 basses = 0,4 (récessives), spc exclue", () => {
        // Maîtrezenc {hp80, atk118, def68, spe88} → dom atk/spe, réc hp/def
        const w = fusionWeights(SPECIES["maitrezenc"].baseStats)
        expect(w.atk).toBe(0.6); expect(w.spe).toBe(0.6)
        expect(w.hp).toBe(0.4); expect(w.def).toBe(0.4)
        expect(w).not.toHaveProperty("spc") // la spc n'est jamais pondérée (elle est splittée)
    })

    it("EX.1 Maîtrezenc × Zappeuréal → COMBAT/ELEC, stat dominante partagée DÉPASSE les parents", () => {
        const f = computeFusion(P("maitrezenc"), P("zappeureal"))
        expect(f.types).toEqual(["COMBAT", "ELEC"])
        expect(f.stats).toEqual({ hp: 64, atk: 121, def: 54, spe: 122, spcAtk: 98, spcDef: 68 })
        // atk & vit dominantes des DEUX côtés → compounding : au-dessus des deux parents
        expect(f.stats.atk).toBeGreaterThan(Math.max(118, 84))
        expect(f.stats.spe).toBeGreaterThan(Math.max(88, 115))
    })

    it("EX.2 Divinpâte × Razmarée → PSY/EAU, split net (rapide→SpA, lent→SpD), profil rond", () => {
        const f = computeFusion(P("divinpate"), P("razmaree"))
        expect(f.types).toEqual(["PSY", "EAU"])
        expect(f.stats).toEqual({ hp: 91, atk: 59, def: 93, spe: 76, spcAtk: 120, spcDef: 86 })
        // Divinpâte (vit 82) est le plus rapide → sa spc (120) devient la SpA ; Razmarée (vit 66) → SpD (86)
        expect(f.stats.spcAtk).toBe(SPECIES["divinpate"].baseStats.spc)
        expect(f.stats.spcDef).toBe(SPECIES["razmaree"].baseStats.spc)
    })

    it("EX.3 Coccimpératrice × Rochison → COMBAT/ROCHE (types DIVERSIFIÉS, pas COMBAT/INSECTE)", () => {
        const f = computeFusion(P("coccimperatrice"), P("rochison"))
        expect(f.stats).toEqual({ hp: 61, atk: 146, def: 109, spe: 90, spcAtk: 56, spcDef: 52 })
        // 4 types candidats {COMBAT, INSECTE, ROCHE, SOL} → on garde 2 DIMENSIONS distinctes (atk + déf)
        expect(f.types).toEqual(["COMBAT", "ROCHE"])
        expect(f.types).not.toContain("INSECTE") // sinon 2 types du même axe atk
        expect(f.stats.atk).toBeGreaterThan(Math.max(128, 115)) // monstre physique au-dessus des parents
    })
})

describe("fusion — types & divers", () => {
    it("2 parents du MÊME type → mono-type (dédup)", () => {
        const f = computeFusion(P("razmaree"), P("naiadrak")) // les deux EAU
        expect(f.types).toEqual(["EAU"])
    })

    it("2 mono-types distincts → bi-type", () => {
        expect(fuseTypes(P("divinpate"), P("razmaree"), fuseStats(P("divinpate"), P("razmaree")))).toEqual(["PSY", "EAU"])
    })

    it("stats INDÉPENDANTES de l'ordre des parents (le split par vitesse est symétrique)", () => {
        const ab = fuseStats(P("maitrezenc"), P("zappeureal"))
        const ba = fuseStats(P("zappeureal"), P("maitrezenc"))
        expect(ab).toEqual(ba)
    })

    it("split à VITESSE ÉGALE : spc la plus haute → SpA, indépendant de l'ordre (PvP déterministe)", () => {
        const A: FusionParent = { name: "Alpha", types: ["FEU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 50 }, level: 50 }
        const B: FusionParent = { name: "Beta", types: ["EAU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 90 }, level: 50 }
        const ab = fuseStats(A, B), ba = fuseStats(B, A)
        expect(ab).toEqual(ba)          // même vitesse (80) → l'ordre ne change PLUS rien
        expect(ab.spcAtk).toBe(90)      // spc la plus haute (B) → SpA
        expect(ab.spcDef).toBe(50)
    })

    it("niveau = max(parents)", () => {
        expect(computeFusion(P("razmaree", 40), P("divinpate", 71)).level).toBe(71)
    })

    it("nom = 1re moitié du 1er + « - » + 2e moitié du 2e", () => {
        expect(fusionName(P("maitrezenc"), P("zappeureal"))).toBe("Maîtr-uréal")
        expect(fusionName(P("divinpate"), P("razmaree"))).toBe("Divin-arée")
    })

    it("table stat-représentative : cohérente (COMBAT→atk, ROCHE→déf, PSY→spé)", () => {
        const rep = typeRepStat()
        expect(rep["COMBAT" as PokeType]).toBe("atk")
        expect(rep["ROCHE" as PokeType]).toBe("def")
        expect(rep["PSY" as PokeType]).toBe("spc")
    })
})
