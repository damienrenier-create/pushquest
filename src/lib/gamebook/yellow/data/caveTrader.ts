// src/lib/gamebook/yellow/data/caveTrader.ts
//
// PNJ "DÉNICHEUR" devant l'entrée de la grotte (Route Nord). Le joueur DONNE un LIMAROCHE (natif de la
// grotte, Roche/Psy) → REÇOIT un BÉLUNODE (base de la lignée Léviathonn), au MÊME niveau + MÊMES points
// Saiyan. Bélunode évolue ensuite en Sonarque (16) puis Léviathonn (34) — le joueur peut annuler l'évo
// avec B s'il préfère. Échange UNIQUE (flag caveTradeDone dans playerStore) : une fois fait, plus rien.

export const CAVE_TRADER_ID = "y_cave_trader"
export const CAVE_TRADER_MAP = "yellow_route_nord"
export const CAVE_TRADER_POS = { x: 13, y: 4 } // à côté de l'entrée de la grotte (12,3), case walkable
export const CAVE_TRADE_GIVE = "limaroche"     // ce que le joueur DONNE (natif de la grotte, juste à côté)
export const CAVE_TRADE_RECEIVE = "belunode"   // ce qu'il REÇOIT (base de la lignée Léviathonn)

export const CAVE_TRADER_OFFER_LINES = [
    "Tiens, un LIMAROCHE ! Tu as fouillé la grotte, à ce que je vois… Ces petits fossiles, j'en raffole.",
    "Je te l'échange contre une curiosité que j'ai remontée des profondeurs : un BÉLUNODE. Un têtard fadasse en apparence… mais élève-le, et tu verras surgir un LÉVIATHON des abysses.",
    "J'échange le PREMIER LIMAROCHE de ton ÉQUIPE (son entraînement est préservé). Marché conclu ?  →  Ⓐ ÉCHANGER · Ⓑ renoncer",
]
// Le joueur a renoncé (Ⓑ) : on ne troque RIEN, le Limaroche reste dans l'équipe.
export const CAVE_TRADE_CANCEL_LINES = [
    "Comme tu veux ! Garde ton Limaroche… mais si tu changes d'avis, tu sais où me trouver. Ce Bélunode n'attendra pas éternellement.",
]
export const CAVE_TRADER_NEED_LINES = [
    "Reviens me voir avec un LIMAROCHE (ça grouille dans la grotte, juste là), et je te révélerai une curiosité des profondeurs !",
]
export const CAVE_TRADE_DONE_LINES = [
    "Marché conclu ! Ton Limaroche retourne à ses cailloux…",
    "…et voici ta curiosité : un BÉLUNODE ! Insignifiant à l'œil nu, mais c'est le nourrisson d'un colosse des abysses. Élève-le — il deviendra un LÉVIATHONN. 🌊",
]
// Après l'échange unique : le DÉNICHEUR n'a plus rien à proposer.
export const CAVE_TRADE_ALREADY_LINES = [
    "Je n'avais qu'un seul BÉLUNODE à offrir, et il nage déjà avec toi. Élève-le bien — c'est tout ce que j'avais !",
]
