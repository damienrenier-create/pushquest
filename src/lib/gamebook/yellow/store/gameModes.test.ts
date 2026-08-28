import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, spendReps, bankReps, setGameMode, getGameMode, ensureModeStartGrant, modeFillsRemaining } from "./playerStore"
import { emptyYellowStats } from "../storage/save"

// PARRAINAGE — modes de jeu (énergie). "normal" = vrais reps ; "easy" = 2×3000 ; "debutant" = 6×1000.
beforeEach(() => {
    setActiveWorld("live")
    setGameMode("normal")
    hydratePlayer({ reps: 0, repsCap: 1000, repsBankedTotal: -1, stats: emptyYellowStats() })
})

describe("PARRAINAGE — modes de jeu (énergie)", () => {
    it("setGameMode : valide, sinon retombe sur normal", () => {
        setGameMode("easy"); expect(getGameMode()).toBe("easy")
        setGameMode("debutant"); expect(getGameMode()).toBe("debutant")
        setGameMode("n'importe quoi"); expect(getGameMode()).toBe("normal")
        setGameMode(null); expect(getGameMode()).toBe("normal")
    })

    it("normal : bankReps crédite les vrais reps, aucun remplissage", () => {
        setGameMode("normal")
        bankReps(500, 0, "2026-07-17")
        expect(getPlayer().reps).toBe(500)
        expect(modeFillsRemaining()).toBe(0)
    })

    it("easy : départ 3000, 1 recharge à sec, puis fini (2 remplissages = 6000)", () => {
        setGameMode("easy")
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(3000)   // remplissage 1
        expect(modeFillsRemaining()).toBe(1)  // 1 recharge restante
        expect(spendReps(3000)).toBe(true)    // vide → recharge auto
        expect(getPlayer().reps).toBe(3000)   // rechargé (remplissage 2)
        expect(modeFillsRemaining()).toBe(0)
        expect(spendReps(3000)).toBe(true)    // vide → plus de recharge
        expect(getPlayer().reps).toBe(0)
        expect(spendReps(1)).toBe(false)      // à sec, budget épuisé
    })

    it("easy : recharge AVANT de refuser une action inabordable (pas de blocage à 20⚡)", () => {
        setGameMode("easy")
        ensureModeStartGrant()
        // dépense presque tout, laisse un reliquat < coût suivant
        expect(spendReps(2990)).toBe(true)
        expect(getPlayer().reps).toBe(10)
        expect(spendReps(30)).toBe(true)      // 10 < 30 → recharge d'abord (remplissage 2 = 3000), puis dépense
        expect(getPlayer().reps).toBe(2970)
        expect(modeFillsRemaining()).toBe(0)
    })

    it("easy : bankReps NE crédite PAS (énergie découplée des vrais reps)", () => {
        setGameMode("easy")
        ensureModeStartGrant()
        const before = getPlayer().reps
        bankReps(9999, 0, "2026-07-17")
        expect(getPlayer().reps).toBe(before) // inchangé
    })

    it("debutant : départ 1000 + 5 recharges (6 remplissages = 6000)", () => {
        setGameMode("debutant")
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(1000)
        for (let i = 0; i < 6; i++) expect(spendReps(1000)).toBe(true) // 6 dépenses = 6×1000
        expect(getPlayer().reps).toBe(0)
        expect(modeFillsRemaining()).toBe(0)
        expect(spendReps(1)).toBe(false)      // budget épuisé
    })

    it("ensureModeStartGrant est idempotent (pas de double départ)", () => {
        setGameMode("debutant")
        ensureModeStartGrant()
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(1000)   // toujours 1 remplissage
        expect(modeFillsRemaining()).toBe(5)
    })

    it("modes actifs SEULEMENT en live (run 3 = source d'énergie unique)", () => {
        setActiveWorld("run3")
        setGameMode("debutant")
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(0)      // aucun remplissage hors monde live
    })

    it("fun : setGameMode accepte 'fun'", () => {
        setGameMode("fun"); expect(getGameMode()).toBe("fun")
    })

    it("fun : don de départ = 1000⚡ + 10 Nexus-Ball, une seule fois", () => {
        setGameMode("fun")
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(1000)               // 1000⚡ au départ
        expect(getPlayer().repsCap).toBeGreaterThanOrEqual(1000)
        expect(getPlayer().items?.poke_ball).toBe(10)     // 10 Nexus-Ball
        ensureModeStartGrant()                             // idempotent
        expect(getPlayer().reps).toBe(1000)
        expect(getPlayer().items?.poke_ball).toBe(10)     // pas 20
    })

    it("fun : bankReps NE recrédite PLUS les vrais reps (encodage muscu retiré) — comme easy/debutant", () => {
        setGameMode("fun")
        const before = getPlayer().reps
        bankReps(500, 0, "2026-07-17")
        expect(getPlayer().reps).toBe(before)              // inchangé : l'énergie fun vient des DÉFIS, plus des reps encodés
    })

    it("fun : don de départ SEULEMENT en live", () => {
        setActiveWorld("run3")
        setGameMode("fun")
        ensureModeStartGrant()
        expect(getPlayer().reps).toBe(0)                   // rien hors monde live
        expect(getPlayer().items?.poke_ball ?? 0).toBe(0)
    })
})
