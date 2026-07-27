import { describe, it, expect } from "vitest"
import { TRAINER_SIGHTS, sightTiles, trainerSpotting, type TrainerSightSpec } from "./trainerSight"
import { TRAINERS } from "./trainers"
import { YELLOW_MAPS } from "../maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"

const RAOUL = "y_trainer_raoul"
const never = () => false

/** Prédicat de blocage réel de la carte (hors carte = bloqué). */
function mapBlocker(mapId: string) {
    const map = YELLOW_MAPS[mapId]
    return (x: number, y: number) => {
        const t = map.tiles[y]?.[x]
        return !t || isBlockingTile(t)
    }
}

describe("champ de vision des dresseurs", () => {
    it("chaque ligne de mire pointe un dresseur existant, posé au même endroit", () => {
        for (const spec of TRAINER_SIGHTS) {
            const trainer = TRAINERS.find((t) => t.id === spec.trainerId)
            expect(trainer, `dresseur ${spec.trainerId} absent de TRAINERS`).toBeTruthy()
            expect(trainer!.mapId, spec.trainerId).toBe(spec.mapId)
            expect([trainer!.x, trainer!.y], spec.trainerId).toEqual([spec.x, spec.y])
            expect(spec.range).toBeGreaterThan(0)
        }
    })

    it("RAOUL surveille les 4 cases sous lui, toutes praticables", () => {
        const spec = TRAINER_SIGHTS.find((s) => s.trainerId === RAOUL)!
        const tiles = sightTiles(spec, mapBlocker(spec.mapId))
        expect(tiles.length).toBe(4)                                  // aucun obstacle ne tronque le couloir
        expect(tiles.map((t) => t.y)).toEqual([15, 16, 17, 18])
        expect(tiles.every((t) => t.x === 12)).toBe(true)
    })

    it("il est bien à une dizaine de cases sous l'entrée de la grotte", () => {
        const spec = TRAINER_SIGHTS.find((s) => s.trainerId === RAOUL)!
        const caveExit = YELLOW_MAPS[spec.mapId].exits!.find((e) => e.targetMapId === "yellow_grotte")!
        expect(spec.x).toBe(caveExit.x)                                // même colonne
        expect(spec.y - caveExit.y).toBe(11)                           // 11 cases plus bas
    })

    it("repère le joueur de 1 à 4 cases devant, mais pas au-delà ni derrière", () => {
        const spec = TRAINER_SIGHTS.find((s) => s.trainerId === RAOUL)!
        const blocked = mapBlocker(spec.mapId)
        const spot = (x: number, y: number) => trainerSpotting(spec.mapId, x, y, blocked, never)?.trainerId ?? null
        expect(spot(12, 15)).toBe(RAOUL)      // juste devant
        expect(spot(12, 18)).toBe(RAOUL)      // limite de portée
        expect(spot(12, 19)).toBeNull()       // 5 cases → hors de vue
        expect(spot(12, 13)).toBeNull()       // derrière lui
        expect(spot(11, 16)).toBeNull()       // colonne voisine
        expect(spot(13, 16)).toBeNull()
        expect(spot(12, 14)).toBeNull()       // sa propre case
    })

    it("ne repère plus rien une fois battu", () => {
        const spec = TRAINER_SIGHTS.find((s) => s.trainerId === RAOUL)!
        const blocked = mapBlocker(spec.mapId)
        expect(trainerSpotting(spec.mapId, 12, 16, blocked, (id) => id === RAOUL)).toBeNull()
    })

    it("ignore les autres cartes", () => {
        const spec = TRAINER_SIGHTS.find((s) => s.trainerId === RAOUL)!
        expect(trainerSpotting("yellow_entrance", spec.x, spec.y + 1, () => false, never)).toBeNull()
    })

    it("un obstacle coupe la ligne de mire", () => {
        const spec: TrainerSightSpec = { trainerId: RAOUL, mapId: "test", x: 5, y: 5, facing: "down", range: 8 }
        const tiles = sightTiles(spec, (_x, y) => y === 8)             // mur en (5,8)
        expect(tiles.map((t) => t.y)).toEqual([6, 7])
    })

    it("gère les 4 directions", () => {
        const at = (facing: TrainerSightSpec["facing"]) =>
            sightTiles({ trainerId: "x", mapId: "m", x: 10, y: 10, facing, range: 2 }, never)
        expect(at("down")).toEqual([{ x: 10, y: 11 }, { x: 10, y: 12 }])
        expect(at("up")).toEqual([{ x: 10, y: 9 }, { x: 10, y: 8 }])
        expect(at("left")).toEqual([{ x: 9, y: 10 }, { x: 8, y: 10 }])
        expect(at("right")).toEqual([{ x: 11, y: 10 }, { x: 12, y: 10 }])
    })
})

describe("GUETTEUR RAOUL — mécanique de niveaux identique à Léo/Mia", () => {
    const raoul = TRAINERS.find((t) => t.id === RAOUL)!
    const leo = TRAINERS.find((t) => t.id === "y_trainer_leo")!
    const mia = TRAINERS.find((t) => t.id === "y_trainer_mia")!

    it("scale avec les badges comme les 2 autres rivaux de route", () => {
        expect(raoul.scaleWithBadges).toBe(true)
        expect([leo.scaleWithBadges, mia.scaleWithBadges]).toEqual([true, true])
        expect(raoul.aiLevel).toBe(leo.aiLevel)
        expect(raoul.badge).toBeUndefined()      // pas un boss → palier "guard" comme Léo/Mia
        expect(raoul.training).toBeUndefined()
    })

    it("félicite le joueur après sa défaite, sans écraser sa réplique de revisite", () => {
        expect(raoul.victory?.length).toBeGreaterThan(0)
        expect(raoul.defeat.length).toBeGreaterThan(0)
        expect(raoul.victory).not.toEqual(raoul.defeat)   // 2 moments distincts : post-combat vs revisite
    })

    it("garde des dialogues courts : 3 étapes maximum de part et d'autre du combat", () => {
        expect(raoul.intro.length).toBeLessThanOrEqual(3)
        expect(raoul.victory!.length).toBeLessThanOrEqual(3)
        expect(raoul.defeat.length).toBeLessThanOrEqual(3)
    })

    it("ses Daemons diffèrent de ceux de Léo et Mia", () => {
        const others = new Set([...leo.team, ...mia.team].map((m) => m.speciesId))
        expect(raoul.team.length).toBe(2)
        for (const m of raoul.team) expect(others.has(m.speciesId), m.speciesId).toBe(false)
    })
})
