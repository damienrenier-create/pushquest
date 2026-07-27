// src/lib/gamebook/yellow/admin/progressionRecipe.ts
//
// SUPER-ADMIN — GÉNÉRATEUR DE PROGRESSION (outil de test).
//
// Décompose la YellowSave (cf. storage/save.ts) en une « RECETTE » de cases à cocher :
// run visé (1/2/3), arènes conquises, Ligue, équipe de Daemons, sac, déblocages. Puis
// REFABRIQUE une save complète et cohérente à partir de cette recette → on peut rejouer
// n'importe quel point du jeu en 3 clics, autant de fois qu'on veut.
//
// PUR / React-free / sans fetch et sans `Date.now()` implicite (l'horodatage est passé en
// option) → déterministe et testable. L'UI (app/gamebook/yellow/admin) ne fait que POSTer
// le résultat sur /api/gamebook/yellow/save, qui re-sanitize tout via parseSave().
//
// MULTI-MONDES : viser le run 2 (resp. 3) exige des mondes ANTÉRIEURS crédibles — le moteur
// gate `startNewGamePlus`/`startRun3` sur isChampion/ngplusUsed. On fabrique donc les mondes
// amont « terminés » (run 1 champion, puis run 2 champion) et on met la recette dans le monde
// ACTIF, exactement comme le fait saveManager.

import { emptySave, emptyYellowStats, type YellowSave, type ChampionMon } from "../storage/save"
import { emptyLabDefi } from "../data/labDefis"
import { TRAINERS } from "../data/trainers"
import { trainerBoost } from "../data/trainers"
import { RUN3_ARENAS } from "../data/run3Arenas"
import { getBadge } from "../data/badges"
import { BADGE_REPS_CAP_BONUS } from "../data/badges"
import { CTS, type BadgeId } from "../data/cts"
import { ITEMS } from "../data/items"
import { SPECIES, getSpecies } from "../data/species"
import { getMove } from "../data/moves"
import { createMonInstance } from "../battle/factory"
import { fullStats } from "../battle/stats"
import type { MonInstance, SpeciesData, StatKey } from "../battle/types"

// ─────────────────────────────────────────────────────────────────────────────
// 1. Le vocabulaire de la recette
// ─────────────────────────────────────────────────────────────────────────────

/** Run (= monde) dans lequel on veut atterrir. */
export type RunTarget = "run1" | "run2" | "run3"
/** Vivier d'espèces pour l'équipe générée. */
export type TeamPool = "starters" | "roster" | "run3" | "all"
/** Entraînement (EV + points Saiyan) appliqué à chaque Daemon généré — réutilise trainerBoost. */
export type TeamBoost = "none" | "guard" | "elite"
/** Garniture du sac. */
export type BagPreset = "none" | "basic" | "full"

export interface TeamRecipe {
    /** Nombre de Daemons dans l'équipe (0..6). */
    count: number
    /** Niveau de chaque Daemon (1..100). */
    level: number
    pool: TeamPool
    /** Tous chromatiques (IV parfaits inclus). */
    shiny: boolean
    boost: TeamBoost
    /** Faire évoluer chaque Daemon jusqu'au stade NATUREL de son niveau (évolutions par niveau). */
    evolve: boolean
    /** Daemons supplémentaires versés au PC (0..30). */
    pcCount: number
}

export interface ProgressionRecipe {
    run: RunTarget
    /** Arènes CONQUISES : badge gagné + gardes et boss battus + CT-cadeau du boss. */
    arenas: BadgeId[]
    /** Revanches (rematch) des gardes + boss des arènes cochées → débloque les rematchs de boss. */
    arenaRematches: boolean
    /** PNJ hors arène/Ligue battus (oui/non global) : les dresseurs de route + les PNJ « spéciaux »
     *  à compteur ou one-shot (sbire, ACE, Orcaline, PNJ 5, collectionneur de spectres, Dénicheur,
     *  gamin, Mimimoy). Cf. markRouteNpcsBeaten. */
    routeTrainers: boolean
    /** Conseil des 4 battu (la Ligue est ouverte au Maître). */
    conseil: boolean
    /** LE MAÎTRE battu → Champion (Hall of Fame + post-game). */
    champion: boolean
    team: TeamRecipe
    /** Énergie (reps) en réserve. Le plafond est calculé (badges / run). */
    reps: number
    bag: BagPreset
    /** Toutes les CT possédées (dont les cadeaux/labo). */
    allCts: boolean
    /** Objets clés : Daemonflûte, Pierre Gékroc, Noyau de Métal, torche, repousses. */
    keyItems: boolean
    /** Pokédex complet (vu + capturé sur tout le catalogue). */
    dexComplete: boolean
    /** Saute les cinématiques/cadeaux one-shot (intro, Gène, roulette, cadeaux d'énergie). */
    skipCinematics: boolean
    /** Sylvebarbe réveillé → sortie sud de Ville Jaune (Zone de Combat). */
    sylvebarbe: boolean
    /** Secret des baies connu → récolte des arbres. */
    berrySecret: boolean
    /** Gékroc résolu (mini-boss de la Centrale). */
    gekroc: boolean
    /** Titres du DÔME de Combat (pilote le tier max). */
    domeChampionships: number
    /** Graine du tirage d'espèces (déterministe : même graine = même équipe). */
    seed: number
}

/** Une arène = un badge, une carte, un boss et ses gardes. Dérivé des données (aucune liste en dur). */
export interface ArenaStep {
    order: number
    badge: BadgeId
    label: string
    mapId: string
    bossId: string
    bossName: string
    guardIds: string[]
    /** CT-cadeau remise par le boss à sa victoire. */
    giftCt?: string
}

/** Les 5 arènes dans l'ORDRE DE JEU (source : RUN3_ARENAS = ordre canonique + mapId + badge). */
export const ARENA_STEPS: ArenaStep[] = RUN3_ARENAS.map((a) => {
    const inMap = TRAINERS.filter((t) => t.mapId === a.mapId)
    const boss = inMap.find((t) => t.id === a.bossTrainerId)
    return {
        order: a.order,
        badge: a.badge as BadgeId,
        label: `Arène ${a.order} · ${getBadge(a.badge as BadgeId)?.label ?? a.badge}`,
        mapId: a.mapId,
        bossId: a.bossTrainerId,
        bossName: boss?.name ?? a.bossTrainerId,
        guardIds: inMap.filter((t) => t.id !== a.bossTrainerId).map((t) => t.id),
        giftCt: boss?.giftCt,
    }
})

const ARENA_MAP_IDS = new Set(ARENA_STEPS.map((a) => a.mapId))

/** Conseil des 4, dans l'ordre de la Ligue. */
export const LIGUE_COUNCIL_IDS = ["y_ligue_1_olga", "y_ligue_2_aldo", "y_ligue_3_agatha", "y_ligue_4_peter"] as const
export const LIGUE_MASTER_ID = "y_ligue_maitre"

/** Dresseurs « de route » : tout ce qui n'est ni une arène, ni la Ligue, ni la Ligue de Fusion. */
export const ROUTE_TRAINER_IDS: string[] = TRAINERS
    .filter((t) => !ARENA_MAP_IDS.has(t.mapId) && !t.id.startsWith("y_ligue_") && !t.id.startsWith("y_fusion_"))
    .map((t) => t.id)

/** CT-trophée du collectionneur de spectres (accordée à 3 victoires + 3 spectres, cf. recordHhCollectorWin). */
const HH_COLLECTOR_CT = "ct26"

/** 3 espèces SPECTRE distinctes — ce que le collectionneur de spectres exige d'avoir vu (hhSpectresShown). */
const SPECTRE_SAMPLE: string[] = Object.values(SPECIES)
    .filter((s) => s.types.includes("SPECTRE"))
    .slice(0, 3)
    .map((s) => s.id)

// ─────────────────────────────────────────────────────────────────────────────
// 2. Viviers d'espèces + tirage déterministe
// ─────────────────────────────────────────────────────────────────────────────

/** Espèces qui sont le RÉSULTAT d'une évolution → tout le reste est un stade de BASE. */
const EVOLVED_INTO = new Set(Object.values(SPECIES).map((s) => s.evolution?.toId).filter((x): x is string => !!x))

function baseSpeciesIds(pool: TeamPool): string[] {
    if (pool === "starters") return ["feuillichot", "gouttiny", "braisille"]
    if (pool === "run3") return ["elefer", "cornaive", "coccipoing"]
    const bases = Object.values(SPECIES).filter((s) => !EVOLVED_INTO.has(s.id))
    // "roster" = le vivier LISIBLE du run 1 (pas de créature réservée à un run ultérieur / au post-Ligue).
    const keep = pool === "all" ? bases : bases.filter((s) => !s.runThreeOnly && !s.runTwoOnly && !s.postLeague)
    return keep.map((s) => s.id)
}

/** LCG minuscule (déterministe) — évite Math.random() pour que la même recette donne la même équipe. */
function lcg(seed: number): () => number {
    let s = (Math.floor(Math.abs(seed)) % 2147483647) || 1
    return () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646 }
}

/** Stade NATUREL d'une espèce à ce niveau : suit la chaîne d'évolution PAR NIVEAU (pas les pierres/échanges). */
export function evolvedForLevel(baseId: string, level: number): string {
    let cur = getSpecies(baseId)
    if (!cur) return baseId
    // Borne de sécurité : une chaîne canonique fait 3 stades, 8 tours suffisent largement (anti-cycle).
    for (let i = 0; i < 8; i++) {
        const evo = cur.evolution
        if (!evo || evo.method.kind !== "LEVEL" || level < (evo.method.level ?? 999)) break
        const next = getSpecies(evo.toId)
        if (!next) break
        cur = next
    }
    return cur.id
}

/** Fabrique `count` Daemons selon la recette (déterministe à graine égale). */
function buildTeam(t: TeamRecipe, count: number, rnd: () => number): MonInstance[] {
    const pool = baseSpeciesIds(t.pool)
    if (!pool.length || count <= 0) return []
    const level = Math.max(1, Math.min(100, Math.floor(t.level)))
    const out: MonInstance[] = []
    for (let i = 0; i < count; i++) {
        // Tirage sans doublon tant que le vivier le permet (au-delà, on autorise les répétitions).
        const base = pool[Math.floor(rnd() * pool.length)]
        const speciesId = t.evolve ? evolvedForLevel(base, level) : base
        const sp = getSpecies(speciesId)
        if (!sp) continue
        const boost = t.boost === "none" ? {} : trainerBoost(speciesId, level, t.boost === "elite" ? "elite" : "guard")
        out.push(createMonInstance(speciesId, level, {
            owned: true,
            shiny: t.shiny || undefined,
            ev: boost.ev,
            allocated: boost.allocated,
        }))
    }
    return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Sac / CT / Pokédex
// ─────────────────────────────────────────────────────────────────────────────

const BAG_BASIC: Record<string, number> = {
    poke_ball: 10, super_ball: 5, potion: 10, super_potion: 5, antidote: 3, anti_para: 3, reveil: 3, rappel: 3,
}
const KEY_ITEMS: Record<string, number> = {
    daemonflute: 1, pierre_gekroc: 3, noyau_metal: 1, torche_3: 5, repousse: 10,
}
/** Sac « plein » : tout le catalogue, en quantités par catégorie. */
const BAG_FULL_QTY: Record<string, number> = { BALL: 20, HEAL: 20, STATUS_HEAL: 10, BOOST: 5, REVIVE: 10, MISC: 5 }
/** Objets qui n'existent qu'en UN exemplaire (jamais empilés, même dans un sac « plein »). */
const UNIQUE_ITEMS = ["daemonflute", "noyau_metal"]

function buildBag(preset: BagPreset, keyItems: boolean): Record<string, number> {
    const bag: Record<string, number> = {}
    if (preset === "basic") Object.assign(bag, BAG_BASIC)
    if (preset === "full") {
        for (const it of Object.values(ITEMS)) bag[it.id] = BAG_FULL_QTY[it.category] ?? 5
    }
    if (keyItems) for (const [id, n] of Object.entries(KEY_ITEMS)) bag[id] = Math.max(bag[id] ?? 0, n)
    for (const id of UNIQUE_ITEMS) if (bag[id]) bag[id] = 1
    return bag
}

/** Toutes les espèces du catalogue statique (le Pokédex est cumulatif/global). */
function allSpeciesIds(): string[] {
    return Object.values(SPECIES).map((s: SpeciesData) => s.id)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Recette par défaut + presets
// ─────────────────────────────────────────────────────────────────────────────

export function defaultRecipe(): ProgressionRecipe {
    return {
        run: "run1",
        arenas: [],
        arenaRematches: false,
        routeTrainers: false,
        conseil: false,
        champion: false,
        team: { count: 3, level: 20, pool: "roster", shiny: false, boost: "none", evolve: true, pcCount: 0 },
        reps: 3000,
        bag: "basic",
        allCts: false,
        keyItems: false,
        dexComplete: false,
        skipCinematics: true,
        sylvebarbe: false,
        berrySecret: false,
        gekroc: false,
        domeChampionships: 0,
        seed: 1,
    }
}

export interface RecipePreset { id: string; label: string; hint: string; recipe: ProgressionRecipe }

const ALL_BADGES = ARENA_STEPS.map((a) => a.badge)

/** Points de départ prêts à l'emploi (le formulaire reste modifiable après application d'un preset). */
export const PRESETS: RecipePreset[] = [
    {
        id: "debut", label: "🌱 Run 1 — début", hint: "1 starter niv. 5, sac de base, rien de battu",
        recipe: { ...defaultRecipe(), team: { ...defaultRecipe().team, count: 1, level: 5, pool: "starters" }, reps: 800 },
    },
    {
        id: "mi-run1", label: "🔥 Run 1 — 3 arènes", hint: "Plante/Roche/Feu conquises, équipe niv. 30",
        recipe: {
            ...defaultRecipe(), arenas: ["plante", "roche", "feu"], routeTrainers: true, keyItems: true,
            team: { ...defaultRecipe().team, count: 4, level: 30 }, reps: 6000, bag: "full", berrySecret: false,
        },
    },
    {
        id: "pre-ligue", label: "🏛️ Run 1 — porte de la Ligue", hint: "5 badges, équipe niv. 50, sac plein, toutes les CT",
        recipe: {
            ...defaultRecipe(), arenas: [...ALL_BADGES], arenaRematches: true, routeTrainers: true,
            team: { ...defaultRecipe().team, count: 6, level: 50, boost: "guard" },
            reps: 12000, bag: "full", allCts: true, keyItems: true, sylvebarbe: true, berrySecret: true, gekroc: true,
        },
    },
    {
        id: "champion", label: "👑 Run 1 — Champion", hint: "Ligue battue, Hall of Fame ouvert, niv. 65",
        recipe: {
            ...defaultRecipe(), arenas: [...ALL_BADGES], arenaRematches: true, routeTrainers: true, conseil: true, champion: true,
            team: { ...defaultRecipe().team, count: 6, level: 65, boost: "elite" },
            reps: 20000, bag: "full", allCts: true, keyItems: true, dexComplete: false,
            sylvebarbe: true, berrySecret: true, gekroc: true, domeChampionships: 1,
        },
    },
    {
        id: "run2", label: "♻️ Run 2 (NG+) — frais", hint: "Run 1 terminé en coulisses, run 2 au départ + 10 000⚡",
        recipe: {
            ...defaultRecipe(), run: "run2", team: { ...defaultRecipe().team, count: 1, level: 5, pool: "starters" },
            reps: 10000, bag: "basic", keyItems: true, berrySecret: true,
        },
    },
    {
        id: "run3", label: "🏆 Run 3 (concours) — frais", hint: "Runs 1+2 terminés, run 3 au départ + 500⚡",
        recipe: {
            ...defaultRecipe(), run: "run3", team: { count: 1, level: 5, pool: "run3", shiny: false, boost: "none", evolve: false, pcCount: 0 },
            reps: 500, bag: "basic", keyItems: false, berrySecret: true,
        },
    },
]

// ─────────────────────────────────────────────────────────────────────────────
// 5. Fabrication de la save
// ─────────────────────────────────────────────────────────────────────────────

/** Plafond d'énergie du monde : 1000 + 250/badge (run 1/3), 10 000 en run 2 (cf. saveManager). */
function repsCapFor(run: RunTarget, badgeCount: number): number {
    if (run === "run2") return 10000
    return 1000 + badgeCount * BADGE_REPS_CAP_BONUS
}

/** Fige une équipe façon Hall of Fame (adversaire du combat de fin de Ligue en run 2). */
export function freezeChampionTeam(team: MonInstance[]): ChampionMon[] {
    return team.map((m) => {
        const sp = getSpecies(m.speciesId)
        const st = sp ? fullStats(m, sp) : ({ hp: 1, atk: 1, def: 1, spe: 1, spc: 1 } as Record<StatKey, number>)
        return {
            speciesId: m.speciesId,
            nickname: m.nickname,
            level: m.level,
            shiny: m.shiny ? true : undefined,
            stats: { hp: st.hp, atk: st.atk, def: st.def, spe: st.spe, spc: st.spc },
            moves: m.moves.map((mv) => getMove(mv.moveId)?.name ?? mv.moveId).slice(0, 4),
        }
    })
}

export interface BuildOptions {
    /** Horodatage (ms) posé sur les runs 2/3 (ngplusStartedAt). Passé explicitement → build pur. */
    now?: number
}

/** Un monde « terminé » : sert de run amont crédible (run 1 pour un run 2, run 1+2 pour un run 3). */
function completedWorld(run: RunTarget, seed: number, now: number): YellowSave {
    const w = emptySave()
    const team = buildTeam({ count: 6, level: 70, pool: "roster", shiny: false, boost: "elite", evolve: true, pcCount: 0 }, 6, lcg(seed + 77))
    w.team = team
    w.badges = [...ALL_BADGES]
    w.repsCap = repsCapFor(run, w.badges.length)
    w.reps = w.repsCap
    w.introSeen = true
    w.isChampion = true
    w.welcomeGift = true
    w.spagGift = true
    w.pastaGodGift = true
    w.sylvebarbeAwake = true
    w.berrySecretKnown = true
    w.gekrocResolved = true
    w.defeatedTrainers = [
        ...ARENA_STEPS.flatMap((a) => [...a.guardIds, a.bossId]),
        ...ROUTE_TRAINER_IDS,
        ...LIGUE_COUNCIL_IDS,
        LIGUE_MASTER_ID,
    ]
    markRouteNpcsBeaten(w)
    w.rematchedTrainers = ARENA_STEPS.flatMap((a) => [...a.guardIds, a.bossId])
    w.ownedCts = CTS.map((c) => c.id)
    w.items = buildBag("full", true)
    w.ngplusUsed = run !== "run1"   // un run 2 existe dès qu'on vise le run 2/3
    w.run3Used = run === "run3"
    if (run !== "run1") w.ngplusStartedAt = now
    w.labDefi = { ...emptyLabDefi(), geneIntroSeen: true, spagRouletteSeen: true, spagWelcomeGift: true }
    w.stats = { ...emptyYellowStats(), battles: 120, wins: 110 }
    return w
}

/**
 * Marque « battus / résolus » les PNJ hors arène-Ligue qui ne vivent PAS dans `defeatedTrainers` mais ont
 * leur propre champ de save. Les réaffrontables reçoivent 1 victoire (= battus au moins une fois) plutôt
 * qu'un gros compteur : on ne veut pas faire exploser leur scaling (ACE, Orcaline, PNJ 5 montent en niveau
 * à chaque victoire). Le cliquet de niveau d'ACE reste à zéro → il se recalibre sur l'équipe générée.
 */
function markRouteNpcsBeaten(w: YellowSave): void {
    w.sbireWinsTotal = 1     // SBIRE (le cycle des explications démarre)
    w.aceWins = 1            // ACE (rival)
    w.orcalineWins = 1       // DRESSEUR D'ORCALINE
    w.pnj5Wins = 1           // PNJ 5 (gardien de la Grotte du Nexus)
    w.hhCollectorWins = 3    // COLLECTIONNEUR DE SPECTRES : 3 victoires + 3 spectres = défi bouclé (CT26)
    w.hhSpectresShown = [...SPECTRE_SAMPLE]
    w.caveTradeDone = true   // DÉNICHEUR : échange unique Faukon → Blaziper fait
    w.goshHintHeard = true   // GAMIN : confidence de nuit entendue
    w.mimimoyReturned = true // MIMIMOY rendu au brocanteur
}

/** Le monde décrit par la recette (celui que le joueur va jouer). */
function recipeWorld(r: ProgressionRecipe, now: number): YellowSave {
    const w = emptySave()
    const rnd = lcg(r.seed)
    const arenas = ARENA_STEPS.filter((a) => r.arenas.includes(a.badge))

    // Équipe + PC
    w.team = buildTeam(r.team, Math.max(0, Math.min(6, Math.floor(r.team.count))), rnd)
    w.pc = buildTeam(r.team, Math.max(0, Math.min(30, Math.floor(r.team.pcCount))), rnd)

    // Arènes : badge + gardes + boss battus + CT-cadeau du boss
    w.badges = arenas.map((a) => a.badge)
    const defeated = arenas.flatMap((a) => [...a.guardIds, a.bossId])
    if (r.arenaRematches) w.rematchedTrainers = [...defeated]
    if (r.conseil || r.champion) defeated.push(...LIGUE_COUNCIL_IDS)
    if (r.champion) defeated.push(LIGUE_MASTER_ID)
    if (r.routeTrainers) defeated.push(...ROUTE_TRAINER_IDS)
    w.defeatedTrainers = [...new Set(defeated)]
    w.isChampion = r.champion

    // PNJ hors arène/Ligue « spéciaux » (compteurs propres) — même interrupteur global.
    if (r.routeTrainers) markRouteNpcsBeaten(w)

    // CT : cadeaux des boss battus (+ trophée du collectionneur de spectres), ou tout le catalogue
    w.ownedCts = r.allCts
        ? CTS.map((c) => c.id)
        : [...new Set([
            ...arenas.map((a) => a.giftCt).filter((x): x is string => !!x),
            ...(r.routeTrainers ? [HH_COLLECTOR_CT] : []),
        ])]

    // Énergie : plafond du monde, puis réserve écrêtée dessus
    w.repsCap = repsCapFor(r.run, w.badges.length)
    w.reps = Math.max(0, Math.min(w.repsCap, Math.floor(r.reps)))

    // Sac
    w.items = buildBag(r.bag, r.keyItems)

    // Pokédex (global/cumulatif — le même set est réécrit dans tous les mondes par snapshot())
    if (r.dexComplete) {
        const all = allSpeciesIds()
        w.pokedex = { seen: all, caught: all }
    } else {
        const owned = [...new Set([...w.team, ...w.pc].map((m) => m.speciesId))]
        w.pokedex = { seen: owned, caught: owned }
    }

    // Déblocages / cinématiques
    w.introSeen = true // une équipe est fournie → l'intro (choix du starter) n'a plus lieu d'être
    if (r.skipCinematics) {
        w.welcomeGift = true
        w.spagGift = true
        w.pastaGodGift = true
        w.labDefi = { ...emptyLabDefi(), geneIntroSeen: true, spagRouletteSeen: true, spagWelcomeGift: true }
    }
    w.sylvebarbeAwake = r.sylvebarbe
    w.berrySecretKnown = r.berrySecret
    w.gekrocResolved = r.gekroc
    w.domeChampionships = Math.max(0, Math.floor(r.domeChampionships))

    // Méta de run
    w.ngplusUsed = r.run !== "run1"
    w.run3Used = r.run === "run3"
    if (r.run !== "run1") w.ngplusStartedAt = now
    if (r.run === "run3") w.run3StarterBase = w.team[0]?.speciesId ?? "elefer"
    return w
}

/**
 * Construit la save COMPLÈTE (multi-mondes) décrite par la recette.
 *  - run 1 : la recette EST le monde live.
 *  - run 2 : live = run 1 terminé (Champion), monde actif = la recette (imbriqué dans ngplusWorld).
 *  - run 3 : live = run 1 terminé, ngplusWorld = run 2 terminé, monde actif = la recette (run3World).
 * Les champs PLATS de haut niveau restent le monde LIVE — c'est ce qu'exige le garde-fou anti-écrasement
 * du serveur (saveGuard) et ce que fait saveManager.snapshot().
 */
export function buildProgressionSave(r: ProgressionRecipe, opts: BuildOptions = {}): YellowSave {
    const now = opts.now ?? 0
    const world = recipeWorld(r, now)

    if (r.run === "run1") {
        return { ...world, activeWorld: "live", ngplusWorld: null, run3World: null, ngplusOldTeam: null }
    }

    const live = completedWorld(r.run, r.seed, now)
    const oldTeam = freezeChampionTeam(live.team)

    if (r.run === "run2") {
        return {
            ...live,
            activeWorld: "ngplus",
            ngplusWorld: world,
            ngplusOldTeam: oldTeam,
            run3World: null,
            ngplusUsed: true,
            run3Used: false,
        }
    }

    // run 3 : il faut aussi un run 2 « terminé » (le run 3 se lance depuis le run 2, en Champion).
    const run2 = completedWorld("run2", r.seed + 11, now)
    return {
        ...live,
        activeWorld: "run3",
        ngplusWorld: run2,
        ngplusOldTeam: oldTeam,
        run3World: world,
        ngplusUsed: true,
        run3Used: true,
    }
}

/** Résumé lisible de ce que la recette va produire (affiché avant application). */
export function recipeSummary(r: ProgressionRecipe): string[] {
    const runLabel = r.run === "run1" ? "Run 1 (Découverte)" : r.run === "run2" ? "Run 2 (New Game+)" : "Run 3 (Concours)"
    const lines = [
        `Monde actif : ${runLabel}`,
        `Équipe : ${r.team.count} Daemon(s) niv. ${r.team.level}${r.team.shiny ? " ✨ shiny" : ""}${r.team.boost !== "none" ? ` · entraînement ${r.team.boost}` : ""}`,
        `Badges : ${r.arenas.length}/5${r.arenas.length ? ` (${r.arenas.join(", ")})` : ""}`,
        `Ligue : ${r.champion ? "Champion 👑" : r.conseil ? "Conseil des 4 battu" : "non entamée"}`,
        `Énergie : ${r.reps}⚡ (plafond ${repsCapFor(r.run, r.arenas.length)})`,
        `Sac : ${r.bag === "none" ? "vide" : r.bag === "basic" ? "de base" : "complet"}${r.keyItems ? " + objets clés" : ""}${r.allCts ? " + toutes les CT" : ""}`,
        `PNJ hors arène/Ligue : ${r.routeTrainers ? "battus" : "à combattre"}`,
    ]
    if (r.run !== "run1") lines.push(`Mondes amont fabriqués : ${r.run === "run2" ? "run 1 Champion" : "run 1 + run 2 Champions"}`)
    return lines
}
