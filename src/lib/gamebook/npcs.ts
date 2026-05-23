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
    // v3.11 — dialogue conditionnel : utilisé à la place de dialoguesAfter si
    // le flag piaffiniRescued du joueur est true (clôture narrative JOJO/JOJETTE).
    dialoguesAfterPiaffini?: string[]
    // v3.11 — pool de dialogues aléatoires : si défini, on tire un random à chaque
    // interaction. Prime sur dialoguesAfter. Utilisé par le Blagueur de la Tour.
    randomDialogues?: string[][]
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
    // v3.11 — Dialogue conditionnel selon piaffiniRescued :
    //   - false : il cherche son animal (dialogue d'attente)
    //   - true (1ère fois post-rescue) : géré inline dans MapClient (cadeau Set de Nage)
    //   - true (visites suivantes) : dialogue court de remerciement
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
        // v3.11 — après le sauvetage de PIAFFINI, dialogue par défaut (visites répétées)
        // Le 1er passage déclenche le cadeau Set de Nage via une cinématique spéciale gérée
        // dans MapClient (pas dans dialoguesAfterPiaffini, qui sert pour les visites suivantes).
        dialoguesAfterPiaffini: [
            "Merci encore d'avoir ramené PIAFFINI.",
            "Va profiter de ton équipement de nage !",
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
    // v3.11 — Dialogue conditionnel selon piaffiniRescued (clôture narrative)
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
        dialoguesAfterPiaffini: [
            "J'ai entendu pour PIAFFINI ! C'est merveilleux.",
            "Mon frère devait être tellement heureux de le revoir.",
            "Profite bien de tes cadeaux !",
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
    // v3.8.1 — FUSILLI : wanderer qui parle de la Tour des Pâtes Aiguës
    // (indice narratif — c'est là que l'animal de JOJO se cache)
    // -------------------------------
    {
        id: "fusilli",
        name: "FUSILLI",
        mapId: "pepiteville",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#e8a050" },
        initialX: 9,
        initialY: 4,
        wanderRadius: 3,
        dialoguesAfter: [
            "Eh ! Toi là !",
            "Tu sais quoi ? J'ai vu un drôle d'oiseau au sommet de la TOUR DES PÂTES AIGUËS.",
            "Bon, en vrai, je suis pas sûr que ce soit un oiseau.",
            "Plutôt un truc... duveteux. Bizarre. Avec un regard qui dit 'sauve-moi'.",
            "Si tu trouves la Tour un jour, monte. Tu m'en diras des nouvelles.",
            "(Il repart en chantonnant, l'air rêveur.)",
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

    // ============================================================
    // v3.8.2 — TOUR DES PÂTES AIGUËS (Hautes-Pâtes)
    // ============================================================

    // -------------------------------
    // PIAFFINI — l'oiseau de JOJO, au sommet de la Tour (étage 5)
    // v3.11 — Cinématique de sauvetage déclenchée automatiquement quand le joueur
    // arrive à 1 case de PIAFFINI (gérée dans MapClient). Le dialogue ci-dessous
    // ne sert plus que pour les visites POST-rescue (visite touristique).
    // -------------------------------
    {
        id: "piaffini",
        name: "PIAFFINI",
        mapId: "tower_floor_5",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#f0d040", emoji: "🐦" },
        initialX: 3,
        initialY: 3,
        dialoguesAfter: [
            "(Le perchoir est vide. PIAFFINI est rentré avec toi à Bourg-Boulette.)",
        ],
    },

    // ============================================================
    // v3.11 — PNJ de foreshadowing dans la Tour des Pâtes Aiguës
    // ============================================================

    {
        id: "tower_rumeur_oiseau",
        name: "RUMEUR",
        mapId: "tower_floor_2",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a0a8d0" },
        initialX: 3,
        initialY: 5,
        dialoguesAfter: [
            "On raconte qu'au sommet de cette tour, il y aurait un oiseau triste...",
            "...qui chante des mélodies tristes.",
            "Personne ne l'a vu, mais on l'entend parfois.",
        ],
    },
    {
        id: "tower_blagueur",
        name: "PASTAFAR",
        mapId: "tower_floor_3",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#f0c050" },
        initialX: 2,
        initialY: 5,
        dialoguesAfter: [
            "(Il prépare une blague en silence.)",
        ],
        randomDialogues: [
            [
                "*Il se tient là, l'air sérieux.*",
                "Pourquoi est-ce que les pâtes sont sportives ?",
                "...",
                "Parce qu'elles ont la forme.",
                "*Personne ne rit.*",
            ],
            [
                "Pourquoi le penne avait honte ?",
                "Parce qu'il avait vu l'orec-chiette.",
                "*Il rit tout seul.*",
            ],
            [
                "Mon père m'a dit un jour :",
                "\"Mon fils, ne joue pas avec la nourriture.\"",
                "Du coup, je joue avec MOI. *clin d'œil*",
            ],
            [
                "Sais-tu pourquoi les fettucine sont mauvaises au foot ?",
                "Parce qu'elles font toujours des passes mal.",
                "Bon je sors.",
            ],
        ],
    },
    {
        id: "tower_rumeur_herbes",
        name: "RUMEUR",
        mapId: "tower_floor_3",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a0d0a0" },
        initialX: 6,
        initialY: 5,
        dialoguesAfter: [
            "Méfie-toi des hautes herbes du sud, plus loin que la mer.",
            "Mon cousin a essayé de les traverser une fois.",
            "Il est revenu plein de morsures de bestioles. Plus jamais.",
        ],
    },
    {
        id: "tower_rumeur_concours",
        name: "RUMEUR",
        mapId: "tower_floor_4",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#d0a0a0" },
        initialX: 5,
        initialY: 4,
        dialoguesAfter: [
            "Tu sais qu'il y a un concours intersalle de muscu chaque année ?",
            "Sur une île au sud de Bourg-Boulette.",
            "Cette année il paraît qu'il est annulé. Bizarre, hein ?",
        ],
    },

    // ============================================================
    // v3.12 — PÊCHEUR (foreshadowing du canal au sud de Bourg-Boulette)
    // ============================================================
    {
        id: "fisher",
        name: "MORUE",
        mapId: "bourgpates",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#5080a8" },
        initialX: 9,
        initialY: 14,
        dialoguesAfter: [
            "J'aurais tellement voulu aller au concours de muscu cette année...",
            "Il paraît qu'il y a une île magnifique de l'autre côté de cette mer.",
            "Mais sans maillot ni palmes, impossible d'y arriver.",
            "Si tu trouvais ça quelque part, tu pourrais explorer là-bas.",
        ],
    },

    // ============================================================
    // v3.12 — PNJ tristes de MACARON'ÎLE (concours annulé)
    // ============================================================
    {
        id: "macaron_triste_1",
        name: "PENNE",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a07060" },
        initialX: 4,
        initialY: 14,
        dialoguesAfter: [
            "Cette année, le concours est annulé...",
            "Quelle déception.",
        ],
    },
    {
        id: "macaron_triste_2",
        name: "RIGATO",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#8090b0" },
        initialX: 5,
        initialY: 15,
        dialoguesAfter: [
            "Des bestioles ont infesté la route du sud.",
            "Personne ne peut amener les inscriptions au village muscu.",
        ],
    },
    {
        id: "macaron_triste_3",
        name: "FARFALL",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#b0a090" },
        initialX: 8,
        initialY: 15,
        dialoguesAfter: [
            "On dit qu'il faudrait un animal spécial pour les faire fuir.",
            "Mais lequel ? Personne ne sait.",
        ],
    },
    {
        id: "macaron_triste_4",
        name: "ORZO",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#80b0a0" },
        initialX: 8,
        initialY: 14,
        dialoguesAfter: [
            "J'avais tellement préparé mes pectoraux pour rien...",
            "*Il soupire profondément.*",
        ],
    },
    {
        id: "macaron_triste_5",
        name: "BUCATINI",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c0a0a0" },
        initialX: 7,
        initialY: 16,
        dialoguesAfter: [
            "Si seulement quelqu'un de courageux pouvait nous aider...",
            "*Il te regarde avec espoir, puis se ravise.*",
            "Bof, c'est mort de toute façon.",
        ],
    },

    // ============================================================
    // v3.13 — PNJ DE MACARON'ÎLE VILLE
    // ============================================================

    // -------------------------------
    // TRENETTE — vendeur du shop_macaron, frère de NUTRIPATES
    // -------------------------------
    {
        id: "shop_keeper_macaron",
        name: "TRENETTE",
        mapId: "shop_macaron",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#6090d0" },
        initialX: 4,
        initialY: 2,
        dialoguesAfter: [
            "Yo. Moi c'est TRENETTE.",
            "Mon frère NUTRIPATES tient le shop à Pépiteville. Lui c'est le sérieux.",
            "Moi je vends ce qu'il refuse de vendre. Trucs exotiques, gadgets, conserves.",
            "Sers-toi.",
        ],
    },

    // ============================================================
    // v3.16 — HAUTES HERBES DU SUD (bestioles bloqueuses)
    // ============================================================
    {
        id: "bestiole_centrale",
        name: "BESTIOLE",
        mapId: "grass_sud",
        kind: "static",
        interaction: "interceptor",
        sprite: { color: "#806040", emoji: "🐛" },
        initialX: 4,
        initialY: 7,
        dialoguesAfter: [
            "BZZZ BZZ ! Tu vas où comme ça ?",
            "T'as pas l'air assez impressionnant pour nous faire fuir.",
            "Reviens quand tu auras un compagnon plus costaud.",
        ],
    },

    // ============================================================
    // v3.16 — MUSCUVILLE (village des athlètes, stub)
    // ============================================================
    {
        id: "muscuman_greeter",
        name: "MUSCUMAN",
        mapId: "muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a06030" },
        initialX: 4,
        initialY: 5,
        dialoguesAfter: [
            "Bienvenue à MUSCUVILLE, athlète !",
            "Tu as franchi les hautes herbes — personne n'avait osé depuis des mois.",
            "Le concours intersalle est toujours annulé... mais peut-être qu'avec toi, on pourrait le relancer.",
            "(Il te regarde, plein d'espoir, mais ne dit rien de plus.)",
        ],
    },
    {
        id: "muscuville_athlete",
        name: "GRAS-DOUBLE",
        mapId: "muscuville",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#c08030" },
        initialX: 8,
        initialY: 5,
        wanderRadius: 2,
        dialoguesAfter: [
            "Yo nouveau ! Tu te dopes aux pâtes ?",
            "Les meilleures années, on organisait des concours énormes ici.",
            "Pectoraux contre pectoraux, abdos contre abdos.",
            "Là c'est annulé. Snif.",
        ],
    },
    {
        id: "muscuville_coach",
        name: "GLUTOS",
        mapId: "muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#604020" },
        initialX: 2,
        initialY: 9,
        dialoguesAfter: [
            "Coach GLUTOS, à ton service.",
            "Si un jour le concours reprend, viens t'entraîner ici.",
            "Pour l'instant je perfectionne mes deadlifts. Tout seul.",
        ],
    },

    // -------------------------------
    // v3.15 — BIBLIO : bibliothécaire de Macaron'île
    // -------------------------------
    {
        id: "bibliotheque_keeper",
        name: "BIBLIO",
        mapId: "bibliotheque",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a07090" },
        initialX: 5,
        initialY: 2,
        dialoguesAfter: [
            "Chuuut... Bienvenue dans la bibliothèque.",
            "Tu cherches un savoir ancien sur les hautes herbes du sud ?",
            "Aucun livre ne donne LA réponse, mais beaucoup parlent d'un animal capable d'effrayer les bestioles.",
            "(Elle te tend un livre poussiéreux intitulé 'BESTIOLES & TERROIRS'.)",
            "Reviens quand tu auras un compagnon assez grand pour les défier.",
        ],
    },

    // -------------------------------
    // V3T — vétérinaire de Macaron'île
    // -------------------------------
    {
        id: "veterinaire_keeper",
        name: "V3T",
        mapId: "veterinaire",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#80c090" },
        initialX: 5,
        initialY: 2,
        dialoguesAfter: [
            "Bienvenue chez la vétérinaire de Macaron'île.",
            "Tu as un animal blessé ? Un compagnon à examiner ?",
            "(Elle regarde derrière toi.)",
            "Tu n'as personne avec toi. Repasse quand tu auras un copain à plumes ou à pâtes.",
        ],
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

export interface NpcDialogueFlags {
    /** v3.11 — true si le joueur a sauvé PIAFFINI (override JOJO et JOJETTE) */
    piaffiniRescued?: boolean
}

/**
 * Sélectionne les dialogues pour un PNJ selon la phase du joueur et ses flags.
 *
 * Ordre de priorité :
 *   1. phase "explore" + dialoguesBefore défini → dialoguesBefore
 *   2. randomDialogues défini → pick aléatoire dans le pool
 *   3. flag piaffiniRescued + dialoguesAfterPiaffini défini → dialoguesAfterPiaffini
 *   4. fallback → dialoguesAfter
 */
export function getNpcDialogue(
    npc: NpcDefinition,
    playerPhase: "explore" | "introMonster" | "playing",
    flags: NpcDialogueFlags = {},
): string[] {
    if (playerPhase !== "playing" && npc.dialoguesBefore) {
        return npc.dialoguesBefore
    }
    if (npc.randomDialogues && npc.randomDialogues.length > 0) {
        const pool = npc.randomDialogues
        return pool[Math.floor(Math.random() * pool.length)]
    }
    if (flags.piaffiniRescued && npc.dialoguesAfterPiaffini) {
        return npc.dialoguesAfterPiaffini
    }
    return npc.dialoguesAfter
}
