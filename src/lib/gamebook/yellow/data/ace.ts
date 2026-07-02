// src/lib/gamebook/yellow/data/ace.ts
//
// Nexus Jaune Éclair — ACE, le RIVAL parfait (1 défaite/jour). React-free, pur, testable.
//
// MODÈLE (par joueur) :
//   • Équipe FIXE de 5 : 3 Panthéons (modèle de base) + lignée Nouillon (Psy) + lignée Feu.
//   • Slot 6 ADAPTATIF : tiré d'une BOX de contres = la faiblesse parfaite de TON dernier Daemon.
//   • Niveau = ton meilleur Daemon + offset(victoires), RECALIBRÉ à CHAQUE combat. Rampe :
//     -1 / 0 / +1 pour tes 3 premières fois (un poil faciles), puis +2 ensuite.
//     Le contre s'aligne sur ton dernier Daemon (mémoire box). Énergie : illimitée (PNJ).
// L'IA "ace" + le budget d'énergie (1,5× tes reps) sont gérés au moteur/store.

import { getSpecies, SPECIES } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import type { PokeType } from "../battle/types"

export const ACE_TRAINER_ID = "y_ace"
export const ACE_ENERGY_MULT = 1.5
export const MAX_LEVEL = 100

// Emplacement sur la VILLE (yellow_entrance) : ACE se tient en (0,16) et interpelle
// le joueur dès qu'il marche sur la bande (0,17)/(0,18)/(0,19).
export const ACE_POS = { x: 0, y: 16 }
export const ACE_TRIGGER_TILES: { x: number; y: number }[] = [
    { x: 0, y: 17 }, { x: 0, y: 18 }, { x: 0, y: 19 },
]

// === DIALOGUES (humour noir) — ACE, rival nonchalant/arrogant, tutoie, appelle « rival ». ============
// INTROS : une PIOCHÉE AU HASARD à chaque rencontre (aceIntro). 1re ligne = didascalie.
export const ACE_INTRO_VARIANTS: string[][] = [
    ["*ACE sort une main de sa poche, à peine.*", "« Tiens, encore toi. Toujours vivant ? Touchant. »"],
    ["*ACE bâille sans cacher sa bouche.*", "« Oh. Toi. La routine reprend, rival. Au moins toi t'es ponctuel. »"],
    ["*Il fait tourner une Ball sur son doigt, le regard ailleurs.*", "« La vie, c'est ça : tu te lèves, tu te bats, tu perds. Allez, déprimons ensemble. »"],
    ["*ACE s'adosse au mur le plus proche comme si c'était son lit.*", "« J'allais m'endormir d'ennui. Réveille-moi si tu deviens intéressant. »"],
    ["*Il claque des doigts mollement, comme une formalité.*", "« Allez, on expédie. J'ai un ennui plus urgent qui m'attend après toi. »"],
    ["*ACE regarde le ciel, l'air absent.*", "« Un jour, le soleil s'éteindra. Mais bon. D'ici là, j'ai le temps de t'écraser. »"],
    ["*ACE trace un trait dans la poussière du bout du pied.*", "« Là, c'est toi. Et là… » *il l'efface.* « …c'est toi après. »"],
    ["*ACE observe une feuille morte tomber, sans bouger.*", "« Elle a fait sa saison, elle. Toi, tu fais quoi, au juste ? »"],
    ["*ACE retire ses mains des poches, lentement, comme s'il signait un papier.*", "« Bonjour. La Faucheuse m'a demandé de remplir ta fiche d'entrée. Tu permets ? »"],
    ["*ACE sourit poliment, sans que ça monte jusqu'aux yeux.*", "« Ravi de te revoir, rival. Vraiment. Ce sera bref. Pour toi. »"],
    ["*ACE incline la tête, presque courtois.*", "« Encore plus fort qu'hier, comme promis. C'est la seule promesse que je tiens. »"],
    ["*ACE consulte une montre qu'il n'a pas.*", "« Pile à l'heure pour ta correction. La ponctualité, c'est une politesse, non ? »"],
]
// Badge Flamme obtenu → ACE s'écarte vers CENDREVILLE + teaser la LIGUE.
export const ACE_PASS_LINES = [
    "*ACE renifle l'air, s'écarte d'un pas, sourire en coin.*",
    "« Tu pues le roussi. Bon. CENDREVILLE est à toi — profites-en avant qu'elle t'enterre. »",
    "« Et tout au sud, la LIGUE : le Conseil des 4, le Maître. Tous les badges, ou les portes restent closes comme un caveau. J'y serai. Sur le trône. »",
]
// Pas (encore) le Badge Flamme : ACE bloque CENDREVILLE.
export const ACE_GATE_LINES = [
    "*ACE s'adosse au panneau, sans bouger d'un poil.*",
    "« CENDREVILLE ? Son joli petit cimetière… rien là-bas qui vaille de mourir, crois-moi. »",
    "« Reviens quand tu sentiras le cramé. Va griller PYRA, l'arène Feu. Badge Flamme ou demi-tour, rival. »",
]
export const ACE_DONE_LINES = [
    "*ACE bâille, se détourne déjà.*",
    "« Voilà, t'as eu ta dose. La routine, c'est ça, la vie. »",
    "« File. Demain je reviens plus fort. Toi, tâche d'être encore là. »",
]
export const ACE_NO_TEAM_LINES = [
    "*ACE jette un œil à tes Daemons étalés, blasé.*",
    "« Tu m'amènes des cadavres et tu veux te battre ? Même moi je trouve ça d'un goût douteux. »",
    "« Va les ressusciter et reviens mourir proprement, rival. »",
]
// Teaser du cadeau Panthéon ({n} = nb de victoires restantes) + ligne d'après-cadeau.
export const ACE_GIFT_TEASER = "« Encore {n} et je te lègue un Panthéon. Considère ça comme un héritage anticipé. »"
export const ACE_GIFT_DONE = "« T'as déjà ton Panthéon. J'en ai pas d'autre dans la poche — j'ai l'air d'un fossoyeur ? Reviens te battre quand même : j'aime te voir tomber. »"
// CLÔTURES DE COMBAT. WIN_TAUNTS = ACE GAGNE (joueur K.O.). LOSE_LINES = ACE PERD (joueur gagne, concession).
export const ACE_WIN_TAUNTS = [
    "« T'as donné ton maximum, rival ? Triste. Le néant aussi fait ça. »",
    "*bâille* « J'ai vu des bougies tenir plus longtemps que ton équipe. »",
    "« La Faucheuse a déjà tamponné ton dossier. Trois exemplaires. »",
    "« C'était joli. Comme la poussière qui retombe après une explosion. »",
    "« Même l'entropie a ralenti pour te regarder couler. Élégant. »",
    "« Y'a comme un froid soudain. Ah non, c'est juste ton équipe. »",
    "*regarde le ciel* « Il fait beau pour un naufrage. J'organise une éclaircie pour tes adieux. »",
    "« “Presque” serré. C'est le mot qu'on grave sur les pierres tombales des seconds. »",
    "« Poussière tu étais, poussière je t'ai remis. De rien, rival. »",
    "« J'ai pré-rempli le formulaire de défaite. T'avais qu'à signer. Merci. »",
    "« Même les étoiles s'éteignent. Toi, un peu plus tôt que prévu. »",
    "« Reviens quand tu veux. La défaite, elle, attend toujours patiemment. »",
]
export const ACE_LOSE_LINES = [
    "*hausse les épaules* « T'as gagné. L'univers s'éteindra quand même, alors bon. »",
    "« Battu. Statistiquement, ça devait arriver un siècle ou l'autre. »",
    "*sort les mains des poches, lentement* « D'accord. Note ça quelque part avant d'oublier. »",
    "« Tu m'as eu. La météo aussi se trompe parfois, et personne n'en meurt. »",
    "« Victoire pour toi. La Faucheuse classera mon dossier « report ». »",
    "*demi-sourire* « T'as gagné une bataille. Le néant, lui, reste invaincu. »",
    "« Tch. Une poussière dans l'engrenage. Demain je balaie, rival. »",
    "« Bien joué. Grave-le quelque part : ça brille, j'admets, mais ça ne dure pas. »",
    "« Mes félicitations, sincères à 4 %. Le reste, c'est l'univers qui te les doit. »",
    "« Mauvaise météo intérieure. Demain je rapporte le soleil, et l'addition. »",
    "« Une ligne dans le grand registre des fins. La tienne brillera moins vite que tu crois. »",
    "« L'entropie m'a juste laissé sortir fumer. Profite de l'éclaircie : je reviens. »",
]

function acePick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
/** Intro PIOCHÉE AU HASARD (différente à chaque rencontre). */
export function aceIntro(): string[] { return acePick(ACE_INTRO_VARIANTS) }
/** Raillerie quand ACE GAGNE (le joueur a perdu). */
export function aceWinTaunt(): string { return acePick(ACE_WIN_TAUNTS) }
/** Concession quand ACE PERD (le joueur a gagné). */
export function aceLoseLine(): string { return acePick(ACE_LOSE_LINES) }
/** Ligne teaser du cadeau selon le nb de victoires : compte à rebours, ou ligne d'après-cadeau. */
export function aceGiftLine(aceWins: number): string {
    const left = ACE_PANTHEON_WIN - aceWins
    return left > 0 ? ACE_GIFT_TEASER.replace("{n}", `${left} victoire${left > 1 ? "s" : ""}`) : ACE_GIFT_DONE
}

export interface AceMon { speciesId: string; level: number }

// === ÉQUIPE FIXE (5 slots) ===
// Slots 1-3 = le PANTHÉON (modèle de base, Normal, BST 297) — celui qu'ACE t'offre.
// On NE met PLUS les panthères élites (Ombra/Volta/Pyropanthe, BST ~455) : elles étaient
// 1000x trop fortes dès le 1er combat. Nouillon & la lignée Feu évoluent avec le niveau.
export const ACE_PANTHERS = ["pantheon", "pantheon", "pantheon"]
// Les 3 Panthéon d'ACE ÉVOLUENT PAR PALIERS en panthères élémentaires (Feu/Élec/Spectre, BST ~455), au
// fil de TES badges : 3 badges → 1 évoluée · 4 → 2 · 5 → les 3. Aucune avant 3 badges → plus de souci
// "1000x trop fort" en début de partie ; la montée est progressive au lieu d'un saut 0→3 brutal.
export const ACE_PANTHERS_EVOLVED = ["pyropanthe", "voltapanthe", "ombrapanthe"]

/** Trio de Panthéon d'ACE selon le nb de badges du joueur : les `badgeCount - 2` premières sont évoluées
 *  (bornées 0..3) — 0-2 badges → aucune, 3 → 1, 4 → 2, 5 → les 3. */
export function acePanthersFor(badgeCount: number): string[] {
    const evolved = Math.max(0, Math.min(ACE_PANTHERS_EVOLVED.length, badgeCount - 2))
    return ACE_PANTHERS.map((base, i) => (i < evolved ? ACE_PANTHERS_EVOLVED[i] : base))
}
export const ACE_NOUILLON_BASE = "nouillon"   // → vermisaint → divinpate
export const ACE_FIRE_BASE = "braisille"      // → flamkure → pyrokoss
// NG+ (2e run) : les 3 Panthéon sont remplacés par ce trio (rétro-évolués au bon stade selon le niveau),
// et la lignée Nouillon/Divin Pâte est remplacée par le NÉMÉSIS (contre-lignée de ta création).
export const ACE_NGPLUS_CORE = ["tonytony", "enclumind", "torturoche"]
export const ACE_LEVEL_OFFSET = 2     // offset FINAL (dès la 4e rencontre) : ta MOYENNE d'équipe +2
export const ACE_EASY_START = -1      // 1re rencontre : ta moyenne -1 (un poil facile)

/**
 * Offset de niveau d'ACE selon le nb de VICTOIRES (rampe douce, +1/victoire) : -1, 0, +1
 * pour tes 3 premières fois, puis +2 ensuite. Recalibré sur ton meilleur Daemon à CHAQUE combat.
 */
export function aceLevelOffset(aceWins: number): number {
    return Math.min(ACE_LEVEL_OFFSET, ACE_EASY_START + Math.max(0, aceWins))
}

// === BOX de 10 contres (un bon attaquant par type clé) ===
// Le slot 6 = celui qui frappe le plus fort le DERNIER Daemon du joueur (faiblesse parfaite).
export const ACE_BOX = [
    "razmaree", "gloutanoir", "maitrezenc", "rochison", "auroraur",
    "zappeureal", "draconarque", "regnantaur", "magmator", "mycedruide",
]

/** Niveau-cible des slots fixes : max(pic, MOYENNE d'équipe du joueur + 2). Ne régresse jamais.
 *  (Basé sur la moyenne, plus sur le meilleur : un dresseur n'a jamais TOUTE son équipe à son pic.) */
export function aceTargetLevel(acePeak: number, playerAvgLevel: number): number {
    return Math.min(MAX_LEVEL, Math.max(1, acePeak, playerAvgLevel + ACE_LEVEL_OFFSET))
}

/** Meilleur contre de la box face aux types du dernier Daemon joueur. */
export function bestCounter(playerLastTypes: PokeType[]): string {
    let best = ACE_BOX[0], bestEff = -1
    for (const id of ACE_BOX) {
        const sp = getSpecies(id)
        if (!sp) continue
        const eff = Math.max(...sp.types.map((t) => typeEffectiveness(t, playerLastTypes)))
        if (eff > bestEff) { bestEff = eff; best = id }
    }
    return best
}

/** Remonte une espèce jusqu'à sa SOUCHE (1er stade) — utile pour rétro-évoluer un contre (finale) au bon
 *  stade selon le niveau d'ACE (sinon une finale apparaissait au niveau d'une souche, ex. dragon stade-3 niv 4). */
export function baseSpeciesOf(id: string): string {
    let cur = id
    for (let g = 0; g < 6; g++) {
        const parent = Object.values(SPECIES).find((s) => s.evolution?.toId === cur)
        if (!parent) break
        cur = parent.id
    }
    return cur
}

/** Espèce au bon STADE d'évolution pour un niveau donné (suit la chaîne par niveau). */
export function speciesAtLevel(baseId: string, level: number): string {
    let id = baseId
    for (let guard = 0; guard < 5; guard++) {
        const evo = getSpecies(id)?.evolution
        const lvl = evo ? (evo.method as { level?: number }).level : undefined
        if (evo && typeof lvl === "number" && lvl <= level) id = evo.toId
        else break
    }
    return id
}

export interface AceBuildInput {
    /** Niveau CLIQUET d'ACE pour ce combat : il ne monte QU'À sa défaite (cf. recordAceDefeat /
     *  aceBattleLevel). On l'utilise tel quel ici — AUCUNE recalibration sur le joueur à la
     *  rencontre (sinon ACE monterait à chaque fois que TON équipe grandit, bug signalé). */
    aceLevel: number
    playerLastTypes: PokeType[]  // types du DERNIER Daemon joueur → choisit le contre adaptatif (slot 6)
    badgeCount?: number          // nb de badges du joueur → paliers d'évolution des Panthéon (3→1, 4→2, 5→3)
    ngplus?: boolean             // 2e run → trio thématisé (tonytony/enclumind/tortoracle) + Némésis à la place de Divin Pâte
    nemesisSpeciesId?: string    // NG+ : lignée Némésis (stade 1) à fielder à la place de Divin Pâte (fallback Nouillon)
}

/**
 * Construit l'équipe ACE (6) pour un combat : 5 fixes + 1 contre adaptatif, TOUS au niveau
 * CLIQUET d'ACE. Le contre adapte son ESPÈCE à ton dernier Daemon, mais reste au niveau d'ACE
 * (pas de scaling live). Renvoie aussi l'espèce-contre (pour mémoriser à la défaite).
 */
export function buildAceTeam(i: AceBuildInput): { team: AceMon[]; counterSpecies: string } {
    const L = Math.max(1, Math.min(MAX_LEVEL, i.aceLevel))
    const counter = bestCounter(i.playerLastTypes)
    // NG+ (2e run) : trio thématisé (rétro-évolué au bon stade) + NÉMÉSIS à la place de Divin Pâte + Feu + contre.
    if (i.ngplus) {
        const team: AceMon[] = [
            { speciesId: speciesAtLevel(baseSpeciesOf(ACE_NGPLUS_CORE[0]), L), level: L },
            { speciesId: speciesAtLevel(baseSpeciesOf(ACE_NGPLUS_CORE[1]), L), level: L },
            { speciesId: speciesAtLevel(baseSpeciesOf(ACE_NGPLUS_CORE[2]), L), level: L },
            // Némésis (stade 1 déjà = souche) évolué au bon stade ; fallback Nouillon/Divin Pâte si pas de custom.
            { speciesId: speciesAtLevel(i.nemesisSpeciesId ?? ACE_NOUILLON_BASE, L), level: L },
            { speciesId: speciesAtLevel(ACE_FIRE_BASE, L), level: L },
            { speciesId: speciesAtLevel(baseSpeciesOf(counter), L), level: L },
        ]
        return { team, counterSpecies: counter }
    }
    const panthers = acePanthersFor(i.badgeCount ?? 0) // paliers d'évolution selon le nb de badges (0-2→0, 3→1, 4→2, 5→3)
    const team: AceMon[] = [
        { speciesId: panthers[0], level: L },
        { speciesId: panthers[1], level: L },
        { speciesId: panthers[2], level: L }, // Panthéon → panthère élémentaire si badge Éclair
        { speciesId: speciesAtLevel(ACE_NOUILLON_BASE, L), level: L },
        { speciesId: speciesAtLevel(ACE_FIRE_BASE, L), level: L },
        // Contre adaptatif RÉTRO-ÉVOLUÉ au bon stade pour le niveau d'ACE (les ACE_BOX sont des finales :
        // sans ça, une finale apparaissait au niveau d'une souche, ex. dragon stade-3 au niv 4 après reset).
        { speciesId: speciesAtLevel(baseSpeciesOf(counter), L), level: L },
    ]
    return { team, counterSpecies: counter }
}

/** Budget d'énergie d'ACE = 1,5× les reps du joueur au début du match. */
export function aceEnergyBudget(playerReps: number): number {
    return Math.max(0, Math.floor(playerReps * ACE_ENERGY_MULT))
}

export interface AceReward {
    itemId?: string
    reps?: number
    gift?: string       // espèce offerte (Panthéon)
    refund?: boolean    // rembourse l'énergie dépensée ce combat
    message: string
}

/** Nombre de victoires sur ACE qui débloque le cadeau Panthéon (cf. teaser + compte à rebours). */
export const ACE_PANTHEON_WIN = 7

/** Récompense à la n-ième victoire (1-indexée). Messages en humour noir (la concession d'ACE est ajoutée à part). */
export function aceReward(winNumber: number): AceReward {
    if (winNumber <= 3) return { itemId: "poke_ball_plus", reps: 100, message: "« Tiens : une Nexus-Ball + et 100 reps. De quoi décorer ton caveau jusqu'à ta prochaine défaite. »" }
    if (winNumber <= 6) return { itemId: "super_ball", reps: 150, message: "« Super Nexus-Ball et 150 reps. Des fleurs sur ta future tombe, rival. Tu t'accroches, c'est touchant. »" }
    if (winNumber === ACE_PANTHEON_WIN) return { gift: "pantheon", message: "« Sept fois. Sept. Voilà ton Panthéon — fais-le évoluer comme tu veux. Il te survivra, c'est sûr. »" }
    return { refund: true, message: "« Plus de cadeau, j'ai vidé le caveau. Je te rends ton énergie, c'est tout. Même mon stock a une fin. »" }
}
