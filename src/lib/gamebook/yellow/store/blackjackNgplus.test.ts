import { describe, it, expect, beforeEach } from "vitest"
import {
    hydratePlayer, setActiveWorld, settleBlackjack, getPlayer,
    blackjackNgplusPickPending, blackjackNgplusChoices, claimBlackjackCtNgplus, claimBlackjackCt,
} from "./playerStore"
import { emptyLabDefi } from "../data/labDefis"

beforeEach(() => {
    hydratePlayer({ reps: 0, repsCap: 999999, repsBankedTotal: 0, ownedCts: [], labDefi: emptyLabDefi() })
})

describe("BLACKJACK run 2 (NG+) — 1 CT de boss par palier de 500 ⚡", () => {
    it("un palier de 500 ⚡ ouvre 1 choix parmi les 5 CT de boss ; jamais 2× la même", () => {
        setActiveWorld("ngplus")
        expect(blackjackNgplusPickPending()).toBe(false) // aucun gain
        settleBlackjack(0, 500)                           // +500 nets
        expect(blackjackNgplusPickPending()).toBe(true)
        expect(blackjackNgplusChoices().sort()).toEqual(["ct53", "ct54", "ct55", "ct56", "ct57"])
        expect(claimBlackjackCtNgplus("ct53")).toBeTruthy()
        expect(getPlayer().ownedCts).toContain("ct53")
        expect(blackjackNgplusPickPending()).toBe(false)  // 1 seul palier consommé
        expect(blackjackNgplusChoices()).not.toContain("ct53")
        expect(claimBlackjackCtNgplus("ct53")).toBeNull() // jamais 2× la même
    })

    it("2 paliers (1000 ⚡) = 2 choix ; on ne peut pas en réclamer un 3e sans nouveau palier", () => {
        setActiveWorld("ngplus")
        settleBlackjack(0, 1000)
        expect(claimBlackjackCtNgplus("ct53")).toBeTruthy()
        expect(blackjackNgplusPickPending()).toBe(true)   // reste 1 palier
        expect(claimBlackjackCtNgplus("ct54")).toBeTruthy()
        expect(blackjackNgplusPickPending()).toBe(false)  // 2 paliers consommés
        expect(claimBlackjackCtNgplus("ct55")).toBeNull()
        expect(getPlayer().ownedCts.filter((c) => c.startsWith("ct5")).sort()).toEqual(["ct53", "ct54"])
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
