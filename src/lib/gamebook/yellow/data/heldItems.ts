// src/lib/gamebook/yellow/data/heldItems.ts
//
// Nexus Jaune Éclair — OBJETS TENUS (held items). 1 par Daemon, achetés en JETONS DE COMBAT (JC)
// chez le marchand de la Zone de Combat. Le moteur gère déjà toutes les mécaniques (crit, esquive,
// priorité, flinch, fin-de-tour, drain) → ces objets ne font que s'y brancher. Aucune stat n'est
// touchée hors de ce module : les effets sont décrits ici en données et lus par stats/engine.
//
// Effets PASSIFS (branchés) : statMult (→ fullStats), typeBoost (→ dégâts), physDmgTakenMult (→ dégâts).
// Effets de COMBAT (branchés au moteur) : leftoversFrac, drainDealtFrac, survive1hpPct, critStage,
// quickClawPct, flinchPct, incomingAccMult, negateStatDrop, expMult.

import type { PokeType, StatKey } from "../battle/types"
import { getSpecies } from "./species"

export type HeldItemCategory = "type" | "soin" | "combat" | "signature" | "baie"

export interface HeldItemData {
    id: string
    name: string
    emoji: string
    description: string
    jcPrice: number
    category: HeldItemCategory
    /** Verrou ESPÈCE (signature) : l'effet ne s'applique QUE si le porteur est de ce speciesId (ou de l'un des
     *  speciesId si tableau — utile quand une lignée gagne un stade final, ex. Aquilothan→Aquilord). */
    species?: string | string[]
    // ── Effets passifs ──
    /** +typeBoostPct % de dégâts des attaques de ce type. */
    typeBoost?: PokeType
    typeBoostPct?: number
    /** Multiplie les stats finales du porteur (fullStats), ex. { spe: 1.2 }. */
    statMult?: Partial<Record<StatKey, number>>
    /** Dégâts PHYSIQUES subis ×N (Coquille Tony = 0.8). */
    physDmgTakenMult?: number
    // ── Effets de combat (branchés au moteur) ──
    /** Soin en fin de tour = PV max / N (Restes = 16). */
    leftoversFrac?: number
    /** Soin = dégâts infligés / N (Grelot Coque = 8). */
    drainDealtFrac?: number
    /** % de survivre à 1 PV à un coup fatal depuis PV pleins (Bandeau = 10). */
    survive1hpPct?: number
    /** Crans de coup critique en plus (Lentilscope = 1). */
    critStage?: number
    /** % d'attaquer en premier à priorité égale (Vive Griffe = 20). */
    quickClawPct?: number
    /** % d'apeurer (flinch) avec une attaque offensive (Roche Royale = 10). */
    flinchPct?: number
    /** Précision des attaques ADVERSES qui ciblent le porteur ×N (Poudre Claire 0.9 / Encens 0.95). */
    incomingAccMult?: number
    /** Annule la prochaine baisse de stat subie, puis se consomme (Herbe Blanche). */
    negateStatDrop?: boolean
    /** Multiplie l'XP gagnée par le porteur (Œuf Chance = 1.5). */
    expMult?: number
    // ── BAIES : objets tenus RÉACTIFS & CONSOMMABLES (se retirent au déclenchement, mon.heldItem = undefined) ──
    /** Baie de soin : à PV < ⅓, restaure cette fraction des PV max (ex. 0.30). */
    berryHealFrac?: number
    /** Baies fougue/éclat/vive/roc : à PV < ¼, +1 cran de cette stat (stat modifiable en combat). */
    berryBoostStat?: "atk" | "def" | "spe" | "spc"
    /** Baie pure : soigne tout statut majeur dès qu'il est infligé. */
    berryCureStatus?: boolean
    /** Baie phénix : survit à 1 PV au lieu de tomber K.O. (une seule fois). */
    berryRevive?: boolean
}

// Objet de TYPE : +10 % aux dégâts d'un type. Famille des 15 types existants.
function typeItem(id: string, name: string, emoji: string, type: PokeType, price = 90): HeldItemData {
    return { id, name, emoji, description: `Augmente de 10 % la puissance des attaques ${type}.`, jcPrice: price, category: "type", typeBoost: type, typeBoostPct: 10 }
}

// Objet SIGNATURE : verrouillé à une espèce. statMult +20 % (sauf Regnantaur 10/10).
function sig(id: string, name: string, emoji: string, species: string | string[], statMult: Partial<Record<StatKey, number>>, description: string, price = 120): HeldItemData {
    return { id, name, emoji, description, jcPrice: price, category: "signature", species, statMult }
}

export const HELD_ITEMS: Record<string, HeldItemData> = {
    // ───────── Objets de TYPE (+10 %) ─────────
    mouchoir_soie: typeItem("mouchoir_soie", "Mouchoir Soie", "🧣", "NORMAL"),
    charbon: typeItem("charbon", "Charbon", "🪨", "FEU"),
    eau_mystique: typeItem("eau_mystique", "Eau Mystique", "💧", "EAU"),
    grain_miracle: typeItem("grain_miracle", "Grain Miracle", "🌱", "PLANTE"),
    aimant: typeItem("aimant", "Aimant", "🧲", "ELEC"),
    glaceternel: typeItem("glaceternel", "Glacéternel", "🧊", "GLACE"),
    ceinture_noire: typeItem("ceinture_noire", "Ceinture Noire", "🥋", "COMBAT"),
    pic_venin: typeItem("pic_venin", "Pic Venin", "☠️", "POISON"),
    sable_doux: typeItem("sable_doux", "Sable Doux", "🏜️", "SOL"),
    bec_pointu: typeItem("bec_pointu", "Bec Pointu", "🦅", "VOL"),
    cuillere_tordue: typeItem("cuillere_tordue", "Cuillère Tordue", "🥄", "PSY"),
    poudre_argentee: typeItem("poudre_argentee", "Poudre Argentée", "🐛", "INSECTE"),
    pierre_dure: typeItem("pierre_dure", "Pierre Dure", "🪨", "ROCHE"),
    rune_sort: typeItem("rune_sort", "Rune Sort", "👻", "SPECTRE"),
    croc_dragon: typeItem("croc_dragon", "Croc Dragon", "🐉", "DRAGON"),

    // ───────── Génériques — soin / combat ─────────
    restes: { id: "restes", name: "Restes", emoji: "🍖", description: "Restaure 1/16 des PV max du porteur à la fin de chaque tour.", jcPrice: 150, category: "soin", leftoversFrac: 16 },
    grelot_coque: { id: "grelot_coque", name: "Grelot Coque", emoji: "🐚", description: "Restaure des PV équivalents à 1/8 des dégâts infligés.", jcPrice: 125, category: "soin", drainDealtFrac: 8 },
    bandeau: { id: "bandeau", name: "Bandeau", emoji: "🎽", description: "10 % de chance de survivre à 1 PV à un coup qui devait l'achever (depuis PV pleins).", jcPrice: 110, category: "combat", survive1hpPct: 10 },
    lentilscope: { id: "lentilscope", name: "Lentilscope", emoji: "🔍", description: "Augmente d'un cran le taux de coups critiques du porteur.", jcPrice: 140, category: "combat", critStage: 1 },
    vive_griffe: { id: "vive_griffe", name: "Vive Griffe", emoji: "⚡", description: "20 % de chance d'attaquer en premier (à priorité égale).", jcPrice: 100, category: "combat", quickClawPct: 20 },
    roche_royale: { id: "roche_royale", name: "Roche Royale", emoji: "👑", description: "10 % de chance d'apeurer la cible avec une attaque offensive.", jcPrice: 110, category: "combat", flinchPct: 10 },
    poudre_claire: { id: "poudre_claire", name: "Poudre Claire", emoji: "✨", description: "Baisse de 10 % la précision des attaques qui ciblent le porteur.", jcPrice: 140, category: "combat", incomingAccMult: 0.9 },
    encens_doux: { id: "encens_doux", name: "Encens Doux", emoji: "🌫️", description: "Baisse de 5 % la précision des attaques qui ciblent le porteur.", jcPrice: 60, category: "combat", incomingAccMult: 0.95 },
    herbe_blanche: { id: "herbe_blanche", name: "Herbe Blanche", emoji: "🌿", description: "Annule la prochaine baisse de stat subie, puis se consomme.", jcPrice: 60, category: "combat", negateStatDrop: true },
    oeuf_chance: { id: "oeuf_chance", name: "Œuf Chance", emoji: "🥚", description: "Fait gagner 50 % d'XP en plus au porteur.", jcPrice: 125, category: "combat", expMult: 1.5 },

    // ───────── Objets SIGNATURE (verrouillés à l'espèce) ─────────
    coquille_tony: { id: "coquille_tony", name: "Coquille Tony", emoji: "🥚", description: "Réduit de 20 % les dégâts physiques subis. Réservé à Tonytony.", jcPrice: 140, category: "signature", species: "tonytony", physDmgTakenMult: 0.8 },
    carapace_necro: sig("carapace_necro", "Carapace Nécro", "🛡️", "necrolopendre", { def: 1.2 }, "Augmente de 20 % la Défense. Réservé à Nécrolopendre."),
    sablier_ancien: sig("sablier_ancien", "Sablier Ancien", "⏳", "torturoche", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Tortoracle."),
    galet_poli: sig("galet_poli", "Galet Poli", "🪨", "rochison", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Rochison."),
    linceul_spectral: sig("linceul_spectral", "Linceul Spectral", "🕸️", "archibouh", { def: 1.2 }, "Augmente de 20 % la Défense. Réservé à Archibouh."),
    couronne_reine: sig("couronne_reine", "Couronne de la Reine", "👑", "regnantaur", { atk: 1.1, spc: 1.1 }, "Augmente de 10 % l'Attaque ET l'Attaque Spé. Réservé à Regnantaur.", 26),
    lanterne_ame: sig("lanterne_ame", "Lanterne d'Âme", "🏮", "brookhante", { spc: 1.2 }, "Augmente de 20 % l'Attaque Spé. Réservé à Brookhanté.", 22),
    carillon_foudre: sig("carillon_foudre", "Carillon Foudre", "🔔", "namizeus", { spc: 1.2 }, "Augmente de 20 % l'Attaque Spé. Réservé à Namizeus.", 22),
    serre_royale: sig("serre_royale", "Serre Royale", "🦅", ["aquilothan", "aquilord"], { atk: 1.2 }, "Augmente de 20 % l'Attaque. Réservé à la lignée Aquilothan/Aquilord.", 22),
    poing_fantome: sig("poing_fantome", "Poing Fantôme", "👊", "bouhbou", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Bouhbou."),

    // ───────── BAIES (objets tenus RÉACTIFS & consommables — RÉCOLTÉES sur les arbres post-Ligue, PAS en boutique) ─────────
    baie_soin: { id: "baie_soin", name: "Baie de Soin", emoji: "🍒", description: "Quand le Daemon tombe sous ⅓ de ses PV, restaure 30 % des PV max. Consommée.", jcPrice: 0, category: "baie", berryHealFrac: 0.30 },
    baie_pure: { id: "baie_pure", name: "Baie Pure", emoji: "🫧", description: "Soigne automatiquement tout statut majeur (paralysie/sommeil/gel/brûlure/poison) dès qu'il est infligé. Consommée.", jcPrice: 0, category: "baie", berryCureStatus: true },
    baie_fougue: { id: "baie_fougue", name: "Baie Fougue", emoji: "🔴", description: "Sous ¼ de PV, augmente l'Attaque d'un cran. Consommée.", jcPrice: 0, category: "baie", berryBoostStat: "atk" },
    baie_eclat: { id: "baie_eclat", name: "Baie Éclat", emoji: "🔵", description: "Sous ¼ de PV, augmente l'Attaque Spé d'un cran. Consommée.", jcPrice: 0, category: "baie", berryBoostStat: "spc" },
    baie_vive: { id: "baie_vive", name: "Baie Vive", emoji: "🟢", description: "Sous ¼ de PV, augmente la Vitesse d'un cran. Consommée.", jcPrice: 0, category: "baie", berryBoostStat: "spe" },
    baie_roc: { id: "baie_roc", name: "Baie Roc", emoji: "🟡", description: "Sous ¼ de PV, augmente la Défense d'un cran. Consommée.", jcPrice: 0, category: "baie", berryBoostStat: "def" },
    baie_phenix: { id: "baie_phenix", name: "Baie Phénix", emoji: "🔥", description: "Une fois : survit à 1 PV au lieu de tomber K.O. Consommée.", jcPrice: 0, category: "baie", berryRevive: true },
}

/** IDs des 7 baies (récompenses d'arbres). */
export const BERRY_IDS = ["baie_soin", "baie_pure", "baie_fougue", "baie_eclat", "baie_vive", "baie_roc", "baie_phenix"] as const

/** Liste ordonnée (boutique en JC). Les BAIES en sont exclues (récoltées sur les arbres, pas vendues). */
export const HELD_ITEM_LIST: HeldItemData[] = Object.values(HELD_ITEMS).filter((i) => i.category !== "baie")

export function getHeldItem(id?: string): HeldItemData | undefined {
    return id ? HELD_ITEMS[id] : undefined
}

/** L'objet est-il un objet tenu connu ? */
export function isHeldItem(id?: string): boolean {
    return !!id && id in HELD_ITEMS
}

/** L'effet de l'objet s'applique-t-il à ce Daemon ? (respecte le verrou espèce signature). */
function applies(it: HeldItemData, speciesId: string | undefined): boolean {
    if (!it.species) return true
    const lock = Array.isArray(it.species) ? it.species : [it.species]
    if (speciesId && lock.includes(speciesId)) return true
    // FUSION : le verrou d'espèce s'applique AUSSI si l'un des PARENTS de la fusion correspond → un objet signature
    //   profite à la fusion qui contient son espèce (ex. Coquille Tonytony sur Cryotony/Mérotony). Les vraies espèces
    //   n'ont pas de `fusionParents` → aucun effet de bord.
    const parents = speciesId ? getSpecies(speciesId)?.fusionParents : undefined
    return !!parents && (lock.includes(parents[0]) || lock.includes(parents[1]))
}

type MonRef = { speciesId?: string; heldItem?: string; heldItem2?: string }

/** Les objets tenus ACTIFS d'un Daemon (verrou d'espèce respecté). 1 pour un Daemon normal ; jusqu'à 2 pour un
 *  FUSIONNÉ (heldItem + heldItem2 hérités des 2 parents). L'ordre est [slot1, slot2]. */
function activeHeldItems(inst: MonRef): HeldItemData[] {
    const out: HeldItemData[] = []
    for (const id of [inst.heldItem, inst.heldItem2]) {
        const it = getHeldItem(id)
        if (it && applies(it, inst.speciesId)) out.push(it)
    }
    return out
}

/** Multiplicateurs de stat des objets tenus (lus par fullStats). {} si aucun. Combine les 2 objets d'un fusionné
 *  (produit par stat). Byte-identique pour un Daemon normal (1 seul objet). */
export function heldStatMult(inst: MonRef): Partial<Record<StatKey, number>> {
    const out: Partial<Record<StatKey, number>> = {}
    for (const it of activeHeldItems(inst)) {
        if (!it.statMult) continue
        for (const [k, v] of Object.entries(it.statMult)) out[k as StatKey] = (out[k as StatKey] ?? 1) * (v as number)
    }
    return out
}

/** Multiplicateur de dégâts SORTANTS (boost de type), 1 si aucun. Produit des 2 objets d'un fusionné. */
export function heldOutgoingDmgMult(inst: MonRef, moveType: PokeType): number {
    let mult = 1
    for (const it of activeHeldItems(inst)) {
        if (it.typeBoost && it.typeBoost === moveType) mult *= 1 + (it.typeBoostPct ?? 10) / 100
    }
    return mult
}

/** Multiplicateur de dégâts ENTRANTS (Coquille Tony −20 % physique), 1 si aucun. Produit des 2 objets d'un fusionné. */
export function heldIncomingDmgMult(inst: MonRef, isPhysical: boolean): number {
    let mult = 1
    if (isPhysical) for (const it of activeHeldItems(inst)) {
        if (it.physDmgTakenMult !== undefined) mult *= it.physDmgTakenMult
    }
    return mult
}

/** Combine les EFFETS PASSIFS de 2 objets tenus (fusionné) en un item synthétique. Base = le 1er objet (garde id/nom).
 *  ⚠️ Les effets CONSOMMABLES (champs BAIE + `negateStatDrop`) NE sont PAS combinés : ils restent ceux du slot 1 (via
 *  `...a`), car le moteur les consomme via `mon.heldItem` (slot 1). Un consommable hérité en slot 2 est donc inerte
 *  (comme une baie) — sinon il ne serait jamais consommé (immunité permanente). Additifs : critStage sommé ; leftovers/
 *  drain HARMONIQUES (soin = max/a + max/b) ; expMult/incomingAcc multipliés ; le reste (quickClaw/survie/flinch) au max. */
function mergeHeldEffects(a: HeldItemData, b: HeldItemData): HeldItemData {
    const harmonic = (x?: number, y?: number) => (!x ? y : !y ? x : 1 / (1 / x + 1 / y))
    const maxOpt = (x?: number, y?: number) => (x == null ? y : y == null ? x : Math.max(x, y))
    const prodOpt = (x?: number, y?: number) => (x == null && y == null ? undefined : (x ?? 1) * (y ?? 1))
    return {
        ...a, // garde id/nom/emoji + champs CONSOMMABLES du slot 1 (baies, negateStatDrop) + typeBoost/statMult/physDmg (lus par les autres helpers)
        leftoversFrac: harmonic(a.leftoversFrac, b.leftoversFrac),
        drainDealtFrac: harmonic(a.drainDealtFrac, b.drainDealtFrac),
        critStage: ((a.critStage ?? 0) + (b.critStage ?? 0)) || undefined,
        quickClawPct: maxOpt(a.quickClawPct, b.quickClawPct),
        survive1hpPct: maxOpt(a.survive1hpPct, b.survive1hpPct),
        flinchPct: maxOpt(a.flinchPct, b.flinchPct),
        incomingAccMult: prodOpt(a.incomingAccMult, b.incomingAccMult),
        expMult: prodOpt(a.expMult, b.expMult),
    }
}

/** L'objet tenu ACTIF du Daemon (verrou d'espèce respecté), ou — pour un FUSIONNÉ à 2 objets — un item SYNTHÉTIQUE
 *  combinant leurs effets passifs. Pour les hooks de combat (leftoversFrac, drainDealtFrac, critStage, flinchPct,
 *  expMult…). Byte-identique pour un Daemon normal (renvoie son unique objet). */
export function heldEffect(inst: MonRef): HeldItemData | undefined {
    const items = activeHeldItems(inst)
    if (items.length <= 1) return items[0]
    return mergeHeldEffects(items[0], items[1])
}
