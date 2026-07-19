// src/lib/gamebook/yellow/score/runScore.ts
//
// Nexus Jaune Éclair — RUN 2 (New Game+) : SCORES relus en direct à chaque ouverture du panneau
// menu (« 🏅 Scores run 2 »). Pur, React-free.
//
//   Stats brutes affichées (hors note) : temps de jeu (playtimeMs), énergie consommée, pas.
//   ★ SCORE GLOBAL /1000 = note de synthèse (↑ mieux) = Σ de 3 facteurs normalisés [0,1] × poids :
//        🏆 % de victoire   = victoires / (victoires + défaites)          × 500
//        📖 Pokédex         = espèces capturées / total dex (run 2)        × 400
//        💪 Σ niveaux équipe = Σniveaux / 600                              × 100
//      → total = 1000 (chaque facteur borné [0,1] AVANT pondération). PERFORMANCE pure : la frugalité (énergie)
//        et le nombre de pas ont été RETIRÉS de la note (ils restent affichés en info brute). « Temps réel » abandonné.

import { getPlayer, getStats } from "../store/playerStore"
import { computeGrade, leagueRepsFactor, type ScoreFactor } from "./runScoreCompute"
import { badgeInputFromSave, evaluateBadges, BADGES } from "../data/run1Badges"
import { getPokedex } from "../store/pokedexStore"
import { run3Score } from "../data/run3Score"

export type { ScoreFactor } // ré-exporté : les imports existants (RunScoreboardPanel…) continuent de marcher

export interface RunScores {
    playtimeMs: number       // #2 temps de jeu actif cumulé          (↓ mieux)
    energyConsumed: number   // #3 énergie consommée = reps utilisés sur TOUT le run 2 (rétroactif, depuis le début)
    steps: number            // #4 nombre de pas                       (↓ mieux)
    grade: number            // #5 NOTE GLOBALE /1000 COURANTE          (↑ mieux)
    leagueReps: number       // #6 reps dépensés en COMBAT DE LIGUE (nouveau compteur → NON rétroactif : 0 pour qui a déjà entamé la Ligue)
    bestGrade: number        // MEILLEUR grade /1000 atteint pendant le run (pic — la note n'est pas monotone). Montré au recap de fin de run 2.
    factors: ScoreFactor[]   // détail des composantes notées de la note globale (run 2 = 3 axes de performance)
}

export function computeRunScores(): RunScores {
    const p = getPlayer()
    const stats = getStats()
    // Pokédex du SCORE = captures du RUN COURANT uniquement (caughtThisRun), PAS le Pokédex global cumulatif
    //   (qui inclut le run 1) → un classement run 2 ne doit compter que ce qu'on a capturé EN run 2.
    const caught = p.caughtThisRun
    const teamLevels = p.team.reduce((s, m) => s + m.level, 0)
    // La note /1000 est calculée par le module PUR (partagé avec le serveur) à partir des entrées brutes.
    const { grade, factors } = computeGrade({
        wins: stats.wins, teamKos: stats.teamKos, caught, teamLevels,
        energyConsumed: stats.energySpent, steps: stats.steps,
    })
    // bestGrade = max(record persisté, grade courant) → toujours cohérent même si le pic n'a pas encore été échantillonné.
    return {
        playtimeMs: p.playtimeMs, energyConsumed: stats.energySpent, steps: stats.steps, grade,
        leagueReps: stats.leagueEnergySpent, bestGrade: Math.max(stats.run2BestGrade, grade), factors,
    }
}

/** Facteurs envoyés au LEADERBOARD partagé : les 3 axes notés (/1000) + 1 ligne INFO hors-note = le volet
 *  « reps dépensés en Ligue ». L'info-ligne porte `max: 0` → le panneau du classement la rend en clair
 *  (valeur brute, sans barre /1000) au lieu d'une composante de la note. Ainsi chaque joueur voit AUSSI ce volet
 *  chez les autres, sans fausser la note globale. (Le total reps run 2 reste visible en stat brute du panneau.) */
export function leaderboardFactors(sc: RunScores): ScoreFactor[] {
    return [...sc.factors, leagueRepsFactor(sc.leagueReps)]
}

/** REJEU (« run bis ») — score de la BULLE courante (le monde ACTIF est la bulle) selon le run rejoué, pour le FIGER
 *  au classement à la sortie. run3 = Σ niveaux vaincus ; run2 = note /1000 PERFORMANCE (+ volet Ligue) ; run1 = Σ
 *  points de BADGES (run-scopé sur caughtThisRun). Le run est passé explicitement (activeWorld="replay" ne dit pas QUEL run). */
export function computeReplayScore(run: "run1" | "run2" | "run3"): { score: number; factors: ScoreFactor[] } {
    const p = getPlayer()
    const stats = getStats()
    if (run === "run3") return { score: run3Score(p.run3Defeated ?? []), factors: [] }
    if (run === "run1") {
        // RUN 1 = DÉCOUVERTE : score = Σ points de BADGES, run-scopé sur caughtThisRun de la bulle (rejeu).
        const dex = getPokedex()
        const r = evaluateBadges(badgeInputFromSave({ ...(p as object), pokedex: { caught: dex.caught, seen: dex.seen } } as Parameters<typeof badgeInputFromSave>[0], p.caughtThisRun))
        return { score: r.totalPoints, factors: [{ key: "badges", label: "🎖️ Badges", ratio: BADGES.length ? r.earnedCount / BADGES.length : 0, max: 0, points: r.totalPoints, detail: `${r.earnedCount} / ${BADGES.length} badges` }] }
    }
    const caught = p.caughtThisRun
    const teamLevels = p.team.reduce((s, m) => s + m.level, 0)
    const { grade, factors } = computeGrade(
        { wins: stats.wins, teamKos: stats.teamKos, caught, teamLevels, energyConsumed: stats.energySpent, steps: stats.steps },
    )
    return { score: grade, factors: [...factors, leagueRepsFactor(stats.leagueEnergySpent)] }
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
