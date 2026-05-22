// src/lib/gamebook/npcs.ts
//
// Système de PNJ (Personnages Non Joueurs) du Gamebook.
//
// 2 TYPES de PNJ :
//   - "interceptor" : bloque le passage, dialogue obligatoire dès qu'on est adjacent (ex: PNJ du pont)
//   - "interactive" : on peut lui parler en appuyant sur A, mais on peut aussi l'ignorer
//
// MOUVEMENT :
//   - Les PNJ baladeurs (kind === "wanderer") bougent toutes les ~12s
//   - Position calculée de manière DÉTERMINISTE basée sur leur seed + le timestamp courant
//   - Tous les utilisateurs voient les mêmes positions à un instant T (pas de DB nécessaire)
//   - L'animation est arrondie sur des "buckets" de 12 secondes pour que ça ne flicker pas

import type { Direction, MapData } from "./mapEngine"
import { isBlockingTile } from "./mapEngine"

// ============================================================
// TYPES
// ============================================================
export type NpcKind = "static" | "wanderer"
export type NpcInteraction = "interceptor" | "interactive"

export interface NpcDefinition {
    id: string
    name: string
    mapId: string                          // sur quelle carte ce PNJ existe
    kind: NpcKind                          // static ou se balade
    interaction: NpcInteraction            // intercepte ou attend
    sprite: { color: string; emoji?: string }
    // Position initiale (ou centre de patrouille pour wanderers)
    initialX: number
    initialY: number
    // Pour les wanderers : rayon de patrouille autour de la position initiale
    wanderRadius?: number
    // Dialogues
    dialoguesBefore?: string[]   // avant la rencontre du Monstre
    dialoguesAfter: string[]     // après la rencontre du Monstre (ou phase "playing")
    // Récompense unique (ex: gym guy donne 100 reps)
    energyReward?: number        // si défini, donne X reps une fois
}

// ============================================================
// FRÉQUENCE DE MOUVEMENT
// ============================================================
export const WANDER_TICK_MS = 12_000  // 12 secondes par "pas"

// ============================================================
// DÉFINITIONS DES PNJ
// ============================================================
export const NPCS: NpcDefinition[] = [
    // -------------------------------
    // PNJ MUSCU (dans la salle de gym)
    // -------------------------------
    {
        id: "gym_guy",
        name: "BUFFY",
        mapId: "gym",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#d8a020" },
        initialX: 5,
        initialY: 4,
        dialoguesBefore: [
            "Salut !",
            "Je fais de la muscu non-stop, je sais plus quoi faire de toute cette énergie.",
            "Pourquoi je te dis ça à toi ? T'as l'air un peu paumé.",
            "Va voir le Monstre dans les hautes herbes, il t'expliquera.",
        ],
        dialoguesAfter: [
            "Ah ! Tu reviens du Monstre !",
            "Tiens, prends ça. 100 reps de surplus.",
            "Tu vas en avoir besoin pour explorer.",
            "Allez file. Et reviens jamais. Enfin, reviens si tu veux.",
        ],
        energyReward: 100,
    },

    // -------------------------------
    // PNJ CHERCHEUR D'ANIMAL (Bourg-Boulette, baladeur)
    // -------------------------------
    {
        id: "pet_seeker",
        name: "JOJO",
        mapId: "bourgpates",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#48a830" },
        initialX: 5,
        initialY: 9,
        wanderRadius: 2,
        dialoguesAfter: [
            "Bonjour !",
            "T'as pas vu mon animal de compagnie ?",
            "Il est parti je sais pas où, sûrement vers le nord.",
            "Si tu le trouves, ramène-le moi. Ça fera plaisir à tout le monde.",
            "(Tu sens qu'il a quelque chose en réserve pour toi si tu reviens avec...)",
        ],
    },

    // ============================================================
    // v3.8 — NPCs de PÉPITEVILLE
    // ============================================================

    // -------------------------------
    // PEPITO — donne le sac au premier passage
    // -------------------------------
    {
        id: "pepito",
        name: "PEPITO",
        mapId: "pepiteville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a06030" },
        initialX: 8,
        initialY: 16,
        dialoguesAfter: [
            // Dialogue par défaut (post-don de sac). Le dialogue de don est géré
            // séparément dans MapClient via la route grant-bag pour l'idempotence.
            "Tu reviens. T'as ton sac, c'est l'essentiel.",
            "Va dépenser ton énergie utilement. Ou pas. Je m'en tape.",
        ],
    },

    // -------------------------------
    // JOJETTE — sœur de JOJO, cherche l'animal de son frère
    // -------------------------------
    {
        id: "pet_seeker_sister",
        name: "JOJETTE",
        mapId: "pepiteville",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#d050a0" },
        initialX: 5,
        initialY: 11,
        wanderRadius: 2,
        dialoguesAfter: [
            "Salut !",
            "Mon frère JOJO m'a envoyée chercher son animal jusqu'ici.",
            "Apparemment il l'aurait vu traîner près du Pont Pépite.",
            "S'il te dit quoi que ce soit, fais-moi remonter l'info.",
            "(Elle te sourit, manifestement plus calme que JOJO.)",
        ],
    },

    // -------------------------------
    // RAVIOLI — wanderer décoratif
    // -------------------------------
    {
        id: "ravioli",
        name: "RAVIOLI",
        mapId: "pepiteville",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#f0a050" },
        initialX: 11,
        initialY: 11,
        wanderRadius: 2,
        dialoguesAfter: [
            "Pépiteville, c'est petit mais c'est joli.",
            "Le bassin aux lasagnes est moins profond qu'il en a l'air.",
            "Si tu veux des sensations, va au casino. Si tu veux te muscler, va au gymnase.",
        ],
    },

    // -------------------------------
    // LINGUINI — wanderer décoratif
    // -------------------------------
    {
        id: "linguini",
        name: "LINGUINI",
        mapId: "pepiteville",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#90b040" },
        initialX: 12,
        initialY: 16,
        wanderRadius: 2,
        dialoguesAfter: [
            "Je suis LINGUINI, mais on m'appelle aussi 'Le Long'.",
            "Pas de raison particulière. C'est comme ça.",
            "Tu cherches quelque chose ? Le shop est à droite.",
        ],
    },

    // -------------------------------
    // NUTRIPATES — vendeur du shop, statique derrière le comptoir
    // -------------------------------
    {
        id: "shop_keeper",
        name: "NUTRIPATES",
        mapId: "shop_interior",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#8050d0" },
        initialX: 4,
        initialY: 2,
        dialoguesAfter: [
            // Dialogue par défaut. La logique d'ouverture du shop vs refus (pas de sac)
            // est gérée dans MapClient via le check `hasBag` et le rendu de ShopModal.
            "Bienvenue dans la boutique. Que veux-tu ?",
        ],
    },

    // -------------------------------
    // DURUM — donneur d'énergie (style BUFFY) dans gym_pepite
    // -------------------------------
    {
        id: "durum",
        name: "DURUM",
        mapId: "gym_pepite",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c0d030" },
        initialX: 5,
        initialY: 4,
        dialoguesAfter: [
            "Yo. Bienvenue dans MON gymnase.",
            "BUFFY de Bourg-Boulette, c'est mon cousin. On a tous les deux trop d'énergie.",
            "Tiens, 50 reps en cadeau. Pas plus, faut bien que je garde mon style.",
            "Maintenant fous le camp, j'ai des biceps à entretenir.",
        ],
        energyReward: 50,
    },
]

// ============================================================
// MOUVEMENT DÉTERMINISTE
// ============================================================

// Hash déterministe d'une chaîne (utilisé comme seed)
function hashString(s: string): number {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0
    }
    return Math.abs(hash)
}

// PRNG déterministe (Mulberry32) seeded
function seededRandom(seed: number): () => number {
    let a = seed
    return () => {
        a |= 0
        a = (a + 0x6D2B79F5) | 0
        let t = Math.imul(a ^ (a >>> 15), 1 | a)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * Calcule la position courante d'un PNJ wanderer à un instant T.
 * - Tick courant = floor(timestamp / WANDER_TICK_MS)
 * - Position = position initiale + offsets aléatoires déterministes
 * - L'offset n'excède pas wanderRadius
 */
export function computeWandererPosition(
    npc: NpcDefinition,
    timestampMs: number,
    map: MapData,
): { x: number; y: number; direction: Direction } {
    if (npc.kind !== "wanderer") {
        return { x: npc.initialX, y: npc.initialY, direction: "down" }
    }
    const radius = npc.wanderRadius ?? 2
    const currentTick = Math.floor(timestampMs / WANDER_TICK_MS)

    // On simule N pas de marche aléatoire à partir du tick 0
    // Pour la perf, on tronque à 100 pas (suffisant pour la dispersion)
    const STEPS = Math.min(currentTick, 100)
    const rng = seededRandom(hashString(npc.id))

    let x = npc.initialX
    let y = npc.initialY
    let direction: Direction = "down"

    for (let i = 0; i < STEPS; i++) {
        const dirRoll = Math.floor(rng() * 5)  // 0=up, 1=down, 2=left, 3=right, 4=stay
        if (dirRoll === 4) continue

        let nx = x, ny = y
        if (dirRoll === 0) { ny -= 1; direction = "up" }
        else if (dirRoll === 1) { ny += 1; direction = "down" }
        else if (dirRoll === 2) { nx -= 1; direction = "left" }
        else if (dirRoll === 3) { nx += 1; direction = "right" }

        // Contraintes : dans le radius, dans la map, sur une tuile non-bloquante
        const dx = nx - npc.initialX
        const dy = ny - npc.initialY
        if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue
        if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue
        const tile = map.tiles[ny]?.[nx]
        if (!tile || isBlockingTile(tile)) continue

        x = nx
        y = ny
    }

    return { x, y, direction }
}

/**
 * Renvoie la position courante d'un PNJ (static ou wanderer)
 */
export function getNpcCurrentPosition(
    npc: NpcDefinition,
    timestampMs: number,
    map: MapData,
): { x: number; y: number; direction: Direction } {
    if (npc.kind === "static") {
        return { x: npc.initialX, y: npc.initialY, direction: "down" }
    }
    return computeWandererPosition(npc, timestampMs, map)
}

/**
 * Filtre les PNJ pour une map donnée
 */
export function getNpcsForMap(mapId: string): NpcDefinition[] {
    return NPCS.filter((n) => n.mapId === mapId)
}

/**
 * Sélectionne les dialogues pour un PNJ selon la phase du joueur
 */
export function getNpcDialogue(
    npc: NpcDefinition,
    playerPhase: "explore" | "introMonster" | "playing",
): string[] {
    if (playerPhase !== "playing" && npc.dialoguesBefore) {
        return npc.dialoguesBefore
    }
    return npc.dialoguesAfter
}
