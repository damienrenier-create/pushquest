import { describe, it, expect } from "vitest"
import { buildHubTeam, buildMirrorTeam, type RegistryPlayer } from "./playerArena"

// VISIBILITÉ SHINY en combat contre les autres joueurs (IA) : le flag doit voyager de la save du joueur
// (registry) jusqu'à l'instance jouée par l'IA, sinon un shiny d'un autre joueur apparaissait terne.
const player = (shiny: boolean): RegistryPlayer => ({
    userId: "u1", nickname: "Testeur",
    team: [{ speciesId: "plumiot", level: 30, nickname: null, shiny }],
})

describe("playerArena — propagation du flag shiny aux équipes IA", () => {
    it("buildHubTeam (reflet EXACT) conserve le shiny", () => {
        expect(buildHubTeam(player(true))[0].shiny).toBe(true)
        expect(buildHubTeam(player(false))[0].shiny).toBeFalsy()
    })
    it("buildMirrorTeam (reflet INVERSÉ) est shiny si l'original l'était", () => {
        expect(buildMirrorTeam(player(true))[0].shiny).toBe(true)
        expect(buildMirrorTeam(player(false))[0].shiny).toBeFalsy()
    })
})
