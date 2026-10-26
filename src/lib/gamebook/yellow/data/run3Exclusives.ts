// src/lib/gamebook/yellow/data/run3Exclusives.ts
//
// RUN 3 (concours) — les INÉDITS : lignées obtenables en run 3 mais dans AUCUN des runs 1-2. Calculé depuis les
// données (pools RUN3_ZONES, pêche, obtentions spéciales `runs`, clôture d'évolution), jamais en dur → une nouvelle
// espèce run-3 apparaît toute seule (le test exige alors un indice « où/comment » ci-dessous).
// Affiché sur TOUS les panneaux lus pendant le run 3 + le carrousel d'arène (Sartay 26/10/2026 : « mettre sur les
// différents panneaux le nom des Pokémon uniques du run 3, comme ça le joueur sait comment il a intérêt à faire sa team »).

import { runObtainableSpecies } from "./encounters"
import { getSpecies } from "./species"

/** Où/comment obtenir chaque LIGNÉE inédite (clé = espèce de BASE de la lignée). */
export const RUN3_EXCLUSIVE_HINTS: Record<string, string> = {
    elefer: "starter du concours — sinon chez l'Éleveur de la plaine",
    cornaive: "starter du concours — sinon chez l'Éleveur de la plaine",
    coccipoing: "starter du concours — sinon chez l'Éleveur de la plaine",
    otama: "sauvage à la Maison Hantée",
    gekosmic: "mini-boss de la Centrale (bats-le ou capture-le)",
    magnetor: "Magmator niv 50 + Noyau de Métal (boutique Jetons de Combat)",
    onirail: "à la canne à pêche, dans l'eau de Cendreville",
    flamarokto: "légendaire des Hautes Herbes de Cendreville",
    marmoterre: "le Dénicheur de la Route Nord, contre un Ruffiant",
}

export interface Run3ExclusiveRow { key: string; ids: string[]; names: string; types: string; hint: string }
let cache: Run3ExclusiveRow[] | null = null

/** Lignées inédites du run 3 (base → … → finale), triées par n° de dex. Mémorisé (données immuables). */
export function run3ExclusiveRows(): Run3ExclusiveRow[] {
    if (cache) return cache
    const r3 = runObtainableSpecies(3, false), r1 = runObtainableSpecies(1, false), r2 = runObtainableSpecies(2, false)
    const excl = new Set([...r3].filter((id) => !r1.has(id) && !r2.has(id)))
    const evolved = new Set<string>()
    for (const id of excl) { const to = getSpecies(id)?.evolution?.toId; if (to && excl.has(to)) evolved.add(to) }
    const bases = [...excl].filter((id) => !evolved.has(id)).sort((a, b) => (getSpecies(a)?.dexNo ?? 0) - (getSpecies(b)?.dexNo ?? 0))
    cache = bases.map((b) => {
        const ids = [b]
        let cur = getSpecies(b)
        while (cur?.evolution?.toId && excl.has(cur.evolution.toId)) { ids.push(cur.evolution.toId); cur = getSpecies(cur.evolution.toId) }
        const fin = getSpecies(ids[ids.length - 1])
        return { key: b, ids, names: ids.map((i) => getSpecies(i)?.name ?? i).join(" → "), types: (fin?.types ?? []).join("/"), hint: RUN3_EXCLUSIVE_HINTS[b] ?? "introuvable ailleurs" }
    })
    return cache
}

/** Bulles ajoutées à CHAQUE panneau lu pendant le run 3 (une lignée par bulle). */
export function run3ExclusiveSignLines(): string[] {
    return [
        "🏆 INÉDITS DU CONCOURS — ces Daemons n'existent QU'EN RUN 3. Pense ton équipe autour d'eux !",
        ...run3ExclusiveRows().map((r) => `• ${r.names} (${r.types}) — ${r.hint}.`),
    ]
}
