import { describe, it, expect } from "vitest"
import { applyServerSave } from "./saveManager"
import { getPlayer, executeTrade, addTradedMonToPc, relockListedMons, releaseFromPc, withdrawFromPc } from "./playerStore"
import { emptySave, parseSave, toMonInstance, type YellowSave } from "../storage/save"
import { createMonInstance } from "../battle/factory"
import { toBattleMon } from "../battle/engine"
import type { MonInstance } from "../battle/types"

// Trois défauts d'intégrité trouvés le 28/10/2026 en préparant les boîtes du PC (accord de Sartay : « tu règles tout ça ») :
// (a) le verrou « en vente » du Grand Marchand sautait à chaque rechargement (7 étals et 1 offre déverrouillés en prod) ;
// (b) le verrou de la Pâte de Luxe et les IV d'origine sautaient au premier combat du Daemon ;
// (c) deux Daemons pouvaient partager un uid (« orcaline-35-3 » ×2 chez Frans) : un échange ou un relâchement retirait les deux.
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}
const save = (over: Partial<YellowSave>): YellowSave => ({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("t1", "razmaree", 50)], ...over })
const roundTrip = (s: unknown) => parseSave(JSON.parse(JSON.stringify(s)))

describe("(a) le verrou de l'étal survit au rechargement", () => {
    it("la lecture de la save garde tradeState et tradeListingId, et ignore une valeur bidon", () => {
        const s = roundTrip(save({ pc: [
            { ...mon("p1", "pampousse", 12), tradeState: "listed", tradeListingId: "lst1" },
            { ...mon("p2", "feuillichot", 5), tradeState: "bidon" as "listed", tradeListingId: "x" },
        ] }))
        expect(s.pc[0].tradeState).toBe("listed")
        expect(s.pc[0].tradeListingId).toBe("lst1")
        expect(s.pc[1].tradeState).toBeUndefined()
        expect(s.pc[1].tradeListingId).toBeUndefined()
    })
    it("après rechargement, un Daemon en vente ne peut toujours ni être relâché ni rejoindre l'équipe", () => {
        applyServerSave(roundTrip(save({ pc: [{ ...mon("p1", "pampousse", 12), tradeState: "listed", tradeListingId: "lst1" }] })))
        expect(releaseFromPc("p1")).toEqual({ ok: false, reason: "listed" })
        expect(withdrawFromPc("p1").ok).toBe(false)
        expect(getPlayer().pc.map((m) => m.uid)).toEqual(["p1"])
    })
    it("à l'ouverture du Grand Marchand, un Daemon encore en vente (étal ou offre) qui a perdu son verrou le retrouve", () => {
        applyServerSave(save({ pc: [mon("p1", "pampousse", 12), mon("p2", "feuillichot", 5)] }))
        expect(relockListedMons([{ id: "lst1", uid: "p1" }, { id: "off1", uid: "absent" }])).toBe(true)
        expect(getPlayer().pc.find((m) => m.uid === "p1")).toMatchObject({ tradeState: "listed", tradeListingId: "lst1" })
        expect(getPlayer().pc.find((m) => m.uid === "p2")?.tradeState).toBeUndefined()
        expect(relockListedMons([{ id: "lst1", uid: "p1" }])).toBe(false) // déjà verrouillé : rien à faire
        expect(relockListedMons([{ id: "x", uid: "t1" }])).toBe(false)     // jamais un Daemon de l'équipe
        expect(releaseFromPc("p1")).toEqual({ ok: false, reason: "listed" })
    })
    it("un Daemon reçu (étal ou échange direct) n'arrive jamais avec le verrou de son vendeur", () => {
        applyServerSave(save({ pc: [] }))
        expect(addTradedMonToPc({ ...mon("x9", "ro", 30), tradeState: "listed", tradeListingId: "chez-le-vendeur" })).toBe(true)
        const got = getPlayer().pc.find((m) => m.speciesId === "ro")
        expect(got?.tradeState).toBeUndefined()
        expect(got?.tradeListingId).toBeUndefined()
    })
})

describe("(b) la Pâte de Luxe reste verrouillée après un combat", () => {
    it("la copie de fin de combat garde luxeUsed et les IV d'origine (et le verrou de l'étal)", () => {
        const m: MonInstance = { ...mon("p1", "pampousse", 12), luxeUsed: true, luxeIvsBackup: { ivs: { hp: 3, atk: 4, def: 5, spe: 6, spc: 7 }, shiny: true }, tradeState: "listed", tradeListingId: "l1" }
        const after = toMonInstance(toBattleMon(m))
        expect(after.luxeUsed).toBe(true)
        expect(after.luxeIvsBackup).toEqual({ ivs: { hp: 3, atk: 4, def: 5, spe: 6, spc: 7 }, shiny: true })
        expect(after.luxeIvsBackup?.ivs).not.toBe(m.luxeIvsBackup?.ivs) // copie, pas la même référence
        expect(after.tradeState).toBe("listed")
        const plain = toMonInstance(toBattleMon(mon("p2", "pampousse", 12)))
        expect(plain.luxeUsed).toBeUndefined()
        expect(plain.luxeIvsBackup).toBeUndefined()
    })
})

describe("(c) un uid n'est porté que par un seul Daemon", () => {
    it("à la lecture, les doublons d'un monde reçoivent un suffixe stable ; l'équipe garde l'uid d'origine ; relire ne change rien", () => {
        const s = roundTrip(save({ team: [mon("orcaline-35-3", "razmaree", 35)], pc: [mon("orcaline-35-3", "razmaree", 35), mon("orcaline-35-3", "razmaree", 35), mon("p1", "pampousse", 5)] }))
        expect(s.team.map((m) => m.uid)).toEqual(["orcaline-35-3"])
        expect(s.pc.map((m) => m.uid)).toEqual(["orcaline-35-3~2", "orcaline-35-3~3", "p1"])
        expect(roundTrip(s).pc.map((m) => m.uid)).toEqual(s.pc.map((m) => m.uid))
    })
    it("relâcher l'un de deux anciens jumeaux n'emporte plus l'autre", () => {
        applyServerSave(roundTrip(save({ pc: [mon("jumeau", "pampousse", 5), mon("jumeau", "pampousse", 5)] })))
        expect(releaseFromPc("jumeau~2").ok).toBe(true)
        expect(getPlayer().pc.map((m) => m.uid)).toEqual(["jumeau"])
    })
    it("les nouveaux uids portent un sel par chargement de page", () => {
        const a = createMonInstance("pampousse", 5), b = createMonInstance("pampousse", 5)
        expect(a.uid).toMatch(/^pampousse-5-[0-9a-z]{4}\d+$/)
        expect(a.uid).not.toBe(b.uid)
    })
    it("échange direct : le Daemon reçu prend un uid neuf si le sien est déjà pris ici, et le garde sinon", () => {
        applyServerSave(save({ team: [mon("t1", "razmaree", 50), mon("t2", "plumiot", 20)], pc: [mon("pris", "pampousse", 5)] }))
        expect(executeTrade("t2", { ...mon("pris", "ro", 30), tradeState: "listed", tradeListingId: "l7" })).toBe(true)
        const uids = [...getPlayer().team, ...getPlayer().pc].map((m) => m.uid)
        expect(new Set(uids).size).toBe(uids.length)
        const ro = [...getPlayer().team, ...getPlayer().pc].find((m) => m.speciesId === "ro")
        expect(ro?.uid).toMatch(/^trade-ro-/)
        expect(ro?.tradeState).toBeUndefined()
        expect(executeTrade("t1", mon("libre", "elefer", 20))).toBe(true)
        expect([...getPlayer().team, ...getPlayer().pc].some((m) => m.uid === "libre")).toBe(true)
    })
})
