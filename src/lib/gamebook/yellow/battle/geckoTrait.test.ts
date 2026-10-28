import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn } from "./engine"
import { createMonInstance } from "./factory"
import { GECKO_SPECIES_IDS, geckoSurvivePct } from "../data/geckoTrait"
import { getSpecies } from "../data/species"

// Sartay, 28/10/2026 : « les géckos sont trop faibles : à l'état sauvage, ne pas se faire one-shoter mais survivre si
// l'attaque est un one hit KO ; une fois capturés, 10 % du temps ». Un Razmarée niv 100 en Surf (précision 100) met
// n'importe quel gécko niv 5 K.O. d'un coup : quand le coup porte, seul le trait peut le laisser debout (à 1 PV ; il peut
// ensuite se soigner dans le même tour, d'où le test sur le message et l'absence de K.O. plutôt que sur les PV finaux).
const surfOn = (defenderId: string, isWild: boolean, seed: number) => {
    const s0 = createBattle([createMonInstance("razmaree", 100, { moveIds: ["surf"] })], [createMonInstance(defenderId, 5)], { isWild, seed })
    const s1 = resolveTurn(s0, { kind: "move", moveIndex: 0 })
    const texts = s1.events.flatMap((e) => (e.kind === "message" ? [e.text] : []))
    const held = texts.some((t) => t.includes("tient à 1 PV") || t.includes("s'accroche à 1 PV"))
    const ko = s1.enemy.team[s1.enemy.activeIndex].currentHp === 0
    return { landed: held || ko, held, ko } // ni l'un ni l'autre : le coup n'a pas eu lieu (raté, désobéissance du niv 100…)
}

describe("🦎 Carapace fossile des géckos", () => {
    it("à l'état sauvage, aucun gécko n'est mis K.O. d'un seul coup depuis ses PV pleins : il tient à 1 PV", () => {
        for (const id of GECKO_SPECIES_IDS) {
            let landed = 0
            for (let seed = 1; seed <= 40; seed++) {
                const r = surfOn(id, true, seed)
                if (!r.landed) continue
                landed++
                expect(r.ko, `${id} graine ${seed}`).toBe(false)
                expect(r.held, `${id} graine ${seed}`).toBe(true)
            }
            expect(landed, id).toBeGreaterThan(20) // le test porte bien sur des coups réels
        }
    })
    it("chez un dresseur (comme une fois capturé) : environ 1 fois sur 10", () => {
        let held = 0, landed = 0
        for (let seed = 1; seed <= 800; seed++) { const r = surfOn("gekroc", false, seed); if (!r.landed) continue; landed++; if (r.held) held++ }
        expect(landed).toBeGreaterThan(400)
        expect(held / landed).toBeGreaterThan(0.06)
        expect(held / landed).toBeLessThan(0.15)
    })
    it("les autres Daemons ne sont pas concernés (témoin)", () => {
        for (let seed = 1; seed <= 10; seed++) expect(surfOn("pampousse", true, seed).held).toBe(false)
        expect(geckoSurvivePct("pampousse", true)).toBe(0)
        expect(geckoSurvivePct("gekosmic", true)).toBe(100)
        expect(geckoSurvivePct("gekosmic", false)).toBe(10)
    })
    it("le Pokédex l'annonce pour les 5 géckos", () => {
        for (const id of GECKO_SPECIES_IDS) expect(getSpecies(id)!.description, id).toContain("une fois capturé, ce réflexe ne joue plus qu'une fois sur dix")
    })
})
