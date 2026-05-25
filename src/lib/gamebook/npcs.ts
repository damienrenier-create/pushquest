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
    // v3.17 — dialogue utilisé quand le joueur a DÉJÀ parlé au NPC (revisit).
    // Permet aux 5 PNJ tristes de révéler des indices la 2e fois.
    dialoguesAfterRevisit?: string[]
    // v3.23c-3 — dialogue utilisé quand Macaron'île a été "réveillée" (les 3 défis
    // intersalle ont été remportés au moins par un joueur, propagé via flag joueur).
    // Prime sur dialoguesAfterRevisit / dialoguesAfter.
    dialoguesAfterMacaronAwakened?: string[]
    // v3.23n — pool de dialogues aléatoires utilisé quand le joueur a déjà adopté
    // un tamagotchi (via flag hasTamagotchi). Prime sur dialoguesAfter / Revisit.
    // Ne prend PAS le pas sur dialoguesAfterMacaronAwakened ni dialoguesAfterPiaffini.
    dialoguesAfterTamagotchiAdopted?: string[][]
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
    // v3.22 — MAMAN : nouveau NPC à Bourg-Boulette, juste à la sortie de la cave du Monstre.
    // Offre SAC + BASKETS au premier passage. Empathique, taquine, maternelle.
    // -------------------------------
    {
        id: "maman",
        name: "MAMAN",
        mapId: "bourgpates",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#d050a0" },
        initialX: 12,
        initialY: 14,
        dialoguesAfter: [
            "*Maman te sourit, soulagée.*",
            "Tu manges assez ? Tu dors assez ?",
            "Allez, va. Je vais préparer des pâtes pour ton retour.",
        ],
    },

    // v3.22 — GUIDE INTÉRIEUR : explique que les déplacements dans les bâtiments sont gratuits
    {
        id: "indoor_guide",
        name: "ROULETTE",
        mapId: "bourgpates",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#90b0c0" },
        initialX: 5,
        initialY: 10,
        wanderRadius: 2,
        dialoguesAfter: [
            "Tu sais, le truc cool dans cet archipel ?",
            "Dès que tu entres dans un bâtiment, marcher devient GRATUIT.",
            "Aucune idée pourquoi. Mais profites-en pour explorer les boutiques sans flipper.",
        ],
    },

    // v3.22 — GUIDE VOYAGE : explique le fast travel
    {
        id: "travel_guide",
        name: "VAGABOND",
        mapId: "bourgpates",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#8060d0" },
        initialX: 3,
        initialY: 13,
        dialoguesAfter: [
            "*Le vagabond te regarde avec un sourire entendu.*",
            "Une fois que tu as marché jusqu'à une ville, tu peux y revenir gratis.",
            "Ouvre ton menu (bouton START), choisis VOYAGE, sélectionne la ville. Pouf, t'y es.",
            "Pas besoin de retraverser tout l'archipel à pied à chaque fois.",
        ],
    },

    // -------------------------------
    // PEPITO — donne le sac au premier passage (roue de secours pour ceux qui n'ont pas vu MAMAN)
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
    // v3.17 — RAVIOLI : hint sur les arbres fruitiers cachés du monde
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
            "Hé ! Tu veux savoir un truc cool ?",
            "Y a plein d'arbres à pâtes-fruits planqués partout dans le monde.",
            "Chacun donne 3 fruits par jour, et chaque fruit c'est +80 reps. C'est gratos quoi.",
            "Cherche bien à Pépiteville, à Hautes-Pâtes, partout. Y en a même qui sont à moitié cachés.",
        ],
        dialoguesAfterRevisit: [
            "Encore toi ? OK, indice bonus : un arbre est planqué près des fleurs à Hautes-Pâtes.",
            "Bon courage.",
        ],
    },

    // -------------------------------
    // LINGUINI — wanderer "porte-bonheur" (v3.17 : donne +1 luck/jour)
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
            "Je suis LINGUINI. On dit que je porte chance à qui me parle.",
            "Tiens, prends-en un peu. *Te tape sur l'épaule.*",
            "Bonne journée. Reviens demain si t'en veux encore.",
        ],
        dialoguesAfterRevisit: [
            "Re-bonjour ! Une nouvelle dose de chance pour toi ?",
            "*Te tape sur l'épaule, encore.*",
            "C'est offert. Pas de pression. Reviens demain si jamais.",
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

    // v3.17 — Gardien à l'entrée de la Tour (Floor 1)
    // v3.17c — Ton corrigé : empathique vs PIAFFINI qui est déboussolé, pas dégoûté
    {
        id: "tower_gardien",
        name: "GARDIEN",
        mapId: "tower_floor_1",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a89058" },
        initialX: 2,
        initialY: 8,
        dialoguesAfter: [
            "Oh, salut. Tu viens monter la Tour ?",
            "Le petit piaf en haut... c'est triste, en fait. Il est complètement déboussolé.",
            "Il a perdu ses repères. Il bouge plus beaucoup, il chante plus. Juste là, immobile.",
            "Si tu vois JOJO, dis-lui qu'on a besoin de le récupérer. Le piaf souffre tout seul là-haut.",
        ],
        // Post-PIAFFINI : remerciement empathique
        dialoguesAfterPiaffini: [
            "Tu as ramené PIAFFINI ! Le petit avait tellement besoin de retourner chez JOJO.",
            "Il chante à nouveau, paraît-il. Je suis content pour lui. *Sourit doucement.*",
        ],
    },
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
    // v3.20 — LE MONSTRE (cave, post-bag) — offre l'Amulette
    // Apparait sur la map "cave" quand hasBag=true. Les dialogues conditionnels
    // sont gérés inline dans MapClient (cinematic dédiée).
    // ============================================================
    {
        id: "le_monstre",
        name: "LE MONSTRE",
        mapId: "cave",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#48a830", emoji: "👹" },
        initialX: 4,
        initialY: 3,
        dialoguesAfter: [
            "*Le Monstre te regarde avec un sourire bienveillant.*",
            "Tu reviens enfin. Tu as ton sac, donc tu es prêt.",
            "Tiens, prends ceci. Une amulette que j'ai gardée pour toi. Elle préserve tes affaires.",
            "(Il te tend une amulette d'os finement sculptée.)",
        ],
        // Dialog conditionnel après don : retour visiteur
        dialoguesAfterRevisit: [
            "*Le Monstre acquiesce calmement.*",
            "Que veux-tu de plus ? L'amulette devrait te suffire.",
            "Va. Continue ta route.",
        ],
    },

    // ============================================================
    // v3.17c — CASINOS (Bourg-Boulette + Pépiteville)
    // ============================================================
    // QUESTIONNEUR : Bourg casino — foreshadow de la case cachée +50 reps
    {
        id: "casino_questionneur",
        name: "QUESTIONNEUR",
        mapId: "casino",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#806040" },
        initialX: 3,
        initialY: 4,
        dialoguesAfter: [
            "*Il regarde par terre, distrait.*",
            "Hé toi ! T'aurais pas vu des pièces tombées par terre ?",
            "Je suis SÛR qu'il y a en une planquée quelque part dans cette salle.",
            "Si tu trouves, dis-moi rien, je veux la fierté de la trouver moi-même.",
        ],
        dialoguesAfterRevisit: [
            "Toujours rien ? Mais bordel...",
            "Peut-être sous le tapis ? Ou derrière une machine ?",
        ],
    },
    // GAMBLEUR : Pépi casino — optimiste pathologique
    {
        id: "casino_gambleur",
        name: "GAMBLEUR",
        mapId: "casino_pepite",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c08040" },
        initialX: 3,
        initialY: 4,
        dialoguesAfter: [
            "Salut frère ! J'ai gagné 5 fois cette semaine. CINQ.",
            "Mon astuce ? Toujours rouge. Toujours. Le rouge gagne toujours.",
            "Bon là j'ai perdu mes 5 derniers tours mais c'est statistique, ça va revenir.",
            "Tu joues ? Reviens me voir après, j'te parie que je gagne encore.",
        ],
        dialoguesAfterRevisit: [
            "ALORS ?! T'as joué ?",
            "Moi j'ai perdu encore 3 fois. Mais c'est bon signe, ça revient.",
            "*Il a l'air un peu vide dans les yeux.*",
        ],
    },

    // ============================================================
    // v3.24a — CAPITAINES D'ÉQUIPE (casino de Pépiteville)
    // ============================================================
    // Les 2 capitaines distribuent +30 reps 1×/jour aux membres de leur équipe.
    // Tout est géré en spécial-case côté MapClient + /api/gamebook/team/captain-bonus.
    // Les joueurs sans équipe (Franss) sont accueillis mais ne reçoivent rien.
    // - RED_CAPTAIN  : Mools, Milkardashian, Neuneu
    // - YELLOW_CAPTAIN : Xa, Embi, Gg
    {
        id: "casino_captain_red",
        name: "MARCO",
        mapId: "casino_pepite",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#e74c3c" },
        initialX: 1,
        initialY: 5,
        dialoguesAfter: [
            "*Veste rouge sang, cigare au coin de la bouche.*",
            "Je suis MARCO, capitaine de l'Équipe Rouge.",
            "Mes troupes : Mools, Milkardashian, Neuneu.",
            "Si t'es des miens, j'te file 30 reps par jour. Loyalty fee.",
        ],
        dialoguesAfterRevisit: [
            "Reviens demain pour ton bonus, soldat.",
            "Les Jaunes croient qu'ils sont mieux. Spoiler : ils ne le sont pas.",
        ],
    },
    {
        id: "casino_captain_yellow",
        name: "POLO",
        mapId: "casino_pepite",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#f1c40f" },
        initialX: 8,
        initialY: 5,
        dialoguesAfter: [
            "*Costard jaune banane, lunettes de soleil intérieures.*",
            "POLO, capitaine de l'Équipe Jaune. Enchanté.",
            "Mon roster : Xa, Embi, Gg. Trio doré.",
            "Si t'es à moi, c'est 30 reps par jour. Discrétion garantie.",
        ],
        dialoguesAfterRevisit: [
            "Le bonus, c'est 1× par 24h. Reviens demain.",
            "MARCO ? Ce vieux schnock. Il croit encore que le rouge est la meilleure couleur.",
        ],
    },

    // ============================================================
    // v3.17c — LA MER (îlots dans le canal entre Bourg-Boulette et Macaron'île)
    // ============================================================
    // Naufragé : foreshadow lié à FARFALL (Macaron'île). Flavor only.
    {
        id: "lamer_naufrage",
        name: "NAUFRAGÉ",
        mapId: "la_mer",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#9070a0" },
        initialX: 2,
        initialY: 4,
        dialoguesAfter: [
            "*Il est trempé, accroché à une planche.*",
            "Mon bateau... il a coulé. Quelque part par là. *Il fait un geste vague vers le large.*",
            "Si tu vois quoi que ce soit qui flotte, fais-moi signe. Je suis désespéré.",
        ],
        dialoguesAfterRevisit: [
            "*Il grelotte toujours.*",
            "Tu n'as pas vu mon bateau ? FARFALL à Macaron'île prétend l'avoir aperçu.",
            "Si elle te dit quelque chose, dis-le moi. *Il a les yeux pleins d'espoir.*",
        ],
    },
    // Nageur : 3 niveaux de dialogue (lore → défi 50 pompes → ONE PIECE + indices casinos).
    // Le défi et son completion sont gérés en spécial-case dans MapClient.
    {
        id: "lamer_nageur",
        name: "NAGEUR",
        mapId: "la_mer",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#40b0d8" },
        initialX: 6,
        initialY: 4,
        dialoguesAfter: [
            "Salut salut ! Moi c'est NAGEUR.",
            "Je me balade dans le coin. Je cherche un trésor, quelque part par ici.",
            "Pas de détails. Si jamais tu trouves quelque chose qui brille, fais-moi signe.",
        ],
        // dialoguesAfterRevisit / 3rd-tier sont gérés inline dans MapClient (cf nageur défi).
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
        // v3.23k — Déplacée de (9, 14) → (1, 13) pour libérer l'accès au canal sud élargi
        initialX: 1,
        initialY: 13,
        dialoguesAfter: [
            "J'aurais tellement voulu aller au concours de muscu cette année...",
            "Il paraît qu'il y a une île magnifique de l'autre côté de cette mer.",
            "Mais sans maillot ni palmes, impossible d'y arriver.",
            "Si tu trouvais ça quelque part, tu pourrais explorer là-bas.",
        ],
        // v3.17 — Post-PIAFFINI : reconnaît le swim_set offert par JOJO
        dialoguesAfterPiaffini: [
            "Oh ! T'as ton set de nage ! JOJO te l'a filé, hein ?",
            "Si t'es bien équipé, descends au sud, traverse le canal, et tu trouveras Macaron'île.",
            "C'est là-bas que le concours se passe d'habitude. Va voir TRENETTE au passage, son shop est fourni.",
        ],
    },

    // ============================================================
    // v3.12 — PNJ tristes de MACARON'ÎLE (concours annulé)
    // ============================================================
    // v3.17 — PENNE le pessimiste général
    {
        id: "macaron_triste_1",
        name: "PENNE",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a07060" },
        initialX: 9,
        initialY: 11,
        dialoguesAfter: [
            "*Soupire bruyamment.* T'es nouveau ici ?",
            "Tout va mal. Le concours est annulé. Les bestioles bloquent le sud.",
            "Les hautes herbes te bouffent l'énergie si t'as pas de compagnon.",
            "À ta place, je rentrerais chez moi. Mais bon, t'es libre.",
        ],
        dialoguesAfterRevisit: [
            "Tu reviens ? Sérieux ?",
            "Y a vraiment rien à faire ici. Mais bon, fais comme tu veux.",
        ],
        dialoguesAfterMacaronAwakened: [
            "*PENNE se tient bien droit, l'œil vif.* Tu as conquis le contest_hall ?!",
            "Mon dieu... ça fait des années qu'on attendait ça. Tu sais, j'étais pas TOUJOURS pessimiste.",
            "Tu nous as rendu une raison de croire en quelque chose. Merci.",
        ],
    },
    // v3.17 — RIGATO le factuel/statisticien
    {
        id: "macaron_triste_2",
        name: "RIGATO",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#8090b0" },
        initialX: 11,
        initialY: 11,
        dialoguesAfter: [
            "Données du concours intersalle : 142 inscriptions perdues cette année.",
            "Record sur 8 ans. Les bestioles bloquent l'accès aux athlètes.",
            "Macaron'île économise normalement 12 % de son PIB grâce au tourisme du concours.",
            "Cette année on est en chute libre.",
        ],
        dialoguesAfterRevisit: [
            "Statistique mise à jour : tu es la 4e personne à m'avoir reparlé ce mois.",
            "Marge d'erreur ±0,3 %.",
        ],
        dialoguesAfterMacaronAwakened: [
            "RIGATO recalcule, fébrile. \"Projections révisées : +47 % inscriptions, +12 % PIB, +∞ % moral.\"",
            "\"Tu as débloqué une variable que mes modèles avaient mise à 0. Bravo.\"",
            "*Il sourit, pour la première fois en 18 mois selon mes données.*",
        ],
    },
    // v3.17 — FARFALL le romantique-rêveur — foreshadow naufragé
    {
        id: "macaron_triste_3",
        name: "FARFALL",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#b0a090" },
        initialX: 10,
        initialY: 13,
        dialoguesAfter: [
            "*Regarde vaguement vers l'horizon.* Y'a une silhouette qui flotte au large...",
            "Personne ne sait qui c'est. Un naufragé, peut-être.",
            "S'il pouvait juste raconter d'où il vient. *Il soupire.*",
        ],
        dialoguesAfterRevisit: [
            "Le naufragé est toujours là-bas. Je le sens.",
            "Si tu vas vers la plage et que tu regardes attentivement, peut-être que tu le verras.",
            "*Il a les yeux brillants.*",
        ],
        dialoguesAfterMacaronAwakened: [
            "FARFALL pleure doucement, ému. \"Le concours revient... mon naufragé pourra rentrer.\"",
            "\"Tu as réveillé l'île. Tu sais que tu as réveillé bien plus, non ?\"",
            "*Il regarde l'horizon, les yeux pleins d'espoir.*",
        ],
    },
    // v3.17 — ORZO l'arrogant-frustré — foreshadow trésor casino
    {
        id: "macaron_triste_4",
        name: "ORZO",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#80b0a0" },
        initialX: 8,
        initialY: 11,
        dialoguesAfter: [
            "J'aurais GAGNÉ ce concours, j'te dis. Mes pectoraux étaient prêts à explosion.",
            "Et puis BAM, annulé. Pfff.",
            "Note bien : je suis le seul vrai athlète de cette île de mollassons.",
        ],
        dialoguesAfterRevisit: [
            "Ah, tu reviens vers le grand champion ?",
            "Tiens, un secret : à Bourg-Boulette, dans le casino, y a un coin où des pièces sont tombées par terre.",
            "J'aurais bien été chercher, mais c'est pas digne d'un champion. *Il bombe le torse.*",
        ],
        dialoguesAfterMacaronAwakened: [
            "ORZO te toise. \"Bon. T'as fait ce que JE n'ai pas pu faire. *Il avale sa fierté.*\"",
            "\"Bien joué, hein. Voilà. Je l'ai dit. Ne le répète à personne.\"",
            "*Il sourit malgré lui.* \"On s'entraîne ensemble la prochaine fois ?\"",
        ],
    },
    // v3.17 — BUCATINI le naïf-optimiste (avec son chien Dingo à ses côtés depuis v3.23h)
    // v3.23n — Déplacé près du canal nord (4, 2) pour accueillir le joueur qui arrive de la_mer.
    //          Premier PNJ visible à l'arrivée, oriente vers BIBLIO puis V3T.
    {
        id: "macaron_triste_5",
        name: "BUCATINI",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c0a0a0" },
        initialX: 4,
        initialY: 2,
        dialoguesAfter: [
            "Oh ! Bonjour ! C'est sympa que tu sois là.",
            "*Il caresse son chien.* Voici Dingo, mon meilleur ami. Tu en veux un comme lui, non ?",
            "Va à la bibliothèque ! BIBLIO a tout un rayon sur les animaux. Tu y trouveras le tien et la liste des défis à faire pour qu'il t'aime.",
            "Et après tu pourras passer chez V3T, le vétérinaire, pour adopter le tien. *Il sourit.*",
        ],
        dialoguesAfterRevisit: [
            "T'es revenu ! Dingo aussi est content. *Il agite la queue.*",
            "T'as fait un tour à la bibliothèque ? Si t'as ton animal, file chez V3T !",
        ],
        dialoguesAfterMacaronAwakened: [
            "BUCATINI saute de joie. \"Tu l'as fait ! T'AS FAIT ! Coach avait raison !!\"",
            "\"Le concours revient ! Le concours revient ! Le concours REVIENT !\"",
            "*Il sautille, incapable de tenir en place.* \"Merci merci merci ! Tu changes nos vies !\"",
        ],
    },

    // v3.23i — ROMARIN : le jardinier de Pépiteville. Parle des arbres du Nexus à chaque
    // visite (random pool de 7 lores : pommier, cerisier, poirier, pêcher, cocotier, Maléfica,
    // teaser "il y a d'autres arbres ailleurs"). Place près du pommier_1 pour la cohérence.
    {
        id: "pepiteville_jardinier",
        name: "ROMARIN",
        mapId: "pepiteville",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🌿", color: "#5a8a3a" },
        initialX: 6,
        initialY: 12,
        // dialoguesAfter requis par le type mais bypass par randomDialogues (cf getNpcDialogue priorité)
        dialoguesAfter: ["*ROMARIN te salue d'un signe de tête.*"],
        randomDialogues: [
            // 🍎 Pommier
            [
                "*ROMARIN s'essuie le front avec un mouchoir terreux.* Le pommier... trois fruits par jour, comme les trois repas de la vie.",
                "Sa pomme contient de l'acide malique. Bon pour les muscles qui ont trop donné. Mes anciens disaient que la pomme du matin guérit les sept péchés de la veille.",
                "Va le voir, il te connaît déjà.",
            ],
            // 🍒 Cerisier
            [
                "*Il sort un panier en osier de derrière une racine.* Le cerisier, lui, c'est un sprinteur. Cinq cerises par jour, et il se vide d'un coup.",
                "Mais regarde le rouge de sa chair — c'est l'anthocyane. Ça calme les courbatures comme la mer calme une pierre.",
                "Mange-les vite, elles ne mentent jamais sur leur fraîcheur.",
            ],
            // 🍐 Poirier
            [
                "*ROMARIN cueille une feuille et la frotte entre ses doigts.* Le poirier est patient. Quatre fruits par jour, doux comme une berceuse.",
                "À Macaron'île, on dit qu'une poire mangée avant la sieste te fait dormir comme un nouveau-né. Je n'ai jamais vérifié — je dors trop peu pour faire la sieste.",
                "Ses fibres, par contre, je connais. Elles tiennent au ventre des heures.",
            ],
            // 🍑 Pêcher
            [
                "*Il pointe vers le sud, vers les hautes herbes.* Le pêcher est capricieux. Il ne pousse qu'au bord de la jungle, là où les bestioles font la loi.",
                "Deux pêches par jour. Pas une de plus. Sa chair est gorgée de potassium — précieux pour les coureurs de fond.",
                "Si tu en trouves un, tu sauras pourquoi je l'aime tant.",
            ],
            // 🥥 Cocotier
            [
                "*ROMARIN lève la tête vers les nuages.* Le cocotier, lui, ne pousse qu'au sommet du Mont Pasta-Ventoux. Une seule noix par jour.",
                "Sa chair est dense en lipides, l'énergie pure des explorateurs. Sa présence là-haut n'est pas un hasard — c'est le couronnement, le repas du conquérant.",
                "Si tu y arrives, mange-la lentement. Tu te souviendras de chaque bouchée.",
            ],
            // 💀 Maléfica
            [
                "*Son visage se durcit.* Méfie-toi de la Maléfica. Tu la reconnaîtras à ses fruits violets qui brillent dans la nuit.",
                "Si tu en croques un, tu perds tes forces. Pas une farce — un vrai poison léger.",
                "Les anciens du village disent qu'elle a poussé sur la tombe d'un mauvais entraîneur, celui qui faisait souffrir ses élèves pour rien. La terre ne pardonne pas.",
            ],
            // 🌳 Teaser — il ne connaît pas tous les arbres
            [
                "*ROMARIN te regarde par-dessus son binoculaire en bois.* Tu sais, je travaille à Pépiteville depuis trente ans, mais je n'ai pas tout vu.",
                "On me dit qu'il y aurait d'autres arbres plus loin. Au-delà du brouillard, au-delà des mers du sud. Des essences que je n'ai jamais touchées.",
                "Si tu en croises un, reviens me voir. Je voudrais apprendre encore. Un jardinier qui croit savoir est un jardinier mort.",
            ],
        ],
    },

    // v3.23h — DINGO : le chien de BUCATINI, sprite emoji 🐕 (level 38 du bestiaire).
    // Sert d'accroche visuelle pour orienter le joueur vers BIBLIO puis V3T.
    {
        id: "macaron_dingo",
        name: "Dingo",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🐕", color: "#a06030" },
        // v3.23n — Suit BUCATINI près du canal nord (5, 2). Sur le sable, à côté de BUCATINI.
        initialX: 5,
        initialY: 2,
        dialoguesAfter: [
            "*Dingo te renifle, agite la queue, puis retourne près de BUCATINI.*",
        ],
        // v3.23n — Dialogues post-adoption (random pool, le pool se déclenche dès que
        // le joueur a un tamagotchi adopté chez V3T). 2 pools : entretien + teaser apprentissage.
        dialoguesAfterTamagotchiAdopted: [
            // Pool 1 : prendre soin de l'animal
            [
                "*Dingo s'assoit, l'air sage.* Alors, tu en as adopté un toi aussi !",
                "Bon, écoute bien. Un compagnon ça se nourrit, ça se hydrate, ça se câline.",
                "Reviens souvent chez V3T pour le voir — clique sur lui pour le nourrir, lui donner ta gourde, ou partager des Corned Pâtes.",
                "Plus tu prends soin de lui, plus son bonheur monte. S'il s'ennuie trop longtemps, il devient triste.",
                "*Il te regarde droit dans les yeux.* Sois un bon humain pour lui. C'est tout ce qu'il demande.",
            ],
            // Pool 2 : teaser apprentissage / évolution
            [
                "*Dingo te fixe avec malice.* Tu sais quoi ?",
                "Il paraît que les animaux d'ici peuvent apprendre PLEIN de choses si tu insistes.",
                "Des trucs que personne ne soupçonne. Des trésors d'instinct, des secrets de meute.",
                "*Il agite la queue, mystérieux.* Je n'en dis pas plus. À toi de découvrir.",
            ],
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
        initialX: 6,
        initialY: 12,
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
        initialX: 10,
        initialY: 12,
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
        initialX: 4,
        initialY: 13,
        dialoguesAfter: [
            "Coach GLUTOS, à ton service.",
            "Si un jour le concours reprend, viens t'entraîner ici.",
            "Pour l'instant je perfectionne mes deadlifts. Tout seul.",
        ],
    },
    // ============================================================
    // v3.23 — NPCs de MUSCUVILLE (bike shop + gym + casino + contest hall)
    // ============================================================
    {
        id: "bike_seller",
        name: "PELOTON",
        mapId: "bike_shop",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c84838" },
        initialX: 4,
        initialY: 2,
        dialoguesAfter: [
            "*Le vendeur lustre une selle.*",
            "Bienvenue chez PELOTON, le meilleur vélociste de l'archipel.",
            "Tu veux gravir le Mont Pasta-Ventoux ? Faut un vélo. Pas le choix.",
            "Approche du comptoir, je te montre la gamme.",
        ],
    },
    {
        id: "muscuville_trainer",
        name: "BICEPS",
        mapId: "gym_muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#d8a020" },
        initialX: 5,
        initialY: 4,
        dialoguesAfter: [
            "BICEPS, coach personnel et personne ambulante.",
            "Tu veux du muscle ? Faut bouger. Pas regarder.",
            "Allez, file. Et reviens quand t'auras conquis le Mont.",
        ],
    },
    {
        id: "muscuville_casino_npc",
        name: "MISEUR",
        mapId: "casino_muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a08040" },
        initialX: 3,
        initialY: 4,
        dialoguesAfter: [
            "Casino. Roulette. Rouge ou noir.",
            "Comme partout. Mais ici les athlètes parient plus gros.",
        ],
    },
    // 3 PNJ adversaires de la salle des concours (POMPATOR / SQUATILUS / TIROIR)
    // v3.23c-2 — Mécanique de défi : chacun teste un exo, +100 reps one-shot si validé.
    {
        id: "contest_pompator",
        name: "POMPATOR",
        mapId: "contest_hall",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c83838" },
        initialX: 3,
        initialY: 2,
        dialoguesAfter: [
            "POMPATOR, champion de pompes. *Il claque sa poitrine.*",
            "Tu veux me défier ? Très bien. Mon défi est simple : 200 pompes aujourd'hui.",
            "Si tu y arrives, je te lègue 100 reps de surplus en hommage à ton effort.",
        ],
        dialoguesAfterRevisit: [
            "POMPATOR hoche la tête. \"Le défi est passé. Ta poitrine est forgée.\"",
        ],
    },
    {
        id: "contest_squatilus",
        name: "SQUATILUS",
        mapId: "contest_hall",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#3838c8" },
        initialX: 5,
        initialY: 2,
        dialoguesAfter: [
            "SQUATILUS, maître des squats. *Il fait flexion lente.*",
            "Mon défi à toi : 250 squats aujourd'hui. Cuisses brûlantes ou pas du tout.",
            "Récompense : 100 reps de surplus si tu tiens.",
        ],
        dialoguesAfterRevisit: [
            "SQUATILUS grogne d'approbation. \"Tes cuisses ont parlé. Respect.\"",
        ],
    },
    {
        id: "contest_tiroir",
        name: "TIROIR",
        mapId: "contest_hall",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#38c838" },
        initialX: 7,
        initialY: 2,
        dialoguesAfter: [
            "TIROIR, expert des tractions. *Il regarde la barre.*",
            "Mon défi : 30 tractions aujourd'hui. C'est dur, je sais. C'est fait pour.",
            "Tiens bon et tu auras 100 reps en cadeau d'amitié.",
        ],
        dialoguesAfterRevisit: [
            "TIROIR sourit, silencieux. *Il te tape l'épaule.*",
        ],
    },

    // v3.17 — Veilleur à l'orée de la forêt hantée (foreshadow seulement, pas de map au-delà encore)
    {
        id: "muscuville_veilleur",
        name: "VEILLEUR",
        mapId: "muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#404858" },
        initialX: 13,
        initialY: 12,
        dialoguesAfter: [
            "*Il tremble légèrement.*",
            "Tu sens ? À l'est, derrière les arbres... la forêt hantée.",
            "Personne n'ose s'en approcher. Ceux qui ont essayé sont revenus en courant, le regard vide.",
            "*Il pose la main sur ton épaule.* Si tu tiens à toi, n'y va pas.",
        ],
    },

    // -------------------------------
    // v3.15 — BIBLIO : bibliothécaire de Macaron'île
    // v3.18 — Repositionnée derrière le nouveau comptoir central + ouvre le BibliothequeModal
    //         (les dialogues classiques restent en fallback)
    // -------------------------------
    {
        id: "bibliotheque_keeper",
        name: "BIBLIO",
        mapId: "bibliotheque",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#a07090" },
        initialX: 6,
        initialY: 4,
        dialoguesAfter: [
            "Bienvenue dans la bibliothèque de Macaron'île.",
            "Le savoir y est ordonné. Approche du comptoir, je t'oriente vers le bon rayon.",
            "(Elle te désigne le comptoir devant elle.)",
        ],
    },

    // v3.21.1 — Petits animaux baladeurs dans la clinique (wanderers décoratifs)
    // Représentent "les animaux des autres joueurs + d'autres" qui peuplent l'endroit.
    {
        id: "vet_animal_1",
        name: "Lémurien",
        mapId: "veterinaire",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#a08070", emoji: "🐒" },
        initialX: 3,
        initialY: 4,
        wanderRadius: 2,
        dialoguesAfter: [
            "*Le petit lémurien te grimpe sur l'épaule, t'ébouriffe les cheveux, puis redescend.*",
            "*Il a l'air heureux ici.*",
        ],
    },
    {
        id: "vet_animal_2",
        name: "Loutre",
        mapId: "veterinaire",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#a06848", emoji: "🦦" },
        initialX: 9,
        initialY: 4,
        wanderRadius: 2,
        dialoguesAfter: [
            "*La loutre fait des roulades sur le tapis.*",
            "*Elle te regarde avec ses grands yeux brillants.*",
        ],
    },
    {
        id: "vet_animal_3",
        name: "Renard",
        mapId: "veterinaire",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#d06030", emoji: "🦊" },
        initialX: 4,
        initialY: 6,
        wanderRadius: 2,
        dialoguesAfter: [
            "*Le renard te flaire les chaussures.*",
            "*Il décide que tu es OK.*",
        ],
    },
    {
        id: "vet_animal_4",
        name: "Capybara",
        mapId: "veterinaire",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#806040", emoji: "🐹" },
        initialX: 8,
        initialY: 6,
        wanderRadius: 2,
        dialoguesAfter: [
            "*Le capybara cligne lentement des yeux et continue de mâcher tranquillement.*",
            "*La sérénité incarnée.*",
        ],
    },
    {
        id: "vet_animal_5",
        name: "Suricate",
        mapId: "veterinaire",
        kind: "wanderer",
        interaction: "interactive",
        sprite: { color: "#c8a060", emoji: "🦦" },
        initialX: 6,
        initialY: 7,
        wanderRadius: 1,
        dialoguesAfter: [
            "*Le suricate est dressé sur ses pattes, en alerte.*",
            "*Il guette quelque chose que tu ne vois pas.*",
        ],
    },

    // -------------------------------
    // V3T — vétérinaire de Macaron'île
    // v3.21.1 — Repositionnée derrière le nouveau comptoir central (y=5) → V3T à (6, 4)
    // -------------------------------
    {
        id: "veterinaire_keeper",
        name: "V3T",
        mapId: "veterinaire",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#80c090" },
        initialX: 6,
        initialY: 4,
        dialoguesAfter: [
            "Bienvenue à la Clinique des Compagnons Totem.",
            "Ici, je m'occupe des animaux qui choisissent leurs humains — pas l'inverse.",
            "Approche du comptoir pour rencontrer le tien.",
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
    /** v3.17 — IDs des NPCs déjà rencontrés au moins une fois.
     *  Quand l'id du NPC est inclus + dialoguesAfterRevisit défini → on utilise dialoguesAfterRevisit. */
    npcsTalkedTo?: string[]
    /** v3.23c-3 — true si le joueur a complété les 3 défis intersalle (POMPATOR + SQUATILUS + TIROIR).
     *  Quand true + dialoguesAfterMacaronAwakened défini → on utilise ce dialogue (prime sur revisit). */
    macaronAwakened?: boolean
    /** v3.23n — true si le joueur a adopté un tamagotchi.
     *  Quand true + dialoguesAfterTamagotchiAdopted défini → on utilise un dialogue de ce pool (rotation aléatoire). */
    hasTamagotchi?: boolean
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
    // v3.23c-3 — Macaron'île éveillée prime sur tout le reste (sauf piaffini)
    if (flags.macaronAwakened && npc.dialoguesAfterMacaronAwakened) {
        return npc.dialoguesAfterMacaronAwakened
    }
    // v3.23n — Si le joueur a adopté un tamagotchi et que le NPC a un pool dédié
    if (flags.hasTamagotchi && npc.dialoguesAfterTamagotchiAdopted && npc.dialoguesAfterTamagotchiAdopted.length > 0) {
        const pool = npc.dialoguesAfterTamagotchiAdopted
        return pool[Math.floor(Math.random() * pool.length)]
    }
    // v3.17 — Si le joueur a déjà parlé au NPC, utilise le dialogue revisit (s'il existe)
    if (flags.npcsTalkedTo?.includes(npc.id) && npc.dialoguesAfterRevisit) {
        return npc.dialoguesAfterRevisit
    }
    return npc.dialoguesAfter
}
