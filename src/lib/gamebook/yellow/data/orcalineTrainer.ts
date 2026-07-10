// src/lib/gamebook/yellow/data/orcalineTrainer.ts
//
// DRESSEUR D'ORCALINE — dans la plaine d'entraînement (hautes herbes). Aligne 2 Orcalines de MÊME niveau.
//  - 1er combat : niveau 35. Chaque combat GAGNÉ suivant, ses Orcalines prennent +10 niveaux (cap 100).
//  - 1 combat gagnant / jour (retry libre si on perd) → on revient chaque jour affronter plus fort.
//  - À la 1re victoire : il OFFRE un Orcaline (niveau 35).
//  - SECRET (ne pas spoiler) : battre son Orcaline NIVEAU 95 → il donne la SUPER MÉGA NEXUS-BALL
//    (la seule à capturer Goshendofy à coup sûr s'il est sous 50% PV). Les dialogues récurrents invitent
//    seulement à revenir donner des nouvelles, SANS révéler la ball ni le palier 95.

export const ORCALINE_TRAINER_ID = "y_orcaline_trainer"
export const ORCALINE_TRAINER_MAP = "yellow_hautes_herbes"
export const ORCALINE_TRAINER_POS = { x: 8, y: 15 } // au cœur d'un carré d'herbe (rangée du bas)
export const ORCALINE_GIFT_SPECIES = "orcaline"
export const ORCALINE_GIFT_LEVEL = 35
export const ORCALINE_BALL_REWARD_ID = "super_mega_nexus_ball"
export const ORCALINE_BALL_AT_LEVEL = 95 // niveau battu qui débloque la ball

// Défi, AVANT la 1re victoire.
export const ORCALINE_INTRO_LINES = [
    "Hé, dresseur ! Tu vois mes deux ORCALINES ? Elles cherchent un adversaire à leur hauteur.",
    "On dit que ces petites orques peuvent figer un dragon d'un seul souffle… Tu veux voir ce qu'elles valent ?",
]
// APRÈS la 1re victoire : cadeau + invitation à revenir (SANS spoiler).
export const ORCALINE_GIFT_LINES = [
    "Magnifique combat ! Tu as l'air fort… ET sympa. C'est rare, les deux.",
    "Tu sais quoi ? Je crois qu'avec toi, une Orcaline pourrait faire de GRANDES choses. Tiens — prends celle-ci, elle est à toi !",
    "Reviens me voir quand tu veux : mes Orcalines seront plus coriaces à chaque fois. Et surtout… viens me raconter vos exploits ! 🐋",
]
// Défi des combats SUIVANTS (jours d'après) — SANS spoiler du palier 95 / de la ball.
export const ORCALINE_REMATCH_LINES = [
    "Te revoilà ! Mes Orcalines ont encore forci depuis la dernière fois…",
    "Montre-moi jusqu'où vous pouvez aller tous les deux ! On remet ça ?",
]
// Déjà battu aujourd'hui.
export const ORCALINE_DONE_TODAY_LINES = [
    "Mes Orcalines récupèrent de votre dernier duel. Reviens demain — elles seront encore plus fortes !",
]
// Post-victoire des combats SUIVANTS (ni 1re victoire, ni palier 95) — SANS spoiler.
export const ORCALINE_REMATCH_WIN_LINES = [
    "Bien joué ! Mes Orcalines seront encore plus fortes demain. Reviens vite me donner des nouvelles ! 🐋",
]
// RÉVÉLATION au moment où on bat l'Orcaline NIVEAU 95 (le twist).
export const ORCALINE_BALL_LINES = [
    "…Incroyable. Tu viens de vaincre mon Orcaline à son APOGÉE. Personne n'y était jamais arrivé.",
    "Tu mérites ceci — un trésor que je gardais pour un dresseur de ta trempe : la SUPER MÉGA NEXUS-BALL.",
    "On murmure qu'elle seule peut capturer À COUP SÛR le plus insaisissable des légendaires… à condition de l'avoir d'abord bien affaibli. À toi de jouer. 🌊",
]

// ═══════════ RUN 2 (NG+) — le Dompteur aligne des PANTHÉGEL (panthères de GLACE) : Orcaline est devenue
// une capture sauvage de la Grotte. Mêmes règles, dialogues re-flavorés (félins de givre, pas d'orques). ═══════════
export const ORCALINE_TRAINER_NAME_NGPLUS = "DRESSEUR DE PANTHÉGEL"
const ORCALINE_INTRO_LINES_NGPLUS = [
    "Hé, dresseur ! Tu vois mes deux PANTHÉGEL ? Ces félins de givre cherchent un adversaire à leur hauteur.",
    "On dit qu'elles figent un dragon d'un seul feulement glacé… Tu veux voir ce qu'elles valent ?",
]
const ORCALINE_GIFT_LINES_NGPLUS = [
    "Magnifique combat ! Tu as l'air fort… ET sympa. C'est rare, les deux.",
    "Tu sais quoi ? Avec toi, une PANTHÉGEL pourrait faire de GRANDES choses. Tiens — prends celle-ci, elle est à toi !",
    "Reviens quand tu veux : mes panthères seront plus coriaces à chaque fois. Et surtout… viens me raconter vos exploits ! ❄️",
]
const ORCALINE_REMATCH_LINES_NGPLUS = [
    "Te revoilà ! Mes Panthégel ont encore forci depuis la dernière fois…",
    "Montre-moi jusqu'où vous pouvez aller tous les deux ! On remet ça ?",
]
const ORCALINE_DONE_TODAY_LINES_NGPLUS = [
    "Mes Panthégel récupèrent de votre dernier duel. Reviens demain — elles seront encore plus fortes !",
]
const ORCALINE_REMATCH_WIN_LINES_NGPLUS = [
    "Bien joué ! Mes Panthégel seront encore plus fortes demain. Reviens vite me donner des nouvelles ! ❄️",
]
const ORCALINE_BALL_LINES_NGPLUS = [
    "…Incroyable. Tu viens de vaincre ma Panthégel à son APOGÉE. Personne n'y était jamais arrivé.",
    "Tu mérites ceci — un trésor que je gardais pour un dresseur de ta trempe : la SUPER MÉGA NEXUS-BALL.",
    "On murmure qu'elle seule peut capturer À COUP SÛR le plus insaisissable des légendaires… à condition de l'avoir d'abord bien affaibli. À toi de jouer. ❄️",
]

// ═══════════ RUN 3 (concours) — le même PNJ devient l'ÉLEVEUR : il élève le 3e starter (ni le tien, ni celui
// d'ACE) et le CONFIE à la 1re victoire. Le cadeau ne nomme pas d'espèce (elle varie selon le starter choisi). ═══════════
export const ORCALINE_TRAINER_NAME_RUN3 = "ÉLEVEUR"
const ORCALINE_INTRO_LINES_RUN3 = [
    "Salut, concurrent ! Ici je n'aligne pas des trophées : j'ÉLÈVE. Et j'ai sous la main le petit qui te MANQUE.",
    "Mais je ne le confie pas à n'importe qui. Bats mes deux protégés, et on en reparle. Prêt ?",
]
const ORCALINE_GIFT_LINES_RUN3 = [
    "Superbe ! Tu as la poigne ET le cœur — exactement ce qu'il lui faut.",
    "Tiens : le TROISIÈME starter du concours, ni le tien ni celui d'ACE. Le pilier qui te manquait. Élève-le bien, il n'attend que toi.",
    "Reviens mesurer tes progrès quand tu veux : mes protégés seront plus coriaces à chaque fois. 🥚",
]
const ORCALINE_REMATCH_LINES_RUN3 = [
    "Te revoilà ! Mes protégés ont encore forci depuis la dernière fois…",
    "Montre-moi jusqu'où vous pouvez aller ! On remet ça ?",
]
const ORCALINE_DONE_TODAY_LINES_RUN3 = [
    "Mes protégés récupèrent de votre duel. Reviens demain — ils seront encore plus forts !",
]
const ORCALINE_REMATCH_WIN_LINES_RUN3 = [
    "Bien joué ! Mes protégés seront encore plus forts demain. Reviens vite ! 🥚",
]

/** Dialogues + nom du dresseur selon le monde : run 1 = ORCALINE (orques), run 2 = PANTHÉGEL (félins de glace),
 *  run 3 = ÉLEVEUR (confie le 3e starter). */
export function orcalineTrainerDialogue(world: "live" | "ngplus" | "run3") {
    if (world === "run3") return { name: ORCALINE_TRAINER_NAME_RUN3, intro: ORCALINE_INTRO_LINES_RUN3, gift: ORCALINE_GIFT_LINES_RUN3, rematch: ORCALINE_REMATCH_LINES_RUN3, doneToday: ORCALINE_DONE_TODAY_LINES_RUN3, rematchWin: ORCALINE_REMATCH_WIN_LINES_RUN3, ball: ORCALINE_BALL_LINES }
    if (world === "ngplus") return { name: ORCALINE_TRAINER_NAME_NGPLUS, intro: ORCALINE_INTRO_LINES_NGPLUS, gift: ORCALINE_GIFT_LINES_NGPLUS, rematch: ORCALINE_REMATCH_LINES_NGPLUS, doneToday: ORCALINE_DONE_TODAY_LINES_NGPLUS, rematchWin: ORCALINE_REMATCH_WIN_LINES_NGPLUS, ball: ORCALINE_BALL_LINES_NGPLUS }
    return { name: "DRESSEUR D'ORCALINE", intro: ORCALINE_INTRO_LINES, gift: ORCALINE_GIFT_LINES, rematch: ORCALINE_REMATCH_LINES, doneToday: ORCALINE_DONE_TODAY_LINES, rematchWin: ORCALINE_REMATCH_WIN_LINES, ball: ORCALINE_BALL_LINES }
}
