import { describe, it, expect } from "vitest"
import { VILLE_JAUNE_TIPS, VILLE_JAUNE_TIP_WINDOW_MS, currentVilleJauneTip, currentVilleJauneTipIndex } from "./villeJauneTips"

describe("Panneau d'astuces de la Ville Jaune", () => {
    it("exactement 20 conseils, avec id / titre / texte non vides et UNIQUES", () => {
        expect(VILLE_JAUNE_TIPS).toHaveLength(20)
        for (const t of VILLE_JAUNE_TIPS) {
            expect(t.id.trim()).not.toBe("")
            expect(t.title.trim()).not.toBe("")
            expect(t.text.trim().length).toBeGreaterThan(30)
        }
        expect(new Set(VILLE_JAUNE_TIPS.map((t) => t.id)).size).toBe(20)
        expect(new Set(VILLE_JAUNE_TIPS.map((t) => t.title)).size).toBe(20)
    })

    it("tous les titres portent le préfixe 💡 (distinct des panneaux du parc → aucune collision de clé Calepin)", () => {
        for (const t of VILLE_JAUNE_TIPS) expect(t.title.startsWith("💡 "), t.title).toBe(true)
    })

    it("rotation déterministe : même créneau de 6 h → même conseil (bornes incluses)", () => {
        const base = Math.floor(1_700_000_000_000 / VILLE_JAUNE_TIP_WINDOW_MS) * VILLE_JAUNE_TIP_WINDOW_MS // début de fenêtre
        expect(currentVilleJauneTip(base)).toBe(currentVilleJauneTip(base + VILLE_JAUNE_TIP_WINDOW_MS - 1)) // même fenêtre
        expect(currentVilleJauneTipIndex(base)).toBe(currentVilleJauneTipIndex(base + 1))
    })

    it("le conseil change d'un créneau à l'autre (pas figé) et couvre tout le pool sur la durée", () => {
        const seen = new Set<number>()
        let changes = 0, prev = currentVilleJauneTipIndex(0)
        for (let w = 0; w < 400; w++) {
            const idx = currentVilleJauneTipIndex(w * VILLE_JAUNE_TIP_WINDOW_MS)
            seen.add(idx)
            if (idx !== prev) changes++
            prev = idx
            expect(idx).toBeGreaterThanOrEqual(0)
            expect(idx).toBeLessThan(20)
        }
        expect(seen.size).toBe(20)       // les 20 conseils finissent par sortir
        expect(changes).toBeGreaterThan(200) // ça ne reste pas bloqué sur le même
    })
})
