// src/lib/gamebook/inventory.ts
//
// v3.8 — Helpers purs pour manipuler l'inventory JSON stocké dans GamebookProgress.
//
// L'inventory est une Array<InventoryEntry> sérialisée en JSONB côté DB.
// Aucun call DB ici — les routes API sont responsables de la lecture/écriture.

import { getItem, readStored, readMaxCapacity, readDurability, isBrokenItem, getInitialItemData } from "./items"

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
 * Si l'item est déjà au max ET pas cassé, retourne l'inventory tel quel.
 *
 * v3.8.1 — Si l'item existant est cassé (maxCapacity=0 / durability=0),
 * il est REMPLACÉ par une nouvelle instance avec data initial frais.
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
        // v3.8.1 — si l'item existant est cassé, on le remplace par une instance neuve
        if (isBrokenItem(existing.data, def)) {
            return inv.map((e) =>
                e.itemKey === itemKey
                    ? { ...e, quantity: 1, data: initialData ?? getInitialItemData(def) }
                    : e
            )
        }
        // Sinon, on respecte la maxQuantity et on n'ajoute rien si on est au plafond
        if (existing.quantity >= def.maxQuantity) return inv
        return inv.map((e) =>
            e.itemKey === itemKey ? { ...e, quantity: e.quantity + 1 } : e
        )
    }

    return [...inv, { itemKey, quantity: 1, data: initialData ?? getInitialItemData(def) }]
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

/**
 * v3.8.1 — Lit la capacité max actuelle d'un item storable (peut décroître).
 */
export function getMaxCapacity(inv: InventoryEntry[], itemKey: string): number {
    const entry = findItem(inv, itemKey)
    if (!entry) return 0
    const def = getItem(itemKey)
    if (!def) return 0
    return readMaxCapacity(entry.data, def)
}

/**
 * v3.8.1 — Lit la durabilité actuelle d'un item wearable (baskets).
 */
export function getDurability(inv: InventoryEntry[], itemKey: string): number {
    const entry = findItem(inv, itemKey)
    if (!entry) return 0
    const def = getItem(itemKey)
    if (!def) return 0
    return readDurability(entry.data, def)
}

/**
 * v3.8.1 — true si l'item est possédé ET cassé.
 * Distinct de hasItem qui retourne true même pour un item cassé.
 */
export function hasIntactItem(inv: InventoryEntry[], itemKey: string): boolean {
    const entry = findItem(inv, itemKey)
    if (!entry || entry.quantity <= 0) return false
    const def = getItem(itemKey)
    if (!def) return false
    return !isBrokenItem(entry.data, def)
}

/**
 * v3.8.1 — Décrémente la durabilité d'un wearable. Retourne le nouvel inventory.
 * Si durability arrive à 0, le data reste là (item cassé, pas supprimé — pour qu'on
 * puisse afficher "Cassée" et autoriser le rachat).
 */
export function wearItem(inv: InventoryEntry[], itemKey: string, amount: number = 1): InventoryEntry[] {
    const def = getItem(itemKey)
    if (!def) return inv
    // v3.17d — supporte aussi les items canCosmetic avec initialDurability (lunettes)
    const hasWearCap = !!def.capabilities.canWear
    const hasCosmeticDur = def.capabilities.canCosmetic?.initialDurability !== undefined
    if (!hasWearCap && !hasCosmeticDur) return inv
    return inv.map((e) => {
        if (e.itemKey !== itemKey) return e
        let current: number
        const data = e.data
        if (data && typeof data === "object" && "durability" in data) {
            const v = (data as { durability: unknown }).durability
            current = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
        } else if (hasWearCap) {
            current = def.capabilities.canWear?.initialDurability ?? 0
        } else {
            current = def.capabilities.canCosmetic?.initialDurability ?? 0
        }
        const next = Math.max(0, current - amount)
        return { ...e, data: { ...(e.data ?? {}), durability: next } }
    })
}
