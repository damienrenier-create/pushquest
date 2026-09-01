// L'ARCHIVISTE — nouveau PNJ « Collectionneur » qui offre/débloque le DEX-CATALOGUE (à distinguer du
//   Collectionneur DE SPECTRES de la maison hantée, HH_COLLECTOR_ID, et d'Embi « Le Collectionneur » du Dôme).
//   Il ERRE sur la Ville Jaune (yellow_entrance) sur une case aléatoire re-tirée à chaque visite. Son équipe est
//   tirée AU HASARD parmi les Daemons DÉJÀ VUS par le joueur (dex.seen), niveaux centrés sur la moyenne joueur
//   (moyenne d'équipe == moyenne joueur), Daemons NATURE (pas d'EV/Saiyan/shiny), IA « hof ». Combat sportif.
//
// Découpage data/ ⟷ store/ : ce fichier ne contient QUE des primitives (pas d'import de playerStore/pokedexStore)
//   pour éviter tout cycle — le launcher (gameStore/YellowDevClient) lit getPlayer()/getPokedex() et appelle
//   buildArchivisteTeam(pool, mean, seed, count). Cf. buildHhCollectorTeam.

import type { MonInstance } from "../battle/types"
import { createMonInstance } from "../battle/factory"
import { getSpecies, DEX_ULTRA_SECRET } from "./species"
import { funFactFor } from "./collectionneurFunFacts"
import { baseSpeciesOf, speciesAtLevel } from "./ace"
import { Rng } from "../battle/rng"
import { YELLOW_ENTRANCE_MAP_ID } from "../featureFlag"

/** userId (constant) du sprite roaming — 1 seul Archiviste. */
export const ARCHIVISTE_ID = "archiviste"
/** Nom affiché. */
export const ARCHIVISTE_NAME = "L'Archiviste"
/** trainerId du combat. Préfixe "collectionneur:" → NON reconnu comme frontier/duel/run2ghost → chemin normal +
 *  détecté en finishBattle pour offrir le dex / débloquer les fiches. */
export const ARCHIVISTE_TRAINER_ID = "collectionneur:nexus"
/** Il erre sur la Ville Jaune. */
export const ARCHIVISTE_MAP = YELLOW_ENTRANCE_MAP_ID

/** Max de matchs par jour (gagnés OU perdus) ; après quoi il s'incline et propose de revenir demain. */
export const ARCHIVISTE_MAX_MATCHES_PER_DAY = 3

/** ESCALADE selon le nb de matchs DÉJÀ disputés aujourd'hui (0 = 1er match) :
 *  match 1 = base (nature) · match 2 = +3 niv/Daemon + 50 pts Saiyan · match 3 = +6 niv/Daemon + 95 pts Saiyan. */
export function archivisteEscalation(matchesToday: number): { levelBonus: number; saiyanPoints: number } {
    if (matchesToday <= 0) return { levelBonus: 0, saiyanPoints: 0 }
    if (matchesToday === 1) return { levelBonus: 3, saiyanPoints: 50 }
    return { levelBonus: 6, saiyanPoints: 95 }
}

/** Réplique quand la limite quotidienne est atteinte. */
export const ARCHIVISTE_DAILY_LIMIT_LINES: string[] = [
    "Ho là ! Trois duels dans la journée, tu m'as épuisé mon carnet de notes…",
    "Je m'incline, dresseur — reviens demain, j'aurai de nouvelles fiches à jour pour toi !",
]

/** Tranche horaire (heure locale 0-23) : 0=matin (6-10), 1=journée (10-17), 2=soirée (17-21), 3=nuit (21-6). */
export function archivisteSlot(hour: number): 0 | 1 | 2 | 3 {
    if (hour >= 6 && hour < 10) return 0
    if (hour >= 10 && hour < 17) return 1
    if (hour >= 17 && hour < 21) return 2
    return 3 // 21..23 || 0..5 (enjambe minuit)
}

const SLOT_LABEL = ["matin", "journée", "soirée", "nuit"] as const

/** PREMIÈRE RENCONTRE — il se présente et explique son rôle : le Dex Nexus est déjà consultable (toujours) ; VOIR un
 *  Daemon révèle son sprite+types, le CAPTURER apprend sa biologie/dicton/mensurations, et LUI (une fois battu) donne
 *  le DOSSIER DE COMBAT (stats, forces/faiblesses, attaques). Affiché une fois à la rencontre (pose collectionneurDexGiven). */
export const ARCHIVISTE_INTRO_LINES: string[] = [
    "HALTE-LÀ ! Ne bouge plus… non, pas toi — c'est le Daemon derrière toi qui bave sur mon carnet ! Enchanté : je suis L'ARCHIVISTE, catalogueur compulsif de Daemons.",
    "Trente ans que je noircis ce DEX. TRENTE ! Il est déjà à ta disposition — croise un Daemon, sa ligne s'inscrit ; capture-le, et tu apprends sa biologie, son dicton, ses mensurations.",
    "Et parce que tu me plais : je te confie aussi mon GLOSSAIRE DES ATTAQUES — le Pokédex des capacités. Une attaque s'y dévoile dès que tu croises un Daemon qui la possède, que tu peux l'acheter, qu'on te la donne, ou qu'un de tes Daemons l'apprend. Presse SELECT pour l'ACCÈS RAPIDE — le DEX NEXUS et le glossaire réunis, consultables même en plein combat !",
    "MAIS — car il y a un mais — le DOSSIER DE COMBAT (stats, forces & faiblesses, attaques par niveau), ça, je ne le lâche qu'à qui me colle une bonne raclée. Question de principe ! Bats-moi et j'ouvre grand mes dossiers.",
    "Alors, tu me défies ? Ou tu comptes fixer ma loupe toute la journée ? Reviens quand ton équipe aura fière allure, jeune prodige.",
]

/** DIALOGUE DE DÉFAITE (dit quand le joueur BAT L'Archiviste) : félicitations + dex mis à jour + FUN FACT sur un
 *  Daemon de l'équipe joueur + proposition de REVANCHE selon les matchs restants du jour (escalade annoncée). */
export function archivisteDefeatLines(monName: string, fact: string | null, matchesPlayedToday: number): string[] {
    const remaining = Math.max(0, ARCHIVISTE_MAX_MATCHES_PER_DAY - matchesPlayedToday)
    const lines = [
        "AH ! Battu ! Magnifiquement, honteusement battu ! Ça ne m'était plus arrivé depuis… euh… bref, bravo !",
        "Marché conclu, je m'incline : j'ouvre mes DOSSIERS DE COMBAT ! Stats, forces & faiblesses et attaques de tous les Daemons que tu as croisés sont désormais RÉVÉLÉS dans ton dex.",
        fact
            ? `Et cadeau du perdant, un petit fait sur ton ${monName} : ${fact}`
            : `Et prends bien soin de ton ${monName}, c'est une pièce de collection, ça !`,
    ]
    lines.push(remaining >= 1
        ? `Il te reste ${remaining} duel${remaining > 1 ? "s" : ""} aujourd'hui — et je te préviens : à chaque manche je corse l'affaire (plus de niveaux, plus de points Saiyan) ! On remet ça quand tu veux, fripon.`
        : "C'était notre troisième manche du jour, tu m'as lessivé ! Laisse-moi ramasser mes fiches… et reviens demain, j'aurai de quoi t'occuper.")
    return lines
}

/** DIALOGUES DE PASSIONNÉ — matrice [jour 0-6 (0=dimanche, getDay())][tranche 0-3]. Un ton différent chaque jour
 *  et chaque moment. La ligne de FUN FACT (sur un Daemon de l'équipe joueur) est ajoutée séparément par le launcher. */
export const ARCHIVISTE_GREETINGS: readonly (readonly string[])[] = [
    // 0 — DIMANCHE
    [
        "Ahh, un dimanche matin tranquille… le meilleur moment pour classer mes fiches. Tu tombes bien !",
        "Dimanche après-midi, rien de tel qu'une bonne collection à compléter. Fais-moi voir tes trouvailles !",
        "Le dimanche soir me rend nostalgique… chaque Daemon a son histoire, tu sais.",
        "La nuit du dimanche, je relis mes archives à la bougie. Passionnant, n'est-ce pas ?",
    ],
    // 1 — LUNDI
    [
        "Lundi matin ! Une nouvelle semaine, de nouvelles espèces à cataloguer. J'adore ça !",
        "En pleine journée de lundi, déjà trois fiches enrichies. Et toi, où en es-tu ?",
        "Le lundi soir, je fais l'inventaire. Un collectionneur ne se repose jamais vraiment.",
        "Tard un lundi… l'obscurité révèle des Daemons que le jour ignore. Fascinant.",
    ],
    // 2 — MARDI
    [
        "Mardi de bon matin — parfait pour observer les Daemons matinaux ! Ils sont si vifs.",
        "Journée de mardi bien remplie : j'ai croisé une espèce que je n'avais jamais fichée !",
        "Le mardi soir, j'aime comparer les statistiques. Chaque nombre raconte quelque chose.",
        "Nuit de mardi silencieuse… idéale pour étudier les espèces nocturnes. Rejoins-moi.",
    ],
    // 3 — MERCREDI
    [
        "Mercredi matin ! Le milieu de semaine, le milieu de ma collection. On avance !",
        "Ah, l'après-midi de mercredi… la lumière est parfaite pour dessiner mes fiches.",
        "Le mercredi soir, je range mes croquis. Un vrai collectionneur soigne ses archives.",
        "Nuit de mercredi… savais-tu que certaines espèces changent de comportement après minuit ?",
    ],
    // 4 — JEUDI
    [
        "Jeudi matin, café et catalogue : mon rituel sacré ! Tu veux voir mes dernières entrées ?",
        "En cette journée de jeudi, je traque une espèce rare depuis des heures. La patience paie !",
        "Le jeudi soir a quelque chose de spécial. Les Daemons du crépuscule sont mes préférés.",
        "Tard un jeudi… je note chaque détail. L'exhaustivité, voilà l'obsession du collectionneur !",
    ],
    // 5 — VENDREDI
    [
        "Vendredi matin ! La semaine se termine mais ma collection, elle, ne s'arrête jamais.",
        "Journée de vendredi festive : j'ai fiché deux nouvelles espèces ! Célébrons par un duel.",
        "Le vendredi soir, l'ambiance est parfaite pour parler Daemons. Reste un peu !",
        "Nuit de vendredi… les meilleures découvertes se font quand tout le monde dort.",
    ],
    // 6 — SAMEDI
    [
        "Samedi matin, jour de grande chasse ! Rien ne vaut l'aube pour dénicher du rare.",
        "Après-midi de samedi : le marché aux Daemons bat son plein dans ma tête. Montre-moi !",
        "Le samedi soir, je feuillette mes fiches préférées. Chacune est un trésor.",
        "Nuit de samedi… la collection ne dort jamais, et moi non plus. Approche, curieux.",
    ],
]

/** Ligne d'accueil selon le jour (0=dimanche) et l'heure. Bornes défensives (tsc + matrice incomplète). */
export function archivisteGreeting(day: number, hour: number): string {
    const d = ((day % 7) + 7) % 7
    const slot = archivisteSlot(hour)
    return ARCHIVISTE_GREETINGS[d]?.[slot] ?? ARCHIVISTE_GREETINGS[0][1]
}

/** FUN FACT sur un Daemon (fiche species.funFact si écrite, sinon repli générique amusant mais neutre). */
export function archivisteFunFact(speciesId: string, hour: number): string {
    const sp = getSpecies(speciesId)
    const name = sp?.name ?? speciesId
    const fact = funFactFor(speciesId) ?? sp?.funFact
    if (fact) return `💡 ${fact}` // les facts s'auto-cadrent (« Savais-tu que… », « Il paraît que… ») → pas de préfixe figé
    const moment = SLOT_LABEL[archivisteSlot(hour)]
    return `💡 ${name}… une pièce que j'observe volontiers en ${moment}. Un spécimen que tout collectionneur rêve de ficher !`
}

/** Espèces exclues de l'équipe de L'Archiviste (légendaires ultra-secrets — anti-spoiler / anti-OP). */
const ARCHIVISTE_TEAM_EXCLUDE: ReadonlySet<string> = DEX_ULTRA_SECRET

/** DIFFICULTÉ selon la progression d'arène (nb de badges) : L'Archiviste est FACILE avant l'arène 1 puis monte d'un
 *  cran par badge, jusqu'à « un peu au-dessus » après l'arène 5. Offset de niveau ajouté à la moyenne d'équipe :
 *  0 badge → −6 (facile) · 1 → −3 (un peu facile) · 2 → 0 (notre niveau) · 3 → +3 · 4+ → +6 (un peu au-dessus). */
export function archivisteBadgeLevelOffset(badgeCount: number): number {
    return Math.max(-6, Math.min(6, (Math.max(0, badgeCount) - 2) * 3))
}

/** Équipe de L'Archiviste : `count` Daemons tirés au hasard parmi `pool` (= dex.seen), niveaux = `playerMean` +
 *  offsets à SOMME NULLE (±5) → moyenne d'équipe == playerMean (exact avant clamp [1,100]). Daemons NATURE :
 *  on ne passe QUE { owned:false } → zéro EV, zéro point Saiyan, pas de shiny (cf. fullStats). Déterministe/seed. */
export function buildArchivisteTeam(pool: readonly string[], playerMean: number, seed: number, count: number, levelBonus = 0, saiyanPoints = 0): MonInstance[] {
    const rng = new Rng(seed >>> 0)
    // Espèces de BASE vues uniquement : instanciables, hors ultra-secrets, et JAMAIS de fusion (dexNo 500+ = fusions
    //   permanentes ; dexNo -1 = fusion éphémère). → L'Archiviste ne combat jamais avec un fusionné.
    const bag = pool.filter((id) => { const sp = getSpecies(id); return !!sp && sp.dexNo >= 1 && sp.dexNo < 500 && !ARCHIVISTE_TEAM_EXCLUDE.has(id) })
    const n = Math.max(1, Math.min(6, count))
    const draw: string[] = []
    while (draw.length < n && bag.length) draw.push(bag.splice(rng.int(0, bag.length - 1), 1)[0])
    if (draw.length === 0) return []
    const SPREAD = 5
    const offs = draw.map(() => rng.int(-SPREAD, SPREAD))
    // Correction à somme nulle → la moyenne d'équipe retombe EXACTEMENT sur playerMean (+ levelBonus d'escalade).
    let residual = offs.reduce((a, b) => a + b, 0)
    for (let i = 0; residual !== 0; i = (i + 1) % offs.length) { const step = residual > 0 ? -1 : 1; offs[i] += step; residual += step }
    // ESCALADE (matchs répétés du jour) : +levelBonus niveaux/Daemon + saiyanPoints répartis également sur les 5 stats.
    const per = saiyanPoints > 0 ? Math.floor(saiyanPoints / 5) : 0
    const allocated = per > 0 ? { hp: per, atk: per, def: per, spe: per, spc: per } : undefined
    return draw.map((id, i) => {
        const level = Math.max(1, Math.min(100, playerMean + offs[i] + levelBonus))
        // MÊME STADE que le joueur : on évolue l'espèce tirée au stade NATUREL pour ce niveau (comme les équipes de
        //   dresseurs), pour ne jamais aligner un stade de base sous-évolué face à des finales.
        const staged = speciesAtLevel(baseSpeciesOf(id), level)
        return createMonInstance(staged, level, allocated ? { owned: false, allocated } : { owned: false })
    })
}
