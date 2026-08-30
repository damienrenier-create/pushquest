// src/lib/gamebook/yellow/data/pnj5.ts
//
// PNJ 5 — GARDIEN DE LA GROTTE DU NEXUS. Intercepte en (17,33) et barre le passage (18,33)(19,33)(20,33).
// GATE : exige le titre OR au Dôme (domeChampionships >= 3) ; sinon le joueur est RENVOYÉ de la grotte.
// Combat de dresseur RÉCURRENT (re-battu à CHAQUE visite, autant de fois que voulu — pas de cap journalier)
// contre la meute des 5 Gek. IA « hof » (la plus maligne).
// SCALING : à chaque défaite infligée, ses Gek montent de +2 niveaux (+ Saiyan correspondant). Cf. pnj5Wins.
// Câblé via gameStore (NPC y_pnj5_grotte → pendingPnj5 → tryLaunchPnj5 → startTrainerBattle) ; victoire
// résolue dans battleStore.finishBattle (recordPnj5Defeat).

import { createMonInstance } from "../battle/factory"
import type { MonInstance, StatKey } from "../battle/types"
import { MAX_LEVEL } from "../battle/xp"

export const PNJ5_NPC_ID = "y_pnj5_grotte"
export const PNJ5_TRAINER_ID = "y_pnj5_grotte"
export const PNJ5_MAP_ID = "yellow_grotte_nexus"
/** Marqueur PERSISTANT « gardien vaincu cette visite » (defeatedTrainers, per-monde). Survit au refresh → les
 *  échelles restent franchissables après un reload. Levé (re-armé) seulement après PNJ5_REARM_STEPS pas AU-DEHORS. */
export const PNJ5_CLEARED_MARKER = "pnj5_cleared"
/** Nombre de pas HORS grotte après lesquels le gardien se ré-arme (on peut sortir/rentrer sans se refaire happer). */
export const PNJ5_REARM_STEPS = 10
export const PNJ5_POS = { x: 17, y: 33 } as const
/** Cases-PIÈGES : y marcher LANCE le défi (interception), tant que le gardien n'est pas battu CETTE visite. */
export const PNJ5_TRIGGER: ReadonlyArray<{ x: number; y: number }> = [
    { x: 18, y: 33 }, { x: 19, y: 33 },
]
/** Barrage complet du couloir (les cases-pièges + la case restante) → aucun passage tant que non battu. */
export const PNJ5_BLOCK: ReadonlyArray<{ x: number; y: number }> = [
    { x: 18, y: 33 }, { x: 19, y: 33 }, { x: 20, y: 33 },
]
/** Renvoi hors de la grotte (retour Zone de Combat) si le joueur n'a pas le titre Or. */
export const PNJ5_KICK = { mapId: "yellow_zone_combat", x: 10, y: 7 } as const

export function inPnj5Trigger(x: number, y: number): boolean {
    return PNJ5_TRIGGER.some((b) => b.x === x && b.y === y)
}
export function inPnj5Block(x: number, y: number): boolean {
    return PNJ5_BLOCK.some((b) => b.x === x && b.y === y)
}

// ── Niveau des Gek selon les victoires : base 75, +2 par victoire, plafonné à MAX_LEVEL ──
export const PNJ5_BASE_LEVEL = 75
export function pnj5Level(wins: number): number {
    return Math.min(MAX_LEVEL, PNJ5_BASE_LEVEL + 2 * Math.max(0, wins))
}

// ── La meute : 5 Gek, chacun min-maxé sur ses 2 stats d'expertise (EV 252/252 = cap) + Saiyan scalé au niveau.
//    Movesets validés (sans Tunnel). Geaucké OUVRE (team[0]) sur Osmose ; Gékroc ouvre TOUJOURS sur Cage Éclair. ──
interface GekSpec {
    speciesId: string
    moves: string[]
    ev: [StatKey, StatKey] // 2 stats d'expertise → EV 252 chacune + Saiyan
    opening?: string[]      // attaque(s) d'ouverture forcée(s) quand ce Gek est actif
}
const PNJ5_MEUTE: readonly GekSpec[] = [
    // 💧 Geaucké — LEAD (sprinter Vit+Atk). Ouvre sur Osmose (drain), puis tempo/nuke.
    { speciesId: "geaucke", moves: ["osmose", "roc_titanesque", "jet_boueux", "seisme"], ev: ["spe", "atk"], opening: ["osmose"] },
    // ⚡ Gékroc — mur spécial (Déf+Spé). À CHAQUE entrée : Cage Éclair (paralyse) d'abord.
    { speciesId: "gekroc", moves: ["cage_eclair", "ultra_foudre", "seisme", "repos"], ev: ["def", "spc"], opening: ["cage_eclair"] },
    // 🔥 Gékraise — juggernaut physique (Atk+HP).
    { speciesId: "gekraise", moves: ["roc_titanesque", "seisme", "lame_roche", "vive_attaque"], ev: ["atk", "hp"] },
    // 🔮 Gékosmic — sweeper spécial rapide (Spé+Vit).
    { speciesId: "gekosmic", moves: ["vague_mentale", "choc_mental", "onde_cerebrale", "repos"], ev: ["spc", "spe"] },
    // 🌑 Géckèbre — mur increvable (HP+Déf).
    { speciesId: "geckebre", moves: ["devoreur_ombres", "onde_obscure", "secousse", "repos"], ev: ["hp", "def"] },
]

/** Fabrique la meute de PNJ 5 pour un nombre de victoires donné (niveau + Saiyan scalés ; EV maxées d'emblée).
 *  L'ORDRE compte : team[0] = Geaucké (le lead qui ouvre sur Osmose). */
export function buildPnj5Team(wins: number): MonInstance[] {
    const level = pnj5Level(wins)
    // Saiyan « correspondant » au niveau (comme un dresseur élite : ~level points), réparti 60/40 sur les 2 stats.
    const saiyanTotal = level
    const primary = Math.round(saiyanTotal * 0.6)
    const secondary = saiyanTotal - primary
    return PNJ5_MEUTE.map((g) => {
        const [s1, s2] = g.ev
        const ev: Partial<Record<StatKey, number>> = { [s1]: 252, [s2]: 252 } // EV cap sur les 2 stats (504 ≤ 510)
        const allocated: Partial<Record<StatKey, number>> = { [s1]: primary, [s2]: secondary }
        const inst = createMonInstance(g.speciesId, level, { owned: false, moveIds: g.moves, ev, allocated })
        if (g.opening?.length) Object.assign(inst, { openingMoves: [...g.opening] })
        return inst
    })
}

// ── Dialogues ──
export const PNJ5_INTRO_LINES = [
    "HALTE. Nul ne franchit la Grotte du Nexus sans affronter ses Gardiens.",
    "Tu portes le titre d'OR du Dôme… bien. Alors prouve-le CONTRE MA MEUTE !",
    "*Cinq masses de pierre s'arrachent du sol dans un grondement.*",
]
export const PNJ5_NO_DOME_LINES = [
    "HALTE. La Grotte du Nexus ne s'ouvre qu'aux Dresseurs d'élite.",
    "Reviens quand tu auras décroché le titre OR au Dôme de Combat. DEHORS !",
    "*D'une poigne de pierre, le Gardien te repousse hors de la caverne.*",
]
export const PNJ5_NO_TEAM_LINES = [
    "Tes Daemons sont tous K.O. !",
    "Reviens quand ta meute sera en état de se battre.",
]
export const PNJ5_VICTORY_LINES = [
    "*La meute de Gek s'effrite dans un long grondement…*",
    "Impressionnant. La voie est libre… POUR CETTE FOIS.",
    "Mais mes Gardiens reviendront plus forts. Défie-les quand tu l'oseras.",
]
// Descente scellée : même si le joueur CONTOURNE le gardien, il ne peut pas descendre sans l'avoir vaincu cette visite.
export const PNJ5_SEAL_LINES = [
    "*Un grondement sourd monte des profondeurs — une force invisible te repousse de l'échelle.*",
    "« NUL NE DESCEND dans le Nexus sans avoir vaincu le GARDIEN. Reviens m'affronter ! »",
]
