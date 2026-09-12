import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { HOUSE_FUSION_SLUGS, houseFusionSpritePath, fusionSpritePath, fusionSlug } from "./fusionSprite"
import { buildPlatineAceTeam, disposeFusionLeagueTeam } from "./fusionLeague"
import { getSpecies } from "./species"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// POURQUOI LES SPRITES D'ACE NE S'AFFICHAIENT PAS
//
// `fusionSpritePath()` FABRIQUE un chemin — il ne dit pas si le fichier existe. Les équipes curées faisaient
// `p.sprite ?? fusionSpritePath(p.name)`, donc TOUJOURS une valeur, ce qui court-circuitait la suite de la
// chaîne de buildFusion : `opts.sprite ?? sprite GÉNÉRÉ ?? placeholder`. Une fusion sans PNG maison pointait
// donc vers une image inexistante, et le sprite généré (Vercel Blob) — pourtant demandé à l'entrée de la
// Ligue, et parfois déjà prêt — n'était JAMAIS consulté. Les cinq chimères d'ACE restaient en composite.
//
// Ce fichier relit le DISQUE : la liste ne peut plus dériver en silence.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

const DIR = path.join(process.cwd(), "public", "yellow", "sprites", "dex", "fusion")
const onDisk = new Set(
    fs.readdirSync(DIR).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, "")),
)

describe("sprites maison de fusion — la liste colle au disque", () => {
    it("chaque slug déclaré a bien son PNG (sinon on repointerait vers le vide)", () => {
        const fantomes = [...HOUSE_FUSION_SLUGS].filter((s) => !onDisk.has(s))
        expect(fantomes, `déclarés mais absents du disque : ${fantomes.join(", ")}`).toEqual([])
    })

    it("chaque PNG présent est déclaré (sinon un sprite dessiné serait ignoré en silence)", () => {
        const oublies = [...onDisk].filter((s) => !HOUSE_FUSION_SLUGS.has(s))
        expect(oublies, `sur le disque mais pas déclarés — ajoute-les à HOUSE_FUSION_SLUGS : ${oublies.join(", ")}`).toEqual([])
    })

    it("houseFusionSpritePath ne rend un chemin que si le fichier existe", () => {
        expect(houseFusionSpritePath("Ukognofy")).toBe(fusionSpritePath("Ukognofy"))
        expect(houseFusionSpritePath("Voltombre")).toBeUndefined()
        expect(houseFusionSpritePath("Chimère Inexistante")).toBeUndefined()
    })

    it("les accents sont normalisés des deux côtés (Gékaucké → gekaucke)", () => {
        expect(fusionSlug("Gékaucké")).toBe("gekaucke")
        expect(HOUSE_FUSION_SLUGS.has(fusionSlug("Gékaucké"))).toBe(onDisk.has("gekaucke"))
    })
})

describe("équipe d'ACE — aucune chimère ne pointe vers une image inexistante", () => {
    it("soit un PNG maison RÉEL, soit le repli (qui laisse passer le sprite généré)", () => {
        const team = buildPlatineAceTeam()
        try {
            for (const f of team) {
                const sp = getSpecies(f.speciesId)!
                const m = sp.sprite.match(/\/dex\/fusion\/([a-z0-9]+)\.png$/)
                if (m) {
                    // Un chemin de sprite maison n'est acceptable QUE si le fichier est la.
                    expect(onDisk.has(m[1]), `${sp.name} pointe vers ${sp.sprite}, qui n'existe pas`).toBe(true)
                }
            }
        } finally { disposeFusionLeagueTeam(team) }
    })

    it("Ukognofy garde son sprite maison — le correctif ne l'a pas emporté au passage", () => {
        const team = buildPlatineAceTeam()
        try {
            const u = team.find((f) => getSpecies(f.speciesId)?.name === "Ukognofy")!
            expect(getSpecies(u.speciesId)!.sprite).toContain("ukognofy.png")
        } finally { disposeFusionLeagueTeam(team) }
    })
})
