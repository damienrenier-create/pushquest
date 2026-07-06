import { describe, it, expect } from "vitest"
import { mergeWorlds } from "./saveManager"
import { emptySave, type YellowSave } from "../storage/save"
import type { MonInstance } from "../battle/types"

// NG+ « 2 mondes navigables » — FUSION finale : à la victoire vs l'ancienne équipe, le monde NG+ (primary)
// absorbe le monde d'origine (secondary). On vérifie que RIEN n'est perdu et que tout collapse en 1 monde.
function mon(uid: string, speciesId: string, level: number): MonInstance {
    return { uid, speciesId, level, exp: 0, ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }, currentHp: 1, status: "NONE", statusCounter: 0, moves: [{ moveId: "charge", pp: 35, ppMax: 35 }], owned: true }
}

function world(over: Partial<YellowSave>): YellowSave {
    return { ...emptySave(), ...over }
}

describe("NG+ fusion — mergeWorlds", () => {
    const ng = world({
        team: [mon("ng-a", "custom_x_s1", 40), mon("ng-b", "razmaree", 42)],
        pc: [mon("ng-pc1", "gouttiny", 10)],
        pokedex: { seen: ["a", "b"], caught: ["a"] },
        badges: ["feu", "eau"],
        items: { poke_ball: 3, super_ball: 1 },
        repsCap: 6000, repsBankedTotal: 500,
        ownedCts: ["ct1"], boughtCts: ["ct10"],
        isChampion: true,
    })
    const live = world({
        team: [mon("live-a", "cerfeuillu", 63), mon("live-b", "pyrokoss", 55)],
        pc: [mon("live-pc1", "magmator", 50)],
        pokedex: { seen: ["b", "c"], caught: ["b", "c"] },
        badges: ["eau", "plante", "roche"],
        items: { poke_ball: 5, hyper_potion: 2 },
        repsCap: 2350, repsBankedTotal: 900,
        ownedCts: ["ct1", "ct2"], boughtCts: [],
        isChampion: true,
    })
    const m = mergeWorlds(ng, live)

    it("équipe active = celle du NG+ (inchangée)", () => {
        expect(m.team.map((x) => x.uid)).toEqual(["ng-a", "ng-b"])
    })
    it("PC = PC NG+ + TOUS les Daemons d'origine (équipe + PC), rien perdu", () => {
        // 1 (ng pc) + 2 (live team) + 1 (live pc) = 4
        expect(m.pc).toHaveLength(4)
        expect(m.pc.map((x) => x.speciesId)).toContain("cerfeuillu")
        expect(m.pc.map((x) => x.speciesId)).toContain("pyrokoss")
        expect(m.pc.map((x) => x.speciesId)).toContain("magmator")
        expect(m.pc.map((x) => x.speciesId)).toContain("gouttiny")
    })
    it("aucune collision d'uid dans le PC (uid re-préfixés)", () => {
        const uids = m.pc.map((x) => x.uid)
        expect(new Set(uids).size).toBe(uids.length)
    })
    it("Pokédex/badges/CT en UNION (sans doublon)", () => {
        expect(m.pokedex.seen.sort()).toEqual(["a", "b", "c"])
        expect(m.pokedex.caught.sort()).toEqual(["a", "b", "c"])
        expect(m.badges.sort()).toEqual(["eau", "feu", "plante", "roche"])
        expect(m.ownedCts.sort()).toEqual(["ct1", "ct2"])
        expect(m.boughtCts).toEqual(["ct10"])
    })
    it("objets sommés, cap/banque au MAX", () => {
        expect(m.items.poke_ball).toBe(8) // 3 + 5
        expect(m.items.super_ball).toBe(1)
        expect(m.items.hyper_potion).toBe(2)
        expect(m.repsCap).toBe(6000)
        expect(m.repsBankedTotal).toBe(900)
    })
    it("collapse en UN seul monde (méta NG+ nettoyée, champion)", () => {
        expect(m.activeWorld).toBe("live")
        expect(m.ngplusWorld).toBeNull()
        expect(m.ngplusOldTeam).toBeNull()
        expect(m.isChampion).toBe(true)
    })
})

// QUÊTE CASINO (pilier Tonytony run 1 / Merorem run 2) : après fusion, le monde redevient "live" (pilier
// Tonytony) → les flags casino doivent refléter le RUN 1 (secondary), pas l'état Merorem du NG+ (primary),
// sinon un joueur ayant pris Merorem sans jamais prendre Tonytony resterait verrouillé hors de Tonytony.
describe("NG+ fusion — quête casino Tonytony/Merorem restaurée depuis le monde live", () => {
    it("le flag Merorem du NG+ ne bloque PAS Tonytony après fusion (reflète run 1)", () => {
        const ngMerorem = world({ labDefi: { ...emptySave().labDefi, tonytonyClaimed: true, tonytonyShiny: true, casinoTotalWon: 5000 } })
        const liveNoTony = world({ labDefi: { ...emptySave().labDefi, tonytonyClaimed: false, tonytonyShiny: false, casinoTotalWon: 200 } })
        const merged = mergeWorlds(ngMerorem, liveNoTony)
        expect(merged.labDefi.tonytonyClaimed).toBe(false) // Tonytony réclamable post-fusion
        expect(merged.labDefi.tonytonyShiny).toBe(false)
        expect(merged.labDefi.casinoTotalWon).toBe(200)   // cumul de la quête Tonytony (live), pas celui de Merorem
    })
    it("conserve le statut Tonytony s'il a été obtenu en run 1", () => {
        const ng = world({ labDefi: { ...emptySave().labDefi, tonytonyClaimed: true, casinoTotalWon: 3000 } })
        const live = world({ labDefi: { ...emptySave().labDefi, tonytonyClaimed: true, tonytonyShiny: true, casinoTotalWon: 5000 } })
        const merged = mergeWorlds(ng, live)
        expect(merged.labDefi.tonytonyClaimed).toBe(true)
        expect(merged.labDefi.tonytonyShiny).toBe(true)
        expect(merged.labDefi.casinoTotalWon).toBe(5000)
    })
})

// SCORES RUN 2 : les métriques (chrono/temps de jeu/potions de Ligue) n'ont plus de sens après la fusion
// (le monde redevient "live") → mergeWorlds les remet à zéro pour ne pas laisser de données NG+ résiduelles.
describe("NG+ fusion — remise à zéro des métriques de score run 2", () => {
    it("ngplusStartedAt/playtimeMs/leaguePotions sont vidés à la fusion", () => {
        const ng = world({ ngplusStartedAt: 123456, playtimeMs: 99999, leaguePotions: 7 })
        const live = world({ ngplusStartedAt: undefined, playtimeMs: 0, leaguePotions: 0 })
        const merged = mergeWorlds(ng, live)
        expect(merged.ngplusStartedAt).toBeUndefined()
        expect(merged.playtimeMs).toBe(0)
        expect(merged.leaguePotions).toBe(0)
    })
})
