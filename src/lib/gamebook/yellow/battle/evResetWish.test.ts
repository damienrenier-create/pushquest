import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { gainEv, evTotal } from "../data/evConfig"
import { SPECIES } from "../data/species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// VŒU DU GÉNIE — « REMETTRE MES EV À ZÉRO » (Zyran)
//
// Le vœu demandait de pouvoir réinitialiser les EV. La contrepartie posée par Sartay : on ne choisit PAS qui.
// Les N prochains K.O. portés par ses Daemons remettent à zéro CELUI QUI FRAPPE, au lieu de le faire
// progresser — et une charge part même si le Daemon était déjà vierge. Il faut viser avec la composition de
// son équipe, et accepter d'en gâcher.
//
// Ce qui compte ici : que la charge se consomme UNE fois par K.O., que le Daemon soit bien vidé, que le
// compteur ne descende jamais sous zéro, et surtout qu'un joueur SANS le vœu gagne ses EV comme avant.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Un adversaire volontairement fragile : niveau 2, PV forcés à 1 → le premier coup le met à terre. */
const cible = () => {
    const id = Object.keys(SPECIES)[0]
    const m = createMonInstance(id, 2)
    m.currentHp = 1
    return m
}
/** Un Daemon DÉJÀ entraîné : on veut voir la différence entre « gagne » et « perd tout ». */
const entraine = (evAtk = 200) => {
    const id = Object.keys(SPECIES).find((k) => SPECIES[k].learnset.length > 0) ?? Object.keys(SPECIES)[0]
    const m = createMonInstance(id, 60)
    gainEv(m, "atk", evAtk)
    return m
}

/** Joue des tours jusqu'à ce que le combat se termine (ou 12 tours de garde). */
function jusquAuKo(s: BattleState): BattleState {
    for (let i = 0; i < 12 && s.phase !== "ended"; i++) s = resolveTurn(s, { kind: "move", moveIndex: 0 })
    return s
}

describe("vœu de Zyran — les EV sont remis à zéro au lieu d'être gagnés", () => {
    it("SANS le vœu : le vainqueur GAGNE des EV, comme avant (non-régression)", () => {
        const h = entraine()
        const avant = evTotal(h.ev ?? {})
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(evTotal(fin.player.team[0].ev ?? {})).toBeGreaterThanOrEqual(avant)
        expect(fin.evResetUsed ?? 0).toBe(0)
    })

    it("AVEC le vœu : le vainqueur est VIDÉ, et une charge part", () => {
        const fin = jusquAuKo(createBattle([entraine()], [cible()], { isWild: true, seed: 7, evResetCharges: 18 }))
        expect(evTotal(fin.player.team[0].ev ?? {})).toBe(0) // tout l'entraînement effacé
        expect(fin.evResetUsed).toBe(1)
        expect(fin.evResetLeft).toBe(17)
    })

    it("le joueur est PRÉVENU : un message annonce l'effacement et le solde restant", () => {
        const fin = jusquAuKo(createBattle([entraine()], [cible()], { isWild: true, seed: 7, evResetCharges: 3 }))
        const messages = fin.events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
        const annonce = messages.find((t) => t.includes("génie"))
        expect(annonce, `aucun message du génie parmi : ${messages.join(" | ")}`).toBeTruthy()
        expect(annonce).toContain("EV")       // on dit CE qui est effacé
        expect(annonce).toContain("2")        // …et combien de charges restent
        expect(fin.evResetLeft).toBe(2)
    })

    it("⚠️ une charge part MÊME si le Daemon n'avait aucun EV — c'est la contrepartie", () => {
        const vierge = entraine(0)
        expect(evTotal(vierge.ev ?? {})).toBe(0)
        const fin = jusquAuKo(createBattle([vierge], [cible()], { isWild: true, seed: 7, evResetCharges: 5 }))
        expect(fin.evResetUsed).toBe(1)
        expect(fin.evResetLeft).toBe(4)
    })

    it("à 0 charge, on repasse au gain normal — le vœu s'éteint tout seul", () => {
        const h = entraine()
        const avant = evTotal(h.ev ?? {})
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7, evResetCharges: 0 }))
        expect(evTotal(fin.player.team[0].ev ?? {})).toBeGreaterThanOrEqual(avant)
        expect(fin.evResetUsed ?? 0).toBe(0)
        expect(fin.evResetLeft).toBeUndefined()
    })

    it("le compteur ne descend jamais sous zéro", () => {
        const fin = jusquAuKo(createBattle([entraine()], [cible()], { isWild: true, seed: 7, evResetCharges: 1 }))
        expect(fin.evResetLeft).toBe(0)
        expect(fin.evResetUsed).toBe(1)
    })
})
