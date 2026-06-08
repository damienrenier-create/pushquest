// src/lib/gamebook/yellow/data/ace.ts
//
// Nexus Jaune Éclair — ACE, le RIVAL parfait (1 défaite/jour). React-free, pur, testable.
//
// MODÈLE (par joueur) :
//   • Équipe FIXE de 5 : 3 panthères (slot 3 = FEU) + lignée Nouillon (Psy) + lignée Feu.
//   • Slot 6 ADAPTATIF : tiré d'une BOX de contres = la faiblesse parfaite de TON dernier Daemon.
//   • Niveau des fixes = max(pic mémorisé, ton meilleur + 2) → ne RÉGRESSE jamais ;
//     il ratchete à CHAQUE défaite. Le contre s'aligne sur ton dernier Daemon (mémoire box).
// L'IA "ace" + le budget d'énergie (1,5× tes reps) sont gérés au moteur/store.

import { getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import type { PokeType } from "../battle/types"

export const ACE_TRAINER_ID = "y_ace"
export const ACE_ENERGY_MULT = 1.5
export const MAX_LEVEL = 100

// Emplacement sur la VILLE (yellow_entrance) : ACE se tient en (0,16) et interpelle
// le joueur dès qu'il marche sur la bande (0,17)/(0,18)/(0,19).
export const ACE_POS = { x: 0, y: 16 }
export const ACE_TRIGGER_TILES: { x: number; y: number }[] = [
    { x: 0, y: 17 }, { x: 0, y: 18 }, { x: 0, y: 19 },
]

export const ACE_INTRO_LINES = [
    "*Un type nonchalant te barre la route, mains dans les poches.*",
    "Tiens, encore toi. Paraît que tu montes… Moi c'est ACE.",
    "Je reviens chaque jour plus fort. Voyons si tu tiens le rythme !",
]
export const ACE_DONE_LINES = [
    "*ACE époussette sa veste.*",
    "Tu m'as déjà battu aujourd'hui. Je file m'entraîner…",
    "Reviens demain : je serai plus fort. Promis.",
]
export const ACE_NO_TEAM_LINES = [
    "*ACE hausse un sourcil.*",
    "Aucun Daemon en état de combattre ? Reviens quand tu seras prêt.",
]

export interface AceMon { speciesId: string; level: number }

// === ÉQUIPE FIXE (5 slots) ===
// Slot 3 = la panthère de FEU (Pyropanthe). Nouillon & la lignée Feu évoluent avec le niveau.
export const ACE_PANTHERS = ["ombrapanthe", "voltapanthe", "pyropanthe"] // 1,2,3 (3 = feu)
export const ACE_NOUILLON_BASE = "nouillon"   // → vermisaint → divinpate
export const ACE_FIRE_BASE = "braisille"      // → flamkure → pyrokoss
export const ACE_LEVEL_OFFSET = 2

// === BOX de 10 contres (un bon attaquant par type clé) ===
// Le slot 6 = celui qui frappe le plus fort le DERNIER Daemon du joueur (faiblesse parfaite).
export const ACE_BOX = [
    "razmaree", "gloutanoir", "maitrezenc", "rochison", "auroraur",
    "zappeureal", "draconarque", "regnantaur", "magmator", "mycedruide",
]

/** Niveau-cible des slots fixes : max(pic, meilleur du joueur + 2). Ne régresse jamais. */
export function aceTargetLevel(acePeak: number, playerBestLevel: number): number {
    return Math.min(MAX_LEVEL, Math.max(1, acePeak, playerBestLevel + ACE_LEVEL_OFFSET))
}

/** Meilleur contre de la box face aux types du dernier Daemon joueur. */
export function bestCounter(playerLastTypes: PokeType[]): string {
    let best = ACE_BOX[0], bestEff = -1
    for (const id of ACE_BOX) {
        const sp = getSpecies(id)
        if (!sp) continue
        const eff = Math.max(...sp.types.map((t) => typeEffectiveness(t, playerLastTypes)))
        if (eff > bestEff) { bestEff = eff; best = id }
    }
    return best
}

/** Espèce au bon STADE d'évolution pour un niveau donné (suit la chaîne par niveau). */
export function speciesAtLevel(baseId: string, level: number): string {
    let id = baseId
    for (let guard = 0; guard < 5; guard++) {
        const evo = getSpecies(id)?.evolution
        const lvl = evo ? (evo.method as { level?: number }).level : undefined
        if (evo && typeof lvl === "number" && lvl <= level) id = evo.toId
        else break
    }
    return id
}

export interface AceBuildInput {
    acePeak: number              // pic de niveau mémorisé (ratchet)
    playerBestLevel: number      // meilleur Daemon du joueur
    playerLastTypes: PokeType[]  // types du DERNIER Daemon de l'équipe joueur
    playerLastLevel: number      // niveau de ce dernier Daemon
    box: Record<string, number>  // mémoire de niveau par espèce-contre
}

/**
 * Construit l'équipe ACE (6) pour un combat : 5 fixes au niveau-cible + 1 contre adaptatif.
 * Renvoie aussi l'espèce-contre choisie (pour mémoriser le niveau à la défaite).
 */
export function buildAceTeam(i: AceBuildInput): { team: AceMon[]; counterSpecies: string } {
    // Niveau FIGÉ entre deux défaites : on utilise le pic mémorisé tel quel ; il ne
    // ratchete qu'à la défaite (cf. recordAceDefeat). 1re rencontre (pic 0) → se cale sur toi.
    const L = i.acePeak > 0 ? Math.min(MAX_LEVEL, i.acePeak) : aceTargetLevel(0, i.playerBestLevel)
    const counter = bestCounter(i.playerLastTypes)
    const counterLevel = Math.min(MAX_LEVEL, Math.max(1, i.box[counter] ?? 0, i.playerLastLevel))
    const team: AceMon[] = [
        { speciesId: ACE_PANTHERS[0], level: L },
        { speciesId: ACE_PANTHERS[1], level: L },
        { speciesId: ACE_PANTHERS[2], level: L }, // panthère de feu
        { speciesId: speciesAtLevel(ACE_NOUILLON_BASE, L), level: L },
        { speciesId: speciesAtLevel(ACE_FIRE_BASE, L), level: L },
        { speciesId: counter, level: counterLevel },
    ]
    return { team, counterSpecies: counter }
}

/** Budget d'énergie d'ACE = 1,5× les reps du joueur au début du match. */
export function aceEnergyBudget(playerReps: number): number {
    return Math.max(0, Math.floor(playerReps * ACE_ENERGY_MULT))
}

export interface AceReward {
    itemId?: string
    reps?: number
    gift?: string       // espèce offerte (Panthéon)
    refund?: boolean    // rembourse l'énergie dépensée ce combat
    message: string
}

/** Récompense à la n-ième victoire (1-indexée). */
export function aceReward(winNumber: number): AceReward {
    if (winNumber <= 5) return { itemId: "poke_ball", message: "ACE te laisse une Nexus-Ball." }
    if (winNumber <= 10) return { reps: 100, message: "ACE te file 100 reps pour ta peine." }
    if (winNumber === 11) return { itemId: "super_ball", message: "ACE t'offre une Super Nexus-Ball !" }
    if (winNumber === 12) return { gift: "pantheon", message: "ACE te confie un Panthéon ! Élève-le bien." }
    return { refund: true, message: "ACE te rembourse l'énergie dépensée ce combat." }
}
