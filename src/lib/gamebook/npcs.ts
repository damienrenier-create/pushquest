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
        initialX: 9,
        initialY: 14,
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
    },
    // v3.17 — BUCATINI le naïf-optimiste
    {
        id: "macaron_triste_5",
        name: "BUCATINI",
        mapId: "macaron_ile",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#c0a0a0" },
        initialX: 12,
        initialY: 13,
        dialoguesAfter: [
            "Oh ! Bonjour ! C'est sympa que tu sois là.",
            "Mon coach dit que le concours va revenir. Il sait toujours, mon coach.",
            "J'arrête pas de m'entraîner au cas où. Toi aussi tu t'entraînes ? On pourrait s'entraîner ensemble peut-être ?",
        ],
        dialoguesAfterRevisit: [
            "T'es revenu ! Coach dit que les gens qui reviennent ont de la chance.",
            "Du coup tu vas réussir un truc cool, c'est obligé. *Il sourit.*",
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
    // v3.17 — Veilleur à l'orée de la forêt hantée (foreshadow seulement, pas de map au-delà encore)
    {
        id: "muscuville_veilleur",
        name: "VEILLEUR",
        mapId: "muscuville",
        kind: "static",
        interaction: "interactive",
        sprite: { color: "#404858" },
        initialX: 11,
        initialY: 5,
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
    // v3.17 — Si le joueur a déjà parlé au NPC, utilise le dialogue revisit (s'il existe)
    if (flags.npcsTalkedTo?.includes(npc.id) && npc.dialoguesAfterRevisit) {
        return npc.dialoguesAfterRevisit
    }
    return npc.dialoguesAfter
}
