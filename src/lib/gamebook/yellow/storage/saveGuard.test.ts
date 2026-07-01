import { describe, it, expect } from "vitest"
import { saveMarkers, isMeaningful, isFreshStart, classifyOverwrite, appendBackup, MAX_HISTORY } from "./saveGuard"

const advanced = { team: [{ level: 52 }, { level: 44 }, { level: 48 }], badges: ["plante", "roche", "feu", "elec", "eau"], pokedex: { caught: Array.from({ length: 38 }, (_, i) => `d${i}`) }, isChampion: true }
const fresh = { team: [{ level: 5 }], badges: [], pokedex: { caught: [] }, isChampion: false }
const midgame = { team: [{ level: 20 }, { level: 18 }], badges: ["plante", "roche"], pokedex: { caught: Array.from({ length: 12 }, (_, i) => `d${i}`) } }

describe("saveGuard — marqueurs", () => {
    it("extrait team/badges/caught/maxLevel/champion", () => {
        expect(saveMarkers(advanced)).toEqual({ team: 3, badges: 5, caught: 38, maxLevel: 52, champion: true })
        expect(saveMarkers(fresh)).toEqual({ team: 1, badges: 0, caught: 0, maxLevel: 5, champion: false })
    })
    it("robuste au contenu vide/null/partiel", () => {
        expect(saveMarkers(null)).toEqual({ team: 0, badges: 0, caught: 0, maxLevel: 0, champion: false })
        expect(saveMarkers({})).toEqual({ team: 0, badges: 0, caught: 0, maxLevel: 0, champion: false })
    })
    it("isMeaningful / isFreshStart", () => {
        expect(isMeaningful(saveMarkers(advanced))).toBe(true)
        expect(isMeaningful(saveMarkers(midgame))).toBe(true)
        expect(isMeaningful(saveMarkers(fresh))).toBe(false)
        expect(isFreshStart(saveMarkers(fresh))).toBe(true)
        expect(isFreshStart(saveMarkers(advanced))).toBe(false)
    })
})

describe("saveGuard — classifyOverwrite (le cœur anti-perte)", () => {
    it("REFUSE une save vierge par-dessus un compte avancé (le bug de Mools)", () => {
        expect(classifyOverwrite(advanced, fresh)).toBe("destructive")
        expect(classifyOverwrite(midgame, fresh)).toBe("destructive")
    })
    it("laisse passer un nouveau joueur (rien à protéger côté serveur)", () => {
        expect(classifyOverwrite(fresh, fresh)).toBe("ok")
        expect(classifyOverwrite(null, fresh)).toBe("ok")
        expect(classifyOverwrite({}, midgame)).toBe("ok")
    })
    it("laisse passer une progression normale (égale/supérieure)", () => {
        expect(classifyOverwrite(advanced, advanced)).toBe("ok")
        const more = { ...advanced, pokedex: { caught: Array.from({ length: 40 }, (_, i) => `d${i}`) } }
        expect(classifyOverwrite(advanced, more)).toBe("ok")
    })
    it("signale une RÉGRESSION non-vierge (badges/pokédex/champion perdus) → à sauvegarder avant écriture", () => {
        const lostBadge = { ...advanced, badges: ["plante", "roche", "feu", "elec"], isChampion: true }
        expect(classifyOverwrite(advanced, lostBadge)).toBe("regression")
        const lostChampion = { ...advanced, isChampion: false }
        expect(classifyOverwrite(advanced, lostChampion)).toBe("regression")
    })
})

describe("saveGuard — appendBackup", () => {
    it("ajoute une entrée horodatée et borne à MAX_HISTORY", () => {
        let h: unknown = []
        for (let i = 0; i < MAX_HISTORY + 5; i++) h = appendBackup(h, { n: i }, "test", `2026-07-01T00:00:${String(i).padStart(2, "0")}Z`)
        const arr = h as Array<{ reason: string; flags: { n: number } }>
        expect(arr).toHaveLength(MAX_HISTORY)
        expect(arr[arr.length - 1].flags.n).toBe(MAX_HISTORY + 4) // la plus récente conservée
        expect(arr[0].flags.n).toBe(5) // les plus vieilles évincées
    })
})
