// Tests des helpers d'avatar PERSONNALISABLE (Fashion Victim — atelier self-serve).
import { describe, it, expect } from "vitest"
import {
    FASHION_AVATARS, avatarSheet, avatarFilter, encodeAvatar, parseAvatarTint, rollAvatarTint, isValidAvatar,
    FASHION_PRICES, FASHION_CATALOG_PRICE, dailyFashionOffer, fashionDayKey,
    EX_PLAYER_SKINS, personalFashionOffer,
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

describe("avatars — économie (reps)", () => {
    it("prix attendus", () => {
        expect([...FASHION_PRICES]).toEqual([50, 100, 200, 300, 400])
        expect(FASHION_CATALOG_PRICE).toBe(1000)
    })
    it("le tirage du jour est déterministe et donne 5 tenues valides du pool", () => {
        const day = fashionDayKey(1_755_600_000_000)
        const a = dailyFashionOffer(day)
        const b = dailyFashionOffer(day)
        expect(a).toEqual(b) // même jour → même tirage (stable pour tous)
        expect(a).toHaveLength(5)
        expect(new Set(a).size).toBe(5) // pas de doublon
        for (const url of a) expect(FASHION_AVATARS).toContain(url)
    })
    it("le tirage change d'un jour à l'autre", () => {
        const d1 = dailyFashionOffer(fashionDayKey(1_755_600_000_000))
        const d2 = dailyFashionOffer(fashionDayKey(1_755_600_000_000 + 86_400_000))
        expect(d1).not.toEqual(d2)
    })
    it("fashionDayKey change à minuit UTC", () => {
        expect(fashionDayKey(0)).toBe(0)
        expect(fashionDayKey(86_400_000 - 1)).toBe(0)
        expect(fashionDayKey(86_400_000)).toBe(1)
    })
})

describe("avatars — ex-skins & offre perso", () => {
    it("les ex-skins de potes sont versés au pool (valides)", () => {
        for (const url of Object.values(EX_PLAYER_SKINS)) {
            expect(FASHION_AVATARS).toContain(url)
            expect(isValidAvatar(url)).toBe(true)
        }
    })
    it("l'offre perso remet l'ex-skin du joueur en 2e place", () => {
        const day = fashionDayKey(1_755_600_000_000)
        const o = personalFashionOffer(day, "task1")
        expect(o[1]).toBe(EX_PLAYER_SKINS.task1)
        expect(o).toHaveLength(5)
    })
    it("un joueur sans ex-skin garde le tirage normal", () => {
        const day = fashionDayKey(1_755_600_000_000)
        expect(personalFashionOffer(day, "sartay")).toEqual(dailyFashionOffer(day))
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
