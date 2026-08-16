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
export interface FusionPairDef { a: string; b: string; name: string; moves?: string[]; sprite?: string; role?: FusionRole }
export interface FusionLeagueTrainer {
    key: string
    name: string    // nom du dresseur
    theme: string   // type-lore de son équipe
    icon: string
    pairs: FusionPairDef[]
}

/** Les 5 dresseurs Johto (4 Conseil + Champion). 30 fusions ; noms uniques ; parents réutilisables (cf. en-tête). */
export const FUSION_LEAGUE: FusionLeagueTrainer[] = [
    { key: "will", name: "WILL", theme: "PSY", icon: "🔮", pairs: [
        // WILL (Xatu/Lippoutou/Flagadoss/Noadkoko + golem psi) → attaquants SPÉCIAUX + 1 mur métal anti-Ténèbres/Spectre.
        { a: "divinpate", b: "aquilord", name: "Divinaquil", moves: ["eveil_divin", "fonce_bec", "souffle_polaire", "lance_flammes"] },   // PSY/VOL ~Xatu
        { a: "karmaki", b: "gloutanoir", name: "Gloutamaki", moves: ["vague_mentale", "tempete_verte", "vampigraine", "repos"] },        // PSY/PLANTE ~Noadkoko (mur drain)
        { a: "flamaspic", b: "razmaree", name: "Flamarée", moves: ["hydrocanon", "choc_mental", "blizzard", "repos"] },                  // PSY/EAU ~Flagadoss (tank ; ex-Hippomarée, omnhippo libéré pour Hippofer)
        { a: "morrow", b: "divinpate", name: "Morrinpâte", moves: ["coup_d_givre", "eveil_divin", "hypnose", "focalisation"] },          // GLACE/PSY ~Lippoutou (glass-cannon) — coup_d_givre = STAB Glace légal (morrow)
        { a: "omnhippo", b: "colosfer", name: "Hippofer", moves: ["eveil_divin", "onde_cerebrale", "poing_meteore", "repos"] },          // PSY/METAL — mur anti-Ténèbres/Spectre + debuff (onde_cerebrale −Vit/−Préc/−Déf) — REMPLACÉ en Argent/Or (cf. ANTITRIO_ARGENT_OR)
        { a: "jerbiwat", b: "archibouh", name: "Jerbibouh", moves: ["vague_mentale", "ball_ombre", "fulgurance", "hypnose"] },           // PSY/SPECTRE — sweeper spé + hypnose (moves 100% jerbiwat/archibouh)
    ] },
    { key: "koga", name: "KOGA", theme: "POISON", icon: "☠️", pairs: [
        // KOGA (Migalos/Aéromite/impératrice de fer/Grotadmorv/Nostenfer) → stallers Poison-Insecte + 1 bruiser Combat/Métal + 1 sweeper Élec/Vol.
        { a: "necrolopendre", b: "merorem", name: "Mérolopendre", moves: ["dard_fatal", "bombe_beurk", "toxik", "repos"] },              // INSECTE/POISON ~Migalos
        { a: "regnantaur", b: "mycedruide", name: "Regnadruide", moves: ["vague_mentale", "bombe_beurk", "spores_dodo", "onde_folie"] }, // PSY/POISON ~Aéromite — vague_mentale + spores_dodo légaux (mycédruide/regnantaur)
        { a: "coccimperatrice", b: "colosfer", name: "Impérafer", moves: ["crochet_maitre", "poing_meteore", "seisme", "danse_lames"] }, // COMBAT/METAL ~impératrice de fer (bruiser physique : 2 STAB + séisme + danse-lames)
        { a: "merorem", b: "wyvortal", name: "Mérovortal", moves: ["bombe_beurk", "boul_pollen", "toxik", "repos"] },                    // POISON/INSECTE ~Grotadmorv (staller) — REMPLACÉ en Argent/Or (cf. ANTITRIO_ARGENT_OR)
        { a: "supabatchu", b: "necrocorbe", name: "Supacorbe", moves: ["fulgurance", "pique_fatal", "vampelec", "toxik"] },              // ELEC/VOL ~Nostenfer (rapide) — pique_fatal = STAB Vol légal (les 2)
        { a: "sylvapuce", b: "merorem", name: "Cerforem", moves: ["spores_dodo", "tempete_verte", "bombe_beurk", "toxik"] },            // PLANTE/POISON — staller végétal empoisonné (moves 100% cerfeuillu/merorem)
    ] },
    { key: "bruno", name: "BRUNO", theme: "COMBAT", icon: "🥊", pairs: [
        // BRUNO (Mackogneur/Tygnon/Kicklee/Kapoera/Onix) → cogneurs physiques COMBAT + le mur Roche/Sol.
        { a: "maitrezenc", b: "enclumind", name: "Zenclumind", moves: ["crochet_maitre", "vague_mentale", "seisme", "danse_lames"], sprite: "/yellow/sprites/dex/fusion/maitreclume.png" }, // COMBAT/PSY ~Mackogneur — RÉUTILISE le sprite existant (même paire = ex-Maîtreclume)
        { a: "maitrezenc", b: "hebulmin", name: "Maîtrelmin", moves: ["crochet_maitre", "fulgurance", "seisme", "danse_lames"] },        // COMBAT/ELEC ~Tygnon — Maîtrezenc (final) au lieu de Frappard (stade 2) = paire de l'épreuve → réutilise maitrelmin.png
        { a: "druidours", b: "aquilord", name: "Aquidruide", moves: ["crochet_maitre", "fonce_bec", "seisme", "lance_flammes"] },        // COMBAT/VOL ~Kicklee — Druidours (au lieu de Maîtrezenc, qui passe à 2×) ; moves 100% druidours/aquilord
        { a: "coccimperatrice", b: "karatame", name: "Coccikara", moves: ["crochet_maitre", "eveil_divin", "essaim_vorace", "danse_lames"] }, // COMBAT/PSY ~Kapoera — REMPLACÉ en Argent/Or (cf. ANTITRIO_ARGENT_OR)
        { a: "megalithe", b: "rochison", name: "Rocholithe", moves: ["lame_roche", "seisme", "carapace_diamant", "repos"] },             // ROCHE/SOL ~Onix (mur set-up)
        { a: "merorem", b: "karatame", name: "Mérokara", moves: ["eveil_divin", "bombe_beurk", "toxik", "repos"] },                     // POISON/PSY — garde anti-FÉE (résiste + tape ×2 la Fée qui balaie les 4 Combat)
    ] },
    { key: "karen", name: "KAREN", theme: "TÉNÈBRES", icon: "🌙", pairs: [
        // KAREN (Conseil-4 Ténèbres) — ÉQUIPE BOSS de 6 fusions, MOVESETS 100% issus des learnsets des parents. Ordre =
        //   lead disable → 2 murs set-up → mur colossal speed-control → 2 sweepers rapides (ACE = Ténépanthe). 3 ténèbres.
        { a: "bouhbou", b: "mycedruide", name: "Bouhdruide", moves: ["spores_dodo", "toxik", "crochet_maitre", "bombe_beurk"] },        // COMBAT/POISON ~Ectoplasma — lead disable (sommeil+toxik)
        { a: "geckebre", b: "condombre", name: "Géckombre", moves: ["morsure_sombre", "seisme", "danse_lames", "repos"] },              // SOL/TÉN — mur physique set-up (double STAB Séisme + Morsure)
        { a: "ombrapanthe", b: "magnetor", name: "Magnépanthe", moves: ["ball_ombre", "poing_meteore", "seisme", "danse_lames"] },      // SPECTRE/METAL — pivot bulky set-up (superbe défense)
        { a: "leviabysse", b: "leviathonn", name: "Abyssathonn", moves: ["hydrocanon", "devoreur_ombres", "surtension", "repos"] },     // EAU/TÉN — mur colossal + speed-control (surtension −2 Vit, appris par Léviathonn)
        { a: "tenebrir", b: "thundah", name: "Thundèbre", moves: ["lance_flammes", "fulgurance", "vague_mentale", "focalisation"] },    // SPECTRE/FEU — sweeper spé le + rapide (Vit 449)
        { a: "tenebrir", b: "ombrapanthe", name: "Ténépanthe", moves: ["devoreur_ombres", "vague_mentale", "lance_flammes", "hypnose"] }, // SPECTRE/TÉN — ACE (Vit 428) ; hypnose FIABLE car rapide
    ] },
    { key: "lance", name: "LANCE", theme: "DRAGON", icon: "🐉", pairs: [
        // LANCE, Champion (Léviator/Dracaufeu/Ptéra + l'ACE Dracolosse) → sweepers physiques + le colosse dragon final.
        { a: "leviathonn", b: "aquilord", name: "Aquilathonn", moves: ["hydrocanon", "fonce_bec", "souffle_polaire", "reprise_ailes"] }, // EAU/VOL ~Léviator (mur spé) — hydrocanon = STAB Eau légal (léviathonn)
        { a: "dracarlin", b: "draconarque", name: "Dracarnarque", moves: ["crocs_de_feu", "pique_fatal", "draco_charge", "danse_lames"] }, // FEU/VOL ~Dracaufeu — draco_charge (Dragon) légal remplace seisme (non appris)
        { a: "chronorex", b: "pterosidhe", name: "Chronosidhe", moves: ["serres_aube", "bourrasque_feerique", "seisme", "danse_lames"] }, // VOL/FEE ~Ptéra — bourrasque_feerique = STAB Fée légal (ptérosidhe) remplace eclat_lunaire
        { a: "draconarque", b: "megalithe", name: "Dracolithe", moves: ["draco_charge", "lame_roche", "seisme", "danse_lames"] },        // DRAGON/ROCHE — RÉSISTE le Roche (casse le sweep anti-Vol) ; cogneur set-up
        { a: "oragron", b: "lunarque", name: "Lunagron", moves: ["tornade", "bourrasque_feerique", "fulgurance", "focalisation"] },      // VOL/FÉE — sweeper spé + set-up (moves 100% oragron/lunarque)
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

// RÔLES DE COMBAT — spreads EV/Saiyan dédiés pour donner à une fusion une IDENTITÉ nette (au lieu du build unique
//   « 252 signature + 252 PV » qui rendait tout le monde bulky). Chaque rôle = 2 stats EV + la stat Saiyan.
export type FusionRole = "sweep_atk" | "sweep_spc" | "wall_def" | "wall_spc" | "tank_atk" | "tank_spc"
const ROLE_EV: Record<FusionRole, { ev: [StatKey, StatKey]; saiyan: StatKey }> = {
    sweep_atk: { ev: ["atk", "spe"], saiyan: "spe" }, // sweeper physique : frappe + vitesse
    sweep_spc: { ev: ["spc", "spe"], saiyan: "spe" }, // sweeper spécial : Spé + vitesse
    wall_def: { ev: ["hp", "def"], saiyan: "def" },   // mur physique : PV + Déf
    wall_spc: { ev: ["hp", "spc"], saiyan: "spc" },   // mur/staller spécial : PV + Spé (= déf spé + attaque spé)
    tank_atk: { ev: ["hp", "atk"], saiyan: "atk" },   // tank offensif physique : PV + Atk
    tank_spc: { ev: ["hp", "spc"], saiyan: "spc" },   // tank offensif spécial : PV + Spé
}

/** IV PARFAITS (15 partout) — pour l'ultra-team du boss « au max ». Pas le flag shiny (pas de +10% ni de visuel chromatique). */
const PERFECT_IVS: Record<StatKey, number> = { hp: 15, atk: 15, def: 15, spe: 15, spc: 15 }

/** Parent optimisé. Sans `role` : build « au mieux » historique (252 signature + 252 PV, Saiyan signature). Avec `role` :
 *  spread EV/Saiyan du rôle → la fusion (moyenne des 2 parents bâtis avec le même rôle) hérite d'une identité claire.
 *  `perfectIv` : IV 15 partout (ultra-team du boss). */
function buildParent(speciesId: string, level: number, saiyan: number, role?: FusionRole, perfectIv = false): MonInstance {
    const sp = getSpecies(speciesId)
    if (!sp) throw new Error(`Ligue Fusion : espèce inconnue ${speciesId}`)
    const iv = perfectIv ? { ivsByStat: PERFECT_IVS } : {}
    if (role) {
        const { ev: [e1, e2], saiyan: sy } = ROLE_EV[role]
        return createMonInstance(speciesId, level, { ev: { [e1]: 252, [e2]: 252 }, allocated: { [sy]: saiyan }, ...iv })
    }
    const primary = signatureStat(sp)
    const ev: Partial<Record<StatKey, number>> = {}
    if (primary === "hp") { ev.hp = 252; ev[secondStat(speciesId, "hp")] = 252 }
    else { ev[primary] = 252; ev.hp = 252 }
    return createMonInstance(speciesId, level, { ev, allocated: { [primary]: saiyan }, ...iv })
}

// ==================== RENFORTS ANTI-TRIO (Spectre/Psy/Ténèbres) — ARGENT/OR SEULEMENT ====================
// Le trio Spectre/Psy/Ténèbres du joueur balayait le Conseil : à l'audit, WILL pliait 6/6, KOGA 5/6, BRUNO 5/6 (aucun
//   mur). On donne à chacune de ces 3 « passoires » UN mur THÉMATIQUE qui immunise/résiste le trio ET le RIPOSTE, mais
//   seulement dès le palier ARGENT — le Bronze garde son équipe d'origine (1er sacre accessible, cohérent avec le boss).
//   Un même parent (kangoudead) peut nourrir plusieurs murs : invisible au joueur (cf. en-tête). Noms de fusion uniques.
const ANTITRIO_ARGENT_OR: Record<string, { replace: string; with: FusionPairDef }[]> = {
    will: [
        { replace: "Hippofer", with: { a: "omnhippo", b: "kangoudead", name: "Omnikang", moves: ["vague_mentale", "devoreur_ombres", "repos", "hypnose"] } },            // PSY/TÉNÈBRES — immune Psy ×0 ; Dévoreur d'Ombres tape ton Spectre/Psy ×2 + draine
        { replace: "Morrinpâte", with: { a: "geckebre", b: "kangoudead", name: "Géckang", moves: ["morsure_sombre", "seisme", "repos", "toxik"] } },                     // SOL/TÉNÈBRES — mur anti-Jerbiwat increvable (PV699/Déf305 ; immune Psy ×0 ET Élec ×0, résiste Spectre ; seul le Feu passe neutre)
    ],
    koga: [{ replace: "Mérovortal", with: { a: "kangoudead", b: "merorem", name: "Mérodead", moves: ["toxik", "devoreur_ombres", "repos", "bombe_beurk"] } }],            // TÉNÈBRES/POISON — staller PV882, immune Psy, résiste Spectre/Ténèbres ×0.5
    bruno: [{ replace: "Coccikara", with: { a: "maitrezenc", b: "condombre", name: "Condozenc", moves: ["crochet_maitre", "morsure_sombre", "seisme", "danse_lames"] } }], // COMBAT/TÉNÈBRES — Atk502, immune Psy ; Crochet ×2 ton Ténèbres, Morsure ×2 ton Spectre/Psy
}

/** Paires effectives d'un dresseur au palier donné : Bronze = d'origine ; Argent/Or = murs anti-trio substitués (si définis). */
export function tierPairs(trainerKey: string, tier: FusionTier, pairs: FusionPairDef[]): FusionPairDef[] {
    const ovs = tier === "bronze" ? [] : (ANTITRIO_ARGENT_OR[trainerKey] ?? [])
    return ovs.length ? pairs.map((p) => ovs.find((o) => o.replace === p.name)?.with ?? p) : pairs
}

/** Équipe de FUSIONS d'un dresseur pour un palier. Renvoie des BuiltFusion (espèces éphémères ENREGISTRÉES →
 *  à DÉTRUIRE après le combat via disposeFusionLeagueTeam). Les parents ne sont jamais persistés. */
export function buildFusionLeagueTeam(trainerKey: string, tier: FusionTier, levelBonus = 0): BuiltFusion[] {
    const tr = FUSION_LEAGUE.find((t) => t.key === trainerKey)
    if (!tr) throw new Error(`Ligue Fusion : dresseur inconnu ${trainerKey}`)
    const { level: baseLevel, saiyan } = FUSION_TIERS[tier]
    // levelBonus (ex. vœu du génie « Ligue +3 ») → tous les fusionnés montent d'autant, plafonné à 100.
    const level = Math.min(100, baseLevel + Math.max(0, Math.floor(levelBonus)))
    return tierPairs(tr.key, tier, tr.pairs).map((p) =>
        buildFusion(buildParent(p.a, level, saiyan), buildParent(p.b, level, saiyan), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) }),
    )
}

// ==================== BOSS FINAL — LE DIEU SPAGHETTI (forme ultime) ====================
// Remplace le 6e combat (l'ancien MIROIR). Ton guide révélé comme l'adversaire ultime : 3 chimères d'échauffement
// Équipe de 6 fusions à TRÈS haut BST (1492-1750), 12 parents TOUS DISTINCTS, movesets 100% learnsets des parents.
// GOSHENDOFY et UKOGNOS sont utilisés SÉPARÉMENT (jamais fusionnés ensemble) → UKOGNOFY (la double-légendaire)
// reste RÉSERVÉE pour la vraie fin (zéro spoil ; toujours reconnue via officialFusions). tonytony est de la partie
// (Cryotony, tank 811 PV). Ordre = BST croissant, ACE = Aquendofy en dernier. Scalé par palier (bronze/argent/or).
export const FUSION_BOSS_PAIRS: FusionPairDef[] = [
    { a: "chronorex", b: "mobyd", name: "Chronobyd", moves: ["pique_fatal", "souffle_polaire", "seisme", "danse_lames"] },          // VOL/GLACE — attaquant mixte (ouvre)
    { a: "dracarlin", b: "pyrokoss", name: "Dracakoss", moves: ["lance_flammes", "draco_charge", "seisme", "danse_lames"] },        // FEU/DRAGON — sweeper ultra-rapide (spe 502)
    { a: "magnetor", b: "tenebrir", name: "Magnébrir", moves: ["devoreur_ombres", "poing_meteore", "lance_flammes", "hypnose"] },   // METAL/TÉN — mixte blindé + sommeil
    { a: "tonytony", b: "cryotyran", name: "Cryotony", moves: ["blizzard", "eveil_divin", "fulgurance", "repos"] },                 // NORMAL/GLACE — tank 811 PV (la pasta du Dieu Spaghetti)
    { a: "ukognos", b: "leviathonn", name: "Ukoviathonn", moves: ["cataclysme_lunaire", "hydrocanon", "fulgurance", "repos"] },     // FÉE/EAU — mur spécial (hp697/spc413)
    { a: "goshendofy", b: "aquapanthe", name: "Aquendofy", moves: ["souffle_primordial", "hydrocanon", "seisme", "repos"] },        // DRAGON/EAU — ACE (BST 1750)
]

// ==================== ULTRA-TEAM (ARGENT/OR) — le Dieu Spaghetti à SON APOGÉE ====================
// Dès le palier ARGENT, le boss présente une équipe REPENSÉE À FOND : la meilleure fusion dans CHAQUE rôle, large
// couverture de types (10), movesets optimaux (learnsets parents + CT), et surtout des BUILDS PAR RÔLE (EV/Saiyan
// dédiés via `role`) au lieu du build unique. 12 parents DISTINCTS (même contrainte que les joueurs). Le mur
// anti-Ténè-iwat Kangonarque est conservé. UKOGNOFY reste réservée (goshendofy/ukognos jamais ensemble).
// MégamonarX/Galijah EXCLUS comme parents (récompenses légendaires du joueur). Bronze = l'équipe d'origine.
export const FUSION_BOSS_ULTRA: FusionPairDef[] = [
    { a: "pyropanthe", b: "voltapanthe", name: "Pyrovolt", role: "sweep_spc", moves: ["fulgurance", "lance_flammes", "souffle_polaire", "vague_mentale"] },        // FEU/ELEC — SWEEPER SPÉ (Vit585/Spé428) : 2 STAB + Glace/Psy coverage
    { a: "alirocaillus", b: "coccimperatrice", name: "Alicocci", role: "sweep_atk", moves: ["pique_fatal", "crochet_maitre", "seisme", "danse_lames"] },           // VOL/COMBAT — SWEEPER PHYS (Atk415/Vit518) : 2 STAB + Séisme + set-up
    { a: "kangoudead", b: "draconarque", name: "Kangonarque", role: "wall_def", moves: ["ball_ombre", "draco_charge", "seisme", "devoreur_ombres"] },              // TÉN/DRAGON — MUR anti-Ténè-iwat (immune Psy) ; Ball'Ombre ×4, Dévoreur draine
    { a: "merorem", b: "tonytony", name: "Mérotony", role: "wall_spc", moves: ["toxik", "bombe_beurk", "blizzard", "repos"] },                                     // POISON/NORMAL — STALLER (PV795/Spé522) : Toxik + Repos + gros coups spé
    { a: "ukognos", b: "leviathonn", name: "Ukoviathonn", role: "wall_spc", moves: ["cataclysme_lunaire", "hydrocanon", "fulgurance", "repos"] },                  // FÉE/EAU — MUR SPÉ (PV526/Spé508)
    { a: "brookhante", b: "gloutanoir", name: "Gloutanté", role: "tank_spc", moves: ["tempete_verte", "devoreur_ombres", "lance_flammes", "repos"] },               // SPECTRE/PLANTE — ACE mur-nuke (encaisse 1767, Spé643 ; immunisé Normal/Combat ; Dévoreur tape ton Psy/Spectre ×2 + draine ; Repos = increvable)
]

/** Équipe du BOSS FINAL (Dieu Spaghetti ultime) au palier donné. BuiltFusion éphémères à DÉTRUIRE après combat.
 *  Bronze = équipe d'origine (1er sacre accessible) ; ARGENT/OR = l'ULTRA-TEAM (rôles dédiés, best-in-role, 12 parents distincts). */
export function buildFusionBossTeam(tier: FusionTier, levelBonus = 0): BuiltFusion[] {
    const { level: baseLevel, saiyan } = FUSION_TIERS[tier]
    const level = Math.min(100, baseLevel + Math.max(0, Math.floor(levelBonus)))
    const ultra = tier !== "bronze"
    const pairs = ultra ? FUSION_BOSS_ULTRA : FUSION_BOSS_PAIRS
    return pairs.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan, p.role, ultra), buildParent(p.b, level, saiyan, p.role, ultra), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) }),
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

// VŒU DU GÉNIE — « Ligue +3 » : marqueur (dans defeatedTrainers) qui monte TOUS les fusionnés adverses de la Ligue
//   de +3 niveaux (plafonné à 100 → n'affecte que bronze 80→83 / argent 90→93 ; l'or est déjà au max). Per-joueur.
export const LEAGUE_PLUS3_MARKER = "league_plus3"
export function leagueLevelBonus(isCleared: (marker: string) => boolean): number {
    return isCleared(LEAGUE_PLUS3_MARKER) ? 3 : 0
}

// FUSIO-BALL — offre EN ATTENTE : si le joueur ne l'achète pas au sacre (souvent < 1000 reps après la Ligue), le
//   marker `fusioball_owed` reste posé (dans defeatedTrainers) → le Dieu Spaghetti la RE-propose dès que le joueur
//   atteint FUSIOBALL_REOFFER_REPS. Retiré à l'achat. Marker boolean (pas de nouveau champ save).
export const FUSIOBALL_OWED_MARKER = "fusioball_owed"
export const FUSIOBALL_REOFFER_REPS = 1200
// Anti-spam : la re-proposition est plafonnée à 1×/JOUR via un marker DATÉ `fusioball_reoffer_<YYYY-MM-DD>`
//   (persisté dans defeatedTrainers). Tant que le jour est marqué, plus de pop. S'arrête net à l'achat (owed retiré).
export const FUSIOBALL_REOFFER_PREFIX = "fusioball_reoffer_"
export function isFusionLeagueUnlocked(isCleared: (marker: string) => boolean): boolean {
    return isCleared(FUSION_UNLOCK_MARKER)
}
