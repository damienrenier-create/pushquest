// src/lib/gamebook/yellow/score/runScoreCompute.ts
//
// Cœur PUR du calcul de la NOTE GLOBALE /1000 du run 2 — SANS aucun store (importable côté serveur).
// Utilisé par :
//   - score/runScore.ts (computeRunScores) : lit l'état du store client puis délègue ici.
//   - app/api/gamebook/yellow/run-scores (GET) : recalcule le score de CHAQUE joueur DEPUIS sa save (pull),
//     pour que le classement soit peuplé sans attendre qu'un joueur déclenche un POST.
//
// La note = Σ de 5 facteurs normalisés [0,1] × poids (somme 1000) :
//   🏆 % victoire ×250 · 📖 Pokédex ×200 · 💪 Σ niveaux ×150 · ⚡ frugalité ×200 (moins = mieux) · 👣 peu de pas ×200.

import { visibleDexSpecies } from "../data/species"

// Références de normalisation (les « max » de chaque jauge) — tunables en un chiffre.
export const ENERGY_BUDGET = 10000  // énergie offerte au départ du run 2 (NGPLUS_START_ENERGY)
export const LEVEL_MAX = 600        // Σ niveaux « plein » = 6 × 100
export const STEP_MAX = 30000       // au-delà → 0 pt sur le facteur « peu de pas »

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

/** Entrées brutes pour la note (identiques que l'on lise le store client ou une save serveur). */
export interface GradeInputs {
    wins: number
    teamKos: number
    caught: string[]      // ids d'espèces capturées (run 2)
    teamLevels: number    // Σ des niveaux de l'équipe
    energyConsumed: number // stats.energySpent (reps dépensés sur tout le run 2)
    steps: number
}

/** Note /1000 + détail des 5 facteurs, à partir d'entrées brutes. Pur (aucun store). */
export function computeGrade(inp: GradeInputs): { grade: number; factors: ScoreFactor[] } {
    // 🏆 % de victoire : victoires décisives / (victoires + défaites d'équipe). 100% si jamais mis KO.
    const decisive = inp.wins + inp.teamKos
    const winRate = decisive > 0 ? inp.wins / decisive : 0

    // 📖 % de complétion du Pokédex. Dénominateur = dex visible en run 2 (tout révélé → ~144), calculé dynamiquement.
    const dexTotal = visibleDexSpecies(inp.caught, true, true).length
    const distinctCaught = new Set(inp.caught).size
    const speciesPct = dexTotal > 0 ? clamp01(distinctCaught / dexTotal) : 0

    // 💪 somme des niveaux de l'équipe (sur 600 = 6 × 100).
    const levelsPct = clamp01(inp.teamLevels / LEVEL_MAX)

    // ⚡ frugalité : moins on consomme d'énergie (sur les 10000 offertes), mieux c'est.
    const frugalityPct = clamp01(1 - inp.energyConsumed / ENERGY_BUDGET)

    // 👣 peu de pas : plus on est proche de 0 (max 30000), mieux c'est.
    const stepsPct = clamp01(1 - inp.steps / STEP_MAX)

    const factors: ScoreFactor[] = [
        { key: "winrate", label: "🏆 % de victoire", ratio: winRate, max: W_WINRATE, points: Math.round(winRate * W_WINRATE), detail: `${inp.wins} victoires / ${decisive} combats décisifs` },
        { key: "species", label: "📖 Pokédex", ratio: speciesPct, max: W_SPECIES, points: Math.round(speciesPct * W_SPECIES), detail: `${distinctCaught} / ${dexTotal} espèces` },
        { key: "levels", label: "💪 Niveaux équipe", ratio: levelsPct, max: W_LEVELS, points: Math.round(levelsPct * W_LEVELS), detail: `Σ ${inp.teamLevels} / ${LEVEL_MAX}` },
        { key: "frugality", label: "⚡ Frugalité", ratio: frugalityPct, max: W_FRUGALITY, points: Math.round(frugalityPct * W_FRUGALITY), detail: `${inp.energyConsumed.toLocaleString("fr-FR")} / ${ENERGY_BUDGET.toLocaleString("fr-FR")} énergie consommée — moins = mieux` },
        { key: "steps", label: "👣 Peu de pas", ratio: stepsPct, max: W_STEPS, points: Math.round(stepsPct * W_STEPS), detail: `${inp.steps.toLocaleString("fr-FR")} / ${STEP_MAX.toLocaleString("fr-FR")} pas — moins = mieux` },
    ]
    return { grade: factors.reduce((s, f) => s + f.points, 0), factors }
}

/** Ligne INFO (hors note /1000) « 🏆 Reps en Ligue » (#6) — max:0 = rendue sans barre par les panneaux. */
export function leagueRepsFactor(leagueReps: number): ScoreFactor {
    return { key: "info:league_reps", label: "🏆 Reps en Ligue", ratio: 0, max: 0, points: leagueReps, detail: `${leagueReps.toLocaleString("fr-FR")} reps dépensés en combats de Ligue` }
}
