// src/lib/gamebook/yellow/frontier/domeBudgets.ts
//
// DÔME — SYSTÈME D'ESCALADE : budgets par TIER (Bronze→Maître) + montée intra-bracket + déblocage par titres.
// PUR (data + fonctions), aucune dépendance UI/save. Cf. artifact « Le Dôme ». Le câblage (génération d'équipe
// scalée, EV/Saiyan des ennemis, UI de sélection de tier) se fait EN AVAL — ce fichier est la source de vérité.

import type { DomeTier } from "./domeTypes"
import { DOME_TIERS } from "./domeTypes"
import type { AiLevel } from "../battle/ai"
import type { StatKey } from "../battle/types"

export interface DomeTierBudget {
    tier: DomeTier
    level: number               // niveau de combat des Daemons
    bstBand: [number, number]   // bande de BST cible (indicatif ; le générateur utilise `streak`) — inutilisé pour un dan (équipe désignée)
    evPerMon: number            // budget EV par Daemon (0..510)
    saiyanPerMon: number        // points Saiyan par Daemon
    aiLevel: AiLevel            // plancher de compétence de l'IA
    streak: number              // difficulté passée au générateur (→ bande via bstBandForStreak)
    unlockChampionships: number // nb de titres requis pour débloquer ce tier
    shiny?: "none" | "half" | "full" // VOIE DU MAÎTRE : proportion de l'équipe adverse en shiny (+10 % toutes stats). Défaut none.
}

/** Table des tiers (pente douce mais nette). EV plafonné à 510 (EV_TOTAL_CAP). */
export const DOME_BUDGETS: Record<DomeTier, DomeTierBudget> = {
    // POST-LIGUE : même le tier le + FACILE démarre au NIVEAU DU MAÎTRE DE LA LIGUE (~50, jamais en dessous) ;
    // le + DUR = Niv 100 + EV (510) & Saiyan MAX (la vraie difficulté endgame, réutilisable pour les salles 2/3).
    BRONZE:  { tier: "BRONZE",  level: 50,  bstBand: [300, 415], evPerMon: 0,   saiyanPerMon: 0,  aiLevel: "wild",    streak: 4,  unlockChampionships: 0 },
    ARGENT:  { tier: "ARGENT",  level: 62,  bstBand: [360, 435], evPerMon: 128, saiyanPerMon: 12, aiLevel: "trainer", streak: 9,  unlockChampionships: 1 },
    OR:      { tier: "OR",      level: 75,  bstBand: [410, 465], evPerMon: 252, saiyanPerMon: 30, aiLevel: "ace",     streak: 16, unlockChampionships: 2 },
    DIAMANT: { tier: "DIAMANT", level: 88,  bstBand: [445, 500], evPerMon: 384, saiyanPerMon: 54, aiLevel: "hof",     streak: 24, unlockChampionships: 3 },
    // PLATINE & MYTHIQUE : deux crans intercalés pour lisser la marche Diamant→Maître (niveau +4 par palier).
    PLATINE:  { tier: "PLATINE",  level: 92, bstBand: [460, 515], evPerMon: 436, saiyanPerMon: 63, aiLevel: "hof", streak: 27, unlockChampionships: 4 },
    MYTHIQUE: { tier: "MYTHIQUE", level: 96, bstBand: [468, 525], evPerMon: 488, saiyanPerMon: 71, aiLevel: "hof", streak: 29, unlockChampionships: 5 },
    MAITRE:  { tier: "MAITRE",  level: 100, bstBand: [475, 540], evPerMon: 510, saiyanPerMon: 80, aiLevel: "hof",     streak: 30, unlockChampionships: 6 },
    // VOIE DU MAÎTRE (post-Maître) — équipes DÉSIGNÉES (pool des 12). Niv 100 & EV MAX partout ; l'escalade se joue
    // sur les POINTS SAIYAN puis le SHINY (+10 % toutes stats). bstBand/streak inutilisés (pas de génération procédurale).
    DAN_1: { tier: "DAN_1", level: 100, bstBand: [300, 640], evPerMon: 510, saiyanPerMon: 90,  aiLevel: "hof", streak: 34, unlockChampionships: 7,  shiny: "none" },
    DAN_2: { tier: "DAN_2", level: 100, bstBand: [300, 640], evPerMon: 510, saiyanPerMon: 100, aiLevel: "hof", streak: 38, unlockChampionships: 8,  shiny: "none" },
    DAN_3: { tier: "DAN_3", level: 100, bstBand: [300, 640], evPerMon: 510, saiyanPerMon: 100, aiLevel: "hof", streak: 42, unlockChampionships: 9,  shiny: "half" },
    DAN_4: { tier: "DAN_4", level: 100, bstBand: [300, 640], evPerMon: 510, saiyanPerMon: 100, aiLevel: "hof", streak: 46, unlockChampionships: 10, shiny: "full" },
}

/** Titre décerné à la victoire d'un tournoi de ce tier (palmarès). */
export const DOME_TITLES: Record<DomeTier, string> = {
    BRONZE: "🥉 Bronze", ARGENT: "🥈 Argent", OR: "🥇 Or", DIAMANT: "💎 Diamant", PLATINE: "💠 Platine", MYTHIQUE: "🌟 Mythique", MAITRE: "👑 Maître",
    DAN_1: "🎴 1ᵉʳ Dan", DAN_2: "🎴 2ᵉ Dan", DAN_3: "🎴 3ᵉ Dan", DAN_4: "🎴 4ᵉ Dan",
}

/** Tier MAXIMUM débloqué selon le nombre de titres déjà gagnés (domeChampionships). */
export function maxUnlockedTier(championships: number): DomeTier {
    let best: DomeTier = "BRONZE"
    for (const t of DOME_TIERS) if (championships >= DOME_BUDGETS[t].unlockChampionships) best = t
    return best
}

const AI_ORDER: readonly AiLevel[] = ["wild", "trainer", "ace", "hof"] as const
function bumpAi(a: AiLevel): AiLevel { return AI_ORDER[Math.min(AI_ORDER.length - 1, AI_ORDER.indexOf(a) + 1)] }

/** Répartit le budget d'entraînement d'un tier sur les stats d'UN Daemon ennemi (Dôme-only) : EV vers sa
 *  meilleure stat offensive + PV + Déf (plafond 252/stat, 510 total) ; Saiyan vers l'offensif + PV. Plus le tier
 *  est haut, plus l'ennemi est entraîné (Bronze = nu, Maître = full). Les nombres sont dans DOME_BUDGETS (à tuner). */
export function distributeDomeTraining(baseStats: Record<StatKey, number>, evBudget: number, saiyanBudget: number): { ev: Partial<Record<StatKey, number>>; allocated: Partial<Record<StatKey, number>> } {
    const off: StatKey = baseStats.atk >= baseStats.spc ? "atk" : "spc"
    const cap = (n: number) => Math.max(0, Math.min(252, Math.floor(n)))
    // Répartition : offensif 40 % · VITESSE 30 % (évite que le joueur outspeed/revenge-kill systématiquement) · PV 20 % · Déf 10 %.
    const ev: Partial<Record<StatKey, number>> = { [off]: cap(evBudget * 0.4), spe: cap(evBudget * 0.3), hp: cap(evBudget * 0.2), def: cap(evBudget * 0.1) }
    const s = (f: number) => Math.max(0, Math.floor(saiyanBudget * f))
    const allocated: Partial<Record<StatKey, number>> = { [off]: s(0.5), spe: s(0.3), hp: s(0.2) }
    return { ev, allocated }
}

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
