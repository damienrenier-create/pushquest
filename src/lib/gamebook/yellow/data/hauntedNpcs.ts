// src/lib/gamebook/yellow/data/hauntedNpcs.ts
//
// Les 2 PNJ devant la MAISON HANTÉE (Cendreville).
//  • PNJ1 = BROCANTEUR : échange un Roctaur du joueur — WORLD-AWARE :
//     - RUN 1 : le Roctaur revient trade-ÉVOLUÉ en ROCHISON (service d'évolution-échange, comme à l'origine).
//     - RUN 2 : le Roctaur est échangé contre un MORROW (Glace/Psy, hommage Lippoutou) — Morrow EXCLUSIF au run 2.
//    Réutilise executeTrade (cf. gameStore). Répétable tant que le joueur a un Roctaur. Un joueur qui possède
//    DÉJÀ un Morrow (obtenu jadis en run 1) est ÉCARTÉ du service Rochison → il garde son Morrow, et pour obtenir
//    un Rochison il doit passer par un vrai ÉCHANGE ENTRE JOUEURS (trade-évolution du Roctaur avec un pote).
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
    "Je te l'échange contre… ÇA. Un MORROW. Une drôle de créature venue d'ailleurs, au baiser à faire frissonner.",
    "J'échange le PREMIER ROCTAUR de ton ÉQUIPE. Marché conclu ?  →  Ⓐ ÉCHANGER · Ⓑ renoncer",
]
// Le joueur a renoncé (Ⓑ) : on ne troque RIEN.
export const HH_TRADER_CANCEL_LINES = [
    "Comme tu veux, l'ami. Ton Roctaur reste bien au chaud dans ton équipe… reviens si tu changes d'avis. 😏",
]
export const HH_TRADER_NEED_LINES = [
    "Reviens me voir avec un ROCTAUR et mon Morrow est à toi !",
]

// RUN 1 : le BROCANTEUR fait trade-ÉVOLUER ton Roctaur → ROCHISON (au lieu de donner un Morrow, réservé au run 2).
export const HH_TRADE_RECEIVE_RUN1 = "rochison"
export const HH_TRADER_OFFER_LINES_RUN1 = [
    "Hé, l'ami ! Un ROCTAUR ? Confie-le-moi : je le fais passer par un canal d'échange très spécial…",
    "…et il te reviendra ÉVOLUÉ en ROCHISON ! La magie de l'échange, rien de moins.",
    "J'évolue le PREMIER ROCTAUR de ton ÉQUIPE (sa brillance et son entraînement sont préservés). Marché conclu ?  →  Ⓐ ÉCHANGER · Ⓑ renoncer",
]
export const HH_TRADER_NEED_LINES_RUN1 = [
    "Amène-moi un ROCTAUR et je te le fais évoluer en ROCHISON, promis d'outre-tombe !",
]
// Un joueur possédant DÉJÀ un Morrow (obtenu jadis) est écarté du service Rochison.
export const HH_TRADER_HAS_MORROW_LINES = [
    "Toi… tu as déjà un MORROW ?! Sacré veinard. Entre nous, l'affaire est close — file, et prends-en soin.",
]

// ── SERVICE PREMIUM (post-game, monde LIVE) — AQUILOTHAN → AQUILORD ──────────────────────────────────
// Le brocanteur trade-ÉVOLUE ton Aquilothan en AQUILORD via un détour comique : il te refile d'abord son
// MIMIMOY (créature falote), puis le RÉCLAME aussitôt et te rend l'Aquilord. Le passage du Mimimoy entre tes
// mains AMORCE son roaming (il pourra ensuite APPARAÎTRE dans la nature, cf. mimimoyReturned).
export const HH_TRADE_AQUILOTHAN_GIVE = "aquilothan"
export const HH_TRADE_AQUILOTHAN_RECEIVE = "aquilord"
export const HH_TRADER_AQUILORD_OFFER_LINES = [
    "Oh ! Un AQUILOTHAN… quelle prestance ! J'ai justement de quoi lui faire passer un cap.",
    "Confie-le-moi. En garantie, tiens, prends mon MIMIMOY… ",
    "Ah, mais — ATTENDS ! C'est MON Mimimoy, ça ! Rends-le-moi, coquin, et prends plutôt CECI en retour.",
    "J'échange le PREMIER AQUILOTHAN de ton ÉQUIPE contre un AQUILORD (entraînement préservé). Marché conclu ?  →  Ⓐ ÉCHANGER · Ⓑ renoncer",
]
export const HH_TRADER_AQUILORD_NEED_LINES = [
    "Un AQUILOTHAN, et je te le fais passer AQUILORD par la magie de l'échange. Reviens avec, l'ami !",
]
export const HH_TRADER_AQUILORD_DONE_LINES = [
    "Marché conclu ! Ton Aquilothan file dans mon canal d'échange secret…",
    "…et il te REVIENT, ÉVOLUÉ en AQUILORD ! Seigneur des tempêtes, rien de moins. 🦅",
    "Ah, et… ce petit MIMIMOY qui a filé entre tes doigts ? Il a pris goût à ta compagnie. Ne sois pas surpris s'il vient te RÔDER autour un de ces jours… 👀",
]
export const HH_TRADER_AQUILORD_CANCEL_LINES = [
    "Comme tu veux ! Garde ton Aquilothan… mais un AQUILORD, ça ne court pas les rues, l'ami. 😏",
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
