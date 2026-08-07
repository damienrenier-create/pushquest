import { describe, it, expect } from "vitest"
import { hydratePlayer, getPlayer, addCustomDaemon, setCustomDaemonSprites } from "./playerStore"
import { getSpecies } from "../data/species"
import { customLineageBaseId, suggestLearnset, type CustomSpec } from "../create/customSpecies"

// SPRITES GÉNÉRÉS (Gemini au démarrage effectif du run 2) : setCustomDaemonSprites attache les URLs à la lignée
// custom persistée, RÉ-ENREGISTRE l'espèce (le combat/Pokédex montrent enfin le vrai visage) et persiste. Le Daemon
// reste MISSINGNO tant que rien n'est généré.
const spec = (): CustomSpec => ({
    name: "Testouille", da: "une bestiole de test aquatique", character: "curieuse",
    stages: 3, bloomer: "mid", curve: "linear", role: "equilibre",
    finalTypes: ["EAU"],
    finalStats: { hp: 90, atk: 70, def: 85, spe: 100, spc: 90 },
    learnset: suggestLearnset(["EAU"]),
})
const reset = () => hydratePlayer({ reps: 0, repsCap: 5000, repsBankedTotal: 0, defeatedTrainers: [], items: {} })

describe("setCustomDaemonSprites — attache les sprites générés + ré-enregistre l'espèce", () => {
    it("attache les URLs, ré-enregistre (sprite = URL générée) et persiste dans customDaemons", () => {
        reset()
        const owner = "cmtestowner001", sp = spec()
        addCustomDaemon(owner, sp)
        const base = customLineageBaseId({ ownerId: owner, spec: sp })
        expect(getSpecies(`${base}_s1`)?.sprite).toBe("/yellow/sprites/dex/missingno.png") // avant : placeholder
        setCustomDaemonSprites(owner, sp.name, ["https://blob/s1.png", "https://blob/s2.png", "https://blob/s3.png"])
        expect(getSpecies(`${base}_s1`)?.sprite).toBe("https://blob/s1.png")
        expect(getSpecies(`${base}_s3`)?.sprite).toBe("https://blob/s3.png")
        const stored = getPlayer().customDaemons.find((d) => d.ownerId === owner && d.spec.name === sp.name)
        expect(stored?.spec.spriteUrls).toEqual(["https://blob/s1.png", "https://blob/s2.png", "https://blob/s3.png"])
    })

    it("génération partielle : un slot vide ne SUPPRIME pas une URL déjà posée (merge positionnel)", () => {
        reset()
        const owner = "cmtestowner002", sp = spec()
        addCustomDaemon(owner, sp)
        const base = customLineageBaseId({ ownerId: owner, spec: sp })
        setCustomDaemonSprites(owner, sp.name, ["https://blob/a1.png", "", ""]) // 1re passe : seul le stade 1
        setCustomDaemonSprites(owner, sp.name, ["", "https://blob/b2.png", ""]) // 2e passe : ajoute le stade 2
        expect(getSpecies(`${base}_s1`)?.sprite).toBe("https://blob/a1.png") // conservé
        expect(getSpecies(`${base}_s2`)?.sprite).toBe("https://blob/b2.png") // ajouté
        expect(getSpecies(`${base}_s3`)?.sprite).toBe("/yellow/sprites/dex/missingno.png") // toujours en attente
    })

    it("aucune URL non vide → no-op (garde MISSINGNO)", () => {
        reset()
        const owner = "cmtestowner003", sp = spec()
        addCustomDaemon(owner, sp)
        const base = customLineageBaseId({ ownerId: owner, spec: sp })
        setCustomDaemonSprites(owner, sp.name, ["", "", ""])
        expect(getSpecies(`${base}_s1`)?.sprite).toBe("/yellow/sprites/dex/missingno.png")
        expect(getPlayer().customDaemons.find((d) => d.ownerId === owner)?.spec.spriteUrls).toBeUndefined()
    })
})
