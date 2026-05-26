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
// v3.23o — Limite max d'entries par "poche" (fonctionnels OU usés). Si l'ajout
// dépasserait la limite, on refuse silencieusement (le serveur retourne ok=false côté shop).
export const POCKET_MAX_ITEMS_SERVER = 15

export function addItem(
    inv: InventoryEntry[],
    itemKey: string,
    initialData?: Record<string, unknown>
): InventoryEntry[] {
    const def = getItem(itemKey)
    if (!def) return inv

    // v3.23o — Refus si la poche "EN COURS" (items non-cassés) est pleine ET qu'on essaye
    // d'ajouter un NOUVEL item (pas d'incrément). Les items cassés ne comptent pas dans cette poche.
    const existing = inv.find((e) => e.itemKey === itemKey)
    if (!existing) {
        const workingCount = inv.filter((e) => {
            const d = getItem(e.itemKey)
            return d ? !isBrokenItem(e.data, d) : false
        }).length
        if (workingCount >= POCKET_MAX_ITEMS_SERVER) {
            // Poche pleine : ne pas ajouter le nouvel item
            return inv
        }
    }
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
 * v3.23i — Retire `amount` unités d'un item de l'inventory.
 * Si quantity tombe à 0, l'entry est supprimée.
 * Si l'item n'existe pas, no-op.
 */
export function removeItem(inv: InventoryEntry[], itemKey: string, amount: number = 1): InventoryEntry[] {
    return inv.flatMap((e) => {
        if (e.itemKey !== itemKey) return [e]
        const newQuantity = Math.max(0, e.quantity - amount)
        if (newQuantity === 0) return []
        return [{ ...e, quantity: newQuantity }]
    })
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
    // v3.24a-3 — Étendu : canBypassRoad (casquette flic) et canWater (arrosoir) ont aussi une durabilité
    const hasWearCap = !!def.capabilities.canWear
    const hasCosmeticDur = def.capabilities.canCosmetic?.initialDurability !== undefined
    const hasBypassRoad = !!def.capabilities.canBypassRoad
    const hasWater = !!def.capabilities.canWater
    if (!hasWearCap && !hasCosmeticDur && !hasBypassRoad && !hasWater) return inv

    // v3.20 — Amulette du Monstre : chaque wear a une chance d'être préservé (skip).
    // Cherche un canPreserve actif dans l'inventaire (item non cassé).
    let skipChance = 0
    for (const e of inv) {
        const otherDef = getItem(e.itemKey)
        const preserve = otherDef?.capabilities.canPreserve
        if (!preserve) continue
        // Item amulette n'a pas de durabilité tracked actuellement → toujours actif
        // Si on en ajoute une à l'avenir, on pourra check isBrokenItem ici.
        skipChance = Math.max(skipChance, preserve.wearSkipChance)
    }
    if (skipChance > 0 && Math.random() < skipChance) {
        // Wear préservé : on ne décrémente rien
        return inv
    }

    return inv.map((e) => {
        if (e.itemKey !== itemKey) return e
        let current: number
        const data = e.data
        if (data && typeof data === "object" && "durability" in data) {
            const v = (data as { durability: unknown }).durability
            current = typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0
        } else if (hasWearCap) {
            current = def.capabilities.canWear?.initialDurability ?? 0
        } else if (hasCosmeticDur) {
            current = def.capabilities.canCosmetic?.initialDurability ?? 0
        } else if (hasBypassRoad) {
            current = def.capabilities.canBypassRoad?.initialDurability ?? 0
        } else if (hasWater) {
            current = def.capabilities.canWater?.initialDurability ?? 0
        } else {
            current = 0
        }
        const next = Math.max(0, current - amount)
        return { ...e, data: { ...(e.data ?? {}), durability: next } }
    })
}
