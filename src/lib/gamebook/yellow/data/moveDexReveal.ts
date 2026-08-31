// src/lib/gamebook/yellow/data/moveDexReveal.ts
//
// Nexus Jaune Éclair — RÉVÉLATION PROGRESSIVE du Pokédex des attaques (glossaire des capacités).
// Une attaque n'apparaît au glossaire que lorsque le joueur a une raison de la CONNAÎTRE :
//   (a) il a CROISÉ une espèce qui l'apprend (vue OU capturée → learnset de l'espèce) ;
//   (b) il a l'OCCASION DE L'ACHETER maintenant (sa CT est dans purchasableCts) ;
//   (c) il l'a REÇUE / achetée (sa CT est dans ownedCts / boughtCts) ;
//   (d) un Daemon QU'IL POSSÈDE la connaît ou peut l'apprendre (moves actuels + learnset de son espèce).
// Module PUR (React-free) → testable. Aucun anti-spoiler ultra-secret ici : ce sont les ATTAQUES qui sont
//   gatées, pas les espèces (la liste « qui l'apprend » applique, elle, le flag du Dex Nexus côté UI).

import { SPECIES } from "./species"
import { CTS, purchasableCts, type BadgeId } from "./cts"

/** CT id → move enseigné (ex. "ct01" → "danse_lames"). Construit une fois. */
const CT_MOVE_BY_ID: Record<string, string> = {}
CTS.forEach((c) => { CT_MOVE_BY_ID[c.id] = c.moveId })

export interface MoveKnowledgeInput {
    seen: readonly string[]                                            // pokedex.seen (espèces rencontrées, à vie)
    caught: readonly string[]                                          // pokedex.caught
    ownedMons: readonly { speciesId: string; moves: readonly string[] }[] // équipe + PC
    badges: readonly BadgeId[]                                         // badges d'arène (pour purchasableCts)
    boughtCts: readonly string[]                                       // CT déjà achetées (achat unique)
    ownedCts: readonly string[]                                        // CT-cadeaux/trophées possédées
}

/** Ajoute au set toutes les attaques du learnset d'une espèce (no-op si l'espèce est inconnue). */
function addLearnset(out: Set<string>, speciesId: string): void {
    const sp = SPECIES[speciesId]
    if (!sp) return
    for (const { moveId } of sp.learnset) out.add(moveId)
}

/** Ids des attaques CONNUES du joueur = celles à afficher au Pokédex des attaques (cf. règles a-d ci-dessus). */
export function knownMoveIds(i: MoveKnowledgeInput): Set<string> {
    const out = new Set<string>()
    // (a) espèces CROISÉES (vues ou capturées) → leur learnset complet
    for (const id of i.seen) addLearnset(out, id)
    for (const id of i.caught) addLearnset(out, id)
    // (d) Daemons POSSÉDÉS : leurs attaques actuelles + le learnset de leur espèce (ce qu'ils « veulent apprendre »)
    for (const m of i.ownedMons) {
        for (const mv of m.moves) out.add(mv)
        addLearnset(out, m.speciesId)
    }
    // (b) CT ACHETABLES maintenant (selon badges + achats déjà faits)
    for (const ct of purchasableCts([...i.badges], [...i.boughtCts])) out.add(ct.moveId)
    // (c) CT POSSÉDÉES (reçues en cadeau) ou déjà achetées → l'attaque de la CT est connue
    for (const ctId of i.ownedCts) { const mv = CT_MOVE_BY_ID[ctId]; if (mv) out.add(mv) }
    for (const ctId of i.boughtCts) { const mv = CT_MOVE_BY_ID[ctId]; if (mv) out.add(mv) }
    return out
}
