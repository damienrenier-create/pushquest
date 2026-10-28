import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { rollWildEncounter, captureGuide, runObtainableSpecies, funDailyTarget, FUSION_COUCOUMINOU_SHARE, type EncounterCtx } from "./encounters"
import { SPECIES, CANONIZED_CUSTOM_ALIAS, getSpecies } from "./species"
import { typeOffensivePct, computeTypeOffensivePct } from "../create/customSpecies"
import { CANONIZED_CUSTOM_SPRITES, buildCustomSpecies, type CustomSpec } from "../create/customSpecies"
import { dexLore } from "./dexLore"
import { dexSize } from "./dexMensurations"

// Sartay, 28/10/2026 — Coucouminou, la création de Gass (PSY/ÉLEC) :
//  • « run fusion : un jerbiwat sur 20 dans la centrale elec pourrait être remplacé par coucouminou ? »
// (sa némésis d'ACE, « mets ruffiant en nemesis », est couverte par create/nemesisArchitect.test.ts)

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function sample(ctx: Omit<EncounterCtx, "rng">, n: number, seed = 11) {
    const rng = mulberry32(seed)
    const counts: Record<string, number> = {}
    const levels: Record<string, number[]> = {}
    let total = 0
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ ...ctx, rng })
        if (!m) continue
        total++
        counts[m.speciesId] = (counts[m.speciesId] ?? 0) + 1
        ;(levels[m.speciesId] ??= []).push(m.level)
    }
    return { counts, levels, total }
}
const LINE = ["coucouminou", "minouminou", "pssscht"]
// Run fusion = monde du run 1 une fois Sylvebarbe réveillé (isRunFusion) ; l'équipe y est forte (lead 70).
const CENTRALE: Omit<EncounterCtx, "rng"> = { mapId: "yellow_centrale", x: 5, y: 5, leadLevel: 70, encounterCount: 999 }
const share = (r: { counts: Record<string, number>; total: number }, id: string) => (r.counts[id] ?? 0) / r.total

describe("Run fusion — Centrale : 1 Jerbiwat sur 20 devient Coucouminou (Gass)", () => {
    const fusion = sample({ ...CENTRALE, sylvebarbeAwake: true }, 400_000)
    const before = sample(CENTRALE, 400_000)
    it("la lignée prend 1 Jerbiwat sur 20, toujours au stade Coucouminou (niv 12-15, il évolue au 16)", () => {
        const c = fusion.counts.coucouminou ?? 0, j = fusion.counts.jerbiwat ?? 0
        expect(c / (c + j)).toBeGreaterThan(FUSION_COUCOUMINOU_SHARE - 0.01)
        expect(c / (c + j)).toBeLessThan(FUSION_COUCOUMINOU_SHARE + 0.01)
        expect(Math.min(...fusion.levels.coucouminou)).toBeGreaterThanOrEqual(12)
        expect(Math.max(...fusion.levels.coucouminou)).toBeLessThanOrEqual(15)
        expect((fusion.counts.minouminou ?? 0) + (fusion.counts.pssscht ?? 0)).toBe(0)
    })
    it("un REMPLACEMENT : Jerbiwat + Coucouminou = l'ancienne part de Jerbiwat, les autres espèces ne bougent pas", () => {
        expect(share(fusion, "jerbiwat") + share(fusion, "coucouminou")).toBeCloseTo(share(before, "jerbiwat"), 2)
        for (const id of ["electroatiss", "namicha", "boltah"]) expect(Math.abs(share(fusion, id) - share(before, id)), id).toBeLessThan(0.005)
    })
    it("avant l'éveil de Sylvebarbe (run 1), aux runs 2 et 3 : jamais de Coucouminou à la Centrale", () => {
        expect(before.counts.coucouminou ?? 0).toBe(0)
        for (const w of [{ ngplus: true }, { run3: true }]) {
            const r = sample({ ...CENTRALE, ...w, sylvebarbeAwake: true }, 100_000)
            for (const id of LINE) expect(r.counts[id] ?? 0, `${JSON.stringify(w)} ${id}`).toBe(0)
        }
    })
    it("guide et Daemomaniaque : au run fusion seulement, au bon taux ; Jerbiwat y cède sa part", () => {
        const g = captureGuide("coucouminou", 1, false, true)
        expect(g.where[0]).toContain("Centrale"); expect(g.where[0]).toContain("≈3%"); expect(g.where[0]).toContain("niv 12-15")
        expect(captureGuide("coucouminou", 1, true).where.join(" ")).not.toContain("Centrale")
        const pctOf = (w: string[]) => Number(/Centrale[^≈]*≈(\d+)%/.exec(w.join(" | "))?.[1])
        const jFusion = pctOf(captureGuide("jerbiwat", 1, false, true).where), jBefore = pctOf(captureGuide("jerbiwat", 1, true).where)
        expect(jFusion).toBe(Math.round(jBefore * (1 - FUSION_COUCOUMINOU_SHARE))) // 52 % → 49 %
        const r4 = runObtainableSpecies(4, true)
        for (const id of LINE) expect(r4.has(id), id).toBe(true)
        for (const run of [1, 2, 3]) expect(runObtainableSpecies(run, false).has("coucouminou"), `run ${run}`).toBe(false)
    })
    it("mode fun : Coucouminou n'est jamais le « Pokémon du jour » (il ne pop qu'au run fusion)", () => {
        const zones = ["yellow_route_nord", "yellow_grotte", "yellow_centrale", "yellow_maison_hantee", "yellow_plage"]
        const d0 = Date.UTC(2026, 9, 28)
        for (let i = 0; i < 1500; i++) {
            const day = new Date(d0 + i * 86_400_000).toISOString().slice(0, 10)
            expect(funDailyTarget(zones, day)?.speciesId, day).not.toBe("coucouminou")
        }
    })
})

// Spec RÉELLE de la création (save de Gass, lue en base le 28/10/2026 ; sans les URL de sprites générés).
const GASS_OWNER = "cmvkn4w5z0003wpsmujovzhem"
const GASS_SPEC = {
    name: "Coucouminou", creatorName: "Gass", role: "attaquant-spe", curve: "linear", stages: 3, bloomer: "mid",
    da: "Un tout tout tout petit Gremlins, mignon d'être laid. Plutôt vert et mauve comme une voiture tunée de mauvais goût.",
    daFinal: "De grosses épines dorsales, des yeux globuleux, une queue de rat avec des poids sur le bout et une casquette MAGA. L'air con mais puissant.",
    character: "Imprévisible, imbus de lui même et psychotique", attributes: ["griffes", "epines"],
    finalStats: { hp: 75, atk: 35, def: 70, spc: 132, spe: 110 }, finalTypes: ["PSY", "ELEC"],
    stageNames: { 2: "Minouminou", 3: "Pssscht" }, secretTalent: "resistant",
    learnset: [
        { level: 5, moveId: "patience" }, { level: 5, moveId: "ultrasons" }, { level: 12, moveId: "choc_mental" },
        { level: 18, moveId: "surtension" }, { level: 24, moveId: "vampelec" }, { level: 30, moveId: "eveil_divin" },
        { level: 36, moveId: "fulgurance" }, { level: 42, moveId: "brume_sporale" }, { level: 48, moveId: "ultra_foudre" },
        { level: 54, moveId: "spores_dodo" },
    ],
} as unknown as CustomSpec

describe("Canonisation — Coucouminou → Minouminou → Pssscht (Gass), dex 241-243", () => {
    it("portage FIDÈLE de buildCustomSpecies (stats, types, évolutions, learnset, talent, courbe)", () => {
        const chain = buildCustomSpecies(GASS_SPEC, GASS_OWNER)
        expect(chain.map((s) => s.name)).toEqual(["Coucouminou", "Minouminou", "Pssscht"])
        chain.forEach((c, i) => {
            const s = SPECIES[LINE[i]]
            expect(s.types).toEqual(c.types)
            expect(s.baseStats).toEqual(c.baseStats)
            expect(s.learnset).toEqual(c.learnset)
            expect(s.growthRate).toBe(c.growthRate)
            expect(s.baseExp).toBe(c.baseExp)
            expect(s.catchRate).toBe(c.catchRate)
            expect((s as { secretTalent?: string }).secretTalent).toBe((c as { secretTalent?: string }).secretTalent)
            expect(s.evolution?.method).toEqual(c.evolution?.method)
            expect(s.description).toBe(c.description)
        })
        expect(SPECIES.coucouminou.evolution?.toId).toBe("minouminou")
        expect(SPECIES.minouminou.evolution?.toId).toBe("pssscht")
        expect(SPECIES.pssscht.evolution).toBeUndefined()
    })
    it("dex 241-243, tier run 3 (hors totaux run 1/2), pas caché après la 1re rencontre ; sprites, alias, fiches", () => {
        expect(LINE.map((id) => SPECIES[id].dexNo)).toEqual([241, 242, 243])
        const key = buildCustomSpecies(GASS_SPEC, GASS_OWNER)[0].id.replace(/_s1$/, "")
        expect(CANONIZED_CUSTOM_SPRITES[key]).toEqual(LINE.map((id) => `/yellow/sprites/dex/${id}.png`))
        expect(CANONIZED_CUSTOM_ALIAS[`${key}_s3`]).toBe("pssscht")
        // Gass joue Minouminou (_s2) : chaque stade de son Daemon se résout sans sa fiche (serveur, spectateurs, sprites de fusion)
        expect(LINE.map((_, i) => getSpecies(`${key}_s${i + 1}`)?.id)).toEqual(LINE)
        for (const id of LINE) {
            const s = SPECIES[id] as { runThreeOnly?: boolean; hiddenUntilCaught?: boolean; sprite?: string }
            expect(s.runThreeOnly, id).toBe(true)
            expect(s.hiddenUntilCaught, id).toBeFalsy()
            expect(fs.existsSync(path.join(process.cwd(), "public", s.sprite!)), id).toBe(true)
            expect(dexLore(id)?.ecology, id).toBeTruthy()
            expect(dexSize(id)?.quip, id).toBeTruthy()
            expect(SPECIES[id].description).toContain("Création de Gass")
        }
    })
    it("ajouter des espèces ne change plus la table qui calibre les attaques des créations et des anciennes némésis", () => {
        expect(typeOffensivePct("SOL")).toBe(92 / 240)
        expect(computeTypeOffensivePct("SOL")).toBe(95 / 243) // le calcul d'origine, lui, aurait bougé avec Coucouminou
        const head = Object.values(SPECIES).filter((s) => !LINE.includes(s.id))
        for (const t of ["NORMAL", "FEU", "EAU", "PLANTE", "ELEC", "GLACE", "COMBAT", "POISON", "SOL", "VOL", "PSY", "INSECTE", "ROCHE", "SPECTRE", "DRAGON", "FEE", "METAL", "TENEBRES"] as const)
            expect(typeOffensivePct(t), t).toBe(computeTypeOffensivePct(t, head)) // = la prod au 28/10 (dex de 240)
    })
})
