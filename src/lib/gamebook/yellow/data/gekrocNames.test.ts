import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { gekrocName, gekrocIntroLines, gekrocDoneLines, GEKROC_INTRO_LINES, gekrocSpeciesForWorld } from "./gekroc"
import { getSpecies } from "./species"
import { captureGuide } from "./encounters"

// Sartay, 28/10/2026 : « run 3 : dans la Centrale ce n'est pas Gékroc mais Gékosmic ! il faut modifier le texte ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("gardien de la Centrale : le bon nom dans chaque run", () => {
    it("Gékroc au run 1, Gékraise au run 2, Gékosmic au run 3 — le nom suit l'espèce réellement combattue", () => {
        for (const w of ["live", "ngplus", "run3"] as const) expect(gekrocName(w)).toBe(getSpecies(gekrocSpeciesForWorld(w))!.name)
        const r3 = [...gekrocIntroLines("run3"), ...gekrocDoneLines("run3")].join(" ")
        expect(r3).toContain("GÉKOSMIC"); expect(r3).toContain("Gékosmic"); expect(r3).not.toMatch(/gékroc/i)
        expect(gekrocIntroLines("ngplus").join(" ")).toContain("GÉKRAISE")
        expect(GEKROC_INTRO_LINES.join(" ")).toContain("GÉKROC") // run 1 inchangé
    })
    it("câblage : dialogue, nom affiché et message de la Pierre suivent le run joué ; le guide nomme les trois", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("lines: gekrocIntroLines(gWorld)")
        expect(gs).toContain("lines: gekrocDoneLines(gWorld)")
        expect(gs).not.toContain("npcName: \"GÉKROC\"")
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("`🪨 En s'effondrant, ${gName} libère une PIERRE D'ÉVOLUTION !")
        expect(captureGuide("pyropanthe", 3).how.join(" ")).toContain("Gékosmic au run 3")
    })
})
