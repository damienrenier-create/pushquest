import { describe, it, expect } from "vitest"
import { fusionSlug, fusionSpritePath, MISSINGNO_SPRITE } from "./fusionSprite"
import { officialFusionForParents } from "./officialFusions"
import { buildFusion, disposeFusion } from "./fusionMon"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"

describe("fusionSlug — nom → slug de fichier (accents retirés)", () => {
    it("normalise minuscules + accents", () => {
        expect(fusionSlug("Panthyéti")).toBe("panthyeti")
        expect(fusionSlug("Mégasylve")).toBe("megasylve")
        expect(fusionSlug("Maîtrelmin")).toBe("maitrelmin")
        expect(fusionSlug("Nécrozeus")).toBe("necrozeus")
        expect(fusionSlug("Vipécan")).toBe("vipecan")
        expect(fusionSpritePath("Cryoviathan")).toBe("/yellow/sprites/dex/fusion/cryoviathan.png")
    })
})

describe("officialFusionForParents — registre des fusions officielles", () => {
    it("reconnaît une fusion de Ligue (ordre indifférent) → nom + sprite dédié", () => {
        const ab = officialFusionForParents("morrow", "orcaline")
        expect(ab).toEqual({ name: "Morcaline", sprite: "/yellow/sprites/dex/fusion/morcaline.png" })
        expect(officialFusionForParents("orcaline", "morrow")).toEqual(ab) // ordre indifférent
    })
    it("reconnaît le boss (Ukognofy) et une fusion de base (Mottelave)", () => {
        expect(officialFusionForParents("goshendofy", "ukognos")?.name).toBe("Ukognofy")
        expect(officialFusionForParents("mottoche", "lavapetit")?.name).toBe("Mottelave")
    })
    it("reconnaît l'épreuve (Tonyront)", () => {
        expect(officialFusionForParents("tonytony", "calderont")?.name).toBe("Tonyront")
    })
    it("paire NON officielle → null", () => {
        expect(officialFusionForParents("plumiot", "feuillichot")).toBeNull()
    })
})

describe("buildFusion — reconnaissance côté JOUEUR", () => {
    it("recréer une fusion officielle (Morrow+Orcaline) → nom + sprite OFFICIELS, stats calculées", () => {
        const f = buildFusion(createMonInstance("morrow", 50), createMonInstance("orcaline", 50))
        try {
            const sp = getSpecies(f.speciesId)!
            expect(sp.name).toBe("Morcaline")
            expect(sp.sprite).toBe("/yellow/sprites/dex/fusion/morcaline.png")
            expect(f.instance.frozenStats).toBeDefined() // stats bien calculées depuis les Daemons du joueur
        } finally { disposeFusion(f.speciesId) }
    })
    it("combo NON officiel → sprite MissingNo (jamais le sprite d'un parent) + nom mot-valise", () => {
        const f = buildFusion(createMonInstance("plumiot", 50), createMonInstance("feuillichot", 50))
        try {
            const sp = getSpecies(f.speciesId)!
            expect(sp.sprite).toBe(MISSINGNO_SPRITE)
            expect(sp.name).toContain("-") // portmanteau auto
        } finally { disposeFusion(f.speciesId) }
    })
    it("les fusions CURÉES (opts fournis) ne passent PAS par la reconnaissance", () => {
        // opts.name + opts.sprite explicites → utilisés tels quels
        const f = buildFusion(createMonInstance("morrow", 50), createMonInstance("orcaline", 50), { name: "TestForcé", sprite: "/x.png" })
        try {
            const sp = getSpecies(f.speciesId)!
            expect(sp.name).toBe("TestForcé")
            expect(sp.sprite).toBe("/x.png")
        } finally { disposeFusion(f.speciesId) }
    })
})
