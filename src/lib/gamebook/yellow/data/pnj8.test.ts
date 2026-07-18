import { describe, it, expect } from "vitest"
import { buildPnj8Team, pnj8Level, inPnj8Block, PNJ8_BASE_LEVEL } from "./pnj8"
import { getMove } from "./moves"

describe("PNJ 8 — gardien de la Grotte du Nexus (meute des 5 Gek)", () => {
    it("scaling du niveau : base 75, +2/victoire, plafonné à 100", () => {
        expect(pnj8Level(0)).toBe(75)
        expect(pnj8Level(1)).toBe(77)
        expect(pnj8Level(5)).toBe(85)
        expect(pnj8Level(12)).toBe(99)
        expect(pnj8Level(13)).toBe(100) // 75 + 26 = 101 → plafonné
        expect(pnj8Level(50)).toBe(100) // reste plafonné
        expect(PNJ8_BASE_LEVEL).toBe(75)
    })

    it("équipe de 5 Gek, Geaucké en LEAD (team[0]) au bon niveau", () => {
        const team = buildPnj8Team(0)
        expect(team).toHaveLength(5)
        expect(team[0].speciesId).toBe("geaucke")
        expect(team.map((m) => m.speciesId)).toEqual(["geaucke", "gekroc", "gekraise", "gekosmic", "geckebre"])
        for (const m of team) expect(m.level).toBe(75)
        expect(buildPnj8Team(5)[0].level).toBe(85) // niveau scalé
    })

    it("openings scriptés : Geaucké ouvre sur Osmose, Gékroc sur Cage Éclair", () => {
        const team = buildPnj8Team(0)
        const geaucke = team.find((m) => m.speciesId === "geaucke")!
        const gekroc = team.find((m) => m.speciesId === "gekroc")!
        expect((geaucke as { openingMoves?: string[] }).openingMoves).toEqual(["osmose"])
        expect((gekroc as { openingMoves?: string[] }).openingMoves).toEqual(["cage_eclair"])
        // Les autres Gek n'ont pas d'ouverture forcée.
        expect((team.find((m) => m.speciesId === "gekraise") as { openingMoves?: string[] }).openingMoves).toBeUndefined()
    })

    it("EV : 252 sur EXACTEMENT les 2 stats d'expertise de chaque Gek (≤ cap 510), Saiyan présent", () => {
        const team = buildPnj8Team(0)
        const expect2Stats: Record<string, [string, string]> = {
            geaucke: ["spe", "atk"], gekroc: ["def", "spc"], gekraise: ["atk", "hp"],
            gekosmic: ["spc", "spe"], geckebre: ["hp", "def"],
        }
        for (const m of team) {
            const ev = (m as { ev?: Record<string, number> }).ev ?? {}
            const alloc = (m as { allocated?: Record<string, number> }).allocated ?? {}
            const [s1, s2] = expect2Stats[m.speciesId]
            expect(ev[s1], `${m.speciesId} EV ${s1}`).toBe(252)
            expect(ev[s2], `${m.speciesId} EV ${s2}`).toBe(252)
            const total = Object.values(ev).reduce((a, b) => a + b, 0)
            expect(total, `${m.speciesId} EV total`).toBeLessThanOrEqual(510)
            // Saiyan alloué sur les 2 mêmes stats (> 0).
            expect((alloc[s1] ?? 0) + (alloc[s2] ?? 0), `${m.speciesId} Saiyan`).toBeGreaterThan(0)
        }
    })

    it("tous les moveIds de la meute existent réellement (pas de move fantôme)", () => {
        for (const m of buildPnj8Team(0)) {
            for (const slot of m.moves) expect(getMove(slot.moveId), `${m.speciesId}/${slot.moveId}`).toBeTruthy()
        }
    })

    it("le blocage couvre 17-19,18 (et pas la case du gardien 16,18)", () => {
        expect(inPnj8Block(17, 18)).toBe(true)
        expect(inPnj8Block(18, 18)).toBe(true)
        expect(inPnj8Block(19, 18)).toBe(true)
        expect(inPnj8Block(16, 18)).toBe(false) // case du gardien = mur naturel (NPC solide)
        expect(inPnj8Block(18, 39)).toBe(false) // spawn d'entrée
    })
})
