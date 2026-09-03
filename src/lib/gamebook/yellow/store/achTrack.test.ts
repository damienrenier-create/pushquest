import { describe, it, expect } from "vitest"
import { hydratePlayer, getPlayer, recordCaptureResult, recordBattleLoss, recordTrainerWinNoKo } from "./playerStore"
import { emptyAchTrack } from "../storage/save"

const reset = () => hydratePlayer({ achTrack: emptyAchTrack(), defeatedTrainers: [] })
const dt = () => getPlayer().defeatedTrainers

describe("hauts faits consolation — compteurs de série (marqueurs ach_*)", () => {
    it("ball_miss10 : 10 captures ratées d'affilée ; une réussite réinitialise", () => {
        reset()
        for (let i = 0; i < 9; i++) recordCaptureResult(false)
        expect(dt()).not.toContain("ach_ball_miss10")
        recordCaptureResult(true) // capture → reset de la série
        for (let i = 0; i < 9; i++) recordCaptureResult(false)
        expect(dt()).not.toContain("ach_ball_miss10")
        recordCaptureResult(false) // 10e raté
        expect(dt()).toContain("ach_ball_miss10")
    })

    it("samefoe_loss3 : 3 défaites d'affilée vs le MÊME PNJ (un autre PNJ casse la série)", () => {
        reset()
        recordBattleLoss("y_a", "2026-09-03"); recordBattleLoss("y_b", "2026-09-03"); recordBattleLoss("y_a", "2026-09-03")
        expect(dt()).not.toContain("ach_samefoe_loss3")
        reset()
        recordBattleLoss("y_a", "2026-09-03"); recordBattleLoss("y_a", "2026-09-03"); recordBattleLoss("y_a", "2026-09-03")
        expect(dt()).toContain("ach_samefoe_loss3")
    })

    it("losses10_day : 10 défaites le même jour (changement de jour = reset)", () => {
        reset()
        for (let i = 0; i < 9; i++) recordBattleLoss(`y_${i}`, "2026-09-03")
        expect(dt()).not.toContain("ach_losses10_day")
        for (let i = 0; i < 9; i++) recordBattleLoss(`z_${i}`, "2026-09-04") // nouveau jour → compteur reparti
        expect(dt()).not.toContain("ach_losses10_day")
        recordBattleLoss("z_10", "2026-09-04") // 10e du jour
        expect(dt()).toContain("ach_losses10_day")
    })

    it("noko_win10 : 10 victoires sans KO ; un KO subi réinitialise", () => {
        reset()
        for (let i = 0; i < 9; i++) recordTrainerWinNoKo(0)
        expect(dt()).not.toContain("ach_noko_win10")
        recordTrainerWinNoKo(2) // KO subi → reset
        for (let i = 0; i < 10; i++) recordTrainerWinNoKo(0)
        expect(dt()).toContain("ach_noko_win10")
    })

    it("une défaite réinitialise la série sans-KO", () => {
        reset()
        for (let i = 0; i < 9; i++) recordTrainerWinNoKo(0)
        recordBattleLoss("y_a", "2026-09-03") // défaite → noKoWins remis à 0
        expect(getPlayer().achTrack.noKoWins).toBe(0)
    })
})
