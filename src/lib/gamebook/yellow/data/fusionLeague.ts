// src/lib/gamebook/yellow/data/fusionLeague.ts
//
// LIGUE DE FUSION — data des 5 dresseurs (Conseil 4 + Champion), chacun avec une équipe de Daemons FUSIONNÉS.
// Chaque fusion = 2 parents UNIQUES (aucun réutilisé dans TOUTE la Ligue) ; noms FIGÉS (les 21 portmanteaux) ;
// types calculés par computeFusion. Le 6e « dresseur » (miroir) est DYNAMIQUE (équipe du joueur + némésis) → il
// vit ailleurs, pas ici.
//
// Rejouable en 3 PALIERS : bronze (parents niv 80 / 75 Saiyan), argent (90 / 85), or (100 / 95). MÊMES fusions,
// MÊMES sprites (juste des parents plus forts). Les parents sont ÉPHÉMÈRES : construits à la volée, jamais persistés.

import type { MonInstance, StatKey } from "../battle/types"
import { getSpecies } from "./species"
import { signatureStat } from "./evConfig"
import { createMonInstance } from "../battle/factory"
import { buildFusion, disposeFusion, type BuiltFusion } from "./fusionMon"

export type FusionTier = "bronze" | "argent" | "or"
export const FUSION_TIERS: Record<FusionTier, { level: number; saiyan: number; label: string }> = {
    bronze: { level: 80, saiyan: 75, label: "Bronze" },
    argent: { level: 90, saiyan: 85, label: "Argent" },
    or: { level: 100, saiyan: 95, label: "Or" },
}

// moves = moveset CURÉ (4 attaques) ; sinon dérivé. sprite = PNG dédié de la fusion (à remplir quand les 21
// sprites arrivent, ex. "/yellow/sprites/dex/fusion/morcaline.png") ; sinon le sprite du parent dominant.
export interface FusionPairDef { a: string; b: string; name: string; moves?: string[]; sprite?: string }
export interface FusionLeagueTrainer {
    key: string
    name: string    // nom du dresseur
    theme: string   // type-lore de son équipe
    icon: string
    pairs: FusionPairDef[]
}

/** Les 5 dresseurs (4 Conseil + Champion). 21 fusions, 42 parents tous distincts. */
export const FUSION_LEAGUE: FusionLeagueTrainer[] = [
    { key: "lorelei", name: "Lorelei", theme: "GLACE", icon: "🧊", pairs: [
        // GLACE/EAU = spéciaux. Sweepers spéciaux (SpA) + Repos.
        { a: "morrow", b: "orcaline", name: "Morcaline", moves: ["blizzard", "deferlante", "vague_mentale", "repos"] },
        { a: "mobyd", b: "auroraur", name: "Aurobyd", moves: ["deferlante", "blizzard", "fulgurance", "repos"] },
        { a: "panthegel", b: "yetiroche", name: "Panthyéti", moves: ["blizzard", "lame_roche", "fulgurance", "repos"] },
        // #4 : AUCUN final Glace n'est libre (les 7 sont pris en #1-3/#14) → Glacyran RECOMPOSE 2 finals déjà utilisés
        //   ailleurs (Orcaline de #1 + Cryotyran de #14). Réutilisation ASSUMÉE — parents éphémères, jamais montrés au
        //   joueur ; les uids d'instance diffèrent → aucun conflit de registre. Cf. l'exception dans fusionLeague.test.ts.
        { a: "orcaline", b: "cryotyran", name: "Glacyran", moves: ["blizzard", "draco_charge", "fulgurance", "repos"] },
    ] },
    { key: "bruno", name: "Bruno", theme: "COMBAT", icon: "🥊", pairs: [
        // COMBAT physique (ATK énorme) → STAB Combat + couverture Sol/Roche/Métal + Danse-Lames. Karabouh = spécial (Psy).
        { a: "maitrezenc", b: "enclumind", name: "Maîtreclume", moves: ["coup_de_boutoir", "tete_de_fer", "seisme", "danse_lames"] },
        { a: "hebulmin", b: "tauricendre", name: "Hébultaure", moves: ["coup_de_boutoir", "seisme", "cage_eclair", "danse_lames"] },
        { a: "druidours", b: "uzumaro", name: "Druidumaro", moves: ["coup_de_boutoir", "seisme", "mega_sangsue", "danse_lames"] },
        { a: "bouhbou", b: "karatame", name: "Karabouh", moves: ["eveil_divin", "coup_de_boutoir", "fulgurance", "repos"] },
    ] },
    { key: "agatha", name: "Agatha", theme: "SPECTRE", icon: "👻", pairs: [
        // Shadopanthe = physique (Spectre/Normal). Nécrozeus = mixte Spectre/ÉLEC (Namizeus apporte l'Élec). Archibrook/Mycécorbe = spéciaux (Psy).
        { a: "ombrapanthe", b: "shadow", name: "Shadopanthe", moves: ["ball_ombre", "plaquage", "seisme", "hypnose"] },
        { a: "namizeus", b: "necrolopendre", name: "Nécrozeus", moves: ["ball_ombre", "fulgurance", "seisme", "toxik"] },
        { a: "archibouh", b: "brookhante", name: "Archibrook", moves: ["eveil_divin", "vague_mentale", "onde_obscure", "hypnose"] },
        { a: "mycedruide", b: "necrocorbe", name: "Mycécorbe", moves: ["vague_mentale", "eveil_divin", "toxik", "ball_ombre"] },
    ] },
    { key: "peter", name: "Peter", theme: "DRAGON", icon: "🐉", pairs: [
        // Physiques (ATK dominante) → couverture physique Vol/Sol/Roche/Feu ; 1 STAB spécial thématique quand pertinent.
        { a: "draconarque", b: "alirocaillus", name: "Draconroc", moves: ["pique_fatal", "lame_roche", "seisme", "danse_lames"] },
        { a: "cryotyran", b: "leviathonn", name: "Cryoviathan", moves: ["deferlante", "draco_charge", "seisme", "repos"] },
        // Dracorex = DRAGON/VOL (Dragon de Dracarlin + Vol de Chronorex) → STAB Vol physique (pique_fatal) + couverture.
        { a: "dracarlin", b: "chronorex", name: "Dracorex", moves: ["pique_fatal", "seisme", "lame_roche", "danse_lames"] },
    ] },
    { key: "ace", name: "ACE", theme: "-", icon: "👑", pairs: [
        { a: "megalithe", b: "sylvebarbe", name: "Mégasylve", moves: ["seisme", "roc_titanesque", "vampigraine", "repos"] },        // mur Roche/Sol
        { a: "aquilord", b: "jerbiwat", name: "Aquilwatt", moves: ["eveil_divin", "fulgurance", "vague_mentale", "reprise_ailes"] }, // Vol/ÉLEC spé (STAB Élec fulgurance ; Vol = typage physique + reprise_ailes ; Psy éveil_divin/vague_mentale = couverture)
        { a: "vipember", b: "toucanyon", name: "Vipécan", moves: ["lance_flammes", "eveil_divin", "fulgurance", "hypnose"] },        // Feu/VOL spé (STAB Feu ; Vol = typage physique, def only)
        { a: "magmator", b: "rochison", name: "Magmarok", moves: ["roc_titanesque", "seisme", "crocs_de_feu", "danse_lames"] },      // Roche/SOL physique (2 STAB ; crocs_de_feu = couverture)
        { a: "loupyre", b: "thundah", name: "Thundaloup", moves: ["lance_flammes", "fulgurance", "vive_attaque", "cage_eclair"] },   // Feu/Élec rapide
        { a: "omnhippo", b: "regnantaur", name: "Omnantaur", moves: ["eveil_divin", "vague_mentale", "dard_fatal", "repos"] },        // spécial Psy + Insecte
    ] },
]

const STAT_KEYS: StatKey[] = ["hp", "atk", "def", "spe", "spc"]

/** 2e plus haute base d'une espèce (≠ excl) — pour l'EV secondaire d'un parent dont la signature est PV. */
function secondStat(speciesId: string, excl: StatKey): StatKey {
    const sp = getSpecies(speciesId)!
    let best: StatKey = excl === "atk" ? "spc" : "atk"
    for (const k of STAT_KEYS) if (k !== excl && sp.baseStats[k] > sp.baseStats[best]) best = k
    return best
}

/** Parent optimisé « au mieux » : 252 EV sur sa stat-signature + 252 EV en PV, tous les points Saiyan sur la signature.
 *  Boire la stat-signature → nourrit optimalement le rôle de la fusion (le split spécial suit les parents). */
function buildParent(speciesId: string, level: number, saiyan: number): MonInstance {
    const sp = getSpecies(speciesId)
    if (!sp) throw new Error(`Ligue Fusion : espèce inconnue ${speciesId}`)
    const primary = signatureStat(sp)
    const ev: Partial<Record<StatKey, number>> = {}
    if (primary === "hp") { ev.hp = 252; ev[secondStat(speciesId, "hp")] = 252 }
    else { ev[primary] = 252; ev.hp = 252 }
    return createMonInstance(speciesId, level, { ev, allocated: { [primary]: saiyan } })
}

/** Équipe de FUSIONS d'un dresseur pour un palier. Renvoie des BuiltFusion (espèces éphémères ENREGISTRÉES →
 *  à DÉTRUIRE après le combat via disposeFusionLeagueTeam). Les parents ne sont jamais persistés. */
export function buildFusionLeagueTeam(trainerKey: string, tier: FusionTier): BuiltFusion[] {
    const tr = FUSION_LEAGUE.find((t) => t.key === trainerKey)
    if (!tr) throw new Error(`Ligue Fusion : dresseur inconnu ${trainerKey}`)
    const { level, saiyan } = FUSION_TIERS[tier]
    return tr.pairs.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name, moves: p.moves, sprite: p.sprite }),
    )
}

// ==================== BOSS FINAL — LE DIEU SPAGHETTI (forme ultime) ====================
// Remplace le 6e combat (l'ancien MIROIR). Ton guide révélé comme l'adversaire ultime : 3 chimères d'échauffement
// puis UKOGNOFY (Goshendofy + Ukognos = les 2 légendaires fusionnés, DRAGON/FÉE, BST ~1710). Scalé par palier.
// Tous les parents sont DISTINCTS (aucun réutilisé de la Ligue). Movesets curés (spécial dominant + STAB).
export const FUSION_BOSS_PAIRS: FusionPairDef[] = [
    { a: "divinpate", b: "cerfeuillu", name: "Divinliane", moves: ["eveil_divin", "lance_soleil", "fulgurance", "repos"] },       // PSY/PLANTE — sweeper psy-plante
    { a: "pyrokoss", b: "razmaree", name: "Pyromarée", moves: ["lance_flammes", "deferlante", "fulgurance", "repos"] },            // FEU/EAU — le paradoxe primordial
    { a: "zappeureal", b: "naiadrak", name: "Zappadrak", moves: ["ultra_foudre", "deferlante", "blizzard", "cage_eclair"] },       // ELEC/EAU — sweeper rapide (para)
    { a: "goshendofy", b: "ukognos", name: "Ukognofy", moves: ["souffle_primordial", "cataclysme_lunaire", "fulgurance", "repos"] }, // DRAGON/FÉE — L'ACE ultime
]

/** Équipe du BOSS FINAL (Dieu Spaghetti ultime) au palier donné. BuiltFusion éphémères à DÉTRUIRE après combat. */
export function buildFusionBossTeam(tier: FusionTier): BuiltFusion[] {
    const { level, saiyan } = FUSION_TIERS[tier]
    return FUSION_BOSS_PAIRS.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name, moves: p.moves }),
    )
}

/** Détruit les espèces éphémères d'une équipe de Ligue (fin de combat / démontage). */
export function disposeFusionLeagueTeam(team: BuiltFusion[]): void {
    for (const f of team) disposeFusion(f.speciesId)
}

/** Toutes les paires de parents (pour vérifier l'unicité / le contenu). */
export function allFusionLeaguePairs(): FusionPairDef[] {
    return FUSION_LEAGUE.flatMap((t) => t.pairs)
}

// ==================== FLUX DE LA LIGUE (dresseurs + paliers) ====================
// Les dresseurs vivent dans data/trainers.ts sous ces ids. `y_fusion_1..4` + `y_fusion_maitre` mappent 1:1 sur
// FUSION_LEAGUE (dans l'ordre) ; `y_fusion_miroir` est le combat final DYNAMIQUE (reflet du joueur, bâti ailleurs).
export const FUSION_LEAGUE_ORDER = ["y_fusion_1", "y_fusion_2", "y_fusion_3", "y_fusion_4", "y_fusion_maitre"] as const

/** Clé FUSION_LEAGUE (lorelei…) d'un dresseur `y_fusion_N`/`y_fusion_maitre`. null pour le miroir / un id inconnu. */
export function fusionLeagueKeyForTrainer(trainerId: string): string | null {
    const i = FUSION_LEAGUE_ORDER.indexOf(trainerId as (typeof FUSION_LEAGUE_ORDER)[number])
    return i >= 0 ? FUSION_LEAGUE[i].key : null
}

// PALIERS EN ÉCHELLE — marqueurs de complétion persistés dans `defeatedTrainers` (per-monde, NON purgés par le
// reset du gauntlet qui ne vise que `y_fusion_*`). Le palier ACTIF = le 1er non encore complété.
export const FUSION_TIER_MARKER: Record<FusionTier, string> = {
    bronze: "fusleague_bronze", argent: "fusleague_argent", or: "fusleague_or",
}
/** Palier actif (le plus haut débloqué mais pas encore bouclé). `isCleared(marker)` = a-t-on complété ce palier ? */
export function activeFusionTier(isCleared: (marker: string) => boolean): FusionTier {
    if (!isCleared(FUSION_TIER_MARKER.bronze)) return "bronze"
    if (!isCleared(FUSION_TIER_MARKER.argent)) return "argent"
    return "or"
}
/** A-t-on décroché le titre « Maître de la Chimère » (au moins Bronze bouclé) ? */
export function isFusionChampion(isCleared: (marker: string) => boolean): boolean {
    return isCleared(FUSION_TIER_MARKER.bronze)
}

// DÉBLOCAGE de la Ligue de Fusion : la porte à dragons de l'Autel reste SCELLÉE (sprite fermé) tant que le joueur
//   n'a pas GAGNÉ une épreuve de fusion à l'autel (fusion:TRIAL). À la 1re victoire, on pose ce marqueur (persisté
//   dans defeatedTrainers, NON purgé par resetFusionLeagueProgress car pas de préfixe y_fusion_) → la porte s'OUVRE
//   (sprite fusion_altar_open.png) et l'entrée devient franchissable.
export const FUSION_UNLOCK_MARKER = "fusion_unlocked"

// FUSIO-BALL — offre EN ATTENTE : si le joueur ne l'achète pas au sacre (souvent < 1000 reps après la Ligue), le
//   marker `fusioball_owed` reste posé (dans defeatedTrainers) → le Dieu Spaghetti la RE-propose dès que le joueur
//   atteint FUSIOBALL_REOFFER_REPS. Retiré à l'achat. Marker boolean (pas de nouveau champ save).
export const FUSIOBALL_OWED_MARKER = "fusioball_owed"
export const FUSIOBALL_REOFFER_REPS = 1200
export function isFusionLeagueUnlocked(isCleared: (marker: string) => boolean): boolean {
    return isCleared(FUSION_UNLOCK_MARKER)
}
