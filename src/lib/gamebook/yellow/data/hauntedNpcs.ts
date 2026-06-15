// src/lib/gamebook/yellow/data/hauntedNpcs.ts
//
// Les 2 PNJ devant la MAISON HANTÉE (Cendreville).
//  • PNJ1 = BROCANTEUR : échange un Brookhanté du joueur contre un Roctaur qui, reçu par échange,
//    évolue aussitôt en ROCHISON (seul moyen d'obtenir rochison). Réutilise executeTrade +
//    applyTradeEvolution (cf. gameStore). Répétable tant que le joueur a un Brookhanté.
//  • PNJ2 = COLLECTIONNEUR DE SPECTRES : dresseur réaffrontable ; montre-lui 3 Daemons SPECTRE
//    DIFFÉRENTS au fil de tes combats + bats-le 3× → il offre la CT26 (Frappe d'Au-delà).

export const HH_TRADER_ID = "y_hh_trader"
export const HH_TRADER_MAP = "yellow_cendreville"
export const HH_TRADER_POS = { x: 20, y: 11 }
export const HH_TRADE_GIVE = "brookhante" // ce que le joueur DONNE
export const HH_TRADE_RECEIVE = "roctaur" // ce qu'il REÇOIT (évolue en rochison par l'échange)

export const HH_TRADER_OFFER_LINES = [
    "Hé, l'ami ! Toi qui hantes la maison… tu n'aurais pas un Brookhanté ?",
    "Je te file mon Roctaur contre lui. On dit qu'un Daemon qui change de main… révèle parfois une autre forme. Marché conclu ?",
]
export const HH_TRADER_NEED_LINES = [
    "Reviens me voir avec un BROOKHANTÉ et mon Roctaur est à toi !",
]
