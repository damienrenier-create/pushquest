// src/lib/gamebook/yellow/data/run3Score.ts
//
// Nexus Jaune Éclair — RUN 3 : SCORE = somme des NIVEAUX des Pokémon ENNEMIS vaincus (boss d'arène + Ligue),
// chaque Pokémon compté UNE SEULE FOIS. Le run s'arrête à 0 énergie → on marque ce qu'on a vaincu jusque-là.
// Comme tout le monde affronte exactement les mêmes 5 boss figés + la même Ligue de Cendreville, les scores
// sont directement comparables. Données pures, React-free.

import { RUN3_BOSS_TEAMS, run3ArenaBossTeam } from "./run3Bosses"
import { SIGHT_RUN_TEAMS } from "./sightRunTeams"
import { BOAT_BOSS_IDS } from "./boatArena"

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

/** Plafond ANTI-TRICHE du score « Survivant » (POST client). L'énergie relevée par snapshot est bornée par le
 *  plafond de stockage (repsCap = 1000), et il y a au plus 11 snapshots distincts (5 arènes à boss figé + le BATEAU
 *  + 5 membres de Ligue) → majorant sûr et fini de 11×1000. Sert uniquement à borner un score reçu du client. */
export function run3EnergyMaxScore(): number { return 11_000 }

/** Clé de score des 2 CAPITAINES du BATEAU (arène 4) : un « slot » par boss → pas de collision d'index entre eux. */
export function boatBossSlot(trainerId: string): string | null {
    const i = BOAT_BOSS_IDS.indexOf(trainerId)
    return i < 0 ? null : `ancre_${i === 0 ? "a" : "b"}`
}
/** Score MAX des 2 capitaines du BATEAU au run 3 (leurs équipes run 3, entières). */
export function run3BoatBossesMax(): number {
    return BOAT_BOSS_IDS.reduce((a, id) => a + (SIGHT_RUN_TEAMS.run3[id] ?? []).reduce((s, m) => s + (m.level ?? 0), 0), 0)
}

/** ✱ SCORE « PATCHÉ » : la partie a joué le BATEAU, arène 4 du run 3 depuis le 21/10/2026. Ses points ne sont pas
 *  comparables aux scores d'avant (une arène de plus) → petite étoile au classement (décision Sartay). Repéré aux
 *  seules traces que le patch produit : points des capitaines (`boss:ancre_*`) ou relevé d'énergie du bateau. */
export const RUN3_BOAT_PATCH_FACTOR = "info:boat_patch"
export function run3BoatPlayed(w: unknown): boolean {
    if (!w || typeof w !== "object") return false
    const o = w as { run3Defeated?: unknown; run3EnergyByArena?: unknown }
    const def = Array.isArray(o.run3Defeated) ? o.run3Defeated : []
    if (def.some((e) => typeof (e as { key?: unknown } | null)?.key === "string" && (e as { key: string }).key.startsWith("boss:ancre_"))) return true
    const by = o.run3EnergyByArena
    return !!by && typeof by === "object" && Object.prototype.hasOwnProperty.call(by, "arena:ancre")
}

/** Score MAX atteignable en vainquant LES 5 BOSS d'arène en entier (la Ligue s'ajoute au runtime). */
export function run3BossesMaxScore(): number {
    return Object.values(RUN3_BOSS_TEAMS).reduce((a, b) => a + b.team.reduce((s, m) => s + (m.level ?? 0), 0), 0)
}

/** Score MAX RÉELLEMENT atteignable côté BOSS = Σ des équipes TRONQUÉES effectivement fieldées (run3ArenaBossTeam
 *  ne met que 3/4/4/5/6 Daemons), pas les équipes entières. C'est le vrai plafond boss (≈735). */
export function run3AchievableBossMax(): number {
    return ["plante", "roche", "feu", "elec", "eau"].reduce((a, badge) => a + run3ArenaBossTeam(badge).reduce((s, m) => s + (m.level ?? 0), 0), 0) + run3BoatBossesMax()
}

/** Score MAX de la LIGUE de Cendreville (Conseil 4 + Maître, équipes standard figées). Valeur constante
 *  (OLGA 270 + ALDO 330 + AGATHA 278 + PETER 286 + MAÎTRE 358), calculée depuis trainers.ts. */
export const RUN3_LEAGUE_MAX_SCORE = 1522

/** Score MAX total atteignable en run 3 (boss tronqués + Ligue). Dénominateur de la barre de progression. */
export function run3MaxScore(): number { return run3AchievableBossMax() + RUN3_LEAGUE_MAX_SCORE }
