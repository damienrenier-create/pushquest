// src/lib/gamebook/yellow/frontier/rewards.ts
//
// ZONE DE COMBAT — récompenses dérivées du combat (PUR & testable).
// USINE : à chaque victoire, le joueur reçoit une CT CHOISIE parmi les attaques du Daemon vaincu
// (cf. GDD). Ici on calcule les CT éligibles (celles dont l'attaque enseignée fait partie du
// moveset de l'adversaire vaincu). Le choix + l'octroi (grantCt) se font à l'intégration.

import { SPECIES } from "../data/species"
import { CTS, NGPLUS_EXCLUSIVE_CT_IDS } from "../data/cts"

/** Moveset d'un adversaire GÉNÉRÉ = 4 dernières capacités du learnset ≤ niveau (= règle de la factory). */
export function opponentMoveIds(speciesId: string, level: number): string[] {
    const s = SPECIES[speciesId] as any
    if (!s) return []
    const learned = (s.learnset as { level: number; moveId: string }[])
        .filter((l) => l.level <= level)
        .map((l) => l.moveId)
    return learned.slice(-4)
}

/** CT offertes en récompense Usine pour avoir battu ce Daemon : celles dont l'attaque enseignée
 *  figure dans le moveset du vaincu. Peut être vide (aucune de ses attaques n'a de CT). */
export function ctRewardOptions(defeatedSpeciesId: string, level: number): string[] {
    const moves = new Set(opponentMoveIds(defeatedSpeciesId, level))
    // Les CT-signatures EXCLUSIVES au run 2 ne sont JAMAIS offertes par l'Usine (garantie directe, en plus du
    // fait que leurs attaques ne figurent dans aucun learnset). Seul octroi = victoire du boss d'arène en NG+.
    return CTS.filter((ct) => moves.has(ct.moveId) && !NGPLUS_EXCLUSIVE_CT_IDS.includes(ct.id)).map((ct) => ct.id)
}

/** Idem mais sur toute une équipe vaincue (union des options, dédupliquée). */
export function ctRewardOptionsForTeam(team: { speciesId: string; level: number }[]): string[] {
    const out = new Set<string>()
    for (const m of team) for (const id of ctRewardOptions(m.speciesId, m.level)) out.add(id)
    return [...out]
}
