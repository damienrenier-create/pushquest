import { describe, it, expect, beforeEach } from "vitest"
import { createBattle, resolveTurn, resolveTurnPvp } from "./engine"
import { createMonInstance } from "./factory"
import { hydratePlayer, recordPvpDamage, getPlayer, emptyPvpStats } from "../store/playerStore"

// COMPTEUR DE DÉGÂTS PvP (réputation : top-5 « plus gros dégâts »). Vérifie : accumulation par attaquant/camp
// dans le moteur (PvP UNIQUEMENT), déterminisme préservé (les 2 clients calculent à l'identique → pas de désync),
// PvE intact (dmgByAttacker absent), et le merge côté store.

function freshPvp(seed = 12345) {
    const a = [createMonInstance("feuillichot", 20), createMonInstance("plumiot", 20)]
    const b = [createMonInstance("cailloutchi", 20)]
    return createBattle(a, b, { isWild: false, seed, pvp: true })
}
const MOVE0 = { kind: "move" as const, moveIndex: 0 }

describe("pvpStats.dmgByDaemon — accumulateur de dégâts PvP", () => {
    it("PvP : les dégâts sont cumulés par attaquant (speciesId) et par camp", () => {
        const s = resolveTurnPvp(freshPvp(), MOVE0, MOVE0)
        expect(s.dmgByAttacker).toBeDefined()
        // Les deux Daemons de tête ont attaqué → chacun a infligé des dégâts dans SON camp.
        expect(s.dmgByAttacker!.player.feuillichot ?? 0).toBeGreaterThan(0)
        expect(s.dmgByAttacker!.enemy.cailloutchi ?? 0).toBeGreaterThan(0)
    })

    it("le total cumulé = les PV réellement perdus par le camp adverse (attribution exacte)", () => {
        const before = freshPvp()
        const enemyHp0 = before.enemy.team[0].currentHp
        const s = resolveTurnPvp(before, MOVE0, MOVE0)
        const enemyLost = enemyHp0 - s.enemy.team[0].currentHp
        // 1 seul tour, un seul attaquant côté joueur → les dégâts qu'il a infligés = les PV perdus par l'ennemi.
        expect(s.dmgByAttacker!.player.feuillichot).toBe(enemyLost)
    })

    it("DÉTERMINISTE : même seed → dmgByAttacker strictement identique (hors checksum, aucune désync)", () => {
        const s1 = resolveTurnPvp(freshPvp(777), MOVE0, MOVE0)
        const s2 = resolveTurnPvp(freshPvp(777), MOVE0, MOVE0)
        expect(s1.dmgByAttacker).toEqual(s2.dmgByAttacker)
    })

    it("PvE (solo) : dmgByAttacker reste ABSENT (le compteur est PvP-only)", () => {
        const a = [createMonInstance("feuillichot", 20)]
        const b = [createMonInstance("cailloutchi", 20)]
        const solo = createBattle(a, b, { isWild: true, seed: 12345, pvp: false })
        const s = resolveTurn(solo, MOVE0)
        expect(s.dmgByAttacker).toBeUndefined()
    })

    it("recordPvpDamage : merge additif par speciesId, ignore les valeurs nulles/négatives", () => {
        hydratePlayer({ team: [], reps: 0, pvpStats: emptyPvpStats() })
        recordPvpDamage({ feuillichot: 120, cailloutchi: 40 })
        recordPvpDamage({ feuillichot: 30, plumiot: 0, badger: -5 })
        const d = getPlayer().pvpStats.dmgByDaemon
        expect(d.feuillichot).toBe(150)
        expect(d.cailloutchi).toBe(40)
        expect(d.plumiot).toBeUndefined()
        expect(d.badger).toBeUndefined()
    })
})
