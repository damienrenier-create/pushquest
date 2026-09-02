// src/lib/gamebook/yellow/data/run2Badges.ts
//
// RUN 2 (New Game+ « Le Remix du Nexus ») — HAUTS FAITS du mode FUN. Barème identique au run 1 (8 paliers ×
// médailles de rapidité), score FIGÉ au RE-SACRE (Salle Dorée, contre ton double). Réutilise `BadgeInput` +
// `badgeInputFromSave` (cf. run1Badges.ts) : la même photo de save alimente les conditions, scopée au monde RUN 2.
//
// Réf. artefact « Hauts Faits · Run 2 » (54 hauts faits, 2580 pts ×1). Les badges `todo:true` attendent une
// instrumentation dédiée (Phase 2) → posés dans l'échelle mais non gagnables (earned = false).

import type { BadgeInput } from "./run1Badges"
import { type TierFun, TIER_POINTS_FUN, TIER_EMOJI_FUN, type FunMedal, medalForRank, medalMult } from "./run1Badges"
import { getSpecies } from "./species"

// ── Helpers locaux (mêmes que run1Badges, ré-écrits pour ne pas exposer les internes) ──
const shinyCount = (i: BadgeInput) => i.mons.filter((m) => m.shiny).length
const distinctTypes = (i: BadgeInput) => new Set(i.caught.flatMap((id) => getSpecies(id)?.types ?? [])).size
const has = (i: BadgeInput, id: string) => i.caught.includes(id)
const mk = (i: BadgeInput) => i.markers ?? []
const hasMk = (i: BadgeInput, id: string) => mk(i).includes(id)

/** Les 6 panthères élémentaires (évolutions de Panthéon via la Pierre de Gékraise). */
export const PANTHER_IDS = ["pyropanthe", "aquapanthe", "voltapanthe", "florapanthe", "panthegel", "ombrapanthe"] as const
const hasAnyPanther = (i: BadgeInput) => PANTHER_IDS.some((p) => has(i, p))
const hasAllPanthers = (i: BadgeInput) => PANTHER_IDS.every((p) => has(i, p))

export interface Run2Badge {
    id: string
    label: string
    funTier: TierFun
    cat: "progression" | "collection" | "exploration" | "fusion" | "social" | "rencontres" | "shiny" | "dome"
    /** Gagné ? (photo de save run 2). */
    earned: (i: BadgeInput) => boolean
    /** Révélé dans la liste même si non gagné (sinon secret jusqu'à obtention). */
    reveal?: (i: BadgeInput) => boolean
    /** Points VARIABLES (ex. starter_ko = niveau) ; sinon barème du palier. */
    points?: (i: BadgeInput) => number
    /** Attend une instrumentation dédiée (Phase 2) → non gagnable pour l'instant, mais visible dans l'échelle. */
    todo?: boolean
}

const F = false as const

/** Les 54 hauts faits du run 2 fun. `todo` = à instrumenter (Phase 2). */
export const RUN2_BADGES: readonly Run2Badge[] = [
    // ─────────── 💎💎💎 250 — Pinacle ───────────
    { id: "r2_double", label: "Battre ton DOUBLE à la Salle Dorée (re-sacre)", funTier: "d3", cat: "progression", earned: (i) => i.isChampion },
    { id: "r2_dex_complete", label: "Pokédex du REMIX complet", funTier: "d3", cat: "collection", earned: () => F, reveal: () => true, todo: true }, // liste d'espèces run-2 à figer (Phase 2)
    { id: "r2_resacre_6shiny", label: "Re-sacre avec 6 shiny (Salle Dorée)", funTier: "d3", cat: "shiny", earned: (i) => i.isChampion === true && i.leagueSixShiny === true },

    // ─────────── 💎💎 160 — Élite ───────────
    { id: "r2_arenas5", label: "Vaincre les 5 arènes re-typées", funTier: "d2", cat: "progression", earned: (i) => i.arenaBadges >= 5 },
    { id: "r2_shiny6", label: "Capturer 6 shiny (Remix)", funTier: "d2", cat: "shiny", earned: (i) => shinyCount(i) >= 6 },
    { id: "r2_ukognos", label: "Choper UKOGNOS (le légendaire Fée)", funTier: "d2", cat: "rencontres", earned: (i) => has(i, "ukognos") },

    // ─────────── 💎 100 — Maîtrise ───────────
    { id: "r2_dex100", label: "100 Daemons différents (Remix)", funTier: "d1", cat: "collection", earned: (i) => i.caught.length >= 100 },
    { id: "r2_panthers6", label: "Réunir les 6 Panthères élémentaires", funTier: "d1", cat: "collection", earned: hasAllPanthers },
    { id: "r2_trade_shiny", label: "Échanger un shiny", funTier: "d1", cat: "social", earned: (i) => hasMk(i, "ach_trade_shiny"), reveal: () => true, todo: true }, // marqueur d'échange shiny (Phase 2)
    { id: "r2_pantheon_evo", label: "Faire évoluer Panthéon (Pierre de Gékraise)", funTier: "d1", cat: "rencontres", earned: hasAnyPanther },

    // ─────────── ⭐⭐⭐⭐⭐ 60 — Redoutable ───────────
    { id: "r2_starter_ko", label: "Ton starter du Remix au front (pts = son niveau à sa 1ʳᵉ chute)", funTier: "s5", cat: "progression", earned: (i) => (i.starterKoLevel ?? 0) > 0, points: (i) => i.starterKoLevel ?? 0 },
    { id: "r2_merorem", label: "Récupérer MEROREM au casino (alter-ego de Tonytony)", funTier: "s5", cat: "rencontres", earned: (i) => has(i, "merorem") },
    { id: "r2_ace7", label: "Battre l'ACE 7 fois (Remix)", funTier: "s5", cat: "rencontres", earned: (i) => (i.aceWins ?? 0) >= 7 },
    { id: "r2_ct_bought", label: "Acheter une CT à la boutique (Remix)", funTier: "s5", cat: "rencontres", earned: (i) => i.ctBought === true },

    // ─────────── ⭐⭐⭐⭐ 35 — Notable ───────────
    { id: "r2_dex50", label: "50 Daemons différents (Remix)", funTier: "s4", cat: "collection", earned: (i) => i.caught.length >= 50 },
    { id: "r2_types10", label: "Daemons de 10 types (Remix)", funTier: "s4", cat: "collection", earned: (i) => distinctTypes(i) >= 10 },
    { id: "r2_mirror_higher", label: "Battre un reflet de niveau cumulé SUPÉRIEUR", funTier: "s4", cat: "social", earned: (i) => i.mirrorWinHigherLevel === true },
    { id: "r2_pnj_grotte", label: "Battre un PNJ-JOUEUR du Remix (Grotte 1F)", funTier: "s4", cat: "social", earned: (i) => hasMk(i, "ach_run2ghost_win"), reveal: () => true, todo: true }, // marqueur de victoire vs run2-ghost (Phase 2)
    { id: "r2_shiny1", label: "Capturer 1 shiny (Remix)", funTier: "s4", cat: "shiny", earned: (i) => shinyCount(i) >= 1 },
    { id: "r2_gekraise", label: "Choper GÉKRAISE (le gecko Roche/Feu)", funTier: "s4", cat: "rencontres", earned: (i) => has(i, "gekraise") },
    { id: "r2_carillon", label: "Gagner le CARILLON au blackjack (CT Fée/Métal inédite)", funTier: "s4", cat: "rencontres", earned: () => F, reveal: () => true, todo: true }, // CT Carillon à créer (Phase 2)
    { id: "r2_orcaline", label: "Capturer ORCALINE sauvage (Grotte Gelée, niv 35+)", funTier: "s4", cat: "rencontres", earned: (i) => has(i, "orcaline") },
    { id: "r2_master_ball", label: "Choper la Master Ball", funTier: "s4", cat: "rencontres", earned: (i) => i.hasMasterBall === true },
    { id: "r2_grotte_gelee", label: "Franchir la Grotte Gelée (5 Frères Glaçon, Remix)", funTier: "s4", cat: "exploration", earned: (i) => hasMk(i, "ach_grotte_gelee"), reveal: () => true, todo: true }, // marqueur de traversée (Phase 2)
    { id: "r2_aqua_arena", label: "Vaincre l'Aqua Arena re-thémée EAU (Remix)", funTier: "s4", cat: "exploration", earned: (i) => hasMk(i, "aqua_arena") },

    // ─────────── ⭐⭐⭐ 20 — Aguerri ───────────
    { id: "r2_arena1", label: "Réussir une ARÈNE RE-TYPÉE", funTier: "s3", cat: "progression", earned: (i) => i.arenaBadges >= 1 },
    { id: "r2_trade_player", label: "Échanger avec un autre joueur", funTier: "s3", cat: "social", earned: (i) => (i.playerTrades ?? 0) >= 1 },
    { id: "r2_pvp", label: "Gagner un combat PvP", funTier: "s3", cat: "social", earned: (i) => (i.pvpWins ?? 0) >= 1 },
    { id: "r2_morrow", label: "Échanger un Roctaur contre MORROW (le Brocanteur)", funTier: "s3", cat: "social", earned: (i) => has(i, "morrow") },
    { id: "r2_pantheon_catch", label: "Choper Panthéon (Route Nord giga-rare, Remix)", funTier: "s3", cat: "rencontres", earned: (i) => has(i, "pantheon") || hasAnyPanther(i) },
    { id: "r2_arena_revanche", label: "Gagner une REVANCHE d'arène (équipe run-1 boostée)", funTier: "s3", cat: "rencontres", earned: (i) => hasMk(i, "ach_arena_revanche"), reveal: () => true, todo: true }, // marqueur de revanche (Phase 2)
    { id: "r2_plage_hantee", label: "Dompter la Plage HANTÉE (Spectres, Remix)", funTier: "s3", cat: "exploration", earned: (i) => hasMk(i, "ach_plage_hantee"), reveal: () => true, todo: true }, // marqueur (Phase 2)
    { id: "r2_berry_phenix_survive", label: "Un Daemon survit grâce à une Baie Phénix", funTier: "s3", cat: "rencontres", earned: () => F, reveal: () => true, todo: true }, // à créer (Phase 2)
    { id: "r2_lab_defi", label: "Compléter un défi du Labo (vrai workout)", funTier: "s3", cat: "rencontres", earned: (i) => i.labDefiDone === true },

    // ─────────── ⭐⭐ 10 — Facile ───────────
    { id: "r2_team6", label: "Reformer une équipe de 6 (Remix)", funTier: "s2", cat: "progression", earned: (i) => i.teamSize >= 6 },
    { id: "r2_dex10", label: "10 Daemons différents (Remix)", funTier: "s2", cat: "collection", earned: (i) => i.caught.length >= 10 },
    { id: "r2_types3", label: "Daemons de 3 types (Remix)", funTier: "s2", cat: "collection", earned: (i) => distinctTypes(i) >= 3 },
    { id: "r2_denicheur", label: "Échanger avec un PNJ (le Dénicheur)", funTier: "s2", cat: "social", earned: (i) => i.pnjTradeDone === true },
    { id: "r2_mirror_win", label: "Battre le reflet d'un joueur", funTier: "s2", cat: "social", earned: (i) => (i.mirrorWins ?? 0) >= 1 },
    { id: "r2_panthegel", label: "Recevoir PANTHÉGEL (Dresseur de la plaine, Remix)", funTier: "s2", cat: "rencontres", earned: (i) => has(i, "panthegel") },
    { id: "r2_fashion", label: "Personnaliser ta tenue (Fashion Victim)", funTier: "s2", cat: "rencontres", earned: (i) => i.outfitCustomized === true },
    { id: "r2_fish", label: "Ta 1ʳᵉ prise à la canne à pêche (Remix)", funTier: "s2", cat: "rencontres", earned: (i) => i.fishCaught === true },
    { id: "r2_fun_defi", label: "Réussir un défi fun de capture (Remix)", funTier: "s2", cat: "rencontres", earned: (i) => (i.funDefisDone ?? []).length >= 1 },

    // ─────────── ⭐ 5 — Premiers pas ───────────
    { id: "r2_capture1", label: "Capturer ton 1ᵉʳ Daemon du Remix", funTier: "s1", cat: "progression", earned: (i) => i.caught.length >= 1 },
    { id: "r2_evolve", label: "Faire évoluer un Daemon (Remix)", funTier: "s1", cat: "progression", earned: (i) => (i.evolutions ?? 0) >= 1 },
    { id: "r2_trainer1", label: "Battre un dresseur du Remix", funTier: "s1", cat: "progression", earned: (i) => (i.trainersBeaten ?? 0) >= 1 },
    { id: "r2_berry_soin", label: "Récolter une Baie de Soin", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_soin"), reveal: () => true, todo: true },
    { id: "r2_berry_pure", label: "Récolter une Baie Pure", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_pure"), reveal: () => true, todo: true },
    { id: "r2_berry_fougue", label: "Récolter une Baie Fougue", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_fougue"), reveal: () => true, todo: true },
    { id: "r2_berry_eclat", label: "Récolter une Baie Éclat", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_eclat"), reveal: () => true, todo: true },
    { id: "r2_berry_vive", label: "Récolter une Baie Vive", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_vive"), reveal: () => true, todo: true },
    { id: "r2_berry_roc", label: "Récolter une Baie Roc", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_roc"), reveal: () => true, todo: true },
    { id: "r2_berry_phenix", label: "Récolter une Baie Phénix", funTier: "s1", cat: "exploration", earned: (i) => hasMk(i, "ach_berry_phenix"), reveal: () => true, todo: true },
    { id: "r2_calepin", label: "Recevoir le Calepin (ACE)", funTier: "s1", cat: "rencontres", earned: (i) => i.calepinReceived === true },
]

export interface Run2BadgeState { id: string; label: string; funTier: TierFun; emoji: string; cat: string; points: number; earned: boolean; revealed: boolean; todo: boolean }
export interface Run2BadgeResult { badges: Run2BadgeState[]; totalPoints: number; earnedCount: number }

/** Évalue TOUS les hauts faits run 2 (barème 8 paliers). `points` = base SANS médaille (la médaille est appliquée
 *  au niveau du score serveur, par rang). Les badges `todo` ne comptent jamais tant qu'ils ne sont pas instrumentés. */
export function evaluateRun2Badges(i: BadgeInput): Run2BadgeResult {
    let totalPoints = 0
    let earnedCount = 0
    const badges = RUN2_BADGES.map((b) => {
        const earned = !b.todo && b.earned(i)
        const points = b.points ? Math.max(0, Math.round(b.points(i))) : TIER_POINTS_FUN[b.funTier]
        const revealed = earned || !!b.todo || (b.reveal ? b.reveal(i) : false)
        if (earned) { totalPoints += points; earnedCount++ }
        return { id: b.id, label: b.label, funTier: b.funTier, emoji: TIER_EMOJI_FUN[b.funTier], cat: b.cat, points, earned, revealed, todo: !!b.todo }
    })
    return { badges, totalPoints, earnedCount }
}

/** Score run 2 fun d'un joueur (base, sans médaille). */
export function run2BadgeScore(i: BadgeInput): number {
    return evaluateRun2Badges(i).totalPoints
}

/** Ids gagnés qui rapportent une MÉDAILLE (pour le tableau des rangs). Exclut les `todo`. */
export function run2EarnedBadgeIds(i: BadgeInput): string[] {
    return RUN2_BADGES.filter((b) => !b.todo && b.earned(i)).map((b) => b.id)
}

/** Score AVEC médaille pour un rang donné (0=or/1=argent/2=bronze/≥3=normal) : Σ palier × médaille. */
export function run2FunScoreWithMedals(i: BadgeInput, rankOf: (badgeId: string) => number): number {
    return RUN2_BADGES.reduce((sum, b) => {
        if (b.todo || !b.earned(i)) return sum
        const pts = b.points ? Math.max(0, Math.round(b.points(i))) : TIER_POINTS_FUN[b.funTier]
        const medal: FunMedal = medalForRank(rankOf(b.id))
        return sum + pts * medalMult(medal)
    }, 0)
}

/** Total maxi théorique (×1, hors `todo` non instrumentés) — pour l'affichage « X / Y pts ». */
export const RUN2_MAX_POINTS = RUN2_BADGES.reduce((s, b) => s + TIER_POINTS_FUN[b.funTier], 0)
