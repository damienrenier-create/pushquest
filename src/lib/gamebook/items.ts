// src/lib/gamebook/items.ts
//
// v3.8 — Catalogue extensible des items achetables au shop de Pépiteville.
//
// Pour ajouter un nouvel item en v3.9+ :
//   1. Ajoute une entrée dans ITEMS ci-dessous
//   2. Si nouvelle capability (équiper, consommer, etc.) → étend ItemCapabilities
//   3. Si nouvelle action côté inventory/use, étend le handler dans la route API
//
// Aucune dépendance Prisma ou React. Lib pure réutilisable côté serveur ET client.

export interface ItemCapabilities {
    /** Item qui peut stocker de l'énergie (gourde). */
    canStore?: {
        maxCapacity: number
        unit: "reps"
    }
    /** Item équipable (futurs baskets). Hors v3.8. */
    canEquip?: boolean
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
        description: "Stocke jusqu'à 100 reps. Bois pour récupérer toute l'énergie stockée d'un trait.",
        priceReps: 100,
        maxQuantity: 1,
        capabilities: {
            canStore: { maxCapacity: 100, unit: "reps" },
        },
    },
]

export function getItem(key: string): ItemDefinition | null {
    return ITEMS.find((i) => i.key === key) ?? null
}

// ============================================================
// Helpers pour les items stockables (gourde)
// ============================================================

export interface StorableData {
    stored: number
}

export function readStored(data: unknown): number {
    if (data && typeof data === "object" && "stored" in data) {
        const v = (data as { stored: unknown }).stored
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return 0
}
