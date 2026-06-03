// src/lib/gamebook/yellow/data/moves.ts
//
// Nexus Jaune Éclair — registre des attaques (data-driven, extensible).
// Amorce : un panel couvrant chaque catégorie + des effets variés pour exercer
// le moteur (statut, multi-hit, drain, recul, buff/debuff, priorité).

import type { MoveData } from "../battle/types"

export const MOVES: Record<string, MoveData> = {
    charge: {
        id: "charge", name: "Charge", type: "NORMAL", category: "PHYSICAL",
        power: 40, accuracy: 100, pp: 35, description: "Une charge basique.",
    },
    vive_attaque: {
        id: "vive_attaque", name: "Vive-Attaque", type: "NORMAL", category: "PHYSICAL",
        power: 40, accuracy: 100, pp: 30, priority: 1, description: "Frappe en priorité.",
    },
    flammeche: {
        id: "flammeche", name: "Flammèche", type: "FEU", category: "SPECIAL",
        power: 40, accuracy: 100, pp: 25,
        effect: { chance: 10, inflictStatus: "BURN" }, description: "Peut brûler.",
    },
    pistolet_a_o: {
        id: "pistolet_a_o", name: "Pistolet à O", type: "EAU", category: "SPECIAL",
        power: 40, accuracy: 100, pp: 25, description: "Un jet d'eau.",
    },
    fouet_lianes: {
        id: "fouet_lianes", name: "Fouet Lianes", type: "PLANTE", category: "PHYSICAL",
        power: 45, accuracy: 100, pp: 25, description: "Cingle avec des lianes.",
    },
    etincelle: {
        id: "etincelle", name: "Étincelle", type: "ELEC", category: "PHYSICAL",
        power: 65, accuracy: 100, pp: 20,
        effect: { chance: 30, inflictStatus: "PARALYSIS" }, description: "Peut paralyser.",
    },
    vampigraine: {
        id: "vampigraine", name: "Vampigraine", type: "PLANTE", category: "STATUS",
        power: 0, accuracy: 90, pp: 10,
        effect: { inflictVolatile: "SEEDED" }, description: "Draine les PV chaque tour.",
    },
    double_pied: {
        id: "double_pied", name: "Double-Pied", type: "COMBAT", category: "PHYSICAL",
        power: 30, accuracy: 100, pp: 30,
        effect: { multiHit: [2, 2] }, description: "Frappe deux fois.",
    },
    mega_sangsue: {
        id: "mega_sangsue", name: "Méga-Sangsue", type: "PLANTE", category: "SPECIAL",
        power: 40, accuracy: 100, pp: 15,
        effect: { drainPct: 50 }, description: "Rend la moitié des dégâts en PV.",
    },
    bélier: {
        id: "bélier", name: "Bélier", type: "NORMAL", category: "PHYSICAL",
        power: 90, accuracy: 85, pp: 20,
        effect: { recoilPct: 25 }, description: "Puissant mais cause du recul.",
    },
    rugissement_p: {
        id: "rugissement_p", name: "Hurlement", type: "NORMAL", category: "STATUS",
        power: 0, accuracy: 100, pp: 40,
        effect: { statChanges: [{ target: "target", stat: "atk", stages: -1 }] },
        description: "Baisse l'Attaque adverse.",
    },
    danse_lames: {
        id: "danse_lames", name: "Danse-Lames", type: "NORMAL", category: "STATUS",
        power: 0, accuracy: 0, pp: 20,
        effect: { statChanges: [{ target: "self", stat: "atk", stages: 2 }] },
        description: "Augmente fortement l'Attaque.",
    },
    repos: {
        id: "repos", name: "Repos", type: "PSY", category: "STATUS",
        power: 0, accuracy: 0, pp: 10,
        effect: { healPct: 50 }, description: "Restaure la moitié des PV.",
    },
    onde_folie: {
        id: "onde_folie", name: "Onde Folie", type: "PSY", category: "STATUS",
        power: 0, accuracy: 100, pp: 10,
        effect: { inflictVolatile: "CONFUSION" }, description: "Rend l'adversaire confus.",
    },
}

export function getMove(id: string): MoveData | null {
    return MOVES[id] ?? null
}

export const MOVE_IDS = Object.keys(MOVES)
