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

export type HeldItemCategory = "type" | "soin" | "combat" | "signature"

export interface HeldItemData {
    id: string
    name: string
    emoji: string
    description: string
    jcPrice: number
    category: HeldItemCategory
    /** Verrou ESPÈCE (signature) : l'effet ne s'applique QUE si le porteur est de ce speciesId. */
    species?: string
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
}

// Objet de TYPE : +10 % aux dégâts d'un type. Famille des 15 types existants.
function typeItem(id: string, name: string, emoji: string, type: PokeType, price = 18): HeldItemData {
    return { id, name, emoji, description: `Augmente de 10 % la puissance des attaques ${type}.`, jcPrice: price, category: "type", typeBoost: type, typeBoostPct: 10 }
}

// Objet SIGNATURE : verrouillé à une espèce. statMult +20 % (sauf Regnantaur 10/10).
function sig(id: string, name: string, emoji: string, species: string, statMult: Partial<Record<StatKey, number>>, description: string, price = 24): HeldItemData {
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
    restes: { id: "restes", name: "Restes", emoji: "🍖", description: "Restaure 1/16 des PV max du porteur à la fin de chaque tour.", jcPrice: 30, category: "soin", leftoversFrac: 16 },
    grelot_coque: { id: "grelot_coque", name: "Grelot Coque", emoji: "🐚", description: "Restaure des PV équivalents à 1/8 des dégâts infligés.", jcPrice: 25, category: "soin", drainDealtFrac: 8 },
    bandeau: { id: "bandeau", name: "Bandeau", emoji: "🎽", description: "10 % de chance de survivre à 1 PV à un coup qui devait l'achever (depuis PV pleins).", jcPrice: 22, category: "combat", survive1hpPct: 10 },
    lentilscope: { id: "lentilscope", name: "Lentilscope", emoji: "🔍", description: "Augmente d'un cran le taux de coups critiques du porteur.", jcPrice: 28, category: "combat", critStage: 1 },
    vive_griffe: { id: "vive_griffe", name: "Vive Griffe", emoji: "⚡", description: "20 % de chance d'attaquer en premier (à priorité égale).", jcPrice: 20, category: "combat", quickClawPct: 20 },
    roche_royale: { id: "roche_royale", name: "Roche Royale", emoji: "👑", description: "10 % de chance d'apeurer la cible avec une attaque offensive.", jcPrice: 22, category: "combat", flinchPct: 10 },
    poudre_claire: { id: "poudre_claire", name: "Poudre Claire", emoji: "✨", description: "Baisse de 10 % la précision des attaques qui ciblent le porteur.", jcPrice: 28, category: "combat", incomingAccMult: 0.9 },
    encens_doux: { id: "encens_doux", name: "Encens Doux", emoji: "🌫️", description: "Baisse de 5 % la précision des attaques qui ciblent le porteur.", jcPrice: 12, category: "combat", incomingAccMult: 0.95 },
    herbe_blanche: { id: "herbe_blanche", name: "Herbe Blanche", emoji: "🌿", description: "Annule la prochaine baisse de stat subie, puis se consomme.", jcPrice: 12, category: "combat", negateStatDrop: true },
    oeuf_chance: { id: "oeuf_chance", name: "Œuf Chance", emoji: "🥚", description: "Fait gagner 50 % d'XP en plus au porteur.", jcPrice: 25, category: "combat", expMult: 1.5 },

    // ───────── Objets SIGNATURE (verrouillés à l'espèce) ─────────
    coquille_tony: { id: "coquille_tony", name: "Coquille Tony", emoji: "🥚", description: "Réduit de 20 % les dégâts physiques subis. Réservé à Tonytony.", jcPrice: 28, category: "signature", species: "tonytony", physDmgTakenMult: 0.8 },
    carapace_necro: sig("carapace_necro", "Carapace Nécro", "🛡️", "necrolopendre", { def: 1.2 }, "Augmente de 20 % la Défense. Réservé à Nécrolopendre."),
    sablier_ancien: sig("sablier_ancien", "Sablier Ancien", "⏳", "torturoche", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Tortoracle."),
    galet_poli: sig("galet_poli", "Galet Poli", "🪨", "rochison", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Rochison."),
    linceul_spectral: sig("linceul_spectral", "Linceul Spectral", "🕸️", "archibouh", { def: 1.2 }, "Augmente de 20 % la Défense. Réservé à Archibouh."),
    couronne_reine: sig("couronne_reine", "Couronne de la Reine", "👑", "regnantaur", { atk: 1.1, spc: 1.1 }, "Augmente de 10 % l'Attaque ET l'Attaque Spé. Réservé à Regnantaur.", 26),
    lanterne_ame: sig("lanterne_ame", "Lanterne d'Âme", "🏮", "brookhante", { spc: 1.2 }, "Augmente de 20 % l'Attaque Spé. Réservé à Brookhanté.", 22),
    carillon_foudre: sig("carillon_foudre", "Carillon Foudre", "🔔", "namizeus", { spc: 1.2 }, "Augmente de 20 % l'Attaque Spé. Réservé à Namizeus.", 22),
    serre_royale: sig("serre_royale", "Serre Royale", "🦅", "aquilothan", { atk: 1.2 }, "Augmente de 20 % l'Attaque. Réservé à Aquilothan.", 22),
    poing_fantome: sig("poing_fantome", "Poing Fantôme", "👊", "bouhbou", { spe: 1.2 }, "Augmente de 20 % la Vitesse. Réservé à Bouhbou."),
}

/** Liste ordonnée (boutique). */
export const HELD_ITEM_LIST: HeldItemData[] = Object.values(HELD_ITEMS)

export function getHeldItem(id?: string): HeldItemData | undefined {
    return id ? HELD_ITEMS[id] : undefined
}

/** L'objet est-il un objet tenu connu ? */
export function isHeldItem(id?: string): boolean {
    return !!id && id in HELD_ITEMS
}

/** L'effet de l'objet s'applique-t-il à ce Daemon ? (respecte le verrou espèce signature). */
function applies(it: HeldItemData, speciesId: string | undefined): boolean {
    return !it.species || it.species === speciesId
}

type MonRef = { speciesId?: string; heldItem?: string }

/** Multiplicateurs de stat de l'objet tenu (lus par fullStats). {} si aucun. */
export function heldStatMult(inst: MonRef): Partial<Record<StatKey, number>> {
    const it = getHeldItem(inst.heldItem)
    if (!it?.statMult || !applies(it, inst.speciesId)) return {}
    return it.statMult
}

/** Multiplicateur de dégâts SORTANTS (boost de type), 1 si aucun. */
export function heldOutgoingDmgMult(inst: MonRef, moveType: PokeType): number {
    const it = getHeldItem(inst.heldItem)
    if (it?.typeBoost && it.typeBoost === moveType && applies(it, inst.speciesId)) return 1 + (it.typeBoostPct ?? 10) / 100
    return 1
}

/** Multiplicateur de dégâts ENTRANTS (Coquille Tony −20 % physique), 1 si aucun. */
export function heldIncomingDmgMult(inst: MonRef, isPhysical: boolean): number {
    const it = getHeldItem(inst.heldItem)
    if (isPhysical && it?.physDmgTakenMult !== undefined && applies(it, inst.speciesId)) return it.physDmgTakenMult
    return 1
}

/** L'objet tenu ACTIF du Daemon (verrou d'espèce respecté), ou undefined. Pour les hooks de combat
 *  qui lisent un champ d'effet (leftoversFrac, drainDealtFrac, critStage, flinchPct, expMult…). */
export function heldEffect(inst: MonRef): HeldItemData | undefined {
    const it = getHeldItem(inst.heldItem)
    return it && applies(it, inst.speciesId) ? it : undefined
}
