import { describe, it, expect } from "vitest"
import { parseSave, SAVE_VERSION } from "./save"

// NERF ACE — migration v2 : remet le cliquet ACE (acePeakLevel + aceTeamSizePeak) à zéro pour
// les saves antérieures à v2, en CONSERVANT aceWins (progrès vers le Panthéon à la 7e victoire).
describe("migration v2 — reset du cliquet ACE", () => {
    it("save v1 → cliquet remis à zéro, aceWins CONSERVÉ, version bumpée", () => {
        const v1 = { version: 1, acePeakLevel: 55, aceTeamSizePeak: 6, aceWins: 5 }
        const s = parseSave(v1)
        expect(s.acePeakLevel).toBe(0) // recalibrera sur l'équipe actuelle au prochain combat
        expect(s.aceTeamSizePeak).toBe(3)
        expect(s.aceWins).toBe(5) // PRÉSERVÉ
        expect(s.version).toBe(SAVE_VERSION)
    })

    it("save sans version (legacy) → traitée comme < v2 → reset", () => {
        const legacy = { acePeakLevel: 40, aceWins: 2 }
        const s = parseSave(legacy)
        expect(s.acePeakLevel).toBe(0)
        expect(s.aceWins).toBe(2)
    })

    it("save DÉJÀ en v2 → cliquet PRÉSERVÉ (pas de double reset)", () => {
        const v2 = { version: 2, acePeakLevel: 42, aceTeamSizePeak: 5, aceWins: 3 }
        const s = parseSave(v2)
        expect(s.acePeakLevel).toBe(42)
        expect(s.aceTeamSizePeak).toBe(5)
        expect(s.aceWins).toBe(3)
    })
})

// Phase 2 — persistance des Daemons custom : le PARSE doit être 100% défensif (une entrée cassée, ou une
// ancienne save sans le champ, ne doit JAMAIS casser le chargement de la save d'un joueur en prod).
describe("Phase 2 — parse défensif des customDaemons", () => {
    it("ancienne save sans le champ → [] (rétro-compat)", () => {
        expect(parseSave({ version: 2 }).customDaemons).toEqual([])
        expect(parseSave({}).customDaemons).toEqual([])
    })
    it("garde les entrées PLAUSIBLES, filtre les cassées (jamais de crash)", () => {
        const valid = { ownerId: "mools", spec: { name: "Testomon", finalTypes: ["EAU"], finalStats: { hp: 90, atk: 70, def: 85, spe: 100, spc: 90 }, learnset: [] } }
        const s = parseSave({ version: 2, customDaemons: [valid, null, 42, { ownerId: "x" }, { spec: {} }, { ownerId: "y", spec: { name: 5 } }] })
        expect(s.customDaemons).toHaveLength(1)
        expect(s.customDaemons[0].ownerId).toBe("mools")
    })
    it("customDaemons non-tableau → [] (pas de crash)", () => {
        expect(parseSave({ version: 2, customDaemons: "oops" }).customDaemons).toEqual([])
        expect(parseSave({ version: 2, customDaemons: { bad: true } }).customDaemons).toEqual([])
    })
})

// NG+ (2 mondes navigables) — le parse doit rester 100% défensif ET rétro-compatible : une save d'AVANT le NG+
// (sans les champs) se charge en "live" pur, et un monde NG+ imbriqué est borné à 1 niveau (pas de récursion infinie).
describe("NG+ — parse défensif des 2 mondes", () => {
    it("save d'avant NG+ (sans champs) → monde live pur (rétro-compat)", () => {
        const s = parseSave({ version: 2 })
        expect(s.activeWorld).toBe("live")
        expect(s.ngplusWorld).toBeNull()
        expect(s.ngplusOldTeam).toBeNull()
    })
    it("activeWorld inconnu → 'live' (jamais un monde cassé)", () => {
        expect(parseSave({ version: 2, activeWorld: "bogus" }).activeWorld).toBe("live")
        expect(parseSave({ version: 2, activeWorld: 42 }).activeWorld).toBe("live")
        expect(parseSave({ version: 2, activeWorld: "ngplus" }).activeWorld).toBe("ngplus")
    })
    it("ngplusWorld conservé et parsé comme une YellowSave (badges/équipe du NG+)", () => {
        const s = parseSave({
            version: 2, activeWorld: "ngplus", badges: ["feu"],
            ngplusWorld: { version: 2, badges: ["eau", "plante"], reps: 5000 },
        })
        expect(s.badges).toEqual(["feu"]) // champs plats = monde LIVE
        expect(s.ngplusWorld).not.toBeNull()
        expect(s.ngplusWorld!.badges).toEqual(["eau", "plante"])
        expect(s.ngplusWorld!.reps).toBe(5000)
    })
    it("récursion bornée : le sous-monde d'un monde imbriqué est ignoré (profondeur 1)", () => {
        const s = parseSave({
            version: 2, activeWorld: "ngplus",
            ngplusWorld: { version: 2, activeWorld: "ngplus", ngplusWorld: { version: 2, badges: ["x"] } },
        })
        expect(s.ngplusWorld).not.toBeNull()
        expect(s.ngplusWorld!.ngplusWorld).toBeNull() // pas de sous-sous-monde
        expect(s.ngplusWorld!.activeWorld).toBe("live") // un monde imbriqué est toujours "live"
    })
    it("champs one-shot/quotidiens (caveTradeDone/goshHintHeard/orcalineWins/orcalineDate) : persistés + défauts", () => {
        // Défauts pour une vieille save sans ces champs (rétro-compat, pas de crash).
        const d = parseSave({ version: 2 })
        expect(d.caveTradeDone).toBe(false)
        expect(d.goshHintHeard).toBe(false)
        expect(d.orcalineWins).toBe(0)
        expect(d.orcalineDate).toBe("")
        // Valeurs présentes conservées (fini la perte au reload).
        const s = parseSave({ version: 2, caveTradeDone: true, goshHintHeard: true, orcalineWins: 3, orcalineDate: "2026-07-01" })
        expect(s.caveTradeDone).toBe(true)
        expect(s.goshHintHeard).toBe(true)
        expect(s.orcalineWins).toBe(3)
        expect(s.orcalineDate).toBe("2026-07-01")
        // Défensif : types faux → défauts.
        const bad = parseSave({ version: 2, caveTradeDone: "yes", orcalineWins: "3", orcalineDate: 42 })
        expect(bad.caveTradeDone).toBe(false)
        expect(bad.orcalineWins).toBe(0)
        expect(bad.orcalineDate).toBe("")
    })
    it("ngplusWorld non-objet → null ; ngplusOldTeam défensif (garde les entrées valides)", () => {
        expect(parseSave({ version: 2, ngplusWorld: "oops" }).ngplusWorld).toBeNull()
        expect(parseSave({ version: 2, ngplusOldTeam: "oops" }).ngplusOldTeam).toBeNull()
        const s = parseSave({
            version: 2,
            ngplusOldTeam: [
                { speciesId: "gouttiny_s1", level: 40, stats: { hp: 120, atk: 80, def: 90, spe: 95, spc: 110 }, moves: ["Charge"] },
                null, 42, { level: 10 }, // entrées cassées → filtrées
            ],
        })
        expect(s.ngplusOldTeam).toHaveLength(1)
        expect(s.ngplusOldTeam![0].speciesId).toBe("gouttiny_s1")
    })
})

// Stats de partie + flag poker 1re partie : parse 100% défensif (rétro-compat des vieilles saves prod).
describe("stats de partie + pokerFirstGameDone — parse défensif", () => {
    it("save sans stats → tous les compteurs à 0 (rétro-compat)", () => {
        const s = parseSave({ version: 2 })
        expect(s.stats).toEqual({ battles: 0, wins: 0, steps: 0, energySpent: 0, xpTotal: 0, hpDealt: 0, potionsUsed: 0, ballsUsed: 0, teamKos: 0, heals: 0, leagueEnergySpent: 0, run2BestGrade: 0, duelWinsTotal: 0, modeFillsUsed: 0, playerTrades: 0 })
        expect(s.pokerFirstGameDone).toBe(false)
    })
    it("stats valides préservées ; négatif/garbage/décimal → normalisés", () => {
        const s = parseSave({ version: 2, stats: { battles: 12, wins: 7, steps: 3400, energySpent: -5, xpTotal: "x", hpDealt: 999, potionsUsed: 3.7, ballsUsed: 4, teamKos: 1, heals: 2 } })
        expect(s.stats.battles).toBe(12)
        expect(s.stats.wins).toBe(7)
        expect(s.stats.steps).toBe(3400)
        expect(s.stats.energySpent).toBe(0) // négatif → clamp 0
        expect(s.stats.xpTotal).toBe(0)     // non-numérique → 0
        expect(s.stats.potionsUsed).toBe(3) // floor
        expect(s.stats.hpDealt).toBe(999)
    })
    it("pokerFirstGameDone honoré quand présent", () => {
        expect(parseSave({ version: 2, pokerFirstGameDone: true }).pokerFirstGameDone).toBe(true)
        expect(parseSave({ version: 2 }).pokerFirstGameDone).toBe(false)
    })
})

// Cash quotidien vs les boss : parse défensif des tapis persistés (rétro-compat).
describe("cash quotidien — parse défensif (bossStacks / cap / date)", () => {
    it("save sans les champs → vides (0/{}/'')", () => {
        const s = parseSave({ version: 2 })
        expect(s.pokerBossStacks).toEqual({})
        expect(s.pokerCashCap).toBe(0)
        expect(s.pokerCashDate).toBe("")
    })
    it("valeurs valides préservées ; garbage → normalisé", () => {
        const s = parseSave({ version: 2, pokerBossStacks: { Volta: 120, Pyra: 0, X: "nope" }, pokerCashCap: 40, pokerCashDate: "2026-07-06" })
        expect(s.pokerBossStacks.Volta).toBe(120)
        expect(s.pokerBossStacks.Pyra).toBe(0)      // ruiné
        expect(s.pokerBossStacks.X ?? 0).toBe(0)    // valeur non-numérique filtrée
        expect(s.pokerCashCap).toBe(40)
        expect(s.pokerCashDate).toBe("2026-07-06")
        expect(parseSave({ version: 2, pokerCashCap: -5 }).pokerCashCap).toBe(0) // négatif → 0
    })
})
