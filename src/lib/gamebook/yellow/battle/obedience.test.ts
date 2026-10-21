import { describe, it, expect } from "vitest"
import { obedienceCap, obedienceCapOwned, obedienceCapTraded, disobeyChance, mayDisobey, MAX_OBEDIENCE_BADGES } from "./obedience"

describe("obéissance — 2 barèmes (à soi / échangé) + proba de désobéissance", () => {
    // 6 badges depuis le 21/10/2026 (le BATEAU s'intercale) : 4 → 55, 5 → 65, 6 → 100. Les anciennes parties reçoivent
    //   le badge du bateau à la reprise → un ancien « 4 badges » (cap 65) devient « 5 badges » (cap 65) : rien de perdu.
    it("cap À SOI (strict) : 0→20 · 1→30 · 2→40 · 3→50 · 4→55 · 5→65 · 6→100", () => {
        expect(obedienceCapOwned(0)).toBe(20)
        expect(obedienceCapOwned(1)).toBe(30)
        expect(obedienceCapOwned(2)).toBe(40)
        expect(obedienceCapOwned(3)).toBe(50)
        expect(obedienceCapOwned(4)).toBe(55)
        expect(obedienceCapOwned(5)).toBe(65)
        expect(obedienceCapOwned(6)).toBe(100)
        expect(obedienceCapOwned(9)).toBe(100) // borné
    })

    it("RUN 3 (concours) : barème À SOI relevé dès le 3ᵉ badge — 3→55 · 4→65 · 5→75 · 6→100 (échangés inchangés)", () => {
        expect([0, 1, 2, 3, 4, 5, 6].map((b) => obedienceCapOwned(b, true))).toEqual([20, 30, 40, 55, 65, 75, 100])
        expect(obedienceCap(false, 4, true)).toBe(65)
        expect(obedienceCap(true, 4, true)).toBe(80)
        expect(mayDisobey(false, 60, 4, true)).toBe(false) // obéit au run 3…
        expect(mayDisobey(false, 60, 4)).toBe(true)        // …pas au run 1
        // Marge au-dessus du plus fort adversaire de l'étape (bateau 46 · Électrik 53 · Eau 62 au run 3) : ≥ 9 niveaux.
        expect(obedienceCapOwned(3, true) - 46).toBeGreaterThanOrEqual(9)
        expect(obedienceCapOwned(4, true) - 53).toBeGreaterThanOrEqual(9)
        expect(obedienceCapOwned(5, true) - 62).toBeGreaterThanOrEqual(9)
    })

    it("cap ÉCHANGÉ (permissif) : 0→20 · 1→35 · 2→50 · 3→65 · 4→80 · 5→95 · 6→100", () => {
        expect(obedienceCapTraded(0)).toBe(20)
        expect(obedienceCapTraded(1)).toBe(35)
        expect(obedienceCapTraded(2)).toBe(50)
        expect(obedienceCapTraded(3)).toBe(65)
        expect(obedienceCapTraded(4)).toBe(80)
        expect(obedienceCapTraded(5)).toBe(95)
        expect(obedienceCapTraded(6)).toBe(100)
        expect(obedienceCapTraded(MAX_OBEDIENCE_BADGES)).toBe(100)
    })

    it("obedienceCap(traded, badges) : choisit le bon barème selon l'origine", () => {
        expect(obedienceCap(false, 2)).toBe(40)      // à soi
        expect(obedienceCap(undefined, 2)).toBe(40)  // à soi (non traqué)
        expect(obedienceCap(true, 2)).toBe(50)       // échangé
        expect(obedienceCap(false, 4)).toBe(55)
        expect(obedienceCap(true, 4)).toBe(80)
        expect(obedienceCap(false, 5)).toBe(65)
    })

    it("proba de désobéir : 0 sous le cap, ~4%/niveau au-dessus, plafond 50 %", () => {
        expect(disobeyChance(30, 35)).toBe(0)    // sous le cap
        expect(disobeyChance(35, 35)).toBe(0)    // pile au cap
        expect(disobeyChance(40, 35)).toBe(20)   // +5 → 20 %
        expect(disobeyChance(50, 35)).toBe(50)   // +15 → 60 plafonné à 50 %
        expect(disobeyChance(100, 20)).toBe(50)  // plafond
    })

    it("mayDisobey : s'applique DÉSORMAIS aux Daemons à soi ET échangés, au-dessus de leur cap respectif", () => {
        // À SOI : L55 avec 3 badges (cap 50) → désobéit ; L45 → obéit.
        expect(mayDisobey(false, 55, 3)).toBe(true)
        expect(mayDisobey(false, 45, 3)).toBe(false)
        expect(mayDisobey(undefined, 90, 0)).toBe(true)   // à soi L90, 0 badge (cap 20) → désobéit (NOUVEAU)
        // ÉCHANGÉ : cap plus haut → L55 avec 3 badges (cap 65) → obéit encore.
        expect(mayDisobey(true, 55, 3)).toBe(false)
        expect(mayDisobey(true, 70, 3)).toBe(true)        // L70 > 65 → désobéit
        // 6 badges = cap 100 pour les deux → obéissance totale.
        expect(mayDisobey(false, 100, 6)).toBe(false)
        expect(mayDisobey(true, 100, 6)).toBe(false)
    })
})
