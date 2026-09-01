import { describe, it, expect, beforeEach } from "vitest"
import { getPlayer, hydratePlayer, resetForIntro, creditDailyReps, superPastaPrice, SUPER_PASTA_BASE, SUPER_PASTA_GROWTH, SUPER_PASTA_DAILY_INCREASE } from "../store/playerStore"

// SUPER PASTA — le compteur d'achats (`pastaBoughtToday`) court sur tout le RUN : il n'est PLUS remis à zéro au
// passage d'un jour (creditDailyReps), seulement au démarrage d'un run (resetForIntro / startNgPlusWorld /
// startRun3World). L'escalade ×1.5 devient donc définitive dans un run → la pâte reste un luxe rare.
// Le bonus journalier (+3 sur le prix plancher), lui, continue de monter chaque jour.
describe("Super Pasta — compteur par RUN (plus par jour)", () => {
    beforeEach(() => { resetForIntro() })

    it("un nouveau jour ne remet PAS le compteur d'achats à zéro", () => {
        hydratePlayer({ creditedThrough: "2026-09-01", pastaBoughtToday: 3 })
        creditDailyReps("2026-09-02")                       // lendemain
        expect(getPlayer().pastaBoughtToday).toBe(3)        // ← l'escalade survit à la nuit
    })

    it("le bonus journalier continue de monter (+3/jour, sauf le tout premier jour)", () => {
        creditDailyReps("2026-09-01")                       // creditedThrough vide → firstEver, pas d'incrément
        expect(getPlayer().pastaDayBonus).toBe(0)
        creditDailyReps("2026-09-02")
        creditDailyReps("2026-09-03")
        expect(getPlayer().pastaDayBonus).toBe(2 * SUPER_PASTA_DAILY_INCREASE)
    })

    it("le prix garde l'escalade d'un jour sur l'autre", () => {
        hydratePlayer({ creditedThrough: "2026-09-01", pastaBoughtToday: 2 })
        creditDailyReps("2026-09-02")                       // +3 de bonus plancher, compteur intact
        expect(superPastaPrice()).toBe(Math.round((SUPER_PASTA_BASE + SUPER_PASTA_DAILY_INCREASE) * SUPER_PASTA_GROWTH ** 2))
    })

    it("un nouveau run repart à zéro", () => {
        hydratePlayer({ creditedThrough: "2026-09-01", pastaBoughtToday: 6 })
        resetForIntro()                                     // run neuf
        expect(getPlayer().pastaBoughtToday).toBe(0)
        expect(superPastaPrice()).toBe(SUPER_PASTA_BASE)
    })
})
