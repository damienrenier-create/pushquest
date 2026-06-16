// src/lib/gamebook/yellow/data/playerArena.ts
//
// Nexus Jaune Éclair — ARÈNES DE FIN DE JEU contre les autres joueurs (débloquées
// une fois qu'on possède TOUS les badges, c.-à-d. après ONDINE) :
//   • HUB    (arène Eau)  : on affronte les VRAIES équipes des autres joueurs, jouées par l'IA.
//   • MIROIR (arène Élec) : mêmes joueurs, mais équipe INVERSÉE + chaque Daemon remplacé par
//     sa FAIBLESSE de type exacte, niveaux conservés, pseudo/surnoms à l'envers.
// Source de données : /api/gamebook/yellow/registry. Fonctions PURES (testables) ; le
// rendu (sprites cliquables) et le combat IA se branchent côté UI.

import { createMonInstance } from "../battle/factory"
import { getSpecies, SPECIES } from "./species"
import { POKE_TYPES, type PokeType, type MonInstance } from "../battle/types"
import { typeEffectiveness } from "../battle/typeChart"

/** Un Daemon tel que renvoyé par la registry. */
export interface RegistryMon { speciesId: string; level: number; nickname: string | null }
/** Un joueur tel que renvoyé par la registry (résumé public). */
export interface RegistryPlayer {
    userId: string
    nickname: string
    isGuest?: boolean
    team: RegistryMon[]
    badges?: string[]
}

/** Nombre d'adversaires affichés dans une arène (les plus proches de notre niveau). */
export const ARENA_OPPONENTS = 6

/** Les 5 badges du Nexus. Les posséder TOUS débloque les arènes joueurs (= après ONDINE, eau étant le dernier). */
export const ALL_BADGES = ["feu", "plante", "eau", "roche", "elec"] as const
export function hasAllBadges(badges: readonly string[]): boolean {
    return ALL_BADGES.every((b) => badges.includes(b))
}

/** Mode d'arène joueur selon la map. */
export type ArenaMode = "hub" | "mirror"
export const ARENA_MAPS: Record<string, ArenaMode> = {
    yellow_arena_eau: "hub",     // vraies équipes des autres joueurs, jouées par l'IA
    yellow_arena_elec: "mirror", // reflets : équipes inversées + faiblesses de type
}
/** Cases LIBRES (walkable, hors gardes/boss) où planter les adversaires sur chaque arène. */
export const ARENA_POSITIONS: Record<string, [number, number][]> = {
    yellow_arena_eau: [[2, 8], [2, 12], [13, 8], [13, 12], [3, 10], [12, 10]],
    yellow_arena_elec: [[2, 6], [4, 6], [6, 6], [8, 6], [10, 6], [12, 6]],
}

/** Niveau "représentatif" d'une équipe = niveau du Daemon le plus haut. */
export function teamMaxLevel(team: RegistryMon[]): number {
    return team.reduce((m, x) => Math.max(m, x.level), 0)
}

/** Les N joueurs (hors soi, équipe non vide) dont le niveau est le PLUS PROCHE du nôtre. */
export function rankClosest(players: RegistryPlayer[], myUserId: string, myLevel: number, n = ARENA_OPPONENTS): RegistryPlayer[] {
    return players
        .filter((p) => p.userId !== myUserId && p.team.length > 0)
        .map((p) => ({ p, d: Math.abs(teamMaxLevel(p.team) - myLevel) }))
        .sort((a, b) => a.d - b.d || a.p.userId.localeCompare(b.p.userId)) // tie-break déterministe
        .slice(0, n)
        .map((x) => x.p)
}

/** Équipe HUB : la vraie équipe du joueur (telle quelle), jouée par l'IA. */
export function buildHubTeam(player: RegistryPlayer): MonInstance[] {
    return player.team
        .filter((m) => getSpecies(m.speciesId))
        .map((m) => {
            const mon = createMonInstance(m.speciesId, m.level, { owned: false })
            if (m.nickname) mon.nickname = m.nickname
            return mon
        })
}

/** Le type d'attaque le PLUS efficace contre ces types de défense (la "faiblesse exacte"). Déterministe. */
export function bestCounterType(defenderTypes: PokeType[]): PokeType {
    let best: PokeType = "NORMAL"
    let bestEff = -1
    for (const atk of POKE_TYPES) {
        const eff = typeEffectiveness(atk, defenderTypes)
        if (eff > bestEff) { bestEff = eff; best = atk } // 1er en ordre POKE_TYPES en cas d'égalité
    }
    return best
}

// Cache : forme la plus forte par type primaire (calcul data-driven, mémorisé).
const _strongestByType: Partial<Record<PokeType, string>> = {}
function bstOf(id: string): number {
    const b = getSpecies(id)!.baseStats
    return b.hp + b.atk + b.def + b.spe + b.spc
}
/** La forme la plus forte (BST max) d'un type donné, hors légendaires/cachés — le "contre" du miroir. */
export function strongestSpeciesOfType(type: PokeType): string {
    if (_strongestByType[type]) return _strongestByType[type]!
    let bestId = ""
    let bestBst = -1
    // 1) priorité aux espèces dont le type PRIMAIRE est le type voulu.
    for (const [id, sp] of Object.entries(SPECIES)) {
        if (sp.hiddenUntilCaught || sp.types[0] !== type) continue
        const bst = bstOf(id)
        if (bst > bestBst) { bestBst = bst; bestId = id }
    }
    // 2) repli : n'importe quelle espèce possédant ce type.
    if (!bestId) {
        for (const [id, sp] of Object.entries(SPECIES)) {
            if (sp.hiddenUntilCaught || !sp.types.includes(type)) continue
            const bst = bstOf(id)
            if (bst > bestBst) { bestBst = bst; bestId = id }
        }
    }
    _strongestByType[type] = bestId || Object.keys(SPECIES)[0] // ultime repli (ne devrait jamais arriver)
    return _strongestByType[type]!
}

/** Texte à l'envers (Eva → avE) — pseudo & surnoms du miroir. */
export function mirrorName(name: string): string {
    return name.split("").reverse().join("")
}

/**
 * Équipe MIROIR : ordre INVERSÉ, chaque Daemon remplacé par la forme la plus forte de sa
 * FAIBLESSE de type, niveau conservé, surnom à l'envers. (NB : la registry n'expose pas la
 * répartition Saiyan → non répliquée.)
 */
export function buildMirrorTeam(player: RegistryPlayer): MonInstance[] {
    return player.team
        .filter((m) => getSpecies(m.speciesId))
        .slice()
        .reverse()
        .map((m) => {
            const sp = getSpecies(m.speciesId)!
            const counterId = strongestSpeciesOfType(bestCounterType(sp.types))
            const mon = createMonInstance(counterId, m.level, { owned: false })
            mon.nickname = mirrorName(m.nickname ?? sp.name)
            return mon
        })
}
