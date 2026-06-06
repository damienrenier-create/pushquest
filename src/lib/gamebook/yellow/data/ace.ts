// src/lib/gamebook/yellow/data/ace.ts
//
// Nexus Jaune Éclair — ACE, le RIVAL ultime. Un ACE DIFFÉRENT PAR JOUEUR :
// son équipe est stockée et MUTE à chaque fois que le joueur le bat (1 défaite
// d'ACE par jour). React-free, pur, testable. L'IA "ace" + le budget d'énergie
// (1,5× les reps du joueur) sont gérés au niveau du moteur/store.
//
// Progression (à CHAQUE défaite) : +1 niv à 3 Daemons + +2 niv à 1 Daemon (aléatoire).
// Paliers (tous les 5) : 5 Eau · 10 Plante · 15 (les 3 Panthéon ÉVOLUENT) · 20 Vol
// · 25 Combat · 30 Roche · 35 équipe FINALE.

import { getSpecies } from "./species"

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

/** Équipe de départ (tous niv 4) : 3 Panthéon + Nouillon + 2 Feu (Braisille, Fennaise). */
export function initialAceTeam(): AceMon[] {
    return [
        { speciesId: "pantheon", level: 4 },
        { speciesId: "pantheon", level: 4 },
        { speciesId: "pantheon", level: 4 },
        { speciesId: "nouillon", level: 4 },   // slot "psy" (retiré à l'équipe finale)
        { speciesId: "braisille", level: 4 },  // slot rotation A
        { speciesId: "fennaise", level: 4 },   // slot rotation B
    ]
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

// Lignées de base pour chaque type de rotation (le stade s'adapte au niveau).
const ROTATION_BASE: Record<string, string> = {
    eau: "gouttiny", plante: "pampousse", vol: "plumiot", combat: "couperin", roche: "cailloutchi",
}

/** Remplace les 2 slots de rotation (4 et 5) par 2 Daemons d'un type, même niveau. */
function swapRotation(team: AceMon[], type: keyof typeof ROTATION_BASE): void {
    const base = ROTATION_BASE[type]
    for (const i of [4, 5]) {
        team[i] = { speciesId: speciesAtLevel(base, team[i].level), level: team[i].level }
    }
}

/** À 15 défaites : les 3 Panthéon (slots 0,1,2) évoluent (ténèbre/élec/glace), niveaux gardés. */
function evolvePanthers(team: AceMon[]): void {
    const forms = ["ombrapanthe", "voltapanthe", "panthegel"]
    for (let i = 0; i < 3; i++) team[i] = { speciesId: forms[i], level: team[i].level }
}

/**
 * Équipe FINALE (35) : on garde les 3 panthères, on RETIRE Nouillon, et on équipe
 * Draclet (au niveau du MEILLEUR Daemon du joueur) + Lavapetit + Braisille (au niveau
 * du slot qu'ils remplacent). Stades adaptés au niveau. (Fennaise est coupée pour
 * tenir à 6 — réglable.)
 */
function finalTeam(team: AceMon[], playerBestLevel: number): AceMon[] {
    const lvlA = team[4].level, lvlB = team[5].level
    return [
        team[0], team[1], team[2], // les 3 panthères (déjà évoluées au palier 15)
        { speciesId: speciesAtLevel("draclet", playerBestLevel), level: Math.max(1, Math.min(MAX_LEVEL, playerBestLevel)) },
        { speciesId: speciesAtLevel("lavapetit", lvlA), level: lvlA },
        { speciesId: speciesAtLevel("braisille", lvlB), level: lvlB },
    ]
}

/** Monte l'équipe : +2 niv à 1 Daemon aléatoire, +1 niv à 3 autres (distincts). */
function levelUp(team: AceMon[], rng: () => number): void {
    const n = team.length
    const i2 = Math.floor(rng() * n)
    const others = Array.from({ length: n }, (_, i) => i).filter((i) => i !== i2)
    for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1))
        ;[others[i], others[j]] = [others[j], others[i]]
    }
    const plus1 = others.slice(0, 3)
    team[i2].level = Math.min(MAX_LEVEL, team[i2].level + 2)
    for (const i of plus1) team[i].level = Math.min(MAX_LEVEL, team[i].level + 1)
}

/**
 * Applique UNE défaite d'ACE (le joueur a gagné) : renvoie la NOUVELLE équipe.
 * @param newWins  nombre TOTAL de défaites d'ACE APRÈS celle-ci (1, 2, 3…).
 */
export function progressAceTeam(team: AceMon[], newWins: number, playerBestLevel: number, rng: () => number): AceMon[] {
    const t = team.map((m) => ({ ...m }))
    levelUp(t, rng) // la montée de niveau s'applique à chaque défaite
    switch (newWins) {
        case 5: swapRotation(t, "eau"); break
        case 10: swapRotation(t, "plante"); break
        case 15: evolvePanthers(t); break
        case 20: swapRotation(t, "vol"); break
        case 25: swapRotation(t, "combat"); break
        case 30: swapRotation(t, "roche"); break
        case 35: return finalTeam(t, playerBestLevel)
    }
    return t
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
