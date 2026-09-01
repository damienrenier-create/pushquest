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
import { getSpecies, SPECIES, registerCustomSpecies } from "./species"
import { buildCustomSpecies, buildNemesis, type StoredCustomDaemon } from "../create/customSpecies"
import { POKE_TYPES, type PokeType, type MonInstance, type StatKey } from "../battle/types"
import { typeEffectiveness } from "../battle/typeChart"
import { YELLOW_MAPS } from "../maps"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"
import { isBlockingTile } from "../../mapEngine"

/** Un Daemon tel que renvoyé par la registry. Champs de PUISSANCE (ev/allocated/ivs/moves/heldItem) exposés pour que
 *  le reflet IA reproduise la VRAIE force du joueur (sinon = espèce+niveau+IV15+shiny seulement). Optionnels (rétro-compat). */
export interface RegistryMon {
    speciesId: string; level: number; nickname: string | null; shiny?: boolean
    ev?: Partial<Record<StatKey, number>>
    allocated?: Partial<Record<StatKey, number>>
    ivs?: Record<StatKey, number>
    moves?: string[]
    heldItem?: string
    heldItem2?: string
}
/** Un joueur tel que renvoyé par la registry (résumé public). */
export interface RegistryPlayer {
    userId: string
    nickname: string
    isGuest?: boolean
    gameMode?: string // "fun" = compte du lien nexus-fun-2026 → scoping des reflets entre comptes fun (route nord)
    team: RegistryMon[]
    customDaemons?: StoredCustomDaemon[] // specs des Daemons CUSTOM du joueur → à enregistrer pour résoudre son reflet
    badges?: string[]
    favoriteDaemon?: string // espèce la + jouée (pvpStats.daemonUse) → le miroir MÈNE avec (habitudes)
    favoriteMove?: string   // attaque la + jouée (réservé à une future couche de mimétisme de moves)
    chosenAvatar?: string | null // FASHION VICTIM — skin adopté → le reflet du joueur l'affiche PARTOUT (pas un Red générique)
    clan?: "air" | "combat" | "roche" | null // FERVEUR DE CLAN — clan actif : un allié ne se combat pas (miroir), on lui fait un HIGH FIVE
}

/** Enregistre les Daemons CUSTOM de tous les joueurs de la registry → getSpecies résout leurs reflets (sprite +
 *  combat) au lieu de les JETER (buildHubTeam/buildMirrorTeam filtrent les espèces inconnues). Idempotent (ids
 *  custom_<owner>_... distincts par joueur, ré-enregistrement = même spec). Best-effort (une spec cassée est ignorée). */
export function registerRegistryCustoms(players: RegistryPlayer[]): void {
    for (const p of players) for (const d of (p.customDaemons ?? [])) {
        try {
            registerCustomSpecies(buildCustomSpecies(d.spec, d.ownerId))
            // NÉMÉSIS (contre-lignée d'ACE, déterministe) : owner "nem_<ownerId>" — MÊME id que getNgplusNemesisSpeciesId
            //   → la némésis d'un autre joueur est visible/résolue elle aussi (voulu : « pareil pour les némésis »).
            registerCustomSpecies(buildCustomSpecies(buildNemesis(d.spec), `nem_${d.ownerId}`))
        } catch { /* spec illégale → ignorée */ }
    }
}

/** Nombre d'adversaires affichés dans une arène (les plus proches de notre niveau). */
export const ARENA_OPPONENTS = 6

/** Les 5 badges du Nexus. Les posséder TOUS débloque les arènes joueurs (= après ONDINE, eau étant le dernier). */
export const ALL_BADGES = ["feu", "plante", "eau", "roche", "elec"] as const
export function hasAllBadges(badges: readonly string[]): boolean {
    return ALL_BADGES.every((b) => badges.includes(b))
}

/** Route Nord : arène de reflets RÉSERVÉE aux comptes « fun » (lien nexus-fun-2026), dès le run 1, dans les
 *  HAUTES HERBES. Gating par gameMode (pas par badge) → décidé dans usePlayerArena (arenaActive renvoie false ici). */
export const ROUTE_NORD_MAP_ID = "yellow_route_nord"
/** Nombre de cases-candidates (hautes herbes) où faire pop les reflets fun de la Route Nord (>= 10, cf. demande). */
export const ROUTE_NORD_SPOT_COUNT = 12

/** Mode d'arène joueur selon la map. */
export type ArenaMode = "hub" | "mirror"
export const ARENA_MAPS: Record<string, ArenaMode> = {
    // VIRIDIAN (Ville Jaune) : on croise les reflets EXACTS des autres joueurs — leurs VRAIES
    // équipes, jouées par l'IA — en roamant, tôt dans l'aventure.
    [YELLOW_ENTRANCE_MAP_ID]: "hub",
    // ARÈNE EAU : une fois ONDINE vaincue, les reflets INVERSÉS (équipe = faiblesses de type,
    // pseudo à l'envers) y popent — défi miroir de fin de zone.
    yellow_arena_eau: "mirror",
    // ROUTE NORD : reflets EXACTS entre comptes fun (activation gérée par gameMode dans le hook, pas par arenaActive).
    [ROUTE_NORD_MAP_ID]: "hub",
}
/** Maps où les adversaires POPENT sur des cases ALÉATOIRES (re-tirées à chaque entrée) — façon
 *  rencontres, pour se mesurer aux autres au plus tôt. Les arènes fixes utilisent ARENA_POSITIONS. */
export const ROAMING_ARENA_MAPS: ReadonlySet<string> = new Set([YELLOW_ENTRANCE_MAP_ID, ROUTE_NORD_MAP_ID])
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
    // ROUTE NORD : activation par gameMode "fun" (décidée dans usePlayerArena), PAS par badge → false ici pour
    //   que les comptes NON-fun n'y voient jamais de reflet (leur Route Nord reste inchangée).
    if (mapId === ROUTE_NORD_MAP_ID) return false
    if (mapId === YELLOW_ENTRANCE_MAP_ID) return badges.length >= 1
    if (mapId === "yellow_arena_eau") return badges.includes("eau")
    return hasAllBadges(badges)
}

// Cases JOIGNABLES par map (mémorisé, déterministe). Le plus grand composant connexe des cases praticables, en
//   EXCLUANT les emprises de bâtiment (couche `buildings`, hors porte — exactement comme le mouvement réel). Sans ça,
//   roamingSpots pouvait poser un reflet sur une case « grass » SOUS un bâtiment ou dans une poche isolée : le joueur
//   ne pouvait jamais s'en approcher → bouton A (distance ≤ 1) SANS effet (bug reflets « incombattables au A »).
const _reachableCache: Record<string, [number, number][]> = {}
function reachableCells(mapId: string): [number, number][] {
    if (_reachableCache[mapId]) return _reachableCache[mapId]
    const m = YELLOW_MAPS[mapId]
    if (!m) return []
    const inBuildingWall = (x: number, y: number) => (m.buildings ?? []).some((b) => {
        if (!(x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h)) return false
        const dw = b.doorW ?? 1
        return !(x >= b.x + b.doorX && x < b.x + b.doorX + dw && y === b.y + b.doorY) // dans le bâtiment mais pas sur la porte
    })
    const walkable = (x: number, y: number) =>
        x >= 0 && y >= 0 && x < m.width && y < m.height && !!m.tiles[y]?.[x] && !isBlockingTile(m.tiles[y][x]) && !inBuildingWall(x, y)
    const seen = new Set<string>()
    let best: [number, number][] = []
    for (let y0 = 0; y0 < m.height; y0++) {
        for (let x0 = 0; x0 < m.width; x0++) {
            if (seen.has(`${x0},${y0}`) || !walkable(x0, y0)) continue
            const comp: [number, number][] = []
            const stack: [number, number][] = [[x0, y0]]
            while (stack.length) {
                const [x, y] = stack.pop()!
                const k = `${x},${y}`
                if (seen.has(k)) continue
                seen.add(k)
                if (!walkable(x, y)) continue
                comp.push([x, y])
                stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
            }
            if (comp.length > best.length) best = comp
        }
    }
    _reachableCache[mapId] = best
    return best
}

/**
 * Cases « libres » d'une map où faire pop des adversaires-IA : JOIGNABLES (cf. reachableCells — hors murs de
 * bâtiment et hors poches isolées, donc toujours atteignables au bouton A), hors warps, éventuellement restreintes
 * à un TYPE de sol (`tileType`, ex. "grassTall" = hautes herbes), mélangées et tronquées à `count`. `rand` = source
 * d'aléa (Math.random côté UI). Déterministe pour un `rand` donné → testable.
 */
export function roamingSpots(mapId: string, count: number, rand: () => number, tileType?: string): [number, number][] {
    const m = YELLOW_MAPS[mapId]
    if (!m) return []
    const exits = new Set((m.exits ?? []).map((e) => `${e.x},${e.y}`))
    const spots = reachableCells(mapId).filter(([x, y]) =>
        !exits.has(`${x},${y}`) && (!tileType || m.tiles[y]?.[x] === tileType))
    // Fisher-Yates → placement « hasardeux » (copie issue de filter → ne mute pas le cache).
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

/** Écart de niveau MAX (±) entre un joueur et le reflet affiché : au-delà, le reflet est EXCLU (pas seulement « pas
 *  dans le top-N »). Sinon un débutant SEUL parmi des vétérans se prend le « plus proche »… qui reste niv 80 → OHKO
 *  au 1er badge. Avec cette borne, il ne voit AUCUN reflet tant qu'aucun pair n'est à sa portée (feature dormante,
 *  pas frustrante ; se réveille en montant de niveau). Tunable. */
export const ARENA_LEVEL_GAP_CAP = 15
/** ENDGAME (grotte Fusion atteinte) : les niveaux montent + se dispersent → on élargit la fourchette des reflets
 *  en Ville Jaune à ± 25 pour qu'un joueur de fin de partie trouve encore des adversaires. */
export const ARENA_LEVEL_GAP_CAP_ENDGAME = 25

/** Les N joueurs (hors soi, équipe non vide) dont le niveau est le PLUS PROCHE du nôtre, ET dans la borne d'écart. */
export function rankClosest(players: RegistryPlayer[], myUserId: string, myLevel: number, n = ARENA_OPPONENTS, maxGap = ARENA_LEVEL_GAP_CAP): RegistryPlayer[] {
    return players
        .filter((p) => p.userId !== myUserId && p.team.length > 0)
        .map((p) => ({ p, d: Math.abs(teamMaxLevel(p.team) - myLevel) }))
        .filter((x) => x.d <= maxGap) // BORNE : exclut les reflets trop loin de notre niveau (anti-OHKO du débutant)
        .sort((a, b) => a.d - b.d || a.p.userId.localeCompare(b.p.userId)) // tie-break déterministe
        .slice(0, n)
        .map((x) => x.p)
}

/** Équipe HUB : la vraie équipe du joueur (telle quelle), jouée par l'IA. HABITUDES : on la RÉORDONNE pour
 *  MENER avec son Daemon fétiche (l'espèce qu'il joue le plus) — son ouvreur signature. */
export function buildHubTeam(player: RegistryPlayer): MonInstance[] {
    const ordered = player.team.filter((m) => getSpecies(m.speciesId))
    const fav = player.favoriteDaemon
    if (fav) { const i = ordered.findIndex((m) => m.speciesId === fav); if (i > 0) ordered.unshift(...ordered.splice(i, 1)) }
    // GARDE-FOU TONYTONY : mur spécial (DÉF 5) → il ne doit pas OUVRIR le combat (un attaquant physique l'OHKO). On le
    //   renvoie en FIN d'ordre (jamais lead, sauf s'il est seul) ; le garde-fou dynamique (chooseReplacementIndex) gère
    //   ensuite : Tonytony n'entre en renfort qu'une fois les physiques adverses éliminés.
    const ti = ordered.findIndex((m) => m.speciesId === "tonytony")
    if (ti >= 0 && ti < ordered.length - 1) ordered.push(...ordered.splice(ti, 1))
    return ordered.map((m) => {
        // PLEINE PUISSANCE : on reconstruit le reflet avec les EV entraînés, points Saiyan (allocated), IV et le
        //   MOVESET/CT RÉELS du joueur (au lieu des 4 derniers coups du learnset). Active aussi les pilotes d'archétype
        //   (qui lisent les moves équipés). Champs optionnels → rétro-compat (ancienne registry = comportement d'avant).
        const mon = createMonInstance(m.speciesId, m.level, {
            owned: false, shiny: m.shiny,
            ev: m.ev, allocated: m.allocated,
            ivsByStat: m.ivs,
            moveIds: m.moves && m.moves.length > 0 ? m.moves : undefined,
        })
        if (m.nickname) mon.nickname = m.nickname
        if (m.heldItem) mon.heldItem = m.heldItem       // objets tenus (+10/20% stats via fullStats)
        if (m.heldItem2) mon.heldItem2 = m.heldItem2
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
            // Le reflet d'un shiny est shiny lui aussi (le flag suit l'original, même si l'espèce-contre diffère).
            return createMonInstance(counterId, m.level, { owned: false, shiny: m.shiny })
        })
}
