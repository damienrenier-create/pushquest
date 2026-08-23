import { describe, it, expect } from "vitest"
import { archivisteSlot, archivisteGreeting, buildArchivisteTeam, ARCHIVISTE_GREETINGS, archivisteEscalation } from "./collectionneurNpc"
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

    it("ne combat JAMAIS avec un fusionné (dexNo >= 500 exclu du pool)", () => {
        // mottelave = fusion capturable Grotte (dexNo 500) : même vue, elle ne doit jamais rejoindre son équipe.
        const team = buildArchivisteTeam([...POOL, "mottelave", "nouiflot"], 30, 3, 8)
        for (const m of team) expect(baseSpeciesOf(m.speciesId)).not.toBe("mottelave")
        expect(team.some((m) => m.speciesId === "mottelave" || m.speciesId === "nouiflot")).toBe(false)
    })

    it("ESCALADE : +niveaux + points Saiyan aux matchs répétés", () => {
        const base = buildArchivisteTeam(POOL, 40, 1, 6, 0, 0)
        const m2 = buildArchivisteTeam(POOL, 40, 1, 6, 3, 50)   // 2e match
        const m3 = buildArchivisteTeam(POOL, 40, 1, 6, 6, 95)   // 3e match
        // niveaux : moyenne décalée de +levelBonus
        expect(base.reduce((s, m) => s + m.level, 0) / base.length).toBe(40)
        expect(m2.reduce((s, m) => s + m.level, 0) / m2.length).toBe(43)
        expect(m3.reduce((s, m) => s + m.level, 0) / m3.length).toBe(46)
        // points Saiyan (allocated) : absents au 1er match, présents ensuite
        expect(base.every((m) => m.allocated === undefined)).toBe(true)
        expect(m2.every((m) => m.allocated && Object.values(m.allocated).reduce((a, b) => a + (b ?? 0), 0) === 50)).toBe(true)
        expect(m3.every((m) => m.allocated && Object.values(m.allocated).reduce((a, b) => a + (b ?? 0), 0) === 95)).toBe(true)
    })
})

describe("archivisteEscalation — paliers du jour", () => {
    it("match 1 = base, 2 = +3/50, 3 = +6/95", () => {
        expect(archivisteEscalation(0)).toEqual({ levelBonus: 0, saiyanPoints: 0 })
        expect(archivisteEscalation(1)).toEqual({ levelBonus: 3, saiyanPoints: 50 })
        expect(archivisteEscalation(2)).toEqual({ levelBonus: 6, saiyanPoints: 95 })
    })
})
