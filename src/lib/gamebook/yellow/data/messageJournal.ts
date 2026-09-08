// src/lib/gamebook/yellow/data/messageJournal.ts
//
// JOURNAL DES MESSAGES (calepin, onglet « Messages ») — décide quels dialogues sont « info » (à consigner) et à quelle
// SOURCE ils appartiennent (pour le filtre). Objectif : garder les objectifs / infos de zone / indices PNJ / messages
// du Dieu Spaghetti, en excluant le BRUIT de combat (railleries de dresseurs, sbire, reflets). Pur & testable.

import { getTrainer } from "./trainers"

// Le Dieu Spaghetti parle sous plusieurs ids selon le contexte (pêche, porte du Dôme, rêve Pâte de Luxe, Autel).
const SPAGHETTI_IDS: ReadonlySet<string> = new Set(["y_dome_spaghetti", "spaghetti_gate", "spaghetti_dream", "y_fishing"])
// Sources de BRUIT pur (railleries de combat / provocations) → jamais consignées.
const NOISE_IDS: ReadonlySet<string> = new Set(["y_sbire", "run2ghost", "y_nemesis_challenge"])
// Dresseurs qui distillent AUSSI de vraies directions (à GARDER malgré leur statut de dresseur) : ACE annonce
// l'ouverture de Cendreville + la Ligue au sud → info précieuse qu'on ne veut pas perdre.
const KEEP_TRAINERS: ReadonlySet<string> = new Set(["y_ace"])

const up = (s?: string) => (s ?? "").toUpperCase()
function isSpaghetti(npcId: string, name?: string): boolean { return SPAGHETTI_IDS.has(npcId) || up(name).includes("SPAGHETTI") }
function isGenie(npcId: string, name?: string): boolean { return npcId.includes("genie") || up(name).includes("GÉNIE") || up(name).includes("GENIE") }

/** Faut-il CONSIGNER ce dialogue au journal « info » ? On garde le Dieu Spaghetti / le génie / tous les PNJ narratifs
 *  et panneaux ; on EXCLUT les railleries de combat (dresseurs, sauf ceux de KEEP_TRAINERS), le sbire et les reflets. */
export function shouldLogMessage(npcId: string, name?: string): boolean {
    if (!npcId) return false
    if (isSpaghetti(npcId, name) || isGenie(npcId, name)) return true
    if (NOISE_IDS.has(npcId)) return false
    if (getTrainer(npcId) && !KEEP_TRAINERS.has(npcId)) return false // dresseur de combat → intro/raillerie, pas de l'info
    return true
}

export type MessageSource = "spaghetti" | "genie" | "pnj"
/** Catégorie de source (pour le filtre du journal : « Dieu Spaghetti » / « Génie » / « PNJ »). */
export function messageSource(npcId: string, name?: string): MessageSource {
    if (isSpaghetti(npcId, name)) return "spaghetti"
    if (isGenie(npcId, name)) return "genie"
    return "pnj"
}
