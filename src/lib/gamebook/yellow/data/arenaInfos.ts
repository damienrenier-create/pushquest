// src/lib/gamebook/yellow/data/arenaInfos.ts
//
// Infos STRATÉGIQUES calculées automatiquement pour chaque arène (pour le carrousel pré-arène).
// Tout est dérivé des données (trainers.ts + typeChart + species) → valable en RUN 1 ET en RUN 2
// (où les équipes sont re-typées via NGPLUS_ARENA_TEAMS). Aucune donnée en dur à maintenir.

import { trainersOnMap, type TrainerMonSpec } from "./trainers"
import { NGPLUS_ARENA_TEAMS } from "./ngplusArenas"
import { RUN3_ARENAS } from "./run3Arenas"
import { RUN3_BOSS_TEAMS, run3ArenaBossTeam } from "./run3Bosses"
import { getSpecies } from "./species"
import { POKE_TYPES, type PokeType } from "../battle/types"
import { typeEffectiveness } from "../battle/typeChart"
import type { BadgeId } from "./cts"

/** Badge → mapId de son arène (aligné sur currentArenaMapId / la structure des arènes). */
const BADGE_MAP_ID: Record<BadgeId, string> = {
    plante: "yellow_arena",
    roche: "yellow_arena_roche",
    feu: "yellow_arena_feu",
    elec: "yellow_arena_elec",
    eau: "yellow_arena_eau",
}

/** Ordre des arènes du gym de Ville Jaune (l'arène EAU est à Cendreville, à part). */
export const GYM_BADGE_ORDER: BadgeId[] = ["plante", "roche", "feu", "elec"]

export interface ArenaTeamMon { speciesId: string; name: string; level: number; types: PokeType[]; isBoss: boolean }
export interface ArenaInfo {
    badge: BadgeId
    bossName: string
    bossTitle: string
    themeTypes: PokeType[]      // types de l'ACE du boss (= la « couleur » de l'arène, auto-adaptée au run 2)
    levelMin: number
    levelMax: number
    recommend: PokeType[]       // types SUPER-EFFICACES contre l'ACE (à amener)
    avoid: PokeType[]           // types RÉSISTÉS par l'ACE (à éviter en offensif)
    team: ArenaTeamMon[]        // l'équipe du BOSS (le combat décisif)
    guardCount: number
}

const teamFor = (t: { id: string; team: TrainerMonSpec[] }, isRun2: boolean): TrainerMonSpec[] =>
    (isRun2 && NGPLUS_ARENA_TEAMS[t.id]) ? NGPLUS_ARENA_TEAMS[t.id] : t.team

const toMon = (spec: TrainerMonSpec, isBoss: boolean): ArenaTeamMon => {
    const sp = getSpecies(spec.speciesId)
    return { speciesId: spec.speciesId, name: sp?.name ?? spec.speciesId, level: spec.level, types: sp?.types ?? [], isBoss }
}

/** Renvoie les infos stratégiques d'une arène (null si arène introuvable). `isRun2` = monde NG+. */
export function arenaInfo(badge: BadgeId, isRun2 = false): ArenaInfo | null {
    const mapId = BADGE_MAP_ID[badge]
    const trainers = trainersOnMap(mapId)
    const boss = trainers.find((t) => t.badge === badge)
    if (!boss) return null
    const guards = trainers.filter((t) => !t.badge)

    const bossTeam = teamFor(boss, isRun2).map((s) => toMon(s, true))
    const ace = bossTeam[bossTeam.length - 1] // le dernier = l'ACE (la « couleur » de l'arène)
    const themeTypes = ace?.types ?? []

    const allLevels = [...guards.flatMap((g) => teamFor(g, isRun2)), ...teamFor(boss, isRun2)].map((s) => s.level)
    const recommend = themeTypes.length ? POKE_TYPES.filter((t) => typeEffectiveness(t, themeTypes) >= 2) : []
    const avoid = themeTypes.length ? POKE_TYPES.filter((t) => typeEffectiveness(t, themeTypes) <= 0.5) : []

    return {
        badge,
        bossName: boss.name,
        bossTitle: boss.title,
        themeTypes,
        levelMin: allLevels.length ? Math.min(...allLevels) : 0,
        levelMax: allLevels.length ? Math.max(...allLevels) : 0,
        recommend,
        avoid,
        team: bossTeam,
        guardCount: guards.length,
    }
}

/** Badge de l'arène ACTUELLE du gym de Ville Jaune (la prochaine non vaincue). */
export function currentGymBadge(badges: readonly string[]): BadgeId {
    return GYM_BADGE_ORDER.find((b) => !badges.includes(b)) ?? "elec"
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN 3 — analyse d'arène spécifique : gardiens RE-TYPÉS (type Ligue) + BOSS = équipe figée d'un vrai joueur.
// ─────────────────────────────────────────────────────────────────────────────

/** Libellé de type des gardiens run 3 → types réels (pour calculer les super-efficaces). "Multi" = varié. */
const GUARD_TYPE_MAP: Record<string, PokeType[]> = {
    "Glace": ["GLACE"], "Combat": ["COMBAT"], "Poison/Spectre": ["POISON", "SPECTRE"], "Dragon": ["DRAGON"], "Multi": [],
}

export interface Run3ArenaInfo extends ArenaInfo {
    order: number
    bossPlayer: string          // pseudo du joueur dont c'est l'équipe figée
    guardType: string           // libellé du type des gardiens (aperçu de la Ligue)
    guardTypes: PokeType[]      // types réels des gardiens
    guardRecommend: PokeType[]  // super-efficaces contre les gardiens
    bossBestTypes: PokeType[]   // types offensifs qui frappent le PLUS de Daemons du boss en super-efficace
    energyPalier: number        // énergie gagnée à la victoire de l'arène
}

/** Types offensifs qui frappent le plus de membres de l'équipe en super-efficace (≥2 Daemons), top 4. */
function bestOffensiveTypesVs(team: ArenaTeamMon[]): PokeType[] {
    return POKE_TYPES
        .map((t) => ({ t, n: team.filter((m) => m.types.length > 0 && typeEffectiveness(t, m.types) >= 2).length }))
        .filter((x) => x.n >= 2)
        .sort((a, b) => b.n - a.n)
        .slice(0, 4)
        .map((x) => x.t)
}

/** Infos stratégiques d'une arène en RUN 3 (gardiens re-typés Ligue + boss = équipe figée d'un vrai joueur). */
export function run3ArenaInfo(badge: BadgeId): Run3ArenaInfo | null {
    const arenaDef = RUN3_ARENAS.find((a) => a.badge === badge)
    const bossData = RUN3_BOSS_TEAMS[badge]
    if (!arenaDef || !bossData) return null

    // Équipe RÉELLEMENT affrontée = l'équipe du boss TRONQUÉE à la taille de l'arène (run3ArenaBossTeam), PAS
    //   l'équipe entière figée. Le panneau ne doit montrer QUE les Daemons qu'on affrontera.
    const fielded = run3ArenaBossTeam(badge)
    const team: ArenaTeamMon[] = fielded.map((m, i, arr) => {
        const sp = getSpecies(m.speciesId)
        return { speciesId: m.speciesId, name: sp?.name ?? m.speciesId, level: m.level, types: sp?.types ?? [], isBoss: i === arr.length - 1 }
    })
    const levels = team.map((m) => m.level)
    // Arène "Multi" (variée) : on REPREND l'arène du RUN 2 (mêmes gardiens variés) → son thème (types de l'ACE
    // re-typé du run 2) sert de repère pour les conseils, au lieu d'un « varié » sans info.
    let guardTypeLabel = arenaDef.guardType
    let guardTypes = GUARD_TYPE_MAP[arenaDef.guardType] ?? []
    if (arenaDef.guardType === "Multi") {
        guardTypes = arenaInfo(badge, true)?.themeTypes ?? []
        guardTypeLabel = "variés (comme le run 2)"
    }
    const guardRecommend = guardTypes.length ? POKE_TYPES.filter((t) => typeEffectiveness(t, guardTypes) >= 2) : []
    const bossBestTypes = bestOffensiveTypesVs(team)
    const guards = trainersOnMap(BADGE_MAP_ID[badge]).filter((t) => !t.badge)

    return {
        badge,
        order: arenaDef.order,
        bossName: bossData.nickname,
        bossTitle: `Arène ${arenaDef.order} — gardiens ${arenaDef.guardType}`,
        bossPlayer: bossData.nickname,
        guardType: guardTypeLabel,
        guardTypes,
        guardRecommend,
        bossBestTypes,
        energyPalier: arenaDef.energy,
        // Champs ArenaInfo réutilisés par le panneau : la « couleur » de l'arène = le type des gardiens.
        themeTypes: guardTypes,
        levelMin: levels.length ? Math.min(...levels) : 0,
        levelMax: levels.length ? Math.max(...levels) : 0,
        recommend: guardRecommend,
        avoid: [],
        team,
        guardCount: guards.length,
    }
}
