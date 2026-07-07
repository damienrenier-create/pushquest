import { describe, it, expect } from "vitest"
import {
    BERRY_TREE_SPOTS,
    BERRY_MAP_IDS,
    BERRIES_PER_MAP_PER_DAY,
    berriesForDay,
    berryAtTile,
} from "./berryTrees"
import { BERRY_IDS } from "./heldItems"

describe("arbres fertiles (récolte quotidienne de baies)", () => {
    it("30 arbres candidats uniques par carte, sur route nord + ville jaune uniquement", () => {
        expect(BERRY_MAP_IDS.sort()).toEqual(["yellow_entrance", "yellow_route_nord"])
        for (const id of BERRY_MAP_IDS) {
            const spots = BERRY_TREE_SPOTS[id]
            expect(spots.length, id).toBe(30)
            const keys = new Set(spots.map((s) => `${s.x},${s.y}`))
            expect(keys.size, `${id} doublons`).toBe(30)
        }
    })

    it("chaque jour : exactement 3 arbres/carte, coords valides, baies valides", () => {
        for (const id of BERRY_MAP_IDS) {
            const valid = new Set(BERRY_TREE_SPOTS[id].map((s) => `${s.x},${s.y}`))
            for (const day of [0, 1, 100, 20250, 99999]) {
                const trees = berriesForDay(id, day)
                expect(trees.length, `${id} j${day}`).toBe(BERRIES_PER_MAP_PER_DAY)
                const seen = new Set<string>()
                for (const t of trees) {
                    expect(valid.has(`${t.x},${t.y}`), `spot ${t.x},${t.y}`).toBe(true)
                    expect(BERRY_IDS as readonly string[]).toContain(t.berryId)
                    seen.add(`${t.x},${t.y}`)
                }
                expect(seen.size, "3 arbres distincts").toBe(3)
            }
        }
    })

    it("déterministe : même (carte, jour) → même tirage ; jours différents → tirages différents", () => {
        const a = berriesForDay("yellow_route_nord", 42)
        const b = berriesForDay("yellow_route_nord", 42)
        expect(a).toEqual(b)
        // Sur un échantillon de jours, on doit voir plus d'un motif (pas de blocage sur un seul set).
        const patterns = new Set(
            [0, 1, 2, 3, 4, 5, 6, 7].map((d) =>
                berriesForDay("yellow_route_nord", d).map((t) => `${t.x},${t.y}`).sort().join("|"),
            ),
        )
        expect(patterns.size).toBeGreaterThan(1)
    })

    it("berryAtTile : renvoie la baie sur un arbre porteur, null ailleurs", () => {
        const trees = berriesForDay("yellow_entrance", 7)
        const t0 = trees[0]
        expect(berryAtTile("yellow_entrance", t0.x, t0.y, 7)).toBe(t0.berryId)
        // Une tuile non-arbre / non-porteuse → null.
        expect(berryAtTile("yellow_entrance", 999, 999, 7)).toBeNull()
        // Carte inconnue → null.
        expect(berryAtTile("yellow_cendreville", 21, 0, 7)).toBeNull()
    })
})
