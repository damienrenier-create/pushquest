// src/lib/gamebook/yellow/data/arenaInfos.ts
//
// Infos STRATÉGIQUES calculées automatiquement pour chaque arène (pour le carrousel pré-arène).
// Tout est dérivé des données (trainers.ts + typeChart + species) → valable en RUN 1 ET en RUN 2
// (où les équipes sont re-typées via NGPLUS_ARENA_TEAMS). Aucune donnée en dur à maintenir.

import { trainersOnMap, type TrainerMonSpec } from "./trainers"
import { NGPLUS_ARENA_TEAMS } from "./ngplusArenas"
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
