// src/lib/gamebook/yellow/data/genieAmbush.ts
//
// ARC LAMPE & GÉNIE — composition de l'équipe ANTI-NÉMÉSIS du colporteur. Pour CHAQUE Daemon du joueur, une
// « proie » d'un type que le Daemon du joueur CONTRE (super-efficace ×2) → le joueur a l'avantage de type sur
// chaque duel (combat personnalisé, gagnable, mais pas du random faible). Proies = espèces BASIQUES capturables
// (pas de légendaire/caché, BST modeste). Le NIVEAU (via speciesAtLevel) est appliqué par l'appelant (gameStore).

import { SPECIES } from "./species"
import { typeMultiplier } from "../battle/typeChart"
import type { PokeType } from "../battle/types"

let _pool: Map<PokeType, string[]> | null = null
/** Espèces « proies » (basiques, capturables, BST modeste, non cachées) indexées par TYPE PRINCIPAL. Paresseux. */
function preyPool(): Map<PokeType, string[]> {
    if (_pool) return _pool
    const m = new Map<PokeType, string[]>()
    for (const sp of Object.values(SPECIES) as Array<{ id: string; types?: string[]; sprite?: string; hiddenUntilCaught?: boolean; baseStats?: Record<string, number> }>) {
        if (sp.hiddenUntilCaught || !sp.sprite || !sp.types?.length) continue
        const b = sp.baseStats
        const bst = b ? (b.hp + b.atk + b.def + b.spe + b.spc) : 999
        if (bst > 420) continue // reste modeste (souches / mi-évolutions) → colporteur pas menaçant
        const t = sp.types[0] as PokeType
        if (!m.has(t)) m.set(t, [])
        m.get(t)!.push(sp.id)
    }
    _pool = m
    return m
}

/** Une espèce proie d'un type que `playerTypes` CONTRE (super-efficace ×2), ou null. `rng` pour varier le tirage. */
export function antiNemesisFor(playerTypes: readonly string[], rng: () => number): string | null {
    const pool = preyPool()
    for (const pt of playerTypes) {
        const targets = [...pool.keys()].filter((d) => typeMultiplier(pt as PokeType, d) >= 2 && (pool.get(d)?.length ?? 0) > 0)
        if (targets.length) {
            const d = targets[Math.floor(rng() * targets.length)]
            const list = pool.get(d)!
            return list[Math.floor(rng() * list.length)]
        }
    }
    return null
}
