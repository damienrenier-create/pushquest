import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { run3ExclusiveRows, run3ExclusiveSignLines, RUN3_EXCLUSIVE_HINTS } from "./run3Exclusives"
import { runObtainableSpecies, captureGuide } from "./encounters"
import { shopPrice, RUN3_BALL_DISCOUNT } from "./shopPricing"
import { RUN3_TIP_SHOP_LINES, run3RestartOfferLines } from "./run3Tips"
import { getSpecies } from "./species"

// Décisions Sartay du 26/10/2026 (2e lot run 3 + Marmoterre/Phoéchaud).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const bst = (id: string) => { const s = getSpecies(id)!.baseStats; return s.hp + s.atk + s.def + s.spe + s.spc }

describe("Marmoterre : UNE seule apparition sauvage (Grotte Gelée run 1, ≈1 %, 12h→22h) + cadeau du Dénicheur en run 3", () => {
    it("obtenable en run 1 (sauvage) et run 3 (échange), jamais en run 2 ; plus dans les Hautes Herbes", () => {
        expect(runObtainableSpecies(1, false).has("marmoterre")).toBe(true)
        expect(runObtainableSpecies(2, false).has("marmoterre")).toBe(false)
        expect(runObtainableSpecies(3, false).has("marmoterre")).toBe(true)
        const w1 = captureGuide("marmoterre", 1, true, false, true, false).where.map((w) => (typeof w === "string" ? w : JSON.stringify(w))).join(" | ")
        expect(w1).toContain("Grotte Gelée"); expect(w1).toContain("≈1%"); expect(w1).not.toContain("Hautes Herbes")
        expect(captureGuide("marmoterre", 2, true, false, true, false).where).toEqual([])
        expect(captureGuide("marmoterre", 3, true, false, true, false).where).toEqual([])
        const enc = read("src/lib/gamebook/yellow/data/encounters.ts")
        expect(enc.match(/speciesId: "marmoterre"/g)?.length).toBe(1)
        expect(enc).toContain("{ speciesId: \"marmoterre\", base: 3, hourRange: [12, 22] }")
        for (const id of ["marmoterre", "iorours", "yetiroche"]) expect(getSpecies(id)!.runThreeOnly, id).toBeFalsy() // de retour au dex run 1
    })
    it("lignée Iorours : Atk et Spé relevés (252→264, 352→385, 425→469 — Iorours/Yétiroche +10 % de plus le soir), learnset de Marmoterre comblé (Éboulis @14, Bélier @18)", () => {
        expect(getSpecies("marmoterre")!.baseStats).toEqual({ hp: 58, atk: 58, def: 52, spe: 42, spc: 54 })
        expect(getSpecies("iorours")!.baseStats).toEqual({ hp: 80, atk: 97, def: 70, spe: 50, spc: 88 })
        expect(getSpecies("yetiroche")!.baseStats).toEqual({ hp: 95, atk: 123, def: 80, spe: 55, spc: 116 })
        expect([bst("marmoterre"), bst("iorours"), bst("yetiroche")]).toEqual([264, 385, 469])
        const ls = getSpecies("marmoterre")!.learnset.map((l) => `${l.moveId}@${l.level}`)
        expect(ls).toContain("eboulis@14"); expect(ls).toContain("belier@18")
    })
})

describe("Phoéchaud : plus en run 2 (ni en live) — run 3 seulement", () => {
    it("obtenable en run 3 uniquement", () => {
        expect(runObtainableSpecies(1, false).has("phoechaudi")).toBe(false)
        expect(runObtainableSpecies(2, false).has("phoechaudi")).toBe(false)
        expect(runObtainableSpecies(3, false).has("phoechaudi")).toBe(true)
        const enc = read("src/lib/gamebook/yellow/data/encounters.ts")
        expect(enc.match(/speciesId: "phoechaudi"/g)?.length).toBe(1) // la seule entrée : Grotte Rocheuse run 3
        expect(enc).not.toContain("\"phoechaudiii\", \"karatame\"") // retiré des finales B2F (monde live)
    })
})

describe("inédits du run 3 — panneaux et carrousel d'arène", () => {
    it("lignées calculées depuis les données ; chaque lignée a son indice « où/comment »", () => {
        const rows = run3ExclusiveRows()
        const keys = rows.map((r) => r.key)
        for (const k of ["elefer", "cornaive", "coccipoing", "otama", "gekosmic", "magnetor", "onirail", "flamarokto", "phoechaudi"]) expect(keys, k).toContain(k)
        expect(keys).not.toContain("marmoterre") // de nouveau sauvage en run 1 → plus un inédit
        for (const r of rows) expect(RUN3_EXCLUSIVE_HINTS[r.key], `indice manquant pour ${r.key}`).toBeDefined()
        expect(rows.find((r) => r.key === "otama")!.names).toBe("Otama → Gamaruto → Uzumaro")
        const lines = run3ExclusiveSignLines()
        expect(lines[0]).toContain("INÉDITS DU CONCOURS")
        expect(lines.length).toBe(rows.length + 1)
    })
    it("câblage : tous les panneaux en run 3 (gameStore) + bloc du carrousel d'arène", () => {
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("npc.name.startsWith(\"PANNEAU\") && effectiveRunWorld() === \"run3\" ? [...npc.dialoguesAfter, ...run3ExclusiveSignLines()]")
        expect(read("src/app/gamebook/yellow/ArenaInfoPanel.tsx")).toContain("run3ExclusiveRows().map(")
    })
})

describe("run 3 : Balls à moitié prix + 2 Nexus-Balls au départ", () => {
    const ctx = { hour: 8, sylvebarbeAwake: false, potionBuysToday: 0, jcEnergyBuysToday: 0, active: true }
    it("shopPrice : −50 % sur les BALL seulement, bourse active ou non ; comportement d'avant inchangé sinon", () => {
        expect(RUN3_BALL_DISCOUNT).toBe(0.5)
        expect(shopPrice(200, "BALL", { ...ctx, run3Balls: true })).toBe(100)
        expect(shopPrice(200, "BALL", { ...ctx, run3Balls: false })).toBe(200)
        expect(shopPrice(200, "HEAL", { ...ctx, run3Balls: true })).toBe(200)
        expect(shopPrice(200, "BALL", { ...ctx, active: false, run3Balls: true })).toBe(100)
        expect(shopPrice(200, "BALL", { ...ctx, active: false })).toBe(200)
        expect(shopPrice(200, "BALL", { ...ctx, hour: 20, run3Balls: true })).toBe(Math.round(200 * 1.1 ** 12 * 0.5)) // cumul avec la bourse
        expect(shopPrice(200, "HEAL", { ...ctx, hour: 20, sylvebarbeAwake: true, run3Balls: true })).toBe(Math.round(200 * 1.1 ** 12 * 1.5))
    })
    it("câblage : contexte boutique, sac de départ, textes du Dieu Spaghetti", () => {
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("run3Balls: effectiveRunWorld() === \"run3\"")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("export const RUN3_START_BALLS = 2")
        expect(ps).toContain("poke_ball: (carried.poke_ball ?? 0) + RUN3_START_BALLS")
        expect(RUN3_TIP_SHOP_LINES.join(" ")).toContain("MOITIÉ PRIX")
        expect(run3RestartOfferLines(63).join(" ")).toContain("2 Nexus-Balls")
    })
})
