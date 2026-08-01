import { describe, it, expect } from "vitest"
import { computeFusion, fuseStats, fuseTypes, fusionName, fusionWeights, typeRepStat, type FusionParent } from "./fusionSpecies"
import { SPECIES } from "./species"
import type { PokeType } from "../battle/types"

// Parent bâti depuis une espèce (stats de BASE = illustration ; en réel le module reçoit les stats finales).
// moves = 4 dernières attaques du learnset (illustration ; en réel = les 4 slots actuels du Daemon).
const P = (id: string, level = 50, heldItem?: string): FusionParent => {
    const sp = SPECIES[id]
    return { name: sp.name, types: sp.types, stats: sp.baseStats, level, moves: sp.learnset.slice(-4).map((l) => l.moveId), heldItem }
}
const mk = (over: Partial<FusionParent> & Pick<FusionParent, "moves">): FusionParent =>
    ({ name: "X", types: ["NORMAL"], stats: { hp: 50, atk: 50, def: 50, spe: 50, spc: 50 }, level: 50, ...over })

describe("fusion — génétique des stats", () => {
    it("poids : 2 hautes = 0,6 (dominantes), 2 basses = 0,45 (récessives), spc exclue", () => {
        // Maîtrezenc {hp80, atk118, def68, spe88} → dom atk/spe, réc hp/def
        const w = fusionWeights(SPECIES["maitrezenc"].baseStats)
        expect(w.atk).toBe(0.6); expect(w.spe).toBe(0.6)
        expect(w.hp).toBe(0.45); expect(w.def).toBe(0.45)
        expect(w).not.toHaveProperty("spc") // la spc n'est jamais pondérée (elle est splittée)
    })

    it("EX.1 Maîtrezenc × Zappeuréal → COMBAT/ELEC, stat dominante partagée DÉPASSE les parents", () => {
        const f = computeFusion(P("maitrezenc"), P("zappeureal"))
        expect(f.types).toEqual(["COMBAT", "ELEC"])
        expect(f.stats).toEqual({ hp: 72, atk: 121, def: 61, spe: 122, spcAtk: 98, spcDef: 68 })
        // atk & vit dominantes des DEUX côtés → compounding : au-dessus des deux parents
        expect(f.stats.atk).toBeGreaterThan(Math.max(118, 84))
        expect(f.stats.spe).toBeGreaterThan(Math.max(88, 115))
    })

    it("EX.2 Divinpâte × Razmarée → PSY/EAU, split net (rapide→SpA, lent→SpD), profil rond", () => {
        const f = computeFusion(P("divinpate"), P("razmaree"))
        expect(f.types).toEqual(["PSY", "EAU"])
        expect(f.stats).toEqual({ hp: 91, atk: 67, def: 96, spe: 79, spcAtk: 120, spcDef: 86 })
        // Divinpâte (vit 82) est le plus rapide → sa spc (120) devient la SpA ; Razmarée (vit 66) → SpD (86)
        expect(f.stats.spcAtk).toBe(SPECIES["divinpate"].baseStats.spc)
        expect(f.stats.spcDef).toBe(SPECIES["razmaree"].baseStats.spc)
    })

    it("EX.3 Coccimpératrice × Rochison → COMBAT/ROCHE (1 type de CHAQUE parent, pas 2 du même)", () => {
        const f = computeFusion(P("coccimperatrice"), P("rochison"))
        expect(f.stats).toEqual({ hp: 68, atk: 146, def: 113, spe: 92, spcAtk: 56, spcDef: 52 })
        // RÈGLE 1-par-parent : Coccimpératrice[COMBAT/INSECTE] apporte son type le + stat-fidèle (COMBAT),
        //   Rochison[ROCHE/SOL] apporte le sien (ROCHE). Jamais 2 types du même parent (donc pas COMBAT/INSECTE).
        expect(f.types).toEqual(["COMBAT", "ROCHE"])
        expect(f.types).not.toContain("INSECTE") // ce serait 2 types de Coccimpératrice, 0 de Rochison
        expect(f.stats.atk).toBeGreaterThan(Math.max(128, 115)) // monstre physique au-dessus des parents
    })
})

describe("fusion — types & divers", () => {
    it("INVARIANT 1-par-parent : ≥1 type de CHAQUE parent, 1-2 types, jamais vide (tous les cas)", () => {
        const cases: [PokeType[], PokeType[]][] = [
            [["FEU"], ["FEU"]],                            // mono identique → mono
            [["FEU"], ["EAU"]],                            // mono distincts → bi
            [["FEU"], ["EAU", "GLACE"]],                   // mono + bi
            [["DRAGON", "GLACE"], ["EAU", "ELEC"]],        // bi/bi disjoints (cas Cryoviathan)
            [["GLACE", "EAU"], ["DRAGON", "GLACE"]],       // bi/bi, 1 type partagé (cas Glacyran)
            [["SPECTRE", "ELEC"], ["INSECTE", "SPECTRE"]], // bi/bi, 1 type partagé (cas Nécrozeus)
        ]
        for (const [ta, tb] of cases) {
            const a = mk({ types: ta, moves: [] }), b = mk({ types: tb, moves: [] })
            const f = fuseTypes(a, b, fuseStats(a, b))
            expect(f.length, `[${ta}]×[${tb}] : 1-2 types`).toBeGreaterThanOrEqual(1)
            expect(f.length).toBeLessThanOrEqual(2)
            expect(f.some((t) => ta.includes(t)), `≥1 type de A [${ta}]`).toBe(true)
            expect(f.some((t) => tb.includes(t)), `≥1 type de B [${tb}]`).toBe(true)
        }
    })

    it("order-independent : le SET de types ne dépend PAS de l'ordre des parents (départage canonique par nom)", () => {
        // Égalité de repValue sur le 2e type (Plante vs Eau, même déf) → jadis order-dependent, désormais stable.
        const A: FusionParent = { name: "Alpha", types: ["COMBAT", "PLANTE"], stats: { hp: 50, atk: 90, def: 60, spe: 50, spc: 50 }, level: 50, moves: [] }
        const B: FusionParent = { name: "Beta", types: ["COMBAT", "EAU"], stats: { hp: 50, atk: 90, def: 60, spe: 50, spc: 50 }, level: 50, moves: [] }
        const ab = fuseTypes(A, B, fuseStats(A, B))
        const ba = fuseTypes(B, A, fuseStats(B, A))
        expect([...ab].sort()).toEqual([...ba].sort()) // même SET quel que soit l'ordre d'appel
    })

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
        const A: FusionParent = { name: "Alpha", types: ["FEU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 50 }, level: 50, moves: [] }
        const B: FusionParent = { name: "Beta", types: ["EAU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 90 }, level: 50, moves: [] }
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

describe("fusion — moveset & objets tenus", () => {
    const fast = (moves: string[]) => mk({ moves, stats: { hp: 50, atk: 50, def: 50, spe: 100, spc: 50 } })
    const slow = (moves: string[]) => mk({ moves, stats: { hp: 50, atk: 50, def: 50, spe: 40, spc: 50 } })

    it("moveset = 2 premières du RAPIDE + 2 dernières du LENT (indépendant de l'ordre des args)", () => {
        const A = fast(["m1", "m2", "m3", "m4"]), B = slow(["n1", "n2", "n3", "n4"])
        expect(computeFusion(A, B).moves).toEqual(["m1", "m2", "n3", "n4"])
        expect(computeFusion(B, A).moves).toEqual(["m1", "m2", "n3", "n4"]) // le rapide reste le rapide
    })

    it("moveset : dédup + complétion à 4 quand un doublon apparaît", () => {
        // rapide[0,1] = a,b ; lent last2 = a,b (doublons) → dédup → [a,b] puis complété par le reste (c,d) → 4
        const A = fast(["a", "b", "c", "d"]), B = slow(["x", "y", "a", "b"])
        expect(computeFusion(A, B).moves).toEqual(["a", "b", "c", "d"])
    })

    it("moveset : parent à moins de 4 moves géré (slice bornée)", () => {
        expect(computeFusion(fast(["m1", "m2"]), slow(["n1", "n2", "n3"])).moves).toEqual(["m1", "m2", "n2", "n3"])
    })

    it("objets tenus : hérite de 0, 1 ou 2 objets des parents (peut en tenir DEUX)", () => {
        expect(computeFusion(P("razmaree", 50, "obj_a"), P("divinpate", 50, "obj_b")).heldItems).toEqual(["obj_a", "obj_b"])
        expect(computeFusion(P("razmaree", 50, "obj_a"), P("divinpate")).heldItems).toEqual(["obj_a"])
        expect(computeFusion(P("razmaree"), P("divinpate")).heldItems).toEqual([])
    })
})
