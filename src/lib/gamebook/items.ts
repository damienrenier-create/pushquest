// src/lib/gamebook/items.ts
//
// v3.8 — Catalogue extensible des items achetables au shop de Pépiteville.
// v3.8.1 — Ajout boots (baskets) avec capability canWear (durabilité + réduction COST_MOVE)
//        + flask qui s'use (-10 maxCapacity par drink)
//
// Pour ajouter un nouvel item :
//   1. Ajoute une entrée dans ITEMS ci-dessous
//   2. Définis ses capabilities (canStore, canWear, etc.)
//   3. Initial data via getInitialItemData()
//   4. Si action spécifique → étends le switch dans /api/gamebook/inventory/use
//
// Aucune dépendance Prisma ou React. Lib pure réutilisable côté serveur ET client.

export interface ItemCapabilities {
    /** Item qui peut stocker de l'énergie (gourde). */
    canStore?: {
        /** Capacité initiale à l'achat (peut décroître à l'usage). */
        maxCapacity: number
        unit: "reps"
        /** v3.8.1 — combien de maxCapacity perdue par boire. */
        wearOnDrink?: number
    }
    /** Item équipable qui modifie une mécanique (baskets réduisent COST_MOVE). */
    canWear?: {
        /** Durabilité initiale à l'achat (nombre d'usages avant cassure). */
        initialDurability: number
        /** Combien de reps économisés par case (10 - moveCostReduction). */
        moveCostReduction: number
    }
    /** v3.8.3 — Item consultable qui ouvre une vue côté UI (ne se consomme pas, infinie). */
    canView?: {
        /** Identifiant du modal à ouvrir côté client. */
        kind: "playerMap"
    }
    /** v3.13 — Item consommable instantané. Une utilisation = l'item disparaît du sac. */
    canConsume?: {
        /** Effet à l'utilisation côté serveur. */
        effect: "doubleEnergy" | "fillFlask"
    }
    /** v3.13 — Item cosmétique visible sur le sprite du joueur. Pas de consommation. */
    canCosmetic?: {
        /** Slot d'équipement (pour ne pas en porter deux du même type). */
        slot: "head" | "face" | "body"
    }
}

export interface ItemDefinition {
    key: string
    name: string
    description: string
    emoji: string
    priceReps: number
    /** Quantité maximale qu'un joueur peut posséder. 1 = item unique. */
    maxQuantity: number
    capabilities: ItemCapabilities
}

export const ITEMS: ItemDefinition[] = [
    {
        key: "flask",
        name: "Gourde",
        emoji: "🧴",
        description: "Stocke jusqu'à 100 reps. Bois pour récupérer toute l'énergie d'un trait. Elle s'use de 10 à chaque gorgée.",
        priceReps: 50,
        maxQuantity: 1,
        capabilities: {
            canStore: { maxCapacity: 100, unit: "reps", wearOnDrink: 10 },
        },
    },
    {
        key: "boots",
        name: "Baskets",
        emoji: "👟",
        description: "Réduit le coût de déplacement de 10 à 8 reps par case. S'usent au fil des pas.",
        priceReps: 200,
        maxQuantity: 1,
        capabilities: {
            canWear: { initialDurability: 250, moveCostReduction: 2 },
        },
    },
    {
        key: "map",
        name: "Carte des Joueurs",
        emoji: "🗺️",
        description: "Affiche en temps quasi-réel la position de tous les joueurs. Offerte par PEPITO avec le sac.",
        priceReps: 0,  // non achetable — donnée par PEPITO en bonus au sac
        maxQuantity: 1,
        capabilities: {
            canView: { kind: "playerMap" },
        },
    },
    {
        key: "swim_set",
        name: "Set de Nage",
        emoji: "🏊",
        description: "Maillot et palmes hérités de la grand-mère de JOJO. Indispensable pour traverser les eaux du sud.",
        priceReps: 0,  // non achetable — donné par JOJO après PIAFFINI sauvé
        maxQuantity: 1,
        capabilities: {},  // pas de capability propre — l'item est juste un "gate" vérifié dans les check waterShallow (v3.12)
    },
    // v3.13 — Items vendus par TRENETTE (frère de NUTRIPATES) à Macaron'île
    {
        key: "corned_pates",
        name: "Corned Pâtes",
        emoji: "🥫",
        description: "Conserve de pâtes énergétique. Double instantanément ton énergie disponible. Disparaît à l'usage.",
        priceReps: 80,
        maxQuantity: 1,  // 1 à la fois (rachat après consommation)
        capabilities: {
            canConsume: { effect: "doubleEnergy" },
        },
    },
    {
        key: "lunettes",
        name: "Lunettes",
        emoji: "🕶️",
        description: "Lunettes stylées. Cosmétique. Tout le monde verra que tu en portes.",
        priceReps: 50,
        maxQuantity: 1,
        capabilities: {
            canCosmetic: { slot: "face" },
        },
    },
]

export function getItem(key: string): ItemDefinition | null {
    return ITEMS.find((i) => i.key === key) ?? null
}

// ============================================================
// Helpers pour les items stockables (gourde)
// ============================================================

export function readStored(data: unknown): number {
    if (data && typeof data === "object" && "stored" in data) {
        const v = (data as { stored: unknown }).stored
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return 0
}

/**
 * v3.8.1 — Capacité max actuelle (peut décroître avec l'usage).
 * Fallback sur la capacité initiale de la définition si data ne la contient pas (vieilles gourdes).
 */
export function readMaxCapacity(data: unknown, def: ItemDefinition): number {
    if (data && typeof data === "object" && "maxCapacity" in data) {
        const v = (data as { maxCapacity: unknown }).maxCapacity
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return def.capabilities.canStore?.maxCapacity ?? 0
}

// ============================================================
// Helpers pour les items équipables (baskets)
// ============================================================

/**
 * v3.8.1 — Durabilité actuelle d'un wearable.
 * Fallback sur la durabilité initiale de la définition si data ne la contient pas.
 */
export function readDurability(data: unknown, def: ItemDefinition): number {
    if (data && typeof data === "object" && "durability" in data) {
        const v = (data as { durability: unknown }).durability
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return def.capabilities.canWear?.initialDurability ?? 0
}

/**
 * v3.8.1 — Renvoie le data initial à associer à un item nouvellement acheté.
 */
export function getInitialItemData(def: ItemDefinition): Record<string, unknown> | undefined {
    if (def.capabilities.canStore) {
        return { stored: 0, maxCapacity: def.capabilities.canStore.maxCapacity }
    }
    if (def.capabilities.canWear) {
        return { durability: def.capabilities.canWear.initialDurability }
    }
    return undefined
}

/**
 * v3.8.1 — Renvoie true si l'item est cassé / inutilisable.
 *   - flask : maxCapacity ≤ 0
 *   - boots : durability ≤ 0
 */
export function isBrokenItem(data: unknown, def: ItemDefinition): boolean {
    if (def.capabilities.canStore) {
        return readMaxCapacity(data, def) <= 0
    }
    if (def.capabilities.canWear) {
        return readDurability(data, def) <= 0
    }
    return false
}
