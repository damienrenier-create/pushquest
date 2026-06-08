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
    super_ball: {
        id: "super_ball", name: "Super Nexus-Ball", category: "BALL",
        description: "Meilleur taux de capture que la Nexus-Ball.", price: 100, ballBonus: 1.5,
    },
    hyper_ball: {
        id: "hyper_ball", name: "Hyper Nexus-Ball", category: "BALL",
        description: "Excellent taux de capture.", price: 300, ballBonus: 2,
    },
    master_ball: {
        id: "master_ball", name: "Master-Éclair", category: "BALL",
        description: "Capture infaillible. Rarissime.", price: 0, ballBonus: 255, guaranteed: true,
    },
    potion: {
        id: "potion", name: "Potion", category: "HEAL",
        description: "Restaure 20 PV à un Daemon.", price: 150, healHp: 20,
    },
    super_potion: {
        id: "super_potion", name: "Super Potion", category: "HEAL",
        description: "Restaure 50 PV.", price: 350, healHp: 50,
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
