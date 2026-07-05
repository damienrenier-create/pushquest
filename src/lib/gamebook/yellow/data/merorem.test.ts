import { describe, it, expect, beforeEach } from "vitest"
import { getSpecies, visibleDexSpecies } from "./species"
import { getMove } from "./moves"
import { hydratePlayer, getPlayer, grantTonytony, makeTonytonyShiny, casinoPillar, setActiveWorld } from "../store/playerStore"
import { hydratePokedex, pokedexCompletion } from "../store/pokedexStore"
import { emptyLabDefi, TONYTONY_SHINY_TARGET } from "./labDefis"

const RUN2 = ["gekraise", "ukognos", "merorem"] // Daemons masqués des dex hors run 2

beforeEach(() => {
    setActiveWorld("live")
    hydratePokedex({ seen: [], caught: [] })
})

describe("MEROREM — Poison/Insecte, alter-ego de Tonytony (run 2)", () => {
    const m = getSpecies("merorem")!
    it("existe, Poison/Insecte, dexNo 137, stats attendues, caché run 2", () => {
        expect(m).toBeTruthy()
        expect(m.types).toEqual(["POISON", "INSECTE"])
        expect(m.dexNo).toBe(137)
        expect(m.baseStats).toEqual({ hp: 130, atk: 85, def: 100, spe: 40, spc: 90 })
        expect(m.hiddenUntilCaught).toBe(true)
        expect(m.runTwoOnly).toBe(true)
    })
    it("kit de pestilence : Toxik + STAB Poison ET Insecte + capstone niv 90", () => {
        const ids = m.learnset.map((l) => l.moveId)
        expect(ids).toContain("toxik")
        const types = ids.map((id) => getMove(id)?.type)
        expect(types).toContain("POISON")
        expect(types).toContain("INSECTE")
        expect(m.learnset.find((l) => l.moveId === "miasme_corrosif")?.level).toBe(90)
    })
})

describe("Verrou dex run 2 — visibleDexSpecies", () => {
    it("sans capture : Gékraise/Ukognos/Merorem sont INVISIBLES", () => {
        const ids = visibleDexSpecies([]).map((s) => s.id)
        for (const id of RUN2) expect(ids, id).not.toContain(id)
    })
    it("une fois capturés : ils apparaissent", () => {
        const ids = visibleDexSpecies(RUN2).map((s) => s.id)
        for (const id of RUN2) expect(ids, id).toContain(id)
    })
    it("les Daemons normaux restent toujours visibles (ex. Tonytony)", () => {
        expect(visibleDexSpecies([]).map((s) => s.id)).toContain("tonytony")
    })
    it("pokedexCompletion : le total EXCLUT les run-2 non capturés (pas de spoiler)", () => {
        hydratePokedex({ seen: [], caught: [] })
        const before = pokedexCompletion().total
        hydratePokedex({ seen: ["merorem"], caught: ["merorem"] })
        expect(pokedexCompletion().total).toBe(before + 1) // Merorem rentre dans le total une fois capturé
    })
})

describe("Casino world-aware : Tonytony (run 1) / Merorem (run 2)", () => {
    it("run 1 : casinoPillar = Tonytony ; le don donne tonytony", () => {
        setActiveWorld("live")
        expect(casinoPillar().species).toBe("tonytony")
        hydratePlayer({ team: [], pc: [], reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: 1000 } })
        grantTonytony()
        const all = [...getPlayer().team, ...getPlayer().pc]
        expect(all.some((x) => x.speciesId === "tonytony")).toBe(true)
    })
    it("run 2 : casinoPillar = Merorem ; le don donne MEROREM (jamais Tonytony)", () => {
        setActiveWorld("ngplus")
        expect(casinoPillar().species).toBe("merorem")
        hydratePlayer({ team: [], pc: [], reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: 1000 } })
        grantTonytony()
        const all = [...getPlayer().team, ...getPlayer().pc]
        expect(all.some((x) => x.speciesId === "merorem")).toBe(true)
        expect(all.some((x) => x.speciesId === "tonytony")).toBe(false)
    })
    it("run 2 : le palier shiny (5000) rend un MEROREM shiny", () => {
        setActiveWorld("ngplus")
        hydratePlayer({ team: [], pc: [], reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: TONYTONY_SHINY_TARGET, tonytonyClaimed: true } })
        expect(makeTonytonyShiny()).toBe("new") // aucun Merorem en poche → en redonne un shiny
        const mer = [...getPlayer().team, ...getPlayer().pc].find((x) => x.speciesId === "merorem")
        expect(mer?.shiny).toBe(true)
    })
    it("shiny REFUSÉ tant que le pilier de base n'est pas réclamé (5000⚡ mais tonytonyClaimed=false)", () => {
        setActiveWorld("ngplus")
        hydratePlayer({ team: [], pc: [], reps: 0, repsCap: 1000, repsBankedTotal: 0, labDefi: { ...emptyLabDefi(), casinoTotalWon: TONYTONY_SHINY_TARGET, tonytonyClaimed: false } })
        expect(makeTonytonyShiny()).toBeNull() // pas de shiny gratuit sans le don de base (1000⚡)
    })
})
