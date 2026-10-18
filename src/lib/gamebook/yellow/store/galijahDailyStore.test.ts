import { describe, it, expect } from "vitest"
import { hydratePlayer, galijahCanAppear, getGalijahDaily, setGalijahDaily } from "./playerStore"
import { hydratePokedex } from "./pokedexStore"
import { parseSave, emptySave } from "../storage/save"
import { isoDay } from "../data/galijahDaily"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// GALIJAH quotidien — câblage store + save : `galijahCanAppear` bascule à 200 espèces, l'état du jour traverse la save.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const species = (n: number) => Array.from({ length: n }, (_, i) => `sp${i}`)
const today = isoDay()
const load = (caught: string[], extra: Record<string, unknown> = {}) => {
    hydratePokedex({ seen: caught, caught })
    hydratePlayer({ team: [], pc: [], defeatedTrainers: [], galijahDaily: undefined, ...extra } as never)
}

describe("galijahCanAppear", () => {
    it("≥200 espèces : disponible tant qu'il n'est pas apparu AUJOURD'HUI (quel que soit le palier)", () => {
        load(species(227), { defeatedTrainers: ["galijah_appeared_t5", "galijah_appeared_t7"] }) // marqueurs de paliers : sans effet ici
        expect(galijahCanAppear()).toBe(true)
        setGalijahDaily({ day: today, target: 9, pops: 9, appeared: true })
        expect(galijahCanAppear()).toBe(false)
        setGalijahDaily({ day: "2000-01-01", target: 9, pops: 9, appeared: true }) // la veille → nouveau jour
        expect(galijahCanAppear()).toBe(true)
    })
    it("<200 espèces : paliers inchangés (apparu à ce palier → attendre +10 espèces)", () => {
        load(species(185), { defeatedTrainers: ["galijah_appeared_t3"] })
        expect(galijahCanAppear()).toBe(false)
        load(species(185), { defeatedTrainers: [] })
        expect(galijahCanAppear()).toBe(true)
        load(species(149))
        expect(galijahCanAppear()).toBe(false)
    })
    it("capturé → jamais", () => {
        load([...species(227), "galijah"])
        expect(galijahCanAppear()).toBe(false)
    })
})

describe("persistance", () => {
    it("hydratePlayer / getGalijahDaily : aller-retour", () => {
        load(species(201), { galijahDaily: { day: today, target: 12, pops: 3, appeared: false } })
        expect(getGalijahDaily()).toEqual({ day: today, target: 12, pops: 3, appeared: false })
    })
    it("parseSave : conservé, borné, ou ignoré si invalide", () => {
        const base = emptySave() as unknown as Record<string, unknown>
        expect(parseSave({ ...base, galijahDaily: { day: "2026-10-19", target: 7, pops: 3, appeared: true } }).galijahDaily).toEqual({ day: "2026-10-19", target: 7, pops: 3, appeared: true })
        expect(parseSave({ ...base, galijahDaily: { day: "2026-10-19", target: 99, pops: -4 } }).galijahDaily).toEqual({ day: "2026-10-19", target: 50, pops: 0, appeared: false })
        expect(parseSave({ ...base, galijahDaily: { day: "2026-10-19", target: 0, pops: 0 } }).galijahDaily).toBeUndefined()
        expect(parseSave({ ...base, galijahDaily: { target: 5 } }).galijahDaily).toBeUndefined()
        expect(parseSave({ ...base }).galijahDaily).toBeUndefined()
    })
})
