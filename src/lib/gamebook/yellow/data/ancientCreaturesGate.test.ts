import { describe, it, expect } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { isFusionChampion, FUSION_TIER_MARKER } from "./fusionLeague"

// ════════════════════════════════════════════════════════════════════════════════════════════════════════
// GATE DES CRÉATURES ANCIENNES (B2F, `requiresFusionLeague`)
//
// LE BUG (15/10/2026). Les six créatures très anciennes de B2F sont « débloquées après la 1re victoire à la Ligue de
// Fusion ». Le client calculait ce déblocage depuis les marqueurs des BOSS (y_fusion_maitre / y_fusion_miroir)… que
// resetFusionLeagueProgress() EFFACE quand le palier suivant démarre. Résultat vérifié en base : les deux seuls
// champions (Jacanon, Mools — bronze, argent ET or bouclés) avaient le gate FERMÉ. Ces six espèces ne poppaient pour
// personne. La source durable, c'est isFusionChampion (bronze bouclé), jamais effacée.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════

describe("isFusionChampion est bien la source durable", () => {
    it("bronze bouclé → champion, quels que soient les marqueurs de boss", () => {
        const only = (ids: string[]) => (m: string) => ids.includes(m)
        expect(isFusionChampion(only([FUSION_TIER_MARKER.bronze]))).toBe(true)
        expect(isFusionChampion(only([FUSION_TIER_MARKER.bronze, FUSION_TIER_MARKER.argent, FUSION_TIER_MARKER.or]))).toBe(true)
        expect(isFusionChampion(only(["y_fusion_maitre"]))).toBe(false) // un marqueur de boss seul ne fait pas un champion
        expect(isFusionChampion(only([]))).toBe(false)
    })
})

describe("garde-fou structurel : le client ne lit plus les marqueurs de boss pour ce gate", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/gamebook/yellow/store/gameStore.ts"), "utf8")
    const ligne = src.split("\n").find((l) => l.includes("fusionLeagueWon:")) ?? ""

    it("⚠️ fusionLeagueWon passe par isFusionChampion", () => {
        expect(ligne).toContain("isFusionChampion(")
    })

    it("⚠️ …et plus par y_fusion_maitre / y_fusion_miroir (effacés par resetFusionLeagueProgress)", () => {
        expect(ligne).not.toContain("y_fusion_maitre")
        expect(ligne).not.toContain("y_fusion_miroir")
    })
})
