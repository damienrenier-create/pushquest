import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { computeFusion, fuseStats, fusionWeights, fusionBoost, fusionSynergy, isCraftedStarter, isFinalTrueFusion, type FusionParent } from "./fusionSpecies"
import { getSpecies, CANONICAL_NEMESIS } from "./species"
import { isTrueFusion } from "./fusiodex"

const P = (id: string): FusionParent => { const sp = getSpecies(id)!; return { name: sp.name, types: sp.types, stats: sp.baseStats, level: 50, moves: sp.learnset.map((l) => l.moveId), speciesId: sp.id } }
const K = ["hp", "atk", "def", "spe", "spc"] as const
const expected = (a: string, b: string, mode: "normal" | "boosted") => { const A = getSpecies(a)!.baseStats, B = getSpecies(b)!.baseStats; const wA = fusionWeights(A, mode), wB = fusionWeights(B, mode); return Object.fromEntries(K.map((k) => [k, Math.round(wA[k] * A[k] + wB[k] * B[k])])) }
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8")

describe("bonus des créateurs : deux Daemons craftés (Sartay 19/10/2026)", () => {
    it("craftés : les créations de joueur et leurs stades, les shiny craftés, les custom ; JAMAIS les némésis", () => {
        for (const id of ["thanadrak", "dracominus", "mobyd", "guizer", "kangoudead", "karatame", "lesleo", "wooky", "custom_abc_x_s1"]) expect(isCraftedStarter(id), id).toBe(true)
        for (const nem of new Set(Object.values(CANONICAL_NEMESIS))) expect(isCraftedStarter(nem), nem).toBe(false)
        for (const id of ["loupyre", "galijah", "pyrokoss", undefined]) expect(isCraftedStarter(id), String(id)).toBe(false)
        expect(isCraftedStarter("custom_nemcmti9xukc002h_nemesisdedracomi_s2")).toBe(false) // némésis custom de Rob
        expect(isCraftedStarter("custom_cmti9xukc002h7k2_dracominus_s3")).toBe(true) // le Dracominus custom de Rob
    })
    it("une création par joueur arrivé au run 2 : les 11 stades finaux sont craftés, leurs némésis non", () => {
        for (const id of ["alirocaillus", "kangoudead", "mobyd", "shadow", "necrossum", "karatame", "phoechaudiii", "thanadrak", "stashex3", "wooky", "lesleo"]) expect(isCraftedStarter(id), id).toBe(true)
        for (const id of ["goatiny", "mouflorage", "otama", "uzumaro", "caninombre", "tenebrir", "charolyx", "sepulcru", "obscurene", "brasicow"]) expect(isCraftedStarter(id), id).toBe(false)
    })
    it("Thanadrak × Moby D : génétique boostée ; un crafté avec un Daemon normal : génétique normale", () => {
        expect(fuseStats(P("thanadrak"), P("mobyd"))).toEqual(expected("thanadrak", "mobyd", "boosted"))
        expect(fuseStats(P("mobyd"), P("thanadrak"))).toEqual(expected("thanadrak", "mobyd", "boosted"))
        expect(fuseStats(P("thanadrak"), P("loupyre"))).toEqual(expected("thanadrak", "loupyre", "normal"))
    })
})

describe("bonus des chimères : super-fusion de deux fusionnés au stade final (Sartay 19/10/2026)", () => {
    it("stade final : Sidéralithe et Ukognofy oui ; Sidérobloc (évolue encore) non ; un Daemon normal ou custom non", () => {
        expect(isFinalTrueFusion("sideralithe")).toBe(true)
        expect(isFinalTrueFusion("ukognofy")).toBe(true)
        expect(isFinalTrueFusion("siderobloc")).toBe(false)
        expect(isFinalTrueFusion("loupyre")).toBe(false)
        expect(isFinalTrueFusion("custom_abc_x_s3")).toBe(false)
    })
    it("même définition de « vraie fusion » que le Fusiodex", () => {
        for (const id of ["sideralithe", "ukognofy", "siderobloc", "draconvolt", "loupyre", "mobyd"]) {
            if (isFinalTrueFusion(id)) expect(isTrueFusion(id), id).toBe(true)
        }
        expect(isTrueFusion("siderobloc")).toBe(true) // vraie fusion, mais pas au stade final
    })
    it("Sidéralithe × Ukognofy : boostée ; Sidérobloc × Ukognofy : normale", () => {
        expect(fuseStats(P("sideralithe"), P("ukognofy"))).toEqual(expected("sideralithe", "ukognofy", "boosted"))
        expect(fuseStats(P("siderobloc"), P("ukognofy"))).toEqual(expected("siderobloc", "ukognofy", "normal"))
    })
})

describe("ce sont des RÈGLES, pas des secrets", () => {
    it("le badge les nomme, mais la page Secrets et la fête les ignorent", () => {
        expect(fusionBoost("thanadrak", "mobyd")).toEqual({ key: "rule:createurs", label: "la synergie des créateurs" })
        expect(fusionBoost("sideralithe", "ukognofy")).toEqual({ key: "rule:chimeres", label: "la synergie des chimères" })
        expect(fusionSynergy("thanadrak", "mobyd")).toBeNull()
        expect(fusionSynergy("sideralithe", "ukognofy")).toBeNull()
        expect(fusionBoost("pyropanthe", "voltapanthe")?.key).toBe("clan:panthere") // un secret garde sa clé
        expect(fusionBoost("loupyre", "galijah")).toBeNull()
    })
    it("⚠️ aucune fusion d'ADVERSAIRE (Ligue, boss, officielles, épreuve) ne profite de ces règles", () => {
        const src = ["src/lib/gamebook/yellow/data/fusionLeague.ts", "src/lib/gamebook/yellow/data/officialFusions.ts", "src/lib/gamebook/yellow/data/fusionTrial.ts"].map(read).join(String.fromCharCode(10))
        let n = 0
        for (const m of src.matchAll(/a:\s*"([a-z0-9_]+)",\s*b:\s*"([a-z0-9_]+)"/g)) {
            n++
            expect(isCraftedStarter(m[1]) && isCraftedStarter(m[2]), `${m[1]} x ${m[2]}`).toBe(false)
            expect(isFinalTrueFusion(m[1]) && isFinalTrueFusion(m[2]), `${m[1]} x ${m[2]}`).toBe(false)
        }
        expect(n).toBeGreaterThan(40)
    })
    it("⚠️ l'aperçu et la fiche affichent le VRAI bonus (fusionBoost), les règles du Fusiodex les expliquent", () => {
        expect(read("src/app/gamebook/yellow/FusionPreviewCard.tsx")).toContain("fusionBoost(aId, bId)")
        expect(read("src/app/gamebook/yellow/FusionDetailView.tsx")).toContain("fusionBoost(aId, bId)")
        const rules = read("src/lib/gamebook/yellow/data/fusionLore.ts")
        expect(rules).toContain("BONUS DES CRÉATEURS")
        expect(rules).toContain("BONUS DES CHIMÈRES")
        expect(computeFusion(P("thanadrak"), P("mobyd")).stats).toEqual(expected("thanadrak", "mobyd", "boosted"))
    })
})
