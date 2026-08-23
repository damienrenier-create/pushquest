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
        { a: "karmaki", b: "gloutanoir", name: "Gloutamaki", moves: ["patience", "tempete_verte", "vampigraine", "repos"] },          // PSY/PLANTE ~Noadkoko (mur drain) — Patience (signature karmaki) : rétribution ∝ PV encaissés = son win-con de staller
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
        { a: "supabatchu", b: "necrocorbe", name: "Supacorbe", moves: ["fulgurance", "souffle_polaire", "vampelec", "toxik"] },          // ELEC/POISON (le VOL saute au calcul) ~Nostenfer — STAB Élec = fulgurance/vampelec ; Souffle Polaire (Glace, spé) COUVRE les Sol immunisés à l'Élec, remplace Pique-Fatal (Vol physique = slot mort)
        { a: "sylvapuce", b: "merorem", name: "Cerforem", moves: ["tempete_verte", "bombe_beurk", "toxik", "repos"] },                  // PLANTE/POISON — staller ACE : gagne REPOS (soin) — on garde 2 offensifs (règle ≥2), donc c'est Spores-Dodo qui saute (pas Bombe-Beurk, sinon 1 seul offensif)
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
        { a: "geckebre", b: "condombre", name: "Géckombre", moves: ["ball_ombre", "seisme", "danse_lames", "repos"] },                  // SOL/TÉN — mur physique set-up : Ball'Ombre (Spectre PHYSIQUE, légal condombre) remplace Morsure (Ténèbres = spé, slot mort sur build Atk) ; STAB physique = Séisme
        { a: "ombrapanthe", b: "magnetor", name: "Magnépanthe", moves: ["ball_ombre", "poing_meteore", "seisme", "danse_lames"] },      // SPECTRE/METAL — pivot bulky set-up (superbe défense)
        { a: "leviabysse", b: "leviathonn", name: "Abyssathonn", moves: ["hydrocanon", "devoreur_ombres", "surtension", "repos"] },     // EAU/TÉN — mur colossal + speed-control (surtension −2 Vit, appris par Léviathonn)
        { a: "tenebrir", b: "thundah", name: "Thundèbre", moves: ["lance_flammes", "fulgurance", "vague_mentale", "focalisation"] },    // SPECTRE/FEU — sweeper spé le + rapide (Vit 449)
        { a: "tenebrir", b: "ombrapanthe", name: "Ténépanthe", moves: ["devoreur_ombres", "vague_mentale", "lance_flammes", "hypnose"] }, // SPECTRE/TÉN — ACE (Vit 428) ; hypnose FIABLE car rapide
    ] },
    { key: "lance", name: "LANCE", theme: "DRAGON", icon: "🐉", pairs: [
        // LANCE, Champion (Léviator/Dracaufeu/Ptéra + l'ACE Dracolosse) → sweepers physiques + le colosse dragon final.
        { a: "leviathonn", b: "aquilord", name: "Aquilathonn", moves: ["hydrocanon", "fonce_bec", "souffle_polaire", "reprise_ailes"] }, // EAU/VOL ~Léviator (mur spé) — hydrocanon = STAB Eau légal (léviathonn)
        { a: "dracarlin", b: "draconarque", name: "Dracarnarque", moves: ["crocs_de_feu", "pique_fatal", "draco_charge", "focalisation"] }, // FEU/VOL/DRAGON ~Dracaufeu — RE-RÔLÉ sweep_spc (types 100% spéciaux) : crocs/draco frappent en Spé ; focalisation (+Spé) remplace Danse-Lames (inutile en spé)
        { a: "chronorex", b: "pterosidhe", name: "Chronosidhe", moves: ["serres_aube", "bourrasque_feerique", "seisme", "danse_lames"] }, // VOL/FEE ~Ptéra — bourrasque_feerique = STAB Fée légal (ptérosidhe) remplace eclat_lunaire
        { a: "draconarque", b: "megalithe", name: "Dracolithe", moves: ["draco_charge", "lame_roche", "seisme", "danse_lames"] },        // DRAGON/ROCHE — RÉSISTE le Roche (casse le sweep anti-Vol) ; cogneur set-up
        { a: "oragron", b: "lunarque", name: "Lunagron", moves: ["tornade", "eclat_lunaire", "fulgurance", "focalisation"] },            // VOL/FÉE — sweeper spé : Éclat Lunaire (STAB Fée spé pw85, légal lunarque niv 38) remplace Bourrasque Féerique (pw40)
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
export const ROLE_EV: Record<FusionRole, { ev: [StatKey, StatKey]; saiyan: StatKey }> = {
    // NB : le point Saiyan d'un sweeper va sur son OFFENSE (pas la Vitesse — déjà à 252 EV) : ça tape plus fort ET évite
    //   qu'un boost de Vitesse ne FLIPPE le type contribué (ex. Jerbiwat PSY→ELEC si sa Vit dépasse sa Spé).
    sweep_atk: { ev: ["atk", "spe"], saiyan: "atk" }, // sweeper physique : Atk (Saiyan) + vitesse
    sweep_spc: { ev: ["spc", "spe"], saiyan: "spc" }, // sweeper spécial : Spé (Saiyan) + vitesse
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
        // (Ex-remplacement Hippofer→Omnikang RETIRÉ : WILL avait 2 murs kangoudead d'affilée → sprites auto-générés
        //  quasi identiques, effet « matraquage kangoudead ». On garde HIPPOFER (bronze, sprite maison, PSY/METAL —
        //  lui aussi mur anti-Ténèbres/Spectre + debuff) → WILL n'a plus qu'UN seul kangoudead (Géckang).)
        { replace: "Morrinpâte", with: { a: "geckebre", b: "kangoudead", name: "Géckang", moves: ["morsure_sombre", "seisme", "repos", "toxik"] } },                     // SOL/TÉNÈBRES — mur anti-Jerbiwat increvable (PV699/Déf305 ; immune Psy ×0 ET Élec ×0, résiste Spectre ; seul le Feu passe neutre)
    ],
    koga: [{ replace: "Mérovortal", with: { a: "kangoudead", b: "merorem", name: "Mérodead", moves: ["toxik", "devoreur_ombres", "repos", "bombe_beurk"] } }],            // TÉNÈBRES/POISON — staller PV882, immune Psy, résiste Spectre/Ténèbres ×0.5
    bruno: [{ replace: "Coccikara", with: { a: "maitrezenc", b: "condombre", name: "Condozenc", moves: ["crochet_maitre", "ball_ombre", "seisme", "danse_lames"] } }], // COMBAT/TÉNÈBRES — Atk502, immune Psy ; Crochet ×2 ton Ténèbres, Ball'Ombre (Spectre PHYSIQUE, légal condombre) pour enfin TOUCHER les Spectres (Combat 0×) — remplace Morsure (Ténèbres = spé, riposte nulle)
}

/** Paires effectives d'un dresseur au palier donné : Bronze = d'origine ; Argent/Or = murs anti-trio substitués (si définis). */
export function tierPairs(trainerKey: string, tier: FusionTier, pairs: FusionPairDef[]): FusionPairDef[] {
    const ovs = tier === "bronze" ? [] : (ANTITRIO_ARGENT_OR[trainerKey] ?? [])
    return ovs.length ? pairs.map((p) => ovs.find((o) => o.replace === p.name)?.with ?? p) : pairs
}

// RÔLES DES FUSIONS DU CONSEIL (nom → rôle) : chaque équipe reçoit un SPREAD de rôles distincts (au lieu du build
//   unique bulky), tout en respectant la tendance NATURELLE de chaque fusion (moveset + stats). VARIÉTÉ cross-dresseur
//   assurée : le 1er slot n'est jamais le même rôle (WILL=sweeper, KOGA=mur, BRUNO=sweeper, KAREN=tank, LANCE=mur), et
//   le Psy (WILL) n'est pas QUE des sweepers. Inclut les murs anti-trio (Omnikang/Géckang/Mérodead/Condozenc).
export const CONSEIL_ROLES: Record<string, FusionRole> = {
    // WILL (Psy) — attaquants spé + stallers + 1 mur.
    Divinaquil: "sweep_spc", Gloutamaki: "wall_spc", Flamarée: "wall_spc", Morrinpâte: "sweep_spc", Hippofer: "wall_def", Jerbibouh: "sweep_spc", Omnikang: "wall_spc", Géckang: "wall_def",
    // KOGA (Poison) — stallers + 1 bruiser physique + 1 sweeper élec.
    Mérolopendre: "wall_def", Regnadruide: "wall_spc", Impérafer: "sweep_atk", Mérovortal: "wall_spc", Supacorbe: "sweep_spc", Cerforem: "wall_spc", Mérodead: "wall_spc",
    // BRUNO (Combat) — cogneurs physiques + 1 mur roche + 1 garde spé.
    Zenclumind: "sweep_atk", Maîtrelmin: "tank_atk", Aquidruide: "sweep_atk", Coccikara: "sweep_atk", Rocholithe: "wall_def", Mérokara: "wall_spc", Condozenc: "tank_atk",
    // KAREN (Ténèbres) — le + varié : tank/mur/sweeper phys + staller spé + 2 sweepers spé rapides (ACE Ténépanthe).
    Bouhdruide: "tank_atk", Géckombre: "wall_def", Magnépanthe: "sweep_atk", Abyssathonn: "wall_spc", Thundèbre: "sweep_spc", Ténépanthe: "sweep_spc",
    // LANCE (Dragon) — mur spé + 2 sweepers phys + mur roche + sweeper spé + ACE tank.
    Aquilathonn: "wall_spc", Dracarnarque: "sweep_spc", Chronosidhe: "sweep_atk", Dracolithe: "wall_def", Lunagron: "sweep_spc", Goshendarque: "tank_atk",
}

// OBJETS TENUS ENNEMIS (argent/or) — variés par RÔLE pour coller à l'archétype de la fusion. Baie réactive + objet
//   passif. Budget : ARGENT 1 baie + 1 objet ; OR 2 baies + 2 objets. Les baies ne sont posées que si `berriesActive`
//   (règle « 1re run du jour » en argent ; TOUJOURS en or — décidé dans gameStore). L'ACE (dernière fusion) prend la
//   Baie Phénix en OR. Les objets passifs (Restes/Bandeau…) sont TOUJOURS présents dès l'argent. Rien en bronze.
const ROLE_BERRY: Record<FusionRole, string> = {
    wall_def: "baie_roc",     // +Déf à ¼ PV : le mur devient increvable
    wall_spc: "baie_pure",    // staller : immunise le statut (para/toxik/gel/brûlure)
    tank_atk: "baie_soin",    // soin 30 % à ⅓ PV
    tank_spc: "baie_soin",
    sweep_atk: "baie_fougue", // +Atk à ¼ PV : comeback offensif
    sweep_spc: "baie_eclat",  // +Spé à ¼ PV
}
const ROLE_OBJECT: Record<FusionRole, string> = {
    wall_def: "restes",        // regen passif 1/16/tour
    wall_spc: "restes",
    tank_atk: "bandeau",       // survit à un OHKO depuis PV pleins
    tank_spc: "poudre_claire", // −10 % précision adverse
    sweep_atk: "vive_griffe",  // 20 % passe en 1er
    sweep_spc: "lentilscope",  // +1 cran de critique
}
/** Attribue les objets tenus ENNEMIS (argent/or) : baies aux fusions les + tanky / à l'ACE (fin de team, gatées par
 *  berriesActive) ; objets passifs aux fusions de tête (toujours). Rien en bronze. Modifie les instances EN PLACE. */
function assignEnemyHeldItems(team: BuiltFusion[], roles: (FusionRole | undefined)[], tier: FusionTier, berriesActive: boolean): void {
    if (tier === "bronze") return
    const nBerry = tier === "or" ? 2 : 1
    const nObj = tier === "or" ? 2 : 1
    const roleAt = (i: number): FusionRole => roles[i] ?? "tank_atk"
    if (berriesActive) {
        for (let k = 0; k < nBerry; k++) {
            const i = team.length - 1 - k
            if (i < 0) break
            team[i].instance.heldItem = (tier === "or" && k === 0) ? "baie_phenix" : ROLE_BERRY[roleAt(i)]
        }
    }
    let placed = 0
    for (let i = 0; i < team.length && placed < nObj; i++) {
        if (team[i].instance.heldItem) continue // déjà une baie posée ci-dessus
        team[i].instance.heldItem = ROLE_OBJECT[roleAt(i)]
        placed++
    }
}

/** Équipe de FUSIONS d'un dresseur pour un palier. Renvoie des BuiltFusion (espèces éphémères ENREGISTRÉES →
 *  à DÉTRUIRE après le combat via disposeFusionLeagueTeam). Les parents ne sont jamais persistés.
 *  Chaque fusion est bâtie avec SON rôle (CONSEIL_ROLES) → archétypes nets (sweeper frêle, mur bulky…).
 *  `berriesActive` (argent/or) : pose aussi les baies réactives (cf. assignEnemyHeldItems). */
export function buildFusionLeagueTeam(trainerKey: string, tier: FusionTier, levelBonus = 0, berriesActive = false): BuiltFusion[] {
    const tr = FUSION_LEAGUE.find((t) => t.key === trainerKey)
    if (!tr) throw new Error(`Ligue Fusion : dresseur inconnu ${trainerKey}`)
    const { level: baseLevel, saiyan } = FUSION_TIERS[tier]
    // levelBonus (ex. vœu du génie « Ligue +3 ») → tous les fusionnés montent d'autant, plafonné à 100.
    const level = Math.min(100, baseLevel + Math.max(0, Math.floor(levelBonus)))
    const pairs = tierPairs(tr.key, tier, tr.pairs)
    const team = pairs.map((p) => {
        const role = CONSEIL_ROLES[p.name]
        return buildFusion(buildParent(p.a, level, saiyan, role), buildParent(p.b, level, saiyan, role), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) })
    })
    assignEnemyHeldItems(team, pairs.map((p) => CONSEIL_ROLES[p.name]), tier, berriesActive)
    return team
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
    { a: "pyropanthe", b: "voltapanthe", name: "Pyrovolt", role: "sweep_spc", moves: ["pyrotechnie", "fulgurance", "lance_flammes", "souffle_polaire"] },        // FEU/ELEC — SWEEPER SPÉ (Vit585/Spé428) : OUVRE sur Pyrotechnie (−2 Spé cible → nos STAB explosent) puis 2 STAB + Glace
    { a: "alirocaillus", b: "coccimperatrice", name: "Alicocci", role: "tank_atk", moves: ["pique_fatal", "crochet_maitre", "seisme", "danse_lames"] },            // VOL/COMBAT — BRUISER bulky (tank_atk : PV+Atk) : ex-maillon faible (trop frêle en sweep_atk), solidifié
    { a: "kangoudead", b: "draconarque", name: "Kangonarque", role: "wall_def", moves: ["ball_ombre", "draco_charge", "seisme", "devoreur_ombres"] },              // TÉN/DRAGON — MUR anti-Ténè-iwat (immune Psy) ; Ball'Ombre ×4, Dévoreur draine
    { a: "merorem", b: "tonytony", name: "Mérotony", role: "wall_spc", moves: ["toxik", "bombe_beurk", "blizzard", "repos"] },                                     // POISON/NORMAL — STALLER (PV795/Spé522) : Toxik + Repos + gros coups spé
    { a: "ukognos", b: "leviathonn", name: "Ukoviathonn", role: "wall_spc", moves: ["cataclysme_lunaire", "hydrocanon", "fulgurance", "repos"] },                  // FÉE/EAU — MUR SPÉ (PV526/Spé508)
    { a: "brookhante", b: "gloutanoir", name: "Gloutanté", role: "tank_spc", moves: ["tempete_verte", "devoreur_ombres", "lance_flammes", "repos"] },               // SPECTRE/PLANTE — ACE mur-nuke (encaisse 1767, Spé643 ; immunisé Normal/Combat ; Dévoreur tape ton Psy/Spectre ×2 + draine ; Repos = increvable)
]

/** Équipe du BOSS FINAL (Dieu Spaghetti ultime) au palier donné. BuiltFusion éphémères à DÉTRUIRE après combat.
 *  Bronze = équipe d'origine (1er sacre accessible) ; ARGENT/OR = l'ULTRA-TEAM (rôles dédiés, best-in-role, 12 parents distincts). */
export function buildFusionBossTeam(tier: FusionTier, levelBonus = 0, berriesActive = false): BuiltFusion[] {
    const { level: baseLevel, saiyan } = FUSION_TIERS[tier]
    const level = Math.min(100, baseLevel + Math.max(0, Math.floor(levelBonus)))
    const ultra = tier !== "bronze"
    const pairs = ultra ? FUSION_BOSS_ULTRA : FUSION_BOSS_PAIRS
    const team = pairs.map((p) =>
        buildFusion(buildParent(p.a, level, saiyan, p.role, ultra), buildParent(p.b, level, saiyan, p.role, ultra), { name: p.name, moves: p.moves, sprite: p.sprite ?? fusionSpritePath(p.name) }),
    )
    assignEnemyHeldItems(team, pairs.map((p) => p.role), tier, berriesActive)
    return team
}

/** Détruit les espèces éphémères d'une équipe de Ligue (fin de combat / démontage). */
export function disposeFusionLeagueTeam(team: BuiltFusion[]): void {
    for (const f of team) disposeFusion(f.speciesId)
}

/** Toutes les paires de parents (pour vérifier l'unicité / le contenu). */
export function allFusionLeaguePairs(): FusionPairDef[] {
    return FUSION_LEAGUE.flatMap((t) => t.pairs)
}

/** TOUTES les fusions AFFRONTABLES en Ligue (Conseil bronze + remplacements Argent/Or + boss Dieu Spaghetti +
 *  boss ultra), dédupliquées par NOM (les noms sont uniques par design). Sert à bâtir leurs fiches de FUSIODEX. */
export function allEncounterableFusionDefs(): FusionPairDef[] {
    const all: FusionPairDef[] = [
        ...FUSION_LEAGUE.flatMap((t) => t.pairs),
        ...Object.values(ANTITRIO_ARGENT_OR).flatMap((ovs) => ovs.map((o) => o.with)),
        ...FUSION_BOSS_PAIRS,
        ...FUSION_BOSS_ULTRA,
    ]
    const byName = new Map<string, FusionPairDef>()
    for (const p of all) if (!byName.has(p.name)) byName.set(p.name, p)
    return [...byName.values()]
}

/** Fusions ENNEMIES sans PNG statique (boss ULTRA Argent/Or + murs anti-trio Argent/Or) → à GÉNÉRER (Gemini) à
 *  l'entrée de Ligue pour ne laisser AUCUN trou (elles s'affichaient en placeholder composite faute de sprite dédié).
 *  Toutes les AUTRES fusions ennemies (Conseil bronze, KAREN, LANCE, boss bronze) ont déjà leur sprite dans public/
 *  (ou un `sprite:` override, ex. Zenclumind). Dé-doublonné par paire côté requestFusionSprites ; types omis
 *  (optionnels — le générateur les déduit des parents). Pré-chauffé dès le Bronze : prêts quand on atteint Argent/Or. */
export function enemyFusionSpriteItems(): Array<{ aId: string; bId: string; name: string }> {
    const defs: FusionPairDef[] = [
        ...FUSION_BOSS_ULTRA,
        ...Object.values(ANTITRIO_ARGENT_OR).flatMap((ovs) => ovs.map((o) => o.with)),
    ]
    const seen = new Set<string>()
    const out: Array<{ aId: string; bId: string; name: string }> = []
    for (const p of defs) {
        if (p.sprite) continue // sprite statique/override → aucune génération
        const key = `${p.a}__${p.b}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ aId: p.a, bId: p.b, name: p.name })
    }
    return out
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
