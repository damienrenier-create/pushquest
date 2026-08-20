// src/lib/gamebook/yellow/frontier/domeTypes.ts
//
// DÔME — modèle de données des DRESSEURS À PERSONNALITÉ + tiers d'escalade.
// PUR (types only), aucune dépendance moteur/UI. Consommé par domeTrainers.ts (les 30)
// et, en Phase 2, par le générateur d'équipe scalé (domeBudgets) + le pilote d'IA (ai.ts).
// Rien ici ne touche le combat existant : fichier 100 % additif.

import type { PokeType } from "../battle/types"

/** Tiers d'escalade du Dôme (difficulté + budget training croissants). Après Maître : la VOIE DU MAÎTRE — 4 dan
 *  post-Ligue, tournois à ÉQUIPES DÉSIGNÉES (pool des 12, cf. danTeams.ts), Saiyan/shiny croissants par grade. */
export type DomeTier = "BRONZE" | "ARGENT" | "OR" | "DIAMANT" | "PLATINE" | "MYTHIQUE" | "MAITRE" | "DAN_1" | "DAN_2" | "DAN_3" | "DAN_4"
export const DOME_TIERS: readonly DomeTier[] = ["BRONZE", "ARGENT", "OR", "DIAMANT", "PLATINE", "MYTHIQUE", "MAITRE", "DAN_1", "DAN_2", "DAN_3", "DAN_4"] as const
/** Les 4 grades de la VOIE DU MAÎTRE (portes ouvertes une fois Maître battu). */
export const DAN_TIERS: readonly DomeTier[] = ["DAN_1", "DAN_2", "DAN_3", "DAN_4"] as const
/** Tiers gérés par le GARDIEN DU DÔME (Bronze → Maître). Les Dan sont réservés au GARDIEN DES DAN (Salle des Dan). */
export const DOME_ONLY_TIERS: readonly DomeTier[] = ["BRONZE", "ARGENT", "OR", "DIAMANT", "PLATINE", "MYTHIQUE", "MAITRE"] as const
/** Vrai si le tier est un dan (équipe DÉSIGNÉE du pool, ≠ génération procédurale des tiers Bronze→Maître). */
export function isDanTier(t: DomeTier): boolean { return (DAN_TIERS as readonly string[]).includes(t) }
/** Rang d'un tier (0=Bronze … 8=4e Dan) → comparaisons `minTier ≤ tierCourant`. */
export function tierRank(t: DomeTier): number { return DOME_TIERS.indexOf(t) }

/** Biais de catégorie de l'ace — garde-fou de cohérence (physique→ATQ, spécial→SpA). */
export type DamageBias = "physical" | "special" | "mixed"

/** Curseurs de personnalité de l'IA (0..1, sauf noiseSigma ~0..0.35 ; 0.15 = comportement actuel de ai.ts). */
export interface DomeAI {
    aggression: number       // biais offensif vs sûreté
    switchAversion: number   // 1 = ne change presque jamais de Daemon
    noiseSigma: number       // bruit gaussien sur le score du coup
    showmanship: number      // goût de l'initiative / des gros coups visibles
}

/** Contrainte de construction/pilotage d'équipe (discriminée par `kind`). Traduite en génération
 *  Phase 2 (cf. domeBudgets + le générateur) : elle enrichit le pool ET le scoring de l'IA. */
export type TeamConstraint =
    | { kind: "none" }
    | { kind: "statusSynergy"; status: Array<"sleep" | "poison" | "freeze">; minCarriers: number }
    | { kind: "movePreference"; pref: "max-attack" | "high-power-risky" }
    | { kind: "statWeight"; hp?: number; def?: number; spe?: number; spc?: number; atk?: number; lowSpe?: boolean }
    | { kind: "elementalTrio"; types: PokeType[] }
    | { kind: "highSwitch" }
    | { kind: "lowBstMaxTraining"; rare?: boolean }
    | { kind: "counterPlayer"; mode: "static" | "adaptive" }

/** Un dresseur du pool du Dôme : IDENTITÉ + THÈME + PERSONA fixes ; son ÉQUIPE est générée par match
 *  (scalée par le tier), jamais hardcodée — seul l'`aceSpecies` est garanti (scriptedAce contourne la bande BST). */
export interface DomeTrainer {
    id: string
    name: string
    epithet: string
    themeTypes: PokeType[]          // [] = équipe entièrement générée (counterPlayer / oddball)
    excludeTypes?: PokeType[]       // types bannis de son équipe (ex. Géraldine ∅ FEU)
    includeSpecies?: string[]       // membres GARANTIS (ex. Naruto → uzumaro, Axelle → tonytony)
    aceSpecies: string              // id d'une espèce RÉELLE (vérifié par domeTrainers.test.ts)
    scriptedAce: boolean            // true = l'ace contourne bstBandForStreak (reste boosté par trainerBoost)
    damageBias: DamageBias          // cohérence catégorie/stat de l'ace + choix des moves
    minTier: DomeTier               // 1er tier où le persona peut apparaître
    ai: DomeAI
    constraint: TeamConstraint
    taunt: string
}
