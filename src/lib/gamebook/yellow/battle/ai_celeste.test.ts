import { describe, it, expect } from "vitest"
import { chooseAiAction } from "./ai"
import { toBattleMon } from "./engine"
import { createMonInstance } from "./factory"
import { Rng } from "./rng"
import type { BattleMon } from "./types"

// RANCŒUR CÉLESTE (Sartay, 01/11/2026) : « l'ordi ne l'utilise jamais plus de deux fois d'affilée ». L'IA la valorise comme un
// soin TOTAL différé (PV manquants), ou comme une ESQUIVE quand l'adversaire peut l'achever ce tour et qu'elle joue avant lui
// (IA « ace » et au-dessus). Elle la MASQUE (jamais choisie) : 2 lancers d'affilée, déjà disparue, 3 soins consommés, ou un
// poison qui la tuerait avant le soin final. (Le moteur double ce garde-fou : cf. rancoeur_celeste.test.ts.)

const CELESTE = "rancoeur_celeste"
const LEVELS = ["wild", "trainer", "ace", "hof", "elite"] as const
const mon = (sp: string, L: number, moveIds?: string[]) => toBattleMon(createMonInstance(sp, L, { owned: false, ...(moveIds ? { moveIds } : {}) }))
const at = (m: BattleMon, frac: number) => { m.currentHp = Math.max(1, Math.floor(m.currentHp * frac)); return m }
const picked = (m: BattleMon, c: { kind: string; moveIndex?: number }) => c.kind === "move" && c.moveIndex !== undefined && c.moveIndex >= 0 ? m.moves[c.moveIndex].moveId : c.kind
const pick = (self: BattleMon, foe: BattleMon, lvl: typeof LEVELS[number], seed: number) => picked(self, chooseAiAction(self, foe, [self], 0, lvl, new Rng(seed)))

describe("Rancœur Céleste — l'ordinateur ne la lance jamais plus de deux fois d'affilée", () => {
    it("kit par défaut au niveau 66 : Onde Folie, Rancœur Céleste, Frappe de l'Au-delà, Raitei", () => {
        expect(mon("namizeus", 66).moves.map((m) => m.moveId)).toEqual(["onde_folie", CELESTE, "frappe_audela", "raitei"])
    })
    it("série de 2 : jamais une 3e, à tous les niveaux d'IA, même au bord du K.O.", () => {
        for (const lvl of LEVELS) for (const frac of [1, 0.4, 0.1]) for (const foeId of ["megalithe", "crocavern", "razmaree"]) for (let s = 1; s <= 60; s++) {
            const self = at(mon("namizeus", 66), frac); self.vanishCastStreak = 2
            expect(pick(self, mon(foeId, 66), lvl, s), `${lvl} ${frac} ${foeId} seed ${s}`).not.toBe(CELESTE)
        }
    })
    it("série de 1 : la 2e reste permise (le cas d'esquive la déclenche)", () => {
        const self = at(mon("namizeus", 66), 0.15); self.vanishCastStreak = 1
        expect(pick(self, mon("megalithe", 66), "hof", 1)).toBe(CELESTE)
    })
})

describe("Rancœur Céleste — quand l'IA la lance", () => {
    it("ÉCHAPPER À UN K.O. : 15 % PV, plus rapide, Mégalithe peut l'achever → ace/hof/elite disparaissent", () => {
        for (const lvl of ["ace", "hof", "elite"] as const) for (let s = 1; s <= 100; s++) {
            expect(pick(at(mon("namizeus", 66), 0.15), mon("megalithe", 66), lvl, s), `${lvl} seed ${s}`).toBe(CELESTE)
        }
    })
    it("l'IA « trainer » reste naïve : pas de bonus d'esquive (elle frappe)", () => {
        for (let s = 1; s <= 100; s++) expect(pick(at(mon("namizeus", 66), 0.15), mon("megalithe", 66), "trainer", s)).not.toBe(CELESTE)
    })
    it("PV pleins : jamais pour trainer/ace/hof/elite (rien à soigner, pas de K.O. en vue)", () => {
        for (const lvl of ["trainer", "ace", "hof", "elite"] as const) for (let s = 1; s <= 100; s++) {
            expect(pick(mon("namizeus", 66), mon("megalithe", 66), lvl, s)).not.toBe(CELESTE)
        }
    })
    it("pilote d'archétype (kit avec Mirage, IA hof) : soin de secours à 35 % face à un spécial qui ne l'achève pas", () => {
        const self = at(mon("namizeus", 60, ["mirage", "fulgurance", "ball_ombre", CELESTE]), 0.35)
        expect(pick(self, mon("razmaree", 60), "hof", 1)).toBe(CELESTE)
    })
})

describe("Rancœur Céleste — quand l'IA ne la lance JAMAIS", () => {
    it("plafond de régénération épuisé (3 soins)", () => {
        for (const lvl of LEVELS) for (let s = 1; s <= 60; s++) {
            const self = at(mon("namizeus", 66), 0.15); self.healsUsed = 3
            expect(pick(self, mon("megalithe", 66), lvl, s)).not.toBe(CELESTE)
        }
    })
    it("déjà disparue : ses actions cachées sont des choix normaux, sans relancer Rancœur", () => {
        for (const lvl of LEVELS) for (let s = 1; s <= 60; s++) {
            const self = at(mon("namizeus", 66), 0.15); self.vanishTurns = 2
            expect(pick(self, mon("megalithe", 66), lvl, s)).not.toBe(CELESTE)
        }
    })
    it("poison grave : elle mourrait pendant sa disparition, avant le soin", () => {
        for (const lvl of LEVELS) for (let s = 1; s <= 60; s++) {
            const self = at(mon("namizeus", 66), 0.15); self.status = "TOXIC"; self.statusCounter = 4
            expect(pick(self, mon("megalithe", 66), lvl, s)).not.toBe(CELESTE)
        }
    })
    it("seule attaque du kit et interdite : Charge Désespérée plutôt que Rancœur", () => {
        for (const lvl of LEVELS) {
            const self = mon("namizeus", 66, [CELESTE]); self.vanishCastStreak = 2
            const c = chooseAiAction(self, mon("megalithe", 66), [self], 0, lvl, new Rng(3))
            expect(c).toEqual({ kind: "move", moveIndex: -1 })
        }
    })
})

describe("Rancœur Céleste — pendant l'orage (Daemon invisible)", () => {
    const KIT = [CELESTE, "repos", "ball_ombre", "frappe_audela"]
    it("ne se soigne pas : le soin TOTAL de fin d'orage arrive (sinon une 4e régénération devenait possible)", () => {
        for (const lvl of ["trainer", "ace", "hof", "elite"] as const) for (const used of [0, 2]) for (const foeId of ["megalithe", "crocavern", "geckebre"]) for (let s = 1; s <= 40; s++) {
            const self = at(mon("namizeus", 66, KIT), 0.3); self.vanishTurns = 3; self.healsUsed = used
            expect(pick(self, mon(foeId, 66), lvl, s), `${lvl} ${used} ${foeId} seed ${s}`).not.toBe("repos")
        }
        // Contrôle : VISIBLE au même état, l'IA « hof » se soigne (le test ci-dessus mesure donc bien l'orage).
        const vis = at(mon("namizeus", 66, KIT), 0.3); vis.vanishCastStreak = 2
        expect(pick(vis, mon("megalithe", 66), "hof", 1)).toBe("repos")
    })
    it("ne rappelle pas un Daemon invisible (hof, ace) : il jetterait l'orage et son soin", () => {
        for (const lvl of ["hof", "ace"] as const) for (const foeId of ["crocavern", "geckebre"]) {
            let switchedVisible = 0
            for (let s = 1; s <= 100; s++) {
                const hidden = mon("namizeus", 66); hidden.vanishTurns = 3
                expect(chooseAiAction(hidden, mon(foeId, 66), [hidden, mon("aquilothan", 66)], 0, lvl, new Rng(s)).kind, `${lvl} ${foeId} seed ${s}`).toBe("move")
                const visible = mon("namizeus", 66)
                if (chooseAiAction(visible, mon(foeId, 66), [visible, mon("aquilothan", 66)], 0, lvl, new Rng(s)).kind === "switch") switchedVisible++
            }
            expect(switchedVisible, `${lvl} ${foeId} : contrôle, visible il se replie`).toBeGreaterThan(0)
        }
    })
})
