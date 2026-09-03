// src/lib/gamebook/yellow/data/hhKid.ts
//
// PNJ "GAMIN" au centre de la plaine d'entraînement (hautes herbes). Dialogue à plusieurs étapes
// selon l'heure LOCALE du joueur ET le monde (run 1 vs New Game+) :
//   - RUN 1 : en JOURNÉE il renvoie à la NUIT (21h→00h) ; la NUIT il révèle que son grand frère a vu un
//     drôle de Daemon rôder, ce qui DOUBLE les chances de croiser GOSHENDOFY (Dragon).
//   - RUN 2 (NG+) : l'écho féerique se montre à l'AUBE. En journée il renvoie au petit matin ; à l'AUBE
//     (5h→11h) il révèle le lutin de flammes violettes, ce qui DOUBLE les chances de croiser UKOGNOS (Fée).
// Une fois la confidence entendue dans la bonne fenêtre (flag goshHintHeard, PAR MONDE), le boost s'applique
// à chaque passage dans cette fenêtre.

export const HH_KID_ID = "y_hh_kid"
export const HH_KID_MAP = "yellow_hautes_herbes"
export const HH_KID_POS = { x: 8, y: 9 } // centre de la plaine (carré du milieu)

// Fenêtre "tombée de la nuit" (RUN 1 — Goshendofy) : heures locales 21, 22, 23 (entre 21h et minuit).
export const HH_KID_NIGHT_START = 21
export function isHhKidNight(hour: number): boolean {
    return hour >= HH_KID_NIGHT_START // 21h → 23h59 (00h exclus)
}

// Fenêtre "AUBE / début de journée" (RUN 2 — Ukognos) : heures locales 5h → 10h59.
export const HH_KID_DAWN_START = 5
export const HH_KID_DAWN_END = 11 // exclusif
export function isHhKidDawn(hour: number): boolean {
    return hour >= HH_KID_DAWN_START && hour < HH_KID_DAWN_END
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

// RUN 2 (NG+) — le GAMIN renvoie à l'AUBE, puis révèle UKOGNOS (l'écho féerique).
export const HH_KID_DAY_LINES_NGPLUS = [
    "Encore toi ? Mais cette fois, la plaine cache autre chose… quelque chose qui n'aime pas la lumière du plein jour.",
    "Reviens à l'AUBE — entre 5h et 11h du matin. On dit qu'ELLE danse dans la rosée aux premières lueurs. Pas le même qu'avant… plus étrange encore.",
]
export const HH_KID_DAWN_LINES = [
    "Pssst… aux premières lueurs, pile la bonne heure ! Écoute bien…",
    "Mon grand frère jure avoir vu un lutin de flammes violettes danser dans la rosée, juste là, dans les herbes…",
    "Du coup, à cette heure-ci, tes chances de croiser UKOGNOS sont DOUBLÉES ! Ça reste rarissime… mais un peu moins. Ouvre l'œil ! 🌅",
]

// Fenêtre "PLEIN MIDI / ZÉNITH" (RUN 3 — Flamarokto, la comète glace-feu) : heures locales 11h → 14h59.
export const HH_KID_NOON_START = 11
export const HH_KID_NOON_END = 15 // exclusif
export function isHhKidNoon(hour: number): boolean {
    return hour >= HH_KID_NOON_START && hour < HH_KID_NOON_END
}
// RUN 3 (concours) — le GAMIN renvoie au PLEIN MIDI, puis révèle FLAMAROKTO (la comète de glace et de feu).
export const HH_KID_DAY_LINES_RUN3 = [
    "Tiens, un concurrent du grand concours ! La plaine cache LE plus rapide de tous les Daemons… mais pas à n'importe quelle heure.",
    "Reviens en PLEIN MIDI — entre 11h et 15h. On dit qu'il fend l'herbe comme une comète quand le soleil est au zénith. Ni le dragon, ni la fée… quelque chose de brûlant ET de glacé.",
]
export const HH_KID_NOON_LINES = [
    "Pssst… pile à l'heure du zénith ! Écoute bien…",
    "Mon grand frère jure avoir vu une traînée de glace ET de flammes filer dans les herbes — si vite que le sol gelait et fumait à la fois…",
    "Du coup, à cette heure-ci, tes chances de croiser FLAMAROKTO sont DOUBLÉES ! Ça reste rarissime… mais un peu moins. Ouvre l'œil ! ☄️",
]
