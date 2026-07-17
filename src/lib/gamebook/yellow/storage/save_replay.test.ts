import { describe, it, expect } from "vitest"
import { parseSave, emptySave } from "./save"

// REJEU (« run bis ») — Phase A : schéma save de la bulle de rejeu ISOLÉE. Purement sérialisation/parse
// (inerte tant que l'UI ne lance pas de rejeu). Garantit rétro-compat + round-trip + récursion bornée.
describe("REJEU — schéma save (bulle isolée)", () => {
    it("save SANS champs de rejeu → replayWorld/replayRun/replayReturn = null (rétro-compat)", () => {
        const s = parseSave({ version: 1 })
        expect(s.replayWorld).toBeNull()
        expect(s.replayRun).toBeNull()
        expect(s.replayReturn).toBeNull()
        expect(s.activeWorld).toBe("live")
    })

    it("emptySave() a des champs de rejeu nuls", () => {
        const s = emptySave()
        expect(s.replayWorld).toBeNull()
        expect(s.replayRun).toBeNull()
        expect(s.replayReturn).toBeNull()
    })

    it("save de rejeu (activeWorld=replay) → round-trip : bulle + méta préservées", () => {
        const bubble = { ...emptySave(), badges: ["feu"], reps: 42 }
        const raw = { ...emptySave(), activeWorld: "replay", replayWorld: bubble, replayRun: "run2", replayReturn: "live" }
        const s = parseSave(raw)
        expect(s.activeWorld).toBe("replay")
        expect(s.replayRun).toBe("run2")
        expect(s.replayReturn).toBe("live")
        expect(s.replayWorld).not.toBeNull()
        expect(s.replayWorld?.reps).toBe(42)
        expect(s.replayWorld?.badges).toContain("feu")
    })

    it("la bulle imbriquée n'a PAS de sous-monde (récursion bornée à 1)", () => {
        const innerBubble = { ...emptySave(), activeWorld: "replay", replayWorld: emptySave() }
        const raw = { ...emptySave(), activeWorld: "replay", replayWorld: innerBubble, replayRun: "run3" }
        const s = parseSave(raw)
        expect(s.replayWorld).not.toBeNull()
        expect(s.replayWorld?.replayWorld).toBeNull()   // imbriqué → pas de sous-bulle
        expect(s.replayWorld?.activeWorld).toBe("live")  // nested → activeWorld forcé "live"
    })

    it("activeWorld=replay mais replayReturn absent → défaut « live » (anti-perte)", () => {
        const raw = { ...emptySave(), activeWorld: "replay", replayWorld: emptySave() }
        const s = parseSave(raw)
        expect(s.replayReturn).toBe("live")
    })

    it("replayRun invalide → null ; replayReturn « ngplus » conservé", () => {
        const raw = { ...emptySave(), activeWorld: "replay", replayWorld: emptySave(), replayRun: "runX", replayReturn: "ngplus" }
        const s = parseSave(raw)
        expect(s.replayRun).toBeNull()
        expect(s.replayReturn).toBe("ngplus")
    })
})
