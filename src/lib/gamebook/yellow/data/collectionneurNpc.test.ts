import { describe, it, expect } from "vitest"
import { archivisteSlot, archivisteGreeting, buildArchivisteTeam, ARCHIVISTE_GREETINGS } from "./collectionneurNpc"
import { baseSpeciesOf } from "./ace"

const POOL = ["feuillichot", "broutame", "piouflot", "tetardoc", "draclet", "cailloutchi", "sporbeo", "namicha"]

describe("archivisteSlot — tranches horaires", () => {
    it("matin 6-10 → 0", () => { expect(archivisteSlot(6)).toBe(0); expect(archivisteSlot(9)).toBe(0) })
    it("journée 10-17 → 1", () => { expect(archivisteSlot(10)).toBe(1); expect(archivisteSlot(16)).toBe(1) })
    it("soirée 17-21 → 2", () => { expect(archivisteSlot(17)).toBe(2); expect(archivisteSlot(20)).toBe(2) })
    it("nuit 21-6 (enjambe minuit) → 3", () => { expect(archivisteSlot(21)).toBe(3); expect(archivisteSlot(23)).toBe(3); expect(archivisteSlot(0)).toBe(3); expect(archivisteSlot(5)).toBe(3) })
})

describe("archivisteGreeting — matrice jour × heure", () => {
    it("renvoie une ligne pour chaque jour et chaque tranche", () => {
        for (let day = 0; day < 7; day++) for (const h of [7, 12, 18, 23]) {
            expect(typeof archivisteGreeting(day, h)).toBe("string")
            expect(archivisteGreeting(day, h).length).toBeGreaterThan(0)
        }
    })
    it("matrice = 7 jours × 4 tranches", () => {
        expect(ARCHIVISTE_GREETINGS).toHaveLength(7)
        for (const day of ARCHIVISTE_GREETINGS) expect(day).toHaveLength(4)
    })
    it("borne les jours hors [0,6] (getDay défensif)", () => {
        expect(typeof archivisteGreeting(-1, 12)).toBe("string")
        expect(typeof archivisteGreeting(9, 12)).toBe("string")
    })
})

describe("buildArchivisteTeam — équipe du Collectionneur", () => {
    it("ne tire QUE parmi les LIGNÉES vues (pool) — évolué au stade du niveau", () => {
        const team = buildArchivisteTeam(POOL, 30, 12345, 6)
        // Les Daemons sont évolués au stade naturel du niveau (« même stade que le joueur ») → on vérifie que leur
        //   BASE de lignée fait bien partie du pool des espèces vues.
        for (const m of team) expect(POOL).toContain(baseSpeciesOf(m.speciesId))
    })

    it("évolue au STADE du niveau (même stade que le joueur)", () => {
        // À bas niveau, une lignée reste au stade de base ; à haut niveau, elle est évoluée.
        const low = buildArchivisteTeam(["piouflot"], 3, 1, 1)[0]
        const high = buildArchivisteTeam(["piouflot"], 60, 1, 1)[0]
        expect(baseSpeciesOf(low.speciesId)).toBe("piouflot")
        expect(baseSpeciesOf(high.speciesId)).toBe("piouflot")
        expect(high.speciesId).not.toBe(low.speciesId) // évolué à niveau élevé
    })

    it("taille = min(count, pool, 6)", () => {
        expect(buildArchivisteTeam(POOL, 30, 1, 3)).toHaveLength(3)
        expect(buildArchivisteTeam(POOL, 30, 1, 6)).toHaveLength(6)
        expect(buildArchivisteTeam(["feuillichot", "broutame"], 30, 1, 6)).toHaveLength(2) // pool plus petit que count
        expect(buildArchivisteTeam([], 30, 1, 6)).toHaveLength(0)                          // aucun vu → vide
    })

    it("MOYENNE d'équipe == moyenne du joueur (offsets à somme nulle)", () => {
        for (const seed of [1, 2, 42, 999, 123456]) {
            const mean = 40
            const team = buildArchivisteTeam(POOL, mean, seed, 6)
            const avg = team.reduce((s, m) => s + m.level, 0) / team.length
            expect(avg).toBe(mean) // exact (aucun clamp à mean=40, spread ±5 reste dans [1,100])
        }
    })

    it("chaque niveau reste dans ±5 de la moyenne", () => {
        const team = buildArchivisteTeam(POOL, 50, 777, 6)
        for (const m of team) expect(Math.abs(m.level - 50)).toBeLessThanOrEqual(5)
    })

    it("Daemons NATURE : aucun EV, aucun point Saiyan, pas de shiny", () => {
        const team = buildArchivisteTeam(POOL, 30, 55, 6)
        for (const m of team) {
            expect(m.ev).toBeUndefined()
            expect(m.allocated).toBeUndefined()
            expect(m.shiny).toBeFalsy()
            expect(m.owned).toBe(false)
        }
    })

    it("déterministe : même seed → même équipe", () => {
        const a = buildArchivisteTeam(POOL, 30, 314, 6)
        const b = buildArchivisteTeam(POOL, 30, 314, 6)
        expect(a.map((m) => `${m.speciesId}@${m.level}`)).toEqual(b.map((m) => `${m.speciesId}@${m.level}`))
    })

    it("exclut les légendaires ultra-secrets (megamonarx/galijah) même s'ils sont vus", () => {
        const team = buildArchivisteTeam([...POOL, "megamonarx", "galijah"], 30, 9, 8)
        expect(team.some((m) => m.speciesId === "megamonarx" || m.speciesId === "galijah")).toBe(false)
    })
})
