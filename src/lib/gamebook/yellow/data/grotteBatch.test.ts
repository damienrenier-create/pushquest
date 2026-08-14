import { describe, it, expect } from "vitest"
import { getSpecies } from "./species"
import { createMonInstance } from "../battle/factory"
import { buildPnj6Team, makeCrocavernGift, CROCAVERN_GIFT_LEVEL, PNJ6_TRADE_DONE_MARKER } from "./pnj6"
import { buildPnj10Team, inPnj10Block, isPnj10ClearedThisVisit, recordPnj10Cleared, resetPnj10Visit, PNJ10_LEVEL } from "./pnj10"
import { GROTTE_SIGN_LINES } from "./grotteSign"

describe("Crocavern (exclusif Grotte)", () => {
    it("espèce valide : dex 190, SOL/PLANTE, mono-stade, learnset instanciable", () => {
        const sp = getSpecies("crocavern")!
        expect(sp).toBeTruthy()
        expect(sp.dexNo).toBe(190)
        expect(sp.types).toEqual(["SOL", "PLANTE"])
        expect(sp.evolution).toBeUndefined() // mono-stade
        expect(sp.baseStats.atk).toBeGreaterThan(sp.baseStats.spe) // puissant mais lent
        const mon = createMonInstance("crocavern", 50, { owned: false })
        expect(mon.moves.length).toBeGreaterThan(0)
    })
})

describe("PNJ 6 — l'Échangeur", () => {
    it("buildPnj6Team : 6 Daemons niv 70 dont Crocavern", () => {
        const team = buildPnj6Team()
        expect(team.map((m) => m.speciesId)).toEqual(["draconarque", "omnhippo", "sonarque", "tonytony", "shadow", "crocavern"])
        expect(team.every((m) => m.level === 70)).toBe(true)
    })
    it("makeCrocavernGift : un Crocavern neuf au niveau cadeau", () => {
        const gift = makeCrocavernGift()
        expect(gift.speciesId).toBe("crocavern")
        expect(gift.level).toBe(CROCAVERN_GIFT_LEVEL)
    })
    it("marqueur d'échange défini", () => {
        expect(PNJ6_TRADE_DONE_MARKER).toBe("pnj6_trade_done")
    })
})

describe("PNJ 10 — la Sentinelle (bloqueur)", () => {
    it("buildPnj10Team : 6 Daemons niv 70", () => {
        const team = buildPnj10Team()
        expect(team.map((m) => m.speciesId)).toEqual(["mobyd", "uzumaro", "razmaree", "naiadrak", "abyssombre", "orcaline"])
        expect(team.every((m) => m.level === PNJ10_LEVEL)).toBe(true)
    })
    it("inPnj10Block : barre (17-19,18), pas la case du PNJ ni au-delà", () => {
        expect(inPnj10Block(17, 18)).toBe(true)
        expect(inPnj10Block(18, 18)).toBe(true)
        expect(inPnj10Block(19, 18)).toBe(true)
        expect(inPnj10Block(16, 18)).toBe(false) // case du PNJ
        expect(inPnj10Block(20, 18)).toBe(false) // au-delà
    })
    it("flag « vaincu cette visite » : reset=false, record=true, reset=false", () => {
        resetPnj10Visit()
        expect(isPnj10ClearedThisVisit()).toBe(false)
        recordPnj10Cleared()
        expect(isPnj10ClearedThisVisit()).toBe(true)
        resetPnj10Visit()
        expect(isPnj10ClearedThisVisit()).toBe(false)
    })
})

describe("Panneau d'info Grotte 1F", () => {
    it("carrousel présent + SANS SPOILER (pas de « fusion »/« scientifique »)", () => {
        expect(GROTTE_SIGN_LINES.length).toBeGreaterThan(3)
        const joined = GROTTE_SIGN_LINES.join(" ").toLowerCase()
        expect(joined).not.toContain("fusion")
        expect(joined).not.toContain("scientifique")
        expect(joined).toContain("nuit") // évoque bien le rythme jour/nuit
    })
})
