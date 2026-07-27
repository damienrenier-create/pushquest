import { describe, it, expect } from "vitest"
import {
    ARENA_STEPS, LIGUE_COUNCIL_IDS, LIGUE_MASTER_ID, ROUTE_TRAINER_IDS, PRESETS,
    defaultRecipe, buildProgressionSave, evolvedForLevel, freezeChampionTeam,
} from "./progressionRecipe"
import { parseSave } from "../storage/save"
import { CTS } from "../data/cts"
import { getSpecies } from "../data/species"

describe("ARENA_STEPS", () => {
    it("décrit les 5 arènes avec leur boss et leurs gardes", () => {
        expect(ARENA_STEPS).toHaveLength(5)
        expect(ARENA_STEPS.map((a) => a.badge)).toEqual(["plante", "roche", "feu", "elec", "eau"])
        for (const a of ARENA_STEPS) {
            expect(a.guardIds.length).toBeGreaterThanOrEqual(4) // 4 gardes minimum par arène
            expect(a.guardIds).not.toContain(a.bossId)
            expect(a.bossName).not.toBe(a.bossId) // le nom affiché a bien été résolu
        }
    })

    it("les dresseurs de route n'incluent ni arène ni Ligue", () => {
        const arenaIds = new Set(ARENA_STEPS.flatMap((a) => [...a.guardIds, a.bossId]))
        for (const id of ROUTE_TRAINER_IDS) {
            expect(arenaIds.has(id)).toBe(false)
            expect(id.startsWith("y_ligue_")).toBe(false)
        }
        expect(ROUTE_TRAINER_IDS.length).toBeGreaterThan(0)
    })

})

describe("evolvedForLevel", () => {
    it("suit la chaîne d'évolution PAR NIVEAU", () => {
        expect(evolvedForLevel("feuillichot", 5)).toBe("feuillichot")
        expect(evolvedForLevel("feuillichot", 16)).toBe("broutame") // évolution niv. 16
        expect(evolvedForLevel("feuillichot", 100)).toBe("sylvapuce") // stade final
    })

    it("ne dépasse jamais le dernier stade et tolère un id inconnu", () => {
        expect(evolvedForLevel("sylvapuce", 100)).toBe("sylvapuce")
        expect(evolvedForLevel("nawak", 50)).toBe("nawak")
    })
})

describe("buildProgressionSave — run 1", () => {
    it("produit une save qui SURVIT au parse serveur (aucun champ rejeté)", () => {
        const save = buildProgressionSave(defaultRecipe(), { now: 1700000000000 })
        const parsed = parseSave(save)
        expect(parsed.team.map((m) => m.speciesId)).toEqual(save.team.map((m) => m.speciesId))
        expect(parsed.badges).toEqual(save.badges)
        expect(parsed.items).toEqual(save.items)
        expect(parsed.activeWorld).toBe("live")
    })

    it("coche les arènes : badges, gardes+boss battus, CT-cadeau du boss", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), arenas: ["plante", "feu"] })
        expect(save.badges).toEqual(["plante", "feu"])
        const plante = ARENA_STEPS[0]
        for (const id of [...plante.guardIds, plante.bossId]) expect(save.defeatedTrainers).toContain(id)
        expect(save.ownedCts).toContain(plante.giftCt)
        // arène non cochée → rien
        expect(save.defeatedTrainers).not.toContain(ARENA_STEPS[1].bossId)
        expect(save.rematchedTrainers).toEqual([]) // revanches non demandées
    })

    it("PNJ hors arène/Ligue : un seul interrupteur global (oui/non)", () => {
        const off = buildProgressionSave(defaultRecipe())
        expect(ROUTE_TRAINER_IDS.some((id) => off.defeatedTrainers.includes(id))).toBe(false)
        expect(off.sbireWinsTotal).toBe(0)
        expect(off.aceWins).toBe(0)
        expect(off.orcalineWins).toBe(0)
        expect(off.pnj5Wins).toBe(0)
        expect(off.hhCollectorWins).toBe(0)
        expect(off.hhSpectresShown).toEqual([])
        expect(off.caveTradeDone).toBe(false)
        expect(off.goshHintHeard).toBe(false)
        expect(off.mimimoyReturned).toBe(false)
        expect(off.ownedCts).not.toContain("ct26")

        const on = buildProgressionSave({ ...defaultRecipe(), routeTrainers: true })
        for (const id of ROUTE_TRAINER_IDS) expect(on.defeatedTrainers).toContain(id)
        // réaffrontables : 1 victoire (battus au moins une fois) et pas un compteur qui ferait exploser leur scaling
        expect(on.sbireWinsTotal).toBe(1)
        expect(on.aceWins).toBe(1)
        expect(on.orcalineWins).toBe(1)
        expect(on.pnj5Wins).toBe(1)
        // collectionneur de spectres : seuil exact du défi (3 victoires + 3 spectres distincts) → CT26
        expect(on.hhCollectorWins).toBe(3)
        expect(on.hhSpectresShown).toHaveLength(3)
        expect(new Set(on.hhSpectresShown).size).toBe(3)
        expect(on.ownedCts).toContain("ct26")
        expect(on.caveTradeDone).toBe(true)
        expect(on.goshHintHeard).toBe(true)
        expect(on.mimimoyReturned).toBe(true)
        // le cliquet d'ACE reste à zéro → il se recalibre sur l'équipe générée
        expect(on.acePeakLevel).toBe(0)
        expect(on.aceTeamSizePeak).toBe(3)
    })

    it("Champion → Conseil des 4 + Maître battus et isChampion", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), champion: true })
        for (const id of LIGUE_COUNCIL_IDS) expect(save.defeatedTrainers).toContain(id)
        expect(save.defeatedTrainers).toContain(LIGUE_MASTER_ID)
        expect(save.isChampion).toBe(true)
    })

    it("Conseil des 4 seul n'accorde PAS le titre de Champion", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), conseil: true })
        expect(save.defeatedTrainers).toContain(LIGUE_COUNCIL_IDS[0])
        expect(save.defeatedTrainers).not.toContain(LIGUE_MASTER_ID)
        expect(save.isChampion).toBe(false)
    })

    it("l'énergie est écrêtée sur le plafond (1000 + 250/badge)", () => {
        const none = buildProgressionSave({ ...defaultRecipe(), reps: 99999, arenas: [] })
        expect(none.repsCap).toBe(1000)
        expect(none.reps).toBe(1000)
        const all = buildProgressionSave({ ...defaultRecipe(), reps: 99999, arenas: ["plante", "roche", "feu", "elec", "eau"] })
        expect(all.repsCap).toBe(2250)
        expect(all.reps).toBe(2250)
    })

    it("équipe : nombre, niveau, shiny, évolution et PC", () => {
        const save = buildProgressionSave({
            ...defaultRecipe(),
            team: { count: 6, level: 40, pool: "roster", shiny: true, boost: "elite", evolve: true, pcCount: 4 },
        })
        expect(save.team).toHaveLength(6)
        expect(save.pc).toHaveLength(4)
        for (const m of save.team) {
            expect(m.level).toBe(40)
            expect(m.shiny).toBe(true)
            expect(m.ivs).toEqual({ hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }) // shiny → IV parfaits
            expect(m.owned).toBe(true)
            expect(m.moves.length).toBeGreaterThan(0)
            expect(m.currentHp).toBeGreaterThan(0)
            expect(getSpecies(m.speciesId)).not.toBeNull()
            expect(m.ev).toBeDefined() // entraînement élite
        }
    })

    it("uids uniques entre l'équipe et le PC (pas de collision au chargement)", () => {
        const save = buildProgressionSave({
            ...defaultRecipe(), team: { count: 6, level: 30, pool: "all", shiny: false, boost: "none", evolve: true, pcCount: 12 },
        })
        const uids = [...save.team, ...save.pc].map((m) => m.uid)
        expect(new Set(uids).size).toBe(uids.length)
    })

    it("déterministe : même graine = même équipe, graine différente = équipe différente", () => {
        const r = { ...defaultRecipe(), team: { ...defaultRecipe().team, count: 6, pool: "all" as const } }
        const a = buildProgressionSave({ ...r, seed: 42 }).team.map((m) => m.speciesId)
        const b = buildProgressionSave({ ...r, seed: 42 }).team.map((m) => m.speciesId)
        const c = buildProgressionSave({ ...r, seed: 43 }).team.map((m) => m.speciesId)
        expect(a).toEqual(b)
        expect(a).not.toEqual(c)
    })

    it("sac, CT et Pokédex suivent les options", () => {
        const full = buildProgressionSave({ ...defaultRecipe(), bag: "full", keyItems: true, allCts: true, dexComplete: true })
        expect(full.ownedCts).toHaveLength(CTS.length)
        expect(full.items.master_ball).toBeGreaterThan(0)
        expect(full.items.daemonflute).toBe(1)
        expect(full.pokedex.caught.length).toBeGreaterThan(100)
        expect(full.pokedex.seen).toEqual(full.pokedex.caught)

        const bare = buildProgressionSave({ ...defaultRecipe(), bag: "none", keyItems: false, allCts: false, dexComplete: false })
        expect(bare.items).toEqual({})
        expect(bare.ownedCts).toEqual([])
        // sans dex complet : seules les espèces possédées sont marquées
        expect(bare.pokedex.caught.sort()).toEqual([...new Set(bare.team.map((m) => m.speciesId))].sort())
    })

    it("saut des cinématiques → cadeaux one-shot déjà réclamés", () => {
        const skip = buildProgressionSave({ ...defaultRecipe(), skipCinematics: true })
        expect(skip.introSeen).toBe(true)
        expect(skip.welcomeGift).toBe(true)
        expect(skip.spagGift).toBe(true)
        expect(skip.pastaGodGift).toBe(true)
        expect(skip.labDefi.geneIntroSeen).toBe(true)

        const keep = buildProgressionSave({ ...defaultRecipe(), skipCinematics: false })
        expect(keep.welcomeGift).toBe(false)
        expect(keep.labDefi.geneIntroSeen).toBe(false)
    })
})

describe("buildProgressionSave — multi-mondes", () => {
    it("run 2 : monde actif = ngplusWorld, champs plats = run 1 Champion", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), run: "run2", reps: 10000 }, { now: 1700000000000 })
        expect(save.activeWorld).toBe("ngplus")
        // champs plats = run 1 terminé (garde-fou anti-écrasement du serveur)
        expect(save.isChampion).toBe(true)
        expect(save.badges).toHaveLength(5)
        expect(save.ngplusUsed).toBe(true)
        expect(save.run3Used).toBe(false)
        // monde actif = la recette
        expect(save.ngplusWorld).not.toBeNull()
        expect(save.ngplusWorld!.isChampion).toBe(false)
        expect(save.ngplusWorld!.repsCap).toBe(10000)
        expect(save.ngplusWorld!.reps).toBe(10000)
        // équipe d'origine figée = adversaire du combat de fin de Ligue run 2
        expect(save.ngplusOldTeam).toHaveLength(6)
        expect(save.run3World).toBeNull()
    })

    it("run 3 : les 3 mondes existent, runs amont Champions", () => {
        const save = buildProgressionSave({
            ...defaultRecipe(), run: "run3", reps: 500,
            team: { count: 1, level: 5, pool: "run3", shiny: false, boost: "none", evolve: false, pcCount: 0 },
        }, { now: 1700000000000 })
        expect(save.activeWorld).toBe("run3")
        expect(save.isChampion).toBe(true)          // run 1
        expect(save.ngplusWorld?.isChampion).toBe(true) // run 2
        expect(save.run3World).not.toBeNull()
        expect(save.run3Used).toBe(true)
        expect(save.run3World!.run3StarterBase).toBe(save.run3World!.team[0].speciesId)
        expect(["elefer", "cornaive", "coccipoing"]).toContain(save.run3World!.run3StarterBase)
    })

    it("les mondes imbriqués survivent au parse serveur (profondeur bornée à 1)", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), run: "run3" })
        const parsed = parseSave(save)
        expect(parsed.activeWorld).toBe("run3")
        expect(parsed.run3World?.team).toHaveLength(save.run3World!.team.length)
        expect(parsed.ngplusWorld?.badges).toHaveLength(5)
        expect(parsed.ngplusOldTeam).toHaveLength(6)
        // un monde imbriqué ne porte JAMAIS de sous-monde
        expect(parsed.run3World?.ngplusWorld).toBeNull()
        expect(parsed.ngplusWorld?.run3World).toBeNull()
    })
})

describe("freezeChampionTeam", () => {
    it("fige stats calculées + noms d'attaques", () => {
        const save = buildProgressionSave({ ...defaultRecipe(), team: { ...defaultRecipe().team, count: 2, level: 50 } })
        const frozen = freezeChampionTeam(save.team)
        expect(frozen).toHaveLength(2)
        for (const m of frozen) {
            expect(m.level).toBe(50)
            expect(m.stats.hp).toBeGreaterThan(1)
            expect(m.moves.length).toBeGreaterThan(0)
            expect(m.moves.every((n) => !n.includes("_"))).toBe(true) // noms affichés, pas des moveId
        }
    })
})

describe("PRESETS", () => {
    it("chaque preset produit une save valide (parse serveur idempotent)", () => {
        for (const p of PRESETS) {
            const save = buildProgressionSave(p.recipe, { now: 1700000000000 })
            const parsed = parseSave(save)
            expect(parsed.activeWorld, p.id).toBe(save.activeWorld)
            expect(parsed.team.length, p.id).toBe(save.team.length)
            expect(parsed.badges, p.id).toEqual(save.badges)
        }
    })

    it("le preset Champion ouvre bien le post-game", () => {
        const champ = PRESETS.find((p) => p.id === "champion")!
        const save = buildProgressionSave(champ.recipe)
        expect(save.isChampion).toBe(true)
        expect(save.badges).toHaveLength(5)
        expect(save.sylvebarbeAwake).toBe(true)
        expect(save.domeChampionships).toBe(1)
    })
})
