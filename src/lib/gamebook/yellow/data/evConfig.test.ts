import { describe, it, expect } from "vitest"
import { gainEv, signatureStat, evStatBonus, evTotal, topEvStats, evTotalCap, EV_STAT_CAP, EV_TOTAL_CAP } from "./evConfig"
import { getSpecies } from "./species"
import { computeStat } from "../battle/stats"
import type { MonInstance } from "../battle/types"

function mon(): MonInstance {
    return {
        uid: "t", speciesId: "feuillichot", level: 50, exp: 0,
        ivs: { hp: 0, atk: 0, def: 0, spe: 0, spc: 0 },
        currentHp: 1, status: "NONE", statusCounter: 0, moves: [],
    }
}

/** Mon capturé avec IV uniformes, niveau de capture et éligibilité au plafond modulé. */
function capturedMon(opts: { iv?: number; capLevel?: number; boost?: boolean }): MonInstance {
    const iv = opts.iv ?? 0
    return {
        ...mon(),
        ivs: { hp: iv, atk: iv, def: iv, spe: iv, spc: iv },
        capturedLevel: opts.capLevel,
        evCapBoost: opts.boost,
    }
}

describe("EV — expérience de combat", () => {
    it("⌊EV/4⌋ : 4 EV = +1 au terme interne", () => {
        expect(evStatBonus(0)).toBe(0)
        expect(evStatBonus(3)).toBe(0)
        expect(evStatBonus(4)).toBe(1)
        expect(evStatBonus(252)).toBe(63)
    })

    it("gainEv respecte le cap par stat", () => {
        const m = mon()
        const added = gainEv(m, "atk", 1000)
        expect(added).toBe(EV_STAT_CAP)
        expect(m.ev?.atk).toBe(EV_STAT_CAP)
    })

    it("gainEv respecte le budget total (≈ 2 stats maxées)", () => {
        const m = mon()
        gainEv(m, "atk", EV_STAT_CAP)
        gainEv(m, "spe", EV_STAT_CAP)
        const third = gainEv(m, "def", EV_STAT_CAP)
        expect(third).toBe(EV_TOTAL_CAP - 2 * EV_STAT_CAP) // 510 - 504 = 6
        expect(evTotal(m.ev)).toBe(EV_TOTAL_CAP)
    })

    it("signatureStat = plus haute base", () => {
        const sp = getSpecies("feuillichot")!
        const sig = signatureStat(sp)
        for (const k of ["hp", "atk", "def", "spe", "spc"] as const) {
            expect(sp.baseStats[sig]).toBeGreaterThanOrEqual(sp.baseStats[k])
        }
    })

    it("l'EV augmente bien la stat calculée (additif, plafonné)", () => {
        const base = computeStat(60, 0, 50, 0)
        const trained = computeStat(60, 0, 50, 252)
        expect(trained).toBeGreaterThan(base)
        expect(trained - base).toBe(Math.floor((63 * 50) / 100)) // ⌊EV/4⌋=63 × niv/100
    })

    it("topEvStats trie par EV décroissant", () => {
        const m = mon()
        gainEv(m, "spe", 40)
        gainEv(m, "atk", 80)
        expect(topEvStats(m.ev)).toEqual(["atk", "spe"])
    })
})

describe("EV — plafond modulé post-Ligue (evTotalCap)", () => {
    it("sans evCapBoost → 510, y compris avec IV parfaits/capture basse (NON rétroactif)", () => {
        expect(evTotalCap(mon())).toBe(EV_TOTAL_CAP)
        expect(evTotalCap(capturedMon({ iv: 15, capLevel: 5 }))).toBe(EV_TOTAL_CAP) // pas d'estampille → base
    })

    it("IV parfaits + capture niv 1-10 → 561 (plafond max)", () => {
        expect(evTotalCap(capturedMon({ iv: 15, capLevel: 5, boost: true }))).toBe(561)
    })

    it("paliers de capture (IV parfaits) : +5%/+3%/+1%/0%", () => {
        expect(evTotalCap(capturedMon({ iv: 15, capLevel: 15, boost: true }))).toBe(550) // 1.08
        expect(evTotalCap(capturedMon({ iv: 15, capLevel: 25, boost: true }))).toBe(540) // 1.06
        expect(evTotalCap(capturedMon({ iv: 15, capLevel: 60, boost: true }))).toBe(535) // 1.05 (génétique seul)
    })

    it("génétique proportionnel : 0 IV + capture niv 5 = +5% capture seul = 535", () => {
        expect(evTotalCap(capturedMon({ iv: 0, capLevel: 5, boost: true }))).toBe(535)
    })

    it("gainEv autorise à dépasser 510 jusqu'au plafond individuel", () => {
        const m = capturedMon({ iv: 15, capLevel: 5, boost: true }) // cap 561
        gainEv(m, "atk", EV_STAT_CAP)
        gainEv(m, "spe", EV_STAT_CAP)
        const third = gainEv(m, "def", EV_STAT_CAP)
        expect(third).toBe(561 - 2 * EV_STAT_CAP) // room = 561-504 = 57
        expect(evTotal(m.ev)).toBe(561)
    })
})
