import { describe, it, expect } from "vitest"
import { fullStats } from "./stats"
import type { SpeciesData, MonInstance } from "./types"
import { hydratePlayer, getPlayer, addCraftedItem, canCraftSignature, setChampion, getCraftsUsed, setCraftedItemEquipped } from "../store/playerStore"

const sp = { baseStats: { hp: 45, atk: 49, def: 49, spe: 45, spc: 65 } } as SpeciesData
const baseInst = { level: 50, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 } }

describe("Artisane — objet signature dans fullStats", () => {
    it("PV : boost TOUJOURS actif (per-combat), même sans sigActive", () => {
        const base = fullStats({ ...baseInst }, sp).hp
        const boosted = fullStats({ ...baseInst, signatureItem: { stat: "hp", pct: 20, precision: 100 } }, sp).hp
        expect(boosted).toBe(Math.floor(base * 1.2))
    })
    it("Attaque : boostée SEULEMENT si sigActive (jet PAR TOUR)", () => {
        const base = fullStats({ ...baseInst }, sp).atk
        const off = fullStats({ ...baseInst, signatureItem: { stat: "atk", pct: 50, precision: 50 } }, sp).atk
        const on = fullStats({ ...baseInst, signatureItem: { stat: "atk", pct: 50, precision: 50 }, sigActive: true }, sp).atk
        expect(off).toBe(base)                     // inactif ce tour → stat de base
        expect(on).toBe(Math.floor(base * 1.5))    // actif → +50 %
    })
    it("Esquive (eva) n'affecte PAS les base-stats (gérée dans accuracy.ts)", () => {
        const base = fullStats({ ...baseInst }, sp)
        const eva = fullStats({ ...baseInst, signatureItem: { stat: "eva", pct: 40, precision: 80 }, sigActive: true }, sp)
        expect(eva).toEqual(base)
    })
})

const mkMon = (uid: string): MonInstance => ({
    uid, speciesId: "x", level: 50, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 },
    currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true,
})

describe("Artisane — gating & synchro signature (playerStore)", () => {
    it("verrou → champion → craft → forge à réarmer par une nouvelle Ligue ; baké sur le mon", () => {
        hydratePlayer({ team: [mkMon("a")], pc: [], craftedItems: undefined, craftsUsed: undefined, craftReady: undefined, isChampion: false, fusionChampionRoster: undefined })
        expect(canCraftSignature().reason).toBe("locked")     // aucune Ligue battue
        setChampion()
        expect(canCraftSignature().ok).toBe(true)             // champion → 1er craft déverrouillé
        const item = addCraftedItem({ stat: "atk", pct: 20, precision: 100, boundUid: "a", boundName: "A", boundSpeciesId: "x", name: "Croc de guerre" })
        expect(item).toBeTruthy()
        expect(getCraftsUsed()).toBe(1)
        expect(getPlayer().team[0].signatureItem).toEqual({ stat: "atk", pct: 20, precision: 100 }) // baké sur l'instance
        expect(canCraftSignature().reason).toBe("needLeague") // forge consommée → rebattre une Ligue
    })
    it("déséquiper retire la signature de l'instance", () => {
        hydratePlayer({ team: [mkMon("b")], pc: [], craftedItems: undefined, craftsUsed: undefined, craftReady: undefined, isChampion: true, fusionChampionRoster: undefined })
        const item = addCraftedItem({ stat: "spe", pct: 30, precision: 60, boundUid: "b", boundName: "B", boundSpeciesId: "x", name: "Plume véloce" })!
        expect(getPlayer().team[0].signatureItem?.stat).toBe("spe")
        setCraftedItemEquipped(item.id, false)
        expect(getPlayer().team[0].signatureItem).toBeUndefined()
    })
})
