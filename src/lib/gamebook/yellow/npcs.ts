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
import { ACE_TRAINER_ID, ACE_POS, ACE_INTRO_LINES } from "./data/ace"

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

    // === VILLE — ACE (rival quotidien, IA "ace", équipe évolutive par joueur) ===
    // Se tient en (0,16) ; interpelle aussi le joueur sur la bande (0,17-19).
    {
        id: ACE_TRAINER_ID,
        name: "ACE",
        mapId: "yellow_entrance",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "😎", color: "#2b6cb0" }, // placeholder : sprite à venir
        initialX: ACE_POS.x,
        initialY: ACE_POS.y,
        dialoguesAfter: ACE_INTRO_LINES,
    },

    // === VILLE — PANNEAU "antisèche du Bosquet" devant le gym (32,10) ===
    // Hotspot invisible (le panneau est déjà dessiné dans le décor). 8 conseils aérés.
    {
        id: "y_gym_sign",
        name: "PANNEAU",
        mapId: "yellow_entrance",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#8c6840" },
        initialX: 32,
        initialY: 10,
        dialoguesAfter: [
            "*Tu lis l'antisèche gravée devant l'arène.*",
            "🌿 Le Bosquet est 100% PLANTE.",
            "🔥 Tes meilleures armes : FEU, GLACE, INSECTE (super efficace).",
            "⚡ Flammèche dès niv 7 (Braisille/Fennaise) · Dard-Nuée dès niv 6 (Ruffiant, 2 à 5 coups).",
            "🧊 La GLACE est reine : Coup d'Givre (Auroruff dès niv 8) tape ×2 ET peut GELER le boss !",
            "⚔️ Feu & Glace = attaques SPÉCIALES → monte ta SPÉ. Insecte & Vol = PHYSIQUES → monte ton ATTAQUE.",
            "🛡️ La Plante cogne en SPÉCIAL : c'est ta SPÉ qui encaisse, pas ta Déf. Et le Feu résiste à la Plante.",
            "🚫 N'amène pas d'Eau, Sol ni Roche (la Plante leur fait ×2) ; l'Élec est résisté.",
            "🗝️ Bats les 4 gardes (ordre libre), puis le Doyen — gare à ses drains et à sa Florapanthe.",
        ],
    },

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
    {
        // Bibliothèque du Centre Daemon : ouvre le REGISTRE DES DRESSEURS (stats des
        // autres joueurs). Meuble dessiné dans le décor (3,1) ; activé depuis (3,2) ↑.
        id: "y_biblio",
        name: "BIBLIOTHÈQUE",
        mapId: "yellow_infirmary",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#8c6840" }, // invisible (le meuble est dans le décor)
        initialX: 3,
        initialY: 1,
        dialoguesAfter: ["*Le Registre des Dresseurs du Nexus.*"], // repli si non intercepté
    },

    // === Intérieur LABO SCIENTIFIQUE (étage de l'infirmerie) ===
    {
        // Terminal d'expériences : ouvre le menu de défis (intercepté gameStore). (3,3) → (3,4) ↑.
        id: "y_lab_computer",
        name: "TERMINAL",
        mapId: "yellow_infirmary_2e",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#3a8ee0" }, // invisible (l'ordi est dessiné dans le décor)
        initialX: 3,
        initialY: 3,
        dialoguesAfter: ["*Le terminal d'expériences scientifiques.*"], // repli si non intercepté
    },
    {
        // Scientifique : remet la récompense d'un défi réussi (intercepté gameStore). (5,3) → (5,4) ↑.
        id: "y_lab_scientist",
        name: "SCIENTIFIQUE",
        mapId: "yellow_infirmary_2e",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#e0f0ff" }, // invisible (le scientifique est dessiné dans le décor)
        initialX: 5,
        initialY: 3,
        dialoguesAfter: ["*Le scientifique t'observe par-dessus ses lunettes.*", "Reviens quand tu auras accompli ton défi."],
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

    // (Arène : plus d'arbitre — c'est le Bosquet Sacré, le Druide est le boss.)

    // === PANNEAUX DE CONSEILS (map Nord) ===
    ...PARK_SIGN_NPCS,

    // === DRESSEURS (combats) — dérivés de data/trainers.ts ===
    ...TRAINER_NPCS,
]
