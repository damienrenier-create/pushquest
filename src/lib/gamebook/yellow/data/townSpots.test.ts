import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { safeWanderSpots, townReach, townDoors, type Tile } from "./townSpots"
import { YELLOW_MAPS } from "../maps"
import { isBlockingTile } from "../../mapEngine"
import { YELLOW_NPCS } from "../npcs"
import { KEY_GUARD_POS } from "./boatArena"

// PNJ baladeurs de la Ville Jaune (Vieux Sage, Fashion Victim) : signalement de DaKumba du 21/10/2026 (la Fashion
// Victim, tirée devant la porte du GYM, « bloquait l'arène »). On vérifie sur la VRAIE carte qu'aucun tirage ne bloque rien.
const m = YELLOW_MAPS["yellow_entrance"]
const START: Tile = [18, 18]
const occupied: Tile[] = [[KEY_GUARD_POS.x, KEY_GUARD_POS.y], ...YELLOW_NPCS.filter((n) => n.mapId === "yellow_entrance").map((n) => [n.initialX, n.initialY] as const)]
const k = ([x, y]: Tile) => `${x},${y}`
const reachSize = (occ: readonly Tile[]) => townReach(m, isBlockingTile, START, new Set(occ.map(k))).length
const doors = townDoors(m)

describe("Ville Jaune : où poser le Sage et la Fashion Victim sans rien bloquer", () => {
    const base = safeWanderSpots(m, isBlockingTile, START, occupied)
    const full = reachSize(occupied)

    it("le point de départ du calcul est libre, et il reste beaucoup de cases possibles", () => {
        expect(occupied.map(k)).not.toContain(k(START))
        expect(base.length).toBeGreaterThan(200)
    })
    it("jamais sur une porte ni sur les 8 cases autour (devant le GYM : rien en 35,10 · 36,11 · 35,11 · 37,11)", () => {
        for (const [x, y] of base) for (const [dx, dy] of doors) expect(Math.max(Math.abs(dx - x), Math.abs(dy - y)), `${x},${y}`).toBeGreaterThan(1)
        for (const t of ["35,10", "36,11", "35,11", "37,11"]) expect(base.map(k)).not.toContain(t)
    })
    it("un PNJ seul, n'importe où dans la liste, ne coupe jamais la ville (toutes les portes restent accessibles)", () => {
        for (const s of base) expect(reachSize([...occupied, s]), k(s)).toBe(full - 1)
    })
    it("le Sage et la Fashion Victim ensemble ne bouchent jamais un passage", () => {
        for (let i = 0; i < base.length; i += 30) {
            const sage = base[i]
            const fv = safeWanderSpots(m, isBlockingTile, START, [...occupied, sage])
            expect(fv.map(k)).not.toContain(k(sage))
            for (let j = 0; j < fv.length; j += 6) expect(reachSize([...occupied, sage, fv[j]]), `${k(sage)} + ${k(fv[j])}`).toBe(full - 2)
        }
    }, 30_000)
    it("le jeu utilise ces règles pour les deux baladeurs (la Fashion Victim évite la case du Sage)", () => {
        const gs = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/store/gameStore.ts"), "utf8")
        expect(gs).toContain("safeWanderSpots(YELLOW_MAPS[YELLOW_ENTRANCE_MAP_ID], isBlockingTile, VILLE_JAUNE_SPOT_START, occupied)")
        expect(gs).toContain("const fashionSpots = villeJauneSageSpots(sageTile ? [sageTile] : [])")
    })
})
