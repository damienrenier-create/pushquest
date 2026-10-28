import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isShinyEncounter, pickShinyDecoys, SHINY_ANNOUNCE_MS, SHINY_ANNOUNCE_REDUCED_MS, SHINY_DECOYS } from "./encounterTransitions"
import { zoneSpeciesIds } from "./encounters"

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
        expect(SHINY_ANNOUNCE_MS).toBeGreaterThanOrEqual(6000) // « une giga bonne nouvelle » : on prend le temps (28/10/2026)
        expect(SHINY_ANNOUNCE_MS).toBeLessThanOrEqual(8000)
        expect(SHINY_ANNOUNCE_REDUCED_MS).toBeLessThan(2000)
        const ui = read("src/app/gamebook/yellow/battle/ShinyAnnounce.tsx")
        expect(ui).toContain("⏩ Passer (B)")
        expect(ui).toContain("if (reduced) {")
        expect(ui).toContain("const TITLE = \"SHINY !\"")
    })
    it("câblage : la transition de rencontre passe la main à l'annonce pour un shiny sauvage", () => {
        const tr = read("src/app/gamebook/yellow/battle/EncounterTransition.tsx")
        expect(tr).toContain('const shiny = isShinyEncounter({ isWild: battle.isWild, shiny: enemy?.shiny }) ? { sprite: sp?.sprite, name: sp?.name, decoys: shinyDecoySprites(enemy?.speciesId ?? "") } : undefined')
        expect(tr).toContain("if (fx.shiny) return <ShinyAnnounce sprite={fx.shiny.sprite} name={fx.shiny.name} decoys={fx.shiny.decoys} reduced={reduced} onSkip={skip} seed={fx.key} />")
    })
    it("roulette d'ombres : 4 autres Daemons, jamais l'espèce rencontrée, sans doublon, tirage stable pour une graine", () => {
        const pool = ["a", "b", "c", "b", "d", "e", "magnetor", "f"]
        const got = pickShinyDecoys("magnetor", [pool], 42)
        expect(got).toHaveLength(SHINY_DECOYS)
        expect(new Set(got).size).toBe(SHINY_DECOYS)
        expect(got).not.toContain("magnetor")
        expect(got.every((id) => pool.includes(id))).toBe(true)
        expect(pickShinyDecoys("magnetor", [pool], 42)).toEqual(got)
        expect(pickShinyDecoys("x", [["x", "y"]], 1)).toEqual(["y"]) // trop peu d'espèces : on prend ce qu'il y a
    })
    it("ombres plausibles : d'abord les Daemons croisés dans la zone, puis les derniers vus, puis la faune de la zone", () => {
        const seenHere = ["pampousse", "feuillichot"], recent = ["ruffiant", "plumiot", "pampousse"], zone = ["couperin", "elefer"]
        const got = pickShinyDecoys("magnetor", [seenHere, recent, zone], 7)
        expect(got.slice(0, 2).sort()).toEqual(["feuillichot", "pampousse"]) // le palier 1 passe en entier d'abord
        expect(got.slice(2).every((id) => ["ruffiant", "plumiot"].includes(id))).toBe(true)
        expect(new Set(got).size).toBe(4)
    })
    it("la faune d'une zone vient des mêmes tables que le tirage, sans remplacement ni entrée d'après Sylvebarbe", () => {
        const ids = zoneSpeciesIds("yellow_cendreville", 1)
        expect(ids.length).toBeGreaterThan(2)
        expect(ids).not.toContain("coucouminou")
        expect(zoneSpeciesIds("carte_inexistante", 1)).toEqual([])
    })
})
