import { describe, it, expect, beforeEach } from "vitest"
import {
    hydratePlayer, setActiveWorld, settleBlackjack, getPlayer,
    blackjackNgplusPickPending, blackjackNgplusChoices, claimBlackjackCtNgplus, claimBlackjackCt,
} from "./playerStore"
import { shopCatalogCtIds } from "../data/cts"
import { emptyLabDefi } from "../data/labDefis"

beforeEach(() => {
    hydratePlayer({ reps: 0, repsCap: 999999, repsBankedTotal: 0, ownedCts: [], labDefi: emptyLabDefi() })
})

describe("BLACKJACK run 2 (NG+) — récompense UNIQUE : 1 CT du magasin au choix", () => {
    it("dès 500 ⚡ nets : 1 choix parmi TOUT le catalogue magasin, réclamable une seule fois", () => {
        setActiveWorld("ngplus")
        expect(blackjackNgplusPickPending()).toBe(false) // rien gagné encore
        settleBlackjack(0, 500)                          // +500 nets → seuil atteint
        expect(blackjackNgplusPickPending()).toBe(true)

        const choices = blackjackNgplusChoices()
        expect(choices).toEqual(shopCatalogCtIds())      // rien possédé → tout le catalogue magasin
        expect(choices).toContain("ct01")                // CT universelle vendue
        expect(choices).not.toContain("ct52")            // Apothéose (gift) → jamais
        expect(choices).not.toContain("ct53")            // CT de boss (gift) → jamais

        expect(claimBlackjackCtNgplus("ct01")).toBeTruthy()
        expect(getPlayer().ownedCts).toContain("ct01")
        expect(blackjackNgplusPickPending()).toBe(false)         // one-shot consommé
        expect(blackjackNgplusChoices()).not.toContain("ct01")   // possédée → plus proposée
    })

    it("une seule fois pour TOUT le run 2 : plus aucun lot même en gagnant beaucoup plus", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 2000)
        expect(claimBlackjackCtNgplus("ct01")).toBeTruthy()
        expect(blackjackNgplusPickPending()).toBe(false)  // verrouillé
        expect(claimBlackjackCtNgplus("ct02")).toBeNull() // pas de 2e pick
        settleBlackjack(0, 5000)                          // encore plus de gains…
        expect(blackjackNgplusPickPending()).toBe(false)  // …toujours rien
        expect(getPlayer().ownedCts.filter((c) => shopCatalogCtIds().includes(c))).toEqual(["ct01"])
    })

    it("on ne peut pas réclamer une CT hors magasin (cadeau/boss/labo)", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 500)
        expect(claimBlackjackCtNgplus("ct53")).toBeNull() // CT de boss (gift)
        expect(claimBlackjackCtNgplus("ct52")).toBeNull() // Apothéose (gift)
        expect(blackjackNgplusPickPending()).toBe(true)   // rien consommé
    })

    it("sous le seuil (< 500 ⚡) : rien à réclamer", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 400)
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
