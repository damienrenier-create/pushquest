import { describe, it, expect, beforeEach } from "vitest"
import { getSpecies, DEX_ULTRA_SECRET } from "./species"
import { canLearnCt, getCt } from "./cts"
import { getMove } from "./moves"
import {
    hydratePlayer, getPlayer, creditDailyReps,
    grantMegamonarx, hasMegamonarx,
    armGalijahByDex, isGalijahArmed, disarmGalijah, grantGalijahIfDexMilestone, poseGalijahEncounter, galijahCountdown,
    GALIJAH_ARMED_MARKER, GALIJAH_OFFERED_MARKER, MEGAMONARX_GRANTED_MARKER,
} from "../store/playerStore"
import { hydratePokedex, getPokedex } from "../store/pokedexStore"

const bst = (id: string) => { const b = getSpecies(id)!.baseStats; return b.hp + b.atk + b.def + b.spe + b.spc }
const resetAll = () => {
    hydratePlayer({ team: [], pc: [], reps: 0, defeatedTrainers: [], items: {}, capturesToday: 0, creditedThrough: "2026-08-07" })
    hydratePokedex({ seen: [], caught: [] })
}

describe("MégamonarX & Galijah — espèces légendaires secrètes", () => {
    beforeEach(resetAll)

    it("MégamonarX : DRAGON/ROCHE, BST 750, secret, lent", () => {
        const sp = getSpecies("megamonarx")!
        expect(sp.dexNo).toBe(203)
        expect(sp.types).toEqual(["DRAGON", "ROCHE"])
        expect(bst("megamonarx")).toBe(750)
        expect(sp.baseStats.spe).toBe(55) // ultra-lent (consigne : laisser l'adversaire agir)
        expect(sp.baseStats.hp).toBe(205) // gros PV
        expect(sp.hiddenUntilCaught).toBe(true)
        expect(sp.rarity).toBe("LEGENDARY")
        expect(sp.exclusive).toBe(true) // exclu de la Zone de Combat (convention légendaire)
        for (const l of sp.learnset) expect(getMove(l.moveId), l.moveId).toBeTruthy()
    })

    it("Galijah : FÉE/SPECTRE, BST 600, secret ; apprend tout SAUF Ténèbres", () => {
        const sp = getSpecies("galijah")!
        expect(sp.dexNo).toBe(204)
        expect(sp.types).toEqual(["FEE", "SPECTRE"])
        expect(bst("galijah")).toBe(600)
        expect(sp.hiddenUntilCaught).toBe(true)
        expect(sp.exclusive).toBe(true) // exclu de la Zone de Combat (convention légendaire)
        expect(sp.learnsAllCts).toBe(true)
        expect(sp.learnsAllCtsExcept).toEqual(["TENEBRES"])
        for (const l of sp.learnset) expect(getMove(l.moveId), l.moveId).toBeTruthy()
        // canLearnCt : Ténèbres bloqué (ct60 reflet_fatal), tout le reste OK
        const ct60 = getCt("ct60")! // seule CT Ténèbres
        expect(getMove(ct60.moveId)!.type).toBe("TENEBRES")
        expect(canLearnCt(sp, ct60)).toBe(false)
        // une CT non-Ténèbres quelconque → autorisée
        const other = [1, 2, 5, 16, 18].map((n) => getCt(`ct${String(n).padStart(2, "0")}`)).find((c) => c && getMove(c.moveId)?.type !== "TENEBRES")!
        expect(canLearnCt(sp, other)).toBe(true)
    })

    it("grantMegamonarx : octroi ONE-SHOT + marqué au dex", () => {
        expect(hasMegamonarx()).toBe(false)
        expect(grantMegamonarx()).not.toBeNull()
        expect(hasMegamonarx()).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain(MEGAMONARX_GRANTED_MARKER)
        expect(getPokedex().caught).toContain("megamonarx")
        const total = getPlayer().team.length + getPlayer().pc.length
        expect(grantMegamonarx()).toBeNull() // 2e appel = no-op
        expect(getPlayer().team.length + getPlayer().pc.length).toBe(total) // pas de doublon
    })

    // Pokédex de N espèces bidon (+ éventuelles espèces réelles en tête) — pilote le décompte/armement de Galijah.
    const dexOf = (n: number, extra: string[] = []) => ({ seen: [], caught: [...extra, ...Array.from({ length: n }, (_, i) => `sp_${i}`)] })

    it("Galijah — 150 ESPÈCES différentes au Pokédex → armGalijahByDex ARME la chasse", () => {
        hydratePokedex(dexOf(149))
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(false) // 149 < 150
        hydratePokedex(dexOf(150))
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(true) // 150ᵉ espèce différente → armé
    })

    it("Galijah — décompte énigmatique : 150 − espèces différentes, planché à 0", () => {
        expect(galijahCountdown(0)).toBe(150)
        expect(galijahCountdown(100)).toBe(50)
        expect(galijahCountdown(149)).toBe(1)
        expect(galijahCountdown(150)).toBe(0)
        expect(galijahCountdown(151)).toBe(0) // ≥150 → imminent (0), plus de paliers +50
        expect(galijahCountdown(200)).toBe(0)
    })

    it("Galijah — re-armable après une tentative ratée (tant que ≥150 espèces & non capturé)", () => {
        hydratePokedex(dexOf(150))
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(true)
        disarmGalijah() // tentative ratée (spawn posé + fui/KO → marker retiré, Galijah non capturé)
        expect(isGalijahArmed()).toBe(false)
        armGalijahByDex() // capture suivante → re-arme (espèces toujours ≥150)
        expect(isGalijahArmed()).toBe(true)
    })

    it("Galijah — déjà capturé : n'arme PAS même à ≥150 espèces", () => {
        hydratePokedex(dexOf(149, ["galijah"])) // 150 espèces DONT galijah
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(false)
    })

    it("Galijah — marqueur OBSOLÈTE (armé mais <150 espèces) → isGalijahArmed revalide le Pokédex", () => {
        // Simule un vieux marqueur (ancien système « 150 captures/jour ») avec peu d'espèces distinctes.
        hydratePlayer({ team: [], pc: [], reps: 0, defeatedTrainers: [GALIJAH_ARMED_MARKER], items: {} })
        hydratePokedex(dexOf(80))
        expect(isGalijahArmed()).toBe(false) // marqueur ignoré : <150 espèces → pas de spawn fantôme
        hydratePokedex(dexOf(150))
        expect(isGalijahArmed()).toBe(true)  // ≥150 espèces → le marqueur redevient valide
    })

    it("Galijah — poseGalijahEncounter arme la rencontre forcée (légendaire) + désarme", () => {
        hydratePokedex(dexOf(150))
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(true)
        poseGalijahEncounter(42)
        expect(isGalijahArmed()).toBe(false) // désarmé
        const fe = JSON.parse(getPlayer().forcedEncounter!)
        expect(fe.speciesId).toBe("galijah")
        expect(fe.level).toBe(42)
        expect(fe.hard).toBe(true) // méthode légendaire
    })

    it("Galijah — poseGalijahEncounter n'ÉCRASE PAS une rencontre déjà posée (vœu génie) et reste armé", () => {
        hydratePlayer({ team: [], pc: [], reps: 0, defeatedTrainers: [GALIJAH_ARMED_MARKER], items: {}, forcedEncounter: JSON.stringify({ speciesId: "draclet", level: 30, hard: false }) })
        hydratePokedex(dexOf(150)) // ≥150 espèces → isGalijahArmed valide le marqueur
        poseGalijahEncounter(40)
        expect(JSON.parse(getPlayer().forcedEncounter!).speciesId).toBe("draclet") // slot génie préservé
        expect(isGalijahArmed()).toBe(true) // Galijah reste armé → réessaiera au pas suivant
    })

    it("Galijah — cadeau de secours au 200ᵉ dex (one-shot), pas avant", () => {
        // 199 espèces → pas encore
        hydratePokedex({ seen: [], caught: Array.from({ length: 199 }, (_, i) => `dummy_${i}`) })
        expect(grantGalijahIfDexMilestone()).toBeNull()
        // 200 espèces → cadeau
        hydratePokedex({ seen: [], caught: Array.from({ length: 200 }, (_, i) => `dummy_${i}`) })
        expect(grantGalijahIfDexMilestone()).not.toBeNull()
        expect(getPokedex().caught).toContain("galijah")
        expect(getPlayer().defeatedTrainers).toContain(GALIJAH_OFFERED_MARKER)
        expect(grantGalijahIfDexMilestone()).toBeNull() // 2e appel = no-op (one-shot)
    })

    it("ANTI-SPOILER : les 2 sont ultra-secrets (masqués sauf capture réelle) + hiddenUntilCaught", () => {
        expect([...DEX_ULTRA_SECRET].sort()).toEqual(["galijah", "megamonarx"])
        for (const id of DEX_ULTRA_SECRET) expect(getSpecies(id)?.hiddenUntilCaught, id).toBe(true)
    })

    it("creditDailyReps : n'affecte PLUS la chasse Galijah (pilotée par le Pokédex, aucun reset de minuit)", () => {
        hydratePokedex(dexOf(150))
        armGalijahByDex()
        expect(isGalijahArmed()).toBe(true)
        creditDailyReps("2026-08-08") // jour suivant
        expect(isGalijahArmed()).toBe(true) // la chasse reste armée (dex-driven ; le tick ne désarme rien)
    })
})
