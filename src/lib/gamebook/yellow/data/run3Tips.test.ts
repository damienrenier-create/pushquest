import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { RUN3_TIP_CAPTURE_LINES, RUN3_TIP_SHOP_LINES, RUN3_TIP_CAPTURE_MARKER, RUN3_TIP_SHOP_MARKER, run3RestartOfferAllowed, run3RestartOfferLines, RUN3_RESTART_MAX_ENERGY } from "./run3Tips"
import { RUN3_START_ENERGY } from "../store/saveManager"

// RUN 3 — rappels des règles (1re capture, 1re boutique) + offre de nouveau départ (Kingme, 26/10/2026).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const FORBIDDEN = /pompes|quota|\breps\b|sueur/i

describe("run 3 — rappels du Dieu Spaghetti", () => {
    it("les deux rappels disent la vraie règle (recharge à 500, fin à 0) sans mot interdit en fun", () => {
        for (const lines of [RUN3_TIP_CAPTURE_LINES, RUN3_TIP_SHOP_LINES]) {
            expect(lines.join(" ")).toContain(String(RUN3_START_ENERGY))
            expect(lines.join(" ").toLowerCase()).toMatch(/zéro|0,/)
            for (const l of lines) expect(l).not.toMatch(FORBIDDEN)
        }
        expect(RUN3_TIP_CAPTURE_MARKER).not.toBe(RUN3_TIP_SHOP_MARKER)
    })
    it("offre de nouveau départ : Kingme seulement, run 3 actif, aucun badge, réserve sous le seuil", () => {
        expect(run3RestartOfferAllowed("Kingme", "run3", [], 63)).toBe(true)
        expect(run3RestartOfferAllowed("kingme ", "run3", [], RUN3_RESTART_MAX_ENERGY)).toBe(true)
        expect(run3RestartOfferAllowed("Kingme", "run3", ["plante"], 63)).toBe(false)   // concours entamé : un score existe
        expect(run3RestartOfferAllowed("Kingme", "run3", [], 400)).toBe(false)          // encore jouable
        expect(run3RestartOfferAllowed("Kingme", "ngplus", [], 63)).toBe(false)         // pas en run 3
        expect(run3RestartOfferAllowed("Mools", "run3", [], 63)).toBe(false)            // pas dans la liste
        expect(run3RestartOfferLines(63).join(" ")).toContain("63 ⚡")
        for (const l of run3RestartOfferLines(63)) expect(l).not.toMatch(FORBIDDEN)
    })
    it("câblage : capture (battleStore), boutique + offre (client), nouveau départ (saveManager)", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("b.isWild && b.outcome === \"caught\" && !isTrainerDefeated(RUN3_TIP_CAPTURE_MARKER)")
        const c = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(c).toContain("!getPlayer().defeatedTrainers.includes(RUN3_TIP_SHOP_MARKER)")
        expect(c).toContain("run3RestartOfferAllowed(nickname, getActiveWorld(), p.badges, p.reps)")
        expect(c).toContain("const ok = restart ? await restartRun3(starter) : await startRun3(starter)")
        const sm = read("src/lib/gamebook/yellow/store/saveManager.ts")
        expect(sm).toContain("export async function restartRun3(starter: MonInstance): Promise<boolean>")
        expect(sm).toContain("if (getPlayer().badges.length > 0) return false")
    })
})
