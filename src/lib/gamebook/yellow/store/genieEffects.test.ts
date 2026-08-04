import { describe, it, expect } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, applyAcceptedGenieWishEffects } from "./playerStore"

// VŒU DU GÉNIE — effet MACHINE (JSON en base) appliqué AUTOMATIQUEMENT à l'acceptation (plus d'aller-retour créateur
// ni de redéploiement). Idempotent (1 marker save par vœu), monde LIVE uniquement.
const setup = () => { hydratePlayer({ reps: 100, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {} }); setActiveWorld("live") }

describe("Vœu du génie — application AUTO des effets", () => {
    it("energy + ball_lock sur un vœu accepté → crédite, arme le verrou, marque appliqué", () => {
        setup()
        const row = { accepted1: true, effect1: JSON.stringify([{ kind: "energy", amount: 1000 }, { kind: "ball_lock", amount: 1000 }]) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        expect(getPlayer().reps).toBe(1100)        // +1000 hors plafond
        expect(getPlayer().repsCap).toBe(6000)     // cap relevé de 1000
        expect(getPlayer().ballLockRemaining).toBe(1000)
        expect(getPlayer().defeatedTrainers).toContain("genie_fx1")
    })

    it("idempotent : un 2e appel ne recrédite pas", () => {
        setup()
        const row = { accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 500 }) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(true)
        const reps1 = getPlayer().reps
        expect(applyAcceptedGenieWishEffects(row)).toBe(false)
        expect(getPlayer().reps).toBe(reps1)
    })

    it("vœu NON accepté (refusé ou en attente) → aucun effet", () => {
        setup()
        expect(applyAcceptedGenieWishEffects({ accepted1: false, effect1: JSON.stringify({ kind: "energy", amount: 999 }) })).toBe(false)
        expect(applyAcceptedGenieWishEffects({ accepted1: null, effect1: JSON.stringify({ kind: "energy", amount: 999 }) })).toBe(false)
        expect(getPlayer().reps).toBe(100)
    })

    it("effet item → ajoute l'objet à l'inventaire", () => {
        setup()
        applyAcceptedGenieWishEffects({ accepted2: true, effect2: JSON.stringify({ kind: "item", id: "poke_ball", qty: 3 }) })
        expect(getPlayer().items["poke_ball"]).toBe(3)
        expect(getPlayer().defeatedTrainers).toContain("genie_fx2")
    })

    it("hors monde LIVE (ng+/run3) → n'applique rien (auto-retry au retour)", () => {
        setup(); setActiveWorld("ngplus")
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 999 }) })).toBe(false)
        setActiveWorld("live")
    })

    it("JSON invalide → ignoré sans crash", () => {
        setup()
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: "{pas du json" })).toBe(false)
        expect(getPlayer().reps).toBe(100)
    })
})
