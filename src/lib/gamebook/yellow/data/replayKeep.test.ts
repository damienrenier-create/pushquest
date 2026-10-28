import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { replayKeepPlan, retagKept } from "./replayKeep"
import { createMonInstance } from "../battle/factory"

// Sartay, 28/10/2026 : « un joueur peut ramener 1 pokémon par badge de son choix + les shinys capturés ; il les ramène
// tous s'il finit la ligue ».
const mon = (id: string, shiny = false) => ({ ...createMonInstance(id, 30), shiny })
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("sortie d'un rejeu (run 1 ou 3) : ce que le joueur ramène", () => {
    it("1 Daemon au choix par badge ; les shinys reviennent d'office, hors quota", () => {
        const team = [mon("flamarokto"), mon("coccimperatrice"), mon("magnetor", true), mon("archibouh")]
        const pc = [mon("belunode"), mon("ro", true)]
        const plan = replayKeepPlan([...team, ...pc], 5, false)
        expect(plan.auto.map((m) => m.speciesId)).toEqual(["magnetor", "ro"])
        expect(plan.choosable.map((m) => m.speciesId)).toEqual(["flamarokto", "coccimperatrice", "archibouh", "belunode"])
        expect(plan.max).toBe(4) // 5 badges mais seulement 4 Daemons non shiny : on ne peut pas en choisir plus
        expect(replayKeepPlan([...team, ...pc], 2, false).max).toBe(2)
        expect(replayKeepPlan([...team, ...pc], 0, false).max).toBe(0) // aucun badge : seulement les shinys
    })
    it("Ligue battue dans le rejeu : TOUT revient, sans choix", () => {
        const all = [mon("flamarokto"), mon("magnetor", true), mon("belunode")]
        const plan = replayKeepPlan(all, 6, true)
        expect(plan.auto).toHaveLength(3)
        expect(plan.choosable).toHaveLength(0)
        expect(plan.max).toBe(0)
    })
    it("chaque Daemon ramené reçoit un uid unique, distinct de celui de la bulle", () => {
        const kept = retagKept([mon("flamarokto"), mon("magnetor", true)], 1793200000000)
        expect(new Set(kept.map((m) => m.uid)).size).toBe(2)
        expect(kept.every((m) => m.uid.startsWith("bis-1793200000000-"))).toBe(true)
    })
    it("câblage : la sortie du rejeu suit cette règle et les textes l'annoncent", () => {
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("const plan = replayKeepPlan([...p.team, ...p.pc], p.badges.length, p.isChampion)")
        expect(ydc).toContain("doExitReplay(retagKept([...replayKeep.auto, ...chosen], Date.now()))")
        expect(ydc).not.toContain("(+1 si tu bats la Ligue)")
        expect(ydc).not.toContain("1 par badge gagné + 1 si Ligue battue")
        expect(ydc).toContain("plus TOUS tes SHINYS")
    })
})
