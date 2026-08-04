import { describe, it, expect } from "vitest"
import { hydratePlayer, setActiveWorld, setFusionLeagueCarry } from "./playerStore"
import { restoreFusionGauntletFromCarry } from "./gameStore"
import { getGauntletTeam, setGauntletTeam, swapGauntletTeam, reorderGauntletMoves } from "./fusionGauntlet"
import { buildFusion } from "../data/fusionMon"
import { createMonInstance } from "../battle/factory"

// LIGUE DE FUSION — reprise au reload : restoreFusionGauntletFromCarry reconstruit l'équipe depuis le roster + ré-applique
// l'usure persistée (PV/statut/PP), matchée par PAIRE DE PARENTS (clé stable au reload). Fail-safe si carry absent / tous K.O.
const setupTeam = () => {
    setGauntletTeam(null)
    const a = createMonInstance("feuillichot", 30, { owned: true })
    const b = createMonInstance("gouttiny", 30, { owned: true })
    hydratePlayer({ team: [a, b], pc: [], fusionRoster: [{ a: a.uid, b: b.uid }] } as never)
    setActiveWorld("live")
    return { a, b }
}

describe("Ligue de Fusion — reprise au reload (carry)", () => {
    it("reconstruit l'équipe-gauntlet ABÎMÉE depuis le carry (match par paire de parents)", () => {
        const { a, b } = setupTeam()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 7, status: "NONE", statusCounter: 0, pp: {} }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(true)
        const gt = getGauntletTeam()
        expect(gt?.length).toBe(1)
        expect(gt![0].instance.currentHp).toBe(7) // usure restaurée, PAS soigné à fond
    })

    it("pas de carry → false (repli Autel)", () => {
        setGauntletTeam(null)
        hydratePlayer({ team: [], pc: [], fusionRoster: [] } as never)
        setActiveWorld("live")
        setFusionLeagueCarry(null)
        expect(restoreFusionGauntletFromCarry()).toBe(false)
    })

    it("toutes les fusions K.O. dans le carry → false (fail-safe, on renverra à l'Autel)", () => {
        const { a, b } = setupTeam()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 0, status: "NONE", statusCounter: 0, pp: {}, moves: [] }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(false)
    })

    it("swapGauntletTeam échange l'ordre de combat de 2 fusionnés", () => {
        setGauntletTeam(null)
        const a1 = createMonInstance("feuillichot", 30, { owned: true }), b1 = createMonInstance("gouttiny", 30, { owned: true })
        const a2 = createMonInstance("braisille", 30, { owned: true }), b2 = createMonInstance("plumiot", 30, { owned: true })
        const f1 = buildFusion(a1, b1), f2 = buildFusion(a2, b2)
        setGauntletTeam([f1, f2])
        expect(getGauntletTeam()![0].instance.uid).toBe(f1.instance.uid)
        expect(swapGauntletTeam(f1.instance.uid, f2.instance.uid)).toBe(true)
        expect(getGauntletTeam()![0].instance.uid).toBe(f2.instance.uid)
    })

    it("reorderGauntletMoves réordonne les attaques d'un fusionné", () => {
        setGauntletTeam(null)
        const a = createMonInstance("feuillichot", 40, { owned: true }), b = createMonInstance("gouttiny", 40, { owned: true })
        const f = buildFusion(a, b); setGauntletTeam([f])
        const before = f.instance.moves.map((m) => m.moveId)
        if (before.length >= 2) {
            expect(reorderGauntletMoves(f.instance.uid, 0, 1)).toBe(true)
            const after = getGauntletTeam()![0].instance.moves.map((m) => m.moveId)
            expect(after[0]).toBe(before[1])
            expect(after[1]).toBe(before[0])
        }
    })

    it("le carry restaure l'ORDRE des attaques choisi par le joueur", () => {
        setGauntletTeam(null)
        const a = createMonInstance("feuillichot", 40, { owned: true }), b = createMonInstance("gouttiny", 40, { owned: true })
        hydratePlayer({ team: [a, b], pc: [], fusionRoster: [{ a: a.uid, b: b.uid }] } as never)
        setActiveWorld("live")
        const probe = buildFusion(a, b)
        const reversed = [...probe.instance.moves.map((m) => m.moveId)].reverse()
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 12, status: "NONE", statusCounter: 0, pp: {}, moves: reversed }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(true)
        expect(getGauntletTeam()![0].instance.moves.map((m) => m.moveId)).toEqual(reversed)
    })
})
