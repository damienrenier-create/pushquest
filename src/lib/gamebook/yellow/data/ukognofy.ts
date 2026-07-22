// src/lib/gamebook/yellow/data/ukognofy.ts
//
// UKOGNOFY — le LÉGENDAIRE ULTIME (Goshendofy Dragon + Ukognos Fée = DRAGON/FÉE). Rencontré dans une CHAMBRE cachée
// de la Grotte, atteinte via une échelle interne sous 6 conditions (niv 100 + nuit + fusion sauvage vue + Repousse).
// Le défi = le CAPTURER (Fusio-Ball, garanti sous ~10 % PV, + bonus si sommeil/gel). Après 3 RENCONTRES SANS
// CAPTURE (KO/défaite/fuite) → DISPARAÎT à jamais. Capturé → disparaît aussi.
//
// ESPÈCE PERMANENTE (comme les 5 fusions de base) → capture KEEPABLE (résolvable au reload), reconnue par isFusion
// (engine.ts) → Fusio-Ball uniquement, anti-spoiler (custom, hors SPECIES). En COMBAT, l'instance sauvage porte
// des frozenStats = le profil du FUSIONNÉ (Spéciale scindée SpA 320 / SpD 290) — qui donne AUSSI le bon seuil de
// capture (BST ~1710). L'exemplaire CAPTURÉ retombe sur les baseStats permanents (frozenStats droppé à la save).

import { createMonInstance } from "../battle/factory"
import { registerCustomSpecies } from "./species"
import { fusionSpritePath } from "./fusionSprite"
import type { MonInstance, SpeciesData } from "../battle/types"

export const UKOGNOFY_ID = "ukognofy"
export const UKOGNOFY_LEVEL = 100
export const UKOGNOFY_MOVES = ["souffle_primordial", "cataclysme_lunaire", "fulgurance", "repos"] as const

/** Map de la CHAMBRE du légendaire (décor salle_ukognofy.png). Atteinte via une échelle interne de la Grotte
 *  quand les 6 conditions sont réunies (cf. gameStore). Ukognofy y est affronté à l'arrivée. */
export const UKOGNOFY_CHAMBER_MAP = "yellow_ukognofy_chamber"

/** PNJ d'INTERACTION d'Ukognofy dans la chambre (bas-centre du bloc central, sprite invisible : le décor
 *  salle_ukognofy.png montre déjà le légendaire). Sert de point de combat « bump-to-fight » à partir de la
 *  2ᵉ visite : le joueur s'en APPROCHE pour l'affronter, ou RESSORT par l'échelle (demi-tour, sans risquer
 *  une tentative). À la 1ʳᵉ visite, le combat démarre automatiquement à l'arrivée (embuscade). */
export const UKOGNOFY_NPC_ID = "y_ukognofy"
export const UKOGNOFY_NPC_POS = { x: 7, y: 7 } as const

/** AVERTISSEMENT à l'arrivée (2ᵉ visite et +) : rappelle l'enjeu (disparition définitive) + le choix
 *  APPROCHER / RESSORTIR. `remaining` = tentatives restantes. */
export function ukognofyWarnLines(remaining: number): string[] {
    const t = `${remaining} tentative${remaining > 1 ? "s" : ""}`
    return [
        "*Le sanctuaire vibre encore. UKOGNOFY est toujours là, tapi au centre.*",
        `« Tu l'as déjà défié. Il ne te reste que ${t} avant qu'il ne s'évanouisse À JAMAIS. »`,
        "APPROCHE-toi de lui pour l'affronter — ou RESSORS par l'échelle pour ne PAS risquer une tentative.",
    ]
}
/** Intro au moment où le joueur BUMPE Ukognofy (2ᵉ visite +) : l'approche VAUT engagement (le combat suit). */
export const UKOGNOFY_INTRO_LINES = [
    "*Tu t'avances vers lui. UKOGNOFY déploie ses ailes de flammes féeriques…*",
    "Le mythe des mythes te toise. Il n'y aura pas de retour en arrière — le combat commence !",
]
/** Équipe entièrement K.O. → pas de combat possible. */
export const UKOGNOFY_NO_TEAM_LINES = ["*Toute ton équipe est K.O. Impossible d'affronter UKOGNOFY dans cet état.*"]
/** Ukognofy déjà affronté CETTE visite (une seule rencontre par venue) → il faut ressortir et refaire le chemin. */
export const UKOGNOFY_VOLATILISED_LINES = [
    "*L'air garde la trace de son passage… mais UKOGNOFY s'est volatilisé.*",
    "Il te faudra ressortir et retrouver le chemin du sanctuaire pour retenter ta chance.",
]
/** Ukognofy a DISPARU à jamais (capturé ou 3 échecs) — défensif (le détour vers la chambre est déjà gated). */
export const UKOGNOFY_GONE_LINES = ["*Le sanctuaire est silencieux. UKOGNOFY a disparu à jamais.*"]

/** Espèce PERMANENTE d'Ukognofy (enregistrée custom → résolvable, hors Pokédex principal). baseStats = profil
 *  légendaire « collapsé » (Spé unique) de l'exemplaire capturé ; la Spé scindée du fusionné vit dans frozenStats
 *  côté rencontre. hiddenUntilCaught (anti-spoiler) ; catchRate 3 (légendaire, mais capture régie par la Fusio-Ball). */
export const UKOGNOFY_SPECIES: SpeciesData = {
    id: UKOGNOFY_ID, dexNo: 505, name: "Ukognofy", types: ["DRAGON", "FEE"],
    baseStats: { hp: 156, atk: 98, def: 82, spe: 111, spc: 150 }, // BST 597 — mur-nuke spécial, rapide, Déf physique molle
    learnset: [
        { level: 1, moveId: "draco_souffle" }, { level: 1, moveId: "bourrasque_feerique" },
        { level: 1, moveId: "fulgurance" }, { level: 1, moveId: "repos" },
        { level: 30, moveId: "draco_charge" }, { level: 45, moveId: "eclat_lunaire" },
        { level: 60, moveId: "souffle_primordial" }, { level: 75, moveId: "cataclysme_lunaire" },
        { level: 90, moveId: "cage_eclair" },
    ],
    catchRate: 3, baseExp: 250, rarity: "LEGENDARY", growthRate: "slow",
    description: "Le mythe des mythes : les deux légendes, Dragon et Fée, fondues en une seule entité aux flammes féeriques.",
    sprite: fusionSpritePath("Ukognofy"), hiddenUntilCaught: true,
}

/** Condition NUIT : heure RÉELLE locale entre 21h et 3h du matin. */
export function isUkognofyNight(now = new Date()): boolean {
    const h = now.getHours()
    return h >= 21 || h < 3
}

/** Markers (defeatedTrainers) : capture + les 3 échecs. Boolean, bornés → pas de nouveau champ save. */
export const UKOGNOFY_CAUGHT_MARKER = "ukognofy_caught"
export const UKOGNOFY_FAIL_MARKERS = ["ukognofy_fail_1", "ukognofy_fail_2", "ukognofy_fail_3"] as const
export const UKOGNOFY_MAX_FAILS = 3

/** Ukognofy SAUVAGE niv 100. Espèce permanente + frozenStats = profil FUSIONNÉ (Spé scindée SpA 320 / SpD 290 →
 *  aussi le seuil de capture ~10 % via BST 1710). Idempotent : (ré)enregistre l'espèce pour être résolvable partout. */
export function buildUkognofy(): { instance: MonInstance; speciesId: string } {
    registerCustomSpecies([UKOGNOFY_SPECIES])
    const inst = createMonInstance(UKOGNOFY_ID, UKOGNOFY_LEVEL, { owned: false, moveIds: [...UKOGNOFY_MOVES] })
    // Profil de FUSIONNÉ pour le combat (Spéciale scindée) — droppé à la sérialisation → l'exemplaire capturé
    //   retombe sur les baseStats permanents. Donne aussi le BON seuil de capture (BST 1710 → ~10 % PV).
    inst.frozenStats = { hp: 462, atk: 216, def: 180, spe: 242, spc: 320 }
    inst.frozenSpd = 290
    inst.currentHp = 462
    return { instance: inst, speciesId: UKOGNOFY_ID }
}

/** Nombre d'échecs enregistrés (0..3). */
export function ukognofyFailCount(isDefeated: (m: string) => boolean): number {
    return UKOGNOFY_FAIL_MARKERS.filter((m) => isDefeated(m)).length
}
/** Tentatives RESTANTES avant disparition définitive (3 - échecs). */
export function ukognofyRemainingTries(isDefeated: (m: string) => boolean): number {
    return Math.max(0, UKOGNOFY_MAX_FAILS - ukognofyFailCount(isDefeated))
}
/** Ukognofy a-t-il DISPARU à jamais (capturé OU 3 rencontres sans capture) ? → ne repop plus. */
export function isUkognofyGone(isDefeated: (m: string) => boolean): boolean {
    return isDefeated(UKOGNOFY_CAUGHT_MARKER) || ukognofyFailCount(isDefeated) >= UKOGNOFY_MAX_FAILS
}
/** Le PROCHAIN marker d'échec à poser à la fin d'une rencontre sans capture (ou null si déjà 3). */
export function nextUkognofyFailMarker(isDefeated: (m: string) => boolean): string | null {
    return UKOGNOFY_FAIL_MARKERS.find((m) => !isDefeated(m)) ?? null
}
