import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isBlockingTile } from "@/lib/gamebook/mapEngine"
import { YELLOW_MAPS, UKOGNOFY_CHAMBER_EMPTY_TILES } from "../maps"
import { UKOGNOFY_CHAMBER_MAP, UKOGNOFY_CHAMBER_EMPTY_BG, UKOGNOFY_NPC_POS } from "./ukognofy"
import { pnj5VictoryLines, PNJ5_VICTORY_LINES, PNJ5_ORFEVRE_LINES } from "./pnj5"

// Sartay, 28/10/2026 : « dans le sanctuaire d'Ukognofy, une fois celui-ci battu et l'Orfèvre mis à sa place, faut enlever le
// sprite d'Ukognofy. Comment les joueurs vont-ils savoir que l'Orfèvre est là ? Il faut un dialogue spécifique au dresseur de
// geckos une fois Ukognofy capturé ».
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")
const pngSize = (rel: string) => { const b = fs.readFileSync(path.join(process.cwd(), "public", rel)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } }

describe("sanctuaire d'Ukognofy, une fois le légendaire capturé", () => {
    it("le décor sans le légendaire existe, à la taille exacte du décor d'origine", () => {
        expect(pngSize(UKOGNOFY_CHAMBER_EMPTY_BG)).toEqual(pngSize("/yellow/sprites/salle_ukognofy.png"))
    })
    it("le bloc central redevient du sol (il était solide sous le légendaire peint) ; murs et piliers restent", () => {
        const full = YELLOW_MAPS[UKOGNOFY_CHAMBER_MAP].tiles
        for (let y = 4; y <= 7; y++) for (let x = 5; x <= 8; x++) {
            expect(isBlockingTile(full[y][x])).toBe(true)
            expect(isBlockingTile(UKOGNOFY_CHAMBER_EMPTY_TILES[y][x])).toBe(false)
        }
        for (const [x, y] of [[2, 5], [11, 6], [0, 0], [13, 7]] as const) expect(isBlockingTile(UKOGNOFY_CHAMBER_EMPTY_TILES[y][x])).toBe(true)
        expect(UKOGNOFY_NPC_POS).toEqual({ x: 7, y: 7 }) // l'Orfèvre se tient dans l'ancien bloc et bloque sa case comme tout PNJ
    })
    it("câblage : la carte change de décor et le déplacement lit le bloc libéré, seulement une fois Ukognofy capturé", () => {
        const mv = read("src/app/gamebook/yellow/MapView.tsx")
        expect(mv).toContain("(map.id === UKOGNOFY_CHAMBER_MAP && getPlayer().defeatedTrainers.includes(UKOGNOFY_CAUGHT_MARKER))")
        expect(read("src/lib/gamebook/yellow/store/gameStore.ts")).toContain("const moveMap = map.id === UKOGNOFY_CHAMBER_MAP && isTrainerDefeated(UKOGNOFY_CAUGHT_MARKER) ? { ...map, tiles: UKOGNOFY_CHAMBER_EMPTY_TILES } : map")
    })
})

describe("le Gardien de la Grotte (dresseur de geckos) annonce l'Orfèvre", () => {
    it("vaincu, il livre la rumeur une fois Ukognofy capturé, tant que les 6 Shiny Balls ne sont pas gagnées", () => {
        expect(pnj5VictoryLines(false, false)).toEqual(PNJ5_VICTORY_LINES)
        expect(pnj5VictoryLines(true, false)).toEqual([...PNJ5_VICTORY_LINES, ...PNJ5_ORFEVRE_LINES])
        expect(pnj5VictoryLines(true, true)).toEqual(PNJ5_VICTORY_LINES)
        const text = PNJ5_ORFEVRE_LINES.join(" ")
        expect(text).toContain("L'ORFÈVRE")
        expect(text).toContain("SHINY BALL")
        expect(text).toContain("entre 21 h et 3 h") // = isUkognofyNight
        expect(text).toContain("niveau 100")
        expect(text).toContain("Un seul combat par jour") // le compteur de l'Orfèvre se remet à zéro à minuit
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("lines: pnj5VictoryLines(isTrainerDefeated(UKOGNOFY_CAUGHT_MARKER), orfevreDone(isTrainerDefeated))")
    })
})
