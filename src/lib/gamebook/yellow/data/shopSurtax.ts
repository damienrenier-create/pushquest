// src/lib/gamebook/yellow/data/shopSurtax.ts
//
// 🧾 CONTRÔLE FISCAL DU NEXUS — une SURTAXE personnelle et temporaire sur tout ce que vend la boutique (objets,
// Fusio-Ball, Super Pasta, Capsules CT). Posée par le créateur via le canal pendingEffects (GenieEffect
// `shop_surtax` : amount = multiplicateur, hours = durée), persistée dans la save, expire d'elle-même.
// Première cible (20/10/2026) : Jacanon, après ses 48 612 ⚡ soutirés aux boss du poker — « le croupier a parlé ».
// Module PUR : aucun accès au store.

export interface ShopSurtaxState { until: number; mult: number }

export const SHOP_SURTAX_DEFAULT_MULT = 2
export const SHOP_SURTAX_DEFAULT_HOURS = 24 * 7

/** Nouvel état : `mult` × les prix jusqu'à `now + hours`. Multiplicateur borné [1,10], durée bornée [1 h, 1 an]. */
export function freshShopSurtax(now: number, mult = SHOP_SURTAX_DEFAULT_MULT, hours = SHOP_SURTAX_DEFAULT_HOURS): ShopSurtaxState {
    const m = Math.max(1, Math.min(10, Number(mult) || SHOP_SURTAX_DEFAULT_MULT))
    const h = Math.max(1, Math.min(24 * 365, Number(hours) || SHOP_SURTAX_DEFAULT_HOURS))
    return { until: now + h * 3600_000, mult: m }
}

/** Surtaxe en vigueur à `now` ? */
export function shopSurtaxActive(s: ShopSurtaxState | undefined, now: number): boolean {
    return !!s && s.mult > 1 && s.until > now
}

/** Multiplicateur à appliquer aux prix (1 = rien). */
export function shopSurtaxMult(s: ShopSurtaxState | undefined, now: number): number {
    return shopSurtaxActive(s, now) ? s!.mult : 1
}

/** Prix surtaxé (arrondi, jamais sous le prix de base). */
export function surtaxedPrice(price: number, s: ShopSurtaxState | undefined, now: number): number {
    const p = Math.max(0, Math.floor(price))
    return Math.max(p, Math.round(p * shopSurtaxMult(s, now)))
}

/** Lecture défensive d'un état brut (save). */
export function parseShopSurtax(raw: unknown): ShopSurtaxState | undefined {
    if (!raw || typeof raw !== "object") return undefined
    const o = raw as Record<string, unknown>
    const until = Number(o.until) || 0, mult = Number(o.mult) || 0
    return until > 0 && mult > 1 ? { until, mult: Math.min(10, mult) } : undefined
}
