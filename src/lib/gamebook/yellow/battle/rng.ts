// src/lib/gamebook/yellow/battle/rng.ts
//
// Nexus Jaune Éclair — RNG déterministe (Mulberry32) pour le moteur de combat.
// Seedable → combats rejouables/testables. Toute la part aléatoire du combat
// (critiques, facteur dégâts, précision, effets secondaires, IA) passe par ici.

export class Rng {
    private s: number

    constructor(seed: number) {
        this.s = seed >>> 0
    }

    /** Flottant [0, 1). */
    next(): number {
        this.s = (this.s + 0x6d2b79f5) >>> 0
        let t = this.s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    /** Entier dans [min, max] inclus. */
    int(min: number, max: number): number {
        return min + Math.floor(this.next() * (max - min + 1))
    }

    /** True avec une probabilité pct/100 (pct: 0..100). */
    chance(pct: number): boolean {
        if (pct >= 100) return true
        if (pct <= 0) return false
        return this.next() * 100 < pct
    }

    /** Choisit un élément au hasard. */
    pick<T>(arr: readonly T[]): T {
        return arr[Math.floor(this.next() * arr.length)]
    }

    /** Facteur aléatoire de dégâts Pokémon : 0.85..1.00 (par pas de 1/100). */
    damageFactor(): number {
        return this.int(85, 100) / 100
    }
}

/** Seed "raisonnablement unique" sans Date.now (compatible SSR/tests). */
export function makeSeed(...parts: number[]): number {
    let h = 0x811c9dc5
    for (const p of parts) {
        h ^= p >>> 0
        h = Math.imul(h, 0x01000193)
    }
    return h >>> 0
}
