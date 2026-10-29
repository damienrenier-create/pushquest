import { describe, it, expect, beforeEach } from "vitest"
import fs from "node:fs"
import path from "node:path"
import {
    queueShinyTransform, currentShinyTransform, finishShinyTransform, resetShinyTransformQueue, subscribeShinyTransform,
    shinyTransformCaption, SHINY_TRANSFORM_MS, SHINY_TRANSFORM_REDUCED_MS, SHINY_TRANSFORM_SKIP_AFTER_MS, type ShinyTransformSource,
} from "./shinyTransform"

// Sartay, 29/10/2026 : « avec l'introduction des Pâtes de Luxe et des Shiny Balls, certains Daemons vont devenir shiny. Je
// voudrais que tu crées une animation léchée pour la transformation ! »
const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8")

describe("transformation chromatique : la file", () => {
    beforeEach(() => resetShinyTransformQueue())
    it("une à la fois, dans l'ordre, et le commentaire d'après se joue à la fin", () => {
        const log: string[] = []
        let pings = 0
        const off = subscribeShinyTransform(() => { pings++ })
        queueShinyTransform({ speciesId: "magnetor", name: "Magnetor", source: "shiny_ball" })
        queueShinyTransform({ speciesId: "ro", name: "Rô", source: "pate_voleur", after: () => log.push("dieu spaghetti") })
        expect(currentShinyTransform()?.name).toBe("Magnetor")
        finishShinyTransform(currentShinyTransform()!.id)
        expect(currentShinyTransform()?.name).toBe("Rô")
        expect(log).toEqual([])
        finishShinyTransform(currentShinyTransform()!.id)
        expect(log).toEqual(["dieu spaghetti"])
        expect(currentShinyTransform()).toBeNull()
        expect(pings).toBeGreaterThanOrEqual(4)
        off()
    })
    it("terminer deux fois (fin naturelle + « Passer ») ne saute pas la suivante", () => {
        queueShinyTransform({ speciesId: "a", name: "A", source: "casino" })
        queueShinyTransform({ speciesId: "b", name: "B", source: "casino" })
        const first = currentShinyTransform()!.id
        finishShinyTransform(first)
        finishShinyTransform(first)
        expect(currentShinyTransform()?.name).toBe("B")
    })
    it("assez longue pour en profiter, passable mais pas par accident, sobre si l'appareil demande moins d'animations", () => {
        expect(SHINY_TRANSFORM_MS).toBeGreaterThanOrEqual(5500)
        expect(SHINY_TRANSFORM_MS).toBeLessThanOrEqual(8000)
        expect(SHINY_TRANSFORM_REDUCED_MS).toBeLessThan(2500)
        expect(SHINY_TRANSFORM_SKIP_AFTER_MS).toBeGreaterThanOrEqual(500)
        const ui = read("src/app/gamebook/yellow/battle/ShinyTransform.tsx")
        expect(ui).toContain("⏩ Passer (B)")
        expect(ui).toContain("if (reduced) {")
        expect(ui).toContain("const TITLE = \"SHINY !\"")
        expect(ui).toContain("const finish = useCallback(() => { if (doneRef.current) return; doneRef.current = true; onDoneRef.current() }, [])")
    })
    it("une phrase par source, sans vocabulaire muscu (les comptes fun la lisent aussi)", () => {
        for (const s of ["pate_luxe", "pate_voleur", "shiny_ball", "casino"] as ShinyTransformSource[]) {
            const line = shinyTransformCaption(s, "Rô")
            expect(line).toContain("Rô")
            expect(line).not.toMatch(/pompe|quota|sueur|reps/i)
        }
    })
})

describe("transformation chromatique : câblage", () => {
    it("Pâte de Luxe / du Voleur : seulement si le Daemon DEVIENT shiny, puis le Dieu Spaghetti commente", () => {
        const ydc = read("src/app/gamebook/yellow/YellowDevClient.tsx")
        expect(ydc).toContain("if (outcome === \"shiny_perfect\" && before && !before.shiny) queueShinyTransform({ speciesId: before.speciesId, name: nm, source: item === PATE_LUXE_VOLEUR_ITEM_ID ? \"pate_voleur\" : \"pate_luxe\", after: comment })")
        expect(ydc).toContain("{!battle && shinyTx && (")
        expect(ydc).toContain("if (!battle && currentShinyTransform()) { e.preventDefault(); return }")
    })
    it("Shiny Ball : seulement un shiny FORGÉ (pas un shiny de naissance), joué après le combat", () => {
        expect(read("src/lib/gamebook/yellow/store/battleStore.ts")).toContain("if (wild.shiny && b.shinyBallCapture) queueShinyTransform({ speciesId: wild.speciesId,")
        expect(read("src/lib/gamebook/yellow/battle/engine.ts")).toContain("if (!isShinyBall || wild.shiny) return")
    })
    it("pilier du casino : la cinématique suit la récompense des 5000", () => {
        expect(read("src/app/gamebook/yellow/LabPanel.tsx")).toContain("if (where) queueShinyTransform({ speciesId: pillar.species, name: pillar.name, source: \"casino\" })")
    })
})
