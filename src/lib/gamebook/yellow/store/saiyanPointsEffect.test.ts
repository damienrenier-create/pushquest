import { describe, it, expect } from "vitest"
import { applyServerSave } from "./saveManager"
import { getPlayer, applyExternalEffects } from "./playerStore"
import { emptySave } from "../storage/save"
import { isKnownGenieEffectKind } from "../data/genieLamp"
import type { MonInstance } from "../battle/types"

// Sartay, 29/10/2026 : « Magnetor de DaKumba : t'as oublié un autre truc ! Tous les points Saiyan ! Il avait été capturé en
// Lavapetit au niveau 5 ». Le Magnetor rendu par give_mon était NEUF, sans les points de ses niveaux. Effet « saiyan_points » :
// ajoute des points À RÉPARTIR (statPoints) à UN Daemon (uid + espèce) ; la répartition déjà faite n'est pas touchée.
const fx = (effects: object[]) => JSON.stringify(effects)
function mon(uid: string, speciesId: string, level: number, over: Partial<MonInstance> = {}): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "seisme", pp: 10, ppMax: 10 }], owned: true, ...over }
}
const batch = (over: object = {}) => fx([{ kind: "saiyan_points", uid: "magnetor-60-1", id: "magnetor", amount: 55, tag: "test-points-magnetor", ...over }])

describe("effet saiyan_points : rendre ses points Saiyan à un Daemon", () => {
    it("ajoute les points à répartir, sans toucher au reste ; une seule fois par lot", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("t1", "razmaree", 50)], pc: [mon("magnetor-60-1", "magnetor", 60, { shiny: true, statPoints: 2, allocated: { hp: 3 } }), mon("autre", "magnetor", 60)], geniePaid: [] })
        expect(isKnownGenieEffectKind("saiyan_points")).toBe(true)
        expect(applyExternalEffects(batch())).toBe(true)
        const mag = getPlayer().pc.find((m) => m.uid === "magnetor-60-1")
        expect(mag).toMatchObject({ statPoints: 57, allocated: { hp: 3 }, level: 60, shiny: true })
        expect(mag?.moves.map((m) => m.moveId)).toEqual(["seisme"])
        expect(getPlayer().pc.find((m) => m.uid === "autre")?.statPoints).toBeUndefined() // l'autre Magnetor : intact
        expect(applyExternalEffects(batch())).toBe(true) // déjà reçu : rien ne s'ajoute
        expect(getPlayer().pc.find((m) => m.uid === "magnetor-60-1")?.statPoints).toBe(57)
    })
    it("le Daemon n'est pas dans ce monde (ou ce n'est pas la bonne espèce) : le lot ATTEND, rien n'est acquitté", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("t1", "razmaree", 50)], pc: [mon("magnetor-60-1", "ro", 37)], geniePaid: [] })
        expect(applyExternalEffects(batch({ tag: "test-attente" }))).toBe(false)
        expect(getPlayer().pc[0].statPoints).toBeUndefined()
    })
    it("un montant nul ou négatif ne retire jamais de points", () => {
        applyServerSave({ ...emptySave(), reps: 100, repsCap: 5000, repsBankedTotal: 0, team: [mon("magnetor-60-1", "magnetor", 60, { statPoints: 4 })], geniePaid: [] })
        applyExternalEffects(batch({ amount: -10, tag: "test-negatif" }))
        expect(getPlayer().team[0].statPoints).toBe(4)
    })
})
