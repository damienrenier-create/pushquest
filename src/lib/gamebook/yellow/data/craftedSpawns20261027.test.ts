import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { rollWildEncounter, captureGuide, runObtainableSpecies, hautesHerbesTypesForDay, RUN3_STASHEX_SHARE, RUN3_STASHEX_GRID_SHARE, type EncounterCtx } from "./encounters"
import { fishingRareOfMap, fishingRareLevelFor, fishingTier, GUIZER_RARE_SHARE } from "./fishing"
import { SPECIES, getSpecies, CANONIZED_CUSTOM_ALIAS } from "./species"
import { CANONIZED_CUSTOM_SPRITES, buildCustomSpecies, type CustomSpec } from "../create/customSpecies"
import { dexLore } from "./dexLore"
import { dexSize } from "./dexMensurations"
import { SPECIAL_OBTAIN } from "./captureSpecial"
import { run3ExclusiveRows, run3ExclusiveSignLines } from "./run3Exclusives"

// Lot de Sartay du 27/10/2026 (créations de joueurs rendues sauvages) :
//  • « Enlève Joeyrrant du run 2. Mets-le dans la grotte glacée du run 3, toujours minimum au niveau Wallabisan. En mode rare ! »
//  • « Guizer pêché dans le run 3 uniquement, dans la grotte glacée. »
//  • « Dakumba a crafté un pokémon ténèbre : 1 % de chance dans la maison des ténèbres du run 2. »
//  • « Le crafté psy : à la place de Nouillon dans le run 3. » (Stashex, une part des Nouillon : RUN3_STASHEX_SHARE)
//  • « Spectragon : ultra rare dans la grotte (run 3). » · « Possyl (Zyran) : ultra rare dans la maison spectre (run 1). »
// Puis le 28/10/2026 : « stashex : 3 % du carré psy max ! » et « spectragon : ok pour la base 1 ! » (Dracominus).

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
function sample(ctx: Omit<EncounterCtx, "rng">, n: number, seed = 7) {
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
const sum = (c: Record<string, number>, ids: string[]) => ids.reduce((s, id) => s + (c[id] ?? 0), 0)
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const NOUILLON_LINE = ["nouillon", "vermisaint", "divinpate"]
const STASHEX_LINE = ["stashex", "stashex2", "stashex3"]
const JOEY_LINE = ["joeyrrant", "wallabisan", "kangoudead"]

describe("Run 2 — Manoir des Ténèbres : Joeyrrant parti, Snatchacoolt (DaKumba) à ~1 %", () => {
    it("aucune trace de la lignée Joeyrrant ; Snatchacoolt ≈ 1 %, toujours au stade 1 (niv 16-21)", () => {
        const r = sample({ mapId: "yellow_maison_hantee", x: 5, y: 5, leadLevel: 30, ngplus: true, encounterCount: 999 }, 400_000)
        expect(sum(r.counts, JOEY_LINE)).toBe(0)
        const share = (r.counts.snatchacoolt ?? 0) / r.total
        expect(share).toBeGreaterThan(0.006); expect(share).toBeLessThan(0.014)
        expect(Math.min(...r.levels.snatchacoolt)).toBeGreaterThanOrEqual(16)
        expect(Math.max(...r.levels.snatchacoolt)).toBeLessThanOrEqual(21)
        expect((r.counts.stealacoolt ?? 0) + (r.counts.robacoolt ?? 0)).toBe(0)
    })
    it("le run 1 et le run 3 n'ont pas de Snatchacoolt", () => {
        expect(sample({ mapId: "yellow_maison_hantee", x: 5, y: 5, leadLevel: 30, encounterCount: 999 }, 60_000).counts.snatchacoolt ?? 0).toBe(0)
        expect(sample({ mapId: "yellow_maison_hantee", x: 5, y: 5, leadLevel: 30, run3: true, encounterCount: 999 }, 60_000).counts.snatchacoolt ?? 0).toBe(0)
    })
})

describe("Run 3 — Grotte Gelée : la lignée de Joeyrrant, au stade Wallabisan minimum, rare", () => {
    it("équipe faible et plafond de badges bas : Wallabisan quand même au niv 22+, ≈ 0,7 % (moins d'une rencontre sur 100), jamais Joeyrrant", () => {
        const r = sample({ mapId: "yellow_grotte_gelee", x: 5, y: 5, leadLevel: 10, levelCap: 12, run3: true, encounterCount: 999 }, 400_000)
        expect(r.counts.joeyrrant ?? 0).toBe(0)
        const share = (r.counts.wallabisan ?? 0) / r.total
        expect(share).toBeGreaterThan(0.005); expect(share).toBeLessThan(0.009)
        expect(Math.min(...r.levels.wallabisan)).toBeGreaterThanOrEqual(22)
        expect(r.counts.kangoudead ?? 0).toBe(0) // < 40 → jamais le stade final
    })
    it("équipe forte : la lignée sort aussi en Kangoudead (niv 40+), toujours sans Joeyrrant", () => {
        const r = sample({ mapId: "yellow_grotte_gelee", x: 5, y: 5, leadLevel: 60, run3: true, encounterCount: 999 }, 400_000)
        expect(r.counts.joeyrrant ?? 0).toBe(0)
        expect(r.counts.kangoudead ?? 0).toBeGreaterThan(0)
        expect(Math.min(...r.levels.kangoudead)).toBeGreaterThanOrEqual(40)
    })
    it("même la nuit en mode fun (Ténèbres/Glace ×1,5), le kangourou ne dépasse pas une rencontre sur 100", () => {
        for (const leadLevel of [20, 40]) { // sous 35, Orcaline ne pèse rien → c'est le pire cas
            const r = sample({ mapId: "yellow_grotte_gelee", x: 5, y: 5, leadLevel, run3: true, encounterCount: 999, hour: 23, funMode: true }, 400_000)
            expect(sum(r.counts, JOEY_LINE) / r.total, `lead ${leadLevel}`).toBeLessThan(0.0112)
        }
    }, 30_000)
    it("guide : Thanadrak et Robacoolt renvoient à la BASE réellement listée (deux évolutions)", () => {
        expect(captureGuide("thanadrak", 3).note).toBe("Thanadrak n'est pas capturable directement : obtiens Dracominus (ci-dessus) puis fais-le évoluer deux fois.")
        expect(captureGuide("spectragon", 3).note).toBe("Spectragon n'est pas capturable directement : obtiens Dracominus (ci-dessus) puis fais-le évoluer.")
        expect(captureGuide("robacoolt", 2).note).toContain("obtiens Snatchacoolt (ci-dessus) puis fais-le évoluer deux fois")
    })
    it("la lignée n'apparaît plus dans aucune zone du run 1 ni du run 2", () => {
        for (const mapId of ["yellow_grotte_gelee", "yellow_maison_hantee", "yellow_route_nord", "yellow_grotte", "yellow_centrale", "yellow_plage"]) {
            expect(sum(sample({ mapId, x: 5, y: 5, leadLevel: 45, encounterCount: 999 }, 20_000).counts, JOEY_LINE), `run1 ${mapId}`).toBe(0)
            expect(sum(sample({ mapId, x: 5, y: 5, leadLevel: 45, ngplus: true, encounterCount: 999 }, 20_000).counts, JOEY_LINE), `run2 ${mapId}`).toBe(0)
        }
    })
})

describe("Run 3 — Grotte Rocheuse : Dracominus (base de la lignée de Rob) ultra-rare", () => {
    it("≈ 0,5 %, toujours au stade 1 (niv 15-21), même avec une équipe de haut niveau ; jamais Spectragon ni Thanadrak", () => {
        const r = sample({ mapId: "yellow_grotte", x: 5, y: 5, leadLevel: 60, run3: true, encounterCount: 999 }, 800_000)
        const share = (r.counts.dracominus ?? 0) / r.total
        expect(share).toBeGreaterThan(0.0038); expect(share).toBeLessThan(0.0065)
        expect(Math.min(...r.levels.dracominus)).toBeGreaterThanOrEqual(15)
        expect(Math.max(...r.levels.dracominus)).toBeLessThanOrEqual(21)
        expect((r.counts.spectragon ?? 0) + (r.counts.thanadrak ?? 0)).toBe(0)
        const low = sample({ mapId: "yellow_grotte", x: 5, y: 5, leadLevel: 8, levelCap: 12, run3: true, encounterCount: 999 }, 300_000)
        expect(low.counts.dracominus ?? 0).toBeGreaterThan(0)
        expect(Math.max(...low.levels.dracominus)).toBeLessThanOrEqual(21)
        // runs 1 et 2 : pas dans la Grotte Rocheuse (le shiny crafté d'après le Dôme Fusion est un autre canal)
        expect(sample({ mapId: "yellow_grotte", x: 5, y: 5, leadLevel: 30, encounterCount: 999 }, 100_000).counts.dracominus ?? 0).toBe(0)
        expect(sample({ mapId: "yellow_grotte", x: 5, y: 5, leadLevel: 30, ngplus: true, encounterCount: 999 }, 100_000).counts.dracominus ?? 0).toBe(0)
    }, 30_000)
})

describe("Run 1 — Maison Hantée (spectres) : Possyl (Zyran) ultra-rare", () => {
    it("≈ 0,5 %, toujours au stade 1 (niv 15-21)", () => {
        const r = sample({ mapId: "yellow_maison_hantee", x: 5, y: 5, leadLevel: 40, encounterCount: 999 }, 1_000_000)
        const share = (r.counts.possyl ?? 0) / r.total
        expect(share).toBeGreaterThan(0.0038); expect(share).toBeLessThan(0.0065)
        expect(Math.min(...r.levels.possyl)).toBeGreaterThanOrEqual(15)
        expect(Math.max(...r.levels.possyl)).toBeLessThanOrEqual(21)
        expect((r.counts.possombre ?? 0) + (r.counts.necrossum ?? 0)).toBe(0)
    })
})

describe("Run 3 — Stashex (Tom) à la place d'une part des Nouillon", () => {
    it(`Centrale : la lignée Stashex prend ≈ ${RUN3_STASHEX_SHARE * 100} % des Nouillon, même stade selon le niveau`, () => {
        expect(RUN3_STASHEX_SHARE).toBeGreaterThan(0); expect(RUN3_STASHEX_SHARE).toBeLessThanOrEqual(1)
        const r = sample({ mapId: "yellow_centrale", x: 5, y: 5, leadLevel: 40, run3: true, encounterCount: 999 }, 300_000)
        const st = sum(r.counts, STASHEX_LINE), no = sum(r.counts, NOUILLON_LINE)
        expect(st).toBeGreaterThan(0)
        const part = st / (st + no)
        expect(part).toBeGreaterThan(RUN3_STASHEX_SHARE * 0.75); expect(part).toBeLessThan(RUN3_STASHEX_SHARE * 1.25 + 1e-9)
        expect(r.counts.stashex2 ?? 0).toBeGreaterThan(0) // l'entrée Nouillon niv 27-33 → StasHex
        for (const id of Object.keys(r.counts)) expect(getSpecies(id)?.types, id).toContain("PSY") // donjon 100 % Psy intact
    })
    it("Route Nord du run 3 : Stashex présent ; runs 1 et 2 : jamais", () => {
        expect(sum(sample({ mapId: "yellow_route_nord", x: 5, y: 5, leadLevel: 12, run3: true, encounterCount: 999 }, 600_000).counts, STASHEX_LINE)).toBeGreaterThan(0)
        expect(sum(sample({ mapId: "yellow_route_nord", x: 5, y: 5, leadLevel: 12, encounterCount: 999 }, 100_000).counts, STASHEX_LINE)).toBe(0)
        expect(sum(sample({ mapId: "yellow_centrale", x: 5, y: 5, leadLevel: 40, ngplus: true, encounterCount: 999 }, 100_000).counts, STASHEX_LINE)).toBe(0)
    })
    it("carré PSY des Hautes Herbes : 3 % max au run 3, aucune au run 1/2 (le guide suit le même calcul)", () => {
        expect(RUN3_STASHEX_GRID_SHARE).toBeGreaterThan(0); expect(RUN3_STASHEX_GRID_SHARE).toBeLessThanOrEqual(0.03)
        let day = "", slot = -1
        for (let d = 1; d <= 60 && slot < 0; d++) {
            const key = `2026-11-${String(((d - 1) % 30) + 1).padStart(2, "0")}`
            const s = hautesHerbesTypesForDay(key).indexOf("PSY")
            if (s >= 0) { day = key; slot = s }
        }
        expect(slot).toBeGreaterThanOrEqual(0)
        const x = [2, 7, 12][slot % 3], y = [15, 9, 3][Math.floor(slot / 3)]
        const base = { mapId: "yellow_hautes_herbes", x, y, leadLevel: 30, dayKey: day, encounterCount: 999 }
        const r3 = sample({ ...base, run3: true }, 400_000)
        const st = sum(r3.counts, STASHEX_LINE), no = sum(r3.counts, NOUILLON_LINE)
        expect(st).toBeGreaterThan(0)
        const part = st / (st + no)
        expect(part).toBeGreaterThan(RUN3_STASHEX_GRID_SHARE * 0.8); expect(part).toBeLessThan(RUN3_STASHEX_GRID_SHARE * 1.2 + 1e-9)
        expect(st / r3.total).toBeLessThan(0.033) // ≤ 3 % des rencontres du carré (aux tirages près)
        expect(sum(sample(base, 100_000).counts, STASHEX_LINE)).toBe(0)
        expect(sum(sample({ ...base, ngplus: true }, 100_000).counts, STASHEX_LINE)).toBe(0)
        expect(captureGuide("stashex", 3).where.some((w) => w.includes("carré PSY"))).toBe(true)
    })
})

describe("Pêche — Guizer (Task1) : Grotte Gelée, run 3 uniquement", () => {
    it("un rare sur quatre à la Grotte Gelée au run 3, à toute heure ; sinon Osquille/Rô ; ailleurs ou dans les autres runs, rien ne change", () => {
        expect(GUIZER_RARE_SHARE).toBe(0.25)
        for (const h of [0, 7, 8, 13, 19, 20, 23]) {
            const hourRare = h >= 8 && h < 20 ? "osquille" : "ro"
            expect(fishingRareOfMap("yellow_grotte_gelee", "run3", h, 0.1)).toBe("guizer")
            expect(fishingRareOfMap("yellow_grotte_gelee", "run3", h, 0.6)).toBe(hourRare)
            expect(fishingRareOfMap("yellow_grotte_gelee", "run1", h, 0.1)).toBe(hourRare)
            expect(fishingRareOfMap("yellow_grotte_gelee", "run2", h, 0.1)).toBe(hourRare)
            expect(fishingRareOfMap("yellow_cendreville", "run3", h, 0.6)).toBe("onirail")
            expect(fishingRareOfMap("yellow_route_nord", "run3", h, 0.1)).not.toBe("guizer")
        }
    })
    it("≈ 3 % des lancers à effort neutre (Sartay : « Guizer (le rare) 12 % descend à 3 % »)", () => {
        const rng = mulberry32(11)
        const N = 400_000
        let guizer = 0
        for (let i = 0; i < N; i++) if (fishingTier(rng(), 1, true) === "rare" && fishingRareOfMap("yellow_grotte_gelee", "run3", 12, rng()) === "guizer") guizer++
        expect(guizer / N).toBeGreaterThan(0.027); expect(guizer / N).toBeLessThan(0.033)
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("speciesId = fishingRareOfMap(get().map.id, run, new Date().getHours(), Math.random())")
    })
    it("il mord toujours au stade Guizer : niveau plafonné sous sa 1re évolution (22) ; les rares sans évolution ne bougent pas", () => {
        expect(fishingRareLevelFor("guizer", 40)).toBe(21)
        expect(fishingRareLevelFor("guizer", 30)).toBe(21)
        expect(fishingRareLevelFor("guizer", 12)).toBe(12)
        for (const id of ["osquille", "ro", "onirail"]) expect(fishingRareLevelFor(id, 55), id).toBe(55)
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("level = fishingRareLevelFor(speciesId, fishingRareLevel(badges, avg, Math.random(), Math.random()))")
    })
})

describe("Daemomaniaque — listes et fiches suivent les nouveaux pops", () => {
    it("run 2 : plus de lignée Joeyrrant ; la lignée de DaKumba y est", () => {
        const r2 = runObtainableSpecies(2, false)
        for (const id of JOEY_LINE) expect(r2.has(id), id).toBe(false)
        for (const id of ["snatchacoolt", "stealacoolt", "robacoolt"]) expect(r2.has(id), id).toBe(true)
        expect(captureGuide("joeyrrant", 2).where.join(" ")).not.toContain("Maison Hantée")
        const g = captureGuide("snatchacoolt", 2)
        expect(g.where[0]).toContain("Maison Hantée"); expect(g.where[0]).toContain("≈1.0%"); expect(g.where[0]).toContain("niv 16-21")
        expect(captureGuide("robacoolt", 2).note).toContain("fais-le évoluer")
    })
    it("run 3 : Wallabisan/Kangoudead (Grotte Gelée, niv 22+ / 40+), Guizer à la pêche, Stashex et Dracominus ; Nouillon reste", () => {
        const r3 = runObtainableSpecies(3, false)
        for (const id of ["wallabisan", "kangoudead", "guizer", "dalugazer", "mobyd", ...STASHEX_LINE, "dracominus", "spectragon", "thanadrak", "nouillon"]) expect(r3.has(id), id).toBe(true)
        expect(r3.has("joeyrrant")).toBe(false)
        const w = captureGuide("wallabisan", 3).where.join(" | ")
        expect(w).toContain("Grotte Gelée"); expect(w).toContain("niv 22+"); expect(w).toContain("pop un peu au-dessus de ton niveau")
        expect(captureGuide("kangoudead", 3).where.join(" | ")).toContain("niv 40+")
        // Grotte du Nexus visible (mode « post » du Daemomaniaque) : la pêche du run 3 reste mentionnée à côté du B2F.
        expect(captureGuide("guizer", 3, false).how.join(" ")).toContain("Canne à pêche face à l'eau de la Grotte Gelée")
        expect(captureGuide("dalugazer", 3, false).how.join(" ")).toContain("Canne à pêche face à l'eau de la Grotte Gelée")
        expect(captureGuide("guizer", 2, false).how.join(" ")).not.toContain("Grotte Gelée") // pas de pêche hors run 3
        // Run fusion (pools du run 1, Champion, Grotte du Nexus visible) : la pêche d'Obscurène à Cendreville est mentionnée.
        expect(captureGuide("obscurene", 1, false, true).how.join(" ")).toContain("Canne à pêche face à l'eau de Cendreville")
        // Osquille / Rô : au run 3, le guide précise les deux eaux où ils ne mordent pas (ou moins).
        expect(captureGuide("osquille", 3, true).how.join(" ")).toContain("Au run 3 : jamais à Cendreville")
        expect(captureGuide("ro", 3, true, false, false, true).how.join(" ")).toContain("une prise rare sur quatre est un Guizer")
        expect(captureGuide("osquille", 1, true).how.join(" ")).not.toContain("Au run 3")
        const gz = captureGuide("guizer", 3, true)
        expect(gz.note).toBe("PÊCHABLE à la Grotte Gelée — run 3 uniquement (très rare).")
        expect(gz.how.join(" ")).toContain("environ 3 % des lancers")
        expect(captureGuide("dalugazer", 3, true).note).toContain("obtiens Guizer")
        const dr = captureGuide("dracominus", 3).where.join(" | ")
        expect(dr).toContain("Grotte Rocheuse"); expect(dr).toContain("≈0.5%"); expect(dr).toContain("niv 15-21")
        expect(captureGuide("stashex", 3).where.join(" | ")).toContain("Centrale")
    })
    it("run 1 : Possyl à la Maison Hantée (≈0,5 %, niv 15-21) ; Guizer n'y est pas pêchable", () => {
        expect(runObtainableSpecies(1, false).has("possyl")).toBe(true)
        expect(captureGuide("possyl", 1, true).where.join(" | ")).toContain("Maison Hantée · ≈0.5% · niv 15-21")
        expect(runObtainableSpecies(1, false).has("guizer")).toBe(false)
        expect(runObtainableSpecies(2, false).has("guizer")).toBe(false)
        expect(SPECIAL_OBTAIN.guizer.runs).toEqual([3])
    })
    it("panneaux du run 3 : chaque nouvelle lignée inédite a son indice", () => {
        const rows = run3ExclusiveRows()
        for (const key of ["wallabisan", "guizer", "stashex", "dracominus"]) {
            const row = rows.find((r) => r.key === key)
            expect(row, key).toBeTruthy()
            expect(row!.hint, key).not.toBe("introuvable ailleurs")
        }
        expect(run3ExclusiveSignLines()[0]).toContain("absents des runs 1 et 2") // Guizer/Stashex/Dracominus existent aussi au run fusion ou en shiny crafté
        expect(rows.find((r) => r.key === "dracominus")?.names).toBe("Dracominus → Spectragon → Thanadrak")
        // Taux FIXE dans les pools du run 3 (pas de biome) : pas d'avertissement « taux indicatif » ; il reste au run 1 (biomes).
        expect(captureGuide("dracominus", 3).how.join(" ")).not.toContain("Taux indicatif")
        expect(captureGuide("stashex", 3).how.join(" ")).not.toContain("Taux indicatif")
        expect(captureGuide("plumiot", 1, true).how.join(" ")).toContain("Taux indicatif")
        expect(rows.some((r) => r.ids.includes("joeyrrant"))).toBe(false)
        expect(rows.some((r) => r.ids.includes("snatchacoolt"))).toBe(false) // lignée du run 2, pas un inédit du concours
    })
})

// Spec RÉELLE de la création (save de DaKumba, lue en base le 27/10/2026 ; sans les URL de sprites générés).
const DAKUMBA_OWNER = "cmt7m9eip0009uov65qkmzv4l"
const DAKUMBA_SPEC = {
    name: "Snatchacoolt", creatorName: "DaKumba", role: "mur", curve: "accel", stages: 3, bloomer: "late",
    da: "Robacoolt adore chaparder les objets brillants. Mais ses petites pattes maladroites et son électricité incontrôlable le font régulièrement trébucher, révélant ainsi tous ses petits larcins. »",
    daFinal: "un raton laveur trapu et très touffu, aux yeux jaune électrique, avec une énorme queue annelée qui accumule l'énergie. Il devient impressionnant quand il attaque. Silhouette : corps bas et puissant, petites pattes",
    character: "il se croit extrêmement malin, mais il est pataud", attributes: ["pelage", "antennes"],
    finalStats: { hp: 132, atk: 15, def: 152, spc: 130, spe: 15 }, finalTypes: ["ELEC", "TENEBRES"],
    stageNames: { 2: "Stealacoolt", 3: "Robacoolt" }, secretTalent: "resistant", ultimateMove: "choc_mental", talentRerolls: 0,
    learnset: [
        { level: 5, moveId: "morsure_sombre" }, { level: 5, moveId: "jet_de_sable" }, { level: 12, moveId: "surtension" },
        { level: 18, moveId: "osmose" }, { level: 24, moveId: "vampelec" }, { level: 30, moveId: "vampigraine" },
        { level: 36, moveId: "mirage" }, { level: 42, moveId: "devoreur_ombres" }, { level: 48, moveId: "ultra_foudre" },
        { level: 54, moveId: "voile_effroi" },
    ],
} as unknown as CustomSpec

describe("Canonisation — Snatchacoolt → Stealacoolt → Robacoolt (DaKumba), dex 238-240", () => {
    const ids = ["snatchacoolt", "stealacoolt", "robacoolt"]
    it("portage FIDÈLE de buildCustomSpecies (stats, types, évolutions, learnset, talent, courbe)", () => {
        const chain = buildCustomSpecies(DAKUMBA_SPEC, DAKUMBA_OWNER)
        expect(chain.map((s) => s.name)).toEqual(["Snatchacoolt", "Stealacoolt", "Robacoolt"])
        chain.forEach((c, i) => {
            const s = SPECIES[ids[i]]
            expect(s.types).toEqual(c.types)
            expect(s.baseStats).toEqual(c.baseStats)
            expect(s.learnset).toEqual(c.learnset)
            expect(s.growthRate).toBe(c.growthRate)
            expect(s.baseExp).toBe(c.baseExp)
            expect(s.catchRate).toBe(c.catchRate)
            expect((s as { secretTalent?: string }).secretTalent).toBe((c as { secretTalent?: string }).secretTalent)
            expect(s.evolution?.method).toEqual(c.evolution?.method)
        })
        expect(SPECIES.snatchacoolt.evolution?.toId).toBe("stealacoolt")
        expect(SPECIES.stealacoolt.evolution?.toId).toBe("robacoolt")
        expect(SPECIES.robacoolt.evolution).toBeUndefined()
    })
    it("dex 238-240, tier run 3 (hors totaux run 1/2), pas caché après la 1re rencontre ; sprites, alias, fiches", () => {
        expect(ids.map((id) => SPECIES[id].dexNo)).toEqual([238, 239, 240])
        const chain = buildCustomSpecies(DAKUMBA_SPEC, DAKUMBA_OWNER)
        const key = chain[0].id.replace(/_s1$/, "")
        expect(CANONIZED_CUSTOM_SPRITES[key]).toEqual(ids.map((id) => `/yellow/sprites/dex/${id}.png`))
        expect(CANONIZED_CUSTOM_ALIAS[`${key}_s3`]).toBe("robacoolt")
        for (const id of ids) {
            const s = SPECIES[id] as { runThreeOnly?: boolean; hiddenUntilCaught?: boolean; sprite?: string }
            expect(s.runThreeOnly, id).toBe(true)
            expect(s.hiddenUntilCaught, id).toBeFalsy()
            expect(fs.existsSync(path.join(process.cwd(), "public", s.sprite!)), id).toBe(true)
            expect(dexLore(id)?.ecology, id).toBeTruthy()
            expect(dexSize(id)?.quip, id).toBeTruthy()
            expect(SPECIES[id].description).toContain("Création de DaKumba")
        }
    })
})
