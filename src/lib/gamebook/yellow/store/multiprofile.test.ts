import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot } from "./saveManager"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

// MULTI-PROFILS (socle) : le profil ACTIF vit au top-level ; les profils inactifs sont portés OPAQUES dans
// `altProfiles` à travers tout le cycle save (applyServerSave → snapshot → parseSave), sans être altérés.
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}

describe("Multi-profils — socle (altProfiles opaques, round-trip)", () => {
    it("les profils inactifs traversent applyServerSave → snapshot → parseSave intacts", () => {
        const profileB: YellowSave = { ...emptySave(), activeWorld: "live", badges: ["feu", "eau"], pokedex: { seen: ["cerfeuillu"], caught: ["cerfeuillu"] } }
        applyServerSave({ ...emptySave(), activeWorld: "live", team: [mon("a", "razmaree", 50)], altProfiles: [profileB] })

        const snap = snapshot()
        expect(snap.altProfiles?.length).toBe(1)
        expect(snap.altProfiles?.[0].badges).toEqual(["feu", "eau"]) // profil inactif préservé tel quel
        expect(snap.team.map((m) => m.speciesId)).toEqual(["razmaree"]) // profil ACTIF au top-level, inchangé

        const reloaded = parseSave(JSON.parse(JSON.stringify(snap))) // cycle DB
        expect(reloaded.altProfiles?.length).toBe(1)
        expect(reloaded.altProfiles?.[0].badges).toEqual(["feu", "eau"])
        applyServerSave(reloaded)
        expect(snapshot().altProfiles?.length).toBe(1) // toujours là après rechargement
    })

    it("save sans altProfiles (legacy) → un seul profil, aucun altProfiles émis", () => {
        applyServerSave({ ...emptySave(), activeWorld: "live" })
        expect(snapshot().altProfiles).toBeUndefined() // rétro-compat : pas de champ parasite
    })

    it("les mondes imbriqués ne portent JAMAIS altProfiles (top-level only)", () => {
        applyServerSave({ ...emptySave(), activeWorld: "live", altProfiles: [{ ...emptySave() } as YellowSave] })
        const snap = snapshot()
        expect(snap.ngplusWorld).toBeNull() // pas de monde ngplus ici, mais la règle : un monde imbriqué n'a pas d'altProfiles
        // le profil inactif lui-même ne doit pas re-porter des altProfiles (borné)
        expect((snap.altProfiles?.[0] as YellowSave).altProfiles).toBeUndefined()
    })
})
