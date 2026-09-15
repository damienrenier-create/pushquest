import { describe, it, expect } from "vitest"
import {
    freshShinyWish, shinyWishActive, onWildPop, makeEphemeralShiny, takeShinyKo, isEphemeralShiny,
    shinyKoMessage, shinyPopMessage, SHINY_WISH_MAX_POP,
} from "./ephemeralShiny"
import { createMonInstance } from "../battle/factory"
import { SPECIES } from "./species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// SHINY ÉPHÉMÈRES (vœu de Task1) — la règle, tick par tick
//
// Six charges, une par jour au plus. Chaque jour : tirage d'un N ∈ [1,30], le N-ième pop sauvage est shiny et
// tient N K.O. La charge ne part QUE quand le shiny sort — un jour où il pope trop peu n'en coûte pas. À zéro
// K.O. : couleurs, +10 % ET IV re-tirés. Tout est injecté (jour, hasard) : on peut rejouer n'importe quel scénario.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

/** Un rng qui rend une suite fixée, puis 0. */
const seq = (...vals: number[]) => { let i = 0; return () => (i < vals.length ? vals[i++] : 0) }
/** rng qui force le tirage N (N ∈ [1,30]) : (N-1)/30 tombe pile dans la case N. */
const forceN = (n: number) => seq((n - 1) / SHINY_WISH_MAX_POP)
const anyMon = () => createMonInstance(Object.keys(SPECIES)[0], 12)

describe("shiny éphémère — le tirage du jour", () => {
    it("un nouveau jour tire un N entre 1 et 30, jamais en dehors", () => {
        for (const r of [0, 0.5, 0.999]) {
            const { state, shinyKo } = onWildPop(freshShinyWish(), "2026-09-15", seq(r))
            // Si N=1, ce premier pop EST le shiny et target est déjà consommé : le N se lit alors dans shinyKo.
            const n = shinyKo ?? state.target
            expect(n).toBeGreaterThanOrEqual(1)
            expect(n).toBeLessThanOrEqual(30)
            expect(state.day).toBe("2026-09-15")
        }
        expect(onWildPop(freshShinyWish(), "d", seq(0)).shinyKo).toBe(1)          // r=0 → N=1
        expect(onWildPop(freshShinyWish(), "d", seq(0.999)).state.target).toBe(30) // r→1 → N=30
    })

    it("le N-ième pop est shiny, et sa durabilité vaut N", () => {
        let s = freshShinyWish()
        const rng = forceN(3)
        let out = onWildPop(s, "d1", rng); s = out.state; expect(out.shinyKo).toBeUndefined() // pop 1
        out = onWildPop(s, "d1", rng); s = out.state; expect(out.shinyKo).toBeUndefined()     // pop 2
        out = onWildPop(s, "d1", rng); s = out.state
        expect(out.shinyKo).toBe(3)                                                          // pop 3 : LUI
        expect(s.charges).toBe(5)                                                            // une charge est partie
    })

    it("le premier pop peut être le bon (N=1) : il ne tiendra qu'un K.O.", () => {
        const out = onWildPop(freshShinyWish(), "d1", forceN(1))
        expect(out.shinyKo).toBe(1)
    })

    it("max UN shiny par jour : après la sortie, plus rien jusqu'à demain", () => {
        let s = onWildPop(freshShinyWish(), "d1", forceN(1)).state
        for (let i = 0; i < 40; i++) {
            const out = onWildPop(s, "d1", forceN(1)); s = out.state
            expect(out.shinyKo).toBeUndefined()
        }
        expect(s.charges).toBe(5) // toujours une seule charge consommée
    })

    it("⚠️ s'arrêter avant le N-ième pop ne coûte PAS la charge (6 charges = 6 shiny, pas 6 jours)", () => {
        let s = freshShinyWish()
        const rng = forceN(25)
        for (let i = 0; i < 10; i++) s = onWildPop(s, "d1", rng).state // il s'arrête à 10 pops, le shiny était au 25e
        expect(s.charges).toBe(6)
        // le lendemain, nouveau tirage, la chance est intacte
        const out = onWildPop(s, "d2", forceN(1))
        expect(out.shinyKo).toBe(1)
        expect(out.state.charges).toBe(5)
    })

    it("le lendemain, le compteur de pops repart de zéro et un nouveau N est tiré", () => {
        let s = freshShinyWish()
        s = onWildPop(s, "d1", forceN(20)).state
        s = onWildPop(s, "d1", forceN(20)).state
        expect(s.pops).toBe(2)
        const out = onWildPop(s, "d2", forceN(5))
        expect(out.state.day).toBe("d2")
        expect(out.state.pops).toBe(1)
        expect(out.state.target).toBe(5)
    })

    it("à zéro charge, le vœu ne fait plus rien — et ne touche pas à l'état", () => {
        const s = { ...freshShinyWish(0) }
        const out = onWildPop(s, "d1", forceN(1))
        expect(out.shinyKo).toBeUndefined()
        expect(out.state).toBe(s)
        expect(shinyWishActive(s)).toBe(false)
        expect(shinyWishActive(freshShinyWish())).toBe(true)
        expect(shinyWishActive(null)).toBe(false)
    })

    it("six jours de chance → six shiny, pas un de plus", () => {
        let s = freshShinyWish()
        let sortis = 0
        for (let d = 1; d <= 10; d++) {
            const out = onWildPop(s, `d${d}`, forceN(1)); s = out.state
            if (out.shinyKo) sortis++
        }
        expect(sortis).toBe(6)
        expect(s.charges).toBe(0)
    })
})

describe("shiny éphémère — la vie du Daemon", () => {
    it("le shiny éphémère est shiny, avec des IV parfaits, et un compteur", () => {
        const m = makeEphemeralShiny(anyMon(), 7)
        expect(m.shiny).toBe(true)
        expect(Object.values(m.ivs)).toEqual([15, 15, 15, 15, 15])
        expect(m.shinyKoLeft).toBe(7)
        expect(isEphemeralShiny(m)).toBe(true)
    })

    it("chaque K.O. encaissé use le compteur, sans toucher au reste tant qu'il en reste", () => {
        let m = makeEphemeralShiny(anyMon(), 3)
        let r = takeShinyKo(m, () => 0.5); m = r.mon
        expect(r.faded).toBe(false); expect(r.left).toBe(2); expect(m.shiny).toBe(true)
        expect(Object.values(m.ivs)).toEqual([15, 15, 15, 15, 15])
        r = takeShinyKo(m, () => 0.5); m = r.mon
        expect(r.left).toBe(1); expect(m.shiny).toBe(true)
    })

    it("⚠️ au dernier K.O. : plus shiny, compteur retiré, et IV RE-TIRÉS au hasard (retour complet)", () => {
        const m = makeEphemeralShiny(anyMon(), 1)
        const r = takeShinyKo(m, seq(0.1, 0.9, 0.5, 0.0, 0.99))
        expect(r.faded).toBe(true)
        expect(r.mon.shiny).toBeFalsy()
        expect(r.mon.shinyKoLeft).toBeUndefined()
        expect(isEphemeralShiny(r.mon)).toBe(false)
        expect(r.mon.ivs).toEqual({ hp: 1, atk: 14, def: 8, spe: 0, spc: 15 }) // = floor(rng*16), pas les 15 partout
    })

    it("un shiny NATUREL (sans compteur) n'est jamais touché par ce mécanisme", () => {
        const natural = { ...anyMon(), shiny: true }
        expect(isEphemeralShiny(natural)).toBe(false)
    })

    it("les messages disent le solde, et la fin", () => {
        expect(shinyKoMessage("Nouillon", 4, false)).toContain("4")
        expect(shinyKoMessage("Nouillon", 0, true)).toContain("éteint")
        expect(shinyPopMessage(1, 5)).toContain("premier")
        expect(shinyPopMessage(12, 1)).toContain("12")
        expect(shinyPopMessage(12, 1)).toContain("1 jour de chance restant")
    })
})

// LE PIEGE DE LA PERSISTANCE. Les instances de Daemon passent par DEUX filtres a champs explicites : toMonInstance
//   a chaque fin de combat, parseMon a chaque rechargement. Un champ oublie dans l'un des deux disparait sans bruit —
//   et ici, perdre le compteur ne casse rien de visible : le shiny devient simplement PERMANENT. Le contraire du voeu.
describe("shiny éphémère — le compteur survit à la persistance", () => {
    it("toMonInstance (fin de combat) garde shinyKoLeft", async () => {
        const { toMonInstance } = await import("../storage/save")
        const m = makeEphemeralShiny(anyMon(), 9)
        expect(toMonInstance({ ...m, stages: {}, volatiles: {} } as never).shinyKoLeft).toBe(9)
    })

    it("un aller-retour JSON complet (fin de combat -> save -> rechargement) le garde aussi", async () => {
        const { toMonInstance, parseSave } = await import("../storage/save") as any
        const m = toMonInstance({ ...makeEphemeralShiny(anyMon(), 4), stages: {}, volatiles: {} } as never)
        // parseSave attend une save entiere : on ne teste que le parseur de Daemon via une save minimale.
        const raw = JSON.parse(JSON.stringify({ version: 2, team: [m], pc: [] }))
        const back = parseSave(raw)
        expect(back.team[0].shinyKoLeft).toBe(4)
        expect(back.team[0].shiny).toBe(true)
    })

    it("un shiny NATUREL ne gagne pas de compteur au passage (0/absent reste absent)", async () => {
        const { toMonInstance, parseSave } = await import("../storage/save") as any
        const natural = toMonInstance({ ...anyMon(), shiny: true, stages: {}, volatiles: {} } as never)
        expect(natural.shinyKoLeft).toBeUndefined()
        const back = parseSave(JSON.parse(JSON.stringify({ version: 2, team: [natural], pc: [] })))
        expect(back.team[0].shinyKoLeft).toBeUndefined()
        expect(back.team[0].shiny).toBe(true)
    })
})
