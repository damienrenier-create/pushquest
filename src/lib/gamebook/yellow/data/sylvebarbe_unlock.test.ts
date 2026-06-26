import { describe, it, expect } from "vitest"
import { hydratePlayer, getPlayer, markSylvebarbeAwake } from "../store/playerStore"
import { parseSave, emptySave } from "../storage/save"
import { buildSylvebarbe, SYLVEBARBE_LEVEL } from "./sylvebarbe"

describe("Déblocage Sylvebarbe → Zone de Combat", () => {
    it("buildSylvebarbe : espèce sylvebarbe, niveau gardien, capture dure (×0.6)", () => {
        const m = buildSylvebarbe()
        expect(m.speciesId).toBe("sylvebarbe")
        expect(m.level).toBe(SYLVEBARBE_LEVEL)
        expect((m as unknown as { captureMult?: number }).captureMult).toBe(0.6)
    })

    it("markSylvebarbeAwake : passe le flag à true, idempotent", () => {
        hydratePlayer({ sylvebarbeAwake: false })
        expect(getPlayer().sylvebarbeAwake).toBe(false)
        markSylvebarbeAwake()
        expect(getPlayer().sylvebarbeAwake).toBe(true)
        markSylvebarbeAwake()
        expect(getPlayer().sylvebarbeAwake).toBe(true)
    })

    it("sylvebarbeAwake survit au round-trip de sauvegarde (défaut robuste = false)", () => {
        expect(emptySave().sylvebarbeAwake).toBe(false)
        expect(parseSave({ sylvebarbeAwake: true }).sylvebarbeAwake).toBe(true)
        expect(parseSave({}).sylvebarbeAwake).toBe(false)
    })
})
