import { describe, it, expect, afterEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { hydratePlayer, getPlayer, setActiveWorld } from "./playerStore"
import { startWildBattle, submitPlayerAction, moveCostForDisplay, getSnapshot, getBattleEnergy, startPvpBattle, setPvpSendHandler } from "./battleStore"
import { createMonInstance } from "../battle/factory"
import { createBattle } from "../battle/engine"
import { getItem } from "../data/items"
import { VANISH_LINES } from "../battle/vanish"

// RANCŒUR CÉLESTE côté STORE + ÉCRAN (Sartay, 01/11/2026) : ce qui se paie, ce qui se refuse, ce qui s'affiche.
//   · le lancement coûte comme Repos ; un lancement raté (10 %) et une action cachée ratée (1 sur 2) se paient : jamais remboursés ;
//   · viser un sauvage invisible ou relancer en étant invisible : refus LISIBLE, rien de consommé, aucun tour joué.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
afterEach(() => setActiveWorld("live"))
const B = () => getSnapshot().battle!
const msgs = () => B().events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
function fight(o: { moves?: string[]; seed?: number; items?: Record<string, number>; reps?: number } = {}) {
    const me = createMonInstance("namizeus", 60, { moveIds: o.moves ?? ["rancoeur_celeste", "ball_ombre"] })
    // 6 badges : aucun risque de désobéissance (sinon l'attaque ne part pas et le store la rembourse — autre règle).
    hydratePlayer({ team: [me], reps: o.reps ?? 500, badges: ["feu", "plante", "eau", "roche", "elec", "ancre"], items: o.items ?? {} })
    startWildBattle([me], [createMonInstance("namizeus", 55, { moveIds: ["mirage"] })], o.seed ?? 11)
}

describe("Rancœur Céleste — énergie", () => {
    it("le lancement coûte EXACTEMENT comme Repos (affichage = débit)", () => {
        fight({ moves: ["rancoeur_celeste", "repos"] })
        expect(moveCostForDisplay(0)).toBeGreaterThan(0)
        expect(moveCostForDisplay(0)).toBe(moveCostForDisplay(1))
    })
    it("un lancement raté (10 %) se paie : pas de remboursement", () => {
        let seen = 0
        for (let seed = 1; seed <= 120 && seen < 2; seed++) {
            fight({ seed }); const cost = moveCostForDisplay(0)
            submitPlayerAction({ kind: "move", moveIndex: 0 })
            if (!msgs().includes(VANISH_LINES.castFail("Namizeus"))) continue
            seen++
            expect(getPlayer().reps).toBe(500 - cost)
            expect(getBattleEnergy().spent).toBe(cost)
            expect(B().lastPlayerActed).toBe(true)
        }
        expect(seen).toBeGreaterThan(0)
    })
    it("une action cachée ratée (1 fois sur 2) se paie ; réussie, elle se paie aussi et touche", () => {
        let fails = 0, hits = 0
        for (let seed = 1; seed <= 40; seed++) {
            fight({ seed }); B().player.team[0].vanishTurns = 3
            const cost = moveCostForDisplay(1), foeHp = B().enemy.team[0].currentHp
            submitPlayerAction({ kind: "move", moveIndex: 1 })
            expect(getPlayer().reps, `seed ${seed}`).toBe(500 - cost)
            if (msgs().includes(VANISH_LINES.reappearFail("Namizeus", "Ball'Ombre"))) { fails++; expect(B().enemy.team[0].currentHp).toBe(foeHp); expect(B().events.some((e) => e.kind === "move" && e.side === "player")).toBe(false) }
            else if (msgs().includes(VANISH_LINES.reappear("Namizeus"))) hits++
        }
        expect(fails).toBeGreaterThan(5); expect(hits).toBeGreaterThan(5)
    })
    it("idem au run 3 (concours) : l'action cachée ratée n'est pas rendue", () => {
        setActiveWorld("run3")
        let fails = 0
        for (let seed = 1; seed <= 30; seed++) {
            fight({ seed }); B().player.team[0].vanishTurns = 3
            const cost = moveCostForDisplay(1)
            submitPlayerAction({ kind: "move", moveIndex: 1 })
            if (msgs().includes(VANISH_LINES.reappearFail("Namizeus", "Ball'Ombre"))) { fails++; expect(getPlayer().reps).toBe(500 - cost) }
        }
        expect(fails).toBeGreaterThan(0)
    })
})

describe("Rancœur Céleste — refus lisibles (rien de consommé, aucun tour)", () => {
    it("Ball sur un sauvage invisible : la Ball reste dans le sac, l'état ne bouge pas, un message s'affiche ; visible, elle part", () => {
        fight({ items: { poke_ball: 3 } }); B().enemy.team[0].vanishTurns = 3
        const before = B()
        submitPlayerAction({ kind: "ball", itemId: "poke_ball" })
        expect(getPlayer().items.poke_ball).toBe(3)
        expect(B()).not.toBe(before) // nouvel objet → l'écran rejoue le message et rend la main
        expect(B().turn).toBe(before.turn); expect(B().seed).toBe(before.seed); expect(B().outcome).toBe(before.outcome)
        expect(B().events).toEqual([{ kind: "message", text: VANISH_LINES.ballRefused("Namizeus", getItem("poke_ball")!.name) }])
        B().enemy.team[0].vanishTurns = undefined
        submitPlayerAction({ kind: "ball", itemId: "poke_ball" })
        expect(getPlayer().items.poke_ball).toBe(2)
    })
    it("relancer Rancœur Céleste en étant invisible : rien n'est facturé, aucun tour, un message s'affiche", () => {
        fight(); B().player.team[0].vanishTurns = 3
        const before = B()
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(getPlayer().reps).toBe(500); expect(getBattleEnergy().spent).toBe(0)
        expect(B()).not.toBe(before); expect(B().turn).toBe(before.turn); expect(B().seed).toBe(before.seed)
        expect(B().events).toEqual([{ kind: "message", text: VANISH_LINES.recastRefused("Namizeus") }])
    })
})

describe("Rancœur Céleste — câblage de l'écran et du PvP", () => {
    it("l'écran masque le sprite sur l'event `vanish`, grise la relance et les Balls, affiche « INVISIBLE »", () => {
        const ui = read("src/app/gamebook/yellow/battle/BattleScreen.tsx")
        for (const s of ["ev.kind === \"vanish\"", "veiled={pVeiled}", "veiled={eVeiled}", "opacity: veiled ? 0 : 1", "disabled: !canUse(pays[i]) || locked",
            "VANISH_UI.menuLocked", "VANISH_UI.ballRowHint", "disabled: ballLocked || foeVeiled", "VANISH_UI.infoTag"]) expect(ui, s).toContain(s)
        expect(read("src/app/gamebook/yellow/MovesPanel.tsx")).toContain("fx.vanish")
    })
    it("PvP : l'event `vanish` change de camp chez l'invité (sinon il masquerait le mauvais Daemon)", () => {
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toMatch(/case "switchIn":\s*\r?\n\s*case "vanish":/)
    })
    it("PvP : relancer en étant invisible → refus LOCAL, rien n'est envoyé à l'adversaire (dernier test : laisse un contexte PvP)", () => {
        const a = createMonInstance("namizeus", 60, { moveIds: ["rancoeur_celeste", "ball_ombre"] })
        const b = createMonInstance("namizeus", 60, { moveIds: ["rancoeur_celeste", "ball_ombre"] })
        hydratePlayer({ team: [b], reps: 500, badges: [], items: {} })
        const battle = createBattle([a], [b], { isWild: false, seed: 5, pvp: true })
        battle.enemy.team[0].vanishTurns = 3 // l'invité B joue côté "enemy"
        const sent: unknown[] = []
        setPvpSendHandler((_seq, action) => { sent.push(action) })
        startPvpBattle(battle, { battleId: "t", role: "B", myUserId: "b", oppUserId: "a", oppNickname: "A" })
        const before = B()
        submitPlayerAction({ kind: "move", moveIndex: 0 })
        expect(sent).toEqual([])
        expect(getSnapshot().pvpCtx?.myAction).toBeNull()
        expect(B()).not.toBe(before)
        expect(B().events).toEqual([{ kind: "message", text: VANISH_LINES.recastRefused("Namizeus") }])
        setPvpSendHandler(null)
    })
})
