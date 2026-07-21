// src/lib/gamebook/yellow/data/pnj10.ts
//
// PNJ 10 — LA SENTINELLE DE LA GROTTE DU NEXUS. NPC statique en (16,18) sur la Grotte 1F. Barre le couloir
// (17,18)(18,18)(19,18) tant qu'elle n'est pas vaincue CETTE visite (bloqueur pur, sans gate ni renvoi).
// Team : Moby D, Uzumaro, Razmarée, Naïadrak, Abyssombre, Orcaline — niv 70 + Saiyan + EV. IA « hof ».
//
// Câblé via : npcs.ts (+ NPC_SPRITES pnj10.png) · gameStore (interception de mouvement sur le couloir +
//   pressA → pendingPnj10 → tryLaunchPnj10 + reset à l'entrée grotte) · battleStore.finishBattle (victoire →
//   recordPnj10Cleared).

import { createMonInstance } from "../battle/factory"
import type { MonInstance, StatKey } from "../battle/types"

export const PNJ10_NPC_ID = "y_pnj10_grotte"
export const PNJ10_TRAINER_ID = "y_pnj10_grotte"
export const PNJ10_MAP_ID = "yellow_grotte_nexus"
export const PNJ10_NAME = "SENTINELLE"
export const PNJ10_POS = { x: 16, y: 18 } as const
export const PNJ10_LEVEL = 70

/** Cases barrées (couloir) : y marcher LANCE le combat tant que la Sentinelle n'est pas vaincue CETTE visite. */
export const PNJ10_BLOCK: ReadonlyArray<{ x: number; y: number }> = [
    { x: 17, y: 18 }, { x: 18, y: 18 }, { x: 19, y: 18 },
]
export function inPnj10Block(x: number, y: number): boolean {
    return PNJ10_BLOCK.some((b) => b.x === x && b.y === y)
}

// ── « Vaincue cette visite » : flag TRANSITOIRE (non persisté), remis à false à l'entrée de la grotte (setMap),
//    posé à true à la victoire (battleStore). Échec SÛR : au reload dans la grotte il repart false → on rebat
//    (au pire un combat en trop, jamais un passage volé), comme le gardien PNJ 5. ──
let clearedThisVisit = false
export function recordPnj10Cleared(): void { clearedThisVisit = true }
export function isPnj10ClearedThisVisit(): boolean { return clearedThisVisit }
export function resetPnj10Visit(): void { clearedThisVisit = false }

// ── Team : 6 Daemons EAU/GLACE, EV 252/252 sur 2 stats + Saiyan scalé. Moveset auto-dérivé (learnset à niv 70). ──
interface TeamSpec { speciesId: string; ev: [StatKey, StatKey] }
const PNJ10_TEAM: readonly TeamSpec[] = [
    { speciesId: "mobyd", ev: ["spc", "spe"] },      // EAU/GLACE — sweeper spécial
    { speciesId: "uzumaro", ev: ["atk", "spe"] },    // COMBAT/EAU — tank-sétuppeur physique
    { speciesId: "razmaree", ev: ["spc", "hp"] },    // EAU — mur spécial
    { speciesId: "naiadrak", ev: ["spc", "spe"] },   // EAU — sweeper spécial rapide
    { speciesId: "abyssombre", ev: ["spc", "def"] }, // EAU/TÉNÈBRES — mur spécial lent
    { speciesId: "orcaline", ev: ["spc", "hp"] },    // GLACE/EAU — attaquant spécial encaisseur
]

/** L'équipe de la Sentinelle (niv 70, Saiyan ~niveau réparti 60/40, EV maxées sur 2 stats). */
export function buildPnj10Team(): MonInstance[] {
    const level = PNJ10_LEVEL
    const saiyanTotal = level
    const primary = Math.round(saiyanTotal * 0.6)
    const secondary = saiyanTotal - primary
    return PNJ10_TEAM.map((t) => {
        const [s1, s2] = t.ev
        const ev: Partial<Record<StatKey, number>> = { [s1]: 252, [s2]: 252 }
        const allocated: Partial<Record<StatKey, number>> = { [s1]: primary, [s2]: secondary }
        return createMonInstance(t.speciesId, level, { owned: false, ev, allocated })
    })
}

// ── Dialogues ──
export const PNJ10_INTRO_LINES = [
    "« HALTE. Ce couloir mène plus profond… et je ne laisse passer que les plus forts. »",
    "« Affronte ma marée, dresseur. Prouve que tu mérites la suite ! »",
    "*Six silhouettes aquatiques jaillissent des flaques de la grotte.*",
]
export const PNJ10_NO_TEAM_LINES = [
    "« Tes Daemons sont tous à terre. Reviens quand tu pourras te défendre. »",
]
export const PNJ10_VICTORY_LINES = [
    "*La marée reflue dans un murmure d'écume…*",
    "« Bien joué. Le passage est à toi… pour cette fois. »",
]
// Si le joueur tente de forcer le couloir sans avoir vaincu la Sentinelle cette visite.
export const PNJ10_SEAL_LINES = [
    "« On ne passe pas. Bats-moi d'abord ! »",
]
