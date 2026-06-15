import { describe, it, expect } from "vitest"
import { hydratePlayer, getPlayer, setChampion } from "../store/playerStore"
import { parseSave, emptySave } from "../storage/save"

describe("Ligue — endgame (Champion + Hall of Fame)", () => {
    it("setChampion marque le joueur Champion (idempotent)", () => {
        hydratePlayer({ isChampion: false })
        expect(getPlayer().isChampion).toBe(false)
        setChampion()
        expect(getPlayer().isChampion).toBe(true)
        setChampion() // idempotent
        expect(getPlayer().isChampion).toBe(true)
    })

    it("isChampion survit au round-trip de sauvegarde", () => {
        expect(emptySave().isChampion).toBe(false)
        expect(parseSave({ isChampion: true }).isChampion).toBe(true)
        expect(parseSave({}).isChampion).toBe(false) // défaut robuste
    })
})
