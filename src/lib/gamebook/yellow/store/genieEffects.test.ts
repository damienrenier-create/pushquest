import { describe, it, expect } from "vitest"
import { hydratePlayer, setActiveWorld, getPlayer, applyAcceptedGenieWishEffects, consumeGenieAnnouncements, clearForcedEncounter } from "./playerStore"
import { buildForcedSpawn } from "../data/encounters"

// VŒU DU GÉNIE — effet MACHINE (JSON en base) appliqué AUTOMATIQUEMENT à l'acceptation (plus d'aller-retour créateur
// ni de redéploiement). Idempotent (1 marker save par vœu). Appliqué en LIVE **et NG+** ; seul le run 3 est différé.
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

    it("ANNONCE : un vœu accepté AVEC condition empile le message du génie (une seule fois)", () => {
        setup()
        consumeGenieAnnouncements() // vide toute annonce résiduelle
        const row = { accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 1 }), condition1: "Ton Nouillon a recraché ses 7 pâtes !" }
        applyAcceptedGenieWishEffects(row)
        expect(consumeGenieAnnouncements()).toEqual(["Ton Nouillon a recraché ses 7 pâtes !"]) // informé
        expect(consumeGenieAnnouncements()).toEqual([])                                          // file vidée
        applyAcceptedGenieWishEffects(row)                                                       // 2e appel : déjà marqué
        expect(consumeGenieAnnouncements()).toEqual([])                                          // pas de re-annonce
    })

    it("vœu accepté SANS condition → aucune annonce empilée", () => {
        setup()
        consumeGenieAnnouncements()
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 10 }) })
        expect(consumeGenieAnnouncements()).toEqual([])
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

    it("NG+ (run 2) → applique les vœux ; SEUL run 3 diffère (auto-retry au retour)", () => {
        // NG+ : les vœux s'appliquent désormais (fix : Jacanon, en run 2, doit recevoir ses vœux)
        setup(); setActiveWorld("ngplus")
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 999 }) })).toBe(true)
        expect(getPlayer().reps).toBe(1099) // +999 hors plafond appliqué en NG+
        // run 3 : différé (énergie à source unique) → rien appliqué, re-tenté au retour en live/NG+
        setup(); setActiveWorld("run3")
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "energy", amount: 999 }) })).toBe(false)
        setActiveWorld("live")
    })

    it("JSON invalide → ignoré sans crash", () => {
        setup()
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: "{pas du json" })).toBe(false)
        expect(getPlayer().reps).toBe(100)
    })

    it("type d'effet INCONNU → non appliqué ET non marqué (sera re-tenté après un déploiement qui l'ajoute)", () => {
        setup()
        const row = { accepted1: true, effect1: JSON.stringify({ kind: "type_pas_encore_code", amount: 5 }) }
        expect(applyAcceptedGenieWishEffects(row)).toBe(false)
        expect(getPlayer().defeatedTrainers).not.toContain("genie_fx1")
    })

    it("force_encounter : pose forcedEncounter (JSON) puis clearForcedEncounter le retire", () => {
        setup()
        applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify({ kind: "force_encounter", id: "pyropanthe", level: 100, hard: true }) })
        const raw = getPlayer().forcedEncounter
        expect(raw).toBeTruthy()
        const fe = JSON.parse(raw!)
        expect(fe.speciesId).toBe("pyropanthe")
        expect(fe.level).toBe(100)
        expect(fe.hard).toBe(true)
        clearForcedEncounter()
        expect(getPlayer().forcedEncounter).toBeUndefined()
    })

    it("buildForcedSpawn(hard) = Pyropanthe niv 100 à capture BRUTALE (statut + Ball≥5 + coriace)", () => {
        const mon = buildForcedSpawn("pyropanthe", 100, true) as unknown as { speciesId: string; level: number; captureRequiresStatus?: boolean; captureMinBallBonus?: number; captureMult?: number }
        expect(mon.speciesId).toBe("pyropanthe")
        expect(mon.level).toBe(100)
        expect(mon.captureRequiresStatus).toBe(true)
        expect(mon.captureMinBallBonus).toBe(5)
        expect(mon.captureMult).toBe(0.5)
    })
})
