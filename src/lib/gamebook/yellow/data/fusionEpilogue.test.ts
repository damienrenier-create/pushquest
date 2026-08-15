import { describe, it, expect } from "vitest"
import { fusionEpilogueQuests, EPILOGUE_TRAINERS, type EpilogueQuestInput } from "./fusionEpilogue"

const base: EpilogueQuestInput = { markers: [], caught: [], dexCount: 0, domeChampionships: 0, fusionsDiscovered: 0, shinyCount: 0 }
const get = (inp: EpilogueQuestInput, label: string) => fusionEpilogueQuests(inp).find((q) => q.label.includes(label))!

describe("épilogue Ligue de Fusion", () => {
    it("Acte I : les 6 dresseurs dans l'ordre, chacun avec un contre", () => {
        expect(EPILOGUE_TRAINERS.map((t) => t.name)).toEqual(["WILL", "KOGA", "BRUNO", "KAREN", "LANCE", "DIEU SPAGHETTI"])
        for (const t of EPILOGUE_TRAINERS) expect(t.counter.length).toBeGreaterThan(0)
    })
    it("Acte III : tout à faire quand le joueur débute l'endgame", () => {
        expect(fusionEpilogueQuests(base).every((q) => !q.done)).toBe(true)
    })
    it("Acte III : marque done selon l'état réel", () => {
        expect(get({ ...base, markers: ["ukognofy_caught"] }, "UKOGNOFY").done).toBe(true)
        expect(get({ ...base, markers: ["fusleague_or"] }, "palier OR").done).toBe(true)
        expect(get({ ...base, markers: ["y_pnj3_grotte_b2f"] }, "B2F").done).toBe(true)
        expect(get({ ...base, caught: ["megamonarx"] }, "MÉGAMONARX").done).toBe(true)
        expect(get({ ...base, dexCount: 100 }, "Pokédex").done).toBe(true)
        expect(get({ ...base, shinyCount: 1 }, "SHINY").done).toBe(true)
        expect(get({ ...base, domeChampionships: 3 }, "Dôme").done).toBe(true)
    })
    it("Acte III : teasers SANS SPOILER — pas de recette exacte pour les secrets", () => {
        const q = fusionEpilogueQuests(base)
        const banned = ["21h", "niv 100", "Draconarque", "Mégalithe", "150 espèces", "1 sur 512", "1/512"]
        for (const quest of q) for (const b of banned) expect(quest.hint.includes(b), `${quest.label} révèle « ${b} »`).toBe(false)
    })
})
