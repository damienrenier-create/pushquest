import { describe, it, expect } from "vitest"
import { rollWildEncounter } from "./encounters"

// RATTRAPAGE run 3 en LIVE post-Ligue : les inédits run-3 sauvages redeviennent attrapables (champ + Grotte),
// gatés sur `champion` (isChampion), plafonnés pour ne jamais évoluer.

function rollGrotte(champion: boolean, n = 6000): Set<string> {
    const seen = new Set<string>()
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ mapId: "yellow_grotte", x: 5, y: 5, leadLevel: 45, champion, run3Used: true, caughtSpecies: [], rng: Math.random })
        if (m) seen.add(m.speciesId)
    }
    return seen
}

describe("Rattrapage run 3 en LIVE (post-Ligue)", () => {
    it("Grotte : Wistree rôde pour un CHAMPION, JAMAIS pour un non-champion", () => {
        expect(rollGrotte(true).has("wistree")).toBe(true)
        expect(rollGrotte(false).has("wistree")).toBe(false)
    })

    it("Champ : Otama apparaît pour un champion, plafonné ≤24 (jamais Gamaruto/Uzumaro)", () => {
        const otamaLevels: number[] = []
        const days = Array.from({ length: 20 }, (_, i) => `2026-02-${String(i + 1).padStart(2, "0")}`)
        for (const dayKey of days) {
            for (let x = 1; x <= 14; x++) for (let y = 1; y <= 18; y++) {
                for (let i = 0; i < 12; i++) {
                    const m = rollWildEncounter({ mapId: "yellow_hautes_herbes", x, y, leadLevel: 40, champion: true, run3Used: true, dayKey, caughtSpecies: [], rng: Math.random })
                    if (!m) continue
                    expect(m.speciesId).not.toBe("gamaruto") // jamais la forme évoluée au champ
                    expect(m.speciesId).not.toBe("uzumaro")
                    if (m.speciesId === "otama") otamaLevels.push(m.level)
                }
            }
        }
        expect(otamaLevels.length).toBeGreaterThan(0)
        expect(Math.max(...otamaLevels)).toBeLessThanOrEqual(24)
    })

    it("Champ : sans être champion, aucun inédit run 3 ne spawn (Otama/Hypnoppo/Karmaki)", () => {
        const seen = new Set<string>()
        const days = Array.from({ length: 12 }, (_, i) => `2026-03-${String(i + 1).padStart(2, "0")}`)
        for (const dayKey of days) {
            for (let x = 1; x <= 14; x++) for (let y = 1; y <= 18; y++) {
                for (let i = 0; i < 8; i++) {
                    const m = rollWildEncounter({ mapId: "yellow_hautes_herbes", x, y, leadLevel: 40, champion: false, run3Used: true, dayKey, caughtSpecies: [], rng: Math.random })
                    if (m) seen.add(m.speciesId)
                }
            }
        }
        for (const id of ["otama", "hypnoppo", "karmaki"]) expect(seen.has(id), id).toBe(false)
    })
})
