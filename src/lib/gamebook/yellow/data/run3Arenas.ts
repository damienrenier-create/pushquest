// src/lib/gamebook/yellow/data/run3Arenas.ts
//
// Nexus Jaune Éclair — RUN 3 (concours) : configuration des 5 arènes re-designées.
//   - GARDIENS (dresseurs de base) : typés comme la LIGUE de Cendreville (aperçu de la Ligue à venir).
//   - BOSS de chaque arène : l'ÉQUIPE GELÉE d'un VRAI joueur ayant conquis cette arène (table ArenaChampion),
//     run 1 + run 2 mélangés, un joueur distinct par arène AU MIEUX (doublon toléré, soi-même inclus).
//   - À la victoire d'une arène : palier d'ÉNERGIE (700 → 1500), seule source d'énergie du run avec les 500
//     de départ. Données pures, React-free.

/** Paliers d'énergie offerts à la victoire de chaque arène (index 0 = arène 1 … index 4 = arène 5). */
export const RUN3_ARENA_ENERGY = [700, 900, 1100, 1300, 1500] as const

/** Énergie octroyée à la victoire de l'arène `arenaIndex` (0-based). 0 hors bornes. */
export function run3ArenaEnergy(arenaIndex: number): number {
    return RUN3_ARENA_ENERGY[arenaIndex] ?? 0
}

/** Type dominant des GARDIENS de chaque arène (aperçu de la Ligue de Cendreville). Index = ordre de jeu. */
export const RUN3_ARENA_GUARD_TYPES = ["Glace", "Combat", "Poison/Spectre", "Dragon", "Multi"] as const

// ─────────────────────────────────────────────────────────────────────────────
// SÉLECTION DES BOSS = équipes gelées de vrais joueurs (table ArenaChampion).
// ─────────────────────────────────────────────────────────────────────────────

/** Une ligne de la table ArenaChampion (cf. /api/gamebook/yellow/arena-champions). */
export interface ArenaChampionRow {
    nickname: string
    badgeId: string   // "feu" | "plante" | … (run 1) OU "ngplus:feu" | … (run 2)
    team: unknown     // équipe gelée (JSON) — fielded telle quelle par le moteur (cf. Hall of Fame)
}

/** Un boss choisi pour une arène du run 3. */
export interface Run3BossPick {
    nickname: string
    badgeId: string
    team: unknown
}

/**
 * Choisit UN boss (équipe gelée d'un vrai joueur) pour CHAQUE arène du run 3.
 * - `arenaBadges` : les 5 slots d'arène dans l'ordre de jeu (ex. ["feu","plante","eau","roche","elec"]).
 * - Pour chaque slot `badge` : candidats = champions du RUN 1 (`badge`) ET du RUN 2 (`ngplus:badge`) mélangés.
 * - Priorité à un joueur pas encore utilisé sur une autre arène ; si tous le sont déjà → DOUBLON toléré
 *   (jamais d'équipe PNJ ; on ré-affronte un pote plutôt que de laisser un trou). Soi-même est INCLUS.
 * - `seed` rend le choix déterministe (pas de Math.random → testable, stable au reload).
 * Renvoie un tableau aligné sur `arenaBadges` ; `null` pour un slot sans aucun champion.
 */
export function pickRun3ArenaBosses(
    champions: ArenaChampionRow[],
    arenaBadges: readonly string[],
    seed = 0,
): (Run3BossPick | null)[] {
    const used = new Set<string>()
    return arenaBadges.map((badge, i) => {
        const cands = champions.filter((c) => c.badgeId === badge || c.badgeId === `ngplus:${badge}`)
        if (cands.length === 0) return null
        // Priorité aux joueurs pas encore utilisés ; sinon on retombe sur l'ensemble (doublon toléré).
        const fresh = cands.filter((c) => !used.has(c.nickname))
        const pool = fresh.length > 0 ? fresh : cands
        const pick = pool[(seed + i) % pool.length] // déterministe
        used.add(pick.nickname)
        return { nickname: pick.nickname, badgeId: pick.badgeId, team: pick.team }
    })
}
