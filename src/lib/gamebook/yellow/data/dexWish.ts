// 🔢 VŒU « JE CHOISIS LE NUMÉRO » (Guillaume) — un pop sur commande, une fois par jour.
//
// LA RÈGLE (Sartay, 02/10/2026). À sa PREMIÈRE connexion de la journée, le joueur annonce un NUMÉRO de Pokédex :
// ce sera le 10ᵉ Daemon sauvage qui popera ce jour-là. Sept fois en tout.
//
// ⚠️ CHAQUE JOURNÉE ANNONCÉE EST CONSOMMÉE — y compris sur un numéro INTERDIT. Le génie ne refuse rien et ne
// corrige personne : il tient parole à la lettre. Numéro inexistant, LÉGENDAIRE, ou espèce absente de son run ?
// Il enverra quand même quelque chose au 10ᵉ pop… un MISSINGNO niveau 5, BST 100. Super nul, et la journée est
// passée. C'est au joueur de connaître son Pokédex : le marché énonce les trois limites, à lui de les respecter.
//
// Ce que ça change par rapport à un refus : le choix n'est plus validé « devant » lui (rien ne clignote en rouge),
// il est RÉSOLU en silence, et la sanction se découvre sur le terrain. La charge part donc à l'ANNONCE, pas à la
// livraison. S'arrêter avant le 10ᵉ pop, c'est perdre sa journée aussi : annoncer, c'est s'engager.
//
// Ce module est PUR (tout est injecté : le jour, le vivier). Les accès au jeu vivent dans gameStore / playerStore.

import { MISSINGNO_ID, MISSINGNO_LEVEL } from "./missingnoSpecies"

/** Nombre de journées « sur commande » offertes par le vœu. */
export const DEX_WISH_DEFAULT_CHARGES = 7
/** Rang du pop qui obéira au numéro annoncé. */
export const DEX_WISH_POP_INDEX = 10

export interface DexWishState {
    /** Journées encore disponibles. 0 = vœu épuisé. */
    charges: number
    /** Jour de l'annonce EN COURS (YYYY-MM-DD). "" = aucune annonce posée. */
    day: string
    /** Numéro annoncé (affichage / message). 0 = pas d'annonce en cours. */
    dex: number
    /** Espèce à faire apparaître — la vraie, ou MissingNo si le numéro était interdit. "" = rien en attente. */
    speciesId: string
    /** Niveau d'apparition, FIGÉ à l'annonce (plafond des badges pour une vraie espèce, 5 pour la punition). */
    level: number
    /** Pops sauvages comptés depuis l'annonce. */
    pops: number
}

export function freshDexWish(charges: number = DEX_WISH_DEFAULT_CHARGES): DexWishState {
    return { charges: Math.max(0, Math.floor(charges)), day: "", dex: 0, speciesId: "", level: 0, pops: 0 }
}

/** Le vœu a-t-il encore des journées devant lui ? */
export function dexWishActive(st: DexWishState | null | undefined): boolean {
    return !!st && st.charges > 0
}

/** Peut-il annoncer un numéro MAINTENANT ? (une seule annonce par jour, et seulement s'il reste des charges) */
export function canAnnounceToday(st: DexWishState | null | undefined, today: string): boolean {
    return dexWishActive(st) && st!.day !== today
}

/** Issue d'une annonce. `dud` = numéro interdit → le génie enverra MissingNo. `why` sert aux tests et au journal,
 *  JAMAIS à l'écran : la sanction se découvre au 10ᵉ pop, pas au moment de l'annonce. */
export type DexOutcome = {
    speciesId: string
    dexNo: number
    name: string
    dud: boolean
    why?: "inconnu" | "legendaire" | "hors_run"
}

/** Résout un numéro annoncé — sans jamais REFUSER. `candidates` = toutes les espèces du Pokédex ;
 *  `spawnable` = celles qui apparaissent vraiment dans SON run. Tout écart donne MissingNo. */
export function resolveDexChoice(
    dex: unknown,
    candidates: readonly { id: string; dexNo: number; name: string; rarity: string }[],
    spawnable: ReadonlySet<string>,
): DexOutcome {
    const dud = (dexNo: number, why: DexOutcome["why"]): DexOutcome =>
        ({ speciesId: MISSINGNO_ID, dexNo, name: "MissingNo.", dud: true, why })

    const n = Math.floor(Number(dex))
    if (!Number.isFinite(n) || n <= 0) return dud(Number.isFinite(n) ? n : 0, "inconnu")
    const sp = candidates.find((c) => c.dexNo === n)
    if (!sp) return dud(n, "inconnu")
    if (sp.rarity === "LEGENDARY") return dud(n, "legendaire")
    if (!spawnable.has(sp.id)) return dud(n, "hors_run")
    return { speciesId: sp.id, dexNo: n, name: sp.name, dud: false }
}

/** Enregistre l'annonce du jour et CONSOMME la journée (règle Sartay : annoncer, c'est s'engager).
 *  `wildLevel` = niveau d'apparition d'une vraie espèce (plafond des badges) ; ignoré pour la punition, qui
 *  sort toujours au niveau 5. */
export function announceDex(st: DexWishState, today: string, outcome: DexOutcome, wildLevel: number): DexWishState {
    return {
        ...st,
        charges: Math.max(0, st.charges - 1),
        day: today,
        dex: outcome.dexNo,
        speciesId: outcome.speciesId,
        level: outcome.dud ? MISSINGNO_LEVEL : Math.max(2, Math.min(100, Math.floor(wildLevel))),
        pops: 0,
    }
}

/** Compte un pop sauvage et dit s'il faut ARMER la rencontre forcée maintenant.
 *
 *  `slotFree` = le canal de rencontre forcée est-il libre ? (un autre vœu peut l'occuper → on patiente et on
 *  retente au pop suivant ; la journée est DÉJÀ payée, retenter ne coûte donc rien).
 *
 *  On arme au pop n°(DEX_WISH_POP_INDEX − 1), car la rencontre forcée est consommée par le pop SUIVANT. */
export function countPopForDexWish(
    st: DexWishState,
    today: string,
    slotFree: boolean,
): { state: DexWishState; arm?: { speciesId: string; level: number } } {
    if (!dexWishActive(st) && !st.speciesId) return { state: st } // épuisé ET rien en attente → plus rien à faire
    // Changement de jour : l'annonce de la veille est périmée (journée déjà débitée, elle ne se reporte pas).
    if (st.day !== today) return { state: { ...st, dex: 0, speciesId: "", level: 0, pops: 0 } }
    if (!st.speciesId) return { state: { ...st, pops: st.pops + 1 } } // pas d'annonce en cours : on compte, c'est tout

    const pops = st.pops + 1
    if (pops < DEX_WISH_POP_INDEX - 1) return { state: { ...st, pops } }
    if (!slotFree) return { state: { ...st, pops: DEX_WISH_POP_INDEX - 2 } } // canal occupé : on reste au seuil
    return {
        state: { ...st, pops, dex: 0, speciesId: "", level: 0 },
        arm: { speciesId: st.speciesId, level: st.level },
    }
}

/** Message d'annonce. Volontairement IDENTIQUE pour une vraie espèce et pour la punition : le génie accepte,
 *  point. Il ne nomme pas l'espèce — sinon la sanction serait éventée avant même la chasse. */
export function dexAnnounceMessage(dexNo: number, chargesLeft: number): string {
    return `« Le numéro ${dexNo} ? C'est noté. Le ${DEX_WISH_POP_INDEX}ᵉ Daemon sauvage que tu croiseras aujourd'hui sera à toi. »`
        + ` — ${chargesLeft} journée${chargesLeft > 1 ? "s" : ""} restante${chargesLeft > 1 ? "s" : ""}.`
}
