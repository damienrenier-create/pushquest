// src/lib/gamebook/yellow/data/surferTrainer.ts
//
// LE SURFEUR — PNJ de la Route Nord (38,8), visible SEULEMENT après avoir atteint la Zone de Combat (post-Sylvebarbe).
// Il CONSENT au combat dès 135 espèces distinctes (peu importe la tenue), MAIS prévient : il ne lâche sa précieuse CT
// SURF qu'à qui le bat EN TENUE DE SURFEUR (offertes par la Fashion Victim). Battu SANS tenue → raillerie, pas de cadeau.
// Son équipe (6 Daemons aquatiques, tous avec Surf) se cale sur le niveau MOYEN de l'équipe du joueur ±6. Après la CT :
// rematch amical 1×/jour. Surf → île secrète (Galijah y pope dès 150 espèces). React-free.

export const SURFER_NPC_ID = "y_surfer"
export const SURFER_MAP_ID = "yellow_route_nord"
export const SURFER_POS = { x: 38, y: 8 } // Route Nord, au bord d'un plan d'eau (naturel pour un surfeur)
export const SURFER_NAME = "LE SURFEUR"
export const SURF_CT_ID = "ct66"
/** Espèces distinctes à partir desquelles le surfeur CONSENT au combat (peu importe la tenue). */
export const SURFER_SPECIES_GATE = 135
/** Seuil d'espèces distinctes pour que GALIJAH pope sur l'île (indépendant de l'obtention de Surf). */
export const SURFER_DEX_THRESHOLD = 150
/** Marqueur (jour) du rematch quotidien post-CT (via setDailyMarker → un seul marqueur conservé). */
export const SURFER_REMATCH_PREFIX = "surfer_rematch_"

/** Les 6 Daemons du surfeur — TOUS reçoivent la CT Surf + 3 attaques naturelles (cf. tryLaunchSurfer). */
export const SURFER_TEAM: readonly string[] = ["aquapanthe", "ro", "geaucke", "orcaline", "osquille", "uzumaro"] as const

// ── Dialogues ────────────────────────────────────────────────────────────────
/** Moins de 135 espèces → pas encore prêt pour la vague (teaser, pas de combat). */
export const SURFER_NOT_READY_LINES = [
    "Yo, dude. 🏄 Je te sens pas encore ASSEZ dans le trip pour rider avec moi.",
    "Reviens quand t'auras croisé plus de Daemons — l'océan récompense les curieux. On se capte ! 🌊",
]
/** ≥135 espèces, pas encore la CT → il combat, MAIS prévient : cadeau réservé à qui le bat en TENUE de surfeur. */
export const SURFER_CHALLENGE_LINES = [
    "Yo ! 🤙 Ouais, on peut se tirer une bourre, dude — j'dis jamais non à une session.",
    "Mais joue franc-jeu : ma précieuse CT SURF, je la lâche QUE si tu me bats en vraie TENUE DE SURFEUR (la Fashion Victim en vend).",
    "Sans le style, tu peux gagner… mais tu repartiras les mains vides. Mes Daemons se calent sur ton niveau. On surfe ? 🌊",
]
/** 1re VICTOIRE EN TENUE → remise de la CT SURF. */
export const SURFER_REWARD_LINES = [
    "…WHOA. T'as ridé cette session comme un dieu, dude — ET avec le STYLE. 🏄🔥",
    "Marché tenu : la CT SURF est à toi ! Apprends-la à un Daemon compatible.",
    "Avec Surf ET ce style, l'eau ne te barrera plus jamais la route. On se voit sur la vague ! 🌊",
]
/** Victoire SANS tenue de surfeur → raillerie, AUCUN cadeau (reviens habillé). */
export const SURFER_WIN_NO_OUTFIT_LINES = [
    "Belle glisse !… mais sérieux, dude, tu m'as affronté HABILLÉ comme ça ? 😅",
    "Pas de tenue de surfeur, pas de CT — je te l'avais dit. Va voir la FASHION VICTIM et reviens rider avec CLASSE. 🌊",
]
/** Déjà la CT → rematch amical (rematch dispo aujourd'hui). */
export const SURFER_DONE_LINES = [
    "Yo le surfeur ! L'océan te réussit, à ce que je vois. 🌊",
    "Un petit run entre potes de la vague ? Allez, on remet ça !",
]
/** GALIJAH — greffé à N'IMPORTE QUEL dialogue du Surfeur dès que le joueur a CROISÉ Galijah sans le capturer :
 *  le Surfeur s'émerveille et renvoie vers L'ARCHIVISTE (qui, lui, complète la fiche avec le calendrier de repop). */
export const SURFER_GALIJAH_HINT = "Wooooah dude… t'as CROISÉ le Daemon giga-rare ?! 🤯 De ouf ! On raconte qu'il lui arrive de REVENIR… plus balèze à chaque fois. Va voir L'ARCHIVISTE, ce type sait TOUT — il t'expliquera quand la bête repointe son nez. 🏄"
/** Déjà la CT et déjà affronté aujourd'hui → reviens demain. */
export const SURFER_DONE_TODAY_LINES = [
    "Mes potes de la vague récupèrent, dude. Reviens demain pour une nouvelle session ! 🤙",
]
/** Équipe K.O. → soigne d'abord. */
export const SURFER_NO_TEAM_LINES = [
    "Whoa, tes Daemons sont lessivés, dude ! Passe au Centre les remettre d'aplomb avant qu'on surfe.",
]
/** Après une victoire du rematch (post-CT, ré-affrontable). */
export const SURFER_REMATCH_WIN_LINES = [
    "Belle glisse ! 🏄 Reviens demain te frotter à la vague, l'ami !",
]

/** ARRIVÉE sur l'île AVANT 150 espèces distinctes : présage sans spoiler (Galijah ne pope pas encore). */
export const ISLAND_TOO_EARLY_LINES = [
    "*Une brise saline te caresse le visage… et une drôle d'impression te saisit.*",
    "Quelque chose de PUISSANT sommeille sur cette île — ça te hérisse la nuque.",
    "…Mais pas maintenant. Ce n'est pas le bon moment. Reviens quand tu auras rencontré bien plus de Daemons — là, peut-être, il se montrera.",
]
