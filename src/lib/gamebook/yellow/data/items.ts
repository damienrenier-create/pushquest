// src/lib/gamebook/yellow/data/items.ts
//
// Nexus Jaune Éclair — objets : Balls (capture) + soins. Data-driven.
// L'achat/coût se paie en ÉNERGIE PushQuest (reps) → couche meta (hors moteur).

export type ItemCategory = "BALL" | "HEAL" | "STATUS_HEAL" | "MISC"

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
}

export const ITEMS: Record<string, ItemData> = {
    poke_ball: {
        id: "poke_ball", name: "Nexus-Ball", category: "BALL",
        description: "Ball standard pour capturer un Daemon affaibli.", price: 100, ballBonus: 1,
    },
    super_ball: {
        id: "super_ball", name: "Super Nexus-Ball", category: "BALL",
        description: "Meilleur taux de capture que la Nexus-Ball.", price: 300, ballBonus: 1.5,
    },
    hyper_ball: {
        id: "hyper_ball", name: "Hyper Nexus-Ball", category: "BALL",
        description: "Excellent taux de capture.", price: 800, ballBonus: 2,
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
