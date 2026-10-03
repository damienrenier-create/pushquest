import { describe, it, expect } from "vitest"
import { createBattle, resolveTurn, type BattleState } from "./engine"
import { createMonInstance } from "./factory"
import { gainEv, evTotal, signatureStat, EV_YIELD_PER_WIN, EV_STAT_CAP, evTotalCap } from "../data/evConfig"
import { SPECIES, getSpecies } from "../data/species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// 🍬 BON BONBON EV (vœu de Zyran)
//
// Zyran demandait « un sachet de bonbons pour booster une stat à son maximum d'EV en une seule prise ». La
// contrepartie posée par Sartay : il choisit la BOUCHE (il donne le bonbon à un Daemon avant le combat), mais
// c'est l'ADVERSAIRE VAINCU qui choisit la STAT — sa stat-signature. Il faut donc chasser la bonne proie.
//
// Ce qui compte ici : que le gain soit vraiment MAXIMAL (et non les 3 habituels), qu'il aille dans la stat du
// VAINCU, qu'un bonbon sans place ne soit PAS gaspillé, qu'un joueur sans bonbon ne voie aucun changement, et
// que le bonbon SURVIVE aux deux sérialiseurs (le piège classique : un champ oublié disparaît en silence).
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const CIBLE_ID = Object.keys(SPECIES)[0]
/** Un adversaire volontairement fragile : le premier coup le met à terre. */
const cible = () => { const m = createMonInstance(CIBLE_ID, 2); m.currentHp = 1; return m }
/** Le Daemon du joueur, assez costaud pour frapper le premier. */
const frappeur = () => createMonInstance(Object.keys(SPECIES).find((k) => SPECIES[k].learnset.length > 0) ?? CIBLE_ID, 60)

function jusquAuKo(s: BattleState): BattleState {
    for (let i = 0; i < 12 && s.phase !== "ended"; i++) s = resolveTurn(s, { kind: "move", moveIndex: 0 })
    return s
}
/** La stat que le vaincu impose (sa plus haute base). */
const statImposee = () => signatureStat(getSpecies(CIBLE_ID)!)

describe("le bonbon pousse la stat du VAINCU à son maximum", () => {
    it("⚠️ sans bonbon : gain habituel de 3, rien de plus (non-régression)", () => {
        const h = frappeur()
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(fin.player.team[0].ev?.[statImposee()] ?? 0).toBe(EV_YIELD_PER_WIN)
    })

    it("avec un bonbon : la stat du vaincu part AU PLAFOND d'un coup", () => {
        const h = frappeur(); h.evCandy = 1
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        const gagnant = fin.player.team[0]
        expect(gagnant.ev?.[statImposee()] ?? 0).toBe(EV_STAT_CAP)
        expect(gagnant.ev![statImposee()]!).toBeGreaterThan(EV_YIELD_PER_WIN * 50) // sans équivoque : ce n'est pas un gain normal
    })

    it("le bonbon est CONSOMMÉ par ce K.O. (pas de double usage)", () => {
        const h = frappeur(); h.evCandy = 1
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(fin.player.team[0].evCandy ?? 0).toBe(0)
    })

    it("deux bonbons empilés : le second reste en joue pour le K.O. suivant", () => {
        const h = frappeur(); h.evCandy = 2
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(fin.player.team[0].evCandy).toBe(1)
    })

    it("le joueur annonce bien son effet à l'écran", () => {
        const h = frappeur(); h.evCandy = 1
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        const dit = (fin.events ?? []).some((e) => e.kind === "message" && /Bon Bonbon/i.test((e as { text: string }).text))
        expect(dit).toBe(true)
    })
})

describe("un bonbon ne se gaspille jamais", () => {
    it("⚠️ aucune place (stat déjà au plafond) → le bonbon N'EST PAS consommé", () => {
        const h = frappeur()
        gainEv(h, statImposee(), EV_STAT_CAP) // la stat visée est déjà pleine
        h.evCandy = 1
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(fin.player.team[0].evCandy).toBe(1) // toujours en joue
        const dit = (fin.events ?? []).some((e) => e.kind === "message" && /garde son bonbon/i.test((e as { text: string }).text))
        expect(dit).toBe(true)
    })

    it("le budget TOTAL de l'individu est respecté — le bonbon ne le fait pas déborder", () => {
        const h = frappeur()
        const cap = evTotalCap(h)
        h.evCandy = 1
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7 }))
        expect(evTotal(fin.player.team[0].ev ?? {})).toBeLessThanOrEqual(cap)
    })
})

// LE PIEGE DE LA PERSISTANCE : les Daemons passent par DEUX filtres a champs explicites — toMonInstance a chaque
//   fin de combat, parseMon a chaque rechargement. Un champ oublie dans l'un des deux disparait sans bruit, et ici
//   ce serait un bonbon offert par le genie qui s'evapore.
describe("le bonbon survit à la persistance", () => {
    it("toMonInstance (fin de combat) garde evCandy", async () => {
        const { toMonInstance } = await import("../storage/save")
        const m = frappeur(); m.evCandy = 2
        expect(toMonInstance({ ...m, stages: {}, volatiles: {} } as never).evCandy).toBe(2)
    })

    it("un aller-retour JSON complet (fin de combat → save → rechargement) le garde aussi", async () => {
        const { toMonInstance, parseSave } = await import("../storage/save") as any
        const m = toMonInstance({ ...frappeur(), evCandy: 3, stages: {}, volatiles: {} } as never)
        const back = parseSave(JSON.parse(JSON.stringify({ version: 2, team: [m], pc: [] })))
        expect(back.team[0].evCandy).toBe(3)
    })

    it("un Daemon SANS bonbon n'en gagne pas au passage", async () => {
        const { toMonInstance, parseSave } = await import("../storage/save") as any
        const m = toMonInstance({ ...frappeur(), stages: {}, volatiles: {} } as never)
        expect(m.evCandy).toBeUndefined()
        expect(parseSave(JSON.parse(JSON.stringify({ version: 2, team: [m], pc: [] }))).team[0].evCandy).toBeUndefined()
    })
})

describe("priorité face au premier vœu de Zyran (remise à zéro des EV)", () => {
    it("⚠️ le bonbon PASSE DEVANT : donner un bonbon est délibéré, la remise à zéro est passive", () => {
        const h = frappeur(); h.evCandy = 1
        gainEv(h, "atk", 100)
        const fin = jusquAuKo(createBattle([h], [cible()], { isWild: true, seed: 7, evResetCharges: 5 }))
        const gagnant = fin.player.team[0]
        expect(evTotal(gagnant.ev ?? {})).toBeGreaterThan(0)          // PAS remis à zéro
        expect(gagnant.ev?.[statImposee()] ?? 0).toBe(EV_STAT_CAP)     // le bonbon a bien agi
        expect(fin.evResetUsed ?? 0).toBe(0)                           // et aucune charge de remise à zéro n'a été touchée
    })
})
