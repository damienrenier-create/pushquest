// src/lib/gamebook/yellow/data/clans.ts
//
// Nexus Jaune Éclair — LES 3 CLANS (Chapelle de Nouillon, Ville Jaune).
// Un joueur prête serment à UN clan par run (gate : arène 1 battue), IRRÉVERSIBLE dans le run.
// Le chef offre le Daemon-clan (stade 1, niv 5), puis récompense sa croissance : niv 50 → CT du clan,
// niv 80 → Transcendance (1× par partie). Entraînement quotidien (mon clan ×2 XP ; clans rivaux ×3
// coût/XP, gate par le triangle). Les 3 lignées ne pop JAMAIS en sauvage : uniquement via le pacte.
//
// TRIANGLE (table des types) : VOL ×2 → COMBAT ×2 → ROCHE ×2 → VOL. Donc :
//   Air domine Combat (proie) et est dominé par Roche (prédateur) ; etc.

import type { PokeType } from "../battle/types"

export type ClanKey = "air" | "combat" | "roche"
export const CLAN_KEYS: ClanKey[] = ["air", "combat", "roche"]

export interface ClanData {
    key: ClanKey
    name: string                 // libellé affiché ("clan de l'Air")
    emoji: string
    type: PokeType               // type du clan (100% de l'équipe du chef)
    chiefNpcId: string           // PNJ chef sur la map yellow_sbire
    starterId: string            // Daemon-clan offert (stade 1)
    lineIds: [string, string, string] // les 3 stades de la lignée signature
    finalId: string              // stade final = AS du chef en entraînement
    ctId: string                 // CT du clan offerte au niv 50
    roster: string[]             // équipe d'entraînement du chef (AS = finalId en dernier)
    prey: ClanKey                // le clan que CE clan DOMINE (super-efficace dessus)
    predator: ClanKey            // le clan qui DOMINE ce clan
}

/** CT ULTIME (niv 80), commune aux 3 clans, 1× par partie. */
export const TRANSCENDANCE_CT_ID = "ct70"

/** Jalons de niveau du Daemon-clan. */
export const CLAN_CT_LEVEL = 50           // → CT du clan
export const CLAN_TRANSCENDANCE_LEVEL = 80 // → Transcendance (1×/partie)

/** Nombre de badges d'arène requis pour prêter serment (« avoir battu l'arène 1 »). */
export const CLAN_JOIN_MIN_BADGES = 1

export const CLANS: Record<ClanKey, ClanData> = {
    air: {
        key: "air", name: "clan de l'Air", emoji: "🌬️", type: "VOL",
        chiefNpcId: "y_clan_air",
        starterId: "pivinci", lineIds: ["pivinci", "vengbec", "picassault"], finalId: "picassault",
        ctId: "ct67",
        roster: ["oragron", "necrocorbe", "givroptere", "toucanyon", "draconarque", "picassault"],
        prey: "combat", predator: "roche",
    },
    combat: {
        key: "combat", name: "clan du Combat", emoji: "💪", type: "COMBAT",
        chiefNpcId: "y_clan_combat",
        starterId: "lapifrappe", lineIds: ["lapifrappe", "lapunch", "lievrocogne"], finalId: "lievrocogne",
        ctId: "ct68",
        roster: ["maitrezenc", "tauricendre", "druidours", "enclumind", "coccimperatrice", "lievrocogne"],
        prey: "roche", predator: "air",
    },
    roche: {
        key: "roche", name: "clan de la Roche", emoji: "🪨", type: "ROCHE",
        chiefNpcId: "y_clan_roche",
        starterId: "fujipanda", lineIds: ["fujipanda", "kilipanda", "pandapurna"], finalId: "pandapurna",
        ctId: "ct69",
        // Mottoche inclus dans le pool Roche (scale en Mégalithe via speciesAtLevel) — cf. demande Sartay.
        roster: ["mottoche", "rocosaure", "magmator", "crapotaure", "amadiam", "pandapurna"],
        prey: "air", predator: "combat",
    },
}

/** Toutes les espèces des 3 lignées signatures (9). Sert au check de jalousie + à l'appartenance. */
export const ALL_CLAN_LINE_IDS: readonly string[] = CLAN_KEYS.flatMap((k) => CLANS[k].lineIds)

/** Clan auquel appartient une ESPÈCE (via sa lignée signature), ou null si l'espèce n'est pas une signature. */
export function clanOfSpecies(speciesId: string): ClanKey | null {
    for (const k of CLAN_KEYS) if (CLANS[k].lineIds.includes(speciesId)) return k
    return null
}

/** Clan géré par un PNJ chef (via son id), ou null. */
export function clanOfChief(npcId: string): ClanKey | null {
    return CLAN_KEYS.find((k) => CLANS[k].chiefNpcId === npcId) ?? null
}

/** Relation d'un clan CIBLE vis-à-vis de MON clan : "self" | "prey" (je le domine) | "predator" (il me domine). */
export function clanRelation(mine: ClanKey, target: ClanKey): "self" | "prey" | "predator" {
    if (mine === target) return "self"
    return CLANS[mine].prey === target ? "prey" : "predator"
}

/** Marqueur JOURNALIER d'entraînement (dans defeatedTrainers, per-monde → reset au NG+). 1 combat/clan/jour. */
export function clanTrainDailyMarker(clan: ClanKey, today: string): string {
    return `clan_train_${clan}_${today}`
}
