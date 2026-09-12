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

// APOTHEOSE (CT52, la CT-trophee du blackjack) prend le type du parent TETE et frappe sur la MEILLEURE stat
//   offensive. Le moteur l'applique ; l'IA, elle, la jugeait sur sa fiche brute — type NORMAL, donc categorie
//   PHYSIQUE. Sur le Voltombre d'ACE (atk 314 / spc 748) elle l'estimait a moins de la moitie de sa force et ne
//   la jouait donc jamais, alors que c'est precisement sa reponse aux types SOL (qui immunisent tout son ELEC).
describe("IA — Apotheose est evaluee comme le moteur la joue", () => {
    it("le Voltombre d'ACE sort Apotheose contre un SOL, qui mure tout son arsenal ELEC", () => {
        const team = buildPlatineAceTeam()
        try {
            const v = team.find((f) => getSpecies(f.speciesId)?.name === "Voltombre")!
            const self = toBattleMon(v.instance)

            // Le parent TETE doit etre ombrapanthe : sinon Apotheose sortirait en ELEC, donc a nouveau immunisee.
            expect(v.result.types[0]).toBe("SPECTRE")
            expect(self.moves.some((m) => m.moveId === "apotheose")).toBe(true)

            const sol = firstSpeciesTyped(["SOL"])
            if (sol) expect(pick(self, sol.id)).toBe("apotheose")
        } finally { disposeFusionLeagueTeam(team) }
    })

    it("…et garde son ELEC quand il est super-efficace (elle ne devient pas le coup par defaut)", () => {
        const team = buildPlatineAceTeam()
        try {
            const v = team.find((f) => getSpecies(f.speciesId)?.name === "Voltombre")!
            const self = toBattleMon(v.instance)
            const eau = firstSpeciesTyped(["EAU"])
            // Lequel des deux ELEC importe peu — et l'IA a raison de les departager a l'ESPERANCE :
            // Ultra-Foudre (110 a 80 %) vaut 88, Fulgurance (90 a 100 %) vaut 90. Ce qui compte ici,
            // c'est qu'elle frappe en ELEC plutot que de sortir Apotheose par defaut.
            if (eau) expect(["ultra_foudre", "fulgurance"]).toContain(pick(self, eau.id))
        } finally { disposeFusionLeagueTeam(team) }
    })

    it("l'equipe d'ACE garde son crescendo de puissance apres l'inversion des parents", () => {
        const team = buildPlatineAceTeam()
        try {
            const bst = team.map((f) => Object.values(f.result.stats).reduce((a, b) => a + b, 0))
            expect(bst).toEqual([...bst].sort((a, b) => a - b)) // strictement croissant
            expect(bst[bst.length - 1]).toBe(2479)              // Voltombre reste l'ACE de l'ACE
        } finally { disposeFusionLeagueTeam(team) }
    })
})
