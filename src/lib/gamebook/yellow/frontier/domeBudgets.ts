// src/lib/gamebook/yellow/frontier/domeBudgets.ts
//
// DÔME — SYSTÈME D'ESCALADE : budgets par TIER (Bronze→Maître) + montée intra-bracket + déblocage par titres.
// PUR (data + fonctions), aucune dépendance UI/save. Cf. artifact « Le Dôme ». Le câblage (génération d'équipe
// scalée, EV/Saiyan des ennemis, UI de sélection de tier) se fait EN AVAL — ce fichier est la source de vérité.

import type { DomeTier } from "./domeTypes"
import { DOME_TIERS } from "./domeTypes"
import type { AiLevel } from "../battle/ai"

export interface DomeTierBudget {
    tier: DomeTier
    level: number               // niveau de combat des Daemons
    bstBand: [number, number]   // bande de BST cible (indicatif ; le générateur utilise `streak`)
    evPerMon: number            // budget EV par Daemon (0..510)
    saiyanPerMon: number        // points Saiyan par Daemon
    aiLevel: AiLevel            // plancher de compétence de l'IA
    streak: number              // difficulté passée au générateur (→ bande via bstBandForStreak)
    unlockChampionships: number // nb de titres requis pour débloquer ce tier
}

/** Table des tiers (pente douce mais nette). EV plafonné à 510 (EV_TOTAL_CAP). */
export const DOME_BUDGETS: Record<DomeTier, DomeTierBudget> = {
    BRONZE:  { tier: "BRONZE",  level: 40,  bstBand: [300, 415], evPerMon: 0,   saiyanPerMon: 0,  aiLevel: "wild",    streak: 4,  unlockChampionships: 0 },
    ARGENT:  { tier: "ARGENT",  level: 52,  bstBand: [360, 435], evPerMon: 128, saiyanPerMon: 6,  aiLevel: "trainer", streak: 9,  unlockChampionships: 1 },
    OR:      { tier: "OR",      level: 68,  bstBand: [410, 465], evPerMon: 252, saiyanPerMon: 14, aiLevel: "ace",     streak: 16, unlockChampionships: 3 },
    DIAMANT: { tier: "DIAMANT", level: 85,  bstBand: [445, 500], evPerMon: 384, saiyanPerMon: 24, aiLevel: "hof",     streak: 24, unlockChampionships: 6 },
    MAITRE:  { tier: "MAITRE",  level: 100, bstBand: [475, 540], evPerMon: 510, saiyanPerMon: 36, aiLevel: "hof",     streak: 30, unlockChampionships: 10 },
}

/** Titre décerné à la victoire d'un tournoi de ce tier (palmarès). */
export const DOME_TITLES: Record<DomeTier, string> = {
    BRONZE: "🥉 Bronze", ARGENT: "🥈 Argent", OR: "🥇 Or", DIAMANT: "💎 Diamant", MAITRE: "👑 Maître",
}

/** Tier MAXIMUM débloqué selon le nombre de titres déjà gagnés (domeChampionships). */
export function maxUnlockedTier(championships: number): DomeTier {
    let best: DomeTier = "BRONZE"
    for (const t of DOME_TIERS) if (championships >= DOME_BUDGETS[t].unlockChampionships) best = t
    return best
}

const AI_ORDER: readonly AiLevel[] = ["wild", "trainer", "ace", "hof"] as const
function bumpAi(a: AiLevel): AiLevel { return AI_ORDER[Math.min(AI_ORDER.length - 1, AI_ORDER.indexOf(a) + 1)] }

/** Montée INTRA-bracket : durcit l'adversaire du joueur selon le round atteint (0=quart, 1=demi, 2=finale).
 *  Additif au budget du tier ; la finale relève aussi l'IA d'un cran. Appliqué au SEUL adversaire du joueur. */
export function roundBudget(base: DomeTierBudget, round: number): DomeTierBudget {
    if (round <= 0) return base
    const evBump = round === 1 ? 48 : 96
    const saiyanBump = round === 1 ? 4 : 9
    const streakBump = round === 1 ? 3 : 6
    const levelBump = round === 1 ? 1 : 3
    return {
        ...base,
        evPerMon: Math.min(510, base.evPerMon + evBump),
        saiyanPerMon: base.saiyanPerMon + saiyanBump,
        streak: base.streak + streakBump,
        level: Math.min(100, base.level + levelBump),
        aiLevel: round >= 2 ? bumpAi(base.aiLevel) : base.aiLevel,
    }
}
