// src/lib/gamebook/yellow/data/hauntedNpcs.ts
//
// Les 2 PNJ devant la MAISON HANTÉE (Cendreville).
//  • PNJ1 = BROCANTEUR : échange un Brookhanté du joueur contre un Roctaur qui, reçu par échange,
//    évolue aussitôt en ROCHISON (seul moyen d'obtenir rochison). Réutilise executeTrade +
//    applyTradeEvolution (cf. gameStore). Répétable tant que le joueur a un Brookhanté.
//  • PNJ2 = COLLECTIONNEUR DE SPECTRES : dresseur réaffrontable ; montre-lui 3 Daemons SPECTRE
//    DIFFÉRENTS au fil de tes combats + bats-le 3× → il offre la CT26 (Frappe d'Au-delà).

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"

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

// ── PNJ2 — COLLECTIONNEUR DE SPECTRES (21,11) : bats-le 3× en montrant 3 spectres distincts → CT26 ──
export const HH_COLLECTOR_ID = "y_hh_collector"
export const HH_COLLECTOR_MAP = "yellow_cendreville"
export const HH_COLLECTOR_POS = { x: 21, y: 11 }
export const HH_COLLECTOR_CT = "ct26" // Frappe d'Au-delà (cadeau)
export const HH_COLLECTOR_WINS_NEEDED = 3
export const HH_COLLECTOR_SPECTRES_NEEDED = 3

export const HH_COLLECTOR_INTRO_LINES = [
    "Ahhh, un dresseur ! Fais-moi admirer ta collection de SPECTRES…",
    "Affronte-moi ! Bats-moi 3 fois en m'exhibant 3 Daemons SPECTRE DIFFÉRENTS, et je t'offrirai une CT spectrale unique !",
]
export const HH_COLLECTOR_DONE_LINES = [
    "Ta collection de spectres est sublime… Merci de me l'avoir montrée, ami chasseur de fantômes !",
]
export const HH_COLLECTOR_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. ! Reviens-moi en pleine forme.",
]

/** Équipe du collectionneur : il CHERCHE les spectres → il en possède peu (un seul, son AS Ombrapanthe).
 *  Il combat surtout avec des Daemons forts mais que personne n'utilise (formes finales oubliées).
 *  Niveau plafonné à 40 (scale vers le bas pour les petits joueurs, jamais au-dessus). */
export function buildHhCollectorTeam(level: number): MonInstance[] {
    const cap = Math.min(level, 40) // jamais au-dessus du niveau 40
    return [
        createMonInstance("loupyre", Math.max(cap - 2, 5), { owned: false }), // FEU — loup de feu rapide
        createMonInstance("druidours", Math.max(cap - 2, 5), { owned: false }), // COMBAT/PLANTE — gros cogneur bulky
        createMonInstance("torturoche", Math.max(cap - 1, 5), { owned: false }), // ROCHE/PSY — mur spécial
        createMonInstance("ombrapanthe", cap, { owned: false }), // AS : sa seule fierté spectrale (panthère SPECTRE)
    ]
}
