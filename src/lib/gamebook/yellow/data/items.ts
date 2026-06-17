// src/lib/gamebook/yellow/data/items.ts
//
// Nexus Jaune Éclair — objets : Balls (capture) + soins. Data-driven.
// L'achat/coût se paie en ÉNERGIE PushQuest (reps) → couche meta (hors moteur).

export type ItemCategory = "BALL" | "HEAL" | "STATUS_HEAL" | "BOOST" | "MISC"

/** Statuts majeurs gérés (aligné sur MajorStatus). "ALL" = tous. */
export type CurableStatus = "ALL" | "BURN" | "POISON" | "TOXIC" | "PARALYSIS" | "SLEEP" | "FREEZE"

export interface ItemData {
    id: string
    name: string
    category: ItemCategory
    description: string
    /** Coût en reps (énergie PushQuest). */
    price: number
    /** Pour les Balls : multiplicateur de capture. */
    ballBonus?: number
    /** Ball à capture GARANTIE (Master-Ball) : bypasse toute la formule. */
    guaranteed?: boolean
    /** Pour les soins : PV restaurés (0 = full). */
    healHp?: number
    /** STATUS_HEAL : statuts guéris. */
    cures?: CurableStatus[]
    /** BOOST (objet X) : stat boostée + nombre de crans (appliqué en combat). */
    boostStat?: "atk" | "def" | "spe" | "spc"
    boostStages?: number
}

export const ITEMS: Record<string, ItemData> = {
    poke_ball: {
        id: "poke_ball", name: "Nexus-Ball", category: "BALL",
        description: "Ball standard pour capturer un Daemon affaibli.", price: 30, ballBonus: 1,
    },
    poke_ball_plus: {
        id: "poke_ball_plus", name: "Nexus-Ball +", category: "BALL",
        description: "Un cran au-dessus de la Nexus-Ball de base.", price: 45, ballBonus: 1.5,
    },
    super_ball: {
        id: "super_ball", name: "Super Nexus-Ball", category: "BALL",
        description: "Bon taux de capture.", price: 60, ballBonus: 2,
    },
    super_ball_plus: {
        id: "super_ball_plus", name: "Super Nexus-Ball +", category: "BALL",
        description: "Très bon taux de capture.", price: 75, ballBonus: 3,
    },
    hyper_ball: {
        id: "hyper_ball", name: "Hyper Nexus-Ball", category: "BALL",
        description: "Excellent taux de capture.", price: 100, ballBonus: 4,
    },
    hyper_ball_plus: {
        id: "hyper_ball_plus", name: "Hyper Nexus-Ball +", category: "BALL",
        description: "Le summum hors Master — pour les proies les plus coriaces.", price: 150, ballBonus: 5,
    },
    master_ball: {
        id: "master_ball", name: "Master-Éclair", category: "BALL",
        description: "Capture infaillible. Rarissime.", price: 0, ballBonus: 255, guaranteed: true,
    },
    // Récompense du DRESSEUR D'ORCALINE (plaine d'entraînement). Très forte (ballBonus 6 → satisfait toute
    // exigence de Ball), ET capture GARANTIE sur GOSHENDOFY s'il est sous 50% PV (cas spécial dans engine.ts).
    super_mega_nexus_ball: {
        id: "super_mega_nexus_ball", name: "Super Méga Nexus-Ball", category: "BALL",
        description: "Ball légendaire. Capture à coup sûr le plus insaisissable des Daemons s'il est suffisamment affaibli.", price: 0, ballBonus: 6,
    },
    potion: {
        id: "potion", name: "Potion", category: "HEAL",
        description: "Restaure 20 PV à un Daemon.", price: 20, healHp: 20,
    },
    super_potion: {
        id: "super_potion", name: "Super Potion", category: "HEAL",
        description: "Restaure 50 PV.", price: 50, healHp: 50,
    },
    hyper_potion: {
        id: "hyper_potion", name: "Hyper Potion", category: "HEAL",
        description: "Restaure 100 PV.", price: 100, healHp: 100,
    },

    // --- Anti-statut (en combat) ---
    antidote: {
        id: "antidote", name: "Antidote", category: "STATUS_HEAL",
        description: "Soigne le Poison.", price: 0, cures: ["POISON", "TOXIC"],
    },
    anti_para: {
        id: "anti_para", name: "Anti-Para", category: "STATUS_HEAL",
        description: "Soigne la Paralysie.", price: 0, cures: ["PARALYSIS"],
    },
    reveil: {
        id: "reveil", name: "Réveil", category: "STATUS_HEAL",
        description: "Réveille un Daemon endormi.", price: 0, cures: ["SLEEP"],
    },
    antigel: {
        id: "antigel", name: "Antigel", category: "STATUS_HEAL",
        description: "Dégèle un Daemon gelé.", price: 0, cures: ["FREEZE"],
    },
    anti_brulure: {
        id: "anti_brulure", name: "Anti-Brûlure", category: "STATUS_HEAL",
        description: "Soigne la Brûlure.", price: 0, cures: ["BURN"],
    },
    total_soin: {
        id: "total_soin", name: "Total Soin", category: "STATUS_HEAL",
        description: "Soigne TOUS les statuts.", price: 250, cures: ["ALL"],
    },

    // --- Objets X : boostent une stat de +1 cran pour le combat (consomment le tour) ---
    x_attaque: {
        id: "x_attaque", name: "X-Attaque", category: "BOOST",
        description: "Attaque +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "atk", boostStages: 1,
    },
    x_defense: {
        id: "x_defense", name: "X-Défense", category: "BOOST",
        description: "Défense +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "def", boostStages: 1,
    },
    x_vitesse: {
        id: "x_vitesse", name: "X-Vitesse", category: "BOOST",
        description: "Vitesse +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "spe", boostStages: 1,
    },
    x_special: {
        id: "x_special", name: "X-Spé", category: "BOOST",
        description: "Spécial +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "spc", boostStages: 1,
    },

    // --- Objet d'ÉVOLUTION (Part B : Pierre Gékroc → fait évoluer Panthéon vers la panthère du type choisi) ---
    pierre_gekroc: {
        id: "pierre_gekroc", name: "Pierre Gékroc", category: "MISC",
        description: "Pierre d'évolution crépitante, libérée par Gékroc. Permet à Panthéon d'évoluer vers la panthère du type de ton choix.", price: 0,
    },
}

export function getItem(id: string): ItemData | null {
    return ITEMS[id] ?? null
}

/** Multiplicateur de Ball (1 par défaut si inconnu / non-Ball). */
export function ballBonusOf(itemId: string): number {
    const it = ITEMS[itemId]
    return it?.category === "BALL" ? (it.ballBonus ?? 1) : 1
}

/** Ball à capture garantie (Master-Éclair) ? */
export function isGuaranteedBall(itemId: string): boolean {
    return getItem(itemId)?.guaranteed === true
}
