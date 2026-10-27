import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { createMonInstance } from "../battle/factory"
import { fullStats } from "../battle/stats"
import { getSpecies } from "../data/species"
import { GENIE_PERSISTENT_EFFECT_KINDS } from "../data/genieLamp"
import type { MonInstance } from "../battle/types"
import { setActiveWorld, hydratePlayer, getPlayer, applyAcceptedGenieWishEffects, hasWildHealPerk, healStandingTeam, WILD_HEAL_MARKER } from "./playerStore"

// VŒU DE GASS (27/10/2026) — « Mes daemons se soignent à la fin de chaque combat », accordé par Sartay CONTRE LES SAUVAGES
// seulement (« triple ok ») : victoire ou capture (pas la fuite), les K.O. restent K.O., jamais au run 3.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const maxHp = (m: MonInstance) => fullStats(m, getSpecies(m.speciesId)!).hp

describe("vœu de Gass : soin après chaque combat SAUVAGE gagné", () => {
    it("effet du génie wild_heal : marqueur permanent posé à l'acceptation, rejoué dans les autres mondes", () => {
        setActiveWorld("live")
        hydratePlayer({ team: [createMonInstance("rochison", 20)], pc: [], items: {}, defeatedTrainers: [] })
        expect(hasWildHealPerk()).toBe(false)
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify([{ kind: "wild_heal" }]), condition1: "x", round: 0 })).toBe(true)
        expect(hasWildHealPerk()).toBe(true)
        expect(getPlayer().defeatedTrainers).toContain(WILD_HEAL_MARKER)
        expect(GENIE_PERSISTENT_EFFECT_KINDS.has("wild_heal")).toBe(true)
    })
    it("run 3 (concours) : le vœu n'y est pas appliqué", () => {
        setActiveWorld("run3")
        hydratePlayer({ team: [createMonInstance("rochison", 20)], pc: [], items: {}, defeatedTrainers: [] })
        expect(applyAcceptedGenieWishEffects({ accepted1: true, effect1: JSON.stringify([{ kind: "wild_heal" }]), condition1: "x", round: 0 })).toBe(false)
        expect(hasWildHealPerk()).toBe(false)
        setActiveWorld("live")
    })
    it("healStandingTeam : PV/PP/statut des Daemons DEBOUT ; les K.O. restent K.O.", () => {
        const a = createMonInstance("rochison", 30); a.currentHp = 5; a.status = "POISON"; a.moves = a.moves.map((mv) => ({ ...mv, pp: 0 }))
        const ko = createMonInstance("plumiot", 12); ko.currentHp = 0
        hydratePlayer({ team: [a, ko], pc: [], items: {}, defeatedTrainers: [] })
        healStandingTeam()
        const [ha, hk] = getPlayer().team
        expect(ha.currentHp).toBe(maxHp(ha)); expect(ha.status).toBe("NONE"); expect(ha.moves.every((mv) => mv.pp === mv.ppMax)).toBe(true)
        expect(hk.currentHp).toBe(0)
    })
    it("câblage fin de combat : sauvage + victoire ou capture + perk + hors run 3 ; soin avant ET après les évolutions ; annulation re-plafonnée", () => {
        const bs = read("src/lib/gamebook/yellow/store/battleStore.ts")
        const cond = "const wildHeal = b.isWild && (b.outcome === \"win\" || b.outcome === \"caught\") && hasWildHealPerk() && effectiveRunWorld() !== \"run3\""
        expect(bs).toContain(cond)
        const heals = [...bs.matchAll(/if \(wildHeal\) healStandingTeam\(\)/g)].map((m) => m.index ?? 0)
        expect(heals).toHaveLength(2)
        const evo = bs.indexOf("const evos = isFactory ? [] : evolveTeam(team)")
        expect(heals[0]).toBeLessThan(evo); expect(heals[1]).toBeGreaterThan(evo)
        expect(heals[0]).toBeGreaterThan(bs.indexOf("setTeam(stripMinitelReserve(teamOut).map(toMonInstance))"))
        expect(bs).toContain("if (sp0) mon.currentHp = Math.min(mon.currentHp, fullStats(mon, sp0).hp)")
    })
})
