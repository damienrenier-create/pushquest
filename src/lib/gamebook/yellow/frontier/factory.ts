// src/lib/gamebook/yellow/frontier/factory.ts
//
// ZONE DE COMBAT — USINE : logique de DRAFT de location, PURE & déterministe.
// Le joueur ne joue pas son équipe : il choisit 3 Daemons dans un POOL prêté, généré
// ÉQUILIBRÉ (aucune faiblesse de type partagée par >2 membres → pas de pool injouable).
// Récompense par victoire = une CT choisie parmi les attaques du Daemon vaincu (cf. recompense).
// Aucune dépendance save/UI : tout est testable.

import { Rng } from "../battle/rng"
import { SPECIES } from "../data/species"
import { formsAtLevel, bstOf, weakTypesOf, bstBandForStreak, DEFAULT_TEAM_SIZE, type OpponentSpec } from "./engine"

export const DEFAULT_POOL_SIZE = 6        // 6 Daemons proposés, on en garde 3
export const MAX_SHARED_WEAKNESS = 2      // ≤ 2 membres peuvent partager une même faiblesse de type

export interface RentalCandidate { speciesId: string; level: number }

interface PoolOpts { streak: number; level: number; poolSize?: number }

/** Génère un POOL de location équilibré : `poolSize` espèces distinctes, au bon stade pour le niveau,
 *  sans qu'aucun type ne soit une faiblesse (×2+) pour plus de MAX_SHARED_WEAKNESS membres. Déterministe. */
export function generateRentalPool(rng: Rng, opts: PoolOpts): RentalCandidate[] {
    const poolSize = opts.poolSize ?? DEFAULT_POOL_SIZE
    const level = opts.level
    const [lo, hi] = bstBandForStreak(opts.streak)

    // Candidats : formes au niveau visé, hors `exclusive`, dans une bande BST élargie (l'Usine veut de la variété).
    const eligible = formsAtLevel(level).filter((id) => {
        const s = SPECIES[id] as any
        if (!s || s.exclusive) return false
        const b = bstOf(id)
        return b >= lo - 80 && b <= hi + 80
    })

    // MULTI-ESSAIS : on tente plusieurs ordres seedés et on retourne le 1er pool PLEIN qui respecte
    // le plafond de faiblesse partagée (≤ MAX_SHARED_WEAKNESS). Un seul ordre greedy peut échouer
    // (cul-de-sac), alors qu'un autre passe → quasi toujours satisfait avec un pool de candidats correct.
    const TRIES = 24
    let fallbackOrder: string[] | null = null
    for (let k = 0; k < TRIES; k++) {
        const order = shuffle(rng, eligible)
        if (!fallbackOrder) fallbackOrder = order
        const chosen: string[] = []
        const weakCount: Record<string, number> = {}
        for (const id of order) {
            if (chosen.length >= poolSize) break
            const w = weakTypesOf(id)
            if (w.some((t) => (weakCount[t] ?? 0) >= MAX_SHARED_WEAKNESS)) continue
            chosen.push(id)
            for (const t of w) weakCount[t] = (weakCount[t] ?? 0) + 1
        }
        if (chosen.length >= poolSize) return chosen.map((speciesId) => ({ speciesId, level }))
    }
    // Filet ultime (pool de candidats trop pauvre) : on remplit sans contrainte d'équilibre.
    const order = fallbackOrder ?? shuffle(rng, eligible)
    return order.slice(0, poolSize).map((speciesId) => ({ speciesId, level }))
}

function shuffle<T>(rng: Rng, arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
        const j = rng.int(0, i)
        ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

/** Valide une sélection de draft : `size` espèces DISTINCTES, toutes issues du pool. */
export function isValidDraft(pool: RentalCandidate[], picks: string[], size = DEFAULT_TEAM_SIZE): boolean {
    if (picks.length !== size) return false
    if (new Set(picks).size !== size) return false
    const ids = new Set(pool.map((c) => c.speciesId))
    return picks.every((p) => ids.has(p))
}

/** Construit l'équipe draftée (specs de combat) à partir des choix du joueur. */
export function buildDraftTeam(pool: RentalCandidate[], picks: string[]): OpponentSpec[] {
    return picks
        .map((id) => pool.find((c) => c.speciesId === id))
        .filter((c): c is RentalCandidate => !!c)
        .map((c) => ({ speciesId: c.speciesId, level: c.level }))
}
