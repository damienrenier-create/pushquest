import { describe, it, expect } from "vitest"
import { rollWildEncounter, hasEncounters, speciesZones, hautesHerbesTypesForDay } from "./encounters"
import { isHhKidNight } from "./hhKid"
import { getSpecies } from "./species"
import { Rng } from "../battle/rng"
import type { MonInstance } from "../battle/types"

const MAP = "yellow_hautes_herbes"
const DAY = "2026-06-15"
function rollMany(x: number, y: number, n: number, seed: number, dayKey = DAY): MonInstance[] {
    const r = new Rng(seed)
    const rng = () => r.next()
    const out: MonInstance[] = []
    for (let i = 0; i < n; i++) {
        const m = rollWildEncounter({ mapId: MAP, x, y, leadLevel: 30, weakestTeamLevel: 20, strongestTeamLevel: 40, rng, dayKey })
        if (m) out.push(m)
    }
    return out
}
const wild = (m: MonInstance) => m.speciesId !== "goshendofy"

// GRILLE 3×3 (cf. ZONES.yellow_hautes_herbes / maps.ts) : colonnes A=1-4 B=6-9 C=11-14, rangées
// BAS=13-17 (tier 0) MILIEU=7-11 (tier 1) HAUT=1-5 (tier 2). band 0 = ligne du bas de chaque carré.
// Coords (colonne A) par tier×band utilisées dans les tests :
const COORD = {
    bas0: [2, 17], bas4: [2, 13],     // tier 0 : N3-6 → N15-18
    mil0: [2, 11], mil4: [2, 7],      // tier 1 : N18-22 → N34-38
    haut0: [2, 5], haut4: [2, 1],     // tier 2 : N38-41 → N50
} as const
// Coords band0 (ligne du bas) des 9 carrés, dans l'ordre des slots de type 0-8 :
const SQUARE_BAND0: ReadonlyArray<readonly [number, number]> = [
    [2, 17], [7, 17], [12, 17], // BAS    (slots 0,1,2)
    [2, 11], [7, 11], [12, 11], // MILIEU (slots 3,4,5)
    [2, 5], [7, 5], [12, 5],    // HAUT   (slots 6,7,8)
]

describe("Hautes herbes — grille 3×3 + rotation quotidienne par type", () => {
    it("zone reconnue + Goshendofy listé dans speciesZones", () => {
        expect(hasEncounters(MAP)).toBe(true)
        expect(speciesZones("goshendofy")).toContain(MAP)
    })

    it("NIVEAU déterministe par TIER × BANDE (hauteur = niveau)", () => {
        const inRange = (ms: MonInstance[], lo: number, hi: number) => {
            expect(ms.length).toBeGreaterThan(0)
            for (const m of ms) { expect(m.level).toBeGreaterThanOrEqual(lo); expect(m.level).toBeLessThanOrEqual(hi) }
        }
        inRange(rollMany(COORD.bas0[0], COORD.bas0[1], 300, 7).filter(wild), 3, 6)     // tier0 band0
        inRange(rollMany(COORD.bas4[0], COORD.bas4[1], 300, 7).filter(wild), 15, 18)   // tier0 band4
        inRange(rollMany(COORD.mil0[0], COORD.mil0[1], 300, 7).filter(wild), 18, 22)   // tier1 band0
        inRange(rollMany(COORD.mil4[0], COORD.mil4[1], 300, 7).filter(wild), 34, 38)   // tier1 band4
        inRange(rollMany(COORD.haut0[0], COORD.haut0[1], 300, 7).filter(wild), 38, 41) // tier2 band0
        inRange(rollMany(COORD.haut4[0], COORD.haut4[1], 300, 7).filter(wild), 50, 50) // tier2 band4 → 50
    })

    it("ROTATION : 9 types distincts/jour, jamais ROCHE sur la rangée du bas (slots 0-2)", () => {
        for (const d of ["2026-06-15", "2026-06-16", "2026-06-17", "2026-01-01", "2025-12-31", "2027-03-09"]) {
            const t = hautesHerbesTypesForDay(d)
            expect(t).toHaveLength(9)
            expect(new Set(t).size).toBe(9) // distincts
            expect(t.slice(0, 3)).not.toContain("ROCHE") // rangée du bas (tier 0) jamais Roche
        }
    })

    it("TYPE par carré = le type du JOUR pour ce slot (les 9 carrés, formes évoluées comprises)", () => {
        const types = hautesHerbesTypesForDay(DAY)
        // On exclut les DRAGONS : ils popent rarement HORS du type du jour (cf. encounters_dragons.test.ts).
        const notDragon = (m: { speciesId: string }) => !getSpecies(m.speciesId)?.types.includes("DRAGON")
        SQUARE_BAND0.forEach(([x, y], i) => {
            for (const m of rollMany(x, y, 400, 3).filter(wild).filter(notDragon)) {
                expect(getSpecies(m.speciesId)?.types, `carré ${i} (${x},${y}) doit être de type ${types[i]}`).toContain(types[i])
            }
        })
    })

    it("le TYPE change d'un jour à l'autre (au moins un carré diffère)", () => {
        const a = hautesHerbesTypesForDay("2026-06-15")
        const b = hautesHerbesTypesForDay("2026-06-16")
        expect(a.join() !== b.join()).toBe(true)
    })

    it("Goshendofy rôde en herbe basse (tier 0, band 0) : niv 50, Hyper Ball+ (≥5) + statut", () => {
        const seen = rollMany(COORD.bas0[0], COORD.bas0[1], 40000, 99).find((m) => m.speciesId === "goshendofy")
        expect(seen, "Goshendofy jamais apparu en 40000 rolls tier0 band0").toBeTruthy()
        expect(seen!.level).toBe(50)
        const cfg = seen as unknown as { captureMinBallBonus?: number; captureRequiresStatus?: boolean }
        expect(cfg.captureMinBallBonus).toBe(5)
        expect(cfg.captureRequiresStatus).toBe(true)
    })

    it("allée / couloir (herbe basse) = aucune rencontre", () => {
        expect(rollMany(5, 10, 500, 5).length).toBe(0)  // x=5 = allée verticale
        expect(rollMany(8, 6, 500, 5).length).toBe(0)   // y=6 = allée horizontale
        expect(rollMany(7, 18, 500, 5).length).toBe(0)  // couloir d'entrée (bas)
    })

    it("GAMIN : la fenêtre nuit = 21h → 23h59 (minuit exclu)", () => {
        expect(isHhKidNight(20)).toBe(false)
        expect(isHhKidNight(21)).toBe(true)
        expect(isHhKidNight(23)).toBe(true)
        expect(isHhKidNight(0)).toBe(false)
        expect(isHhKidNight(12)).toBe(false)
    })

    it("GAMIN : le boost (nuit) DOUBLE les chances de Goshendofy", () => {
        // tier0 band0 : dénom légendaire = 100 (1/100=0.01) ; avec boost ×2 → 50 (1/50=0.02).
        const t = 0.015 // entre les deux seuils → Goshendofy SEULEMENT avec le boost
        const withBoost = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => t, goshBoost: true, dayKey: DAY })
        const noBoost = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => t, goshBoost: false, dayKey: DAY })
        expect(withBoost?.speciesId).toBe("goshendofy")
        expect(noBoost?.speciesId).not.toBe("goshendofy")
    })

    it("Mottoche : présente au champ d'entraînement en RUN 1, ABSENTE en RUN 2 (exclusive à la Grotte)", () => {
        const LINE = new Set(["mottoche", "dumotte", "quadroc", "octoroc", "hexaroc", "diamantine"])
        const rollGrid = (x: number, y: number, n: number, ngplus: boolean, dayKey: string) => {
            const r = new Rng(123); const rng = () => r.next()
            const out: MonInstance[] = []
            for (let i = 0; i < n; i++) { const m = rollWildEncounter({ mapId: MAP, x, y, leadLevel: 10, rng, dayKey, ngplus }); if (m) out.push(m) }
            return out
        }
        // Cherche un jour + un carré dont le type du jour est SOL ou ROCHE (pools contenant Mottoche en run 1).
        let tested = false
        for (const day of ["2026-06-15", "2026-06-16", "2026-06-17", "2026-06-18", "2026-06-19", "2026-06-20", "2026-06-21"]) {
            const types = hautesHerbesTypesForDay(day)
            const slot = types.findIndex((t) => t === "SOL" || t === "ROCHE")
            if (slot < 0) continue
            const [x, y] = SQUARE_BAND0[slot]
            const run1 = rollGrid(x, y, 600, false, day).filter((m) => LINE.has(m.speciesId))
            const run2 = rollGrid(x, y, 600, true, day).filter((m) => LINE.has(m.speciesId))
            expect(run1.length, `RUN 1 — Mottoche doit apparaître (${day}, slot ${slot})`).toBeGreaterThan(0)
            expect(run2.length, `RUN 2 — Mottoche INTERDITE (${day}, slot ${slot})`).toBe(0)
            tested = true
            break
        }
        expect(tested, "aucun jour SOL/ROCHE dans l'échantillon").toBe(true)
    })

    it("Goshendofy CAPTURÉ → ne réapparaît JAMAIS (même au meilleur spot + boost)", () => {
        // rng quasi-nul = seuil le plus favorable possible (passe le taux ET le tirage légendaire).
        const caught = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.0001, goshBoost: true, goshCaught: true, dayKey: DAY })
        expect(caught?.speciesId).not.toBe("goshendofy")
        // témoin : sans goshCaught, ce MÊME tirage sort bien Goshendofy.
        const witness = rollWildEncounter({ mapId: MAP, x: 2, y: 17, leadLevel: 10, rng: () => 0.0001, goshBoost: true, goshCaught: false, dayKey: DAY })
        expect(witness?.speciesId).toBe("goshendofy")
    })
})
