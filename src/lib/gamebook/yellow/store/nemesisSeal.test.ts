import { describe, it, expect, beforeEach } from "vitest"
import { hydratePlayer, getPlayer, resetForIntro, evolvePantheonWithStone } from "./playerStore"
import { nemesisRewardBlockedMarker } from "../data/nemesisChallenge"
import { GEKROC_STONE_ITEM } from "../data/gekroc"
import { createMonInstance } from "../battle/factory"

// SCEAU DU NÉMÉSIS — un défi némésis PERDU pose `<espèce>_blocked` (battleStore). « Plus JAMAIS » vaut pour la
// Pierre Gékroc aussi : évoluer un Panthéon vers la panthère scellée doit être refusé (et l'option est grisée en
// UI). Les autres panthères restent accessibles ; sans marqueur, rien ne change.
const setup = (markers: string[] = []) => {
    resetForIntro()
    hydratePlayer({
        team: [createMonInstance("pantheon", 40, { owned: true })],
        items: { [GEKROC_STONE_ITEM]: 2 },
        defeatedTrainers: markers,
    })
}

describe("Sceau du némésis — Pierre Gékroc", () => {
    beforeEach(() => setup())

    it("sans sceau : le Panthéon évolue normalement en Voltapanthe", () => {
        const uid = getPlayer().team[0].uid
        const res = evolvePantheonWithStone(uid, "voltapanthe")
        expect(res).not.toBeNull()
        expect(getPlayer().team[0].speciesId).toBe("voltapanthe")
    })

    it("voltapanthe scellée (défi perdu) : l'évolution ÉLEC est refusée, la pierre n'est pas consommée", () => {
        setup([nemesisRewardBlockedMarker("voltapanthe")])
        const uid = getPlayer().team[0].uid
        expect(evolvePantheonWithStone(uid, "voltapanthe")).toBeNull()
        expect(getPlayer().team[0].speciesId).toBe("pantheon")                 // pas évolué
        expect(getPlayer().items[GEKROC_STONE_ITEM]).toBe(2)                   // pierre intacte
    })

    it("le sceau est PAR ESPÈCE : voltapanthe bloquée n'empêche pas d'évoluer en Pyropanthe", () => {
        setup([nemesisRewardBlockedMarker("voltapanthe")])
        const uid = getPlayer().team[0].uid
        const res = evolvePantheonWithStone(uid, "pyropanthe")
        expect(res).not.toBeNull()
        expect(getPlayer().team[0].speciesId).toBe("pyropanthe")
    })

    it("cohérence Mools : pyropanthe scellée (s'il perdait SON défi) bloque aussi la voie Pierre → Pyropanthe", () => {
        setup([nemesisRewardBlockedMarker("pyropanthe")])
        const uid = getPlayer().team[0].uid
        expect(evolvePantheonWithStone(uid, "pyropanthe")).toBeNull()
    })
})
