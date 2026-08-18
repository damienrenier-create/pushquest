// src/lib/gamebook/yellow/data/pnj7.ts
//
// PNJ 7 — L'ÉCLAIREUR DE LA GROTTE DU NEXUS. NPC statique en (27,18) sur la Grotte du Nexus 1F.
// RÔLE : guide qui explique le fonctionnement de la grotte (biotopes + le scientifique au fond qui fait de
//   drôles d'expériences sur la FUSION). Il porte les 5 NÉMÉSIS des lignées de fusion (léviabysse, condombre,
//   ténèbrir, uzumaro, mouflorage) niv 70 + Saiyan + EV.
// CAP JOURNALIER : on ne peut le COMBATTRE qu'UNE fois par jour (marker `pnj7_<date>` dans defeatedTrainers,
//   posé au LANCEMENT du combat → vaut win OU lose ; aucun nouveau champ save). On peut le RE-consulter à volonté
//   pour revoir le carrousel d'infos (sans combat).
// DÉMO POST-COMBAT : après l'avoir vaincu, les 3 prochaines rencontres de la Grotte sont scriptées =
//   2 parents puis leur FUSION (illustre la règle de pop). File transitoire ci-dessous, primée en victoire
//   (battleStore) et consommée par le roll de rencontre (gameStore), réinitialisée à l'entrée de la grotte.
//
// Câblé via : npcs.ts (déclaration NPC) · gameStore (pressA → pendingPnj7 → tryLaunchPnj7 + reset démo en setMap +
//   consommation démo dans le roll) · battleStore.finishBattle (victoire → primeGrotteDemo + carrousel).

import { createMonInstance } from "../battle/factory"
import type { MonInstance, StatKey } from "../battle/types"
import { FUSION_BASE_PARENTS } from "./fusionBaseSpecies"

export const PNJ7_NPC_ID = "y_pnj7_grotte"
export const PNJ7_TRAINER_ID = "y_pnj7_grotte"
// Marqueur PERSISTANT (defeatedTrainers) posé à la 1re victoire → le Daemomaniaque donne les coords d'échelle
//   précises pour les Daemons de la Grotte Puzzle (avant : localisation volontairement floue « Grotte B1F »).
export const ECLAIREUR_PRECISION_MARKER = "eclaireur_precision"
export const PNJ7_MAP_ID = "yellow_grotte_nexus"
export const PNJ7_NAME = "ÉCLAIREUR"
export const PNJ7_POS = { x: 27, y: 18 } as const
export const PNJ7_LEVEL = 70

/** Marker du cap journalier (dans defeatedTrainers). Vérifié/posé côté store via isTrainerDefeated/markTrainerDefeated. */
export function pnj7DayMarker(): string {
    return "pnj7_" + new Date().toISOString().slice(0, 10)
}

// ── Les 5 némésis des lignées de fusion, chacun min-maxé sur 2 stats (EV 252/252) + Saiyan scalé au niveau.
//    Moveset auto-dérivé (les 4 dernières attaques du learnset à niv 70). ──
interface NemSpec { speciesId: string; ev: [StatKey, StatKey] }
const PNJ7_TEAM: readonly NemSpec[] = [
    { speciesId: "leviabysse", ev: ["spc", "hp"] },  // EAU/TÉNÈBRES — mur/attaquant spécial (spc132/def132/hp110)
    { speciesId: "mouflorage", ev: ["spc", "hp"] },  // SOL/ÉLEC — mur-attaquant spécial (paralyse puis foudroie)
    { speciesId: "condombre", ev: ["atk", "spe"] },  // TÉNÈBRES/VOL — attaquant physique rapide
    { speciesId: "tenebrir", ev: ["atk", "spe"] },   // TÉNÈBRES/SPECTRE — attaquant physique
    { speciesId: "uzumaro", ev: ["atk", "def"] },    // COMBAT/EAU — tank-sétuppeur physique
]

/** La bande des 5 némésis (niv 70, Saiyan ~niveau réparti 60/40, EV maxées sur 2 stats). */
export function buildPnj7Team(): MonInstance[] {
    const level = PNJ7_LEVEL
    const saiyanTotal = level
    const primary = Math.round(saiyanTotal * 0.6)
    const secondary = saiyanTotal - primary
    return PNJ7_TEAM.map((n) => {
        const [s1, s2] = n.ev
        const ev: Partial<Record<StatKey, number>> = { [s1]: 252, [s2]: 252 }
        const allocated: Partial<Record<StatKey, number>> = { [s1]: primary, [s2]: secondary }
        return createMonInstance(n.speciesId, level, { owned: false, ev, allocated })
    })
}

// ── DÉMO DE POP (transitoire, non persistée) : file des 3 prochaines rencontres scriptées après sa victoire. ──
let demoQueue: string[] = []
/** Après la victoire : amorce la démo = 2 parents (aléatoires parmi les 5 fusions de BASE) puis leur fusion. On
 *  N'utilise QUE les 5 de base : leurs parents sont 1F-natifs/communs → la démo ne fait JAMAIS fuiter en 1F une
 *  espèce/fusion EXCLUSIVE d'un autre étage (ex. obscurène/Abyssvolt, propres à B1F-1). */
export function primeGrotteDemo(): void {
    const base = ["mottelave", "nouiflot", "sporemante", "ruffardoc", "dractriss"] as const
    const fus = base[Math.floor(Math.random() * base.length)]
    const [a, b] = FUSION_BASE_PARENTS[fus]
    demoQueue = [a, b, fus]
}
/** Prochain spawn scripté de la démo (consomme 1 élément), ou null si aucune démo en cours. */
export function takeGrotteDemoSpawn(): string | null {
    return demoQueue.shift() ?? null
}
/** Reset (appelé à l'entrée de la grotte, comme la règle de pop). */
export function resetGrotteDemo(): void { demoQueue = [] }

// ── Dialogues ──
export const PNJ7_INTRO_LINES = [
    "Tiens, un visiteur ! Peu s'aventurent aussi loin dans la Grotte du Nexus…",
    "Je patrouille ces galeries depuis des années. Elles cachent des merveilles — et des dangers.",
    "Tu veux mesurer ta valeur ? Alors affronte mes cinq NÉMÉSIS. Une seule fois par jour, pas plus !",
    "*Il libère cinq silhouettes menaçantes des ténèbres de la caverne.*",
]
export const PNJ7_VICTORY_LINES = [
    "*Ses cinq némésis s'inclinent, vaincus.*",
    "Impressionnant. Tu es prêt à percer les secrets de cette grotte. Écoute bien…",
]
// Carrousel d'infos : montré APRÈS la victoire ET à chaque re-consultation (revoir les infos).
export const PNJ7_CAROUSEL_LINES = [
    "📜 Cette grotte n'est pas comme les autres : elle regorge de BIOTOPES distincts.",
    "📜 Certains Daemons très rares ne se tapissent QUE dans un biotope unique — apprends à les lire.",
    "📜 Et tout au fond… un éminent SCIENTIFIQUE mène d'étranges expériences sur la FUSION des Daemons.",
    "📜 Un secret se murmure ici : croise deux créatures parentes, coup sur coup… et leur FUSION surgira.",
    "📜 Reviens me voir quand tu veux pour te rafraîchir la mémoire. Mais un seul combat par jour !",
]
export const PNJ7_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. !",
    "Reviens quand ta bande sera en état de se battre — mes némésis ne font pas de cadeau.",
]
