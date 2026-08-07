import { describe, it, expect, beforeEach } from "vitest"
import { getSpecies, DEX_ULTRA_SECRET } from "./species"
import { canLearnCt, getCt } from "./cts"
import { getMove } from "./moves"
import {
    hydratePlayer, getPlayer, creditDailyReps,
    grantMegamonarx, hasMegamonarx,
    bumpCapturesToday, isGalijahArmed, disarmGalijah, grantGalijahIfDexMilestone, poseGalijahEncounter,
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

    it("Galijah — compteur du jour : la 150ᵉ capture ARME la chasse", () => {
        for (let i = 0; i < 149; i++) bumpCapturesToday()
        expect(isGalijahArmed()).toBe(false)
        bumpCapturesToday() // 150ᵉ
        expect(isGalijahArmed()).toBe(true)
        expect(getPlayer().capturesToday).toBe(150)
    })

    it("Galijah — déjà capturé : la 150ᵉ n'arme PAS", () => {
        hydratePokedex({ seen: ["galijah"], caught: ["galijah"] })
        for (let i = 0; i < 151; i++) bumpCapturesToday()
        expect(isGalijahArmed()).toBe(false)
    })

    it("Galijah — poseGalijahEncounter arme la rencontre forcée (légendaire) + désarme", () => {
        for (let i = 0; i < 150; i++) bumpCapturesToday()
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

    it("creditDailyReps : nouveau jour → capturesToday remis à 0 + chasse désarmée", () => {
        for (let i = 0; i < 150; i++) bumpCapturesToday()
        expect(isGalijahArmed()).toBe(true)
        creditDailyReps("2026-08-08") // jour suivant
        expect(getPlayer().capturesToday).toBe(0)
        expect(getPlayer().defeatedTrainers).not.toContain(GALIJAH_ARMED_MARKER)
    })
})
