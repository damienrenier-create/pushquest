import { describe, it, expect } from "vitest"
import { hydratePlayer, getPlayer } from "./playerStore"
import { startWildBattle, submitPlayerAction, moveCostForDisplay, getSnapshot, getBattleEnergy } from "./battleStore"
import { createMonInstance } from "../battle/factory"
import type { BadgeId } from "../data/cts"

// HARA-KIRI² (Sartay, 01/11/2026) : au tour de l'impasse, l'attaque choisie ne part jamais → son énergie est RENDUE, comme pour
// un Daemon mis K.O. avant d'agir. Avant, elle restait payée.

const B = () => getSnapshot().battle!
const msgs = () => B().events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
const BADGES: BadgeId[] = ["feu", "plante", "eau", "roche", "elec", "ancre"]
const INERT = ["tranche", "griffe_spectrale"] // Normal + Spectre : 0 dégât sur un Normal/Spectre (immunité mutuelle)
/** Impasse Shadow contre Shadow ; deux Daemons de chaque côté → le combat continue après le double K.O. */
function stalled(stallTurns: number, reps = 500, repsCap = 1000) {
    const team = [createMonInstance("shadow", 50, { moveIds: INERT }), createMonInstance("cailloutchi", 50)]
    hydratePlayer({ team, reps, repsCap, badges: BADGES, items: {} })
    startWildBattle(team, [createMonInstance("shadow", 50, { moveIds: INERT }), createMonInstance("cailloutchi", 50)], 21)
    B().stallTurns = stallTurns
}

describe("HARA-KIRI² : l'énergie de l'attaque qui ne part pas est rendue", () => {
    it("tour du HARA-KIRI² : énergie rendue, rien de compté dans le combat", () => {
        stalled(10)
        const cost = moveCostForDisplay(0)
        expect(cost).toBeGreaterThan(0)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(msgs().some((t) => t.includes("HARA-KIRI²"))).toBe(true)
        expect(B().phase).not.toBe("ended")
        expect(getPlayer().reps).toBe(500)
        expect(getBattleEnergy().spent).toBe(0)
    })
    it("solde AU-DESSUS du cap (surplus d'un cadeau souple) : rendu tel quel, jamais rogné au cap", () => {
        stalled(10, 1500, 1000)
        expect(moveCostForDisplay(0)).toBeGreaterThan(0)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(msgs().some((t) => t.includes("HARA-KIRI²"))).toBe(true)
        expect(getPlayer().reps).toBe(1500)
    })
    it("même règle pour un Daemon endormi (attaque non partie) : surplus au-dessus du cap conservé", () => {
        stalled(0, 1500, 1000)
        Object.assign(B().player.team[0], { status: "SLEEP", statusCounter: 4 })
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(B().lastPlayerActed).toBe(false)
        expect(getPlayer().reps).toBe(1500)
    })
    it("témoin : sans HARA-KIRI², l'attaque part et reste payée", () => {
        stalled(0)
        const cost = moveCostForDisplay(0)
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(msgs().some((t) => t.includes("HARA-KIRI²"))).toBe(false)
        expect(getPlayer().reps).toBe(500 - cost)
        expect(getBattleEnergy().spent).toBe(cost)
    })
})
