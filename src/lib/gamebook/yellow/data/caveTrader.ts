// src/lib/gamebook/yellow/data/caveTrader.ts
//
// PNJ "DÉNICHEUR" devant l'entrée de la grotte (Route Nord). Récompense d'avoir capturé un commun :
// le joueur DONNE n'importe quel COMMUN de base de la Route Nord (cf. CAVE_TRADE_GIVE_POOL) → REÇOIT un
// BÉLUNODE (base de la lignée Léviathonn), au MÊME niveau + MÊMES points Saiyan. Bélunode évolue ensuite
// en Sonarque (16) puis Léviathonn (34) — le joueur peut annuler l'évo avec B s'il préfère.
// Échange UNIQUE (flag caveTradeDone dans playerStore) : une fois fait, le PNJ n'a plus rien à offrir.

export const CAVE_TRADER_ID = "y_cave_trader"
export const CAVE_TRADER_MAP = "yellow_route_nord"
export const CAVE_TRADER_POS = { x: 13, y: 4 } // à côté de l'entrée de la grotte (12,3), case walkable
// Ce que le joueur DONNE : n'importe quel COMMUN de base de la Route Nord (« un Daemon random et faible »).
export const CAVE_TRADE_GIVE_POOL = ["plumiot", "couperin", "cailloutchi", "ruffiant", "cornaissant"]
export const CAVE_TRADE_GIVE = "plumiot"       // représentant par défaut (messages / rétro-compat)
export const CAVE_TRADE_RECEIVE = "belunode"   // ce qu'il REÇOIT (base de la lignée Léviathonn)

export const CAVE_TRADER_OFFER_LINES = [
    "Tiens, un petit commun ! La plupart des dresseurs les relâchent… moi, je collectionne les curiosités.",
    "Je te l'échange contre un Daemon étrange que j'ai remonté de la grotte : un BÉLUNODE. Un têtard fadasse en apparence… mais élève-le, et tu verras surgir un LÉVIATHON des profondeurs. Marché conclu ?",
]
export const CAVE_TRADER_NEED_LINES = [
    "Reviens me voir avec un petit COMMUN dans ton équipe (Plumiot, Couperin, Cailloutchi…), et je te révélerai une curiosité des profondeurs !",
]
export const CAVE_TRADE_DONE_LINES = [
    "Marché conclu ! Ton petit commun part explorer d'autres horizons…",
    "…et voici ta curiosité : un BÉLUNODE ! Insignifiant à l'œil nu, mais c'est le nourrisson d'un colosse des abysses. Élève-le — il deviendra un LÉVIATHONN. 🌊",
]
// Après l'échange unique : le DÉNICHEUR n'a plus rien à proposer.
export const CAVE_TRADE_ALREADY_LINES = [
    "Je n'avais qu'un seul BÉLUNODE à offrir, et il nage déjà avec toi. Élève-le bien — c'est tout ce que j'avais !",
]
