// src/lib/gamebook/yellow/score/runScoreCompute.ts
//
// Cœur PUR du calcul de la NOTE GLOBALE /1000 du run 2 — SANS aucun store (importable côté serveur).
// Utilisé par :
//   - score/runScore.ts (computeRunScores) : lit l'état du store client puis délègue ici.
//   - app/api/gamebook/yellow/run-scores (GET) : recalcule le score de CHAQUE joueur DEPUIS sa save (pull),
//     pour que le classement soit peuplé sans attendre qu'un joueur déclenche un POST.
//
// La note RUN 2 = Σ de 3 facteurs normalisés [0,1] × poids (somme 1000) :
//   🏆 % victoire ×500 · 📖 Pokédex ×400 · 💪 Σ niveaux ×100.
//   L'ÉNERGIE (frugalité) et le « nombre de pas » ont été RETIRÉS du run 2 : il récompense la PERFORMANCE pure
//   (gagner + capturer + monter en niveau), pas la gestion de ressources. Le RUN 1 utilise désormais les BADGES
//   (hauts faits, cf. data/run1Badges) et n'appelle plus ce module — la branche `run1` ci-dessous est conservée
//   par prudence mais n'est plus câblée.

import { visibleDexSpecies } from "../data/species"

// Références de normalisation (les « max » de chaque jauge) — tunables en un chiffre.
export const ENERGY_BUDGET = 10000  // énergie offerte au départ du run 2 (NGPLUS_START_ENERGY)
export const LEVEL_MAX = 600        // Σ niveaux « plein » = 6 × 100
export const STEP_MAX = 30000       // au-delà → 0 pt sur le facteur « peu de pas »

// Poids des 3 facteurs de la note /1000 du RUN 2 (somme = 1000). Le run 2 récompense la PERFORMANCE :
// gagner (×500) prime, puis compléter le Pokédex (×400), puis monter son équipe (×100). Frugalité & pas RETIRÉS.
const W_WINRATE = 500
const W_SPECIES = 400
const W_LEVELS = 100

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

// RUN 1 : la FRUGALITÉ est retirée (l'énergie vient du vrai sport → affichée à part, pas notée). Ses 200 pts sont
//   reventilés → 4 facteurs (somme 1000). Le run 1 est plus long → plafond de pas plus grand.
const RUN1_STEP_MAX = 60000
const W1_WINRATE = 300, W1_SPECIES = 250, W1_LEVELS = 200, W1_STEPS = 250

/** Note /1000 + détail des facteurs, à partir d'entrées brutes. Pur (aucun store).
 *  `opts.run1` : RUN 1 → pas de frugalité (poids 300/250/200/250, pas /60000, dex = roster run 1). Défaut = run 2. */
export function computeGrade(inp: GradeInputs, opts?: { run1?: boolean }): { grade: number; factors: ScoreFactor[] } {
    const run1 = opts?.run1 ?? false
    const stepMax = run1 ? RUN1_STEP_MAX : STEP_MAX
    // 🏆 % de victoire : victoires décisives / (victoires + défaites d'équipe). 100% si jamais mis KO.
    const decisive = inp.wins + inp.teamKos
    const winRate = decisive > 0 ? inp.wins / decisive : 0

    // 📖 % de complétion du Pokédex. run 2 = tout révélé (~144) ; run 1 = roster run 1 uniquement (isRun2=false).
    const dexTotal = visibleDexSpecies(inp.caught, true, !run1).length
    const distinctCaught = new Set(inp.caught).size
    const speciesPct = dexTotal > 0 ? clamp01(distinctCaught / dexTotal) : 0

    // 💪 somme des niveaux de l'équipe (sur 600 = 6 × 100).
    const levelsPct = clamp01(inp.teamLevels / LEVEL_MAX)
    // 👣 peu de pas.
    const stepsPct = clamp01(1 - inp.steps / stepMax)

    const [wWin, wSpe, wLvl] = run1 ? [W1_WINRATE, W1_SPECIES, W1_LEVELS] : [W_WINRATE, W_SPECIES, W_LEVELS]
    const factors: ScoreFactor[] = [
        { key: "winrate", label: "🏆 % de victoire", ratio: winRate, max: wWin, points: Math.round(winRate * wWin), detail: `${inp.wins} victoires / ${decisive} combats décisifs` },
        { key: "species", label: "📖 Pokédex", ratio: speciesPct, max: wSpe, points: Math.round(speciesPct * wSpe), detail: `${distinctCaught} / ${dexTotal} espèces` },
        { key: "levels", label: "💪 Niveaux équipe", ratio: levelsPct, max: wLvl, points: Math.round(levelsPct * wLvl), detail: `Σ ${inp.teamLevels} / ${LEVEL_MAX}` },
    ]
    // ⚡ frugalité : RETIRÉE du run 2 (l'énergie ne note plus rien — elle reste affichée en info brute dans le
    //    panneau). L'énergie consommée est ignorée par la note. (Historiquement un facteur ×250 ; supprimé.)
    // 👣 peu de pas : SEULEMENT en run 1 (RETIRÉ du run 2 — métrique non pertinente).
    if (run1) {
        factors.push({ key: "steps", label: "👣 Peu de pas", ratio: stepsPct, max: W1_STEPS, points: Math.round(stepsPct * W1_STEPS), detail: `${inp.steps.toLocaleString("fr-FR")} / ${stepMax.toLocaleString("fr-FR")} pas — moins = mieux` })
    }
    return { grade: factors.reduce((s, f) => s + f.points, 0), factors }
}

/** Poids COURANTS des 3 facteurs notés du run 2 — exposés pour re-noter un score FIGÉ (fallback table) posté sous
 *  une ANCIENNE formule à partir de ses ratios stockés (le ratio [0,1] d'un facteur est indépendant de la formule). */
export const RUN2_WEIGHTS: Record<string, number> = { winrate: W_WINRATE, species: W_SPECIES, levels: W_LEVELS }

/** Re-note un score run 2 FIGÉ depuis ses facteurs stockés {key, ratio} sous les poids COURANTS → frozen et live
 *  sont comparés sur la MÊME échelle (les facteurs périmés « frugality »/« steps » sont ignorés). null si inexploitable. */
export function regradeRun2FromFactors(factors: unknown): number | null {
    if (!Array.isArray(factors)) return null
    let sum = 0, seen = 0
    for (const f of factors) {
        if (!f || typeof f !== "object") continue
        const key = (f as { key?: unknown }).key
        const ratio = (f as { ratio?: unknown }).ratio
        if (typeof key === "string" && key in RUN2_WEIGHTS && typeof ratio === "number" && isFinite(ratio)) {
            sum += clamp01(ratio) * RUN2_WEIGHTS[key]; seen++
        }
    }
    return seen > 0 ? Math.round(sum) : null
}

/** Ligne INFO (hors note /1000) « 🏆 Reps en Ligue » (#6) — max:0 = rendue sans barre par les panneaux. */
export function leagueRepsFactor(leagueReps: number): ScoreFactor {
    return { key: "info:league_reps", label: "🏆 Reps en Ligue", ratio: 0, max: 0, points: leagueReps, detail: `${leagueReps.toLocaleString("fr-FR")} reps dépensés en combats de Ligue` }
}

/** Ligne INFO (hors note) « ⚡ Énergie consommée » — pour le run 1 (frugalité retirée, énergie affichée à part). */
export function energyInfoFactor(energyConsumed: number): ScoreFactor {
    return { key: "info:energy", label: "⚡ Énergie consommée", ratio: 0, max: 0, points: energyConsumed, detail: `${energyConsumed.toLocaleString("fr-FR")} énergie consommée (info, hors note)` }
}
