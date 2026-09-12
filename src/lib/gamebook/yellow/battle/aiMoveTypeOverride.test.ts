import { describe, it, expect } from "vitest"
import { buildPlatineAceTeam, disposeFusionLeagueTeam } from "../data/fusionLeague"
import { createMonInstance } from "./factory"
import { toBattleMon } from "./engine"
import { chooseAiAction } from "./ai"
import { Rng } from "./rng"
import { SPECIES, getSpecies } from "../data/species"
import type { BattleMon } from "./types"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// L'IA DOIT RAISONNER SUR LE TYPE **EFFECTIF** D'UNE ATTAQUE
//
// Une fusion à TYPE FORCÉ transmute la 1re attaque offensive de chaque parent dans son propre type
// (moveTypeOverride, appliqué par engine.ts). L'IA, elle, lisait le type D'ORIGINE : le Cendrecerf d'ACE
// évaluait son Lance-Soleil comme une attaque PLANTE — donc ×0,5 sur une cible Plante et sans STAB — et lui
// préférait un coup deux fois plus faible. Elle sabotait la fusion la plus chère du couloir platine, et
// pouvait rater un K.O. qu'elle tenait (bestKoMove partage la même estimation).
//
// Cendrecerf est le cas réel : [TÉNÈBRES], Lance-Soleil transmuté (120 de puissance, STAB), Lance-Flammes
// laissé en FEU. Contre une cible où TÉNÈBRES est super-efficace et FEU non, le bon choix est évident —
// et c'est exactement celui que l'IA ratait.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const firstSpeciesTyped = (types: string[]) =>
    Object.values(SPECIES).find((s) => s.types.length === types.length && types.every((t, i) => s.types[i] === t))

const pick = (self: BattleMon, foeSpeciesId: string): string => {
    const foe = toBattleMon(createMonInstance(foeSpeciesId, 100))
    const c = chooseAiAction(self, foe, [self], 0, "hof", new Rng(7))
    return c.kind === "move" ? self.moves[c.moveIndex ?? 0].moveId : c.kind
}

describe("IA — le type transmuté d'une fusion est pris en compte", () => {
    it("le Cendrecerf d'ACE lance bien son coup TÉNÈBRES là où il est super-efficace", () => {
        const team = buildPlatineAceTeam()
        try {
            const cendre = team.find((f) => getSpecies(f.speciesId)?.name === "Cendrecerf")
            expect(cendre).toBeDefined()
            const self = toBattleMon(cendre!.instance)

            // Prérequis : l'override est bien posé (sinon le test ne prouverait rien).
            expect(self.moveTypeOverride?.lance_soleil).toBe("TENEBRES")
            expect(self.moveTypeOverride?.lance_flammes).toBeUndefined()

            // PSY et SPECTRE encaissent ×2 des TÉNÈBRES. Avant le correctif : lance_flammes (l'IA croyait
            // Lance-Soleil PLANTE). Après : lance_soleil, qui frappe deux fois plus fort.
            for (const types of [["PSY"], ["SPECTRE"], ["PLANTE", "PSY"]]) {
                const sp = firstSpeciesTyped(types)
                if (!sp) continue // le dex évolue : on n'échoue pas sur un typage absent
                expect(pick(self, sp.id), `cible ${sp.name} [${types.join("/")}]`).toBe("lance_soleil")
            }
        } finally { disposeFusionLeagueTeam(team) }
    })

    it("sans override, rien ne change : le meilleur coup reste choisi sur son type déclaré", () => {
        // Cible PLANTE pure : Lance-Flammes (FEU ×2, sans STAB) bat Lance-Soleil (TÉNÈBRES neutre + STAB).
        // L'IA doit donc préférer le FEU — preuve qu'on n'a pas simplement forcé l'attaque transmutée.
        const team = buildPlatineAceTeam()
        try {
            const cendre = team.find((f) => getSpecies(f.speciesId)?.name === "Cendrecerf")!
            const self = toBattleMon(cendre.instance)
            const plante = firstSpeciesTyped(["PLANTE"])
            if (plante) expect(pick(self, plante.id)).toBe("lance_flammes")
        } finally { disposeFusionLeagueTeam(team) }
    })
})
