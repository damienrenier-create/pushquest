import { describe, it, expect } from "vitest"
import { computeFusion, fuseStats, fuseTypes, fusionName, fusionWeights, typeRepStat, reorderToStored, type FusionParent } from "./fusionSpecies"
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

describe("fusion — génétique des stats (3 dominantes 0,6 / 2 récessives 0,45, Spéciale incluse)", () => {
    it("poids : 3 hautes = 0,6, 2 basses = 0,45, sur les 5 stats (Spéciale COMPRISE)", () => {
        const w = fusionWeights(SPECIES["maitrezenc"].baseStats)
        expect(Object.values(w).filter((v) => v === 0.6).length).toBe(3)
        expect(Object.values(w).filter((v) => v === 0.45).length).toBe(2)
        expect(Object.keys(w).sort()).toEqual(["atk", "def", "hp", "spc", "spe"]) // les 5 stats sont pondérées
    })

    it("chaque stat = wA×parentA + wB×parentB sur les 5 stats (Spéciale via la même génétique)", () => {
        const a = SPECIES["maitrezenc"].baseStats, b = SPECIES["zappeureal"].baseStats
        const wA = fusionWeights(a), wB = fusionWeights(b)
        const f = computeFusion(P("maitrezenc"), P("zappeureal"))
        expect(f.types).toEqual(["COMBAT", "ELEC"])
        for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
            expect(f.stats[k], k).toBe(Math.round(wA[k] * a[k] + wB[k] * b[k]))
        }
    })

    it("une stat dominante des DEUX côtés (0,6+0,6=1,2) DÉPASSE les deux parents", () => {
        // atk haute chez les deux → dominante des deux → 1,2 × 100 = 120 > 100
        const A = mk({ stats: { hp: 40, atk: 100, def: 40, spe: 90, spc: 90 }, moves: [] })
        const B = mk({ stats: { hp: 40, atk: 100, def: 40, spe: 90, spc: 90 }, moves: [] })
        const f = fuseStats(A, B)
        expect(f.atk).toBe(Math.round(0.6 * 100 + 0.6 * 100))
        expect(f.atk).toBeGreaterThan(100)
    })

    it("EX. types : Coccimpératrice × Rochison → COMBAT/ROCHE (1 type de CHAQUE parent, pas 2 du même)", () => {
        const f = computeFusion(P("coccimperatrice"), P("rochison"))
        expect(f.types).toEqual(["COMBAT", "ROCHE"])
        expect(f.types).not.toContain("INSECTE") // ce serait 2 types de Coccimpératrice, 0 de Rochison
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
            const f = fuseTypes(a, b)
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
        const ab = fuseTypes(A, B)
        const ba = fuseTypes(B, A)
        expect([...ab].sort()).toEqual([...ba].sort()) // même SET quel que soit l'ordre d'appel
    })

    it("2 parents du MÊME type → mono-type (dédup)", () => {
        const f = computeFusion(P("razmaree"), P("naiadrak")) // les deux EAU
        expect(f.types).toEqual(["EAU"])
    })

    it("2 mono-types distincts → bi-type", () => {
        expect(fuseTypes(P("divinpate"), P("razmaree"))).toEqual(["PSY", "EAU"])
    })

    it("stats INDÉPENDANTES de l'ordre des parents (le split par vitesse est symétrique)", () => {
        const ab = fuseStats(P("maitrezenc"), P("zappeureal"))
        const ba = fuseStats(P("zappeureal"), P("maitrezenc"))
        expect(ab).toEqual(ba)
    })

    it("Spéciale INCLUSE dans la génétique 3/2, indépendante de l'ordre (PvP déterministe)", () => {
        const A: FusionParent = { name: "Alpha", types: ["FEU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 50 }, level: 50, moves: [] }
        const B: FusionParent = { name: "Beta", types: ["EAU"], stats: { hp: 60, atk: 60, def: 60, spe: 80, spc: 90 }, level: 50, moves: [] }
        const ab = fuseStats(A, B), ba = fuseStats(B, A)
        expect(ab).toEqual(ba) // symétrique → l'ordre ne change rien
        const wA = fusionWeights(A.stats), wB = fusionWeights(B.stats)
        expect(ab.spc).toBe(Math.round(wA.spc * 50 + wB.spc * 90)) // spc suit la même règle 0,6/0,45 que les autres
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

describe("reorderToStored — ordre perso des attaques d'une fusion", () => {
    const natural = ["a", "b", "c", "d"]
    it("sans ordre stocké → ordre naturel (copie)", () => {
        expect(reorderToStored(natural)).toEqual(natural)
        expect(reorderToStored(natural, [])).toEqual(natural)
        expect(reorderToStored(natural, undefined)).not.toBe(natural) // copie, pas la même référence
    })
    it("ordre stocké valide → permutation appliquée", () => {
        expect(reorderToStored(natural, ["d", "c", "b", "a"])).toEqual(["d", "c", "b", "a"])
        expect(reorderToStored(natural, ["c", "a", "d", "b"])).toEqual(["c", "a", "d", "b"])
    })
    it("résultat = TOUJOURS le même ENSEMBLE que natural (aucune perte/ajout)", () => {
        const r = reorderToStored(natural, ["b", "d", "a", "c"])
        expect([...r].sort()).toEqual([...natural].sort())
        expect(r).toHaveLength(natural.length)
    })
    it("parents ont changé de capacités : on garde l'ordre des survivantes, on ajoute les nouvelles à la fin", () => {
        // stocké réfère "x" (disparue) et omet "d" (nouvelle) → x ignorée, d ajoutée en fin
        expect(reorderToStored(natural, ["c", "x", "a", "b"])).toEqual(["c", "a", "b", "d"])
        expect(reorderToStored(["a", "b"], ["z", "y"])).toEqual(["a", "b"]) // stock 100% périmé → naturel
    })
})
