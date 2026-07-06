// src/lib/gamebook/yellow/data/hauntedNpcs.ts
//
// Les 2 PNJ devant la MAISON HANTÉE (Cendreville).
//  • PNJ1 = BROCANTEUR : DEMANDE un Roctaur du joueur et l'échange contre un MORROW (Glace/Psy, hommage
//    Lippoutou). Réutilise executeTrade (cf. gameStore). Répétable tant que le joueur a un Roctaur.
//    NB : Rochison (évo-ÉCHANGE de Roctaur) n'est plus donné ici — il reste obtenable via un ÉCHANGE
//    ENTRE JOUEURS réels (troquer un Roctaur avec un pote déclenche sa trade-évolution).
//  • PNJ2 = COLLECTIONNEUR DE SPECTRES : dresseur réaffrontable ; montre-lui 3 Daemons SPECTRE
//    DIFFÉRENTS au fil de tes combats + bats-le 3× → il offre la CT26 (Frappe d'Au-delà).

import { createMonInstance } from "../battle/factory"
import type { MonInstance } from "../battle/types"

export const HH_TRADER_ID = "y_hh_trader"
export const HH_TRADER_MAP = "yellow_cendreville"
export const HH_TRADER_POS = { x: 20, y: 11 }
export const HH_TRADE_GIVE = "roctaur" // ce que le joueur DONNE
export const HH_TRADE_RECEIVE = "morrow" // ce qu'il REÇOIT (Morrow — Glace/Psy, ne trade-évolue pas)

export const HH_TRADER_OFFER_LINES = [
    "Hé, l'ami ! Tu rôdes près de la maison hantée… tu n'aurais pas un ROCTAUR sous la main ?",
    "Je te l'échange contre… ÇA. Un MORROW. Une drôle de créature venue d'ailleurs, au baiser à faire frissonner. Marché conclu ?",
]
export const HH_TRADER_NEED_LINES = [
    "Reviens me voir avec un ROCTAUR et mon Morrow est à toi !",
]

// ── PNJ2 — COLLECTIONNEUR DE SPECTRES (21,11) : bats-le 3× en montrant 3 spectres distincts → CT26 ──
export const HH_COLLECTOR_ID = "y_hh_collector"
// Déplacé À L'INTÉRIEUR de la maison hantée, au fond du labyrinthe (poche isolée 12,6) : il faut
// traverser le brouillard + les rencontres spectres pour le trouver → vrai but d'explorer le manoir.
export const HH_COLLECTOR_MAP = "yellow_maison_hantee"
export const HH_COLLECTOR_POS = { x: 12, y: 6 }
export const HH_COLLECTOR_CT = "ct26" // Frappe d'Au-delà (cadeau)
export const HH_COLLECTOR_WINS_NEEDED = 3
export const HH_COLLECTOR_SPECTRES_NEEDED = 3

export const HH_COLLECTOR_INTRO_LINES = [
    "Ahhh, un dresseur ! Fais-moi admirer ta collection de SPECTRES…",
    "Voici mon défi : bats-moi 3 fois. Mais surtout, viens combattre en GARDANT dans ton équipe des Daemons de type SPECTRE — il me suffit de les apercevoir à tes côtés, pas besoin de les envoyer au front. Je les compte au fil de nos duels.",
    "Montre-m'en 3 DIFFÉRENTS et remporte 3 victoires, et la CT « Frappe de l'Au-delà » sera à toi !",
]
// Rappel court affiché quand le joueur revient (a déjà combattu une fois) — évite de relire tout le topo.
export const HH_COLLECTOR_REMINDER_LINES = [
    "Re-bonjour, chasseur de fantômes ! Montre-moi d'autres SPECTRES et bats-moi encore.",
]
export const HH_COLLECTOR_DONE_LINES = [
    "Ta collection de spectres est sublime… Merci de me l'avoir montrée, ami chasseur de fantômes !",
]
export const HH_COLLECTOR_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. ! Reviens-moi en pleine forme.",
]

/** Équipe du collectionneur : il CHERCHE les spectres → il en possède peu (un seul, son AS Ombrapanthe).
 *  Il combat surtout avec des Daemons forts mais que personne n'utilise (formes finales oubliées).
 *  Réguliers plafonnés à 40, l'AS Ombrapanthe à 42 (scale vers le bas pour les petits joueurs). */
export function buildHhCollectorTeam(level: number): MonInstance[] {
    const cap = Math.min(level, 40) // les réguliers ne dépassent pas le niveau 40
    return [
        createMonInstance("loupyre", Math.max(cap - 2, 5), { owned: false }), // FEU — loup de feu rapide
        createMonInstance("druidours", Math.max(cap - 2, 5), { owned: false }), // COMBAT/PLANTE — gros cogneur bulky
        createMonInstance("torturoche", Math.max(cap - 1, 5), { owned: false }), // ROCHE/PSY — mur spécial
        createMonInstance("gloutanoir", Math.max(cap - 1, 5), { owned: false }), // PLANTE — mur spécial draineur
        createMonInstance("magmator", cap, { owned: false }), // ROCHE/FEU — attaquant tanky
        createMonInstance("ombrapanthe", cap + 2, { owned: false }), // AS : sa seule fierté spectrale (panthère SPECTRE), niv 42
    ]
}
