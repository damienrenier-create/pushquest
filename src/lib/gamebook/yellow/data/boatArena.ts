// src/lib/gamebook/yellow/data/boatArena.ts
//
// ARÈNE 4 = LE BATEAU (Aqua Arena). Décision Sartay du 21/10/2026 : « forcer les gens à voyager ». L'ordre des arènes
// devient, dans TOUS les runs : Plante → Roche → Feu → BATEAU (badge ANCRE ⚓) → Électrik → Eau, puis la Ligue (6 badges).
//   • Le bateau n'a pas UN boss mais tout un équipage : le badge tombe quand les 4 matelots ET les 2 boss sont battus,
//     dans n'importe quel ordre (les plaques de défi des boss ne changent pas).
//   • Le dernier vaincu remet aussi la CLÉ de l'arène de la Ville Jaune, volée par un voleur réfugié à bord.
//   • Sans le badge ANCRE, le GARDIEN DES CLÉS (planche Gen 3 fournie par Sartay) bloque la porte du GYM, qui mène
//     désormais à l'arène Électrik ; avec, il défie le joueur (niveau du champion du bateau du run), puis ouvre.
// Module PUR (données + règles) — testé dans boatArena.test.ts.

import type { BadgeId } from "./cts"

export const BOAT_BADGE: BadgeId = "ancre"
export const BOAT_ARENA_MAP_ID = "yellow_aqua_arena"
/** Les 4 matelots puis les 2 boss (plaques de défi (11,27) et (12,27)). */
export const BOAT_CREW_IDS: readonly string[] = ["y_aqua_n1", "y_aqua_n2", "y_aqua_n3", "y_aqua_n4"]
export const BOAT_BOSS_IDS: readonly string[] = ["y_aqua_boss_a", "y_aqua_boss_b"]
export const BOAT_TRAINER_IDS: readonly string[] = [...BOAT_CREW_IDS, ...BOAT_BOSS_IDS]

export function isBoatTrainer(trainerId: string): boolean { return BOAT_TRAINER_IDS.includes(trainerId) }
/** Badge ANCRE mérité : les 6 membres de l'équipage sont battus DANS CE MONDE. */
export function boatArenaCleared(isDefeated: (trainerId: string) => boolean): boolean { return BOAT_TRAINER_IDS.every(isDefeated) }

// ── La CLÉ et son GARDIEN ────────────────────────────────────────────────────────────────────────────────────────
export const ARENA_KEY_ITEM_ID = "cle_arene"
/** Le DRESSEUR (combat ; hors carte, comme le Colporteur du génie) et le PNJ posé devant le GYM (interaction). */
export const KEY_GUARD_TRAINER_ID = "y_gardien_cle"
export const KEY_GUARD_NPC_ID = "y_gardien_cle_npc"
export const KEY_GUARD_NAME = "GARDIEN DES CLÉS"
export const KEY_GUARD_SPRITE = "/yellow/sprites/npc_gardien_cle_gen3.png"
export const KEY_GUARD_MAP_ID = "yellow_entrance"
/** À droite de la porte du GYM (36,10) de la Ville Jaune. */
export const KEY_GUARD_POS = { x: 37, y: 10 } as const

/** Le gardien se tient devant le GYM quand la prochaine arène DU GYM est l'Électrik (badge Feu, pas Électrik) et
 *  qu'il n'a pas encore été battu. Les joueurs qui ont déjà le badge Électrik (ou Eau) ne le croisent jamais. */
export function keyGuardActive(badges: readonly string[], guardBeaten: boolean): boolean {
    return badges.includes("feu") && !badges.includes("elec") && !badges.includes("eau") && !guardBeaten
}

/** Nombre d'arènes « historiques » gagnées, SANS le bateau. Les paliers calibrés sur l'ancien ordre à 5 arènes
 *  (panthères d'ACE, coût des attaques en fun, niveau de l'Archiviste) le gardent : le badge ANCRE ne doit pas
 *  avancer ces paliers d'une arène (sinon l'Électrik et la suite deviendraient plus chères / plus dures). */
export function gymBadgeCount(badges: readonly string[]): number {
    return badges.filter((b) => b !== BOAT_BADGE).length
}

/** Sans le badge ANCRE : l'histoire du voleur. */
export const KEY_GUARD_STORY_LINES: readonly string[] = [
    "*Un gardien à l'air abattu se tient devant la porte du GYM, un trousseau vide à la ceinture.*",
    "« Halte ! La prochaine arène est FERMÉE. Cette nuit, un VOLEUR m'a dérobé la CLÉ de la porte… »",
    "« Il a filé de l'autre côté de la GROTTE GELÉE, jusqu'à la PLAGE, et il s'est caché à bord du BATEAU. »",
    "« Ce bateau, c'est une ARÈNE à lui tout seul : bats TOUT l'équipage, les 4 matelots ET les 2 capitaines, et ils te remettront la clé — avec un badge en prime. »",
    "« Reviens me voir avec la clé. Pas avant. »",
]
/** Avec le badge ANCRE (la clé en poche) : le défi, puis le combat. */
export const KEY_GUARD_CHALLENGE_LINES: readonly string[] = [
    "« Cette CLÉ… c'est bien la mienne ! Tu as vaincu tout l'équipage du bateau ? »",
    "« Pas si vite. Avant de t'ouvrir cette porte, je dois vérifier que tu es à la hauteur de l'arène qui t'attend derrière. »",
    "« En garde ! »",
]
/** Après sa défaite (dialogue post-combat) : la porte s'ouvre. */
export const KEY_GUARD_VICTORY_LINES: readonly string[] = [
    "« Tu as l'étoffe d'un vrai dresseur. Je reprends ma clé… »",
    "*Le gardien déverrouille la porte du GYM et s'écarte. L'arène suivante t'attend !*",
]
/** Le dernier membre de l'équipage battu : le capitaine remet le badge ANCRE et la clé volée. */
export const BOAT_KEY_LINES: readonly string[] = [
    "*Tout l'équipage est à terre. Le CAPITAINE VAGUE s'avance, une clé dorée au bout des doigts.*",
    "« Mille sabords… personne n'avait jamais vaincu tout mon équipage ! Tu mérites le BADGE ANCRE ⚓. »",
    "« Et tiens : on a attrapé un voleur à fond de cale, avec CETTE CLÉ. Elle ouvre l'arène de la Ville Jaune. Rapporte-la au GARDIEN DES CLÉS, devant le GYM. »",
]

// ── La CT EXCLUSIVE du bateau (22/10/2026) : une par run, remise avec la clé ─────────────────────────────────────
/** CT du bateau selon le run : run 1 = Chant Naufrageur (ct80), run 2 = Maelström Vorace (ct81), run 3 = Arc Plasma (ct82). */
const BOAT_CT_BY_RUN: Record<"live" | "ngplus" | "run3", string> = { live: "ct80", ngplus: "ct81", run3: "ct82" }
export function boatCtForRun(run: string): string | null { return (BOAT_CT_BY_RUN as Record<string, string>)[run] ?? null }
/** Réplique du Capitaine Vague, ajoutée à la remise de la clé. */
export function boatCtLine(moveName: string): string {
    return `« Et prends ceci : la CT ${moveName.toUpperCase()}, la botte secrète de mon équipage. Personne d'autre ne te l'apprendra ! »`
}
/** Pour qui avait DÉJÀ battu tout l'équipage avant que la CT existe : elle arrive par la mer. */
export function boatCtBackfillLines(moveName: string): string[] {
    return [
        "*Une bouteille à la mer s'échoue à tes pieds, scellée à la cire bleue du Capitaine Vague.*",
        `« Tu as vaincu tout mon équipage avant même que j'aie de quoi te récompenser ! Voici ton dû : la CT ${moveName.toUpperCase()}, la botte secrète de l'Aqua Arena. »`,
        `🎁 Tu reçois la CT « ${moveName} » ! Apprends-la à un Daemon compatible — cadeau unique.`,
    ]
}

/** Où se trouve la PROCHAINE arène, annoncé dans la fenêtre « badge obtenu » (« forcer les gens à voyager »). */
export function nextArenaHint(badge: string): string | null {
    switch (badge) {
        case "plante": return "🏛️ La prochaine arène t'attend derrière la MÊME porte du GYM : le bâtiment se réorganise à chaque badge."
        case "roche": return "🏛️ La 3ᵉ arène t'attend, elle aussi, derrière la porte du GYM de la Ville Jaune."
        case "feu": return "⚓ La 4ᵉ arène est en MER : traverse la Grotte Gelée jusqu'à la Plage, le BATEAU est à quai."
        case "ancre": return "🗝️ Rapporte la CLÉ au GARDIEN, devant le GYM de la Ville Jaune : la 5ᵉ arène t'y attend."
        case "elec": return "💧 La 6ᵉ et dernière arène t'attend à CENDREVILLE."
        case "eau": return "🏆 Les SIX badges sont réunis : la Ligue t'attend au sud de Cendreville."
        default: return null
    }
}

// ── REPRISE des parties d'avant l'arène 4 ─────────────────────────────────────────────────────────────────────────
/** Badges d'un joueur AVEC le badge ANCRE implicite : quiconque a déjà le badge Électrik ou Eau a franchi l'étape du
 *  bateau sous l'ancien ordre → il compte comme acquis (sert aussi aux lectures serveur de saves pas encore reprises).
 *  « ancre » est inséré AVANT « elec » (ou « eau ») pour garder le dernier badge gagné en dernière position. */
export function withImpliedAncre(badges: readonly string[]): string[] {
    if (badges.includes(BOAT_BADGE) || !(badges.includes("elec") || badges.includes("eau"))) return [...badges]
    const at = badges.indexOf("elec") >= 0 ? badges.indexOf("elec") : badges.indexOf("eau")
    return [...badges.slice(0, at), BOAT_BADGE, ...badges.slice(at)]
}

export interface BoatMigrationInput { badges?: readonly string[]; defeatedTrainers?: readonly string[]; items?: Record<string, number>; repsCap?: number; ananasLastBadgeCount?: number }
export interface BoatMigrationResult { badges: string[]; items: Record<string, number>; repsCap: number; ananasLastBadgeCount: number; changed: boolean }
/** Reprise au CHARGEMENT d'un monde (idempotente) :
 *   • badge Électrik ou Eau déjà gagné → badge ANCRE offert (+ `capBonus` de plafond, comme un vrai badge) ; le
 *     compteur du combat ANANAS (1 combat par nouveau badge) suit, sinon ce badge offert rouvrirait un combat gratuit ;
 *   • tout l'équipage du bateau déjà battu, sans Électrik → badge ANCRE + la CLÉ (badge vraiment mérité → l'Ananas
 *     s'ouvre comme pour n'importe quel badge).
 *  `capBonus` = 0 en run 3 (plafond fixe du concours), BADGE_REPS_CAP_BONUS sinon. */
export function migrateBoatBadge(w: BoatMigrationInput, capBonus: number): BoatMigrationResult {
    const badges = [...(w.badges ?? [])]
    const items = { ...(w.items ?? {}) }
    const repsCap = w.repsCap ?? 0
    const ananas = w.ananasLastBadgeCount ?? 0
    if (badges.includes(BOAT_BADGE)) return { badges, items, repsCap, ananasLastBadgeCount: ananas, changed: false }
    const beaten = new Set(w.defeatedTrainers ?? [])
    const pastIt = badges.includes("elec") || badges.includes("eau")
    if (pastIt) {
        // Ananas déjà joué pour le dernier badge → le badge offert ne rouvre rien ; un combat encore dû reste dû.
        const ananasLastBadgeCount = ananas >= badges.length ? badges.length + 1 : ananas
        return { badges: withImpliedAncre(badges), items, repsCap: repsCap + capBonus, ananasLastBadgeCount, changed: true }
    }
    if (boatArenaCleared((id) => beaten.has(id))) {
        items[ARENA_KEY_ITEM_ID] = Math.max(1, items[ARENA_KEY_ITEM_ID] ?? 0)
        return { badges: [...badges, BOAT_BADGE], items, repsCap: repsCap + capBonus, ananasLastBadgeCount: ananas, changed: true }
    }
    return { badges, items, repsCap, ananasLastBadgeCount: ananas, changed: false }
}
