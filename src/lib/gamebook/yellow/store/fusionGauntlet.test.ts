import { describe, it, expect, beforeEach } from "vitest"
import { getGauntletTeam, setGauntletTeam, gauntletHasAlive, writeBackGauntlet } from "./fusionGauntlet"
import { buildFusion, disposeFusion } from "../data/fusionMon"
import { createMonInstance } from "../battle/factory"
import type { BattleMon } from "../battle/types"

// BattleMon minimal (writeBackGauntlet ne lit que uid/currentHp/status/statusCounter/moves).
function bm(o: { uid: string; currentHp: number; status?: string; statusCounter?: number; moves: { moveId: string; pp: number; ppMax: number }[] }): BattleMon {
    return o as unknown as BattleMon
}

describe("fusionGauntlet — carry PV/PP/K.O. entre salles", () => {
    beforeEach(() => setGauntletTeam(null))

    it("writeBackGauntlet recopie PV/statut/PP par uid ; gauntletHasAlive reflète les vivants", () => {
        const f = buildFusion(createMonInstance("divinpate", 60), createMonInstance("razmaree", 60))
        setGauntletTeam([f])
        expect(gauntletHasAlive()).toBe(true)
        const moves = f.instance.moves.map((m, i) => ({ moveId: m.moveId, pp: i === 0 ? 0 : m.pp, ppMax: m.ppMax }))
        writeBackGauntlet([bm({ uid: f.instance.uid, currentHp: 1, status: "PARALYSIS", statusCounter: 2, moves })])
        const g = getGauntletTeam()![0].instance
        expect(g.currentHp).toBe(1)
        expect(g.status).toBe("PARALYSIS")
        expect(g.statusCounter).toBe(2)
        expect(g.moves[0].pp).toBe(0) // PP entamé conservé pour la salle suivante
        disposeFusion(f.speciesId); setGauntletTeam(null)
    })

    it("K.O. total → gauntletHasAlive = false ; un uid inconnu est ignoré (pas de crash)", () => {
        const f = buildFusion(createMonInstance("divinpate", 60), createMonInstance("razmaree", 60))
        setGauntletTeam([f])
        writeBackGauntlet([bm({ uid: "uid-inexistant", currentHp: 99, moves: [] })]) // ignoré
        expect(gauntletHasAlive()).toBe(true) // inchangé
        writeBackGauntlet([bm({ uid: f.instance.uid, currentHp: 0, moves: f.instance.moves.map((m) => ({ moveId: m.moveId, pp: m.pp, ppMax: m.ppMax })) })])
        expect(gauntletHasAlive()).toBe(false)
        disposeFusion(f.speciesId); setGauntletTeam(null)
    })
})
