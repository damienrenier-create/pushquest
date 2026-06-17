// src/lib/gamebook/yellow/data/caveTrader.ts
//
// PNJ "DÉNICHEUR" devant l'entrée de la grotte (Route Nord). Récompense d'avoir élevé un commun :
// le joueur DONNE un FAUKON (stade 2 de la lignée Plumiot, commun) → REÇOIT un BLAZIPER (base de la
// lignée Vipember), au MÊME niveau + MÊMES points Saiyan. À ce niveau, Blaziper évolue ensuite en
// Vipember (via evolveTeam, en combat) — le joueur peut aussi annuler l'évo avec B s'il préfère.
// Échange UNIQUE (flag caveTradeDone dans playerStore) : une fois fait, le PNJ n'a plus rien à offrir.

export const CAVE_TRADER_ID = "y_cave_trader"
export const CAVE_TRADER_MAP = "yellow_route_nord"
export const CAVE_TRADER_POS = { x: 13, y: 4 } // à côté de l'entrée de la grotte (12,3), case walkable
export const CAVE_TRADE_GIVE = "faukon"     // ce que le joueur DONNE
export const CAVE_TRADE_RECEIVE = "blaziper" // ce qu'il REÇOIT (base de la lignée Vipember)

export const CAVE_TRADER_OFFER_LINES = [
    "Tiens, un FAUKON ! Peu de dresseurs s'acharnent sur cette lignée commune… J'admire ta patience.",
    "Je te l'échange contre un Daemon RARE — la graine d'un grand : un BLAZIPER. Il paraît chétif, mais élève-le et tu verras éclore sa vraie puissance. Marché conclu ?",
]
export const CAVE_TRADER_NEED_LINES = [
    "Reviens me voir avec un FAUKON (lignée Plumiot) dans ton équipe, et je te révélerai un Daemon rare !",
]
export const CAVE_TRADE_DONE_LINES = [
    "Marché conclu ! Ton Faukon s'envole vers de nouveaux cieux…",
    "…et voici ta récompense : un BLAZIPER ! Faiblard à première vue, mais c'est la graine d'un Daemon redoutable. Continue de l'élever — tu ne le regretteras pas. 🔥",
]
// Après l'échange unique : le DÉNICHEUR n'a plus rien à proposer.
export const CAVE_TRADE_ALREADY_LINES = [
    "Je n'ai qu'un seul BLAZIPER à offrir, et il est déjà parti avec toi. Élève-le bien — c'est tout ce que j'avais !",
]
