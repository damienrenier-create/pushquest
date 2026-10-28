import { describe, it, expect } from "vitest"
import { applyServerSave } from "./saveManager"
import { getPlayer, applyExternalEffects } from "./playerStore"
import { emptySave } from "../storage/save"
import { isKnownGenieEffectKind } from "../data/genieLamp"
import type { MonInstance } from "../battle/types"

// Sartay, 28/10/2026 : « je veux surtout que le Magnetor ait les attaques qu'il était censé avoir » — le Magnetor rendu à DaKumba
// était un Daemon NEUF (give_mon). Effet « set_moves » : remet des attaques précises sur UN Daemon (uid + espèce), PP pleins.
const fx = (effects: object[]) => JSON.stringify(effects)
function mon(uid: string, speciesId: string, level: number, over: Partial<MonInstance> = {}): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "seisme", pp: 3, ppMax: 10 }, { moveId: "mur_de_fer", pp: 15, ppMax: 15 }], owned: true, ...over }
}
const MOVES = ["sig_arc_plasma", "pyrotechnie", "tete_de_fer", "seisme"]
const batch = (over: object = {}) => fx([{ kind: "set_moves", uid: "magnetor-60-1", id: "magnetor", moves: MOVES, tag: "test-attaques-magnetor", ...over }])

describe("effet set_moves : rendre ses attaques à un Daemon", () => {
    it("remet exactement les 4 attaques, PP pleins, sans toucher au reste ; une seule fois par lot", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("t1", "razmaree", 50)], pc: [mon("magnetor-60-1", "magnetor", 60, { shiny: true, ev: { atk: 12 } }), mon("autre", "magnetor", 60)], geniePaid: [] })
        expect(isKnownGenieEffectKind("set_moves")).toBe(true)
        expect(applyExternalEffects(batch())).toBe(true)
        const mag = getPlayer().pc.find((m) => m.uid === "magnetor-60-1")
        expect(mag?.moves.map((m) => m.moveId)).toEqual(MOVES)
        expect(mag?.moves.every((m) => m.pp === m.ppMax && m.pp > 0)).toBe(true)
        expect(mag).toMatchObject({ level: 60, shiny: true, ev: { atk: 12 } })
        expect(getPlayer().pc.find((m) => m.uid === "autre")?.moves.map((m) => m.moveId)).toEqual(["seisme", "mur_de_fer"]) // l'autre Magnetor : intact
        expect(applyExternalEffects(batch())).toBe(true) // déjà reçu : rien ne change
    })
    it("le Daemon n'est pas dans ce monde (ou ce n'est pas la bonne espèce) : le lot ATTEND, rien n'est acquitté", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("t1", "razmaree", 50)], pc: [mon("magnetor-60-1", "ro", 37)], geniePaid: [] })
        expect(applyExternalEffects(batch({ tag: "test-attente" }))).toBe(false)
        expect(getPlayer().pc[0].moves.map((m) => m.moveId)).toEqual(["seisme", "mur_de_fer"])
    })
    it("une attaque inconnue est ignorée, au plus 4 attaques", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("magnetor-60-1", "magnetor", 60)], geniePaid: [] })
        applyExternalEffects(batch({ moves: ["attaque_bidon", ...MOVES, "lance_flammes"], tag: "test-filtre" }))
        expect(getPlayer().team[0].moves.map((m) => m.moveId)).toEqual(MOVES)
    })
})
