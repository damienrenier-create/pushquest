import { describe, it, expect, vi, afterEach } from "vitest"
import { hydratePlayer, getPlayer, applyAcceptedGenieWishEffects, isAbundanceCurseActive, abundanceFreeItemAvailableToday, takeFreeShopItem, resolveAbundanceCurse, ABUNDANCE_CURSE_MARKER } from "./playerStore"
import { applyServerSave, snapshot } from "./saveManager"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import { createMonInstance } from "../battle/factory"

// VŒU « ABONDANCE MAUDITE » (Jacanon) : 1 objet gratuit/jour + attaques ×10 pendant 1 semaine, puis N Daemons du PC
// deviennent désobéissants (N = objets pris, max 7) — NON DÉTRUITS (flag réversible). Save-safe, gaté par marqueur.
const arm = () => applyAcceptedGenieWishEffects({ accepted3: true, effect3: JSON.stringify([{ kind: "abundance_curse" }]) })
const reset = (pc = 0) => hydratePlayer({ reps: 0, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {}, pc: Array.from({ length: pc }, () => createMonInstance("razmaree", 10, { owned: true })) })

afterEach(() => vi.useRealTimers())

describe("Vœu abondance maudite (Jacanon)", () => {
    it("s'arme à l'acceptation : marqueur posé + malédiction active", () => {
        reset()
        expect(arm()).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain(ABUNDANCE_CURSE_MARKER)
        expect(isAbundanceCurseActive()).toBe(true)
    })

    it("objet gratuit : 1/jour (2e prise le même jour refusée), item ajouté, compteur incrémenté", () => {
        reset()
        arm()
        expect(abundanceFreeItemAvailableToday()).toBe(true)
        expect(takeFreeShopItem("potion")).toBe(true)
        expect(getPlayer().items["potion"]).toBe(1)
        expect(getPlayer().curseFreeItemsTaken).toBe(1)
        expect(abundanceFreeItemAvailableToday()).toBe(false)
        expect(takeFreeShopItem("potion")).toBe(false) // déjà pris aujourd'hui
        expect(getPlayer().items["potion"]).toBe(1)
    })

    it("expire après 1 semaine → N Daemons du PC désobéissants (NON détruits), marqueur retiré, idempotent", () => {
        vi.useFakeTimers(); vi.setSystemTime(new Date("2026-01-01T10:00:00Z"))
        reset(4) // 4 Daemons au PC
        arm()
        expect(takeFreeShopItem("potion")).toBe(true)          // jour 1
        vi.setSystemTime(new Date("2026-01-02T10:00:00Z"))
        expect(takeFreeShopItem("super_potion")).toBe(true)    // jour 2 → 2 objets pris
        expect(getPlayer().curseFreeItemsTaken).toBe(2)
        expect(resolveAbundanceCurse()).toBe(0)                // pas encore expiré
        vi.setSystemTime(new Date("2026-01-10T10:00:00Z"))     // +8 jours → expiré
        expect(isAbundanceCurseActive()).toBe(false)
        expect(resolveAbundanceCurse()).toBe(2)                // 2 objets pris → 2 Daemons touchés
        const pc = getPlayer().pc
        expect(pc.length).toBe(4)                              // AUCUN détruit (règle d'or)
        expect(pc.filter((m) => m.disobedient).length).toBe(2)
        expect(getPlayer().defeatedTrainers).not.toContain(ABUNDANCE_CURSE_MARKER) // désarmé
        expect(resolveAbundanceCurse()).toBe(0)                // idempotent (déjà résolu)
    })

    it("PERSISTANCE : survit à un round-trip save (snapshot→JSON→parseSave→applyServerSave) puis expire toujours", () => {
        vi.useFakeTimers(); vi.setSystemTime(new Date("2026-04-01T10:00:00Z"))
        // Monde LIVE réaliste avec 4 Daemons au PC (pas de spread — on passe par la vraie couche save).
        const world: YellowSave = { ...emptySave(), activeWorld: "live", reps: 200, repsCap: 5000, pc: Array.from({ length: 4 }, () => createMonInstance("razmaree", 10, { owned: true })) }
        applyServerSave(world)
        expect(arm()).toBe(true)                               // arme dans le monde actif
        expect(takeFreeShopItem("potion")).toBe(true)          // 1 objet gratuit → curseFreeItemsTaken=1
        expect(getPlayer().curseAbundanceStart).toBeGreaterThan(0)
        // ROUND-TRIP complet : ce que la DB fait réellement (sérialise → relit → réhydrate).
        const reloaded = parseSave(JSON.parse(JSON.stringify(snapshot())))
        applyServerSave(reloaded)
        // La malédiction DOIT survivre au rechargement (c'était le bug : champs non sérialisés → auto-annulation).
        expect(isAbundanceCurseActive()).toBe(true)
        expect(getPlayer().curseAbundanceStart).toBeGreaterThan(0)
        expect(getPlayer().curseFreeItemsTaken).toBe(1)
        expect(getPlayer().defeatedTrainers).toContain(ABUNDANCE_CURSE_MARKER)
        // +8 jours → expire pour de vrai et inflige bien 1 désobéissant (le « prix » se déclenche).
        vi.setSystemTime(new Date("2026-04-10T10:00:00Z"))
        expect(resolveAbundanceCurse()).toBe(1)
        expect(getPlayer().pc.filter((m) => m.disobedient).length).toBe(1)
        expect(getPlayer().pc.length).toBe(4) // aucun détruit
    })

    it("DÉFENSIF : marqueur présent mais date de début manquante (persistance ratée) → NE désarme PAS", () => {
        // Simule l'ancien bug résiduel : le marqueur a survécu mais curseAbundanceStart est absent.
        // On passe par applyServerSave (comme un vrai chargement) → curseAbundanceStart est bien effacé.
        const world: YellowSave = { ...emptySave(), activeWorld: "live", defeatedTrainers: [ABUNDANCE_CURSE_MARKER], curseFreeItemsTaken: 2, pc: Array.from({ length: 3 }, () => createMonInstance("razmaree", 10, { owned: true })) }
        applyServerSave(parseSave(JSON.parse(JSON.stringify(world))))
        expect(getPlayer().curseAbundanceStart).toBeFalsy()
        expect(resolveAbundanceCurse()).toBe(0)               // ne s'auto-annule pas, ne touche personne
        expect(getPlayer().defeatedTrainers).toContain(ABUNDANCE_CURSE_MARKER) // toujours armé
        expect(getPlayer().pc.filter((m) => m.disobedient).length).toBe(0)
    })

    it("cap : jamais plus de 7 Daemons désobéissants même avec 8+ objets", () => {
        vi.useFakeTimers(); vi.setSystemTime(new Date("2026-02-01T10:00:00Z"))
        reset(10)
        arm()
        for (let d = 0; d < 8; d++) { vi.setSystemTime(new Date(2026, 1, 1 + d, 10)); takeFreeShopItem("potion") }
        expect(getPlayer().curseFreeItemsTaken).toBe(7) // plafonné à 7
        vi.setSystemTime(new Date("2026-03-01T10:00:00Z"))
        expect(resolveAbundanceCurse()).toBe(7)
        expect(getPlayer().pc.filter((m) => m.disobedient).length).toBe(7)
    })
})
