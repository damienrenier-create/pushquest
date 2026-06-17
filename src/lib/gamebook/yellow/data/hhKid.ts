// src/lib/gamebook/yellow/data/hhKid.ts
//
// PNJ "GAMIN" au centre de la plaine d'entraînement (hautes herbes). Dialogue à plusieurs étapes
// selon l'heure LOCALE du joueur :
//   - en JOURNÉE : il propose de revenir à la tombée de la nuit (entre 21h et minuit) ;
//   - la NUIT (21h → 00h) : il révèle que son grand frère a vu un drôle de Daemon rôder tout près,
//     ce qui DOUBLE les chances de croiser Goshendofy (toujours rarissime, mais un peu moins).
// Une fois la confidence entendue de nuit (flag goshHintHeard), le boost s'applique CHAQUE nuit.

export const HH_KID_ID = "y_hh_kid"
export const HH_KID_MAP = "yellow_hautes_herbes"
export const HH_KID_POS = { x: 8, y: 9 } // centre de la plaine (carré du milieu)

// Fenêtre "tombée de la nuit" : heures locales 21, 22, 23 (entre 21h et minuit).
export const HH_KID_NIGHT_START = 21
export function isHhKidNight(hour: number): boolean {
    return hour >= HH_KID_NIGHT_START // 21h → 23h59 (00h exclus)
}

export const HH_KID_DAY_LINES = [
    "Salut ! Toi aussi tu traques le Daemon légendaire de la plaine ? Pfff, en plein jour, aucune chance…",
    "Reviens me voir à la TOMBÉE DE LA NUIT — entre 21h et minuit. C'est là qu'il se montrerait, paraît-il.",
]
export const HH_KID_NIGHT_LINES = [
    "Pssst… tu es venu à la bonne heure ! Écoute bien…",
    "Mon grand frère JURE qu'il a vu un drôle de Daemon rôder pas très loin, juste là, dans les herbes…",
    "Du coup, à cette heure-ci, tes chances de croiser GOSHENDOFY sont DOUBLÉES ! Ça reste rarissime… mais un peu moins. Ouvre l'œil ! 🌙",
]
