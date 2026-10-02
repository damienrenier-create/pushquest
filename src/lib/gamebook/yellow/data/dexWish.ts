// 🔢 VŒU « JE CHOISIS LE NUMÉRO » (Guillaume) — un pop sur commande, une fois par jour.
//
// LA RÈGLE (Sartay, 02/10/2026). À sa PREMIÈRE connexion de la journée, le joueur annonce un NUMÉRO de Pokédex :
// ce sera le 10ᵉ Daemon sauvage qui popera ce jour-là. Sept fois en tout.
//
// Trois bornes, non négociables :
//   • seules les espèces qui peuvent VRAIMENT apparaître dans son run sont acceptées (runSpawnableSpecies) ;
//   • aucun LÉGENDAIRE (rarity "LEGENDARY") ;
//   • un numéro refusé ne coûte RIEN — il annonce autre chose, la journée n'est pas perdue.
//
// La charge n'est consommée QUE lorsque le Daemon est réellement ARMÉ (après le 9ᵉ pop : la rencontre forcée est
// consommée par le pop SUIVANT, donc armer à 9 fait sortir le choix au 10ᵉ). S'arrêter à 4 pops ne coûte donc rien,
// et si le canal de rencontre forcée est déjà occupé par un autre vœu, on patiente au lieu de brûler la charge.
// Même philosophie que les shiny éphémères de Task1 : une charge se paie en résultat, pas en intention.
//
// Ce module est PUR (tout est injecté : le jour, le vivier). Les accès au jeu vivent dans gameStore / playerStore.

/** Nombre de journées « sur commande » offertes par le vœu. */
export const DEX_WISH_DEFAULT_CHARGES = 7
/** Rang du pop qui obéira au numéro annoncé. */
export const DEX_WISH_POP_INDEX = 10

export interface DexWishState {
    /** Journées encore disponibles. 0 = vœu épuisé. */
    charges: number
    /** Jour du choix EN COURS (YYYY-MM-DD). "" = aucun choix posé. */
    day: string
    /** Numéro de Pokédex annoncé (affichage / message). 0 = pas de choix en cours. */
    dex: number
    /** Espèce résolue depuis le numéro, au moment du choix. "" = pas de choix en cours. */
    speciesId: string
    /** Pops sauvages comptés depuis le choix. */
    pops: number
}

export function freshDexWish(charges: number = DEX_WISH_DEFAULT_CHARGES): DexWishState {
    return { charges: Math.max(0, Math.floor(charges)), day: "", dex: 0, speciesId: "", pops: 0 }
}

/** Le vœu a-t-il encore des journées devant lui ? */
export function dexWishActive(st: DexWishState | null | undefined): boolean {
    return !!st && st.charges > 0
}

/** Peut-il annoncer un numéro MAINTENANT ? (une seule annonce par jour, et seulement s'il reste des charges) */
export function canAnnounceToday(st: DexWishState | null | undefined, today: string): boolean {
    return dexWishActive(st) && st!.day !== today
}

export type DexChoice =
    | { ok: true; speciesId: string; dexNo: number; name: string }
    | { ok: false; reason: string }

/** Valide un numéro annoncé. `candidates` = toutes les espèces connues ; `spawnable` = celles qui peuvent
 *  apparaître dans SON run. Tout refus est expliqué, et ne coûte aucune charge (le joueur retente). */
export function validateDexChoice(
    dex: unknown,
    candidates: readonly { id: string; dexNo: number; name: string; rarity: string }[],
    spawnable: ReadonlySet<string>,
): DexChoice {
    const n = Math.floor(Number(dex))
    if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "Ce n'est pas un numéro de Pokédex." }
    const sp = candidates.find((c) => c.dexNo === n)
    if (!sp) return { ok: false, reason: `Aucun Daemon ne porte le numéro ${n}.` }
    if (sp.rarity === "LEGENDARY") return { ok: false, reason: `${sp.name} est un LÉGENDAIRE — ceux-là ne se commandent pas.` }
    if (!spawnable.has(sp.id)) return { ok: false, reason: `${sp.name} n'apparaît pas à l'état sauvage dans ton run.` }
    return { ok: true, speciesId: sp.id, dexNo: n, name: sp.name }
}

/** Enregistre l'annonce du jour (après validation). Ne touche PAS aux charges : elles se paient à l'arrivée. */
export function announceDex(st: DexWishState, today: string, choice: { speciesId: string; dexNo: number }): DexWishState {
    return { ...st, day: today, dex: choice.dexNo, speciesId: choice.speciesId, pops: 0 }
}

/** Compte un pop sauvage et dit s'il faut ARMER la rencontre forcée maintenant.
 *
 *  `slotFree` = le canal de rencontre forcée est-il libre ? (un autre vœu peut l'occuper → on patiente, sans
 *  consommer la charge : le prochain pop réessaiera).
 *
 *  On arme au pop n°(DEX_WISH_POP_INDEX − 1), car la rencontre forcée est consommée par le pop SUIVANT. */
export function countPopForDexWish(
    st: DexWishState,
    today: string,
    slotFree: boolean,
): { state: DexWishState; armSpeciesId?: string } {
    if (!dexWishActive(st)) return { state: st }
    // Changement de jour : l'annonce de la veille est périmée, le compteur repart à zéro.
    if (st.day !== today) return { state: { ...st, day: st.day, dex: 0, speciesId: "", pops: 0 } }
    if (!st.speciesId) return { state: { ...st, pops: st.pops + 1 } } // aucune annonce en cours : on compte, c'est tout

    const pops = st.pops + 1
    if (pops < DEX_WISH_POP_INDEX - 1) return { state: { ...st, pops } }
    if (!slotFree) return { state: { ...st, pops: DEX_WISH_POP_INDEX - 2 } } // canal occupé : on reste au seuil et on retentera
    return {
        state: { ...st, pops, dex: 0, speciesId: "", charges: Math.max(0, st.charges - 1) },
        armSpeciesId: st.speciesId,
    }
}

/** Message d'annonce, au moment où le joueur a choisi. */
export function dexAnnounceMessage(name: string, dexNo: number, chargesLeft: number): string {
    return `« ${name} (n°${dexNo}) ? Soit. Il sera le ${DEX_WISH_POP_INDEX}ᵉ Daemon sauvage que tu croiseras aujourd'hui. »`
        + ` — ${chargesLeft} journée${chargesLeft > 1 ? "s" : ""} encore à ta disposition.`
}
