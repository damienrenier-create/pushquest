// src/lib/gamebook/yellow/data/platineLedger.ts
//
// PALIER PLATINE — REGISTRE DES HAUTS FAITS D'UN PARCOURS. On retient, pour CHAQUE chimère croisée (les tiennes
// comme celles des salles), son PLUS GROS COUP : combien, avec quelle attaque, contre qui. C'est la matière du
// GÉNÉRIQUE affiché au sacre comme à la défaite — « qui a frappé le plus fort, des deux côtés ».
//
// MODULE PUR et IMMUABLE : chaque enregistrement renvoie un nouveau registre (pas de mutation), donc il traverse
// sans risque un store, une sérialisation, ou un rechargement en cours de couloir.
//
// Pourquoi pas `MonInstance.bestDmg` (qui existe déjà) ? Parce qu'il est PERSISTÉ et cumulatif sur la vie du
// Daemon : il raconte toute sa carrière, pas ce parcours-ci. Ici on veut la photo d'UN couloir, adversaires
// compris — et les adversaires sont des instances éphémères qui disparaissent à la fin du combat.

/** Le plus gros coup d'une chimère sur ce parcours. */
export interface BestHit {
    /** Nom de la chimère qui a frappé. */
    name: string
    /** Nom LISIBLE de l'attaque (pas l'id) — le générique est fait pour être lu. */
    move: string
    /** Dégâts infligés. */
    damage: number
    /** Nom de la cible encaissée, pour raconter la scène (« … sur Voltombre »). */
    target: string
    /** Salle où ça s'est produit (« ACE », un pseudo…). Vide hors couloir. */
    room: string
}

export type LedgerSide = "mine" | "foes"

/** Le registre d'un parcours : les meilleurs coups de CHAQUE camp, indexés par nom de chimère. */
export interface PlatineLedger {
    mine: Record<string, BestHit>
    foes: Record<string, BestHit>
}

export function emptyLedger(): PlatineLedger {
    return { mine: {}, foes: {} }
}

/** Enregistre un coup. Ne garde que le PLUS GROS par chimère : un coup plus faible est ignoré, un coup égal ne
 *  remplace pas (le premier tenant reste, pour que le récit soit stable si on rejoue la même séquence).
 *  Les coups à 0 (ou négatifs) ne comptent pas : rater n'est pas un haut fait. */
export function recordHit(
    ledger: PlatineLedger,
    side: LedgerSide,
    hit: BestHit,
): PlatineLedger {
    if (!hit.name || hit.damage <= 0) return ledger
    const cur = ledger[side][hit.name]
    if (cur && cur.damage >= hit.damage) return ledger
    return { ...ledger, [side]: { ...ledger[side], [hit.name]: { ...hit } } }
}

/** Les plus gros coups d'un camp, du plus fort au plus faible. Départage déterministe par nom, pour que deux
 *  coups identiques n'inversent pas l'ordre d'un affichage à l'autre. */
export function topHits(ledger: PlatineLedger, side: LedgerSide, limit = 6): BestHit[] {
    return Object.values(ledger[side])
        .sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name))
        .slice(0, Math.max(0, limit))
}

/** LE coup du parcours, tous camps confondus — la ligne d'accroche du générique. null si personne n'a frappé. */
export function bestHitOverall(ledger: PlatineLedger): (BestHit & { side: LedgerSide }) | null {
    const mine = topHits(ledger, "mine", 1)[0]
    const foes = topHits(ledger, "foes", 1)[0]
    if (!mine && !foes) return null
    if (!foes) return { ...mine, side: "mine" }
    if (!mine) return { ...foes, side: "foes" }
    // Égalité : le joueur passe devant — c'est SON générique.
    return mine.damage >= foes.damage ? { ...mine, side: "mine" } : { ...foes, side: "foes" }
}

/** Total encaissé / infligé sur le parcours (somme des meilleurs coups) — un chiffre pour la ligne de résumé. */
export function ledgerTotals(ledger: PlatineLedger): { mine: number; foes: number } {
    const sum = (side: LedgerSide) => Object.values(ledger[side]).reduce((t, h) => t + h.damage, 0)
    return { mine: sum("mine"), foes: sum("foes") }
}
