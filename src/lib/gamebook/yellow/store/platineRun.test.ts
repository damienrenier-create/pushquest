import { describe, it, expect, beforeEach } from "vitest"
import {
    setPlatineCorridor, resetPlatineRun, currentPlatineOpponent, advancePlatineStep,
    isPlatineCorridorCleared, isPlatineCorridorLoaded, platineTotalSteps, getPlatineStep,
    getPlatineLedger, setPlatineLedger, markPlatineOpponentBeaten, isPlatineOpponentBeaten, type PlatineThroneHolder,
} from "./platineRun"
import { recordHit, topHits } from "../data/platineLedger"
import type { PlatineChampion } from "../data/platineArena"
import type { FusionChampionMon } from "../storage/save"

const mon = (name: string): FusionChampionMon => ({
    name, sprite: "/x.png", types: ["PSY"], level: 100,
    stats: { hp: 500, atk: 300, def: 300, spe: 400, spc: 700 }, moves: ["Vague Mentale"],
})
const champ = (nickname: string): PlatineChampion =>
    ({ userId: `u-${nickname}`, nickname, wonAt: "2026-09-08T00:00:00.000Z", team: [mon("A")] })
const holder = (nickname: string): PlatineThroneHolder =>
    ({ userId: `u-${nickname}`, nickname, points: 3, sinceAt: "2026-09-01T00:00:00.000Z", reignDays: 10, team: [mon("B")] })

// LE COULOIR : ACE -> chaque champion -> le Maitre en titre. Etat TRANSIENT : on le traverse d'une traite,
// abandonner remet tout a zero. C'est ce qui rend l'echec reel — et donc le trone desirable.
describe("platineRun — la séquence du couloir", () => {
    beforeEach(() => resetPlatineRun())

    it("sans couloir chargé, il n'y a aucun adversaire (on ne lance pas un combat dans le vide)", () => {
        expect(isPlatineCorridorLoaded()).toBe(false)
        expect(currentPlatineOpponent()).toBeNull()
        expect(isPlatineCorridorCleared()).toBe(false) // pas « terminé » : pas commencé
    })

    it("ACE d'abord, puis les champions dans l'ordre, puis le Maître", () => {
        setPlatineCorridor([champ("Jacanon"), champ("Mools")], holder("Roi"))
        expect(platineTotalSteps()).toBe(4) // ACE + 2 salles + le Maitre
        expect(currentPlatineOpponent()).toMatchObject({ kind: "ace" })
        advancePlatineStep()
        expect(currentPlatineOpponent()).toMatchObject({ kind: "room", label: "Jacanon" })
        advancePlatineStep()
        expect(currentPlatineOpponent()).toMatchObject({ kind: "room", label: "Mools" })
        advancePlatineStep()
        expect(currentPlatineOpponent()).toMatchObject({ kind: "throne", label: "Roi" })
        advancePlatineStep()
        expect(currentPlatineOpponent()).toBeNull()
        expect(isPlatineCorridorCleared()).toBe(true)
    })

    it("TRÔNE VACANT : le couloir s'arrête après les champions → on devient le PREMIER Maître", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        expect(platineTotalSteps()).toBe(2) // ACE + 1 salle, pas de Maitre
        advancePlatineStep() // ACE battu
        expect(currentPlatineOpponent()).toMatchObject({ kind: "room", label: "Jacanon" })
        advancePlatineStep()
        expect(isPlatineCorridorCleared()).toBe(true)
    })

    it("couloir SANS aucun champion (personne n'a l'or) : ACE seul suffit", () => {
        setPlatineCorridor([], null)
        expect(platineTotalSteps()).toBe(1)
        expect(currentPlatineOpponent()).toMatchObject({ kind: "ace" })
        advancePlatineStep()
        expect(isPlatineCorridorCleared()).toBe(true)
    })

    it("abandonner remet le parcours à zéro — pas de reprise à mi-couloir", () => {
        setPlatineCorridor([champ("Jacanon")], holder("Roi"))
        advancePlatineStep()
        advancePlatineStep()
        expect(getPlatineStep()).toBe(2)
        resetPlatineRun()
        expect(isPlatineCorridorLoaded()).toBe(false)
        expect(getPlatineStep()).toBe(0)
        expect(currentPlatineOpponent()).toBeNull()
    })

    it("recharger le couloir relance un parcours propre (étape ET registre)", () => {
        setPlatineCorridor([champ("A")], null)
        advancePlatineStep()
        setPlatineLedger(recordHit(getPlatineLedger(), "mine", { name: "X", move: "M", damage: 500, target: "T", room: "ACE" }))
        expect(topHits(getPlatineLedger(), "mine")).toHaveLength(1)
        setPlatineCorridor([champ("A")], null)
        expect(getPlatineStep()).toBe(0)
        expect(topHits(getPlatineLedger(), "mine")).toHaveLength(0)
    })

    it("le registre des meilleurs coups survit à la traversée", () => {
        setPlatineCorridor([champ("A")], null)
        setPlatineLedger(recordHit(getPlatineLedger(), "mine", { name: "Orochitachi", move: "Vague Mentale", damage: 420, target: "Voltombre", room: "ACE" }))
        advancePlatineStep()
        setPlatineLedger(recordHit(getPlatineLedger(), "foes", { name: "Voltombre", move: "Ultra-Foudre", damage: 611, target: "Orochitachi", room: "ACE" }))
        expect(topHits(getPlatineLedger(), "mine")[0].damage).toBe(420)
        expect(topHits(getPlatineLedger(), "foes")[0].damage).toBe(611)
    })
})

// LA PORTE. Battre l adversaire ne fait PAS venir le suivant : ca DEVERROUILLE la porte droite. C est en la
// franchissant que le couloir avance — le joueur ressort, rentre, et quelqu un d autre se tient la.
describe("platineRun — la porte droite", () => {
    beforeEach(() => resetPlatineRun())

    it("la porte est SCELLEE tant que l adversaire du moment tient", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        expect(isPlatineOpponentBeaten()).toBe(false)
        markPlatineOpponentBeaten()
        expect(isPlatineOpponentBeaten()).toBe(true)
    })

    it("battre NE change PAS l adversaire : seul le franchissement le fait", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        markPlatineOpponentBeaten()
        expect(currentPlatineOpponent()).toMatchObject({ kind: "ace" }) // toujours ACE dans la salle
        advancePlatineStep()                                            // on franchit la porte
        expect(currentPlatineOpponent()).toMatchObject({ kind: "room", label: "Jacanon" })
    })

    it("franchir REVERROUILLE la porte pour l adversaire suivant", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        markPlatineOpponentBeaten()
        advancePlatineStep()
        expect(isPlatineOpponentBeaten()).toBe(false) // Jacanon n est pas encore tombe
    })

    it("abandonner reverrouille tout", () => {
        setPlatineCorridor([champ("A")], null)
        markPlatineOpponentBeaten()
        resetPlatineRun()
        expect(isPlatineOpponentBeaten()).toBe(false)
    })
})
