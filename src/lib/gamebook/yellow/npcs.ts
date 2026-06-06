// Nexus II "jaune éclair" — registre des PNJ de la suite narrative.
//
// Convention : tous les ids commencent par `y_` pour éviter toute collision
// avec les PNJ v3 (gym_guy, tb_videur, pere_pesto, etc.).
//
// L'Architecte vit dans la ville extérieure (yellow_entrance). Les autres
// vivent chacun dans leur bâtiment intérieur.

import type { NpcDefinition } from "@/lib/gamebook/npcs"
import { TRAINERS } from "./data/trainers"
import { NORTH_BUSH_POSITIONS } from "./maps"
import { PARK_SIGN_TIPS } from "./data/parkSigns"

// PANNEAUX = les buissons (# isolés) de la map Nord ("le parc"). Chaque buisson
// reçoit un hotspot interactif INVISIBLE (emoji vide → MapView ne dessine rien,
// le sprite buisson étant déjà rendu par le décor). Le lire affiche un conseil ;
// les conseils tournent en boucle sur l'ensemble des buissons.
const PARK_SIGN_NPCS: NpcDefinition[] = NORTH_BUSH_POSITIONS.map((pos, i) => ({
    id: `y_park_sign_${i + 1}`,
    name: "PANNEAU",
    mapId: "yellow_route_nord",
    kind: "static",
    interaction: "interactive",
    sprite: { emoji: "", color: "#8c6840" },
    initialX: pos.x,
    initialY: pos.y,
    dialoguesAfter: ["*Tu lis le panneau.*", ...PARK_SIGN_TIPS[i % PARK_SIGN_TIPS.length]],
}))

// PNJ-dresseurs dérivés du registre des dresseurs (source unique pour la position).
// gameStore.pressA les intercepte par id (via getTrainer) pour lancer le combat ;
// dialoguesAfter ne sert que de repli si jamais l'interception ne s'applique pas.
const TRAINER_NPCS: NpcDefinition[] = TRAINERS.map((t) => ({
    id: t.id,
    name: t.name,
    mapId: t.mapId,
    kind: "static",
    interaction: "interactive",
    sprite: t.sprite,
    initialX: t.x,
    initialY: t.y,
    dialoguesAfter: t.intro,
}))

export const YELLOW_NPCS: NpcDefinition[] = [
    // v4.y — PNJ "ARCHITECTE" (👷, ex-"professeur" relique du tout début) RETIRÉ :
    // emoji parasite au centre de la ville. À recréer proprement plus tard si besoin.

    // === Intérieur SHOP ===
    {
        id: "y_vendeur",
        name: "VENDEUR",
        mapId: "yellow_shop",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧑‍💼", color: "#a06030" },
        initialX: 1,
        initialY: 3,
        dialoguesAfter: [
            "*Le vendeur te toise par-dessus le comptoir.*",
            "Bienvenue chez moi. J'ai tout ce qu'il te faut…",
            "🚧 Catalogue à venir. Reviens plus tard.",
        ],
    },

    // === Intérieur CASINO ===
    {
        id: "y_croupier",
        name: "CROUPIER",
        mapId: "yellow_casino",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🎲", color: "#c02040" },
        initialX: 4,
        initialY: 3,
        dialoguesAfter: [
            "*Le croupier brasse des cartes invisibles.*",
            "Tu sens la chance, blanc-bec ?",
            "🚧 Jeux à venir. La maison gagne toujours.",
        ],
    },

    // === Intérieur INFIRMERIE ===
    {
        id: "y_medecin",
        name: "MÉDECIN",
        mapId: "yellow_infirmary",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "👩‍⚕️", color: "#e0f0ff" },
        initialX: 7,
        initialY: 2,
        dialoguesAfter: [
            "*La médecin range son stéthoscope.*",
            "T'as l'air en forme. Tant mieux.",
            "🚧 Soins à venir. Évite les bagarres en attendant.",
        ],
    },
    {
        // Ordinateur PC du Centre Daemon : ouvre la boîte de rangement (équipe ↔ PC).
        // On l'active depuis (10,2) en regardant vers le haut (10,1).
        id: "y_pc_box",
        name: "PC",
        mapId: "yellow_infirmary",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "💻", color: "#3a8ee0" },
        initialX: 10,
        initialY: 1,
        dialoguesAfter: ["*L'ordinateur du Centre ronronne.*"],
    },

    // === Intérieur ANTRE DU SBIRE (combat dynamique 2×/jour) ===
    // Interception spéciale dans gameStore.pressA (équipe miroir/faiblesse selon
    // le nb de victoires du jour). dialoguesAfter = repli si jamais non intercepté.
    {
        id: "y_sbire",
        name: "SBIRE",
        mapId: "yellow_sbire",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🍝", color: "#c83a2a" },
        initialX: 4,
        initialY: 2,
        dialoguesAfter: ["*Le sbire du dieu Spaghetti médite devant son autel.*"],
    },

    // === ROUTE NORD : panneau placeholder ===
    {
        id: "y_route_nord_panneau",
        name: "PANNEAU",
        mapId: "yellow_route_nord",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🪧", color: "#8c6840" },
        initialX: 21,
        initialY: 36,
        dialoguesAfter: [
            "*Tu lis le panneau.*",
            "ROUTE NORD",
            "Bientôt : zone de Pokémon sauvages à capturer.",
            "🚧 En construction — reviens plus tard !",
        ],
    },

    // === Intérieur ARÈNE ===
    {
        id: "y_arbitre",
        name: "ARBITRE",
        mapId: "yellow_arena",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🥋", color: "#604030" },
        initialX: 21,
        initialY: 18,
        dialoguesAfter: [
            "*L'arbitre t'accueille à l'entrée de l'arène.*",
            "Trois salles, trois chefs : Feu, Plante, Eau.",
            "Bats-les pour gagner leurs badges…",
            "…puis défie le Champion sur son trône tout en haut !",
        ],
    },

    // === PANNEAUX DE CONSEILS (map Nord) ===
    ...PARK_SIGN_NPCS,

    // === DRESSEURS (combats) — dérivés de data/trainers.ts ===
    ...TRAINER_NPCS,
]
