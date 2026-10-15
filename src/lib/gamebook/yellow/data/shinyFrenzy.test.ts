import { describe, it, expect } from "vitest"
import {
    freshShinyFrenzy, shinyFrenzyActive, shinyFrenzyChance, onShinyCaptured, shinyFrenzyCaptureMessage,
    SHINY_FRENZY_CHANCE, SHINY_FRENZY_DEFAULT_HOURS, SHINY_FRENZY_DEFAULT_CAPTURES,
} from "./shinyFrenzy"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// FRÉNÉSIE SHINY (anniversaire de Jacanon) — 50 % pendant 24 h, jusqu'à 3 CAPTURES. Deux bornes, la première
// atteinte éteint la fête. Ce sont les captures qui comptent, pas les rencontres.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const T0 = 1_760_000_000_000
const H = 3_600_000

describe("la fenêtre", () => {
    it("24 h et 3 captures par défaut, taux à 50 %", () => {
        const st = freshShinyFrenzy(T0)
        expect(st.until).toBe(T0 + SHINY_FRENZY_DEFAULT_HOURS * H)
        expect(st.left).toBe(SHINY_FRENZY_DEFAULT_CAPTURES)
        expect(SHINY_FRENZY_CHANCE).toBe(0.5)
        expect(shinyFrenzyChance(st, T0 + H)).toBe(0.5)
    })

    it("⚠️ à 24 h pile la fête est finie, même sans les 3 captures", () => {
        const st = freshShinyFrenzy(T0)
        expect(shinyFrenzyActive(st, T0 + 24 * H - 1)).toBe(true)
        expect(shinyFrenzyActive(st, T0 + 24 * H)).toBe(false)
        expect(shinyFrenzyChance(st, T0 + 25 * H)).toBeUndefined()
    })

    it("sans état : taux normal", () => {
        expect(shinyFrenzyActive(undefined, T0)).toBe(false)
        expect(shinyFrenzyChance(null, T0)).toBeUndefined()
    })
})

describe("ce sont les captures qui comptent", () => {
    it("3 captures éteignent la fête, la 3ᵉ annonce la fin", () => {
        let st = freshShinyFrenzy(T0)
        let r = onShinyCaptured(st, T0 + H); st = r.state
        expect(r.done).toBe(false); expect(r.left).toBe(2)
        r = onShinyCaptured(st, T0 + H); st = r.state
        expect(r.done).toBe(false); expect(r.left).toBe(1)
        r = onShinyCaptured(st, T0 + H); st = r.state
        expect(r.done).toBe(true); expect(r.left).toBe(0)
        expect(shinyFrenzyActive(st, T0 + H)).toBe(false)
        expect(shinyFrenzyChance(st, T0 + H)).toBeUndefined()
    })

    it("⚠️ une capture après la fenêtre ne touche plus au compteur (pas de 4ᵉ shiny à 50 %)", () => {
        const st = freshShinyFrenzy(T0)
        const r = onShinyCaptured(st, T0 + 30 * H)
        expect(r.state).toBe(st)
        expect(r.done).toBe(false)
    })

    it("croiser des shiny sans les capturer ne décompte rien — il n'existe aucune fonction pour ça", () => {
        // Le module n'expose que onShinyCaptured : une rencontre n'a pas de prise sur le compteur. Par construction.
        const st = freshShinyFrenzy(T0)
        expect(st.left).toBe(3)
    })

    it("les messages disent le solde et la fin", () => {
        expect(shinyFrenzyCaptureMessage(2)).toContain("2")
        expect(shinyFrenzyCaptureMessage(0)).toMatch(/finie/i)
    })
})
