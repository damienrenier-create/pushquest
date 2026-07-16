// src/lib/gamebook/yellow/score/runScore.ts
//
// Nexus Jaune Éclair — RUN 2 (New Game+) : SCORES relus en direct à chaque ouverture du panneau
// menu (« 🏅 Scores run 2 »). Pur, React-free.
//
//   #2 Temps de jeu       = playtimeMs (temps actif cumulé)             — ↓ mieux (stat brute)
//   #3 Énergie consommée  = stats.energySpent                          — ↓ mieux (stat brute)
//   #4 Pas                = stats.steps                                — ↓ mieux (stat brute)
//   #5 ★ SCORE GLOBAL /1000 = note de synthèse (↑ mieux) = Σ de 5 facteurs normalisés [0,1] × poids :
//        🏆 % de victoire   = victoires / (victoires + défaites)          × 250
//        📖 Pokédex         = espèces capturées / total dex (run 2)        × 200
//        💪 Σ niveaux équipe = Σniveaux / 600                              × 150
//        ⚡ frugalité        = 1 − énergie consommée / 10000               × 200   (moins on consomme, mieux c'est)
//        👣 peu de pas       = 1 − pas / 30000                             × 200
//      → total = 1000 (chaque facteur borné [0,1] AVANT pondération).
//   (Le « temps réel » a été abandonné.)

import { getPlayer, getStats } from "../store/playerStore"
import { getPokedex } from "../store/pokedexStore"
import { visibleDexSpecies } from "../data/species"

// Références de normalisation (les « max » de chaque jauge) — tunables en un chiffre.
const ENERGY_BUDGET = 10000  // énergie offerte au départ du run 2 (NGPLUS_START_ENERGY)
const LEVEL_MAX = 600        // Σ niveaux « plein » = 6 × 100
const STEP_MAX = 30000       // au-delà → 0 pt sur le facteur « peu de pas »

// Poids des 5 facteurs de la note /1000 (somme = 1000).
const W_WINRATE = 250
const W_SPECIES = 200
const W_LEVELS = 150
const W_FRUGALITY = 200
const W_STEPS = 200

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x))

/** Une composante de la note globale /1000 (pour l'affichage détaillé). */
export interface ScoreFactor {
    key: string
    label: string
    ratio: number   // 0→1 (avant pondération)
    max: number     // poids max du facteur
    points: number  // contribution arrondie à la note /1000
    detail: string  // ex. « 24 / 144 espèces »
}

export interface RunScores {
    playtimeMs: number       // #2 temps de jeu actif cumulé          (↓ mieux)
    energyConsumed: number   // #3 énergie consommée = reps utilisés sur TOUT le run 2 (rétroactif, depuis le début)
    steps: number            // #4 nombre de pas                       (↓ mieux)
    grade: number            // #5 NOTE GLOBALE /1000                  (↑ mieux)
    leagueReps: number       // #6 reps dépensés en COMBAT DE LIGUE (nouveau compteur → NON rétroactif : 0 pour qui a déjà entamé la Ligue)
    factors: ScoreFactor[]   // détail des 5 composantes de la note globale
}

export function computeRunScores(): RunScores {
    const p = getPlayer()
    const stats = getStats()
    const caught = getPokedex().caught

    const playtimeMs = p.playtimeMs
    const energyConsumed = stats.energySpent
    const steps = stats.steps

    // 🏆 % de victoire : victoires décisives / (victoires + défaites d'équipe). 100% si jamais mis KO.
    const decisive = stats.wins + stats.teamKos
    const winRate = decisive > 0 ? stats.wins / decisive : 0

    // 📖 % de complétion du Pokédex. Dénominateur = dex visible en run 2 (tout est révélé → ~144),
    //    calculé dynamiquement pour s'adapter si des espèces sont ajoutées.
    const dexTotal = visibleDexSpecies(caught, true, true).length
    const distinctCaught = new Set(caught).size
    const speciesPct = dexTotal > 0 ? clamp01(distinctCaught / dexTotal) : 0

    // 💪 somme des niveaux de l'équipe (sur 600 = 6 × 100).
    const teamLevels = p.team.reduce((s, m) => s + m.level, 0)
    const levelsPct = clamp01(teamLevels / LEVEL_MAX)

    // ⚡ frugalité : moins on consomme d'énergie (sur les 10000 offertes), mieux c'est.
    const frugalityPct = clamp01(1 - energyConsumed / ENERGY_BUDGET)

    // 👣 peu de pas : plus on est proche de 0 (max 30000), mieux c'est.
    const stepsPct = clamp01(1 - steps / STEP_MAX)

    const factors: ScoreFactor[] = [
        { key: "winrate", label: "🏆 % de victoire", ratio: winRate, max: W_WINRATE, points: Math.round(winRate * W_WINRATE), detail: `${stats.wins} victoires / ${decisive} combats décisifs` },
        { key: "species", label: "📖 Pokédex", ratio: speciesPct, max: W_SPECIES, points: Math.round(speciesPct * W_SPECIES), detail: `${distinctCaught} / ${dexTotal} espèces` },
        { key: "levels", label: "💪 Niveaux équipe", ratio: levelsPct, max: W_LEVELS, points: Math.round(levelsPct * W_LEVELS), detail: `Σ ${teamLevels} / ${LEVEL_MAX}` },
        { key: "frugality", label: "⚡ Frugalité", ratio: frugalityPct, max: W_FRUGALITY, points: Math.round(frugalityPct * W_FRUGALITY), detail: `${energyConsumed.toLocaleString("fr-FR")} / ${ENERGY_BUDGET.toLocaleString("fr-FR")} énergie consommée` },
        { key: "steps", label: "👣 Peu de pas", ratio: stepsPct, max: W_STEPS, points: Math.round(stepsPct * W_STEPS), detail: `${steps.toLocaleString("fr-FR")} / ${STEP_MAX.toLocaleString("fr-FR")} pas` },
    ]
    const grade = factors.reduce((s, f) => s + f.points, 0)

    return { playtimeMs, energyConsumed, steps, grade, leagueReps: stats.leagueEnergySpent, factors }
}

/** Facteurs envoyés au LEADERBOARD partagé : les 5 axes notés (/1000) + 1 ligne INFO hors-note = le 6e volet
 *  « reps dépensés en Ligue » (#6). L'info-ligne porte `max: 0` → le panneau du classement la rend en clair
 *  (valeur brute, sans barre /1000) au lieu d'une composante de la note. Ainsi chaque joueur voit AUSSI ce volet
 *  chez les autres, sans fausser la note globale. (Le total reps run 2 est déjà visible via l'axe ⚡ Frugalité.) */
export function leaderboardFactors(sc: RunScores): ScoreFactor[] {
    return [
        ...sc.factors,
        {
            key: "info:league_reps",
            label: "🏆 Reps en Ligue",
            ratio: 0,
            max: 0, // 0 = ligne d'info (le panneau la rend sans barre ni « /max »)
            points: sc.leagueReps,
            detail: `${sc.leagueReps.toLocaleString("fr-FR")} reps dépensés en combats de Ligue`,
        },
    ]
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
