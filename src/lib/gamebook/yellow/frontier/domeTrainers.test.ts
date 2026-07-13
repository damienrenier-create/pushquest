import { describe, it, expect } from "vitest"
import { DOME_TRAINERS, getDomeTrainer } from "./domeTrainers"
import { DOME_TIERS } from "./domeTypes"
import { getSpecies } from "../data/species"

// GARDE-FOU du pool de dresseurs du Dôme : chaque ace/membre garanti doit être une espèce RÉELLE,
// les ids uniques, les tiers valides, et l'ace doit frapper avec la bonne stat (cohérence damageBias).
describe("DOME_TRAINERS — intégrité du pool", () => {
    it("compte 30 dresseurs, ids uniques", () => {
        expect(DOME_TRAINERS).toHaveLength(30)
        const ids = DOME_TRAINERS.map((t) => t.id)
        expect(new Set(ids).size).toBe(30)
        expect(getDomeTrainer("mools")?.epithet).toBe("Le Champion")
    })

    it("chaque ace est une espèce existante", () => {
        for (const t of DOME_TRAINERS) {
            expect(getSpecies(t.aceSpecies), `ace introuvable: ${t.id} → ${t.aceSpecies}`).toBeTruthy()
        }
    })

    it("chaque membre GARANTI (includeSpecies) existe", () => {
        for (const t of DOME_TRAINERS) {
            for (const id of t.includeSpecies ?? []) {
                expect(getSpecies(id), `includeSpecies introuvable: ${t.id} → ${id}`).toBeTruthy()
            }
        }
    })

    it("chaque minTier est un tier valide", () => {
        for (const t of DOME_TRAINERS) {
            expect(DOME_TIERS.includes(t.minTier), `tier invalide: ${t.id} → ${t.minTier}`).toBe(true)
        }
    })

    it("cohérence catégorie/stat de l'ace (physical→ATQ, special→SpA)", () => {
        for (const t of DOME_TRAINERS) {
            if (t.damageBias === "mixed") continue
            const sp = getSpecies(t.aceSpecies)!
            const { atk, spc } = sp.baseStats
            if (t.damageBias === "physical") {
                expect(atk, `${t.id} (${t.aceSpecies}) déclaré physique mais SpA>ATQ`).toBeGreaterThanOrEqual(spc)
            } else {
                expect(spc, `${t.id} (${t.aceSpecies}) déclaré spécial mais ATQ>SpA`).toBeGreaterThanOrEqual(atk)
            }
        }
    })
})
