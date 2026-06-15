import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { CTS, canLearnCt } from "../data/cts"
import { buildGekroc } from "../data/gekroc"

describe("GÉKROC — espèce, Tunnel (dig), capture, masquage", () => {
    it("espèce : SOL/ÉLEC, dex 126, learnsAllCts + hiddenUntilCaught, connaît Tunnel", () => {
        const g = getSpecies("gekroc")!
        expect(g).toBeTruthy()
        expect(g.types).toEqual(["SOL", "ELEC"])
        expect(g.dexNo).toBe(126)
        expect(g.learnsAllCts).toBe(true)
        expect(g.hiddenUntilCaught).toBe(true)
        expect(g.catchRate).toBe(10)
        expect(g.learnset.some((l) => l.moveId === "tunnel")).toBe(true)
    })

    it("Goshendofy est aussi masqué du Pokédex tant que non capturé", () => {
        expect(getSpecies("goshendofy")!.hiddenUntilCaught).toBe(true)
    })

    it("learnsAllCts : Gékroc peut apprendre TOUTES les CT (tous types)", () => {
        const g = getSpecies("gekroc")!
        expect(CTS.every((ct) => canLearnCt(g, ct))).toBe(true)
    })

    it("move Tunnel : SOL, power 50, effet dig", () => {
        const t = getMove("tunnel")!
        expect(t.type).toBe("SOL")
        expect(t.power).toBe(50)
        expect(t.effect?.dig).toBe(true)
    })

    it("buildGekroc : N35, 4 moves attendus, capture DURE (×0.6) sans statut requis", () => {
        const g = buildGekroc()
        expect(g.level).toBe(35)
        const ids = g.moves.map((m) => m.moveId).sort()
        expect(ids).toEqual(["etincelle", "repos", "tunnel", "vive_attaque"])
        const cfg = g as unknown as { captureMult?: number; captureRequiresStatus?: boolean }
        expect(cfg.captureMult).toBe(0.6)
        expect(cfg.captureRequiresStatus).toBeFalsy() // ≠ légendaire
    })

    it("Tunnel (dig) : tour 1 = sous terre (invulnérable, l'ennemi rate), tour 2 = jaillit et frappe", () => {
        const gek = createMonInstance("gekroc", 50)            // rapide vs l'ennemi → creuse en 1er
        const tunnelIdx = gek.moves.findIndex((m) => m.moveId === "tunnel")
        expect(tunnelIdx).toBeGreaterThanOrEqual(0)
        const enemy = createMonInstance("cailloutchi", 20)     // lent + faible → tape après, et rate
        let s = createBattle([gek], [enemy], { isWild: true, seed: 4242 })
        const enemyHp0 = s.enemy.team[0].currentHp
        const myHp0 = s.player.team[0].currentHp

        // TOUR 1 : on creuse
        s = resolveTurn(s, { kind: "move", moveIndex: tunnelIdx })
        expect(s.player.team[0].semiInvuln).toBe(true)             // sous terre
        expect(s.player.team[0].chargingMove).toBe("tunnel")       // verrouillé sur l'émergence
        expect(s.enemy.team[0].currentHp).toBe(enemyHp0)           // aucun dégât infligé au tour 1
        expect(s.player.team[0].currentHp).toBe(myHp0)             // l'attaque ennemie a manqué (sous terre)

        // TOUR 2 : on ressort et on frappe (la charge force l'action)
        s = resolveTurn(s, { kind: "move", moveIndex: 0 })
        expect(s.player.team[0].semiInvuln).toBeFalsy()            // ressorti
        expect(s.enemy.team[0].currentHp).toBeLessThan(enemyHp0)   // a touché en jaillissant
    })
})
