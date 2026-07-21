// src/lib/gamebook/yellow/data/grotteSign.ts
//
// PANNEAU D'INFO de la Grotte du Nexus 1F, en (19,27)-(20,27) (2 hotspots interactifs sur le décor, cases NON
// walkables déjà en mur dans l'art). Carrousel SANS SPOILER : blague météo/humidité, rythme circadien jour/nuit,
// allusion vague au « drôle » du fond, et grotte très ancienne (Daemons d'autres temps).

export const GROTTE_SIGN_NPC_A = "y_grotte_sign_a"
export const GROTTE_SIGN_NPC_B = "y_grotte_sign_b"
export const GROTTE_SIGN_MAP_ID = "yellow_grotte_nexus"
export const GROTTE_SIGN_POS_A = { x: 19, y: 27 } as const
export const GROTTE_SIGN_POS_B = { x: 20, y: 27 } as const

export const GROTTE_SIGN_LINES = [
    "🪧 « BIENVENUE DANS LA GROTTE DU NEXUS. Pensez à l'imperméable : ici, il pleut… de l'intérieur. »",
    "🪧 « L'humidité y est telle qu'on jurerait que même les Daemons de pierre prennent des bains. »",
    "🪧 « Les créatures d'ici suivent une horloge interne : certaines ne sortent qu'au grand JOUR, d'autres seulement la NUIT. Revenez à différentes heures ! »",
    "🪧 « Tout au fond vivrait un drôle de personnage, aux occupations… singulières. Nous n'en dirons pas plus. »",
    "🪧 « Cette caverne est d'une ancienneté vertigineuse. On y croiserait, dit-on, des Daemons d'autres temps. »",
]
