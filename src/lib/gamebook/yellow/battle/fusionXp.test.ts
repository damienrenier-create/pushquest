import { describe, it, expect } from "vitest"
import { createMonInstance } from "./factory"
import { buildFusion, disposeFusion } from "../data/fusionMon"
import { creditFusionParents } from "./fusionXp"
import { maxHpOf } from "./engine"

type P = { uid: string; fusionParents?: [string, string] }

describe("Ligue Fusion — reversement d'XP aux parents (option A)", () => {
    it("buildFusion estampille les 2 parents (uids) sur l'instance fusionnée", () => {
        const a = createMonInstance("jerbiwat", 40)
        const b = createMonInstance("bouhbou", 40)
        const f = buildFusion(a, b)
        expect(f.instance.fusionParents).toEqual([a.uid, b.uid])
        disposeFusion(f.speciesId)
    })

    it("CHAQUE parent reçoit la MOITIÉ de l'XP du fusionné (pas un quart)", () => {
        const a = createMonInstance("jerbiwat", 30)
        const b = createMonInstance("bouhbou", 30)
        const startA = a.exp, startB = b.exp
        const fus: P = { uid: "fus1", fusionParents: [a.uid, b.uid] }
        const roster = new Map([[a.uid, a], [b.uid, b]])
        const { edited } = creditFusionParents([fus], { fus1: 200 }, (uid) => roster.get(uid))
        expect(edited.size).toBe(2)
        expect(edited.get(a.uid)!.exp).toBe(startA + 100) // 200/2 = 100 chacun
        expect(edited.get(b.uid)!.exp).toBe(startB + 100)
    })

    it("n'altère PAS les instances d'origine (édite des clones)", () => {
        const a = createMonInstance("jerbiwat", 30)
        const before = a.exp
        const fus: P = { uid: "f", fusionParents: [a.uid, "absent"] }
        creditFusionParents([fus], { f: 100 }, (uid) => (uid === a.uid ? a : undefined))
        expect(a.exp).toBe(before) // original intact
    })

    it("montée de niveau : niveau + delta de PV appliqués, résumé rempli", () => {
        const a = createMonInstance("jerbiwat", 5)
        const b = createMonInstance("bouhbou", 5)
        const roster = new Map([[a.uid, a], [b.uid, b]])
        const { edited, grew } = creditFusionParents([{ uid: "f", fusionParents: [a.uid, b.uid] }], { f: 100000 }, (uid) => roster.get(uid))
        const ea = edited.get(a.uid)!
        expect(ea.level).toBeGreaterThan(5)               // a bien monté
        expect(ea.currentHp).toBeGreaterThan(a.currentHp)      // a gagné des PV au level-up
        expect(ea.currentHp).toBeLessThanOrEqual(maxHpOf(ea))  // jamais au-dessus du max
        expect(grew.length).toBe(2)                        // 2 parents ont monté
    })

    it("parents introuvables → sautés sans crash ; XP nulle / pas de parents → rien", () => {
        const a = createMonInstance("jerbiwat", 30)
        expect(creditFusionParents([{ uid: "f", fusionParents: ["x", "y"] }], { f: 100 }, () => undefined).edited.size).toBe(0)
        expect(creditFusionParents([{ uid: "f", fusionParents: [a.uid, "y"] }], { f: 1 }, () => a).edited.size).toBe(0) // half=0
        expect(creditFusionParents([{ uid: "f" }], { f: 999 }, () => a).edited.size).toBe(0)                            // pas de parents
        expect(creditFusionParents([{ uid: "f", fusionParents: [a.uid, "y"] }], undefined, () => a).edited.size).toBe(0) // xpByUid absent
    })

    it("un même parent n'est crédité qu'UNE fois (pas de double-crédit)", () => {
        const a = createMonInstance("jerbiwat", 30)
        const start = a.exp
        // deux fusions référencent le même parent (cas théorique) → une seule crédite
        const { edited } = creditFusionParents(
            [{ uid: "f1", fusionParents: [a.uid, "b1"] }, { uid: "f2", fusionParents: [a.uid, "b2"] }],
            { f1: 100, f2: 100 },
            (uid) => (uid === a.uid ? a : undefined),
        )
        expect(edited.get(a.uid)!.exp).toBe(start + 50) // 100/2 = 50, une seule fois (pas 100)
    })
})
