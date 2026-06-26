// src/lib/gamebook/yellow/data/labDefis.ts
//
// Nexus Jaune Éclair — DÉFIS DU LABO (étage du Centre Pokémon = labo scientifique).
// Ce module porte le MODÈLE D'ÉTAT persistant (`labDefi`) regroupant tous les défis :
//   - 3 défis PHYSIQUES (vraies reps PushQuest) : 50 pompes/1h, 150 squats/1 série, quota×2 → demain×3
//   - 1 défi CT (infliger puissance×100 dégâts d'un type → CT du type, 2 max/type, 2e ×2)
//   - 1 défi SURPRISE (casino pattern-spin : gagner 1000 énergies cumulées → Tonytony)
// Tout vit dans GamebookProgress.flags de la ligne chapterId="yellow" (aucune migration SQL).

import type { PokeType } from "../battle/types"

/** Type du défi physique/CT « actif » (un seul à la fois). */
export type LabDefiKind = "pushup1h" | "squat150" | "quota2x" | "ct"

/** Défi en cours (physique ou CT) — `null` = aucun défi actif. */
export interface LabActiveDefi {
    kind: LabDefiKind
    /** Timestamp ISO du lancement (fenêtre horaire pushup1h ; ancrage du delta-snapshot anti-triche). */
    startedAt: string
    /** Total de l'exercice du jour AU LANCEMENT (défi pushup1h : on valide le delta, robuste au ré-encodage). */
    startSnapshot?: number
    // --- Défi CT (kind="ct") ---
    /** Type ciblé (les dégâts de ce type comptent). */
    ctType?: PokeType
    /** Attaque de la CT visée (pour info/affichage). */
    ctMoveId?: string
    /** Seuil de dégâts à atteindre (= puissance × 100, ×2 si c'est la 2e CT du type). */
    ctThreshold?: number
    /** Id de la CT à remettre à la réussite. */
    ctTargetCtId?: string
}

/** État persistant de TOUS les défis du labo (groupé dans la save yellow). */
export interface LabDefiState {
    /** Défi physique/CT en cours (un seul à la fois). */
    active: LabActiveDefi | null
    /** Défi P2 (150 squats en 1 série) réussi — one-shot À VIE. */
    squat150Done: boolean
    /** Cumul des dégâts infligés PAR LE JOUEUR, par type (alimente le défi CT actif). */
    ctDamageByType: Partial<Record<PokeType, number>>
    /** CT déjà gagnées au défi CT (plafond 2/type + seuil ×2 sur la 2e). */
    ctEarned: string[]
    /** Défi P3 : multiplicateur d'énergie d'UN jour cible (1 = aucun bonus en attente). */
    tomorrowEnergyMult: number
    /** Jour (YYYY-MM-DD) où le multiplicateur s'applique (vide = aucun). */
    tomorrowEnergyDate: string
    // --- Défi Surprise : casino pattern-spin → Tonytony ---
    /** Index du spin (parcourt le motif fixe de la roulette). */
    casinoSpinIndex: number
    /** Victoires consécutives (CASINO_BANKRUPT_STREAK → banqueroute). */
    casinoWinStreak: number
    /** Banqueroute jusqu'à ce timestamp ISO ("" = casino ouvert). */
    casinoBankruptUntil: string
    /** Cumul BRUT d'énergie gagnée au casino (1000 → débloque Tonytony). NON plafonné (≠ solde reps). */
    casinoTotalWon: number
    /** Tonytony déjà réclamé (one-shot). */
    tonytonyClaimed: boolean
}

/** État de défis vierge (nouvelle save / reset). */
export function emptyLabDefi(): LabDefiState {
    return {
        active: null,
        squat150Done: false,
        ctDamageByType: {},
        ctEarned: [],
        tomorrowEnergyMult: 1,
        tomorrowEnergyDate: "",
        casinoSpinIndex: 0,
        casinoWinStreak: 0,
        casinoBankruptUntil: "",
        casinoTotalWon: 0,
        tonytonyClaimed: false,
    }
}
