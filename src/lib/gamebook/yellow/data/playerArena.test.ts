import { describe, it, expect } from "vitest"
import {
    teamMaxLevel, rankClosest, buildHubTeam, bestCounterType, strongestSpeciesOfType,
    mirrorName, buildMirrorTeam, ARENA_OPPONENTS, hasAllBadges, ALL_BADGES, ARENA_MAPS, ARENA_POSITIONS,
    type RegistryPlayer,
} from "./playerArena"
import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"

function player(userId: string, lvl: number, team: RegistryPlayer["team"] = [{ speciesId: "feuillichot", level: lvl, nickname: null }]): RegistryPlayer {
    return { userId, nickname: userId, team }
}

describe("Arène joueurs — classement par niveau", () => {
    it("teamMaxLevel = niveau du plus haut", () => {
        expect(teamMaxLevel([{ speciesId: "x", level: 12, nickname: null }, { speciesId: "y", level: 30, nickname: null }])).toBe(30)
    })

    it("rankClosest : exclut soi, équipe vide, et garde les N plus proches (déterministe)", () => {
        const players = [
            player("me", 40),
            player("a", 38), player("b", 50), player("c", 41), player("d", 10),
            player("e", 39), player("f", 42), player("g", 40),
            { userId: "vide", nickname: "vide", team: [] },
        ]
        const r = rankClosest(players, "me", 40, ARENA_OPPONENTS)
        expect(r.length).toBe(6)
        expect(r.some((p) => p.userId === "me")).toBe(false)   // pas soi
        expect(r.some((p) => p.userId === "vide")).toBe(false) // pas d'équipe vide
        expect(r[0].userId).toBe("g")  // d=0
        expect(r.some((p) => p.userId === "d")).toBe(false)    // d=30 → trop loin, hors du top 6
    })
})

describe("Arène joueurs — déblocage & placement", () => {
    it("hasAllBadges exige les 5 badges", () => {
        expect(hasAllBadges(["feu", "plante", "eau", "roche", "elec"])).toBe(true)
        expect(hasAllBadges(["feu", "plante", "eau", "roche"])).toBe(false) // manque élec
        expect(hasAllBadges([])).toBe(false)
        expect(ALL_BADGES.length).toBe(5)
    })

    it("chaque arène a assez de cases libres pour les 6 adversaires", () => {
        for (const mapId of Object.keys(ARENA_MAPS)) {
            expect(ARENA_POSITIONS[mapId]?.length, mapId).toBeGreaterThanOrEqual(ARENA_OPPONENTS)
        }
        expect(ARENA_MAPS["yellow_arena_eau"]).toBe("hub")
        expect(ARENA_MAPS["yellow_arena_elec"]).toBe("mirror")
    })
})

describe("Arène joueurs — HUB (vraies équipes)", () => {
    it("buildHubTeam reproduit l'équipe réelle (espèces + niveaux + surnoms)", () => {
        const p = player("a", 30, [
            { speciesId: "feuillichot", level: 28, nickname: "Bébou" },
            { speciesId: "braisille", level: 30, nickname: null },
        ])
        const team = buildHubTeam(p)
        expect(team.map((m) => m.speciesId)).toEqual(["feuillichot", "braisille"])
        expect(team[0].level).toBe(28)
        expect(team[0].nickname).toBe("Bébou")
    })
})

describe("Arène joueurs — MIROIR (faiblesses)", () => {
    it("bestCounterType trouve la faiblesse (mono + double type)", () => {
        expect(bestCounterType(["NORMAL"])).toBe("COMBAT")
        expect(bestCounterType(["EAU"])).toBe("PLANTE")   // PLANTE avant ELEC dans POKE_TYPES
        expect(bestCounterType(["FEU"])).toBe("EAU")
        // double faiblesse → 4× : PLANTE+POISON est ravagé par INSECTE (2×2)
        expect(typeEffectiveness(bestCounterType(["PLANTE", "POISON"]), ["PLANTE", "POISON"])).toBe(4)
    })

    it("strongestSpeciesOfType renvoie une espèce réelle du bon type primaire", () => {
        const id = strongestSpeciesOfType("FEU")
        expect(getSpecies(id)).toBeTruthy()
        expect(getSpecies(id)!.types[0]).toBe("FEU")
        expect(getSpecies(id)!.hiddenUntilCaught).toBeFalsy() // jamais un légendaire/caché
    })

    it("mirrorName inverse le texte", () => {
        expect(mirrorName("Eva")).toBe("avE")
    })

    it("buildMirrorTeam : ordre inversé + chaque Daemon battu par sa faiblesse + niveau conservé + nom à l'envers", () => {
        const p = player("a", 30, [
            { speciesId: "feuillichot", level: 20, nickname: "Vert" },  // PLANTE
            { speciesId: "braisille", level: 25, nickname: null },       // FEU
        ])
        const mir = buildMirrorTeam(p)
        expect(mir.length).toBe(2)
        // ordre inversé : le 1er miroir contre le DERNIER de l'équipe (braisille = FEU)
        const first = getSpecies(mir[0].speciesId)!
        expect(typeEffectiveness(first.types[0], ["FEU"])).toBeGreaterThanOrEqual(2)
        expect(mir[0].level).toBe(25) // niveau conservé
        // 2e miroir contre feuillichot (PLANTE) + surnom "Vert" → "treV"
        const second = getSpecies(mir[1].speciesId)!
        expect(typeEffectiveness(second.types[0], ["PLANTE"])).toBeGreaterThanOrEqual(2)
        expect(mir[1].nickname).toBe("treV")
    })
})
