import { describe, it, expect } from "vitest"
import { shouldLogMessage, messageSource } from "./messageJournal"
import { getTrainer } from "./trainers"
import { ACE_TRAINER_ID } from "./ace"

// JOURNAL DES MESSAGES — filtre « info » + catégorie de source.
describe("messageJournal — filtre & source", () => {
    it("Dieu Spaghetti (par id OU par nom) → consigné, source=spaghetti", () => {
        expect(shouldLogMessage("y_dome_spaghetti", "DIEU SPAGHETTI")).toBe(true)
        expect(shouldLogMessage("spaghetti_gate", "Porte")).toBe(true)
        expect(shouldLogMessage("y_fishing", "DIEU SPAGHETTI")).toBe(true)
        expect(messageSource("y_fishing", "DIEU SPAGHETTI")).toBe("spaghetti")
        expect(messageSource("peu_importe", "LE DIEU SPAGHETTI")).toBe("spaghetti")
    })

    it("Génie → consigné, source=genie", () => {
        expect(shouldLogMessage("y_genie_ambush", "LE GÉNIE")).toBe(true)
        expect(messageSource("duel_dream", "🧞 LE GÉNIE")).toBe("genie")
    })

    it("PNJ narratif (non-dresseur) → consigné, source=pnj", () => {
        expect(shouldLogMessage("archiviste", "L'Archiviste")).toBe(true)
        expect(messageSource("archiviste", "L'Archiviste")).toBe("pnj")
    })

    it("ACE → gardé (il distille les directions Cendreville/Ligue)", () => {
        expect(shouldLogMessage(ACE_TRAINER_ID, "ACE")).toBe(true)
    })

    it("un vrai dresseur de combat → EXCLU (raillerie/intro de combat, pas de l'info)", () => {
        expect(getTrainer("y_trainer_leo")).toBeTruthy()        // y_trainer_leo EST un dresseur enregistré…
        expect(shouldLogMessage("y_trainer_leo", "Léo")).toBe(false) // …donc exclu
    })

    it("le génie-embuscade est un dresseur MAIS reste consigné (source génie)", () => {
        expect(getTrainer("y_genie_ambush")).toBeTruthy()
        expect(shouldLogMessage("y_genie_ambush", "LE GÉNIE")).toBe(true)
    })

    it("sources de BRUIT (sbire / reflet / némésis) → exclues", () => {
        expect(shouldLogMessage("y_sbire", "SBIRE")).toBe(false)
        expect(shouldLogMessage("run2ghost", "Fantôme")).toBe(false)
        expect(shouldLogMessage("y_nemesis_challenge", "LE NÉMÉSIS")).toBe(false)
    })

    it("npcId vide → jamais consigné", () => {
        expect(shouldLogMessage("", "")).toBe(false)
    })
})
