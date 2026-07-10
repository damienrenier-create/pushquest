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

    it("visibilité : déterministe + 100% des baies du jour affichées (choix Sartay : « on les voit un petit peu »)", () => {
        let visible = 0, total = 0
        for (const id of BERRY_MAP_IDS) {
            for (let d = 0; d < 300; d++) {
                for (const t of berriesForDay(id, d)) { total++; if (t.visible) visible++ }
            }
        }
        expect(visible).toBe(total) // BERRY_VISIBLE_PCT = 100 → toutes les baies du jour affichent leur icône
        // même (carte, jour) → même visibilité (stable, pas de re-tirage au refresh)
        expect(berriesForDay("yellow_route_nord", 7).map((t) => t.visible))
            .toEqual(berriesForDay("yellow_route_nord", 7).map((t) => t.visible))
        // berryAtTile reste vrai même pour une baie INVISIBLE (la récolte ne dépend pas de la visibilité)
        for (const t of berriesForDay("yellow_route_nord", 3)) {
            expect(berryAtTile("yellow_route_nord", t.x, t.y, 3)).toBe(t.berryId)
        }
    })
})
