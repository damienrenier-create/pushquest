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
import type { SpeciesData, PokeType } from "../battle/types"

/** Badge requis pour acheter une CT (aligné sur les salles de l'arène). */
export type BadgeId = "feu" | "plante" | "eau" | "roche" | "elec"

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
    /** TYPES SUPPLÉMENTAIRES autorisés à apprendre la CT (en plus du type de l'attaque) — façon Gen 1,
     *  où les grosses TM (Laser Glace, Séisme…) s'apprenaient bien au-delà de leur type. */
    alsoTypes?: PokeType[]
    /** ACHAT UNIQUE : ne peut être acheté qu'UNE fois dans la partie (cf. boughtCts) → retiré du shop ensuite. */
    oneTime?: boolean
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
    { id: "ct08", label: "CT08", moveId: "lance_flammes", price: 700, badge: "feu", alsoTypes: ["DRAGON", "NORMAL"] },
    { id: "ct09", label: "CT09", moveId: "flamme_ardente", price: 500, badge: "feu" },

    // --- Débloquées par le BADGE PLANTE ---
    { id: "ct10", label: "CT10", moveId: "tempete_verte", price: 700, badge: "plante" },
    { id: "ct11", label: "CT11", moveId: "vampigraine", price: 450, badge: "plante" },

    // --- Débloquées par le BADGE EAU ---
    { id: "ct12", label: "CT12", moveId: "hydrocanon", price: 750, badge: "eau", alsoTypes: ["GLACE", "SOL", "DRAGON", "NORMAL"] },
    { id: "ct13", label: "CT13", moveId: "souffle_polaire", price: 600, badge: "eau", alsoTypes: ["EAU", "VOL", "DRAGON", "NORMAL", "SOL"] },

    // --- CT "champion" : nécessitent les 3 badges ---
    { id: "ct14", label: "CT14", moveId: "seisme", price: 900, champion: true, alsoTypes: ["ROCHE", "DRAGON", "NORMAL"] },
    { id: "ct15", label: "CT15", moveId: "draco_charge", price: 900, champion: true, alsoTypes: ["VOL", "EAU", "NORMAL"] },
    { id: "ct16", label: "CT16", moveId: "vague_mentale", price: 800, champion: true, alsoTypes: ["NORMAL", "SPECTRE", "POISON"] },

    // --- CT signature : CADEAU du Druide (jamais en vente, gratuite à enseigner) ---
    { id: "ct17", label: "CT17", moveId: "etreinte_sylvestre", price: 0, gift: true },

    // --- Utilitaire set-up : boost de Spé, apprenable par TOUS (dispo dès le départ) ---
    { id: "ct18", label: "CT18", moveId: "focalisation", price: 450, universal: true },

    // --- CT signature ROCHE : CADEAU du boss d'arène Roche (jamais en vente) ---
    { id: "ct19", label: "CT19", moveId: "faille_sismique", price: 0, gift: true },
    // --- CT Roche en vente (débloquée par le badge roche) ---
    { id: "ct20", label: "CT20", moveId: "lame_roche", price: 700, badge: "roche", alsoTypes: ["SOL", "COMBAT", "NORMAL"] },

    // --- CT signature FEU : CADEAU de la boss PYRA (Arène Feu, jamais en vente) ---
    { id: "ct21", label: "CT21", moveId: "pyrotechnie", price: 0, gift: true },

    // --- CT signature ÉLEC : CADEAU du boss VOLTA (Tour Hertz, jamais en vente) ---
    { id: "ct22", label: "CT22", moveId: "surtension", price: 0, gift: true },
    // --- CT Élec en vente (débloquées par le badge elec) ---
    { id: "ct23", label: "CT23", moveId: "etincelle", price: 500, badge: "elec", alsoTypes: ["NORMAL", "DRAGON"] },
    { id: "ct24", label: "CT24", moveId: "fulgurance", price: 750, badge: "elec", alsoTypes: ["NORMAL", "DRAGON"] },
    // Mirage : esquive cumulable, puissante → CADEAU EXCLUSIF de la revanche de VOLTA
    // (jamais en vente, comme Surtension). Remise avec ct22 à la victoire du rematch boss.
    { id: "ct25", label: "CT25", moveId: "mirage", price: 0, gift: true, universal: true }, // Mirage = utilitaire d'esquive → apprenable par TOUS
    // CADEAU SPECTRE : récompense du PNJ "collectionneur de spectres" de Cendreville (montre 3 spectres
    // différents + bats-le 3×). Premier gros move SPECTRE enseignable par CT.
    { id: "ct26", label: "CT26", moveId: "frappe_audela", price: 0, gift: true },
    { id: "ct27", label: "CT27", moveId: "deferlante", price: 0, gift: true },
    // --- CT COMBAT (Champion, 3 badges) : « Crochet du Maître » multi-coups (2-5×). Seule CT de type Combat. ---
    { id: "ct28", label: "CT28", moveId: "deluge_crochets", price: 900, champion: true },
    // --- CT NORMAL forte « Plaquage » (Body Slam : 85 + paralysie) : apprenable par TOUT LE MONDE (universal). ---
    { id: "ct29", label: "CT29", moveId: "plaquage", price: 650, universal: true },
    // --- CT INSECTE « Boul'Pollen » (85 + drain 50%) : 1re CT Insecte ; aussi pour les Plante (pollen). ---
    { id: "ct30", label: "CT30", moveId: "boul_pollen", price: 550, alsoTypes: ["PLANTE"] },
    // --- CT NORMAL « Météores » (ne rate JAMAIS) : ACHAT UNIQUE et CHER. Apprenable par tous (Normal). ---
    { id: "ct31", label: "CT31", moveId: "meteores", price: 1500, universal: true, oneTime: true },
]

export function getCt(id: string): CtData | null {
    return CTS.find((c) => c.id === id) ?? null
}

/**
 * Un Daemon peut-il apprendre cette CT ?
 * - CT universelle (stat/utilité) → tout le monde.
 * - sinon : type de l'attaque parmi les types du Daemon, OU un des alsoTypes (élargissement Gen 1),
 *   OU attaque NORMAL.
 */
export function canLearnCt(species: SpeciesData, ct: CtData): boolean {
    if (species.learnsAllCts) return true // GÉKROC : couteau-suisse, apprend TOUTES les CT (tous types)
    if (ct.universal) return true
    const move = getMove(ct.moveId)
    if (!move) return false
    if (move.type === "NORMAL") return true
    if (species.types.includes(move.type)) return true
    return !!ct.alsoTypes?.some((t) => species.types.includes(t)) // types supplémentaires (façon Gen 1)
}

/** CT effectivement achetables selon les badges possédés (et hors CT « achat unique » déjà achetées). */
export function purchasableCts(badges: BadgeId[], bought: string[] = []): CtData[] {
    const has3 = (["feu", "plante", "eau"] as BadgeId[]).every((b) => badges.includes(b))
    return CTS.filter((c) => {
        if (c.gift) return false // jamais en vente : obtenue uniquement en cadeau
        if (c.oneTime && bought.includes(c.id)) return false // achat unique déjà effectué → retirée du shop
        if (c.champion) return has3
        if (c.badge) return badges.includes(c.badge)
        return true
    })
}
