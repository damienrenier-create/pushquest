// src/lib/gamebook/yellow/data/cts.ts
//
// Nexus Jaune Éclair — catalogue des CT (Capsules Techniques).
// Une CT enseigne une attaque du pool à un Daemon compatible (passe par
// l'écran d'apprentissage si les 4 slots sont pleins). Payées en reps.
//
// GATING : certaines CT ne sont vendues qu'une fois le badge de la salle
// correspondante obtenu (arène : Feu / Plante / Eau). Les CT "champion" ne
// se débloquent qu'avec les 3 badges. Les CT utilitaires sont dispo dès le départ.
//
// ⚠️ La BOUTIQUE de CT (UI) et les BADGES ne sont pas encore codés : ce fichier
// est la SOURCE DE VÉRITÉ de la liste à mettre en place. Réutilisera resolveLearn().

import { getMove } from "./moves"
import type { SpeciesData } from "../battle/types"

/** Badge requis pour acheter une CT (aligné sur les salles de l'arène). */
export type BadgeId = "feu" | "plante" | "eau"

export interface CtData {
    id: string          // "ct01"
    label: string       // "CT01"
    moveId: string      // attaque enseignée (cf. moves.ts)
    price: number       // coût en reps
    /** Badge requis pour l'acheter (absent = disponible dès le départ). */
    badge?: BadgeId
    /** Requiert les 3 badges (CT de fin, vendues au champion / hub). */
    champion?: boolean
    /** CADEAU : remise gratuitement par un boss, JAMAIS en vente (trophée). */
    gift?: boolean
    /** Enseignable à N'IMPORTE QUEL Daemon (moves de stat/utilité), sinon compat de type. */
    universal?: boolean
}

export const CTS: CtData[] = [
    // --- Utilitaires : disponibles dès le départ (boutique principale) ---
    { id: "ct01", label: "CT01", moveId: "danse_lames", price: 400, universal: true },
    { id: "ct02", label: "CT02", moveId: "mur_de_fer", price: 350, universal: true },
    { id: "ct03", label: "CT03", moveId: "repos", price: 450, universal: true },
    { id: "ct04", label: "CT04", moveId: "elan", price: 300, universal: true },
    { id: "ct05", label: "CT05", moveId: "toxik", price: 400, universal: true },
    { id: "ct06", label: "CT06", moveId: "onde_folie", price: 350, universal: true },
    { id: "ct07", label: "CT07", moveId: "vive_attaque", price: 300, universal: true },

    // --- Débloquées par le BADGE FEU ---
    { id: "ct08", label: "CT08", moveId: "lance_flammes", price: 700, badge: "feu" },
    { id: "ct09", label: "CT09", moveId: "flamme_ardente", price: 500, badge: "feu" },

    // --- Débloquées par le BADGE PLANTE ---
    { id: "ct10", label: "CT10", moveId: "tempete_verte", price: 700, badge: "plante" },
    { id: "ct11", label: "CT11", moveId: "vampigraine", price: 450, badge: "plante" },

    // --- Débloquées par le BADGE EAU ---
    { id: "ct12", label: "CT12", moveId: "hydrocanon", price: 750, badge: "eau" },
    { id: "ct13", label: "CT13", moveId: "souffle_polaire", price: 600, badge: "eau" },

    // --- CT "champion" : nécessitent les 3 badges ---
    { id: "ct14", label: "CT14", moveId: "seisme", price: 900, champion: true },
    { id: "ct15", label: "CT15", moveId: "draco_charge", price: 900, champion: true },
    { id: "ct16", label: "CT16", moveId: "vague_mentale", price: 800, champion: true },

    // --- CT signature : CADEAU du Druide (jamais en vente, gratuite à enseigner) ---
    { id: "ct17", label: "CT17", moveId: "etreinte_sylvestre", price: 0, gift: true },

    // --- Utilitaire set-up : boost de Spé, apprenable par TOUS (dispo dès le départ) ---
    { id: "ct18", label: "CT18", moveId: "focalisation", price: 450, universal: true },
]

export function getCt(id: string): CtData | null {
    return CTS.find((c) => c.id === id) ?? null
}

/**
 * Un Daemon peut-il apprendre cette CT ?
 * - CT universelle (stat/utilité) → tout le monde.
 * - sinon : type de l'attaque parmi les types du Daemon, ou attaque NORMAL.
 */
export function canLearnCt(species: SpeciesData, ct: CtData): boolean {
    if (ct.universal) return true
    const move = getMove(ct.moveId)
    if (!move) return false
    if (move.type === "NORMAL") return true
    return species.types.includes(move.type)
}

/** CT effectivement achetables selon les badges possédés. */
export function purchasableCts(badges: BadgeId[]): CtData[] {
    const has3 = (["feu", "plante", "eau"] as BadgeId[]).every((b) => badges.includes(b))
    return CTS.filter((c) => {
        if (c.gift) return false // jamais en vente : obtenue uniquement en cadeau
        if (c.champion) return has3
        if (c.badge) return badges.includes(c.badge)
        return true
    })
}
