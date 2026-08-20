// src/lib/gamebook/yellow/data/surferTrainer.ts
//
// LE SURFEUR — PNJ de la Route Nord (38,8), visible SEULEMENT après avoir atteint la Zone de Combat (post-Sylvebarbe).
// Il n'engage le combat QUE si le joueur porte une TENUE DE SURFEUR (offertes par la Fashion Victim dès ~145 espèces).
// Son équipe (6 Daemons aquatiques, TOUS avec la CT Surf) se cale sur le niveau MOYEN de l'équipe du joueur ±6.
// À la 1re VICTOIRE (le joueur porte forcément la tenue → gate d'engagement) → il offre sa CT SURF. Ensuite : rematch
// amical 1×/jour. Surf → permet d'atteindre l'île secrète (Galijah y pope dès 150 espèces distinctes). React-free.

export const SURFER_NPC_ID = "y_surfer"
export const SURFER_MAP_ID = "yellow_route_nord"
export const SURFER_POS = { x: 38, y: 8 } // Route Nord, au bord d'un plan d'eau (naturel pour un surfeur)
export const SURFER_NAME = "LE SURFEUR"
export const SURF_CT_ID = "ct66"
/** Seuil d'espèces distinctes pour que GALIJAH pope sur l'île (indépendant de l'obtention de Surf). */
export const SURFER_DEX_THRESHOLD = 150
/** Marqueur (jour) du rematch quotidien post-CT (via setDailyMarker → un seul marqueur conservé). */
export const SURFER_REMATCH_PREFIX = "surfer_rematch_"

/** Les 6 Daemons du surfeur — TOUS reçoivent la CT Surf + 3 attaques naturelles (cf. tryLaunchSurfer). */
export const SURFER_TEAM: readonly string[] = ["aquapanthe", "ro", "geaucke", "orcaline", "osquille", "uzumaro"] as const

// ── Dialogues ────────────────────────────────────────────────────────────────
/** Pas de tenue de surfeur → il attend patiemment que le joueur s'équipe (Fashion Victim). */
export const SURFER_NEED_OUTFIT_LINES = [
    "Yo, dude ! 🏄 Belle énergie… mais franchement, tu comptes surfer HABILLÉ comme ÇA ?",
    "Écoute : va voir la FASHION VICTIM. Quand t'auras une tenue de surfeur ULTRA SLAY sur le dos, reviens — et là on cause.",
    "Pas de style, pas de vague, dude. C'est la règle de l'océan. 🌊",
]
/** A la tenue, pas encore la CT → défi + combat (1re victoire = CT). */
export const SURFER_CHALLENGE_LINES = [
    "Ohhh, MAINTENANT tu parles ! 🤙 Cette tenue déchire, dude.",
    "Le deal est simple : tu bats mes potes de la vague, et ma CT SURF est à toi. Elle t'ouvrira… disons… des horizons.",
    "Mes Daemons se calent sur ton niveau, pas de coup fourré. On surfe ? 🌊",
]
/** 1re VICTOIRE (tenue portée) → remise de la CT SURF. */
export const SURFER_REWARD_LINES = [
    "…WHOA. T'as ridé cette session comme un dieu, dude. 🏄🔥",
    "Marché tenu : la CT SURF est à toi ! Apprends-la à un Daemon compatible.",
    "Avec Surf ET ce style, l'eau ne te barrera plus jamais la route. On se voit sur la vague ! 🌊",
]
/** Déjà la CT → rematch amical (rematch dispo aujourd'hui). */
export const SURFER_DONE_LINES = [
    "Yo le surfeur ! L'océan te réussit, à ce que je vois. 🌊",
    "Un petit run entre potes de la vague ? Allez, on remet ça !",
]
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
