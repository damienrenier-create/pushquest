import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isShinyEncounter, SHINY_ANNOUNCE_MS, SHINY_ANNOUNCE_REDUCED_MS } from "./encounterTransitions"

// Sartay, 28/10/2026 : « il existe un écran, une animation spéciale par type… il en faudrait une vraiment dingue pour annoncer
// un shiny ! ». Un Daemon SAUVAGE chromatique remplace l'anim de type par l'annonce ShinyAnnounce.
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("annonce shiny à la rencontre", () => {
    it("seulement pour un Daemon SAUVAGE chromatique", () => {
        expect(isShinyEncounter({ isWild: true, shiny: true })).toBe(true)
        expect(isShinyEncounter({ isWild: true, shiny: false })).toBe(false)
        expect(isShinyEncounter({ isWild: true })).toBe(false)
        expect(isShinyEncounter({ isWild: false, shiny: true })).toBe(false) // le shiny d'un dresseur n'est pas une rencontre
    })
    it("assez longue pour en profiter, toujours passable, et sobre si l'appareil demande moins d'animations", () => {
        expect(SHINY_ANNOUNCE_MS).toBeGreaterThanOrEqual(3500)
        expect(SHINY_ANNOUNCE_MS).toBeLessThanOrEqual(5000)
        expect(SHINY_ANNOUNCE_REDUCED_MS).toBeLessThan(2000)
        const ui = read("src/app/gamebook/yellow/battle/ShinyAnnounce.tsx")
        expect(ui).toContain("⏩ Passer (B)")
        expect(ui).toContain("if (reduced) {")
        expect(ui).toContain("const TITLE = \"SHINY !\"")
    })
    it("câblage : la transition de rencontre passe la main à l'annonce pour un shiny sauvage", () => {
        const tr = read("src/app/gamebook/yellow/battle/EncounterTransition.tsx")
        expect(tr).toContain("const shiny = isShinyEncounter({ isWild: battle.isWild, shiny: enemy?.shiny }) ? { sprite: sp?.sprite, name: sp?.name } : undefined")
        expect(tr).toContain("if (fx.shiny) return <ShinyAnnounce sprite={fx.shiny.sprite} name={fx.shiny.name} reduced={reduced} onSkip={skip} seed={fx.key} />")
    })
})
