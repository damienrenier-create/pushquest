import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createBattle, resolveTurn, type BattleState } from "../battle/engine"
import { createMonInstance } from "../battle/factory"
import { registerCustomSpecies } from "./species"
import { FUSION_BASE_SPECIES } from "./fusionBaseSpecies"
import { ITEMS, ballBonusOf, isGuaranteedBall, SHINY_BALL_ID } from "./items"
import { ORFEVRE_TEAM, ORFEVRE_MAX_BALLS, ORFEVRE_LEVEL, ORFEVRE_SPRITE, buildOrfevreTeam, orfevreWinCount, nextOrfevreWinMarker, orfevreDone, orfevreDayMarker, orfevreVictoryLines } from "./orfevre"

// L'ORFÈVRE — dresseur de shiny du Sanctuaire d'Ukognofy (décisions Sartay du 26/10/2026) + la SHINY BALL.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const hasMsg = (st: BattleState, sub: string) => st.events.some((e) => e.kind === "message" && e.text.includes(sub))
const wildOf = (st: BattleState) => st.enemy.team[st.enemy.activeIndex]
const allIvs15 = (m: { ivs: Record<string, number> }) => Object.values(m.ivs).every((v) => v === 15)

describe("Shiny Ball — l'objet", () => {
    it("Ball hors shop, bonus 6 (un cran au-dessus de l'Hyper +), PAS infaillible", () => {
        const it_ = ITEMS[SHINY_BALL_ID]
        expect(it_.category).toBe("BALL"); expect(it_.price).toBe(0)
        expect(ballBonusOf(SHINY_BALL_ID)).toBe(6)
        expect(ballBonusOf("hyper_ball_plus")).toBe(5)
        expect(isGuaranteedBall(SHINY_BALL_ID)).toBe(false)
        expect(it_.description).toContain("CHROMATIQUE"); expect(it_.description).toContain("Fusio-Ball")
    })
})

describe("Shiny Ball — moteur de capture", () => {
    registerCustomSpecies(FUSION_BASE_SPECIES)
    const player = () => createMonInstance("rochison", 50)
    const guaranteed = (wild: ReturnType<typeof createMonInstance>) => { const s = createBattle([player()], [wild], { isWild: true, seed: 1 }); s.genieCatchGuaranteed = true; return s }

    it("non-fusion capturée → devient CHROMATIQUE (flag + IV parfaits) et le combat est marqué shinyBallCapture", () => {
        const wild = createMonInstance("plumiot", 2); wild.ivs.atk = 3
        const after = resolveTurn(guaranteed(wild), { kind: "ball", itemId: SHINY_BALL_ID })
        expect(after.outcome).toBe("caught")
        expect(wildOf(after).shiny).toBe(true)
        expect(allIvs15(wildOf(after))).toBe(true)
        expect(after.shinyBallCapture).toBe(true)
        expect(hasMsg(after, "CHROMATIQUE")).toBe(true)
    })
    it("une Ball ordinaire ne forge rien ; un shiny DE NAISSANCE pris à la Shiny Ball n'est pas « forgé » (la fête reste due)", () => {
        const a = resolveTurn(guaranteed(createMonInstance("plumiot", 2)), { kind: "ball", itemId: "poke_ball" })
        expect(a.outcome).toBe("caught"); expect(wildOf(a).shiny).toBeFalsy(); expect(a.shinyBallCapture).toBeFalsy()
        const b = resolveTurn(guaranteed(createMonInstance("plumiot", 2, { shiny: true })), { kind: "ball", itemId: SHINY_BALL_ID })
        expect(b.outcome).toBe("caught"); expect(wildOf(b).shiny).toBe(true); expect(b.shinyBallCapture).toBeFalsy()
    })
    it("fait office de FUSIO-BALL : ricoche tant que la fusion est vigoureuse, capture garantie une fois affaiblie → fusion chromatique", () => {
        const full = createMonInstance("mottelave", 15)
        const a1 = resolveTurn(createBattle([player()], [full], { isWild: true, seed: 1 }), { kind: "ball", itemId: SHINY_BALL_ID })
        expect(a1.outcome).not.toBe("caught")
        expect(hasMsg(a1, "vigoureux")).toBe(true)          // le seuil de la Fusio-Ball, nommé « Shiny Ball »
        expect(hasMsg(a1, "Shiny Ball le capturera")).toBe(true)
        expect(hasMsg(a1, "Seule une FUSIO-BALL")).toBe(false) // pas le ricochet des Balls ordinaires
        const weak = createMonInstance("mottelave", 15); weak.currentHp = 1
        const a2 = resolveTurn(createBattle([player()], [weak], { isWild: true, seed: 1 }), { kind: "ball", itemId: SHINY_BALL_ID })
        expect(a2.outcome).toBe("caught")
        expect(wildOf(a2).shiny).toBe(true); expect(a2.shinyBallCapture).toBe(true)
        // NON-RÉGRESSION : une Ball ordinaire ricoche toujours sur une fusion ; la Fusio-Ball reste refusée hors fusion.
        const a3 = resolveTurn(createBattle([player()], [createMonInstance("mottelave", 15)], { isWild: true, seed: 1 }), { kind: "ball", itemId: "poke_ball" })
        expect(hasMsg(a3, "Seule une FUSIO-BALL")).toBe(true)
        const a4 = resolveTurn(createBattle([player()], [createMonInstance("mottoche", 10)], { isWild: true, seed: 1 }), { kind: "ball", itemId: "fusio_ball" })
        expect(hasMsg(a4, "n'agit QUE sur les Daemons fusionnés")).toBe(true)
    })
})

describe("L'Orfèvre — équipe et compteurs", () => {
    it("6 chromatiques niv 100, espèces distinctes, IV parfaits, EV 252/252, Saiyan 60/40", () => {
        const team = buildOrfevreTeam()
        expect(team).toHaveLength(6)
        expect(new Set(team.map((m) => m.speciesId)).size).toBe(6)
        expect(ORFEVRE_TEAM.map((t) => t.speciesId)).toEqual(["ombrapanthe", "jerbiwat", "dracarlin", "druidours", "orcaline", "megalithe"])
        for (const m of team) {
            expect(m.level).toBe(ORFEVRE_LEVEL); expect(m.shiny).toBe(true); expect(allIvs15(m)).toBe(true)
            expect(Object.values(m.ev ?? {}).filter((v) => v === 252)).toHaveLength(2)
            expect(Object.values(m.allocated ?? {}).reduce((a, b) => a + (b ?? 0), 0)).toBe(ORFEVRE_LEVEL)
            expect(m.owned).toBe(false)
        }
    })
    it("marqueurs : 6 victoires récompensées max, cap journalier en date LOCALE", () => {
        const got = new Set<string>()
        const isD = (m: string) => got.has(m)
        expect(orfevreWinCount(isD)).toBe(0); expect(nextOrfevreWinMarker(isD)).toBe("orfevre_win_1"); expect(orfevreDone(isD)).toBe(false)
        for (let i = 1; i <= ORFEVRE_MAX_BALLS; i++) got.add("orfevre_win_" + i)
        expect(orfevreWinCount(isD)).toBe(6); expect(nextOrfevreWinMarker(isD)).toBeNull(); expect(orfevreDone(isD)).toBe(true)
        expect(orfevreDayMarker(new Date(2026, 9, 27, 0, 30))).toBe("orfevre_day_2026-10-27") // 00h30 = déjà le lendemain (soirée suivante)
        expect(orfevreVictoryLines(3).join(" ")).toContain("SHINY BALL (3/6)")
        expect(orfevreVictoryLines(6).join(" ")).toContain("dernière")
    })
    it("câblage : PNJ à la place d'Ukognofy, chambre ouverte après capture, récompense en combat, planche Gen 3 présente", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("list.filter((n) => n.id !== UKOGNOFY_NPC_ID)")
        expect(gs).toContain("|| isTrainerDefeated(UKOGNOFY_CAUGHT_MARKER))) {")
        expect(gs).toContain("pendingOrfevre: true")
        expect(gs).toContain("setDailyMarker(ORFEVRE_DAY_PREFIX, orfevreDayMarker())")
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        expect(bs).toContain("trainerId === ORFEVRE_TRAINER_ID")
        expect(bs).toContain("addItem(SHINY_BALL_ID, 1)")
        expect(bs).toContain("wild.shiny && !b.shinyBallCapture")
        expect(fs.existsSync(path.join(process.cwd(), "public", ORFEVRE_SPRITE))).toBe(true)
        expect(read("src/app/gamebook/yellow/battle/BattleScreen.tsx")).toContain("id === \"shiny_ball\"")
    })
})
