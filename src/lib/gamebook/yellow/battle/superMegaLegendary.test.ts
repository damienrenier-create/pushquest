import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, maxHpOf } from "./engine"
import { createMonInstance } from "./factory"
import { getSpecies } from "../data/species"
import { SUPER_MEGA_TARGET_IDS, isSuperMegaTarget } from "../data/items"
import { levelCatchFactor } from "../data/captureConfig"

// SUPER MÉGA NEXUS-BALL — décision Sartay 10/09 : elle capture À COUP SÛR le LÉGENDAIRE DE CHAQUE RUN sous 50 % PV.
//   Avant, le raccourci était codé en dur sur le seul GOSHENDOFY : en run 2 (Ukognos) et run 3 (Flamarokto), la Ball
//   ultime se faisait refuser par le verrou `captureRequiresStatus` — le bug fonctionnel corrigé ici.

/** Met un sauvage face au joueur, PV à une fraction de son max, avec les verrous d'un légendaire de plaine. */
function wildBattle(speciesId: string, level: number, hpFrac: number, extra: Record<string, unknown> = {}) {
    const wildMon = createMonInstance(speciesId, level, { owned: false })
    const me = createMonInstance("orcaline", 50, { owned: true })
    const s = createBattle([me], [wildMon], { isWild: true, seed: 777 })
    const w = s.enemy.team[s.enemy.activeIndex]
    w.currentHp = Math.max(1, Math.floor(maxHpOf(w) * hpFrac))
    Object.assign(w, { captureRequiresStatus: true, captureMinBallBonus: 5, captureMult: 0.8, ...extra })
    return s
}
const throwBall = (s: ReturnType<typeof wildBattle>, itemId: string) => resolveTurn(s, { kind: "ball", itemId })

describe("Super Méga Nexus-Ball — le légendaire de CHAQUE run", () => {
    it("la liste des cibles couvre les 3 runs + l'endgame", () => {
        expect([...SUPER_MEGA_TARGET_IDS]).toEqual(["goshendofy", "ukognos", "flamarokto", "galijah"])
    })

    it.each([
        ["goshendofy", "run 1"],
        ["ukognos", "run 2"],
        ["flamarokto", "run 3"],
        ["galijah", "endgame"],
    ])("capture GARANTIE de %s (%s) sous 50 %% PV, SANS statut", (id) => {
        expect(isSuperMegaTarget(id)).toBe(true)
        expect(throwBall(wildBattle(id, 50, 0.4), "super_mega_nexus_ball").outcome).toBe("caught")
    })

    it.each(["ukognos", "flamarokto", "galijah"])("PAS garantie si %s est à PV pleins (le seuil 50 %% tient)", (id) => {
        expect(throwBall(wildBattle(id, 50, 1), "super_mega_nexus_ball").outcome).not.toBe("caught")
    })

    it("une Ball ordinaire reste refusée sans statut (le verrou n'est levé QUE par la Super Méga)", () => {
        expect(throwBall(wildBattle("ukognos", 50, 0.4), "hyper_ball_plus").outcome).not.toBe("caught")
    })

    it("DRACONARQUE est LEGENDARY mais s'obtient par évolution sauvage → PAS de garantie", () => {
        expect(getSpecies("draconarque")!.rarity).toBe("LEGENDARY") // le piège qu'on évite
        expect(isSuperMegaTarget("draconarque")).toBe(false)
        expect(throwBall(wildBattle("draconarque", 50, 0.4), "super_mega_nexus_ball").outcome).not.toBe("caught")
    })

    it("UKOGNOFY garde son rituel Fusio-Ball : la Super Méga GLISSE (verrou fusion, en amont)", () => {
        expect(isSuperMegaTarget("ukognofy")).toBe(false)
    })
})

describe("Légendaires — profil de capture ALIGNÉ sur Goshendofy", () => {
    it("Galijah a le catchRate de référence (8), plus 3", () => {
        expect(getSpecies("galijah")!.catchRate).toBe(8)
        expect(getSpecies("goshendofy")!.catchRate).toBe(8)
        expect(getSpecies("ukognos")!.catchRate).toBe(8)
        expect(getSpecies("flamarokto")!.catchRate).toBe(8)
    })

    it("captureLevel fige le facteur de niveau à celui du niv 50, même à niv 100", () => {
        // Le facteur est INVERSE (13/niv, planché à 0,15) : sans override, un légendaire niv 100 est ~1,7× plus
        // dur qu'au niv 50. `captureLevel: 50` neutralise ça — il cogne plus fort, il n'est pas plus dur à prendre.
        expect(levelCatchFactor(50)).toBeCloseTo(0.26, 5)
        expect(levelCatchFactor(100)).toBeCloseTo(0.15, 5)
        expect(levelCatchFactor(50)).toBeGreaterThan(levelCatchFactor(100))
    })

    it("Galijah niv 100 avec captureLevel 50 se capture aussi bien qu'au niv 70", () => {
        const hi = wildBattle("galijah", 100, 0.4, { captureLevel: 50 })
        expect(throwBall(hi, "super_mega_nexus_ball").outcome).toBe("caught")
    })
})
