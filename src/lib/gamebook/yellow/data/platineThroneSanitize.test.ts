import { describe, it, expect } from "vitest"
import { sanitizeThroneTeam, reclaimThrone, claimThrone, type ThroneSlot } from "./platineThrone"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// LE TRÔNE — deux correctifs du 19/10/2026 (enquête après le sacre de Mools) :
//  • sanitizeThroneTeam vivait dans la route et JETAIT moveTypes / items / shiny : le tenant était rejoué les mains vides,
//    sans chromatique et sans ses types transmutés — plus facile à détrôner que sa propre salle OR.
//  • un tenant qui rebattait son propre couloir voyait son règne repartir de zéro (renewThrone) : désormais reclaimThrone
//    garde chrono et nombre de règnes quand c'est le tenant lui-même.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const MON = {
    name: "Tauric-uréal", sprite: "https://blob/x.png", types: ["COMBAT", "ELEC"], level: 100,
    stats: { hp: 539, atk: 372, def: 229, spe: 406, spc: 444 },
    moves: ["Vive-Attaque", "Fulgurance", "Coup d'Boule", "Pyrotechnie"],
    moveTypes: { Pyrotechnie: "ELEC" }, items: ["restes", "baie_phenix"], shiny: true, aId: "tauricendre", bId: "zappeureal",
}

describe("sanitizeThroneTeam", () => {
    it("garde objets tenus, chromatique, types transmutés et parents", () => {
        const [m] = sanitizeThroneTeam([MON])
        expect(m.items).toEqual(["restes", "baie_phenix"])
        expect(m.shiny).toBe(true)
        expect(m.moveTypes).toEqual({ Pyrotechnie: "ELEC" })
        expect(m.aId).toBe("tauricendre"); expect(m.bId).toBe("zappeureal")
        expect(m.stats).toEqual(MON.stats); expect(m.moves).toEqual(MON.moves); expect(m.types).toEqual(["COMBAT", "ELEC"])
    })
    it("borne : stats plafonnées, niveau 1-100, 6 chimères max, 2 objets max, 4 types d'attaque max, noms tronqués", () => {
        const big = { ...MON, level: 999, stats: { hp: 99999, atk: 99999, def: -5, spe: 1, spc: "x" }, items: ["a", "b", "c"], moveTypes: { a: "X", b: "Y", c: "Z", d: "W", e: "V" }, name: "N".repeat(80) }
        const out = sanitizeThroneTeam([big, MON, MON, MON, MON, MON, MON, MON])
        expect(out).toHaveLength(6)
        expect(out[0].level).toBe(100)
        expect(out[0].stats).toEqual({ hp: 2000, atk: 1500, def: 0, spe: 1, spc: 0 })
        expect(out[0].items).toEqual(["a", "b"])
        expect(Object.keys(out[0].moveTypes!)).toHaveLength(4)
        expect(out[0].name).toHaveLength(40)
    })
    it("écarte l'inexploitable : non-tableau, entrées sans nom, valeurs d'un autre type", () => {
        expect(sanitizeThroneTeam(null)).toEqual([])
        expect(sanitizeThroneTeam("x")).toEqual([])
        expect(sanitizeThroneTeam([{ stats: {} }, 42, null])).toEqual([])
        const [m] = sanitizeThroneTeam([{ name: "A", shiny: "oui", items: "restes", moveTypes: "x", moves: "y" }])
        expect(m.shiny).toBeUndefined(); expect(m.items).toBeUndefined(); expect(m.moveTypes).toBeUndefined(); expect(m.moves).toEqual([])
    })
})

describe("reclaimThrone", () => {
    const now = new Date("2026-10-19T10:00:00Z")
    const prev: ThroneSlot = { v: 1, team: [MON], avatar: "old.png", points: 3, sinceAt: "2026-10-18T21:39:56.040Z", reigns: 1 }
    it("première fois → nouveau règne (comme claimThrone)", () => {
        expect(reclaimThrone(null, [MON], "a.png", now, false)).toEqual(claimThrone([MON], "a.png", now))
    })
    it("le TENANT se rebat lui-même → équipe/skin regravés, chrono et règnes INTACTS, points gardés", () => {
        const next = reclaimThrone(prev, [{ ...MON, name: "Autre" }], "new.png", now, true)
        expect(next.sinceAt).toBe(prev.sinceAt); expect(next.reigns).toBe(1); expect(next.points).toBe(3)
        expect(next.team[0].name).toBe("Autre"); expect(next.avatar).toBe("new.png")
        expect(reclaimThrone(prev, [MON], undefined, now, true).avatar).toBe("old.png") // pas de skin fourni → on garde l'ancien
    })
    it("un ANCIEN Maître qui reprend la chaise → nouveau chrono, règnes +1, points gardés", () => {
        const next = reclaimThrone(prev, [MON], "new.png", now, false)
        expect(next.sinceAt).toBe(now.toISOString()); expect(next.reigns).toBe(2); expect(next.points).toBe(3)
    })
})
