import { describe, it, expect } from "vitest"
import { buildPlatineRoomTeam, type PlatineChampion } from "./platineArena"
import type { FusionChampionMon } from "../storage/save"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// RELECTURE 19/10/2026 — une photo figée gravée AVANT une nouvelle inédite ne doit pas être re-typée après coup.
// Le repli de transmutation (photos sans `moveTypes`) ne s'applique que si la photo porte bien le type forcé.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const photo = (types: string[], moveTypes?: Record<string, string>): FusionChampionMon => ({
    name: "Test", sprite: "", types, level: 100,
    stats: { hp: 400, atk: 300, def: 300, spe: 300, spc: 300 },
    moves: ["Tête de Fer", "Éclat Lunaire"], aId: "colosfer", bId: "lunarque", ...(moveTypes ? { moveTypes } : {}),
})
const room = (m: FusionChampionMon): PlatineChampion => ({ userId: "u", nickname: "N", wonAt: "2026-10-01T00:00:00.000Z", team: [m] })

describe("repli de transmutation des salles figées", () => {
    it("photo ORDINAIRE gravée avant Lunasfer (METAL/FÉE, sans moveTypes) → aucune attaque re-typée", () => {
        const built = buildPlatineRoomTeam(room(photo(["METAL", "FEE"])), "t1").team[0]
        expect(built.instance.moveTypeOverride ?? {}).toEqual({})
    })
    it("photo gravée EN DRAGON sans moveTypes (cas théorique) → repli : toutes les offensives en DRAGON (transmuteAll)", () => {
        const built = buildPlatineRoomTeam(room(photo(["DRAGON"])), "t2").team[0]
        const over = built.instance.moveTypeOverride ?? {}
        expect(Object.values(over).length).toBeGreaterThanOrEqual(2)
        for (const t of Object.values(over)) expect(t).toBe("DRAGON")
    })
    it("photo avec moveTypes gravés → la vérité gravée prime", () => {
        const built = buildPlatineRoomTeam(room(photo(["DRAGON"], { "Tête de Fer": "DRAGON" })), "t3").team[0]
        expect(Object.values(built.instance.moveTypeOverride ?? {})).toEqual(["DRAGON"])
    })
})
