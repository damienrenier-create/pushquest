import { describe, it, expect } from "vitest"
import {
    hydratePlayer, setActiveWorld, getPlayer, applyExternalEffects, isCasinoRestricted, casinoBetAllowed,
    getShinyFrenzy, recordShinyFrenzyCapture, CASINO_RESTRICTED_MARKER, CASINO_UNCAPPED_MARKER, getShopSurtax, surtaxShopPrice,
} from "./playerStore"
import { shinyFrenzyActive, shinyFrenzyChance } from "../data/shinyFrenzy"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🧞 EFFETS EXTERNES — le canal GÉNÉRIQUE (FrontierProfile.pendingEffects)
//
// Jacanon avait épuisé ses trois vœux : impossible de lui accorder son cadeau d'anniversaire par la lampe. D'où ce
// canal : le créateur dépose un tableau de GenieEffect, le client l'applique au chargement puis l'acquitte.
// Ce qui compte : (1) un effet INCONNU laisse le lot NON acquitté (retenté après déploiement) ; (2) les deux
// nouveaux effets font exactement ce que Sartay a demandé — casino sans plafond, 50 % de shiny jusqu'à 3 captures.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const setup = (markers: string[] = []) => { hydratePlayer({ reps: 100, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: markers, items: {}, geniePaid: [] }); setActiveWorld("live") }

describe("acquittement : seulement si TOUT est reconnu", () => {
    it("un lot entièrement connu → true", () => {
        setup([CASINO_RESTRICTED_MARKER])
        expect(applyExternalEffects(JSON.stringify([{ kind: "casino_uncap" }]))).toBe(true)
    })

    it("⚠️ un effet inconnu dans le lot → false (le serveur ne l'efface pas, il sera retenté après déploiement)", () => {
        setup()
        expect(applyExternalEffects(JSON.stringify([{ kind: "energy", amount: 1 }, { kind: "effet_du_futur" }]))).toBe(false)
    })

    it("JSON invalide ou vide → false, et rien n'explose", () => {
        setup()
        expect(applyExternalEffects("{pas du json")).toBe(false)
        expect(applyExternalEffects("[]")).toBe(false)
    })

    it("un objet seul (pas un tableau) est accepté", () => {
        setup()
        expect(applyExternalEffects(JSON.stringify({ kind: "energy", amount: 50 }))).toBe(true)
        expect(getPlayer().reps).toBe(150)
    })
})

describe("casino_uncap — la malédiction du casino est levée", () => {
    it("⚠️ avant : plafonné ; après : plus aucune limite", () => {
        setup([CASINO_RESTRICTED_MARKER])
        expect(isCasinoRestricted()).toBe(true)
        expect(casinoBetAllowed(5000).ok).toBe(false)
        expect(applyExternalEffects(JSON.stringify([{ kind: "casino_uncap" }]))).toBe(true)
        expect(isCasinoRestricted()).toBe(false)
        expect(casinoBetAllowed(5000).ok).toBe(true)
        expect(getPlayer().defeatedTrainers).not.toContain(CASINO_RESTRICTED_MARKER)
    })

    it("idempotent : réappliqué sur un joueur déjà libre, il reste libre (la levée est notée, pour les fusions de fin de run)", () => {
        setup(["autre_marqueur"])
        expect(applyExternalEffects(JSON.stringify([{ kind: "casino_uncap" }]))).toBe(true)
        expect(getPlayer().defeatedTrainers).toEqual(["autre_marqueur", CASINO_UNCAPPED_MARKER])
    })
})

describe("shiny_frenzy — 50 % de shiny, jusqu'à 3 captures", () => {
    it("arme une fenêtre de 24 h et 3 captures ; le taux de pop passe à 50 %", () => {
        setup()
        const t0 = Date.now()
        expect(applyExternalEffects(JSON.stringify([{ kind: "shiny_frenzy", hours: 24, captures: 3 }]))).toBe(true)
        const st = getShinyFrenzy()
        expect(st?.left).toBe(3)
        expect(st!.until - t0).toBeGreaterThanOrEqual(24 * 3_600_000 - 50)
        expect(shinyFrenzyActive(st, t0 + 1000)).toBe(true)
        expect(shinyFrenzyChance(st, t0 + 1000)).toBe(0.5)
    })

    it("⚠️ trois captures ferment la fête, et l'état disparaît de la save", () => {
        setup()
        applyExternalEffects(JSON.stringify([{ kind: "shiny_frenzy" }]))
        expect(recordShinyFrenzyCapture()).toEqual({ left: 2, done: false })
        expect(recordShinyFrenzyCapture()).toEqual({ left: 1, done: false })
        expect(recordShinyFrenzyCapture()).toEqual({ left: 0, done: true })
        expect(getShinyFrenzy()).toBeUndefined()
        expect(recordShinyFrenzyCapture(), "plus de fête → plus rien à décompter").toBeNull()
    })

    it("sans frénésie active, une capture de shiny ne décompte rien", () => {
        setup()
        expect(recordShinyFrenzyCapture()).toBeNull()
    })
})

describe("🧾 shop_surtax — le contrôle fiscal de Jacanon (20/10/2026)", () => {
    it("applique une surtaxe ×2 pendant 7 jours sur la boutique, et le lot est acquitté", () => {
        setup()
        const before = Date.now()
        expect(applyExternalEffects(JSON.stringify([{ kind: "shop_surtax", amount: 2, hours: 168 }]))).toBe(true)
        const s = getShopSurtax()
        expect(s?.mult).toBe(2)
        expect((s?.until ?? 0) - before).toBeGreaterThanOrEqual(168 * 3600_000 - 1000)
        expect(surtaxShopPrice(1000)).toBe(2000)
        expect(surtaxShopPrice(1000, (s?.until ?? 0) + 1)).toBe(1000) // expirée → prix normal
    })
})
