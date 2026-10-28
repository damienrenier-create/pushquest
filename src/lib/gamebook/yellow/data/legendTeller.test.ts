import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { YELLOW_MAPS } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { getSpecies } from "./species"
import { CONTEUR_NPC_ID, CONTEUR_MAP_ID, CONTEUR_POS, CONTEUR_RUNS, CONTEUR_SPRITES, CONTEUR_LEGEND, conteurRun, conteurLines, conteurStatsLine } from "./legendTeller"

// LE CONTEUR — Cendreville (11,23), un visage par run, le légendaire de la run (demande Sartay du 27/10/2026).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const DAEMO_SPOTS = [[26, 15], [8, 17], [17, 29], [36, 4], [22, 2], [7, 8], [30, 29]]

describe("Conteur — case, planches, version par run", () => {
    it("la case (11,23) est praticable, hors sortie, hors PNJ fixe et hors spots du Daemomaniaque", () => {
        const m = YELLOW_MAPS[CONTEUR_MAP_ID]
        const { x, y } = CONTEUR_POS
        expect([x, y]).toEqual([11, 23])
        expect(m.tiles[y][x]).toBe("path")
        expect((m.exits ?? []).some((e) => e.x === x && e.y === y)).toBe(false)
        expect(YELLOW_NPCS.some((n) => n.mapId === CONTEUR_MAP_ID && n.initialX === x && n.initialY === y)).toBe(false)
        expect(DAEMO_SPOTS.some(([sx, sy]) => sx === x && sy === y)).toBe(false)
    })
    it("4 planches Gen 3 présentes ; run 1/2/3/fusion → Goshendofy/Ukognos/Flamarokto/Galijah", () => {
        for (const r of CONTEUR_RUNS) expect(fs.existsSync(path.join(process.cwd(), "public", CONTEUR_SPRITES[r])), r).toBe(true)
        expect(conteurRun("live", false)).toBe("run1"); expect(conteurRun("ngplus", false)).toBe("run2")
        expect(conteurRun("run3", false)).toBe("run3"); expect(conteurRun("live", true)).toBe("fusion")
        expect(conteurRun("run3", true)).toBe("run3") // le run 3 prime sur l'état de Sylvebarbe
        expect(CONTEUR_LEGEND).toEqual({ run1: "goshendofy", run2: "ukognos", run3: "flamarokto", fusion: "galijah" })
        expect(CONTEUR_NPC_ID).toBe("y_conteur_legende")
    })
})

describe("Conteur — dialogues (nom, stats lues dans species.ts, méthode de capture réelle)", () => {
    it("chaque run nomme son légendaire, ses stats exactes et sa méthode ; vocabulaire neutre", () => {
        for (const r of CONTEUR_RUNS) {
            const id = CONTEUR_LEGEND[r]
            const sp = getSpecies(id)!
            const b = sp.baseStats
            const all = conteurLines(r, false).join(" ")
            expect(all, r).toContain(sp.name.toUpperCase())
            expect(all, r).toContain(`PV ${b.hp}, Attaque ${b.atk}, Défense ${b.def}, Vitesse ${b.spe}, Spécial ${b.spc} — ${b.hp + b.atk + b.def + b.spe + b.spc} au total`)
            expect(all, r).toContain("Nexus-Ball")
            if (r !== "run3") expect(all, r).toContain("Super Méga Nexus-Ball") // run 3 : l'Hyper garantie sous 60 % suffit, pas besoin de la Super Méga
            expect(all, r).not.toMatch(/pompes|quota|sueur|\breps\b/i)
            expect(conteurLines(r, true).join(" ")).toContain("tu l'as DÉJÀ")
            expect(conteurLines(r, false).join(" ")).not.toContain("tu l'as DÉJÀ")
        }
        expect(conteurStatsLine("goshendofy")).toContain("590 au total")
        const r1 = conteurLines("run1", false).join(" "), r2 = conteurLines("run2", false).join(" "), r3 = conteurLines("run3", false).join(" "), rf = conteurLines("fusion", false).join(" ")
        expect(r1).toContain("HAUTES HERBES"); expect(r1).toContain("dès 21h"); expect(r1).toContain("DOUBLENT"); expect(r1).toContain("Hyper Nexus-Ball +")
        expect(r2).toContain("entre 5h et 11h"); expect(r2).toContain("UKOGNOS"); expect(r2).toContain("type FÉE")
        expect(r3).toContain("entre 11h et 15h"); expect(r3).toContain("multipliées par DEUX ET DEMI"); expect(r3).toContain("sous 60 % de ses PV OU sous un statut"); expect(r3).toContain("type GLACE/FEU")
        expect(rf).toContain("ÎLE ÉMERAUDE"); expect(rf).toContain("SURFER"); expect(rf).toContain("135 espèces"); expect(rf).toContain("150 ESPÈCES"); expect(rf).toContain("200 espèces"); expect(rf).toContain("type FÉE/SPECTRE")
    })
    it("câblage gameStore : toujours présent, sprite et lignes par run, légendaire déjà capturé lu au Pokédex", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("const cRun = conteurRun(effectiveRunWorld(), getPlayerSave().sylvebarbeAwake)")
        expect(gs).toContain("gen3: { url: CONTEUR_SPRITES[cRun] }")
        expect(gs).toContain("dialoguesAfter: conteurLines(cRun, getPokedex().caught.includes(CONTEUR_LEGEND[cRun]))")
    })
})
