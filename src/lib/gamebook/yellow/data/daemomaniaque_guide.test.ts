import { describe, it, expect } from "vitest"
import { captureGuide, runSpawnableSpecies } from "./encounters"

// GUIDE DU DAEMOMANIAQUE — doit refléter le RUNTIME (rollWildEncounter), qui retombe sur ZONES pour toute carte
// non re-mixée (NGPLUS/RUN3 n'en overrident que 5 sur 11) + applique en run 2 le swap légendaire (goshendofy→ukognos)
// et le filtre mottoche de la grille. Régression historique : le guide ne lisait QUE NGPLUS_ZONES/RUN3_ZONES → il
// déclarait à tort « ne se croise pas dans cette run » pour ukognos, la Plage, la Grotte du Nexus, la Maison Hantée…
const hasHH = (g: { where: string[] }) => g.where.some((w) => w.includes("Hautes Herbes"))

describe("Guide Daemomaniaque — fallback ZONES + modificateurs de grille run-2", () => {
    it("ukognos : légendaire de la grille en RUN 2 (le bug fondateur), introuvable en run 1", () => {
        const r2 = captureGuide("ukognos", 2)
        expect(r2.where.length).toBeGreaterThan(0)
        expect(hasHH(r2)).toBe(true)          // rôde aux Hautes Herbes en run 2
        expect(r2.note).toBeNull()            // plus de « ne se croise pas »
        const r1 = captureGuide("ukognos", 1)
        expect(r1.where.length).toBe(0)       // run 1 : le légendaire est goshendofy, pas ukognos
        expect(r1.note).toMatch(/ne se croise pas/)
    })

    it("goshendofy : grille en run 1, mais REMPLACÉ par ukognos en run 2 (donc absent du guide run 2)", () => {
        expect(hasHH(captureGuide("goshendofy", 1))).toBe(true)
        expect(hasHH(captureGuide("goshendofy", 2))).toBe(false) // swappé → plus aux Hautes Herbes en run 2
    })

    it("Plage : sepulcru redevient localisable en run 2 ET run 3 (fallback ZONES)", () => {
        expect(captureGuide("sepulcru", 2).where.length).toBeGreaterThan(0)
        expect(captureGuide("sepulcru", 3).where.length).toBeGreaterThan(0)
    })

    it("Grotte du Nexus B2F : une création (goatiny) est localisable en run 2 et run 3", () => {
        expect(captureGuide("goatiny", 2).where.length).toBeGreaterThan(0)
        expect(captureGuide("goatiny", 3).where.length).toBeGreaterThan(0)
    })

    it("mottoche : présent aux Hautes Herbes en run 1, RETIRÉ de la grille en run 2 (exclusif Grotte)", () => {
        expect(hasHH(captureGuide("mottoche", 1))).toBe(true)
        expect(hasHH(captureGuide("mottoche", 2))).toBe(false)   // filtré du carré SOL/ROCHE en run 2
        expect(captureGuide("mottoche", 2).where.length).toBeGreaterThan(0) // mais toujours capturable (Grotte run 2)
    })

    it("runSpawnableSpecies(2) : contient ukognos (swap), pas goshendofy", () => {
        const set = runSpawnableSpecies(2)
        expect(set.has("ukognos")).toBe(true)
        expect(set.has("goshendofy")).toBe(false)
    })

    it("rattrapage post-Ligue : Otama introuvable en run 1 SANS champion, capturable une fois CHAMPION", () => {
        const notChamp = captureGuide("otama", 1, false, false)
        expect(notChamp.where.length).toBe(0)
        expect(notChamp.note).toMatch(/ne se croise pas/)
        const champ = captureGuide("otama", 1, false, true)     // player.isChampion
        expect(champ.where.length).toBeGreaterThan(0)
        expect(hasHH(champ)).toBe(true)                          // Hautes Herbes carré EAU/COMBAT
        expect(champ.note).toBeNull()
    })

    it("rattrapage post-Ligue : Wistree gagne le rôdeur Grotte une fois Champion (sans perdre son spot B1F)", () => {
        const champ = captureGuide("wistree", 1, false, true)
        expect(champ.where.some((w) => w.includes("Grotte") && w.includes("post-Ligue"))).toBe(true)
    })

    it("le rattrapage NE s'applique PAS en run 2/3 (Otama y a ses propres zones ou reste absent)", () => {
        // champion=true mais run≠1 → pas d'injection de rattrapage LIVE
        expect(captureGuide("otama", 2, false, true).where.every((w) => !w.includes("post-Ligue"))).toBe(true)
    })
})
