// src/lib/gamebook/yellow/data/run3Score.ts
//
// Nexus Jaune Éclair — RUN 3 : SCORE = somme des NIVEAUX des Pokémon ENNEMIS vaincus (boss d'arène + Ligue),
// chaque Pokémon compté UNE SEULE FOIS. Le run s'arrête à 0 énergie → on marque ce qu'on a vaincu jusque-là.
// Comme tout le monde affronte exactement les mêmes 5 boss figés + la même Ligue de Cendreville, les scores
// sont directement comparables. Données pures, React-free.

import { RUN3_BOSS_TEAMS } from "./run3Bosses"

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

/** Score MAX atteignable en vainquant LES 5 BOSS d'arène en entier (la Ligue s'ajoute au runtime). */
export function run3BossesMaxScore(): number {
    return Object.values(RUN3_BOSS_TEAMS).reduce((a, b) => a + b.team.reduce((s, m) => s + (m.level ?? 0), 0), 0)
}
