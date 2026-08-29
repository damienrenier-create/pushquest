import { describe, it, expect } from "vitest"
import { hasEncounters, rollWildEncounter, biotopeKeyAt } from "./encounters"

// GROTTE B1F — 6 BIOTOPES par rectangle : le pool dépend du rectangle contenant (x,y). Rare exclusif « seul lieu
// de pop dans la caverne » à niv 15 ; hors de tout rectangle → aucune rencontre.

function seededRng(seed: number) {
    let s = seed >>> 0
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}

/** Roll N fois à (x,y) et renvoie {species: Set, exclusiveLevels: niveaux du rare `exclusive`}. */
function sample(x: number, y: number, n: number, exclusive?: string) {
    const rng = seededRng(x * 1000 + y + 7)
    const species = new Set<string>()
    const exclusiveLevels: number[] = []
    for (let i = 0; i < n; i++) {
        const w = rollWildEncounter({ mapId: "yellow_grotte_nexus_b1f", x, y, leadLevel: 30, caughtSpecies: [], rng })
        if (w) {
            species.add(w.speciesId)
            if (exclusive && w.speciesId === exclusive) exclusiveLevels.push(w.level)
        }
    }
    return { species, exclusiveLevels }
}

// (x,y) représentatif de chaque biotope + son rare exclusif attendu + les autres exclusifs (à NE PAS voir).
const BIOTOPES = [
    { name: "dernier/possyl", x: 20, y: 4, excl: "possyl", pool: ["possyl", "mottoche", "nouillon", "revemante", "ruffiant", "electroatiss", "draclet"] },
    { name: "3e/caninombre", x: 30, y: 6, excl: "caninombre", pool: ["caninombre", "lavapetit", "piouflot", "sporbeo", "revemante"] },
    { name: "2e/hypnoppo", x: 30, y: 36, excl: "hypnoppo", pool: ["hypnoppo", "trolystrik", "draclet", "electroatiss", "cornaissant", "revemante"] },
    { name: "1er/wistree", x: 42, y: 28, excl: "wistree", pool: ["wistree", "ruffiant", "tetardoc", "trolystrik", "electroatiss"] },
    { name: "4e/shady", x: 15, y: 18, excl: "shady", pool: ["shady", "mottoche", "nouillon", "piouflot", "tetardoc"] },
    { name: "5e/gavillus", x: 4, y: 10, excl: "gavillus", pool: ["gavillus", "mottoche", "lavapetit", "nouillon", "revemante", "ruffiant"] },
]
const ALL_EXCLUSIVES = ["possyl", "caninombre", "hypnoppo", "wistree", "shady", "gavillus"]

describe("Grotte B1F — biotopes par rectangle", () => {
    it("la map B1F a des rencontres activées", () => {
        expect(hasEncounters("yellow_grotte_nexus_b1f")).toBe(true)
    })

    it("biotopeKeyAt : clé distincte par biotope (scope anti-bleed de la règle de pop)", () => {
        const kObscu = biotopeKeyAt("yellow_grotte_nexus_b1f", 20, 4)   // rect obscurène
        const kCanin = biotopeKeyAt("yellow_grotte_nexus_b1f", 30, 6)   // rect caninombre
        expect(kObscu).not.toBe(kCanin)                                  // biotopes différents → clés différentes
        expect(kObscu).toBe(biotopeKeyAt("yellow_grotte_nexus_b1f", 21, 4)) // même biotope → même clé
        expect(biotopeKeyAt("yellow_grotte_nexus_b1f", 0, 0)).toBe("yellow_grotte_nexus_b1f:-1") // hors rect
        expect(biotopeKeyAt("yellow_grotte_nexus", 5, 5)).toBe("yellow_grotte_nexus") // 1F : pas de rects
    })

    it("hors de tout rectangle → AUCUNE rencontre", () => {
        // (0,0) et (48,0) ne sont dans aucun biotope.
        expect(sample(0, 0, 500).species.size).toBe(0)
        expect(sample(48, 0, 500).species.size).toBe(0)
    })

    for (const b of BIOTOPES) {
        it(`${b.name} : pop UNIQUEMENT son pool + rare exclusif présent à niv 15`, () => {
            const { species, exclusiveLevels } = sample(b.x, b.y, 4000, b.excl)
            expect(species.size).toBeGreaterThan(0)
            // Uniquement les espèces du biotope (pas de contamination d'un autre biotope).
            for (const id of species) expect(b.pool, `${id} hors pool de ${b.name}`).toContain(id)
            // Le rare EXCLUSIF apparaît, et lui seul parmi les 6 exclusifs.
            expect(species.has(b.excl), `${b.excl} doit pop dans ${b.name}`).toBe(true)
            for (const other of ALL_EXCLUSIVES) if (other !== b.excl) expect(species.has(other), `${other} ne doit PAS pop dans ${b.name}`).toBe(false)
            // Il pop TOUJOURS à niv 15.
            expect(exclusiveLevels.length).toBeGreaterThan(0)
            expect(exclusiveLevels.every((l) => l === 15), `${b.excl} doit pop niv 15`).toBe(true)
        })
    }
})
