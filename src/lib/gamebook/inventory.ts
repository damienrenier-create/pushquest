// src/lib/gamebook/inventory.ts
//
// v3.8 — Helpers purs pour manipuler l'inventory JSON stocké dans GamebookProgress.
//
// L'inventory est une Array<InventoryEntry> sérialisée en JSONB côté DB.
// Aucun call DB ici — les routes API sont responsables de la lecture/écriture.

import { getItem, readStored } from "./items"

export interface InventoryEntry {
    itemKey: string
    quantity: number
    data?: Record<string, unknown>
}

/**
 * Normalise n'importe quoi en Inventory valide.
 * Tolère null, undefined, formats anciens, etc.
 */
export function parseInventory(raw: unknown): InventoryEntry[] {
    if (!Array.isArray(raw)) return []
    const out: InventoryEntry[] = []
    for (const item of raw) {
        if (!item || typeof item !== "object") continue
        const e = item as Record<string, unknown>
        if (typeof e.itemKey !== "string") continue
        const quantity = typeof e.quantity === "number" && Number.isFinite(e.quantity)
            ? Math.max(0, Math.floor(e.quantity))
            : 0
        if (quantity === 0) continue
        const data = e.data && typeof e.data === "object" && !Array.isArray(e.data)
            ? (e.data as Record<string, unknown>)
            : undefined
        out.push({ itemKey: e.itemKey, quantity, data })
    }
    return out
}

export function hasItem(inv: InventoryEntry[], itemKey: string): boolean {
    return inv.some((e) => e.itemKey === itemKey && e.quantity > 0)
}

export function findItem(inv: InventoryEntry[], itemKey: string): InventoryEntry | null {
    return inv.find((e) => e.itemKey === itemKey) ?? null
}

/**
 * Retourne un nouvel inventory avec l'item ajouté (en respectant maxQuantity).
 * Si l'item est déjà au max, retourne l'inventory tel quel.
 */
export function addItem(
    inv: InventoryEntry[],
    itemKey: string,
    initialData?: Record<string, unknown>
): InventoryEntry[] {
    const def = getItem(itemKey)
    if (!def) return inv

    const existing = inv.find((e) => e.itemKey === itemKey)
    if (existing) {
        if (existing.quantity >= def.maxQuantity) return inv
        return inv.map((e) =>
            e.itemKey === itemKey ? { ...e, quantity: e.quantity + 1 } : e
        )
    }

    return [...inv, { itemKey, quantity: 1, data: initialData }]
}

/**
 * Met à jour le `data` d'un item existant (ex: contenu de la gourde).
 * Aucun effet si l'item n'existe pas dans l'inventory.
 */
export function setItemData(
    inv: InventoryEntry[],
    itemKey: string,
    data: Record<string, unknown>
): InventoryEntry[] {
    return inv.map((e) =>
        e.itemKey === itemKey ? { ...e, data: { ...(e.data ?? {}), ...data } } : e
    )
}

/**
 * Helper : lit la quantité stockée d'un item storable (gourde).
 * Retourne 0 si l'item n'est pas storable ou non possédé.
 */
export function getStoredAmount(inv: InventoryEntry[], itemKey: string): number {
    const entry = findItem(inv, itemKey)
    if (!entry) return 0
    return readStored(entry.data)
}
