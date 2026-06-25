import { describe, it, expect } from "vitest"
import { Rng } from "../battle/rng"
import { SPECIES } from "../data/species"
import { weakTypesOf } from "./engine"
import {
    generateRentalPool, isValidDraft, buildDraftTeam, DEFAULT_POOL_SIZE, MAX_SHARED_WEAKNESS,
} from "./factory"

describe("Usine — pool de location", () => {
    it("pool de 6 espèces distinctes, au bon niveau, sans `exclusive`", () => {
        const exclusives = Object.values(SPECIES as any).filter((s: any) => s.exclusive).map((s: any) => s.id)
        for (let s = 0; s < 40; s++) {
            const pool = generateRentalPool(new Rng(s * 2654435761 + 1), { streak: 12, level: 50 })
            expect(pool.length).toBe(DEFAULT_POOL_SIZE)
            expect(new Set(pool.map(c => c.speciesId)).size).toBe(DEFAULT_POOL_SIZE)
            for (const c of pool) {
                expect(c.level).toBe(50)
                expect(exclusives).not.toContain(c.speciesId)
            }
        }
    })

    it("équilibre : aucun type n'est une faiblesse (×2+) pour plus de 2 membres du pool", () => {
        for (let s = 0; s < 60; s++) {
            const pool = generateRentalPool(new Rng(s * 40503 + 7), { streak: 20, level: 100 })
            const count: Record<string, number> = {}
            for (const c of pool) for (const t of weakTypesOf(c.speciesId)) count[t] = (count[t] ?? 0) + 1
            for (const t of Object.keys(count)) expect(count[t]).toBeLessThanOrEqual(MAX_SHARED_WEAKNESS)
        }
    })

    it("déterministe : même graine → même pool", () => {
        const a = generateRentalPool(new Rng(999), { streak: 10, level: 50 })
        const b = generateRentalPool(new Rng(999), { streak: 10, level: 50 })
        expect(a.map(c => c.speciesId)).toEqual(b.map(c => c.speciesId))
    })
})

describe("Usine — validation & construction du draft", () => {
    const pool = generateRentalPool(new Rng(123), { streak: 10, level: 50 })
    const ids = pool.map(c => c.speciesId)

    it("accepte 3 espèces distinctes issues du pool", () => {
        expect(isValidDraft(pool, [ids[0], ids[1], ids[2]])).toBe(true)
    })
    it("refuse : doublon, mauvaise taille, ou espèce hors pool", () => {
        expect(isValidDraft(pool, [ids[0], ids[0], ids[1]])).toBe(false) // doublon
        expect(isValidDraft(pool, [ids[0], ids[1]])).toBe(false)          // pas 3
        expect(isValidDraft(pool, [ids[0], ids[1], "espece_bidon"])).toBe(false) // hors pool
    })
    it("buildDraftTeam : 3 specs de combat au bon niveau", () => {
        const team = buildDraftTeam(pool, [ids[0], ids[1], ids[2]])
        expect(team.length).toBe(3)
        expect(team.every(m => m.level === 50)).toBe(true)
        expect(team.map(m => m.speciesId)).toEqual([ids[0], ids[1], ids[2]])
    })
})
