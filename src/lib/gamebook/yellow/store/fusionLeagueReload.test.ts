import { describe, it, expect } from "vitest"
import { hydratePlayer, setActiveWorld, setFusionLeagueCarry } from "./playerStore"
import { restoreFusionGauntletFromCarry } from "./gameStore"
import { getGauntletTeam, setGauntletTeam } from "./fusionGauntlet"
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
        setFusionLeagueCarry(JSON.stringify({ team: [{ a: a.uid, b: b.uid, hp: 0, status: "NONE", statusCounter: 0, pp: {} }] }))
        expect(restoreFusionGauntletFromCarry()).toBe(false)
    })
})
