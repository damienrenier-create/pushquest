import { describe, it, expect } from "vitest"
import { liveStabs, weakDefenseCategory, scoreTyping, bestCounterTypings, findPoolCounters, architectNemesis, profileFromSpecies, type DaemonProfile } from "./nemesisArchitect"

// Cible de référence : Moby D (EAU/GLACE), attaquant SPÉCIAL (spé 132), DÉF 80 basse → à percer en PHYSIQUE.
const MOBYD: DaemonProfile = { name: "Moby D", types: ["EAU", "GLACE"], stats: { hp: 90, atk: 70, def: 80, spe: 70, spc: 132 } }

describe("Protocole némésis — profil de la cible", () => {
    it("STAB réels = ses types, menace = stat offensive de la catégorie (Eau/Glace = spé 132)", () => {
        const s = liveStabs(MOBYD)
        expect(s.every((x) => x.category === "SPECIAL" && x.threat === 132)).toBe(true)
    })
    it("mur défensif faible = DÉF 80 (< SPÉ 132) → percer en PHYSIQUE", () => {
        expect(weakDefenseCategory(MOBYD.stats)).toBe("PHYSICAL")
        // Inversé : un mur physique (def > spc) se perce en SPÉCIAL.
        expect(weakDefenseCategory({ hp: 80, atk: 120, def: 100, spe: 90, spc: 40 })).toBe("SPECIAL")
    })
})

describe("Protocole némésis — score de typage (prouvé sur la table)", () => {
    it("EAU/COMBAT = HARD-COUNTER : encaisse 0.5 les 2 STAB + COMBAT ×2 physique dans la DÉF faible", () => {
        const t = scoreTyping(["EAU", "COMBAT"], MOBYD)
        expect(t.resistMult).toBe(0.5)
        expect(t.offenseType).toBe("COMBAT")
        expect(t.offenseMult).toBe(2)
        expect(t.hitsWeakDefense).toBe(true)
        expect(t.verdict).toContain("HARD-COUNTER")
    })
    it("PLANTE/COMBAT = piège défensif : perce en Combat MAIS prend la Glace ×2", () => {
        const t = scoreTyping(["PLANTE", "COMBAT"], MOBYD)
        expect(t.resistMult).toBe(2)          // Glace ×2 sur Plante
        expect(t.verdict).toContain("FAIBLE")
    })
    it("ELEC/COMBAT = solide neutre : perce en Combat, ni résiste ni faible", () => {
        const t = scoreTyping(["ELEC", "COMBAT"], MOBYD)
        expect(t.resistMult).toBe(1)
        expect(t.offenseType).toBe("COMBAT")
        expect(t.hitsWeakDefense).toBe(true)
    })
    it("frapper ×2 en SPÉCIAL dans le mur spécial = 'piège' détecté (Plante/Élec, l'auto-némésis d'origine)", () => {
        const t = scoreTyping(["PLANTE", "ELEC"], MOBYD)
        // les 2 types tapent ×2 mais en SPÉCIAL (mur fort) → n'est PAS un hard-counter offensif
        expect(t.hitsWeakDefense).toBe(false)
        expect(t.score).toBeLessThan(scoreTyping(["EAU", "COMBAT"], MOBYD).score)
    })
    it("bestCounterTypings classe EAU/COMBAT en tête (meilleur score que tout typage spécial-mur)", () => {
        const top = bestCounterTypings(MOBYD, 6)
        expect(top[0].types.sort()).toEqual(["COMBAT", "EAU"].sort())
        expect(top[0].verdict).toContain("HARD-COUNTER")
    })
})

describe("Protocole némésis — scan du pool", () => {
    it("trouve Uzumaro (COMBAT/EAU) comme contre existant de Moby D (résiste + Combat ×2 exploitable)", () => {
        const pool = findPoolCounters(MOBYD, 5)
        const uzu = pool.find((c) => c.id === "uzumaro")
        expect(uzu).toBeTruthy()
        expect(uzu!.resistMult).toBe(0.5)
        expect(uzu!.offenseMult).toBe(2)
        expect(uzu!.usableOffense).toBe(true)
    })
    it("architectNemesis recommande le contre du pool en 1er + un bespoke en 2e", () => {
        const plan = architectNemesis(MOBYD)
        expect(plan.recommendation).toContain("EXISTE DÉJÀ")
        expect(plan.chosen.types.length).toBeGreaterThanOrEqual(1)
        expect(plan.chosen.stats.atk).toBeGreaterThan(plan.chosen.stats.spc) // attaquant physique (perce la DÉF)
    })
})

describe("Protocole némésis — généralisation (autre archétype)", () => {
    it("cible DRAGON/VOL attaquant physique frêle-spé → contre GLACE spécial ×4 dans son mur spé faible", () => {
        const draco: DaemonProfile = { name: "Test", types: ["DRAGON", "VOL"], stats: { hp: 80, atk: 125, def: 95, spe: 100, spc: 45 } }
        expect(weakDefenseCategory(draco.stats)).toBe("SPECIAL")
        const top = bestCounterTypings(draco, 8)
        const iceCounter = top.find((t) => t.offenseType === "GLACE")
        expect(iceCounter).toBeTruthy()
        expect(iceCounter!.offenseMult).toBe(4)        // Glace ×2 Dragon × ×2 Vol
        expect(iceCounter!.hitsWeakDefense).toBe(true) // spécial → tape la SPÉ 45 faible
    })
    it("profileFromSpecies lit une espèce réelle", () => {
        const p = profileFromSpecies("razmaree")
        expect(p).toBeTruthy()
        expect(p!.types).toContain("EAU")
    })
})
