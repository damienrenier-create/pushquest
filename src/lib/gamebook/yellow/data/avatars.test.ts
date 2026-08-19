// Tests des helpers d'avatar PERSONNALISABLE (Fashion Victim — atelier self-serve).
import { describe, it, expect } from "vitest"
import {
    FASHION_AVATARS, avatarSheet, avatarFilter, encodeAvatar, parseAvatarTint, rollAvatarTint, isValidAvatar,
} from "./avatars"

const BASE = FASHION_AVATARS[0]

describe("avatars — encodage teinte « base#h,s,b »", () => {
    it("encode → filtre CSS → décode fait un aller-retour cohérent", () => {
        const enc = encodeAvatar(BASE, 120, 1.3, 1.1)
        expect(avatarSheet(enc)).toBe(BASE) // l'URL de planche est propre (sans fragment)
        expect(avatarFilter(enc)).toBe("hue-rotate(120deg) saturate(1.3) brightness(1.1)")
        const t = parseAvatarTint(enc)
        expect(t).toEqual({ h: 120, s: 1.3, b: 1.1 })
    })

    it("normalise la teinte modulo 360", () => {
        expect(avatarFilter(encodeAvatar(BASE, 400, 1, 1))).toBe("hue-rotate(40deg) saturate(1) brightness(1)")
        expect(avatarFilter(encodeAvatar(BASE, -30, 1, 1))).toBe("hue-rotate(330deg) saturate(1) brightness(1)")
    })

    it("un préréglage brut (sans #) n'a pas de filtre et une teinte neutre", () => {
        expect(avatarFilter(BASE)).toBe("")
        expect(parseAvatarTint(BASE)).toEqual({ h: 0, s: 1, b: 1 })
        expect(avatarFilter(undefined)).toBe("")
        expect(parseAvatarTint(null)).toEqual({ h: 0, s: 1, b: 1 })
    })

    it("un fragment corrompu ne casse pas le rendu (filtre vide)", () => {
        expect(avatarFilter(`${BASE}#abc,,`)).toBe("")
    })
})

describe("avatars — garde-fou présence (isValidAvatar)", () => {
    it("accepte une base connue, avec ou sans teinte", () => {
        expect(isValidAvatar(BASE)).toBe(true)
        expect(isValidAvatar(encodeAvatar(BASE, 200, 1.5, 0.9))).toBe(true)
    })
    it("refuse un chemin arbitraire (payload d'un autre client)", () => {
        expect(isValidAvatar("/evil.png")).toBe(false)
        expect(isValidAvatar("/evil.png#120,1,1")).toBe(false)
        expect(isValidAvatar(undefined)).toBe(false)
        expect(isValidAvatar(null)).toBe(false)
    })
})

describe("avatars — ROLL", () => {
    it("reste dans des bornes lisibles", () => {
        for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
            const t = rollAvatarTint(() => r)
            expect(t.h).toBeGreaterThanOrEqual(0)
            expect(t.h).toBeLessThan(360)
            expect(t.s).toBeGreaterThanOrEqual(0.7)
            expect(t.s).toBeLessThanOrEqual(1.7)
            expect(t.b).toBeGreaterThanOrEqual(0.85)
            expect(t.b).toBeLessThanOrEqual(1.25)
        }
    })
})
