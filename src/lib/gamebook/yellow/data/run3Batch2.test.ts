import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { run3ExclusiveRows, run3ExclusiveSignLines, RUN3_EXCLUSIVE_HINTS } from "./run3Exclusives"
import { runObtainableSpecies, captureGuide } from "./encounters"
import { shopPrice, RUN3_BALL_DISCOUNT } from "./shopPricing"
import { RUN3_TIP_SHOP_LINES, run3RestartOfferLines } from "./run3Tips"
import { getSpecies } from "./species"

// Décisions Sartay du 26/10/2026 (2e lot run 3).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("Marmoterre : plus jamais sauvage — cadeau du Dénicheur en run 3 uniquement", () => {
    it("absente des runs 1 et 2, obtenable en run 3 (échange) ; plus aucune zone sauvage ; lignée hors dex run 1", () => {
        expect(runObtainableSpecies(1, false).has("marmoterre")).toBe(false)
        expect(runObtainableSpecies(2, false).has("marmoterre")).toBe(false)
        expect(runObtainableSpecies(3, false).has("marmoterre")).toBe(true)
        for (const run of [1, 2, 3]) expect(captureGuide("marmoterre", run, true, false, true, false).where).toEqual([])
        for (const id of ["marmoterre", "iorours", "yetiroche"]) expect(getSpecies(id)!.runThreeOnly, id).toBe(true)
        expect(read("src/lib/gamebook/yellow/data/encounters.ts").match(/speciesId: "marmoterre"/g)).toBeNull()
    })
})

describe("inédits du run 3 — panneaux et carrousel d'arène", () => {
    it("lignées calculées depuis les données ; chaque lignée a son indice « où/comment »", () => {
        const rows = run3ExclusiveRows()
        const keys = rows.map((r) => r.key)
        for (const k of ["elefer", "cornaive", "coccipoing", "otama", "gekosmic", "magnetor", "onirail", "flamarokto", "marmoterre"]) expect(keys, k).toContain(k)
        for (const r of rows) expect(RUN3_EXCLUSIVE_HINTS[r.key], `indice manquant pour ${r.key}`).toBeDefined()
        expect(rows.find((r) => r.key === "marmoterre")!.names).toBe("Marmoterre → Iorours → Yétiroche")
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
