// src/lib/gamebook/yellow/data/run3Score.ts
//
// Nexus Jaune Éclair — RUN 3 : SCORE = somme des NIVEAUX des Pokémon ENNEMIS vaincus (boss d'arène + Ligue),
// chaque Pokémon compté UNE SEULE FOIS. Le run s'arrête à 0 énergie → on marque ce qu'on a vaincu jusque-là.
// Comme tout le monde affronte exactement les mêmes 5 boss figés + la même Ligue de Cendreville, les scores
// sont directement comparables. Données pures, React-free.

import { RUN3_BOSS_TEAMS, run3ArenaBossTeam } from "./run3Bosses"

/** Un ennemi vaincu : une CLÉ STABLE (source + index) pour la déduplication + son niveau. */
export interface Run3DefeatedEnemy { key: string; level: number }

/** Clé stable d'un Pokémon de BOSS d'arène (badge de l'arène + index dans l'équipe). */
export function bossEnemyKey(badge: string, index: number): string { return `boss:${badge}:${index}` }
/** Clé stable d'un Pokémon de LIGUE (trainerId + index dans l'équipe). */
export function leagueEnemyKey(trainerId: string, index: number): string { return `league:${trainerId}:${index}` }

/** SCORE = somme des niveaux des ennemis vaincus DISTINCTS (dédup par clé → jamais compté deux fois). */
export function run3Score(defeated: readonly Run3DefeatedEnemy[]): number {
    const seen = new Set<string>()
    let sum = 0
    for (const e of defeated) {
        if (seen.has(e.key)) continue
        seen.add(e.key)
        sum += Math.max(0, Math.floor(e.level))
    }
    return sum
}

/** RUN 3 — score « SURVIVANT » : Σ de l'énergie restante relevée à la fin de chaque arène/Ligue (snapshots
 *  pris juste après le KO du dernier Daemon du chef). Récompense la conservation d'énergie — l'OPPOSÉ du
 *  « Conquérant » (Σ niveaux vaincus). Deux podiums, deux stratégies. */
export function run3EnergyScore(byArena: Record<string, number> | undefined | null): number {
    if (!byArena || typeof byArena !== "object") return 0
    return Object.values(byArena).reduce((a, v) => a + (typeof v === "number" && isFinite(v) ? Math.max(0, Math.floor(v)) : 0), 0)
}

/** Score MAX atteignable en vainquant LES 5 BOSS d'arène en entier (la Ligue s'ajoute au runtime). */
export function run3BossesMaxScore(): number {
    return Object.values(RUN3_BOSS_TEAMS).reduce((a, b) => a + b.team.reduce((s, m) => s + (m.level ?? 0), 0), 0)
}

/** Score MAX RÉELLEMENT atteignable côté BOSS = Σ des équipes TRONQUÉES effectivement fieldées (run3ArenaBossTeam
 *  ne met que 3/4/4/5/6 Daemons), pas les équipes entières. C'est le vrai plafond boss (≈735). */
export function run3AchievableBossMax(): number {
    return ["plante", "roche", "feu", "elec", "eau"].reduce((a, badge) => a + run3ArenaBossTeam(badge).reduce((s, m) => s + (m.level ?? 0), 0), 0)
}

/** Score MAX de la LIGUE de Cendreville (Conseil 4 + Maître, équipes standard figées). Valeur constante
 *  (OLGA 270 + ALDO 330 + AGATHA 278 + PETER 286 + MAÎTRE 358), calculée depuis trainers.ts. */
export const RUN3_LEAGUE_MAX_SCORE = 1522

/** Score MAX total atteignable en run 3 (boss tronqués + Ligue). Dénominateur de la barre de progression. */
export function run3MaxScore(): number { return run3AchievableBossMax() + RUN3_LEAGUE_MAX_SCORE }
