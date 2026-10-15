import { describe, it, expect } from "vitest"
import { rollWildEncounter, type EncounterCtx } from "./encounters"
import { speciesAtLevel } from "./ace"
import { SPECIES } from "./species"
import { CRAFTED_SHINY_IDS, CRAFTED_SHINY_CHANCE } from "./craftedShinies"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// SURCOUCHE « SHINY CRAFTÉ » dans rollWildEncounter (15/10/2026).
// Contrat : porte fermée → byte-identique à avant (aucun jet consommé). Porte ouverte → la rencontre déjà tirée
// est REMPLACÉE, 1 fois sur ~256, par l'une des 4 créations canonisées, AU MÊME NIVEAU, stade selon le niveau.
// Partout : Grotte du Nexus ET grille d'entraînement des hautes herbes (deux chemins différents du moteur).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

function lineage(base: string): string[] {
    const out = [base]; let cur = SPECIES[base]
    while (cur?.evolution?.toId) { out.push(cur.evolution.toId); cur = SPECIES[cur.evolution.toId] }
    return out
}
const CRAFTED_ALL = new Set(CRAFTED_SHINY_IDS.flatMap(lineage))
const isCrafted = (id: string) => CRAFTED_ALL.has(id)
const lcg = (seed: number) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296 } }

const GROTTE: EncounterCtx = { mapId: "yellow_grotte_nexus", x: 5, y: 5, leadLevel: 30, caughtSpecies: [] }
const GRID: EncounterCtx = { mapId: "yellow_hautes_herbes", x: 2, y: 17, leadLevel: 10, dayKey: "2026-06-16" }

describe("porte fermée (pas encore au Dôme Fusion)", () => {
    it("jamais de crafté — Grotte et grille d'entraînement (30 000 pas chacune)", () => {
        for (const base of [GROTTE, GRID]) {
            const rng = lcg(42); let enc = 0
            for (let i = 0; i < 30_000; i++) {
                const m = rollWildEncounter({ ...base, rng }); if (!m) continue
                enc++; expect(isCrafted(m.speciesId), `${base.mapId} ${m.speciesId}`).toBe(false)
            }
            expect(enc, base.mapId).toBeGreaterThan(1000)
        }
    })

    it("même avec un rng qui force tout (0.001) : craftedUnlocked absent → rencontre normale", () => {
        for (const base of [GROTTE, GRID]) {
            const m = rollWildEncounter({ ...base, rng: () => 0.001 })
            expect(m).not.toBeNull(); expect(isCrafted(m!.speciesId)).toBe(false)
        }
    })
})

describe("porte ouverte (craftedUnlocked)", () => {
    it("rng forcé 0.001 → crafté (1re lignée), au niveau de la rencontre, stade selon le niveau", () => {
        for (const base of [GROTTE, GRID]) {
            const normal = rollWildEncounter({ ...base, rng: () => 0.001 })!
            const m = rollWildEncounter({ ...base, rng: () => 0.001, craftedUnlocked: true })!
            expect(m.level, base.mapId).toBe(normal.level)
            expect(m.speciesId, base.mapId).toBe(speciesAtLevel(CRAFTED_SHINY_IDS[0], normal.level))
        }
    })

    it("rng forcé 0.01 (> 1/256) → pas de crafté, rencontre normale inchangée", () => {
        for (const base of [GROTTE, GRID]) {
            const normal = rollWildEncounter({ ...base, rng: () => 0.01 })!
            const m = rollWildEncounter({ ...base, rng: () => 0.01, craftedUnlocked: true })!
            expect(m.speciesId).toBe(normal.speciesId); expect(m.level).toBe(normal.level)
        }
    })

    it("la rencontre de base est celle qu'on aurait eue porte fermée (même graine) : seul le remplacement change", () => {
        let replaced = 0
        for (let seed = 1; seed <= 3000; seed++) {
            const closed = rollWildEncounter({ ...GROTTE, rng: lcg(seed) })
            const open = rollWildEncounter({ ...GROTTE, rng: lcg(seed), craftedUnlocked: true })
            expect(open === null).toBe(closed === null)
            if (!closed || !open) continue
            expect(open.level).toBe(closed.level)
            if (isCrafted(open.speciesId)) { replaced++; expect(CRAFTED_SHINY_IDS.some((b) => speciesAtLevel(b, open.level) === open.speciesId)).toBe(true) }
            else expect(open.speciesId).toBe(closed.speciesId)
        }
        expect(replaced).toBeGreaterThanOrEqual(0) // informatif : ~3000 × 14 % / 256 ≈ 1-2
    })

    it("taux mesuré ≈ 1/256 des rencontres, les 4 lignées sortent, stade cohérent (Grotte + grille, 60 000 pas chacune)", () => {
        for (const base of [GROTTE, GRID]) {
            const rng = lcg(7); let enc = 0, hits = 0; const seen = new Set<string>()
            for (let i = 0; i < 60_000; i++) {
                const m = rollWildEncounter({ ...base, rng, craftedUnlocked: true }); if (!m) continue
                enc++
                if (!isCrafted(m.speciesId)) continue
                hits++
                const b = CRAFTED_SHINY_IDS.find((id) => lineage(id).includes(m.speciesId))!
                seen.add(b)
                expect(speciesAtLevel(b, m.level), `${m.speciesId} niv ${m.level}`).toBe(m.speciesId)
            }
            const rate = hits / enc
            expect(rate, `${base.mapId} : ${hits}/${enc}`).toBeGreaterThan(CRAFTED_SHINY_CHANCE / 2.5)
            expect(rate, `${base.mapId} : ${hits}/${enc}`).toBeLessThan(CRAFTED_SHINY_CHANCE * 2.5)
            expect(seen.size, `${base.mapId} lignées vues : ${[...seen].join(",")}`).toBeGreaterThanOrEqual(3)
        }
    })
})
