import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { flamaroktoGuaranteed, FLAMAROKTO_GUIDE_LINE, RUN3_LEGEND_HINT_DENOM_MULT } from "./run3Legend"
import { captureGuide } from "./encounters"
import { HH_KID_NOON_LINES } from "./hhKid"
import { getItem } from "./items"

// FLAMAROKTO, légendaire du run 3 (décisions Sartay du 26/10/2026).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("Flamarokto : capture garantie à l'Hyper Nexus-Ball sous 60 % de PV ou sous statut", () => {
    const hyper = getItem("hyper_ball")!.ballBonus!, poke = getItem("poke_ball")!.ballBonus!
    it("règle pure", () => {
        expect(flamaroktoGuaranteed("flamarokto", hyper, 0.59, "NONE")).toBe(true)
        expect(flamaroktoGuaranteed("flamarokto", hyper, 0.95, "PARALYSIS")).toBe(true)
        expect(flamaroktoGuaranteed("flamarokto", hyper, 0.61, "NONE")).toBe(false) // encore trop frais
        expect(flamaroktoGuaranteed("flamarokto", poke, 0.1, "SLEEP")).toBe(false)  // Ball trop faible
        expect(flamaroktoGuaranteed("goshendofy", hyper, 0.1, "SLEEP")).toBe(false) // les autres légendaires : règle inchangée
    })
    it("le gamin de la plaine le dit à midi, et annonce les pops ×5 ; le guide du Daemomaniaque aussi", () => {
        const all = HH_KID_NOON_LINES.join(" ")
        expect(all).toContain("60 %"); expect(all).toContain("HYPER"); expect(all).toContain("CINQ")
        expect(RUN3_LEGEND_HINT_DENOM_MULT).toBe(0.2)
        const g = captureGuide("flamarokto", 3, true, false, false, false)
        expect(g.how).toContain(FLAMAROKTO_GUIDE_LINE)
        expect(g.how.some((h) => /Capture IMPOSSIBLE sans statut|Exige une Ball puissante/.test(h))).toBe(false)
    })
    it("câblage moteur : garantie + shunt des verrous de Ball/PV ; ×5 en run 3 dans les rencontres", () => {
        const eng = read("src/lib/gamebook/yellow/battle/engine.ts")
        expect(eng).toContain("|| flamaroktoGuaranteed(wild.speciesId, ballBonusOf(itemId), wild.currentHp / Math.max(1, maxHpOf(wild)), wild.status)")
        expect(eng).toContain("!isGuaranteedBall(itemId) && !legGuaranteed && ballBonusOf(itemId) < wild.captureMinBallBonus")
        expect(read("src/lib/gamebook/yellow/data/encounters.ts")).toContain("ctx.goshBoost ? (ctx.run3 ? RUN3_LEGEND_HINT_DENOM_MULT : 0.5) : 1")
    })
})

describe("vœu « captures garanties » (Kingme, 26/10/2026)", () => {
    it("câblage : effet classé, charges par marqueur, drapeau d'un tour, report au nouveau départ", () => {
        expect(read("src/lib/gamebook/yellow/data/genieLamp.ts")).toContain("\"guaranteed_captures\"")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("case \"guaranteed_captures\": setGenieCatchCharges(Math.max(0, amt)); return true")
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("resolveTurn(genieCatch ? { ...battle, genieCatchGuaranteed: true } : battle, action)")
        expect(bs).toContain("if (next.outcome === \"caught\") consumeGenieCatchCharge()")
        const eng = read("src/lib/gamebook/yellow/battle/engine.ts")
        expect(eng).toContain("|| state.genieCatchGuaranteed === true")
        expect(eng).toContain("wild.currentHp >= maxHpOf(wild) && !isGuaranteedBall(itemId) && !legGuaranteed")
        expect(read("src/lib/gamebook/yellow/store/saveManager.ts")).toContain("if (catchLeft > 0) setGenieCatchCharges(catchLeft)")
    })
})

describe("run 3 — +100 ⚡ après l'arène Feu, ACE 3 fois par jour", () => {
    it("câblage", () => {
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("if (badgeAwarded === \"feu\") logEnergyIncome(\"🏅 Badge Feu run 3\", grantReps(100, true))")
        const ps = read("src/lib/gamebook/yellow/store/playerStore.ts")
        expect(ps).toContain("if (runMode() === \"run3\") return aceRun3WinsToday() < ACE_RUN3_DAILY_CAP")
        expect(ps).toContain("export const ACE_RUN3_DAILY_CAP = 3")
    })
})
