import { describe, it, expect, beforeEach } from "vitest"
import { rememberFusionSprite, getFusionSpriteFromMemory, hasFusionSpriteInMemory, _clearFusionSpriteRegistry } from "./fusionSpriteRegistry"

describe("fusionSpriteRegistry", () => {
    beforeEach(() => _clearFusionSpriteRegistry())

    it("mémorise et relit une URL (ordre des parents indifférent)", () => {
        rememberFusionSprite("draconarque", "regnantaur", "https://blob/x.png")
        expect(getFusionSpriteFromMemory("draconarque", "regnantaur")).toBe("https://blob/x.png")
        // clé canonique : B+A == A+B
        expect(getFusionSpriteFromMemory("regnantaur", "draconarque")).toBe("https://blob/x.png")
        expect(hasFusionSpriteInMemory("regnantaur", "draconarque")).toBe(true)
    })

    it("renvoie undefined pour une paire inconnue", () => {
        expect(getFusionSpriteFromMemory("a", "b")).toBeUndefined()
        expect(hasFusionSpriteInMemory("a", "b")).toBe(false)
    })

    it("ignore les valeurs vides ou incomplètes (jamais de MissingNo mémorisé par erreur)", () => {
        rememberFusionSprite("a", "b", "")
        rememberFusionSprite("a", "b", null)
        rememberFusionSprite("a", "b", undefined)
        rememberFusionSprite("", "b", "https://blob/y.png")
        expect(hasFusionSpriteInMemory("a", "b")).toBe(false)
    })

    it("la dernière écriture gagne", () => {
        rememberFusionSprite("a", "b", "https://blob/1.png")
        rememberFusionSprite("b", "a", "https://blob/2.png")
        expect(getFusionSpriteFromMemory("a", "b")).toBe("https://blob/2.png")
    })
})
