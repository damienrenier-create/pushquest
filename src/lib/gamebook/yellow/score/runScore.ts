// src/lib/gamebook/yellow/score/runScore.ts
//
// Nexus Jaune Éclair — RUN 2 (New Game+) : calcul des 5 SCORES, relus en direct à chaque
// ouverture du panneau menu (« 🏅 Scores run 2 »). Pur, React-free.
//   1. Temps réel   = Date.now() − ngplusStartedAt (0 si pas encore posé)   — ↓ mieux
//   2. Temps de jeu = playtimeMs (temps actif cumulé)                        — ↓ mieux
//   3. Frugalité    = borne(6000 − reps, 0, 6000)                            — ↓ mieux
//   4. Maîtrise     = max(0, Σniveaux + 25×espèces + 100×shiny + 200×inédits − 50×défaites) × 0.99^potionsLigue — ↑ mieux
//   5. Pas          = stats.steps                                            — ↓ mieux

import { getPlayer, getStats } from "../store/playerStore"
import { getPokedex } from "../store/pokedexStore"

/** Espèces INÉDITES (exclusives au run 2) : +200 chacune au score de maîtrise si capturées. */
const RARE_SPECIES = ["gekraise", "ukognos", "merorem"] as const

const FRUGALITY_CAP = 6000

export interface RunScores {
    realTimeMs: number   // Date.now() − ngplusStartedAt
    playtimeMs: number   // temps de jeu actif cumulé
    frugality: number    // borne(6000 − reps, 0, 6000)
    mastery: number      // formule pondérée × 0.99^potionsLigue
    steps: number        // stats.steps
}

export function computeRunScores(nowMs = Date.now()): RunScores {
    const p = getPlayer()
    const stats = getStats()
    const caught = getPokedex().caught

    const realTimeMs = p.ngplusStartedAt ? Math.max(0, nowMs - p.ngplusStartedAt) : 0
    const playtimeMs = p.playtimeMs
    const frugality = Math.max(0, Math.min(FRUGALITY_CAP, FRUGALITY_CAP - p.reps))

    // Maîtrise : Σ niveaux équipe + 25×espèces distinctes + 100×shiny d'équipe + 200×inédits − 50×défaites,
    // le tout ×0.99 par potion utilisée en combat de Ligue (malus « no-heal », plancher naturel via la puissance).
    const teamLevels = p.team.reduce((s, m) => s + m.level, 0)
    const distinctCaught = new Set(caught).size
    const shinyInTeam = p.team.filter((m) => m.shiny).length
    const caughtSet = new Set(caught)
    const rareCaught = RARE_SPECIES.filter((id) => caughtSet.has(id)).length
    const base = teamLevels + 25 * distinctCaught + 100 * shinyInTeam + 200 * rareCaught - 50 * stats.teamKos
    const mastery = Math.round(Math.max(0, base) * Math.pow(0.99, p.leaguePotions))

    return { realTimeMs, playtimeMs, frugality, mastery, steps: stats.steps }
}

/** Formate une durée (ms) en m:ss ou h:mm:ss pour l'affichage. */
export function formatDuration(ms: number): string {
    const s = Math.floor(ms / 1000)
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    const pad = (n: number) => String(n).padStart(2, "0")
    return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
