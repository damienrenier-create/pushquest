// src/lib/gamebook/yellow/data/platineArena.ts
//
// LIGUE DE FUSION — PALIER PLATINE (« le TRÔNE »). Ce module transforme les SACRES OR gravés côté serveur
// (table LeagueChampion, world "fusion:or") en SALLES jouables : une salle = un champion, avec son équipe de
// 6 chimères FIGÉE au jour de son sacre.
//
// Pourquoi c'est faisable sans rien stocker de neuf : le payload d'un sacre (FusionChampionMon) est déjà
// COMPLET — nom, sprite (URL Blob), types, niveau, stats EXACTES du sacre, 4 attaques, et les 2 espèces
// parentes. On n'a donc besoin ni des parents réels du joueur, ni de recalculer une fusion : on ré-enregistre
// une espèce ÉPHÉMÈRE à partir de la photo, exactement comme le Hall of Fame le fait pour l'affichage.
//
// MODULE PUR côté calcul (classement, BST) → testable sans store ni réseau. Seul buildPlatineRoomTeam touche
// le registre d'espèces, et il a son dispose (même cycle de vie que fusionMon.buildFusion).

import type { FusionChampionMon } from "../storage/save"
import type { MonInstance, MoveSlot, PokeType, SpeciesData } from "../battle/types"
import { POKE_TYPES } from "../battle/types"
import { registerCustomSpecies, unregisterCustomSpecies } from "./species"
import { getMoveByName } from "./moves"
import { MISSINGNO_SPRITE } from "./fusionSprite"
import type { BuiltFusion } from "./fusionMon"

/** Un sacre OR gravé au serveur, tel que le renvoie /api/gamebook/yellow/fusion-hall-of-fame. */
export interface PlatineChampion {
    userId: string
    nickname: string
    /** ISO — date du sacre. Sert au départage à puissance égale (le plus ANCIEN passe devant : il l'a fait en premier). */
    wonAt: string
    team: FusionChampionMon[]
}

/** PLAFOND DU COULOIR (décision Sartay 11/09) : au-delà, on ne garde que les salles les PLUS FORTES.
 *  ACE n'est PAS compté ici — il est le portier fixe, posé EN TÊTE du couloir, et n'entre pas au classement. */
export const PLATINE_ROOM_CAP = 8

/** Puissance d'une équipe = SOMME des BST de ses chimères. C'est le critère de sélection des salles : à 7 potes
 *  × 2 slots, le couloir pourrait atteindre 15 combats d'affilée — on ne garde que le haut du panier. */
export function championTeamBst(team: readonly FusionChampionMon[]): number {
    let total = 0
    for (const m of team) total += m.stats.hp + m.stats.atk + m.stats.def + m.stats.spe + m.stats.spc
    return total
}

/** Les salles RETENUES : les plus puissantes d'abord (somme des BST), plafonnées à `cap`. Les équipes vides sont
 *  écartées (sacre corrompu / payload illisible). Départage déterministe : à BST égal, le sacre le plus ANCIEN
 *  passe devant, puis le pseudo — pour que l'ordre ne danse pas d'un chargement à l'autre. */
export function rankPlatineChampions(all: readonly PlatineChampion[], cap = PLATINE_ROOM_CAP): PlatineChampion[] {
    return all
        .filter((c) => c.team.length > 0)
        .slice()
        .sort((a, b) =>
            championTeamBst(b.team) - championTeamBst(a.team)
            || Date.parse(a.wonAt) - Date.parse(b.wonAt)
            || a.nickname.localeCompare(b.nickname))
        .slice(0, Math.max(0, cap))
}

/** L'ORDRE DES SALLES du couloir, une fois la sélection faite : CHRONOLOGIQUE (le plus ancien sacre en premier).
 *  Deux consignes de Sartay cohabitent et ne disent PAS la même chose :
 *    • « on garde les 8 plus forts (somme des BST) »  → critère de SÉLECTION (qui entre dans le couloir) ;
 *    • « salle 2 = Jacanon (1er champion OR), salle 3 = Mools (2e) » → critère d'ORDRE (dans quel sens on les affronte).
 *  On applique donc les deux : on SÉLECTIONNE par puissance, puis on RANGE par ancienneté. Le couloir raconte
 *  ainsi l'histoire du groupe dans l'ordre où elle s'est écrite. */
export function orderPlatineRooms(rooms: readonly PlatineChampion[]): PlatineChampion[] {
    return rooms.slice().sort((a, b) => Date.parse(a.wonAt) - Date.parse(b.wonAt) || a.nickname.localeCompare(b.nickname))
}

/** LE COULOIR COMPLET, prêt à jouer : un sacre par joueur → les `cap` plus PUISSANTS → rangés du plus ANCIEN au
 *  plus récent. ACE n'y figure pas : il est le portier fixe, posé en tête par l'appelant. */
export function buildPlatineCorridor(all: readonly PlatineChampion[], cap = PLATINE_ROOM_CAP): PlatineChampion[] {
    return orderPlatineRooms(rankPlatineChampions(dedupeChampionsByUser(all), cap))
}

/** UN SEUL sacre par joueur dans le couloir : on garde le PLUS PUISSANT de ses sacres (un joueur peut avoir une
 *  salle OR ET une salle PLATINE — c'est voulu —, mais pas deux fois le même palier après un rejeu). */
export function dedupeChampionsByUser(all: readonly PlatineChampion[]): PlatineChampion[] {
    const best = new Map<string, PlatineChampion>()
    for (const c of all) {
        const cur = best.get(c.userId)
        if (!cur || championTeamBst(c.team) > championTeamBst(cur.team)) best.set(c.userId, c)
    }
    return [...best.values()]
}

const VALID_TYPES = new Set<string>(POKE_TYPES)
/** Types de la photo, assainis (un payload ancien/corrompu ne doit pas faire planter le moteur). Repli NORMAL. */
function safeTypes(raw: readonly string[] | undefined): PokeType[] {
    const ok = (raw ?? []).filter((t): t is PokeType => VALID_TYPES.has(t)).slice(0, 2)
    return ok.length ? ok : ["NORMAL"]
}

/** Les attaques de la photo sont stockées par NOM (lisible dans le Hall of Fame) → on les re-résout en ids. */
function safeMoves(names: readonly string[] | undefined): MoveSlot[] {
    const out: MoveSlot[] = []
    for (const n of names ?? []) {
        const mv = getMoveByName(n)
        if (mv && !out.some((s) => s.moveId === mv.id)) out.push({ moveId: mv.id, pp: mv.pp, ppMax: mv.pp })
        if (out.length === 4) break
    }
    if (!out.length) out.push({ moveId: "charge", pp: 35, ppMax: 35 }) // garde-fou : jamais un Daemon sans attaque
    return out
}

export interface BuiltPlatineRoom {
    /** L'équipe prête à combattre (stats FIGÉES = celles du sacre). Des BuiltFusion, comme tout adversaire de
     *  Ligue : le lanceur de combat et le démontage manipulent partout la même forme. */
    team: BuiltFusion[]
    /** Les espèces éphémères enregistrées → à DÉTRUIRE après le combat via disposePlatineRoom. */
    speciesIds: string[]
    champion: PlatineChampion
}

/** Reconstruit la salle d'un champion : une espèce éphémère par chimère + son instance à stats figées.
 *  `roomKey` rend les ids déterministes et uniques entre salles (pas de collision si deux joueurs ont la même
 *  chimère). Les stats ne sont JAMAIS recalculées : on rejoue la photo, pas une fusion. */
export function buildPlatineRoomTeam(champion: PlatineChampion, roomKey: string): BuiltPlatineRoom {
    const species: SpeciesData[] = []
    const team: BuiltFusion[] = []
    champion.team.slice(0, 6).forEach((m, i) => {
        const id = `platine_${roomKey}_${i}`
        const types = safeTypes(m.types)
        const stats = { ...m.stats }
        const bst = stats.hp + stats.atk + stats.def + stats.spe + stats.spc
        const moves = safeMoves(m.moves)
        species.push({
            id, dexNo: -1, name: m.name, types,
            baseStats: stats,
            learnset: moves.map((s) => ({ level: 1, moveId: s.moveId })),
            catchRate: 3, baseExp: Math.min(250, Math.max(1, Math.round(bst * 0.4))), rarity: "RARE",
            description: `Chimère de ${champion.nickname}, figée au jour de son sacre.`,
            sprite: m.sprite || MISSINGNO_SPRITE,
            // Les 2 parents permettent au client de RE-résoudre le sprite généré si l'URL figée est morte.
            fusionParents: m.aId && m.bId ? [m.aId, m.bId] : undefined,
            hiddenUntilCaught: true,
        })
        const instance: MonInstance = {
            uid: `platine-${roomKey}-${i}`,
            speciesId: id,
            level: m.level,
            exp: 0,
            ivs: { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 },
            currentHp: stats.hp,
            status: "NONE",
            statusCounter: 0,
            moves,
            frozenStats: stats, // ← la photo : aucun recalcul IV/EV/Saiyan
            owned: false,
        }
        // FusionResult SYNTHÉTIQUE : on n'a pas refait de fusion, on rejoue une photo — mais le reste du moteur
        //   (nom affiché, démontage, journalisation) attend cette forme. Pas de transmutation ici : le moveset
        //   gravé est déjà celui qui a servi le jour du sacre.
        team.push({
            instance, speciesId: id,
            result: {
                name: m.name, types, stats, level: m.level,
                moves: moves.map((s2) => s2.moveId), heldItems: [],
                parents: [m.aId ?? m.name, m.bId ?? m.name], moveTypes: {},
            },
        })
    })
    registerCustomSpecies(species)
    return { team, speciesIds: species.map((s) => s.id), champion }
}

/** Retire du registre les espèces éphémères d'une salle (à appeler en fin de combat, dans un finally). */
export function disposePlatineRoom(speciesIds: readonly string[]): void {
    unregisterCustomSpecies([...speciesIds])
}
