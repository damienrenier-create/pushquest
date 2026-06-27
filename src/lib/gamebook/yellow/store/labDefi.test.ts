import { describe, it, expect, beforeEach } from "vitest"
import {
    hydratePlayer, getPlayer, bankReps, setTomorrowEnergyMult,
    startLabDefi, clearLabDefi, addCtDamage, ctDefiProgress, casinoSpin, grantTonytony, recordCtEarned,
    casinoTicketSpin, casinoTicketAvailable, consumeDailyTicket, makeTonytonyShiny,
} from "./playerStore"
import { createMonInstance } from "../battle/factory"
import { emptyLabDefi, casinoWinningCase, CASINO_WIN_MULT, CASINO_MIN_BET, CASINO_BANKRUPT_STREAK, TONYTONY_SPECIES, TONYTONY_SHINY_TARGET, ctEarnedCountByType } from "../data/labDefis"

beforeEach(() => {
    // État isolé : équipe vide, reps connus, défis vierges.
    hydratePlayer({ reps: 1000, repsCap: 1000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
})

describe("défi 3 — bankReps × multiplicateur le jour cible", () => {
    it("triple le delta le jour cible, ×1 les autres jours, en respectant le plafond", () => {
        hydratePlayer({ reps: 0, repsCap: 10000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        setTomorrowEnergyMult(3, "2026-06-27")
        // Jour NON cible : ×1
        bankReps(100, 0, "2026-06-26")
        expect(getPlayer().reps).toBe(100)
        // Jour cible : le nouveau delta (50) est ×3
        bankReps(150, 0, "2026-06-27")
        expect(getPlayer().reps).toBe(100 + 50 * 3) // 250
    })

    it("le ×3 reste plafonné par repsCap (choix « respecter le plafond »)", () => {
        hydratePlayer({ reps: 0, repsCap: 200, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        setTomorrowEnergyMult(3, "2026-06-27")
        bankReps(100, 0, "2026-06-27") // 100×3 = 300 mais cap 200
        expect(getPlayer().reps).toBe(200)
    })
})

describe("défis en parallèle — 1 physique + 1 CT indépendants", () => {
    it("un défi physique et un défi CT coexistent ; chacun se clôt sans toucher l'autre", () => {
        hydratePlayer({ reps: 1000, repsCap: 1000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        startLabDefi({ kind: "pushup1h", startedAt: "t", startSnapshot: 0 })
        startLabDefi({ kind: "ct", startedAt: "t", ctType: "FEU", ctThreshold: 900, ctTargetCtId: "ct08", ctMoveId: "lance_flammes" })
        expect(getPlayer().labDefi.activePhys?.kind).toBe("pushup1h")
        expect(getPlayer().labDefi.activeCt?.kind).toBe("ct")
        // le CT progresse, le physique reste intact
        addCtDamage("FEU", 500)
        expect(ctDefiProgress()).toBe(500)
        expect(getPlayer().labDefi.activePhys?.kind).toBe("pushup1h")
        // clore le CT ne touche pas le physique (et inversement)
        clearLabDefi("ct")
        expect(getPlayer().labDefi.activeCt).toBeNull()
        expect(getPlayer().labDefi.activePhys?.kind).toBe("pushup1h")
        expect(ctDefiProgress()).toBe(0) // compteur de dégâts vidé avec le slot CT
        clearLabDefi("phys")
        expect(getPlayer().labDefi.activePhys).toBeNull()
    })

    it("relancer un défi physique ne réinitialise PAS la progression du défi CT", () => {
        hydratePlayer({ reps: 1000, repsCap: 1000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        startLabDefi({ kind: "ct", startedAt: "t", ctType: "EAU", ctThreshold: 900, ctTargetCtId: "ct09", ctMoveId: "surf" })
        addCtDamage("EAU", 400)
        startLabDefi({ kind: "quota2x", startedAt: "t" }) // démarre un physique
        expect(ctDefiProgress()).toBe(400) // le compteur CT survit
    })
})

describe("défi CT — accumulation des dégâts du type ciblé", () => {
    it("n'accumule que pour le type du défi actif", () => {
        startLabDefi({ kind: "ct", startedAt: "t", ctType: "FEU", ctThreshold: 9500, ctTargetCtId: "ct08", ctMoveId: "lance_flammes" })
        addCtDamage("FEU", 300)
        addCtDamage("EAU", 999) // ignoré (mauvais type)
        addCtDamage("FEU", 200)
        expect(ctDefiProgress()).toBe(500)
    })

    it("recordCtEarned alimente le compteur par type (plafond + ×2)", () => {
        recordCtEarned("ct08") // FEU
        recordCtEarned("ct09") // FEU
        expect(ctEarnedCountByType(getPlayer().labDefi.ctEarned, "FEU")).toBe(2)
        expect(ctEarnedCountByType(getPlayer().labDefi.ctEarned, "EAU")).toBe(0)
    })
})

describe("défi Surprise — casino pattern + Tonytony", () => {
    it("gagne sur la bonne case et accumule le cumul BRUT", () => {
        hydratePlayer({ reps: 1000, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoFirstBetDone: true } }) // hors rig 1er pari
        const winCase = casinoWinningCase(0) // motif[0]
        const r = casinoSpin([{ case: winCase, amount: 50 }], 0)
        expect(r.ok).toBe(true)
        expect(r.totalWin).toBe(50 * CASINO_WIN_MULT)
        expect(r.totalWon).toBe(50 * CASINO_WIN_MULT)
        // reps : 1000 - 50 (mise) + 500 (gain) plafonné à 1000
        expect(getPlayer().reps).toBe(1000)
    })

    it("perd quand la case ne tombe pas et ne crédite rien", () => {
        hydratePlayer({ reps: 1000, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoFirstBetDone: true } }) // hors rig 1er pari
        const winCase = casinoWinningCase(0)
        const wrong = (winCase + 1) % 11
        const r = casinoSpin([{ case: wrong, amount: 30 }], 0)
        expect(r.ok).toBe(true)
        expect(r.totalWin).toBe(0)
        expect(getPlayer().reps).toBe(1000 - 30)
        expect(getPlayer().labDefi.casinoWinStreak).toBe(0)
    })

    it("banqueroute après N victoires consécutives", () => {
        hydratePlayer({ reps: 100000, repsCap: 100000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        let last
        for (let i = 0; i < CASINO_BANKRUPT_STREAK; i++) {
            const wc = casinoWinningCase(getPlayer().labDefi.casinoSpinIndex)
            last = casinoSpin([{ case: wc, amount: 10 }], 0)
        }
        expect(last?.bankrupt).toBe(true)
        // Banqueroute → spin refusé tant que le cooldown court
        const blocked = casinoSpin([{ case: 0, amount: 10 }], 0)
        expect(blocked.ok).toBe(false)
    })

    it("grantTonytony remet le Daemon une seule fois une fois la cible atteinte", () => {
        hydratePlayer({ reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: 1000 } })
        const where = grantTonytony()
        expect(where).toBe("team")
        expect(getPlayer().team.some((m) => m.speciesId === TONYTONY_SPECIES)).toBe(true)
        expect(getPlayer().labDefi.tonytonyClaimed).toBe(true)
        // 2e appel : refusé (one-shot)
        expect(grantTonytony()).toBeNull()
        expect(getPlayer().team.filter((m) => m.speciesId === TONYTONY_SPECIES).length).toBe(1)
    })

    it("capstone 5000 : le Tonytony existant devient SHINY (one-shot, < 5000 refusé)", () => {
        const tony = createMonInstance(TONYTONY_SPECIES, 15, { owned: true })
        hydratePlayer({ reps: 0, repsCap: 1000, repsBankedTotal: 0, team: [tony], labDefi: { ...emptyLabDefi(), casinoTotalWon: 4999, tonytonyClaimed: true } })
        expect(makeTonytonyShiny()).toBeNull() // < 5000
        hydratePlayer({ reps: 0, repsCap: 1000, repsBankedTotal: 0, team: [tony], labDefi: { ...emptyLabDefi(), casinoTotalWon: TONYTONY_SHINY_TARGET, tonytonyClaimed: true } })
        expect(getPlayer().team[0].shiny).toBeFalsy()
        expect(makeTonytonyShiny()).toBe("team")
        expect(getPlayer().team[0].shiny).toBe(true)
        expect(getPlayer().labDefi.tonytonyShiny).toBe(true)
        expect(makeTonytonyShiny()).toBeNull() // one-shot
    })

    it("capstone 5000 : redonne un Tonytony SHINY si le joueur n'en a plus", () => {
        hydratePlayer({ reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: TONYTONY_SHINY_TARGET, tonytonyClaimed: true } })
        expect(makeTonytonyShiny()).toBe("new")
        const tony = getPlayer().team.find((m) => m.speciesId === TONYTONY_SPECIES) ?? getPlayer().pc.find((m) => m.speciesId === TONYTONY_SPECIES)
        expect(tony?.shiny).toBe(true)
    })
})

describe("ticket roulette quotidien + dés pipés (1er pari gagné)", () => {
    beforeEach(() => { hydratePlayer({ reps: 1000, repsCap: 100000, repsBankedTotal: 0, labDefi: emptyLabDefi() }) })

    it("casino labo : le TOUT premier pari est gagné d'office (même sur la mauvaise case)", () => {
        const winCase = casinoWinningCase(0)
        const wrong = (winCase + 1) % 11
        const r = casinoSpin([{ case: wrong, amount: 10 }], 0)
        expect(r.totalWin).toBeGreaterThan(0)        // gagné malgré la mauvaise case (rig)
        expect(getPlayer().labDefi.casinoFirstBetDone).toBe(true)
    })

    it("ticket : disponible 1×/jour, consommable", () => {
        expect(casinoTicketAvailable("2026-06-27")).toBe(true)
        consumeDailyTicket("2026-06-27")
        expect(casinoTicketAvailable("2026-06-27")).toBe(false)
        expect(casinoTicketAvailable("2026-06-28")).toBe(true) // nouveau jour
    })

    it("ticket : 1er spin gagné d'office (+100), HORS Tonytony, consomme le ticket", () => {
        hydratePlayer({ reps: 0, repsCap: 100000, repsBankedTotal: 0, labDefi: emptyLabDefi() })
        const r = casinoTicketSpin(3, "2026-06-27")
        expect(r.won).toBe(true)
        expect(r.winningCase).toBe(3)
        expect(r.winAmount).toBe(CASINO_MIN_BET * CASINO_WIN_MULT)   // +100
        expect(getPlayer().reps).toBe(CASINO_MIN_BET * CASINO_WIN_MULT) // crédité au compteur
        expect(getPlayer().labDefi.casinoTotalWon).toBe(0)           // NE compte PAS pour Tonytony
        expect(getPlayer().labDefi.casinoWinStreak).toBe(0)          // jamais de série/banqueroute
        expect(casinoTicketAvailable("2026-06-27")).toBe(false)      // ticket consommé
    })
})
