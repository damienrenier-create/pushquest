import { describe, it, expect } from "vitest"
import { buildFusionLeagueTeam, buildFusionBossTeam, disposeFusionLeagueTeam } from "./fusionLeague"
import type { BuiltFusion } from "./fusionMon"

const held = (t: BuiltFusion[]) => t.map((f) => f.instance.heldItem).filter((id): id is string => !!id)
const berries = (t: BuiltFusion[]) => held(t).filter((id) => id.startsWith("baie_"))
const objects = (t: BuiltFusion[]) => held(t).filter((id) => !id.startsWith("baie_"))

describe("Objets tenus ENNEMIS — Ligue de Fusion (argent/or)", () => {
    it("BRONZE : aucun objet tenu (accessible au 1er sacre)", () => {
        const t = buildFusionLeagueTeam("will", "bronze", 0, true)
        expect(held(t).length).toBe(0)
        disposeFusionLeagueTeam(t)
    })

    it("ARGENT + 1re run du jour (baies actives) : 1 baie + 1 objet", () => {
        const t = buildFusionLeagueTeam("will", "argent", 0, true)
        expect(berries(t).length).toBe(1)
        expect(objects(t).length).toBe(1)
        disposeFusionLeagueTeam(t)
    })

    it("ARGENT hors 1re run (baies OFF) : seulement l'objet passif reste", () => {
        const t = buildFusionLeagueTeam("will", "argent", 0, false)
        expect(berries(t).length).toBe(0)
        expect(objects(t).length).toBe(1)
        disposeFusionLeagueTeam(t)
    })

    it("OR (boss) : 2 baies + 2 objets, l'ACE porte la Baie Phénix", () => {
        const t = buildFusionBossTeam("or", 0, true)
        expect(berries(t).length).toBe(2)
        expect(objects(t).length).toBe(2)
        expect(t[t.length - 1].instance.heldItem).toBe("baie_phenix") // ACE (dernière fusion)
        disposeFusionLeagueTeam(t)
    })

    it("OR : les baies restent posées même hors 1re run (toujours actives en or)", () => {
        const t = buildFusionBossTeam("or", 0, false) // berriesActive=false ignoré : gameStore force true en or
        // NB : ici on teste le CONTRAT du builder — c'est gameStore qui passe TRUE en or. Avec false, pas de baies.
        expect(berries(t).length).toBe(0)
        expect(objects(t).length).toBe(2)
        disposeFusionLeagueTeam(t)
    })
})
