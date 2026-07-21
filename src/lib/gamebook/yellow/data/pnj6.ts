// src/lib/gamebook/yellow/data/pnj6.ts
//
// PNJ 6 — L'ÉCHANGEUR DE LA GROTTE DU NEXUS. NPC statique en (5,38) sur la Grotte 1F, de dos (regarde vers le haut).
// RÔLE : dresseur RÉPÉTABLE. À CHAQUE victoire, il propose d'échanger un CROCAVERN (Daemon exclusif ROCHE/PLANTE)
//   contre le PREMIER Daemon de ton équipe (team[0]). Re-jouable tant que l'échange n'est pas conclu ; une fois
//   l'échange fait, il te salue et ne combat plus.
// Team : Draconarque, Omnhippo, Sonarque, Tonytony, Shadow, Crocavern — niv 70 + Saiyan + EV.
//
// Câblé via : npcs.ts · gameStore (pressA → pendingPnj6 → tryLaunchPnj6) · battleStore.finishBattle (victoire →
//   signal pnj6TradeOffer) · YellowDevClient (modale d'échange → executeTrade + markTrainerDefeated).

import { createMonInstance } from "../battle/factory"
import type { MonInstance, StatKey } from "../battle/types"

export const PNJ6_NPC_ID = "y_pnj6_grotte"
export const PNJ6_TRAINER_ID = "y_pnj6_grotte"
export const PNJ6_MAP_ID = "yellow_grotte_nexus"
export const PNJ6_NAME = "ÉCHANGEUR"
export const PNJ6_POS = { x: 5, y: 38 } as const
export const PNJ6_LEVEL = 70
/** Marker (defeatedTrainers) : l'échange Crocavern a été conclu → PNJ 6 ne combat/échange plus (per-monde). */
export const PNJ6_TRADE_DONE_MARKER = "pnj6_trade_done"
/** Niveau du Crocavern reçu par l'échange (Daemon exclusif à élever). */
export const CROCAVERN_GIFT_LEVEL = 50

// ── Team : 6 Daemons, EV 252/252 sur 2 stats + Saiyan scalé au niveau. Moveset auto-dérivé (learnset à niv 70). ──
interface TeamSpec { speciesId: string; ev: [StatKey, StatKey] }
const PNJ6_TEAM: readonly TeamSpec[] = [
    { speciesId: "draconarque", ev: ["spc", "spe"] }, // VOL/DRAGON — sweeper mixte rapide
    { speciesId: "omnhippo", ev: ["spc", "spe"] },    // PSY — sweeper spécial rapide
    { speciesId: "sonarque", ev: ["spc", "hp"] },     // EAU/ÉLEC — attaquant spécial encaisseur
    { speciesId: "tonytony", ev: ["atk", "spe"] },    // NORMAL — physique rapide
    { speciesId: "shadow", ev: ["atk", "spe"] },      // NORMAL/SPECTRE — glass cannon physique
    { speciesId: "crocavern", ev: ["atk", "def"] },   // ROCHE/PLANTE — colosse physique
]

/** L'équipe de PNJ 6 (niv 70, Saiyan ~niveau réparti 60/40, EV maxées sur 2 stats). */
export function buildPnj6Team(): MonInstance[] {
    const level = PNJ6_LEVEL
    const saiyanTotal = level
    const primary = Math.round(saiyanTotal * 0.6)
    const secondary = saiyanTotal - primary
    return PNJ6_TEAM.map((t) => {
        const [s1, s2] = t.ev
        const ev: Partial<Record<StatKey, number>> = { [s1]: 252, [s2]: 252 }
        const allocated: Partial<Record<StatKey, number>> = { [s1]: primary, [s2]: secondary }
        return createMonInstance(t.speciesId, level, { owned: false, ev, allocated })
    })
}

/** Le Crocavern proposé à l'échange (instance neuve ; l'ownership/traded est posé par executeTrade). */
export function makeCrocavernGift(): MonInstance {
    return createMonInstance("crocavern", CROCAVERN_GIFT_LEVEL, { owned: false })
}

// ── Dialogues ──
export const PNJ6_INTRO_LINES = [
    "*Un dresseur accroupi te tourne le dos, scrutant une fissure au plafond de la grotte.*",
    "« …Tu cherches le CROCAVERN, toi aussi ? Ce fossile vivant ne se donne pas. »",
    "« Bats-moi, et je t'en céderai un — contre le Daemon de tête de ton équipe. Marché de spéléologue ! »",
]
export const PNJ6_NO_TEAM_LINES = [
    "« Tes Daemons sont tous à terre. Reviens en état de te battre. »",
]
// Après la victoire → l'offre d'échange (modale). Ces lignes servent d'annonce de victoire (rematchReward).
export const PNJ6_VICTORY_LINES = [
    "« Beau combat ! Un marché est un marché. »",
    "« Alors : ton Daemon de tête contre mon CROCAVERN ? À toi de voir. »",
]
export const PNJ6_TRADE_DONE_LINES = [
    "« Ha ! Prends soin de ce vieux CROCAVERN. Il a plus de siècles que toute cette grotte. »",
    "*L'échangeur se replonge dans la contemplation de son plafond fissuré.*",
]
// Re-visite après l'échange : plus de combat, juste un salut.
export const PNJ6_FAREWELL_LINES = [
    "« Notre marché est déjà conclu, dresseur. Ton CROCAVERN t'attend au front. »",
]
