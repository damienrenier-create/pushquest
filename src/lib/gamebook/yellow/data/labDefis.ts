// src/lib/gamebook/yellow/data/labDefis.ts
//
// Nexus Jaune Éclair — DÉFIS DU LABO (étage du Centre Pokémon = labo scientifique).
// Ce module porte le MODÈLE D'ÉTAT persistant (`labDefi`) regroupant tous les défis :
//   - 3 défis PHYSIQUES (vraies reps PushQuest) : 50 pompes/1h, 150 squats/1 série, quota×2 → demain×3
//   - 1 défi CT (infliger puissance×100 dégâts d'un type → CT du type, 2 max/type, 2e ×2)
//   - 1 défi SURPRISE (casino pattern-spin : gagner 1000 énergies cumulées → Tonytony)
// Tout vit dans GamebookProgress.flags de la ligne chapterId="yellow" (aucune migration SQL).

import type { PokeType } from "../battle/types"
import { CTS } from "./cts"
import { getMove } from "./moves"

/** Type du défi physique/CT. Physique : un seul à la fois. CT : slot indépendant (parallèle). */
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
    /** Défi PHYSIQUE en cours (un seul à la fois). */
    activePhys: LabActiveDefi | null
    /** Défi CT en cours — INDÉPENDANT du physique (peut tourner en parallèle ; la roulette aussi). */
    activeCt: LabActiveDefi | null
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
    /** Tonytony déjà réclamé (one-shot, palier 1000). */
    tonytonyClaimed: boolean
    /** Capstone 5000 : le Tonytony du joueur a été rendu SHINY (one-shot). */
    tonytonyShiny: boolean
    /** TICKET QUOTIDIEN : dernier jour (YYYY-MM-DD) où le ticket roulette gratuit a été versé à la file. */
    dailyTicketDate: string
    /** Le TOUT PREMIER pari roulette du joueur a-t-il eu lieu ? (le 1er est gagné d'office — secret). */
    casinoFirstBetDone: boolean
    /** FILE de tickets roulette en attente (FIFO) : chaque entrée = la VALEUR de mise (10–50) du ticket.
     *  Le ticket gratuit du jour (valeur 10) + les tickets octroyés par les boss (arène 30 / sbire 20 / ACE 50). */
    grantedTickets: number[]
}

/** État de défis vierge (nouvelle save / reset). */
export function emptyLabDefi(): LabDefiState {
    return {
        activePhys: null,
        activeCt: null,
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
        tonytonyShiny: false,
        dailyTicketDate: "",
        casinoFirstBetDone: false,
        grantedTickets: [],
    }
}

// ════════════════════════ CATALOGUE DES DÉFIS ════════════════════════

// ───────── Défis PHYSIQUES (vraies reps PushQuest, validés serveur) ─────────
export interface PhysicalDefi {
    kind: Exclude<LabDefiKind, "ct">
    label: string
    desc: string
    /** Exercice concerné (PUSHUP/SQUAT) ; absent pour quota2x (tous exercices). */
    exercise?: "PUSHUP" | "SQUAT"
    /** Reps à atteindre (défis 1 & 2). */
    target?: number
    /** Fenêtre en ms (défi 1 : 1 h). */
    windowMs?: number
    /** One-shot À VIE (défi 2). */
    once?: boolean
    /** Libellé de la récompense (affichage). */
    reward: string
}

export const PHYSICAL_DEFIS: PhysicalDefi[] = [
    { kind: "pushup1h", label: "50 pompes en 1 heure", desc: "Encode 50 pompes dans l'heure qui suit le lancement.", exercise: "PUSHUP", target: 50, windowMs: 60 * 60 * 1000, reward: "+100 énergie" },
    { kind: "squat150", label: "150 squats en 1 série", desc: "Réalise UNE seule série de 150 squats (sans limite de temps). Une seule fois à vie.", exercise: "SQUAT", target: 150, once: true, reward: "+100 énergie" },
    { kind: "quota2x", label: "Double ton quota du jour", desc: "Atteins le double de ton quota quotidien avant minuit.", reward: "Énergies de demain ×3" },
]

/** Récompense énergie des défis physiques 1 & 2. */
export const PHYSICAL_ENERGY_REWARD = 100
/** Multiplicateur du défi 3 (énergies de demain ×3). */
export const QUOTA2X_MULT = 3

// ───────── Défi CT (infliger puissance×100 dégâts du type → CT) ─────────
/** CT-trophées exclues du pool de défi (récompenses spéciales, restent exclusives). */
const CT_DEFI_EXCLUDED = new Set(["ct37", "ct38"]) // Souffle Primordial (10 victoires) + Fouet de Nouilles (sbire)

export interface CtDefiOption {
    ctId: string
    type: PokeType
    moveId: string
    power: number
    /** Seuil de base = puissance × 100. */
    baseThreshold: number
}

/** Pool du défi CT : toutes les CT offensives (power>0) sauf méga-trophées, avec leur seuil de base. */
export function ctDefiOptions(): CtDefiOption[] {
    const out: CtDefiOption[] = []
    for (const ct of CTS) {
        if (CT_DEFI_EXCLUDED.has(ct.id)) continue
        const mv = getMove(ct.moveId)
        if (!mv || !mv.power || mv.power <= 0) continue
        out.push({ ctId: ct.id, type: mv.type, moveId: ct.moveId, power: mv.power, baseThreshold: mv.power * 100 })
    }
    return out
}

/** Seuil de dégâts pour gagner une CT, selon le nb DÉJÀ gagnées du MÊME type (0 → base, ≥1 → ×2). */
export function ctDefiThreshold(power: number, earnedOfType: number): number {
    return power * 100 * (earnedOfType >= 1 ? 2 : 1)
}

/** Plafond de CT gagnables PAR TYPE au défi (1re au prix de base, 2e ×2, pas de 3e). */
export const CT_PER_TYPE_MAX = 2

/** Nb de CT déjà gagnées au défi pour un type donné (depuis la liste des ids gagnés). */
export function ctEarnedCountByType(ctEarned: string[], type: PokeType): number {
    const byId = new Map(ctDefiOptions().map((o) => [o.ctId, o.type]))
    return ctEarned.filter((id) => byId.get(id) === type).length
}

// ───────── Défi SURPRISE (casino pattern-spin → Tonytony) ─────────
/** Motif FIXE de la roulette yellow (différent du Ch.1) : winningCase = CASINO_PATTERN[spin % length].
 *  100 % déterministe → un joueur malin peut le craquer (chance déguisée en jugeote). */
export const CASINO_PATTERN: number[] = [4, 9, 2, 7, 0, 5, 10, 3, 8, 1, 6, 9, 4, 0, 7, 2, 10, 5, 1, 8]
export const CASINO_NUM_CASES = 11        // cases 0..10
export const CASINO_MIN_BET = 10
export const CASINO_MAX_BET = 50
export const CASINO_WIN_MULT = 10         // gain = mise × 10 sur la bonne case
export const CASINO_BANKRUPT_STREAK = 5   // 5 victoires d'affilée → banqueroute (anti-farm)
export const CASINO_BANKRUPT_COOLDOWN_MS = 24 * 60 * 60 * 1000
/** Cumul BRUT d'énergie à gagner pour débloquer Tonytony. */
export const TONYTONY_TARGET = 1000
/** Capstone 5000 : ton Tonytony devient SHINY (la roulette reste jouable, elle est trop chouette). */
export const TONYTONY_SHINY_TARGET = 5000
/** Niveau de Tonytony à la remise. */
export const TONYTONY_LEVEL = 15
export const TONYTONY_SPECIES = "tonytony"

/** Case gagnante pour un index de spin donné (modulo robuste). */
export function casinoWinningCase(spinIndex: number): number {
    const n = CASINO_PATTERN.length
    return CASINO_PATTERN[((spinIndex % n) + n) % n]
}

// ───────── Tickets roulette OCTROYABLES (valeur de mise variable) ─────────
/** Ticket gratuit du jour : mise de base (gain ×10 = 100). */
export const DAILY_TICKET_VALUE = CASINO_MIN_BET
/** Boss d'arène : un ticket de 30 (en plus de la CT), à la 1re victoire. */
export const ARENA_TICKET_VALUE = 30
/** Sbire (pâtes) : un ticket de 20, tous les SBIRE_TICKET_EVERY combats cumulés, une fois la CT obtenue. */
export const SBIRE_TICKET_VALUE = 20
export const SBIRE_TICKET_EVERY = 6
/** ACE : un petit ticket de 20 à la 2e victoire (accroche), puis un gros de 50 avant Panthéon
 *  (victoire ACE_TICKET_WIN_BEFORE) + 1× après (ACE_TICKET_WIN_AFTER). */
export const ACE_TICKET_VALUE = 50
export const ACE_TICKET_WIN_BEFORE = 6
export const ACE_TICKET_WIN_AFTER = 8
export const ACE_TICKET_EARLY_VALUE = 20
export const ACE_TICKET_WIN_EARLY = 2
/** Garde-fou : taille max de la file de tickets (pas d'accumulation infinie). */
export const TICKET_QUEUE_MAX = 30

/** Borne une valeur de ticket dans [CASINO_MIN_BET, CASINO_MAX_BET] (entier). */
export function clampTicketValue(v: number): number {
    return Math.max(CASINO_MIN_BET, Math.min(CASINO_MAX_BET, Math.floor(v)))
}
