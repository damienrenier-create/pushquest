import { describe, it, expect, beforeEach } from "vitest"
import { persistsDefeatOnWin, PLATINE_TRAINER_ID } from "./battleStore"
import {
    setPlatineCorridor, resetPlatineRun, currentPlatineOpponent, advancePlatineStep,
    markPlatineOpponentBeaten, isPlatineOpponentBeaten, platineTotalSteps, type PlatineThroneHolder,
} from "./platineRun"
import { platineBribe, PLATINE_BRIBE_PER_KO } from "../data/platineLore"
import type { PlatineChampion } from "../data/platineArena"
import type { FusionChampionMon } from "../storage/save"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LE COULOIR PLATINE — POURQUOI CE FICHIER EXISTE
//
// Bug trouvé en audit, et il rendait le palier INJOUABLE en production :
// toutes les étapes du couloir (ACE, chaque champion OR, le Maître en titre) partagent UNE salle et UN SEUL
// id de dresseur. La victoire passait par la branche générique de `finishBattle`, qui grave
// `markTrainerDefeated(trainerId)` dans la save. Dès la victoire sur ACE, `y_fusion_platine` était donc
// « battu » POUR TOUJOURS : à l'étape suivante, interact() tombait sur `isTrainerDefeated(trainer.id)` et
// servait une réplique de défaite sans poser `pendingTrainerId` — aucun combat ne démarrait plus, la porte
// droite était re-scellée, et la seule issue restante était l'abandon.
//
// Les deux garde-fous testés ici sont les deux moitiés du correctif, et ils vont par paire :
//   1. le couloir ne grave JAMAIS de marqueur de défaite  (sinon : couloir mort après ACE) ;
//   2. la progression vit dans platineRun, et le drapeau « battu » empêche de re-combattre le même
//      adversaire tant qu'on n'a pas franchi la porte  (sinon : pot-de-vin encaissable en boucle).
// Retirer l'un sans l'autre re-casse le palier — d'où les tests côte à côte.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const mon = (name: string): FusionChampionMon => ({
    name, sprite: "/x.png", types: ["TENEBRES"], level: 100,
    stats: { hp: 500, atk: 300, def: 300, spe: 400, spc: 700 }, moves: ["Lance-Soleil"],
})
const champ = (nickname: string): PlatineChampion =>
    ({ userId: `u-${nickname}`, nickname, wonAt: "2026-09-08T00:00:00.000Z", team: [mon("A")] })
const holder = (nickname: string): PlatineThroneHolder =>
    ({ userId: `u-${nickname}`, nickname, points: 3, sinceAt: "2026-09-01T00:00:00.000Z", reignDays: 10, team: [mon("B")] })

describe("couloir platine — le marqueur de défaite ne doit JAMAIS être gravé", () => {
    it("le dresseur du couloir est exclu du marquage", () => {
        expect(persistsDefeatOnWin(PLATINE_TRAINER_ID)).toBe(false)
        expect(PLATINE_TRAINER_ID).toBe("y_fusion_platine")
    })

    it("…mais TOUS les autres le gardent — les salles de la Ligue classique en dépendent pour ouvrir leur porte", () => {
        for (const id of ["y_fusion_1", "y_fusion_2", "y_fusion_miroir", "y_fusion_reflet", "y_ligue_maitre", "y_arene_1"]) {
            expect(persistsDefeatOnWin(id)).toBe(true)
        }
    })

    it("l'exception vise UN id précis, pas le préfixe « y_fusion_ » (sinon la Ligue classique perdrait ses portes)", () => {
        expect(persistsDefeatOnWin("y_fusion_platine_bis")).toBe(true)
        expect(persistsDefeatOnWin("y_fusion_")).toBe(true)
    })
})

describe("couloir platine — un seul dresseur, plusieurs adversaires", () => {
    beforeEach(() => resetPlatineRun())

    it("l'ADVERSAIRE change à chaque étape alors que le DRESSEUR, lui, ne change jamais", () => {
        // C'est exactement la prémisse qui rendait le marquage fatal : le jeu ne voit qu'un dresseur.
        setPlatineCorridor([champ("Jacanon"), champ("Mools")], holder("Zyran"))
        expect(platineTotalSteps()).toBe(4) // ACE + 2 champions + le Maître

        const vus: string[] = []
        for (let i = 0; i < 4; i++) {
            vus.push(currentPlatineOpponent()!.label)
            markPlatineOpponentBeaten()
            advancePlatineStep()
        }
        expect(vus).toEqual(["ACE", "Jacanon", "Mools", "Zyran"])
        expect(new Set(vus).size).toBe(4) // 4 adversaires distincts…
        // …pour un seul et même dresseur, dont la défaite ne doit donc rien graver.
        expect(persistsDefeatOnWin(PLATINE_TRAINER_ID)).toBe(false)
    })

    it("battre n'avance PAS l'étape : c'est franchir la porte qui le fait", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        expect(currentPlatineOpponent()!.label).toBe("ACE")
        markPlatineOpponentBeaten()
        expect(currentPlatineOpponent()!.label).toBe("ACE")   // toujours lui : la porte n'est pas franchie
        expect(isPlatineOpponentBeaten()).toBe(true)          // …mais elle est DÉVERROUILLÉE
        advancePlatineStep()
        expect(currentPlatineOpponent()!.label).toBe("Jacanon")
        expect(isPlatineOpponentBeaten()).toBe(false)         // et re-scellée derrière soi
    })

    it("le drapeau « battu » est ce qui empêche de re-combattre (et de re-encaisser le pot-de-vin) sur place", () => {
        setPlatineCorridor([champ("Jacanon")], null)
        expect(isPlatineOpponentBeaten()).toBe(false) // pas encore battu → le combat peut se lancer
        markPlatineOpponentBeaten()
        expect(isPlatineOpponentBeaten()).toBe(true)  // battu → gameStore renvoie un dialogue, pas un combat
    })

    it("abandonner remet tout à zéro : aucun état ne survit à une sortie par la gauche", () => {
        setPlatineCorridor([champ("Jacanon")], holder("Zyran"))
        markPlatineOpponentBeaten(); advancePlatineStep()
        resetPlatineRun()
        expect(currentPlatineOpponent()).toBeNull()
        expect(isPlatineOpponentBeaten()).toBe(false)
    })
})

// LE POT-DE-VIN. Le couloir REPORTE les PV de salle en salle : le total de morts en fin de combat inclut
//   celles des salles precedentes. Facturer ce total revenait a faire payer a chaque adversaire les victimes
//   de ses predecesseurs — ~1000-1500 JC sur un couloir complet au lieu de ~200.
describe("couloir platine — le tarif du silence ne facture QUE sa propre salle", () => {
    it("un adversaire paie pour les Daemons qu'IL a mis a terre, pas pour ceux d'avant", () => {
        expect(platineBribe(2, 0)).toEqual({ ko: 2, jc: 100 })  // ACE en couche 2 : 100 JC
        expect(platineBribe(2, 2)).toEqual({ ko: 0, jc: 0 })    // la salle suivante n'a touche personne : 0
        expect(platineBribe(5, 2)).toEqual({ ko: 3, jc: 150 })  // celle d'apres en couche 3 de plus
    })

    it("le tarif est bien de 50 jetons par Daemon", () => {
        for (let n = 0; n <= 6; n++) expect(platineBribe(n, 0).jc).toBe(n * PLATINE_BRIBE_PER_KO)
        expect(platineBribe(6, 0).jc).toBe(300) // = le plafond serveur d'un don (GRANT_MAX)
    })

    it("un compteur d'ouverture en avance ne cree JAMAIS de dette negative", () => {
        expect(platineBribe(1, 4)).toEqual({ ko: 0, jc: 0 })
        expect(platineBribe(0, 0)).toEqual({ ko: 0, jc: 0 })
    })
})
