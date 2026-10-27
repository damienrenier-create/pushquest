import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { YELLOW_MAPS } from "../maps"
import { YELLOW_NPCS } from "../npcs"
import { RUN3_VETERAN_NPC_ID, RUN3_VETERAN_MAP_ID, RUN3_VETERAN_POS, RUN3_VETERAN_SPRITE, RUN3_VETERAN_LINES } from "./run3Veteran"

// LE VÉTÉRAN — PNJ run 3 de la Ville Jaune (25,37), devant le bloc Sylvebarbe (demande Sartay du 27/10/2026).
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("Vétéran (run 3) — case, planche, dialogue", () => {
    it("la case (25,37) est praticable, hors sortie, libre de tout autre PNJ, et laisse 3 cases de couloir", () => {
        const m = YELLOW_MAPS[RUN3_VETERAN_MAP_ID]
        const { x, y } = RUN3_VETERAN_POS
        expect([x, y]).toEqual([25, 37])
        expect(m.tiles[y][x]).toBe("grass")
        expect((m.exits ?? []).some((e) => e.x === x && e.y === y)).toBe(false)
        expect(YELLOW_NPCS.some((n) => n.mapId === RUN3_VETERAN_MAP_ID && n.initialX === x && n.initialY === y)).toBe(false)
        expect([22, 23, 24].every((cx) => m.tiles[y][cx] === "grass")).toBe(true) // le passage sud reste ouvert
    })
    it("planche Gen 3 présente ; dialogue = Sylvebarbe, la flûte, Chen, « deux fois la Ligue », le conseil", () => {
        expect(fs.existsSync(path.join(process.cwd(), "public", RUN3_VETERAN_SPRITE))).toBe(true)
        const all = RUN3_VETERAN_LINES.join(" ")
        for (const s of ["SYLVEBARBE", "FLÛTE", "CHEN", "DEUX FOIS la Ligue", "ça ne suffit pas", "le plus loin possible", "digne de la flûte"]) expect(all, s).toContain(s)
        expect(all).not.toMatch(/pompes|quota|sueur|\breps\b/i) // vocabulaire neutre (joueurs fun)
    })
    it("câblage gameStore : visible seulement en run 3 et tant que Sylvebarbe dort", () => {
        const gs = read("src/lib/gamebook/yellow/store/gameStore.ts")
        expect(gs).toContain("if (effectiveRunWorld() === \"run3\" && !getPlayerSave().sylvebarbeAwake) {")
        expect(gs).toContain(`id: ${"RUN3_VETERAN_NPC_ID"},`)
        expect(gs).toContain("gen3: { url: RUN3_VETERAN_SPRITE }")
        expect(RUN3_VETERAN_NPC_ID).toBe("y_run3_veteran")
    })
})
