import { describe, it, expect } from "vitest"
import { fullStats } from "./stats"
import type { SpeciesData, MonInstance } from "./types"
import { hydratePlayer, getPlayer, addCraftedItem, canCraftSignature, setChampion, getCraftsUsed, setCraftedItemEquipped, equipHeldItem } from "../store/playerStore"
import { fusionParentFromInstance } from "../data/fusionMon"

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

// RÈGLE « 1 SEUL OBJET » (Sartay 10/09) : un Daemon NORMAL ne peut pas porter à la fois un objet tenu du catalogue
// ET une pièce de l'Artisane. Les deux sens sont exclusifs, et RIEN n'est détruit (l'évincé retourne au sac).
describe("Artisane — 1 seul objet par Daemon (pièce vs objet tenu)", () => {
    it("forger/équiper la pièce RENVOIE AU SAC l'objet tenu", () => {
        hydratePlayer({ team: [{ ...mkMon("c"), heldItem: "restes" }], pc: [], items: { restes: 0 }, craftedItems: undefined, craftsUsed: undefined, craftReady: undefined, isChampion: true, fusionChampionRoster: undefined })
        addCraftedItem({ stat: "atk", pct: 20, precision: 100, boundUid: "c", boundName: "C", boundSpeciesId: "x", name: "Croc de guerre" })
        expect(getPlayer().team[0].heldItem).toBeUndefined()          // slot libéré
        expect(getPlayer().items.restes).toBe(1)                      // l'objet est revenu au sac, pas détruit
        expect(getPlayer().team[0].signatureItem?.stat).toBe("atk")
    })
    it("donner un objet tenu DÉSÉQUIPE la pièce (qui reste liée au Daemon)", () => {
        hydratePlayer({ team: [mkMon("d")], pc: [], items: { restes: 1 }, craftedItems: undefined, craftsUsed: undefined, craftReady: undefined, isChampion: true, fusionChampionRoster: undefined })
        const item = addCraftedItem({ stat: "def", pct: 20, precision: 100, boundUid: "d", boundName: "D", boundSpeciesId: "x", name: "Carapace renforcée" })!
        expect(getPlayer().team[0].signatureItem?.stat).toBe("def")
        expect(equipHeldItem("d", "restes")).toBe(true)
        expect(getPlayer().team[0].heldItem).toBe("restes")
        expect(getPlayer().team[0].signatureItem).toBeUndefined()     // la pièce n'est plus active…
        expect(getPlayer().craftedItems?.find((c) => c.id === item.id)?.equipped).toBe(false)
        expect(getPlayer().craftedItems?.find((c) => c.id === item.id)?.boundUid).toBe("d") // …mais toujours la sienne
    })
})

// La pièce doit ÊTRE PRISE EN COMPTE par la fusion (Sartay 10/09) : avant, `fullStats` l'ignorait hors combat
// (garde sigActive) et la fusion figeait ses stats → le bonus était purement perdu.
describe("Artisane — la pièce compte dans la FUSION", () => {
    const real = (uid: string, speciesId: string): MonInstance => ({ ...mkMon(uid), speciesId })
    it("boost non-PV baké à la VALEUR ESPÉRÉE (pct × précision)", () => {
        const inst = real("f1", "vipember")
        const plain = fusionParentFromInstance(inst).stats.spc
        const full = fusionParentFromInstance({ ...inst, signatureItem: { stat: "spc", pct: 30, precision: 100 } }).stats.spc
        expect(full).toBe(Math.floor(plain * 1.3))                    // 100 % de précision → +30 % plein
        const half = fusionParentFromInstance({ ...inst, signatureItem: { stat: "spc", pct: 40, precision: 50 } }).stats.spc
        expect(half).toBe(Math.floor(plain * 1.2))                    // 40 % × 50 % → +20 % (anti-exploit)
    })
    it("PV : déjà appliqué par fullStats → aucun double compte", () => {
        const inst = real("f2", "vipember")
        const plain = fusionParentFromInstance(inst).stats.hp
        const withHp = fusionParentFromInstance({ ...inst, signatureItem: { stat: "hp", pct: 20, precision: 100 } }).stats.hp
        expect(withHp).toBe(Math.floor(plain * 1.2))
    })
    it("Esquive : n'altère aucune base-stat", () => {
        const inst = real("f3", "vipember")
        const plain = fusionParentFromInstance(inst).stats
        const eva = fusionParentFromInstance({ ...inst, signatureItem: { stat: "eva", pct: 40, precision: 80 } }).stats
        expect(eva).toEqual(plain)
    })
})
