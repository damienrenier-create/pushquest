import { describe, it, expect } from "vitest"
import { CLANS, CLAN_KEYS, ALL_CLAN_LINE_IDS, clanOfSpecies, clanOfChief, clanRelation, TRANSCENDANCE_CT_ID } from "./clans"
import { typeMultiplier } from "../battle/typeChart"
import { getSpecies } from "./species"
import { getCt } from "./cts"

describe("Clans — données & cohérence", () => {
    it("3 clans, types distincts VOL/COMBAT/ROCHE", () => {
        expect(CLAN_KEYS).toEqual(["air", "combat", "roche"])
        expect([CLANS.air.type, CLANS.combat.type, CLANS.roche.type]).toEqual(["VOL", "COMBAT", "ROCHE"])
    })
    it("starter = 1er stade ; finalId = 3e stade ; roster finit par l'AS (finalId)", () => {
        for (const k of CLAN_KEYS) {
            const c = CLANS[k]
            expect(c.starterId).toBe(c.lineIds[0])
            expect(c.finalId).toBe(c.lineIds[2])
            expect(c.roster[c.roster.length - 1]).toBe(c.finalId)
            expect(c.roster).toHaveLength(6)
        }
    })
    it("toutes les espèces (lignées + rosters) existent", () => {
        for (const k of CLAN_KEYS) {
            for (const id of CLANS[k].lineIds) expect(getSpecies(id), id).toBeDefined()
            for (const id of CLANS[k].roster) expect(getSpecies(id), id).toBeDefined()
        }
    })
    it("CT de clan (ct67/68/69) + Transcendance (ct70) valides", () => {
        expect(CLANS.air.ctId).toBe("ct67"); expect(CLANS.combat.ctId).toBe("ct68"); expect(CLANS.roche.ctId).toBe("ct69")
        for (const k of CLAN_KEYS) expect(getCt(CLANS[k].ctId), CLANS[k].ctId).toBeTruthy()
        expect(getCt(TRANSCENDANCE_CT_ID)).toBeTruthy()
    })
    it("ALL_CLAN_LINE_IDS = 9 espèces uniques ; clanOfSpecies mappe correctement", () => {
        expect(ALL_CLAN_LINE_IDS).toHaveLength(9)
        expect(new Set(ALL_CLAN_LINE_IDS).size).toBe(9)
        expect(clanOfSpecies("picassault")).toBe("air")
        expect(clanOfSpecies("lievrocogne")).toBe("combat")
        expect(clanOfSpecies("pandapurna")).toBe("roche")
        expect(clanOfSpecies("maitrezenc")).toBeNull() // dans un roster mais PAS une signature
    })
    it("clanOfChief mappe les PNJ", () => {
        expect(clanOfChief("y_clan_air")).toBe("air")
        expect(clanOfChief("y_clan_combat")).toBe("combat")
        expect(clanOfChief("y_clan_roche")).toBe("roche")
        expect(clanOfChief("y_sbire")).toBeNull()
    })
    it("TRIANGLE cohérent avec la table des types : mon type ×2 sur ma PROIE, le PRÉDATEUR ×2 sur moi", () => {
        for (const k of CLAN_KEYS) {
            const c = CLANS[k]
            expect(typeMultiplier(c.type, CLANS[c.prey].type), `${k} domine ${c.prey}`).toBe(2)
            expect(typeMultiplier(CLANS[c.predator].type, c.type), `${c.predator} domine ${k}`).toBe(2)
        }
        // rock-paper-scissors complet
        expect(CLANS.air.prey).toBe("combat"); expect(CLANS.combat.prey).toBe("roche"); expect(CLANS.roche.prey).toBe("air")
    })
    it("clanRelation : self / prey / predator", () => {
        expect(clanRelation("air", "air")).toBe("self")
        expect(clanRelation("air", "combat")).toBe("prey")
        expect(clanRelation("air", "roche")).toBe("predator")
    })
})
