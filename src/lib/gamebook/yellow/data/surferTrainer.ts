// src/lib/gamebook/yellow/data/surferTrainer.ts
//
// LE SURFEUR — PNJ de la Route Nord (38,8), visible SEULEMENT après avoir atteint la Zone de Combat (post-Sylvebarbe).
// Il lance un DÉFI : capturer 150 espèces DIFFÉRENTES → il offre sa CT spéciale SURF (ct66), qui permet enfin de
// SURFER sur l'eau (→ l'île cachée où pop Galijah). En attendant, il propose un « petit combat » ré-affrontable :
// son équipe de 6 Daemons aquatiques, TOUS équipés de la CT Surf. React-free, données pures.

export const SURFER_NPC_ID = "y_surfer"
export const SURFER_MAP_ID = "yellow_route_nord"
export const SURFER_POS = { x: 38, y: 8 } // Route Nord, au bord d'un plan d'eau (naturel pour un surfeur)
export const SURFER_NAME = "LE SURFEUR"
export const SURF_CT_ID = "ct66"
/** Nb d'espèces DIFFÉRENTES à capturer pour décrocher la CT Surf (même seuil que Galijah, cf. GALIJAH_CAPTURE_THRESHOLD). */
export const SURFER_DEX_THRESHOLD = 150

/** Niveau de l'équipe du « petit combat » (modéré : post-Sylvebarbe le joueur est fort). */
export const SURFER_TEAM_LEVEL = 45
/** Les 6 Daemons du surfeur — TOUS reçoivent la CT Surf en plus de 3 attaques naturelles (cf. tryLaunchSurfer). */
export const SURFER_TEAM: readonly string[] = ["aquapanthe", "ro", "geaucke", "orcaline", "osquille", "uzumaro"] as const

// ── Dialogues ────────────────────────────────────────────────────────────────
/** DÉFI (pas encore les 150) : présente l'enjeu + le petit combat. `dex` = espèces distinctes capturées. */
export function surferChallengeLines(dex: number): string[] {
    return [
        "Yo, dude ! 🏄 Cette flamme dans tes yeux… t'es un vrai chasseur, ça se voit.",
        `Voilà le deal : capture 150 espèces DIFFÉRENTES et je te lègue ma planche… enfin, ma CT SURF. Elle ouvre l'océan.`,
        `Ton compteur : ${Math.min(dex, SURFER_DEX_THRESHOLD)}/${SURFER_DEX_THRESHOLD} espèces. ${dex >= SURFER_DEX_THRESHOLD ? "…Attends, mais tu y ES !" : "Encore un peu de rame, l'ami !"}`,
        "En attendant, un petit run ? Mes potes de la vague vont te montrer ce qu'est le vrai déferlement ! 🌊",
    ]
}
/** Les 150 sont atteintes → remise de la CT SURF (une seule fois). */
export const SURFER_REWARD_LINES = [
    "…Whoa. 150 espèces. T'as bouclé le line-up complet, dude. 🤙",
    "Un chasseur de ta trempe mérite l'océan tout entier. Tiens : la CT SURF est à toi !",
    "Apprends-la à un Daemon compatible, et l'eau ne te barrera plus jamais la route. On se voit sur la vague ! 🌊🏄",
]
/** Le joueur a DÉJÀ la CT Surf → petit combat amical / clin d'œil. */
export const SURFER_DONE_LINES = [
    "Yo le surfeur ! L'océan te réussit, à ce que je vois. 🌊",
    "Un petit run entre potes de la vague ? Allez, on remet ça !",
]
/** Équipe K.O. → soigne d'abord. */
export const SURFER_NO_TEAM_LINES = [
    "Whoa, tes Daemons sont lessivés, dude ! Passe au Centre les remettre d'aplomb avant qu'on surfe.",
]
/** Après une victoire du petit combat (ré-affrontable). */
export const SURFER_REMATCH_WIN_LINES = [
    "Belle glisse ! 🏄 Reviens quand tu veux te frotter à la vague. Et n'oublie pas : 150 espèces pour la CT Surf !",
]
