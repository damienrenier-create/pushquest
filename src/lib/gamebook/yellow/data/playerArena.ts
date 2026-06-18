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
import { YELLOW_MAPS } from "../maps"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { isBlockingTile } from "../../mapEngine"

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
    // VIRIDIAN (Ville Jaune) : on croise les reflets EXACTS des autres joueurs — leurs VRAIES
    // équipes, jouées par l'IA — en roamant, tôt dans l'aventure.
    [YELLOW_ENTRANCE_MAP_ID]: "hub",
    // ARÈNE EAU : une fois ONDINE vaincue, les reflets INVERSÉS (équipe = faiblesses de type,
    // pseudo à l'envers) y popent — défi miroir de fin de zone.
    yellow_arena_eau: "mirror",
}
/** Maps où les adversaires POPENT sur des cases ALÉATOIRES (re-tirées à chaque entrée) — façon
 *  rencontres, pour se mesurer aux autres au plus tôt. Les arènes fixes utilisent ARENA_POSITIONS. */
export const ROAMING_ARENA_MAPS: ReadonlySet<string> = new Set([YELLOW_ENTRANCE_MAP_ID])
/** Cases LIBRES (walkable, hors gym) où planter les adversaires sur les arènes à placement FIXE. */
export const ARENA_POSITIONS: Record<string, [number, number][]> = {
    yellow_arena_eau: [[2, 8], [2, 12], [13, 8], [13, 12], [3, 10], [12, 10]],
}

/**
 * L'apparition des reflets est-elle ACTIVE sur cette map pour ce joueur ?
 *  • Viridian (reflets EXACTS) : tôt — dès le 1er badge.
 *  • Arène eau (reflets INVERSÉS) : seulement après avoir vaincu ONDINE (badge eau en poche).
 */
export function arenaActive(mapId: string, badges: readonly string[]): boolean {
    if (!ARENA_MAPS[mapId]) return false
    if (mapId === YELLOW_ENTRANCE_MAP_ID) return badges.length >= 1
    if (mapId === "yellow_arena_eau") return badges.includes("eau")
    return hasAllBadges(badges)
}

/**
 * Cases « libres » d'une map (sol praticable, hors murs/arbres/barrières et hors warps) où faire
 * pop des adversaires-IA, mélangées et tronquées à `count`. `rand` = source d'aléa (Math.random
 * côté UI). Déterministe pour un `rand` donné → testable.
 */
export function roamingSpots(mapId: string, count: number, rand: () => number): [number, number][] {
    const m = YELLOW_MAPS[mapId]
    if (!m) return []
    const exits = new Set((m.exits ?? []).map((e) => `${e.x},${e.y}`))
    const spots: [number, number][] = []
    for (let y = 0; y < m.height; y++) {
        for (let x = 0; x < m.width; x++) {
            const t = m.tiles[y]?.[x]
            if (t && !isBlockingTile(t) && !exits.has(`${x},${y}`)) spots.push([x, y])
        }
    }
    // Fisher-Yates → placement « hasardeux ».
    for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        const tmp = spots[i]; spots[i] = spots[j]; spots[j] = tmp
    }
    return spots.slice(0, Math.max(0, count))
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

/** Texte à l'envers (Eva → avE). Sert à afficher le PSEUDO de l'adversaire à l'envers (pas le Daemon). */
export function mirrorName(name: string): string {
    return name.split("").reverse().join("")
}

/**
 * Choisit le contre MIROIR d'un Daemon, selon les règles :
 *  1. c'est une FAIBLESSE de type (super-efficace ×2+ contre lui) — et NON le « contre parfait »
 *     systématique (fini le 100 % Glace) ;
 *  2. de BST ÉQUIVALENT (le plus proche du Daemon d'origine, pas la forme la plus forte) ;
 *  3. jamais une espèce DÉJÀ prise dans l'équipe (dédup) → si la meilleure est prise, on en prend
 *     une autre valide. Déterministe (tri par écart de BST puis id). Exclut cachés & exclusifs.
 *  À défaut de faiblesse libre, on retombe sur le BST le plus proche encore disponible.
 */
export function pickMirrorCounter(defenderSpeciesId: string, used: ReadonlySet<string>): string {
    const def = getSpecies(defenderSpeciesId)
    if (!def) return defenderSpeciesId
    const target = bstOf(defenderSpeciesId)
    const isWeakness = (sp: (typeof SPECIES)[string]) =>
        Math.max(...sp.types.map((t) => typeEffectiveness(t, def.types))) >= 2
    const closest = (list: [string, (typeof SPECIES)[string]][]) =>
        list.sort((a, b) => Math.abs(bstOf(a[0]) - target) - Math.abs(bstOf(b[0]) - target) || a[0].localeCompare(b[0]))
    const free = Object.entries(SPECIES).filter(
        ([id, sp]) => !sp.hiddenUntilCaught && !sp.exclusive && !used.has(id),
    )
    const weak = closest(free.filter(([, sp]) => isWeakness(sp)))
    const pick = weak[0] ?? closest(free)[0]
    return pick ? pick[0] : defenderSpeciesId
}

/**
 * Équipe MIROIR : ordre INVERSÉ ; chaque Daemon remplacé par une FAIBLESSE de BST équivalent, sans
 * doublon (cf. pickMirrorCounter), niveau conservé. Les Daemons gardent leur nom normal — c'est le
 * PSEUDO de l'adversaire qui s'affiche à l'envers (mirrorName), au niveau du dresseur. (NB : la
 * registry n'expose pas la répartition Saiyan → non répliquée.)
 */
export function buildMirrorTeam(player: RegistryPlayer): MonInstance[] {
    const used = new Set<string>()
    return player.team
        .filter((m) => getSpecies(m.speciesId))
        .slice()
        .reverse()
        .map((m) => {
            const counterId = pickMirrorCounter(m.speciesId, used)
            used.add(counterId)
            return createMonInstance(counterId, m.level, { owned: false })
        })
}
