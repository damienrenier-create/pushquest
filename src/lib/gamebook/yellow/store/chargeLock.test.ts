import { describe, it, expect, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { hydratePlayer, getPlayer, setActiveWorld } from "./playerStore"
import { startWildBattle, submitPlayerAction, moveCostForDisplay, getSnapshot, getBattleEnergy, startPvpBattle, setPvpSendHandler } from "./battleStore"
import { createMonInstance } from "../battle/factory"
import { createBattle } from "../battle/engine"
import type { BadgeId } from "../data/cts"

// VERROU DE CHARGE côté STORE + ÉCRAN (Sartay, 01/11/2026 : « obligé de finir Tunnel ou Vol ») : en pleine charge, une autre attaque
// DEVIENT la décharge (et c'est elle qui est facturée) ; une Ball, un objet ou la fuite sont refusés SANS rien consommer.

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
afterEach(() => setActiveWorld("live"))
const B = () => getSnapshot().battle!
const msgs = () => B().events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
const BADGES: BadgeId[] = ["feu", "plante", "eau", "roche", "elec", "ancre"]
/** Gékroc sauvage-combat, déjà SOUS TERRE (Tunnel lancé au tour précédent). */
function charging(o: { items?: Record<string, number> } = {}) {
    const me = createMonInstance("gekroc", 60, { moveIds: ["tunnel", "etincelle"] })
    hydratePlayer({ team: [me], reps: 500, badges: BADGES, items: o.items ?? {} })
    startWildBattle([me], [createMonInstance("rochison", 55, { moveIds: ["mur_de_fer"] })], 11)
    Object.assign(B().player.team[0], { chargingMove: "tunnel", semiInvuln: true })
}

describe("Verrou de charge — store (solo)", () => {
    it("Ball pendant la charge : refusée, la Ball reste dans le sac, aucun tour joué", () => {
        charging({ items: { poke_ball: 3 } })
        const before = B()
        submitPlayerAction({ kind: "ball", itemId: "poke_ball" })
        expect(getPlayer().items.poke_ball).toBe(3)
        expect(B()).not.toBe(before)
        expect(B().turn).toBe(before.turn); expect(B().seed).toBe(before.seed)
        expect(msgs().some((t) => t.includes("doit finir Tunnel"))).toBe(true)
    })
    it("Potion pendant la charge : refusée, rien de consommé", () => {
        charging({ items: { potion: 2 } })
        B().player.team[0].currentHp = 20
        submitPlayerAction({ kind: "item", itemId: "potion" })
        expect(getPlayer().items.potion).toBe(2)
        expect(B().player.team[0].currentHp).toBe(20)
        expect(msgs().some((t) => t.includes("doit finir Tunnel"))).toBe(true)
    })
    it("une AUTRE attaque pendant la charge : c'est la décharge qui part, et c'est elle qui est facturée", () => {
        charging()
        const release = moveCostForDisplay(0)
        submitPlayerAction({ kind: "move", moveIndex: 1 })
        expect(getPlayer().reps).toBe(500 - release)
        expect(getBattleEnergy().spent).toBe(release)
        expect(msgs().some((t) => t.includes("jaillit du sol"))).toBe(true)
        expect(B().player.team[0].semiInvuln).toBeFalsy()
    })
    it("l'écran grise les autres attaques, le sac et la fuite pendant la charge", () => {
        const ui = read("src/app/gamebook/yellow/battle/BattleScreen.tsx")
        for (const s of ["const chargeLocked = (i: number) =>", "disabled: !canUse(pays[i]) || locked || cLocked", "disabled: !battle.isWild || !!chargingName", "right: \"en pleine charge\""]) expect(ui, s).toContain(s)
    })
})

describe("Verrou de charge — store (PvP)", () => {
    it("une autre attaque pendant la charge est ENVOYÉE comme la décharge (dernier test : laisse un contexte PvP)", () => {
        const a = createMonInstance("rochison", 50, { moveIds: ["mur_de_fer"] })
        const b = createMonInstance("aquilothan", 50, { moveIds: ["vol", "charge"] })
        hydratePlayer({ team: [b], reps: 500, badges: [], items: {} })
        const battle = createBattle([a], [b], { isWild: false, seed: 5, pvp: true })
        Object.assign(battle.enemy.team[0], { chargingMove: "vol", semiInvuln: true }) // l'invité B joue côté "enemy"
        const sent: unknown[] = []
        setPvpSendHandler((_seq, action) => { sent.push(action) })
        startPvpBattle(battle, { battleId: "t", role: "B", myUserId: "b", oppUserId: "a", oppNickname: "A" })
        submitPlayerAction({ kind: "move", moveIndex: 1 })
        expect(sent).toEqual([{ kind: "move", moveIndex: 0 }])
        setPvpSendHandler(null)
    })
})
