// src/lib/gamebook/yellow/data/fusionLeague.ts
//
// LIGUE DE FUSION — data des 5 dresseurs (Conseil 4 + Champion), thème POKÉMON OR/ARGENT (Johto) :
// WILL (Psy) · KOGA (Poison) · BRUNO (Combat) · KAREN (Ténèbres) · LANCE (Dragon, Champion). Chaque équipe = des
// Daemons FUSIONNÉS dont les 2 parents évoquent l'équipe Johto du dresseur ; noms FIGÉS (mots-valises des 2 parents) ;
// types calculés par computeFusion. Le 6e combat (miroir) reste le BOSS DIEU SPAGHETTI (Ukognofy), il vit ailleurs.
//
// PARENTS RÉUTILISABLES : un même parent peut nourrir plusieurs fusions/dresseurs (ex. Aquilord). C'est INVISIBLE au
// joueur (parents éphémères, jamais montrés — seul le fusionné compte) et sans risque de registre (uids distincts).
// Seuls les NOMS de fusion doivent rester uniques. C'est le fusionné, pas le parent, qui porte l'identité.
//
// Rejouable en 3 PALIERS : bronze (parents niv 80 / 75 Saiyan), argent (90 / 85), or (100 / 95). MÊMES fusions,
// MÊMES sprites (juste des parents plus forts). Les parents sont ÉPHÉMÈRES : construits à la volée, jamais persistés.

import type { MonInstance, StatKey } from "../battle/types"
import { getSpecies } from "./species"
import { signatureStat } from "./evConfig"
import { createMonInstance } from "../battle/factory"
import { buildFusion, disposeFusion, type BuiltFusion } from "./fusionMon"
import { fusionSpritePath } from "./fusionSprite"

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

/** Les 5 dresseurs Johto (4 Conseil + Champion). 23 fusions ; noms uniques ; parents réutilisables (cf. en-tête). */
export const FUSION_LEAGUE: FusionLeagueTrainer[] = [
    { key: "will", name: "WILL", theme: "PSY", icon: "🔮", pairs: [
        // WILL (Xatu/Lippoutou/Flagadoss/Noadkoko) → attaquants SPÉCIAUX. Chaque fusion garde le PSY.
        { a: "divinpate", b: "aquilord", name: "Divinaquil", moves: ["eveil_divin", "fonce_bec", "souffle_polaire", "lance_flammes"] },   // PSY/VOL ~Xatu
        { a: "karmaki", b: "gloutanoir", name: "Gloutamaki", moves: ["vague_mentale", "tempete_verte", "vampigraine", "repos"] },        // PSY/PLANTE ~Noadkoko (mur drain)
        { a: "omnhippo", b: "razmaree", name: "Hippomarée", moves: ["eveil_divin", "hydrocanon", "souffle_polaire", "repos"] },          // PSY/EAU ~Flagadoss (pivot)
        { a: "morrow", b: "divinpate", name: "Morrinpâte", moves: ["souffle_polaire", "eveil_divin", "hypnose", "focalisation"] },       // GLACE/PSY ~Lippoutou (glass-cannon)
    ] },
    { key: "koga", name: "KOGA", theme: "POISON", icon: "☠️", pairs: [
        // KOGA (Migalos/Aéromite/impératrice de fer/Grotadmorv/Nostenfer) → stallers Poison-Insecte + 1 bruiser Combat/Métal + 1 sweeper Élec/Vol.
        { a: "necrolopendre", b: "merorem", name: "Mérolopendre", moves: ["dard_fatal", "bombe_beurk", "toxik", "repos"] },              // INSECTE/POISON ~Migalos
        { a: "regnantaur", b: "mycedruide", name: "Regnadruide", moves: ["eveil_divin", "bombe_beurk", "hypnose", "onde_folie"] },       // PSY/POISON ~Aéromite
        { a: "coccimperatrice", b: "colosfer", name: "Impérafer", moves: ["crochet_maitre", "poing_meteore", "seisme", "danse_lames"] }, // COMBAT/METAL ~impératrice de fer (bruiser physique : 2 STAB + séisme + danse-lames)
        { a: "merorem", b: "wyvortal", name: "Mérovortal", moves: ["bombe_beurk", "boul_pollen", "toxik", "repos"] },                    // POISON/INSECTE ~Grotadmorv (staller)
        { a: "supabatchu", b: "necrocorbe", name: "Supacorbe", moves: ["fulgurance", "serres_aube", "vampelec", "toxik"] },              // ELEC/VOL ~Nostenfer (rapide)
    ] },
    { key: "bruno", name: "BRUNO", theme: "COMBAT", icon: "🥊", pairs: [
        // BRUNO (Mackogneur/Tygnon/Kicklee/Kapoera/Onix) → cogneurs physiques COMBAT + le mur Roche/Sol.
        { a: "maitrezenc", b: "enclumind", name: "Zenclumind", moves: ["crochet_maitre", "vague_mentale", "seisme", "danse_lames"], sprite: "/yellow/sprites/dex/fusion/maitreclume.png" }, // COMBAT/PSY ~Mackogneur — RÉUTILISE le sprite existant (même paire = ex-Maîtreclume)
        { a: "maitrezenc", b: "hebulmin", name: "Maîtrelmin", moves: ["crochet_maitre", "fulgurance", "seisme", "danse_lames"] },        // COMBAT/ELEC ~Tygnon — Maîtrezenc (final) au lieu de Frappard (stade 2) = paire de l'épreuve → réutilise maitrelmin.png
        { a: "maitrezenc", b: "aquilord", name: "Aquizenc", moves: ["crochet_maitre", "fonce_bec", "seisme", "danse_lames"] },           // COMBAT/VOL ~Kicklee
        { a: "coccimperatrice", b: "karatame", name: "Coccikara", moves: ["crochet_maitre", "eveil_divin", "essaim_vorace", "danse_lames"] }, // COMBAT/PSY ~Kapoera
        { a: "megalithe", b: "rochison", name: "Rocholithe", moves: ["lame_roche", "seisme", "carapace_diamant", "repos"] },             // ROCHE/SOL ~Onix (mur set-up)
    ] },
    { key: "karen", name: "KAREN", theme: "TÉNÈBRES", icon: "🌙", pairs: [
        // KAREN (Conseil-4 Ténèbres) — ÉQUIPE BOSS de 6 fusions, MOVESETS 100% issus des learnsets des parents. Ordre =
        //   lead disable → 2 murs set-up → mur colossal speed-control → 2 sweepers rapides (ACE = Ténépanthe). 3 ténèbres.
        { a: "bouhbou", b: "mycedruide", name: "Bouhdruide", moves: ["spores_dodo", "toxik", "crochet_maitre", "bombe_beurk"] },        // COMBAT/POISON ~Ectoplasma — lead disable (sommeil+toxik)
        { a: "geckebre", b: "condombre", name: "Géckombre", moves: ["lame_roche", "seisme", "danse_lames", "repos"] },                  // ROCHE/TÉN — mur physique set-up
        { a: "ombrapanthe", b: "magnetor", name: "Magnépanthe", moves: ["ball_ombre", "poing_meteore", "seisme", "danse_lames"] },      // SPECTRE/METAL — pivot bulky set-up (superbe défense)
        { a: "leviabysse", b: "leviathonn", name: "Abyssathonn", moves: ["hydrocanon", "devoreur_ombres", "surtension", "repos"] },     // EAU/TÉN — mur colossal + speed-control (surtension −2 Vit, appris par Léviathonn)
        { a: "tenebrir", b: "thundah", name: "Thundèbre", moves: ["lance_flammes", "fulgurance", "vague_mentale", "focalisation"] },    // SPECTRE/FEU — sweeper spé le + rapide (Vit 449)
        { a: "tenebrir", b: "ombrapanthe", name: "Ténépanthe", moves: ["devoreur_ombres", "vague_mentale", "lance_flammes", "hypnose"] }, // SPECTRE/TÉN — ACE (Vit 428) ; hypnose FIABLE car rapide
    ] },
    { key: "lance", name: "LANCE", theme: "DRAGON", icon: "🐉", pairs: [
        // LANCE, Champion (Léviator/Dracaufeu/Ptéra + l'ACE Dracolosse) → sweepers physiques + le colosse dragon final.
        { a: "leviathonn", b: "aquilord", name: "Aquilathonn", moves: ["deferlante", "fonce_bec", "souffle_polaire", "reprise_ailes"] }, // EAU/VOL ~Léviator (mur spé)
        { a: "dracarlin", b: "draconarque", name: "Dracarnarque", moves: ["crocs_de_feu", "pique_fatal", "seisme", "danse_lames"] },     // FEU/VOL ~Dracaufeu
        { a: "chronorex", b: "pterosidhe", name: "Chronosidhe", moves: ["serres_aube", "eclat_lunaire", "seisme", "danse_lames"] },      // VOL/FEE ~Ptéra
        { a: "draconarque", b: "goshendofy", name: "Goshendarque", moves: ["souffle_primordial", "pique_fatal", "seisme", "repos"] },    // DRAGON/VOL ~Dracolosse (ACE)
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
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) }),
    )
}

// ==================== BOSS FINAL — LE DIEU SPAGHETTI (forme ultime) ====================
// Remplace le 6e combat (l'ancien MIROIR). Ton guide révélé comme l'adversaire ultime : 3 chimères d'échauffement
// puis UKOGNOFY (Goshendofy + Ukognos = les 2 légendaires fusionnés, DRAGON/FÉE, BST ~1710). Scalé par palier.
// Tous les parents sont DISTINCTS (aucun réutilisé de la Ligue). Movesets curés (spécial dominant + STAB).
export const FUSION_BOSS_PAIRS: FusionPairDef[] = [
    { a: "divinpate", b: "cerfeuillu", name: "Divinliane", moves: ["eveil_divin", "lance_soleil", "vague_mentale", "repos"] },       // PSY/PLANTE — sweeper psy-plante (ex-fulgurance → 2e STAB Psy)
    { a: "pyrokoss", b: "razmaree", name: "Pyromarée", moves: ["lance_flammes", "deferlante", "hydrocanon", "repos"] },            // FEU/EAU — le paradoxe primordial (ex-fulgurance → 2e STAB Eau)
    { a: "zappeureal", b: "naiadrak", name: "Zappadrak", moves: ["ultra_foudre", "deferlante", "blizzard", "cage_eclair"] },       // ELEC/EAU — sweeper rapide (para)
    { a: "goshendofy", b: "ukognos", name: "Ukognofy", moves: ["souffle_primordial", "cataclysme_lunaire", "draco_charge", "repos"] }, // DRAGON/FÉE — L'ACE ultime (ex-fulgurance → STAB Dragon fiable)
]

/** Équipe du BOSS FINAL (Dieu Spaghetti ultime) au palier donné. BuiltFusion éphémères à DÉTRUIRE après combat. */
export function buildFusionBossTeam(tier: FusionTier): BuiltFusion[] {
    const { level, saiyan } = FUSION_TIERS[tier]
    return FUSION_BOSS_PAIRS.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) }),
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

/** Clé FUSION_LEAGUE (will/koga/bruno/karen/lance) d'un dresseur `y_fusion_N`/`y_fusion_maitre`. null pour le miroir / un id inconnu. */
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
