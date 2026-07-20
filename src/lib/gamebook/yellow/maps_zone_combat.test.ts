import { describe, it, expect } from "vitest"
import { YELLOW_MAPS } from "./maps"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"

// Zone de Combat : garde-fous de traversabilité (spawn bas atteignable, passage, portes des 3 salles).
describe("Zone de Combat — map", () => {
    const z = YELLOW_MAPS["yellow_zone_combat"]
    const walkable = (x: number, y: number) => !isBlockingTile(z.tiles[y][x])

    it("spawn bas + passage central + sortie sud walkables", () => {
        expect(walkable(10, 12)).toBe(true) // spawn (arrivée sud)
        expect(walkable(9, 12)).toBe(true)  // passage
        expect(walkable(10, 13)).toBe(true) // ouverture sud (path)
        expect(walkable(9, 13)).toBe(true)
    })

    it("barrière ligne 12 (hors passage) + colonnes 1 & 18 bloquées", () => {
        expect(walkable(5, 12)).toBe(false)
        expect(walkable(15, 12)).toBe(false)
        for (let y = 2; y <= 11; y++) { expect(walkable(1, y), `col1 y${y}`).toBe(false); expect(walkable(18, y), `col18 y${y}`).toBe(false) }
    })

    it("portes des 3 salles en exits : tour (4,7) · usine (9,6)+(10,6) · dôme (15,6)", () => {
        const door = (x: number, y: number) => (z.exits ?? []).some((e) => e.x === x && e.y === y && e.targetMapId?.startsWith("yellow_combat_"))
        expect(door(4, 7)).toBe(true)
        expect(door(9, 6)).toBe(true)
        expect(door(10, 6)).toBe(true)
        expect(door(15, 6)).toBe(true)
    })

    it("sortie sud vers Ville Jaune (cols 9-10, ligne 13)", () => {
        const south = (z.exits ?? []).filter((e) => e.targetMapId === "yellow_entrance" && e.y === 13)
        expect(south.map((e) => e.x).sort((a, b) => a - b)).toEqual([9, 10])
    })
})

// AUTEL DE LA CHIMÈRE (salle de fusion) : map + entrée depuis le hub + collisions cohérentes (autel bloqué, PNJ libre).
describe("Autel de la Chimère — salle de fusion", () => {
    const z = YELLOW_MAPS["yellow_zone_combat"]
    const autel = YELLOW_MAPS["yellow_combat_autel"]
    const blocked = (m: typeof autel, x: number, y: number) => isBlockingTile(m.tiles[y][x])

    it("la map existe (18×10, sprite fusion) + sortie retour vers le hub sur une case walkable", () => {
        expect(autel).toBeDefined()
        expect([autel.width, autel.height]).toEqual([18, 10])
        expect(autel.backgroundImage ?? "").toContain("fusion_altar")
        const back = (autel.exits ?? []).find((e) => e.targetMapId === "yellow_zone_combat")
        expect(back).toBeDefined()
        expect(blocked(autel, back!.x, back!.y)).toBe(false) // case de sortie praticable
    })

    it("l'entrée depuis le hub cible la salle, sur une case walkable, avec spawn walkable", () => {
        const entry = (z.exits ?? []).find((e) => e.targetMapId === "yellow_combat_autel")
        expect(entry).toBeDefined()
        expect(isBlockingTile(z.tiles[entry!.y][entry!.x])).toBe(false)         // (13,9) accessible dans le hub
        expect(blocked(autel, entry!.targetSpawnX, entry!.targetSpawnY)).toBe(false) // spawn (9,8) pas dans un mur
    })

    it("autel central MARCHABLE (couloir vers la Ligue) · entrée Ligue (8,1)(9,1) · murs du décor · 2e porte hub", () => {
        // L'autel de combat (7-10 × 4-6) est MARCHABLE : c'est le seul couloir vertical vers la porte haute
        //   (les parois latérales scellent tout contournement). Combat via le PNJ 🧬 (9,6), interaction depuis (9,7).
        expect(blocked(autel, 8, 5)).toBe(false)
        expect(blocked(autel, 9, 4)).toBe(false)
        expect(blocked(autel, 9, 7)).toBe(false) // devant l'autel
        // Entrée LIGUE (seuil de la porte à dragons) marchable.
        expect(blocked(autel, 8, 1)).toBe(false)
        expect(blocked(autel, 9, 1)).toBe(false)
        // Murs du décor (encadrement de la porte + parois cascades) bloqués.
        expect(blocked(autel, 7, 1)).toBe(true)
        expect(blocked(autel, 10, 1)).toBe(true)
        expect(blocked(autel, 5, 5)).toBe(true)
        expect(blocked(autel, 12, 5)).toBe(true)
        // Double porte basse (sortie hub) : (8,9)+(9,9) ouvertes.
        expect(blocked(autel, 8, 9)).toBe(false)
        expect(blocked(autel, 9, 9)).toBe(false)
    })
})
