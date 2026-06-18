import { describe, it, expect } from "vitest"
import {
    teamMaxLevel, rankClosest, buildHubTeam, bestCounterType, strongestSpeciesOfType,
    mirrorName, buildMirrorTeam, pickMirrorCounter, ARENA_OPPONENTS, hasAllBadges, ALL_BADGES, ARENA_MAPS, ARENA_POSITIONS,
    ROAMING_ARENA_MAPS, roamingSpots, type RegistryPlayer,
} from "./playerArena"
import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { YELLOW_MAPS } from "../maps"
import { isBlockingTile } from "../../mapEngine"

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

    it("placement : arènes FIXES ont assez de cases ; les reflets roament en Ville Jaune", () => {
        for (const mapId of Object.keys(ARENA_MAPS)) {
            if (ROAMING_ARENA_MAPS.has(mapId)) continue // positions tirées dynamiquement (roamingSpots)
            expect(ARENA_POSITIONS[mapId]?.length, mapId).toBeGreaterThanOrEqual(ARENA_OPPONENTS)
        }
        expect(ARENA_MAPS[YELLOW_ENTRANCE_MAP_ID]).toBe("mirror")        // reflets en Ville Jaune
        expect(ROAMING_ARENA_MAPS.has(YELLOW_ENTRANCE_MAP_ID)).toBe(true) // pop aléatoire
        expect(ARENA_MAPS["yellow_arena_eau"]).toBeUndefined()           // plus d'IA dans l'arène eau
    })

    it("roamingSpots : N cases walkable DISTINCTES, dans les bornes, hors murs (déterministe)", () => {
        let s = 42
        const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 } // LCG simple, sûr
        const spots = roamingSpots(YELLOW_ENTRANCE_MAP_ID, ARENA_OPPONENTS, rand)
        expect(spots.length).toBe(ARENA_OPPONENTS)
        expect(new Set(spots.map(([x, y]) => `${x},${y}`)).size).toBe(ARENA_OPPONENTS) // toutes distinctes
        const m = YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID]
        for (const [x, y] of spots) {
            expect(x >= 0 && x < m.width && y >= 0 && y < m.height, `${x},${y} hors bornes`).toBe(true)
            expect(isBlockingTile(m.tiles[y][x]), `${x},${y} bloquante`).toBe(false)
        }
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

    it("buildMirrorTeam : ordre inversé + chaque Daemon battu par sa faiblesse + niveau conservé", () => {
        const p = player("a", 30, [
            { speciesId: "feuillichot", level: 20, nickname: "Vert" },  // PLANTE
            { speciesId: "braisille", level: 25, nickname: null },       // FEU
        ])
        const mir = buildMirrorTeam(p)
        expect(mir.length).toBe(2)
        // ordre inversé : le 1er miroir contre le DERNIER de l'équipe (braisille = FEU)
        const first = getSpecies(mir[0].speciesId)!
        expect(Math.max(...first.types.map((t) => typeEffectiveness(t, ["FEU"])))).toBeGreaterThanOrEqual(2)
        expect(mir[0].level).toBe(25) // niveau conservé
        // 2e miroir contre feuillichot (PLANTE)
        const second = getSpecies(mir[1].speciesId)!
        expect(Math.max(...second.types.map((t) => typeEffectiveness(t, ["PLANTE"])))).toBeGreaterThanOrEqual(2)
        // RÈGLE : on N'inverse PAS le nom du Daemon (c'est le pseudo de l'adversaire qui s'inverse).
        expect(mir[1].nickname).toBeUndefined()
    })

    it("buildMirrorTeam : JAMAIS deux fois la même espèce (dédup), même à faiblesse partagée", () => {
        const p = player("a", 40, [
            { speciesId: "feuillichot", level: 40, nickname: null }, // PLANTE
            { speciesId: "florapanthe", level: 40, nickname: null }, // PLANTE
            { speciesId: "gloutanoir", level: 40, nickname: null },  // PLANTE
        ])
        const mir = buildMirrorTeam(p)
        const ids = mir.map((m) => m.speciesId)
        expect(ids.length).toBe(3)
        expect(new Set(ids).size).toBe(3) // tous distincts
    })

    it("pickMirrorCounter : BST ÉQUIVALENT (plus proche que le contre le plus fort)", () => {
        const def = "braisille" // FEU, BST faible (bébé)
        const counter = pickMirrorCounter(def, new Set())
        const bst = (id: string) => { const b = getSpecies(id)!.baseStats; return b.hp + b.atk + b.def + b.spe + b.spc }
        const target = bst(def)
        const strongest = strongestSpeciesOfType(bestCounterType(getSpecies(def)!.types))
        // le contre choisi est au moins aussi proche en BST que l'ancien « plus fort » — et c'est une faiblesse.
        expect(Math.abs(bst(counter) - target)).toBeLessThanOrEqual(Math.abs(bst(strongest) - target))
        expect(Math.max(...getSpecies(counter)!.types.map((t) => typeEffectiveness(t, getSpecies(def)!.types)))).toBeGreaterThanOrEqual(2)
    })
})
