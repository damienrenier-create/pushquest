import { describe, it, expect } from "vitest"
import { applyServerSave, snapshot, startNewProfileFromRun1, switchProfile, profileCount, getAltProfileSummaries, startGenesisProfile } from "./saveManager"
import { getPlayer, isGenesisMode, genesisCaptureLocked, markTrainerDefeated } from "./playerStore"
import { getPokedex } from "./pokedexStore"
import { emptySave, parseSave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

const world = (over: Partial<YellowSave>): YellowSave => ({ ...emptySave(), ...over })

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

describe("Multi-profils — création (Rejouer run 1) & bascule (NON-destructif)", () => {
    it("startNewProfileFromRun1 : profil FRAIS actif, ancien profil STASHÉ intact (rien perdu)", async () => {
        applyServerSave(world({ activeWorld: "live", badges: ["feu", "eau", "plante", "roche", "elec"], isChampion: true,
            team: [mon("a", "cerfeuillu", 63)], pc: [mon("apc", "pyrokoss", 55)], pokedex: { seen: ["cerfeuillu"], caught: ["cerfeuillu"] } }))
        expect(await startNewProfileFromRun1()).toBe(true)
        // Nouveau profil = tout à zéro
        expect(getPlayer().team.length).toBe(0)
        expect(getPlayer().badges.length).toBe(0)
        expect(getPlayer().isChampion).toBe(false)
        expect(getPokedex().caught.length).toBe(0) // Pokédex PER-PROFIL, frais
        // Ancien profil A préservé en inactif
        expect(profileCount()).toBe(2)
        const a = getAltProfileSummaries()[0]
        expect(a.isChampion).toBe(true)
        expect(a.badges).toBe(5)
        expect(a.dex).toBe(1)
    })

    it("switchProfile : rebascule sur l'ancien profil → tout restauré (badges, champion, Pokédex)", async () => {
        applyServerSave(world({ activeWorld: "live", badges: ["feu"], isChampion: true,
            team: [mon("a", "cerfeuillu", 63)], pokedex: { seen: ["cerfeuillu"], caught: ["cerfeuillu"] } }))
        await startNewProfileFromRun1()             // → profil frais actif, A stashé
        expect(getPlayer().badges.length).toBe(0)
        expect(await switchProfile(0)).toBe(true)   // rebascule sur A
        expect(getPlayer().badges).toEqual(["feu"])
        expect(getPlayer().isChampion).toBe(true)
        expect(getPokedex().caught).toContain("cerfeuillu") // Pokédex de A restauré
        expect(profileCount()).toBe(2)              // toujours 2 profils (le frais est désormais inactif)
    })

    it("switchProfile(index invalide) = no-op", async () => {
        applyServerSave(world({ activeWorld: "live", badges: ["feu"] }))
        expect(await switchProfile(0)).toBe(false)  // aucun profil inactif
        expect(getPlayer().badges).toEqual(["feu"]) // inchangé
    })
})

describe("Mode GENÈSE — 6 craftés / zéro capture jusqu'à la Ligue de Fusion", () => {
    it("startGenesisProfile : profil Genèse (équipe = créations, capture verrouillée), ancien profil stashé", async () => {
        applyServerSave(world({ activeWorld: "live", badges: ["feu"], isChampion: true }))
        const team = [mon("g1", "cerfeuillu", 5), mon("g2", "razmaree", 5)]
        expect(await startGenesisProfile(team, [])).toBe(true)
        expect(isGenesisMode()).toBe(true)
        expect(getPlayer().team.map((m) => m.speciesId)).toEqual(["cerfeuillu", "razmaree"])
        expect(genesisCaptureLocked()).toBe(true) // Ball verrouillée
        expect(profileCount()).toBe(2)            // ancien profil préservé
    })
    it("capture DÉVERROUILLÉE une fois la Ligue de Fusion gagnée (fusleague_or)", async () => {
        applyServerSave(world({ activeWorld: "live" }))
        await startGenesisProfile([mon("g", "cerfeuillu", 5)], [])
        expect(genesisCaptureLocked()).toBe(true)
        markTrainerDefeated("fusleague_or")
        expect(genesisCaptureLocked()).toBe(false) // déverrouillé après la Ligue de Fusion
    })
    it("mode NORMAL : jamais verrouillé par Genèse, et un profil neuf normal n'hérite pas genesisMode", async () => {
        applyServerSave(world({ activeWorld: "live" }))
        await startGenesisProfile([mon("g", "cerfeuillu", 5)], []) // profil Genèse
        expect(isGenesisMode()).toBe(true)
        await startNewProfileFromRun1()                            // profil NORMAL neuf
        expect(isGenesisMode()).toBe(false)                        // n'hérite PAS genesisMode (fix in-pattern)
        expect(genesisCaptureLocked()).toBe(false)
    })
})
