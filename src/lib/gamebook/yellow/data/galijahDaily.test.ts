import { describe, it, expect } from "vitest"
import { GALIJAH_DAILY_THRESHOLD, GALIJAH_DAILY_MAX_POP, galijahDailyRegime, freshGalijahDaily, galijahDailyFor, galijahDailyPop, galijahDailyAvailable, isoDay } from "./galijahDaily"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// GALIJAH — RÉGIME QUOTIDIEN (≥200 espèces, décision Sartay 18/10/2026) : chaque jour, un numéro de pop de l'île tiré
// entre 1 et 50 ; Galijah apparaît à ce pop, une fois par jour, jusqu'à sa capture. Tirage persisté, pops comptés.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const species = (n: number) => Array.from({ length: n }, (_, i) => `sp${i}`)
const lcg = (seed: number) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296 } }

describe("le seuil", () => {
    it("199 espèces → paliers ; 200 → quotidien ; Galijah capturé → plus rien", () => {
        expect(galijahDailyRegime(species(199))).toBe(false)
        expect(galijahDailyRegime(species(200))).toBe(true)
        expect(galijahDailyRegime(species(227))).toBe(true)
        expect(galijahDailyRegime([...species(199), "galijah"])).toBe(false)
        expect(GALIJAH_DAILY_THRESHOLD).toBe(200); expect(GALIJAH_DAILY_MAX_POP).toBe(50)
    })
})

describe("le tirage du jour", () => {
    it("numéro de pop dans [1, 50], bornes comprises", () => {
        expect(freshGalijahDaily("2026-10-19", () => 0).target).toBe(1)
        expect(freshGalijahDaily("2026-10-19", () => 0.999999).target).toBe(50)
        expect(freshGalijahDaily("2026-10-19", () => 0.5).target).toBe(26)
        expect(freshGalijahDaily("2026-10-19", () => 1).target).toBe(50) // rng dégénéré : jamais hors bornes
        expect(freshGalijahDaily("2026-10-19", () => -1).target).toBe(1)
    })
    it("uniforme : sur 50 000 tirages, chaque numéro sort, moyenne ≈ 25,5", () => {
        const rng = lcg(7); const counts = new Array(51).fill(0); let sum = 0
        for (let i = 0; i < 50_000; i++) { const t = freshGalijahDaily("d", rng).target; counts[t]++; sum += t }
        for (let t = 1; t <= 50; t++) expect(counts[t], `pop ${t}`).toBeGreaterThan(700)
        expect(sum / 50_000).toBeGreaterThan(25); expect(sum / 50_000).toBeLessThan(26)
    })
    it("même jour → l'état en save est conservé (pas de re-tirage au rechargement) ; autre jour → neuf", () => {
        const st = { day: "2026-10-19", target: 37, pops: 12, appeared: false }
        expect(galijahDailyFor(st, "2026-10-19", () => 0)).toBe(st)
        const next = galijahDailyFor(st, "2026-10-20", () => 0.2)
        expect(next).toEqual({ day: "2026-10-20", target: 11, pops: 0, appeared: false })
        expect(galijahDailyFor(undefined, "2026-10-20", () => 0.2).target).toBe(11)
    })
})

describe("les pops de l'île", () => {
    it("il apparaît exactement au pop n° cible, une seule fois, puis plus rien jusqu'à demain", () => {
        let st = freshGalijahDaily("2026-10-19", () => 0.04) // cible = 3
        expect(st.target).toBe(3)
        let r = galijahDailyPop(st, "2026-10-19"); expect(r.spawn).toBe(false); expect(r.state.pops).toBe(1)
        r = galijahDailyPop(r.state, "2026-10-19"); expect(r.spawn).toBe(false); expect(r.state.pops).toBe(2)
        expect(galijahDailyAvailable(r.state, "2026-10-19")).toBe(true)
        r = galijahDailyPop(r.state, "2026-10-19"); expect(r.spawn).toBe(true); expect(r.state.appeared).toBe(true)
        expect(galijahDailyAvailable(r.state, "2026-10-19")).toBe(false)
        for (let i = 0; i < 100; i++) { r = galijahDailyPop(r.state, "2026-10-19"); expect(r.spawn).toBe(false) }
        expect(r.state.pops).toBe(103)
        // Demain : nouveau tirage, de nouveau disponible.
        expect(galijahDailyAvailable(r.state, "2026-10-20")).toBe(true)
        const d2 = galijahDailyPop(r.state, "2026-10-20", () => 0)
        expect(d2.state.day).toBe("2026-10-20"); expect(d2.state.pops).toBe(1); expect(d2.spawn).toBe(true) // cible 1 → dès le 1er pop
    })
    it("cible 1 → possible dès le PREMIER pop du jour ; cible 50 → au 50e", () => {
        expect(galijahDailyPop(freshGalijahDaily("d", () => 0), "d").spawn).toBe(true)
        let st = freshGalijahDaily("d", () => 0.99); expect(st.target).toBe(50)
        for (let i = 1; i < 50; i++) { const r = galijahDailyPop(st, "d"); expect(r.spawn, `pop ${i}`).toBe(false); st = r.state }
        expect(galijahDailyPop(st, "d").spawn).toBe(true)
    })
    it("compte raté (pops déjà au-delà de la cible sans apparition) → il sort au pop suivant, jamais perdu", () => {
        const r = galijahDailyPop({ day: "d", target: 3, pops: 10, appeared: false }, "d")
        expect(r.spawn).toBe(true)
    })
    it("l'état d'un autre jour ne bloque pas : disponible", () => {
        expect(galijahDailyAvailable({ day: "2026-10-18", target: 5, pops: 5, appeared: true }, "2026-10-19")).toBe(true)
        expect(galijahDailyAvailable(undefined, "2026-10-19")).toBe(true)
        expect(galijahDailyAvailable(null, "2026-10-19")).toBe(true)
    })
    it("isoDay = date ISO UTC (clé des marqueurs quotidiens)", () => {
        expect(isoDay(Date.UTC(2026, 9, 19, 23, 59))).toBe("2026-10-19")
        expect(isoDay(Date.UTC(2026, 9, 20, 0, 1))).toBe("2026-10-20")
    })
})
