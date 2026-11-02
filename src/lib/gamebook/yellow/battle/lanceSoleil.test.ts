import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createBattle, resolveTurn, resolveTurnPvp, toBattleMon, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { chooseAiAction } from "./ai"
import { Rng } from "./rng"
import { getMove } from "../data/moves"
import { MP_VERSION } from "../multiplayer/mp"

// LANCE-SOLEIL (Sartay, 01/11/2026 : bug « frappe deux fois », corrigé selon sa description) : tour 1 = absorbe la lumière (AUCUN
// dégât, ne rate jamais), tour 2 = le rayon frappe à 120. Avant : il frappait à 120 dès le tour 1, PUIS libérait la décharge à 100
// de Surtension (avec son texte), dont il partageait le mécanisme. Surtension, elle, ne change pas.

const P = (s: BattleState) => s.player.team[s.player.activeIndex]
const E = (s: BattleState) => s.enemy.team[s.enemy.activeIndex]
const msgs = (s: BattleState) => s.events.filter((e) => e.kind === "message").map((e) => (e as { text: string }).text)
const said = (s: BattleState, part: string) => msgs(s).some((t) => t.includes(part))
const MOVE = (i: number) => ({ kind: "move" as const, moveIndex: i })
/** Thundah (le plus rapide du jeu) face à Tonytony (Normal, PV énormes) qui ne fait que se renforcer — ou creuser (`foeMoves`). */
function duel(moves: string[], seed = 7, foeMoves = ["mur_de_fer"]): BattleState {
    const me = createMonInstance("thundah", 50, { owned: true, ivs: 8, moveIds: moves })
    const foe = createMonInstance("tonytony", 50, { ivs: 8, moveIds: foeMoves })
    return createBattle([me], [foe], { isWild: false, seed, aiLevel: "trainer" })
}

describe("Lance-Soleil : charge au tour 1, frappe au tour 2", () => {
    it("tour 1 : absorbe la lumière — aucun dégât, le Daemon est verrouillé", () => {
        const s0 = duel(["lance_soleil", "charge"])
        const hp = E(s0).currentHp
        const s = resolveTurn(s0, MOVE(0))
        expect(E(s).currentHp).toBe(hp)
        expect(P(s).chargingMove).toBe("lance_soleil")
        expect(said(s, "absorbe la lumière")).toBe(true)
        expect(said(s, "surtension")).toBe(false)
    })
    it("tour 2 : le rayon part (même si une autre attaque est choisie) et frappe ; le verrou tombe", () => {
        let s = resolveTurn(duel(["lance_soleil", "charge"]), MOVE(0))
        const hp = E(s).currentHp
        s = resolveTurn(s, MOVE(1))
        expect(said(s, "libère son rayon solaire")).toBe(true)
        expect(said(s, "libère sa décharge")).toBe(false)
        expect(E(s).currentHp).toBeLessThan(hp)
        expect(P(s).chargingMove).toBeUndefined()
    })
    it("UN seul coup sur les deux tours (avant : 120 au tour 1, puis 100 au tour 2)", () => {
        let s = duel(["lance_soleil"])
        let hits = 0
        for (let t = 0; t < 2; t++) {
            const hp = E(s).currentHp
            s = resolveTurn(s, MOVE(0))
            if (E(s).currentHp < hp) hits++
        }
        expect(hits).toBe(1)
    })
    it("le rayon frappe à 120 : à tirage égal, plus fort que la décharge à 100 de Surtension", () => {
        // Mimimoy (Normal) contre Tonytony (Normal) : ni STAB ni faiblesse pour Plante comme pour Élec ; seule la puissance diffère.
        const release = (moveId: string) => {
            const me = createMonInstance("mimimoy", 50, { owned: true, ivs: 8, moveIds: [moveId] })
            const foe = createMonInstance("tonytony", 50, { ivs: 8, moveIds: ["mur_de_fer"] })
            const s0 = createBattle([me], [foe], { isWild: false, seed: 11, aiLevel: "trainer" })
            Object.assign(s0.player.team[0], { chargingMove: moveId })
            const hp = s0.enemy.team[0].currentHp
            return hp - E(resolveTurn(s0, MOVE(0))).currentHp
        }
        const ray = release("lance_soleil"), bolt = release("surtension")
        expect(bolt).toBeGreaterThan(0)
        expect(ray / bolt).toBeGreaterThan(1.1) // 120 contre 100 : ≈ 1,2 (pas 100 contre 100, ni contre une décharge à 40)
        expect(ray / bolt).toBeLessThan(1.4)
    })
    it("la charge ne rate jamais, même précision au plancher contre une esquive au plafond", () => {
        for (let seed = 1; seed <= 20; seed++) {
            const s0 = duel(["lance_soleil"], seed)
            P(s0).stages.acc = -6; E(s0).stages.eva = 6
            const s = resolveTurn(s0, MOVE(0))
            expect(P(s).chargingMove, `seed ${seed}`).toBe("lance_soleil")
            expect(said(s, "rate son attaque"), `seed ${seed}`).toBe(false)
        }
    })
    it("la fiche décrit enfin ce qui se passe : 120, en deux temps", () => {
        const m = getMove("lance_soleil")!
        expect(m.power).toBe(120)
        expect(m.effect?.twoTurn).toBe(true)
        expect(m.effect?.solarCharge).toBe(true)
        expect(m.description).toContain("Tour 1 : absorbe la lumière")
    })
})

describe("Lance-Soleil face à une cible cachée (sous terre, en vol, invisible)", () => {
    it("la charge marche contre une cible sous terre ; rien n'est « hors d'atteinte »", () => {
        const s0 = duel(["lance_soleil"], 7, ["tunnel"])
        Object.assign(E(s0), { semiInvuln: true, chargingMove: "tunnel" })
        const s = resolveTurn(s0, MOVE(0))
        expect(P(s).chargingMove).toBe("lance_soleil")
        expect(said(s, "hors d'atteinte")).toBe(false)
    })
    it("le rayon manque une cible encore cachée, et le verrou tombe (pas de charge bloquée)", () => {
        const s0 = duel(["lance_soleil"], 7, ["tunnel"])
        Object.assign(P(s0), { chargingMove: "lance_soleil" })
        Object.assign(E(s0), { semiInvuln: true, chargingMove: "tunnel" })
        const s = resolveTurn(s0, MOVE(0))
        expect(said(s, "hors d'atteinte")).toBe(true)
        expect(P(s).chargingMove).toBeUndefined()
    })
    it("contre un Namizeus invisible : la charge marche, puis le rayon traverse l'orage s'il l'est encore (verrou levé)", () => {
        // Rochison (Roche/Sol) : l'Élec de Namizeus ne lui fait rien ; Namizeus caché 4 tours, son action cachée est Mur de Fer.
        const nami = createMonInstance("namizeus", 60, { ivs: 8, moveIds: ["rancoeur_celeste", "mur_de_fer"] })
        Object.assign(nami, { vanishTurns: 4 })
        const me = createMonInstance("rochison", 60, { owned: true, ivs: 8, moveIds: ["lance_soleil"] })
        let s = resolveTurn(createBattle([me], [nami], { isWild: false, seed: 2, aiLevel: "trainer" }), MOVE(0))
        expect(P(s).chargingMove).toBe("lance_soleil")
        expect(said(s, "traverse l'orage")).toBe(false)
        s = resolveTurn(s, MOVE(0))
        expect(said(s, "traverse l'orage")).toBe(true)
        expect(P(s).chargingMove).toBeUndefined()
    })
    it("le menu le dit : contre une cible invisible, la préparation de Lance-Soleil marche", () => {
        const ui = fs.readFileSync(path.join(process.cwd(), "src/app/gamebook/yellow/battle/BattleScreen.tsx"), "utf8")
        expect(ui).toContain("mv.effect?.solarCharge) && player.chargingMove !== slot.moveId ? VANISH_UI.menuFoeCharge")
    })
})

describe("Lance-Soleil dans les mains de l'ordinateur (solo)", () => {
    it("tour 1 : il charge sans frapper ; tour 2 : le rayon part tout seul", () => {
        const me = createMonInstance("tonytony", 50, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })
        const foe = createMonInstance("thundah", 50, { ivs: 8, moveIds: ["lance_soleil"] })
        let s = createBattle([me], [foe], { isWild: false, seed: 5, aiLevel: "trainer" })
        const hp0 = P(s).currentHp
        s = resolveTurn(s, MOVE(0))
        expect(P(s).currentHp).toBe(hp0)
        expect(E(s).chargingMove).toBe("lance_soleil")
        expect(said(s, "absorbe la lumière")).toBe(true)
        s = resolveTurn(s, MOVE(0))
        expect(said(s, "libère son rayon solaire")).toBe(true)
        expect(P(s).currentHp).toBeLessThan(hp0)
        expect(E(s).chargingMove).toBeUndefined()
    })
})

describe("Surtension : inchangée", () => {
    it("tour 1 : frappe (40) et ralentit, puis tour 2 : la décharge part", () => {
        const s0 = duel(["surtension"])
        const hp = E(s0).currentHp
        let s = resolveTurn(s0, MOVE(0))
        expect(E(s).currentHp).toBeLessThan(hp)
        expect(E(s).stages.spe).toBe(-2)
        expect(said(s, "accumule une surtension")).toBe(true)
        s = resolveTurn(s, MOVE(0))
        expect(said(s, "libère sa décharge")).toBe(true)
        expect(P(s).chargingMove).toBeUndefined()
    })
})

describe("IA : Lance-Soleil n'achève jamais ce tour-ci", () => {
    const pick = (moves: string[]) => {
        const self = toBattleMon(createMonInstance("thundah", 60, { ivs: 8, moveIds: moves }))
        const foe = toBattleMon(createMonInstance("possyl", 40, { ivs: 8 }))
        foe.currentHp = 1
        const c = chooseAiAction(self, foe, [self], 0, "hof", new Rng(7))
        return c.kind === "move" ? self.moves[c.moveIndex ?? 0].moveId : c.kind
    }
    it("cible à 1 PV : le Daemon finit avec un vrai coup au lieu de charger (scorer « hof »)", () => {
        expect(pick(["lance_soleil", "charge"])).toBe("charge")
    })
    it("idem pour le pilote d'archétype (kit avec soin : « finir » d'abord)", () => {
        expect(pick(["lance_soleil", "charge", "repos"])).toBe("charge")
    })
})

describe("PvP : Lance-Soleil identique sur les deux clients", () => {
    it("l'invité B charge puis frappe ; deux résolutions du même état donnent le même résultat", () => {
        const a = createMonInstance("possyl", 50, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })
        const b = createMonInstance("thundah", 50, { owned: true, ivs: 8, moveIds: ["lance_soleil", "charge"] })
        const s0 = createBattle([a], [b], { isWild: false, seed: 3, pvp: true })
        const run = () => resolveTurnPvp(resolveTurnPvp(s0, MOVE(0), MOVE(0)), MOVE(0), MOVE(1))
        const s1 = run(), s2 = run()
        expect(JSON.stringify(s1)).toBe(JSON.stringify(s2))
        expect(said(s1, "libère son rayon solaire")).toBe(true)
        expect(s1.player.team[0].currentHp).toBeLessThan(s0.player.team[0].currentHp)
        expect(s1.enemy.team[0].chargingMove).toBeUndefined()
        expect(MP_VERSION).not.toBe("mp-2026-11-01.4") // 01/11 : Lance-Soleil ne frappe plus deux fois
    })
    it("le joueur A (côté « player ») aussi : rien au tour 1, le rayon au tour 2", () => {
        const a = createMonInstance("thundah", 50, { owned: true, ivs: 8, moveIds: ["lance_soleil", "charge"] })
        const b = createMonInstance("tonytony", 50, { owned: true, ivs: 8, moveIds: ["mur_de_fer"] })
        const s0 = createBattle([a], [b], { isWild: false, seed: 3, pvp: true })
        const s1 = resolveTurnPvp(s0, MOVE(0), MOVE(0))
        expect(s1.enemy.team[0].currentHp).toBe(s0.enemy.team[0].currentHp)
        expect(s1.player.team[0].chargingMove).toBe("lance_soleil")
        const s2 = resolveTurnPvp(s1, MOVE(1), MOVE(0))
        expect(said(s2, "libère son rayon solaire")).toBe(true)
        expect(s2.enemy.team[0].currentHp).toBeLessThan(s0.enemy.team[0].currentHp)
        expect(s2.player.team[0].chargingMove).toBeUndefined()
    })
})
