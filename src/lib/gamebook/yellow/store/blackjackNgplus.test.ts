import { describe, it, expect, beforeEach } from "vitest"
import {
    hydratePlayer, setActiveWorld, settleBlackjack, getPlayer,
    blackjackNgplusPickPending, blackjackNgplusChoices, claimBlackjackCtNgplus, claimBlackjackCt,
} from "./playerStore"
import { run2BlackjackCtPool } from "../data/cts"
import { emptyLabDefi } from "../data/labDefis"

beforeEach(() => {
    hydratePlayer({ reps: 0, repsCap: 999999, repsBankedTotal: 0, ownedCts: [], labDefi: emptyLabDefi() })
})

describe("BLACKJACK run 2 (NG+) — récompense UNIQUE : 1 CT au choix (n'importe laquelle sauf boss + Apothéose)", () => {
    it("dès 1000 ⚡ nets : 1 choix parmi tout le pool (sauf ct53-57 + ct52), réclamable une seule fois", () => {
        setActiveWorld("ngplus")
        expect(blackjackNgplusPickPending()).toBe(false) // rien gagné encore
        settleBlackjack(0, 500)                          // 500 < 1000 → pas encore
        expect(blackjackNgplusPickPending()).toBe(false)
        settleBlackjack(0, 500)                          // total 1000 → seuil atteint
        expect(blackjackNgplusPickPending()).toBe(true)

        const choices = blackjackNgplusChoices()
        expect(choices).toEqual(run2BlackjackCtPool())   // rien possédé → tout le pool
        expect(choices).toContain("ct01")                // CT universelle
        expect(choices).toContain("ct14")                // CT champion (Séisme) — plus de filtre de badge
        expect(choices).toContain("ct50")                // CT labo — incluse aussi
        expect(choices).not.toContain("ct52")            // Apothéose → jamais
        for (const bossCt of ["ct53", "ct54", "ct55", "ct56", "ct57"]) expect(choices).not.toContain(bossCt) // signatures de boss → jamais

        expect(claimBlackjackCtNgplus("ct14")).toBeTruthy()
        expect(getPlayer().ownedCts).toContain("ct14")
        expect(blackjackNgplusPickPending()).toBe(false)         // one-shot consommé
        expect(blackjackNgplusChoices()).not.toContain("ct14")   // possédée → plus proposée
    })

    it("une seule fois pour TOUT le run 2 : plus aucun lot même en gagnant beaucoup plus", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 3000)
        expect(claimBlackjackCtNgplus("ct01")).toBeTruthy()
        expect(blackjackNgplusPickPending()).toBe(false)  // verrouillé
        expect(claimBlackjackCtNgplus("ct02")).toBeNull() // pas de 2e pick
        settleBlackjack(0, 5000)                          // encore plus de gains…
        expect(blackjackNgplusPickPending()).toBe(false)  // …toujours rien
        expect(getPlayer().ownedCts).toEqual(["ct01"])
    })

    it("on ne peut pas réclamer une CT hors pool (signature de boss ou Apothéose)", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 1000)
        expect(claimBlackjackCtNgplus("ct53")).toBeNull() // signature de boss
        expect(claimBlackjackCtNgplus("ct52")).toBeNull() // Apothéose
        expect(blackjackNgplusPickPending()).toBe(true)   // rien consommé
    })

    it("sous le seuil (< 1000 ⚡) : rien à réclamer", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 900)
        expect(blackjackNgplusPickPending()).toBe(false)
        expect(claimBlackjackCtNgplus("ct01")).toBeNull()
    })

    it("HORS run 2 : aucun pick blackjack, et l'Apothéose (run 1) reste gated à 1000", () => {
        setActiveWorld("live")
        settleBlackjack(0, 500)
        expect(blackjackNgplusPickPending()).toBe(false)  // pas de pick en run 1
        expect(claimBlackjackCt()).toBeNull()             // <1000 → rien
        settleBlackjack(0, 500)                           // total 1000
        expect(claimBlackjackCt()).toBeTruthy()           // Apothéose débloquée en run 1
        expect(getPlayer().ownedCts).toContain("ct52")
    })

    it("en run 2, l'Apothéose (ct52) n'est JAMAIS donnée par le blackjack", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 2000)
        expect(claimBlackjackCt()).toBeNull()             // gated en ngplus
        expect(getPlayer().ownedCts).not.toContain("ct52")
    })
})
