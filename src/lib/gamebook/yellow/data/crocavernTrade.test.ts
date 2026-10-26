import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { makeCrocavernGift, CROCAVERN_GIFT_LEVEL } from "./pnj6"
import { runObtainableSpecies, captureGuide } from "./encounters"
import { fusionSynergy, synergyPairName } from "./fusionSpecies"
import { fusionSecretEntries } from "./fusionSecrets"

// Décisions Sartay du 26/10/2026 : « le Crocavern hérite évidemment de la brillance », « on enlève Crocavern des runs 1, 2, 3 :
// uniquement dispo en échange », et Morrow × Crocavern synergiques (les deux Daemons qu'on n'obtient que par échange).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("Crocavern : échange de l'Échangeur (Grotte du Nexus)", () => {
    it("hérite de la brillance et des points Saiyan du Daemon donné ; niveau fixe ; neuf = pas shiny", () => {
        const plain = makeCrocavernGift()
        expect(plain.speciesId).toBe("crocavern"); expect(plain.shiny).toBeFalsy(); expect(plain.level).toBe(CROCAVERN_GIFT_LEVEL)
        const fromShiny = makeCrocavernGift({ shiny: true, statPoints: 7 })
        expect(fromShiny.shiny).toBe(true); expect(fromShiny.statPoints).toBe(7); expect(fromShiny.level).toBe(CROCAVERN_GIFT_LEVEL)
        expect(makeCrocavernGift({ shiny: false, statPoints: 0 }).shiny).toBeFalsy()
        expect(read("src/app/gamebook/yellow/YellowDevClient.tsx")).toContain("makeCrocavernGift(lead)")
    })
    it("plus jamais sauvage : absent des runs 1, 2 et 3 ; obtenable au run fusion (échange)", () => {
        expect(read("src/lib/gamebook/yellow/data/encounters.ts")).not.toMatch(/speciesId: "crocavern"/)
        for (const run of [1, 2, 3]) {
            expect(runObtainableSpecies(run, false).has("crocavern"), `run ${run}`).toBe(false)
            expect(captureGuide("crocavern", run, true, false, true, false).where).toEqual([])
        }
        expect(runObtainableSpecies(4, true).has("crocavern")).toBe(true)
    })
})

describe("Morrow × Crocavern : la synergie des troqués", () => {
    it("paire boostée, nom Morrocroc, carte Secrets avec énigme sans nom d'espèce", () => {
        expect(fusionSynergy("morrow", "crocavern")?.label).toBe("la synergie des troqués")
        expect(fusionSynergy("crocavern", "morrow")?.key).toBe("pair:crocavern|morrow")
        expect(synergyPairName("crocavern", "morrow")).toBe("Morrocroc")
        const e = fusionSecretEntries().find((x) => x.key === "pair:crocavern|morrow")
        expect(e?.riddle).toContain("troquant")
        expect(e?.riddle).not.toMatch(/Morrow|Crocavern/)
    })
})
