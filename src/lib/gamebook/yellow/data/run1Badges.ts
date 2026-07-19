// src/lib/gamebook/yellow/data/run1Badges.ts
//
// RUN 1 — DÉCOUVERTE : système de BADGES-HAUTS FAITS (distinct des 5 badges d'arène de data/badges.ts).
// Le classement run 1 = Σ des points des badges gagnés. Module PUR (React-free, importable côté serveur pour
// le leaderboard PULL). Barème à 5 tiers.
//
// DÉVOILEMENT PROGRESSIF (anti-spoiler) :
//   - OBJECTIF (secret=false) : grisé dès le départ (but attendu de tout RPG). Toujours "révélé".
//   - SECRET  (secret=true)   : caché tant que non "révélé" (reveal()). Le badge n'apparaît qu'à la RENCONTRE
//     du contenu (ex. « Choper Gékroc » se révèle dès que Gékroc est VU). Ainsi tout le Dôme se greffe plus tard.
//
// Beaucoup de checks lisent des données DÉJÀ traquées (pokédex, flags, stats). Les quelques compteurs à
// INSTRUMENTER (évolutions, échange joueur, shiny échangé, duel niveau-sup, casino/pari, ligue 6-shiny…) sont
// des champs OPTIONNELS de BadgeInput — le badge reste simplement non-gagné tant qu'ils valent 0/false.

import { getSpecies, visibleDexSpecies } from "./species"
import type { YellowSave } from "../storage/save"

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond" | "legend"
export const TIER_POINTS: Record<BadgeTier, number> = { bronze: 5, silver: 15, gold: 30, diamond: 75, legend: 150 }
export const TIER_EMOJI: Record<BadgeTier, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎", legend: "🌟" }

/** Ensemble des espèces capturables en RUN 1 (pour le badge « Pokédex run 1 complet »). Calculé une fois. */
const RUN1_SPECIES: readonly string[] = visibleDexSpecies([], false, false, false).map((s) => s.id)
export const RUN1_DEX_TOTAL = RUN1_SPECIES.length // 141
const PANTHEON_EVOS = ["pyropanthe", "aquapanthe", "voltapanthe", "florapanthe", "panthegel", "ombrapanthe"]

/** Données (issues d'UNE save) nécessaires pour évaluer TOUS les badges. Pur → pas de store. */
export interface BadgeInput {
    caught: readonly string[]                          // pokedex.caught (ids d'espèces)
    seen: readonly string[]                            // pokedex.seen (conditions de révélation des secrets)
    mons: readonly { level: number; shiny?: boolean; speciesId?: string }[] // équipe + PC (shiny, niv 100)
    teamSize: number
    arenaBadges: number                                // save.badges.length (0-5)
    isChampion: boolean
    trainersBeaten: number                             // defeatedTrainers.length
    mirrorWins: number                                 // stats.duelWinsTotal (reflets battus)
    pvpWins: number
    aceWins: number
    domeChampionships: number
    gekrocResolved: boolean
    orcalineWins: number
    sylvebarbeAwake: boolean
    pnjTradeDone: boolean                              // caveTradeDone (échange PNJ)
    hhCollectorWins: number                            // collectionneur de spectres
    sbireWins: number
    hasMasterBall: boolean
    labDefiDone: boolean                               // un défi du Labo (workout réel) complété
    berrySecretKnown: boolean
    // ── à INSTRUMENTER (optionnels, défaut non-gagné) ──
    evolutions?: number
    playerTrades?: number
    shinyTraded?: number
    mirrorWinHigherLevel?: boolean
    betWins?: number
    casinoWins?: number
    leagueSixShiny?: boolean
    ctLearned?: boolean
}

const shinyCount = (i: BadgeInput) => i.mons.filter((m) => m.shiny).length
const distinctTypes = (i: BadgeInput) => new Set(i.caught.flatMap((id) => getSpecies(id)?.types ?? [])).size
const has = (i: BadgeInput, id: string) => i.caught.includes(id)
const sawAny = (i: BadgeInput, ...ids: string[]) => ids.some((id) => i.seen.includes(id) || i.caught.includes(id))

export interface BadgeDef {
    id: string
    label: string
    tier: BadgeTier
    secret: boolean
    cat: "progression" | "collection" | "social" | "special" | "shiny" | "dome"
    earned: (i: BadgeInput) => boolean
    /** SECRET uniquement : révélé (grisé apparaît) quand vrai. Défaut = earned() (apparaît en même temps qu'obtenu). */
    reveal?: (i: BadgeInput) => boolean
}

export const BADGES: readonly BadgeDef[] = [
    // ── ① Progression (objectifs) ──
    { id: "first_catch", label: "Capturer ton 1ᵉʳ Daemon", tier: "bronze", secret: false, cat: "progression", earned: (i) => i.caught.length >= 1 },
    { id: "evolve", label: "Faire évoluer un Daemon", tier: "bronze", secret: false, cat: "progression", earned: (i) => (i.evolutions ?? 0) >= 1 },
    { id: "beat_trainer", label: "Battre un dresseur", tier: "bronze", secret: false, cat: "progression", earned: (i) => i.trainersBeaten >= 1 },
    { id: "full_team", label: "Remplir ton équipe (6 Daemons)", tier: "bronze", secret: false, cat: "progression", earned: (i) => i.teamSize >= 6 },
    { id: "beat_arena", label: "Battre une arène", tier: "silver", secret: false, cat: "progression", earned: (i) => i.arenaBadges >= 1 },
    { id: "all_arenas", label: "Battre les 5 arènes", tier: "diamond", secret: false, cat: "progression", earned: (i) => i.arenaBadges >= 5 },
    { id: "champion", label: "Battre la Ligue (être sacré)", tier: "diamond", secret: false, cat: "progression", earned: (i) => i.isChampion },

    // ── ② Collection ──
    { id: "types3", label: "Capturer des Daemons de 3 types", tier: "silver", secret: false, cat: "collection", earned: (i) => distinctTypes(i) >= 3 },
    { id: "types10", label: "Capturer des Daemons de 10 types", tier: "gold", secret: false, cat: "collection", earned: (i) => distinctTypes(i) >= 10 },
    { id: "dex10", label: "Avoir 10 Daemons différents", tier: "silver", secret: false, cat: "collection", earned: (i) => i.caught.length >= 10 },
    { id: "dex50", label: "Avoir 50 Daemons différents", tier: "gold", secret: false, cat: "collection", earned: (i) => i.caught.length >= 50 },
    { id: "dex100", label: "Avoir 100 Daemons différents", tier: "diamond", secret: false, cat: "collection", earned: (i) => i.caught.length >= 100 },
    { id: "dex_run1", label: `Pokédex run 1 COMPLET (${RUN1_DEX_TOTAL})`, tier: "legend", secret: false, cat: "collection", earned: (i) => RUN1_SPECIES.every((id) => i.caught.includes(id)) },

    // ── ③ Social & échanges ──
    { id: "trade_pnj", label: "Échanger avec un PNJ", tier: "silver", secret: false, cat: "social", earned: (i) => i.pnjTradeDone },
    { id: "trade_player", label: "Échanger avec un autre joueur", tier: "gold", secret: false, cat: "social", earned: (i) => (i.playerTrades ?? 0) >= 1 },
    { id: "beat_mirror", label: "Battre le reflet d'un joueur", tier: "silver", secret: false, cat: "social", earned: (i) => i.mirrorWins >= 1 },
    { id: "beat_mirror_higher", label: "Battre un reflet au niveau cumulé SUPÉRIEUR", tier: "gold", secret: false, cat: "social", earned: (i) => i.mirrorWinHigherLevel === true },
    { id: "pvp_win", label: "Gagner un combat PvP", tier: "silver", secret: false, cat: "social", earned: (i) => i.pvpWins >= 1 },

    // ── ④ Rencontres spéciales & secrets (🔒 révélés à la rencontre) ──
    { id: "pantheon", label: "Choper Panthéon", tier: "silver", secret: true, cat: "special", earned: (i) => has(i, "pantheon"), reveal: (i) => sawAny(i, "pantheon") },
    { id: "pantheon_evo", label: "Faire évoluer Panthéon", tier: "gold", secret: true, cat: "special", earned: (i) => PANTHEON_EVOS.some((id) => has(i, id)), reveal: (i) => sawAny(i, "pantheon", ...PANTHEON_EVOS) },
    { id: "gekroc", label: "Choper Gékroc", tier: "gold", secret: true, cat: "special", earned: (i) => i.gekrocResolved || has(i, "gekroc"), reveal: (i) => sawAny(i, "gekroc") || i.gekrocResolved },
    { id: "manoir_surprise", label: "Trouver la surprise du Manoir Hanté", tier: "gold", secret: true, cat: "special", earned: (i) => i.hhCollectorWins >= 1, reveal: (i) => i.hhCollectorWins >= 1 },
    { id: "orcaline", label: "Choper Orcaline", tier: "silver", secret: true, cat: "special", earned: (i) => has(i, "orcaline") || i.orcalineWins >= 1, reveal: (i) => sawAny(i, "orcaline") || i.orcalineWins >= 1 },
    { id: "masterball", label: "Choper la Master Ball", tier: "gold", secret: true, cat: "special", earned: (i) => i.hasMasterBall, reveal: (i) => i.hasMasterBall },
    { id: "tonytony", label: "Choper Tonytony", tier: "diamond", secret: true, cat: "special", earned: (i) => has(i, "tonytony"), reveal: (i) => sawAny(i, "tonytony") },
    { id: "goshendofy", label: "Choper Goshendofy", tier: "legend", secret: true, cat: "special", earned: (i) => has(i, "goshendofy"), reveal: (i) => sawAny(i, "goshendofy") },
    { id: "sylvebarbe", label: "Réveiller & battre Sylvebarbe", tier: "gold", secret: true, cat: "special", earned: (i) => i.sylvebarbeAwake, reveal: (i) => i.sylvebarbeAwake },
    { id: "sbire", label: "Battre le Sbire", tier: "bronze", secret: true, cat: "special", earned: (i) => i.sbireWins >= 1, reveal: (i) => i.sbireWins >= 1 },
    { id: "ace1", label: "Battre l'ACE (ton rival)", tier: "silver", secret: true, cat: "special", earned: (i) => i.aceWins >= 1, reveal: (i) => i.aceWins >= 1 },
    { id: "ace7", label: "Battre l'ACE 7 fois", tier: "diamond", secret: true, cat: "special", earned: (i) => i.aceWins >= 7, reveal: (i) => i.aceWins >= 1 },
    { id: "lab_defi", label: "Compléter un défi du Labo (vrai workout)", tier: "gold", secret: true, cat: "special", earned: (i) => i.labDefiDone, reveal: (i) => i.labDefiDone || i.berrySecretKnown },
    { id: "level100", label: "Amener un Daemon au niveau 100", tier: "diamond", secret: true, cat: "special", earned: (i) => i.mons.some((m) => m.level >= 100), reveal: (i) => i.mons.some((m) => m.level >= 90) },
    { id: "bet_win", label: "Gagner un pari", tier: "silver", secret: true, cat: "special", earned: (i) => (i.betWins ?? 0) >= 1, reveal: (i) => (i.betWins ?? 0) >= 1 },
    { id: "casino_win", label: "Gagner au casino", tier: "silver", secret: true, cat: "special", earned: (i) => (i.casinoWins ?? 0) >= 1, reveal: (i) => (i.casinoWins ?? 0) >= 1 },

    // ── ⑤ Shiny — le prestige ──
    { id: "shiny1", label: "Capturer 1 shiny", tier: "gold", secret: false, cat: "shiny", earned: (i) => shinyCount(i) >= 1 },
    { id: "shiny6", label: "Capturer 6 shiny", tier: "legend", secret: false, cat: "shiny", earned: (i) => shinyCount(i) >= 6 },
    { id: "shiny_trade", label: "Échanger un shiny", tier: "diamond", secret: false, cat: "shiny", earned: (i) => (i.shinyTraded ?? 0) >= 1 },
    { id: "league_6shiny", label: "Battre la Ligue avec 6 shiny", tier: "legend", secret: false, cat: "shiny", earned: (i) => i.leagueSixShiny === true },

    // ── ⑥ DÔME (🔒 se greffe à la découverte du Dôme) ──
    { id: "dome_bronze", label: "Gagner ta 1ʳᵉ couronne au Dôme", tier: "silver", secret: true, cat: "dome", earned: (i) => i.domeChampionships >= 1, reveal: (i) => i.domeChampionships >= 1 },
    { id: "dome_gold", label: "Décrocher le titre OR au Dôme", tier: "diamond", secret: true, cat: "dome", earned: (i) => i.domeChampionships >= 3, reveal: (i) => i.domeChampionships >= 1 },
]

export interface BadgeState { id: string; tier: BadgeTier; points: number; earned: boolean; revealed: boolean }
export interface BadgeResult { badges: BadgeState[]; totalPoints: number; earnedCount: number }

/** Évalue TOUS les badges pour une save → état par badge + score total (= Σ points des badges gagnés). Pur. */
export function evaluateBadges(i: BadgeInput): BadgeResult {
    let totalPoints = 0, earnedCount = 0
    const badges = BADGES.map((b) => {
        const earned = b.earned(i)
        const revealed = !b.secret || earned || (b.reveal ? b.reveal(i) : false)
        const points = TIER_POINTS[b.tier]
        if (earned) { totalPoints += points; earnedCount++ }
        return { id: b.id, tier: b.tier, points, earned, revealed }
    })
    return { badges, totalPoints, earnedCount }
}

/** Score run 1 (= total des points de badges). Séparé pour l'usage leaderboard. */
export function badgeScore(i: BadgeInput): number {
    return evaluateBadges(i).totalPoints
}

/** Construit le BadgeInput depuis une YellowSave (monde run 1). `caught` peut être surchargé (run-scopé : la bulle
 *  de rejeu ou un run-1 gelé passent caughtThisRun ; sinon le pokédex global sert de défaut). Champs manquants tolérés. */
export function badgeInputFromSave(s: Partial<YellowSave>, caught?: readonly string[]): BadgeInput {
    const mons = [...(s.team ?? []), ...(s.pc ?? [])]
    return {
        caught: caught ?? s.pokedex?.caught ?? [],
        seen: s.pokedex?.seen ?? [],
        mons: mons.map((m) => ({ level: m.level, shiny: m.shiny, speciesId: m.speciesId })),
        teamSize: (s.team ?? []).length,
        arenaBadges: (s.badges ?? []).length,
        isChampion: s.isChampion === true,
        trainersBeaten: (s.defeatedTrainers ?? []).length,
        mirrorWins: s.stats?.duelWinsTotal ?? 0,
        pvpWins: s.pvpStats?.wins ?? 0,
        aceWins: s.aceWins ?? 0,
        domeChampionships: s.domeChampionships ?? 0,
        gekrocResolved: s.gekrocResolved === true,
        orcalineWins: s.orcalineWins ?? 0,
        sylvebarbeAwake: s.sylvebarbeAwake === true,
        pnjTradeDone: s.caveTradeDone === true,
        hhCollectorWins: s.hhCollectorWins ?? 0,
        sbireWins: s.sbireWinsTotal ?? 0,
        hasMasterBall: (s.items?.["master_ball"] ?? 0) > 0,
        labDefiDone: s.labDefi?.squat150Done === true,
        berrySecretKnown: s.berrySecretKnown === true,
    }
}
