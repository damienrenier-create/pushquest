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

import { getSpecies, visibleDexSpecies, SPECIES, DEX_ULTRA_SECRET } from "./species"
import type { YellowSave } from "../storage/save"

/** Toutes les espèces qui SONT une forme évoluée (= cible `evolution.toId` d'une autre espèce). Posséder l'une
 *  d'elles ⇒ avoir fait évoluer un Daemon. Proxy fidèle pour le badge bronze « évoluer » : capturer une évo à
 *  l'état sauvage reste marginal en run 1, et le badge ne vaut que 5 pts. Calculé une fois. */
const EVOLVED_FORMS: ReadonlySet<string> = new Set(
    Object.values(SPECIES).map((sp) => (sp as { evolution?: { toId?: string } }).evolution?.toId).filter((x): x is string => !!x),
)

export type BadgeTier = "bronze" | "silver" | "gold" | "diamond" | "legend"
export const TIER_POINTS: Record<BadgeTier, number> = { bronze: 5, silver: 15, gold: 30, diamond: 75, legend: 150 }
export const TIER_EMOJI: Record<BadgeTier, string> = { bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎", legend: "🌟" }

/** Ensemble des espèces requises pour le badge « Pokédex run 1 complet ». Les légendaires ULTRA-SECRETS
 *  (DEX_ULTRA_SECRET : MégamonarX/Galijah, obtention hors-normes) en sont EXCLUS — ils restent dans le Pokédex
 *  (cartes « ??? » capturables) mais ne bloquent pas la complétion. Calculé une fois. */
const RUN1_SPECIES: readonly string[] = visibleDexSpecies([], false, false, false).map((s) => s.id).filter((id) => !DEX_ULTRA_SECRET.has(id))
export const RUN1_DEX_TOTAL = RUN1_SPECIES.length // 141
const PANTHEON_EVOS = ["pyropanthe", "aquapanthe", "voltapanthe", "florapanthe", "panthegel", "ombrapanthe"]
// Lignée Gékroc — les 5 Geckos élémentaires (miroir de GECKO_IDS dans fusionSpecies.ts). Inliné en littéral pour
// garder ce module PUR (pas d'import de données lourdes). Collectionner les 5 = un vrai haut fait de complétion.
const GECKO_IDS = ["gekroc", "gekraise", "gekosmic", "geckebre", "geaucke"]

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
    // ── zones & systèmes RUN 1 (dérivés directs de la save : defeatedTrainers / pnj5Wins / fusionHistory) ──
    markers?: readonly string[]   // save.defeatedTrainers (marqueurs d'événement + ids de dresseurs battus)
    pnj5Wins?: number             // victoires sur le Gardien du Nexus (descente de la Grotte)
    fusionsCreated?: number       // fusionHistory.length (fusions créées à l'Autel)
    // ── side quests « plaisir » (dérivés DIRECTS de la save → rétroactifs, aucun nouveau champ save) ──
    pokerPlayed?: boolean         // pokerFirstGameDone (a joué au moins une partie de poker)
    heldItemEquipped?: boolean    // un Daemon (équipe ou PC) porte un objet tenu
    giftCts?: number              // ownedCts.length (CT-cadeaux/trophées de boss possédées)
}

const shinyCount = (i: BadgeInput) => i.mons.filter((m) => m.shiny).length
const distinctTypes = (i: BadgeInput) => new Set(i.caught.flatMap((id) => getSpecies(id)?.types ?? [])).size
const has = (i: BadgeInput, id: string) => i.caught.includes(id)
const sawAny = (i: BadgeInput, ...ids: string[]) => ids.some((id) => i.seen.includes(id) || i.caught.includes(id))

// Marqueurs de save.defeatedTrainers, inlinés en LITTÉRAUX pour garder ce module PUR (pas d'import de stores/data
// lourds). Sources : gameStore (MERCHANT/B2F), fusiodex.ts (AUTEL_VISITED_MARKER), fusionLeague.ts (FUSION_UNLOCK/
// FUSION_TIER), trainers.ts + battleStore.GLACON_BROTHERS, trainers.ts (plage y_plage_*, aqua y_aqua_*).
const MK_MERCHANT = "y_combat_merchant_intro"
const MK_NEXUS_B2F = "y_pnj3_grotte_b2f"
const MK_AUTEL = "autel_visited"
const MK_FUSION_UNLOCK = "fusion_unlocked"
const MK_FUSION_OR = "fusleague_or"
const MK_FUSION_TIERS: readonly string[] = ["fusleague_bronze", "fusleague_argent", "fusleague_or"]
const FRERES_GLACON: readonly string[] = ["y_frere_frisquet", "y_frere_grelot", "y_frere_glagla", "y_frere_givre", "y_frere_blizzard"]
const PLAGE_TRAINERS: readonly string[] = ["y_plage_pecheur", "y_plage_nageuse", "y_plage_marin"]
const AQUA_MOBS: readonly string[] = ["y_aqua_n1", "y_aqua_n2", "y_aqua_n3", "y_aqua_n4"]
const AQUA_BOSSES: readonly string[] = ["y_aqua_boss_a", "y_aqua_boss_b"]
const mk = (i: BadgeInput) => i.markers ?? []
const hasMk = (i: BadgeInput, id: string) => mk(i).includes(id)
const hasAllMk = (i: BadgeInput, ids: readonly string[]) => ids.every((id) => mk(i).includes(id))
const hasAnyMk = (i: BadgeInput, ids: readonly string[]) => ids.some((id) => mk(i).includes(id))

export interface BadgeDef {
    id: string
    label: string
    tier: BadgeTier
    secret: boolean
    cat: "progression" | "collection" | "exploration" | "fusion" | "social" | "special" | "shiny" | "dome"
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

    // ── ⑦ EXPLORATION — zones du run 1 (🔒 révélées à la découverte de la zone) ──
    { id: "grotte_nexus", label: "Découvrir la Grotte du Nexus", tier: "bronze", secret: true, cat: "exploration", earned: (i) => hasMk(i, MK_MERCHANT), reveal: (i) => hasMk(i, MK_MERCHANT) },
    { id: "nexus_guardian", label: "Vaincre le Gardien du Nexus", tier: "silver", secret: true, cat: "exploration", earned: (i) => (i.pnj5Wins ?? 0) >= 1, reveal: (i) => hasMk(i, MK_MERCHANT) || (i.pnj5Wins ?? 0) >= 1 },
    { id: "nexus_deep", label: "Atteindre le fond de la Grotte (B2F)", tier: "gold", secret: true, cat: "exploration", earned: (i) => hasMk(i, MK_NEXUS_B2F), reveal: (i) => (i.pnj5Wins ?? 0) >= 1 || hasMk(i, MK_NEXUS_B2F) },
    { id: "ice_cave", label: "Franchir la Grotte Gelée (5 Frères Glaçon)", tier: "gold", secret: true, cat: "exploration", earned: (i) => hasAllMk(i, FRERES_GLACON), reveal: (i) => hasAnyMk(i, FRERES_GLACON) },
    { id: "beach", label: "Dompter la Plage", tier: "silver", secret: true, cat: "exploration", earned: (i) => hasAllMk(i, PLAGE_TRAINERS), reveal: (i) => hasAnyMk(i, PLAGE_TRAINERS) },
    { id: "aqua_arena", label: "Vaincre le boss de l'Aqua Arena", tier: "gold", secret: true, cat: "exploration", earned: (i) => hasAnyMk(i, AQUA_BOSSES), reveal: (i) => hasAnyMk(i, AQUA_MOBS) || hasAnyMk(i, AQUA_BOSSES) },

    // ── ⑧ FUSION — Autel de la Chimère (🔒 se greffe à la 1ʳᵉ visite de l'Autel) ──
    { id: "fusion_first", label: "Créer ta 1ʳᵉ fusion", tier: "silver", secret: true, cat: "fusion", earned: (i) => (i.fusionsCreated ?? 0) >= 1, reveal: (i) => hasMk(i, MK_AUTEL) || (i.fusionsCreated ?? 0) >= 1 },
    { id: "fusion_league", label: "Débloquer la Ligue de Fusion", tier: "gold", secret: true, cat: "fusion", earned: (i) => hasMk(i, MK_FUSION_UNLOCK), reveal: (i) => (i.fusionsCreated ?? 0) >= 1 || hasMk(i, MK_AUTEL) || hasMk(i, MK_FUSION_UNLOCK) },
    { id: "fusion_champion", label: "Maître de la Chimère (Ligue de Fusion vaincue)", tier: "diamond", secret: true, cat: "fusion", earned: (i) => hasAnyMk(i, MK_FUSION_TIERS), reveal: (i) => hasMk(i, MK_FUSION_UNLOCK) || hasAnyMk(i, MK_FUSION_TIERS) },
    { id: "fusion_gold", label: "Champion OR de la Ligue de Fusion", tier: "legend", secret: true, cat: "fusion", earned: (i) => hasMk(i, MK_FUSION_OR), reveal: (i) => hasAnyMk(i, MK_FUSION_TIERS) },

    // ── ⑨ SIDE QUESTS « plaisir » (🔒 révélées à la réalisation) : baies, poker, objet tenu, CT-cadeau ──
    { id: "berries", label: "Percer le secret des baies", tier: "silver", secret: true, cat: "exploration", earned: (i) => i.berrySecretKnown, reveal: (i) => i.berrySecretKnown },
    { id: "poker", label: "Jouer une partie de poker", tier: "bronze", secret: true, cat: "special", earned: (i) => i.pokerPlayed === true, reveal: (i) => i.pokerPlayed === true },
    { id: "held_item", label: "Équiper un objet tenu à un Daemon", tier: "silver", secret: true, cat: "special", earned: (i) => i.heldItemEquipped === true, reveal: (i) => i.heldItemEquipped === true },
    { id: "gift_ct", label: "Obtenir une CT-cadeau (trophée de boss)", tier: "silver", secret: true, cat: "special", earned: (i) => (i.giftCts ?? 0) >= 1, reveal: (i) => (i.giftCts ?? 0) >= 1 },

    // ── ⑩ COLLECTIONS de lignées — réunir toute une famille (🔒 révélées dès qu'on croise la famille) ──
    { id: "geckos_all", label: "Réunir les 5 Geckos élémentaires", tier: "gold", secret: true, cat: "collection", earned: (i) => GECKO_IDS.every((id) => has(i, id)), reveal: (i) => sawAny(i, ...GECKO_IDS) },
    { id: "panthers_all", label: "Réunir les 6 Panthères élémentaires", tier: "diamond", secret: true, cat: "collection", earned: (i) => PANTHEON_EVOS.every((id) => has(i, id)), reveal: (i) => sawAny(i, "pantheon", ...PANTHEON_EVOS) },
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
        // ── compteurs « propres » (Phase 2) ──
        // Évoluer : DÉRIVÉ (posséder une forme évoluée, team+PC) → pas de nouveau champ save. Casino : DÉRIVÉ de
        //   labDefi.casinoTotalWon (déjà persisté). Les 2 sont rétro-actifs (créditent l'existant, additif).
        evolutions: mons.some((m) => EVOLVED_FORMS.has(m.speciesId)) ? 1 : 0,
        casinoWins: (s.labDefi?.casinoTotalWon ?? 0) > 0 ? 1 : 0,
        // Ligue 6-shiny & reflet niveau-sup : ÉVÉNEMENTS non reconstituables → champs save posés au moment T.
        leagueSixShiny: s.leagueSixShiny === true,
        mirrorWinHigherLevel: s.mirrorWinHigherLevel === true,
        // ── zones & systèmes RUN 1 : dérivés DIRECTS de la save (rétroactifs + additifs, aucun nouveau champ) ──
        markers: s.defeatedTrainers ?? [],
        pnj5Wins: s.pnj5Wins ?? 0,
        fusionsCreated: (s.fusionHistory ?? []).length,
        // ── side quests « plaisir » : dérivés DIRECTS de la save (rétroactifs, aucun nouveau champ) ──
        pokerPlayed: s.pokerFirstGameDone === true,
        heldItemEquipped: mons.some((m) => !!m.heldItem),
        giftCts: (s.ownedCts ?? []).length,
    }
}
