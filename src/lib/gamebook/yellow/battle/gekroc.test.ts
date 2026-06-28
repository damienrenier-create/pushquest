import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import { getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { CTS, canLearnCt } from "../data/cts"
import { buildGekroc } from "../data/gekroc"
import { hydratePlayer, getPlayer, evolvePantheonWithStone } from "../store/playerStore"
import { getPokedex, hydratePokedex, markCaught } from "../store/pokedexStore"
import { startWildBattle } from "../store/battleStore"

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
        // Le boss N35 a maintenant une vraie attaque physique SOL (Secousse, STAB → atk 92) au lieu
        // de Vive-Attaque : la factory prend les 4 dernières attaques ≤35 (slice(-4)).
        expect(ids).toEqual(["etincelle", "repos", "secousse", "tunnel"])
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

describe("GÉKROC — Part B : la Pierre fait évoluer Panthéon (choix du type)", () => {
    it("évolue Panthéon vers la panthère choisie, consomme la Pierre, entre au Pokédex", () => {
        hydratePokedex({ seen: [], caught: [] })
        const p = createMonInstance("pantheon", 30, { owned: true })
        hydratePlayer({ team: [p], items: { pierre_gekroc: 1 } })
        const res = evolvePantheonWithStone(p.uid, "pyropanthe")
        expect(res).toBeTruthy()
        expect(res!.toId).toBe("pyropanthe")
        expect(getPlayer().team[0].speciesId).toBe("pyropanthe")
        expect(getPlayer().items["pierre_gekroc"]).toBe(0)         // Pierre consommée
        expect(getPokedex().caught).toContain("pyropanthe")
    })

    it("refuse : sans Pierre / pas un Panthéon / cible invalide", () => {
        const p1 = createMonInstance("pantheon", 30, { owned: true })
        hydratePlayer({ team: [p1], items: {} })
        expect(evolvePantheonWithStone(p1.uid, "pyropanthe")).toBeNull() // pas de pierre

        const p2 = createMonInstance("plumiot", 30, { owned: true })
        hydratePlayer({ team: [p2], items: { pierre_gekroc: 1 } })
        expect(evolvePantheonWithStone(p2.uid, "pyropanthe")).toBeNull() // pas un Panthéon

        const p3 = createMonInstance("pantheon", 30, { owned: true })
        hydratePlayer({ team: [p3], items: { pierre_gekroc: 1 } })
        expect(evolvePantheonWithStone(p3.uid, "plumiot")).toBeNull()    // cible non panthère
        expect(getPlayer().items["pierre_gekroc"]).toBe(1)              // pierre NON consommée si refus
    })
})

describe("GÉKROC / Goshendofy — masquage Pokédex (surprise)", () => {
    it("rencontre sauvage : une espèce hiddenUntilCaught n'est PAS marquée « vue »", () => {
        hydratePokedex({ seen: [], caught: [] })
        hydratePlayer({ team: [createMonInstance("plumiot", 20, { owned: true })] })
        startWildBattle(getPlayer().team, [createMonInstance("gekroc", 35)], 123)
        expect(getPokedex().seen).not.toContain("gekroc") // masqué : surprise
        // sanity : une espèce NON masquée, elle, est bien vue à la rencontre
        startWildBattle(getPlayer().team, [createMonInstance("cailloutchi", 20)], 124)
        expect(getPokedex().seen).toContain("cailloutchi")
        expect(getPokedex().seen).not.toContain("gekroc") // toujours masqué
    })

    it("capture : markCaught révèle l'espèce (vue ET capturée)", () => {
        hydratePokedex({ seen: [], caught: [] })
        markCaught("goshendofy")
        expect(getPokedex().caught).toContain("goshendofy")
        expect(getPokedex().seen).toContain("goshendofy") // la capture force aussi le « vu »
    })
})
