// src/lib/gamebook/yellow/data/run3Arenas.ts
//
// Nexus Jaune Éclair — RUN 3 (concours) : configuration des 5 arènes re-designées.
//   - GARDIENS (dresseurs de base) : typés comme la LIGUE de Cendreville (aperçu de la Ligue à venir).
//   - BOSS de chaque arène : l'ÉQUIPE GELÉE d'un VRAI joueur ayant conquis cette arène (table ArenaChampion),
//     run 1 + run 2 mélangés, un joueur distinct par arène AU MIEUX (doublon toléré, soi-même inclus).
//   - À la victoire d'une arène : palier d'ÉNERGIE (700 → 1500), seule source d'énergie du run avec les 500
//     de départ. Données pures, React-free.

/** PLAFOND de RECHARGE d'énergie à la victoire de chaque arène (index 0 = arène 1 … index 4 = arène 5).
 *  NOUVELLE RÈGLE (équilibrage) : l'arène ne DONNE PAS un palier additif — elle RECHARGE la réserve JUSQU'À
 *  ce plafond (jamais au-dessus, jamais en-dessous de la réserve actuelle). Le joueur quitte donc l'arène N
 *  avec AU PLUS cap[N] : 500 → 500 → 600 → 700 → 800 → 1000. Empêche l'accumulation (700 + reste = trop). */
export const RUN3_ARENA_ENERGY = [500, 600, 700, 800, 1000] as const

/** Plafond de recharge à la victoire de l'arène `arenaIndex` (0-based). 0 hors bornes. */
export function run3ArenaEnergy(arenaIndex: number): number {
    return RUN3_ARENA_ENERGY[arenaIndex] ?? 0
}

/** Type dominant des GARDIENS de chaque arène (aperçu de la Ligue de Cendreville). Index = ordre de jeu. */
export const RUN3_ARENA_GUARD_TYPES = ["Glace", "Combat", "Poison/Spectre", "Dragon", "Multi"] as const

/** Définition d'une arène du run 3 (ordre de jeu = ordre de niveau du run 1). */
export interface Run3ArenaDef {
    order: number          // 1..5
    mapId: string          // carte de l'arène (identique run 1/2)
    bossTrainerId: string  // dresseur boss (dont on remplace l'équipe par un vrai joueur)
    badge: string          // slot ArenaChampion (plante|roche|feu|elec|eau) — pour piocher le boss-joueur
    guardType: string      // type Ligue des gardiens (re-typage run 3)
    energy: number         // PLAFOND de recharge d'énergie à la victoire (recharge JUSQU'À cette valeur, pas +additif)
}

/** Les 5 arènes du run 3, dans l'ORDRE DE JEU (croissant en niveau, comme au run 1). Slots/mapId/badge
 *  identiques au run 1 ; seul le TYPE des gardiens change (aperçu de la Ligue) et le boss = un vrai joueur. */
export const RUN3_ARENAS: readonly Run3ArenaDef[] = [
    { order: 1, mapId: "yellow_arena",       bossTrainerId: "y_arena_druide",   badge: "plante", guardType: "Glace",          energy: 500 },
    { order: 2, mapId: "yellow_arena_roche", bossTrainerId: "y_rocharena_boss", badge: "roche",  guardType: "Combat",         energy: 600 },
    { order: 3, mapId: "yellow_arena_feu",   bossTrainerId: "y_feuarena_boss",  badge: "feu",    guardType: "Poison/Spectre", energy: 700 },
    { order: 4, mapId: "yellow_arena_elec",  bossTrainerId: "y_elecarena_boss", badge: "elec",   guardType: "Dragon",         energy: 800 },
    { order: 5, mapId: "yellow_arena_eau",   bossTrainerId: "y_eauarena_boss",  badge: "eau",    guardType: "Multi",          energy: 1000 },
] as const

/** Slots badge des 5 arènes dans l'ordre de jeu → à passer à pickRun3ArenaBosses. */
export const RUN3_ARENA_BADGES: readonly string[] = RUN3_ARENAS.map((a) => a.badge)

/** Def de l'arène run 3 pour un boss d'arène donné (par trainerId), ou null. */
export function run3ArenaForBoss(bossTrainerId: string): Run3ArenaDef | null {
    return RUN3_ARENAS.find((a) => a.bossTrainerId === bossTrainerId) ?? null
}

/** Intro AVANT-COMBAT du boss d'arène run 3 : ce n'est PAS le PNJ d'origine (Druide, …) mais l'ÉQUIPE GELÉE
 *  d'un VRAI joueur, champion de cette arène aux runs précédents. On nomme le champion pour lever l'ambiguïté. */
export function run3BossIntroLines(nickname: string): string[] {
    const N = (nickname || "un champion").toUpperCase()
    return [
        "Cette arène ne défend plus de badge ordinaire… Un CHAMPION du Nexus y a laissé son équipe en garde !",
        `Face à toi se dresse la formation LÉGENDAIRE de ${N}, figée au sommet de sa gloire. Terrasse-la pour empocher le palier d'énergie et poursuivre le concours !`,
    ]
}

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
