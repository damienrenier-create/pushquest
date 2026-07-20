// Nexus II "jaune éclair" — registre des PNJ de la suite narrative.
//
// Convention : tous les ids commencent par `y_` pour éviter toute collision
// avec les PNJ v3 (gym_guy, tb_videur, pere_pesto, etc.).
//
// L'Architecte vit dans la ville extérieure (yellow_entrance). Les autres
// vivent chacun dans leur bâtiment intérieur.

import type { NpcDefinition } from "@/lib/gamebook/npcs"
import { TRAINERS } from "./data/trainers"
import { NORTH_SIGN_POSITIONS } from "./maps"
import { PARK_SIGN_TIPS } from "./data/parkSigns"
import { ACE_TRAINER_ID, ACE_POS, ACE_INTRO_VARIANTS } from "./data/ace"
import { GEKROC_NPC_ID, GEKROC_MAP_ID, GEKROC_POS, GEKROC_INTRO_LINES } from "./data/gekroc"
import { SYLVEBARBE_NPC_ID, SYLVEBARBE_MAP_ID, SYLVEBARBE_POS, SYLVEBARBE_INTRO_LINES } from "./data/sylvebarbe"
import { HH_TRADER_ID, HH_TRADER_MAP, HH_TRADER_POS, HH_TRADER_OFFER_LINES, HH_COLLECTOR_ID, HH_COLLECTOR_MAP, HH_COLLECTOR_POS, HH_COLLECTOR_INTRO_LINES } from "./data/hauntedNpcs"
import { CAVE_TRADER_ID, CAVE_TRADER_MAP, CAVE_TRADER_POS, CAVE_TRADER_OFFER_LINES } from "./data/caveTrader"
import { HH_KID_ID, HH_KID_MAP, HH_KID_POS, HH_KID_DAY_LINES } from "./data/hhKid"
import { ORCALINE_TRAINER_ID, ORCALINE_TRAINER_MAP, ORCALINE_TRAINER_POS, ORCALINE_INTRO_LINES } from "./data/orcalineTrainer"
import { PNJ5_NPC_ID, PNJ5_MAP_ID, PNJ5_POS, PNJ5_INTRO_LINES } from "./data/pnj5"

// PANNEAUX-conseils = les ~12 panneaux BIEN ESPACÉS de la Route Nord (le sprite
// panneau est rendu par le décor). Chaque panneau = un hotspot INVISIBLE qui
// affiche un conseil. Les conseils tournent en boucle (index % nb de conseils).
const PARK_SIGN_NPCS: NpcDefinition[] = NORTH_SIGN_POSITIONS.map((pos, i) => ({
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

    // === DÔME DE COMBAT — LE MAÎTRE (mage central) : interaction → carrousel (S'inscrire / Règles / Stats). ===
    // Posé en plein centre (8,6). Vrai visuel via NPC_SPRITES (npc_dome_mage.png). L'interaction est interceptée
    // dans gameStore (npc.id === "y_dome_maitre" → domeMenuOpen) → le dialoguesAfter n'est qu'un repli.
    {
        id: "y_dome_maitre",
        name: "MAÎTRE DU DÔME",
        mapId: "yellow_combat_dome",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧙", color: "#7c4d9e" },
        initialX: 8,
        initialY: 6,
        dialoguesAfter: ["« Bienvenue au Dôme, aspirant. »"],
    },

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
        dialoguesAfter: ACE_INTRO_VARIANTS[0], // repli statique (l'intro réelle est interceptée + randomisée dans gameStore)
    },

    // === CENTRALE — GÉKROC (mini-boss STATIQUE, gardien de la Pierre) en (4,9) ===
    // (4,9) est un mur de la collision → l'NPC s'y pose et bloque naturellement ; on l'interpelle
    // depuis une case adjacente. Visuel réel via NPC_SPRITES (gekroc_overworld, ou la Pierre si résolu).
    {
        id: GEKROC_NPC_ID,
        name: "GÉKROC",
        mapId: GEKROC_MAP_ID,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🪨", color: "#c9a227" },
        initialX: GEKROC_POS.x,
        initialY: GEKROC_POS.y,
        dialoguesAfter: GEKROC_INTRO_LINES,
    },

    // SYLVEBARBE — gardien endormi du sud de Ville Jaune. Sprite "endormi" déjà rendu dans le décor
    // (MapView) → NPC invisible, sert uniquement de point d'interaction (interpellé depuis (23,37)).
    {
        id: SYLVEBARBE_NPC_ID,
        name: "SYLVEBARBE",
        mapId: SYLVEBARBE_MAP_ID,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#5a7d3a" },
        initialX: SYLVEBARBE_POS.x,
        initialY: SYLVEBARBE_POS.y,
        dialoguesAfter: SYLVEBARBE_INTRO_LINES,
    },
    // PNJ 5 — GARDIEN DE LA GROTTE DU NEXUS, intercepte en (17,33). Barre le passage (18-20,33) tant qu'il n'est
    // pas battu CETTE visite. GATE titre OR au Dôme (vérifiée à l'interaction dans gameStore) → sinon renvoi hors grotte.
    {
        id: PNJ5_NPC_ID,
        name: "GARDIEN",
        mapId: PNJ5_MAP_ID,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🗿", color: "#8a8f98" },
        initialX: PNJ5_POS.x,
        initialY: PNJ5_POS.y,
        dialoguesAfter: PNJ5_INTRO_LINES,
    },
    // PANNEAUX de Ville Jaune (cases non-walkables déjà dessinées dans le décor → NPC invisibles).
    {
        id: "y_sign_south",
        name: "PANNEAU",
        mapId: "yellow_entrance",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#b88a4a" },
        initialX: 20,
        initialY: 31,
        dialoguesAfter: [
            "🪧 « Le COLOSSE de bois qui barre la route du SUD ne s'éveillera qu'au son d'une FLÛTE MAGIQUE… »",
            "« …et cette flûte n'est offerte qu'à ceux qui la MÉRITENT. »",
            "« En attendant, il paraît qu'il y a plein de choses à gagner à l'ÉTAGE du Centre Daemon ! »",
        ],
    },
    {
        id: "y_sign_center",
        name: "PANNEAU",
        mapId: "yellow_entrance",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#b88a4a" },
        initialX: 20,
        initialY: 16,
        dialoguesAfter: [
            "🪧 « À l'ÉTAGE du Centre Daemon : gagne des CT pour pas très cher, de l'énergie… et même un DAEMON ! »",
        ],
    },
    // MARCHAND DE JETONS DE COMBAT (hub de la Zone de Combat) : ouvre la boutique JC (intercepté gameStore).
    {
        id: "y_combat_merchant",
        name: "MARCHAND",
        mapId: "yellow_zone_combat",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🛒", color: "#f1c40f" }, // repli si le PNG NPC_SPRITES manquait
        initialX: 10,
        initialY: 9,
        dialoguesAfter: ["*Le marchand de Jetons de Combat t'accueille.*"], // repli si non intercepté
    },


    // === CENDREVILLE — TECHNICIEN devant la Centrale (21,18) : indice sur Gékroc + la Pierre d'évolution ===
    {
        id: "y_centrale_hint",
        name: "TECHNICIEN",
        mapId: "yellow_cendreville",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "👷", color: "#f0b429" }, // remplacé par NPC_SPRITES (npc_centrale)
        initialX: 21,
        initialY: 18,
        dialoguesAfter: [
            "Hé, l'ami ! Tu comptes entrer dans la Centrale ? Fais attention là-dedans…",
            "Une drôle de créature y rôde. On raconte qu'elle veille sur une PIERRE très spéciale — capable de faire évoluer un Daemon dans le TYPE de ton choix.",
            "Mais méfie-toi : si tu la combats, elle pourrait disparaître à JAMAIS. À toi de voir si la pierre vaut ce risque…",
        ],
    },

    // === CENDREVILLE — BROCANTEUR devant la maison hantée (20,11) : échange Brookhanté → Roctaur (→ Rochison) ===
    {
        id: HH_TRADER_ID,
        name: "BROCANTEUR",
        mapId: HH_TRADER_MAP,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🔮", color: "#7e57c2" },
        initialX: HH_TRADER_POS.x,
        initialY: HH_TRADER_POS.y,
        dialoguesAfter: HH_TRADER_OFFER_LINES,
    },

    // === ROUTE NORD — DÉNICHEUR à côté de l'entrée de la grotte (13,4) : échange Faukon → Blaziper (base Vipember) ===
    {
        id: CAVE_TRADER_ID,
        name: "DÉNICHEUR",
        mapId: CAVE_TRADER_MAP,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧗", color: "#a1887f" }, // remplacé par NPC_SPRITES (npc_echange)
        initialX: CAVE_TRADER_POS.x,
        initialY: CAVE_TRADER_POS.y,
        dialoguesAfter: CAVE_TRADER_OFFER_LINES,
    },

    // === PLAINE D'ENTRAÎNEMENT — GAMIN au centre (8,9) : indice Goshendofy à la tombée de la nuit ===
    {
        id: HH_KID_ID,
        name: "GAMIN",
        mapId: HH_KID_MAP,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧒", color: "#7cb342" }, // remplacé par NPC_SPRITES (hh_kid)
        initialX: HH_KID_POS.x,
        initialY: HH_KID_POS.y,
        dialoguesAfter: HH_KID_DAY_LINES,
    },

    // === PLAINE D'ENTRAÎNEMENT — DRESSEUR D'ORCALINE (8,15) : 2 Orcalines, escalade quotidienne + cadeau ===
    {
        id: ORCALINE_TRAINER_ID,
        name: "DRESSEUR D'ORCALINE",
        mapId: ORCALINE_TRAINER_MAP,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧑‍🦱", color: "#4fc3f7" }, // remplacé par NPC_SPRITES (dresseur_orcaline)
        initialX: ORCALINE_TRAINER_POS.x,
        initialY: ORCALINE_TRAINER_POS.y,
        dialoguesAfter: ORCALINE_INTRO_LINES,
    },

    // === CENDREVILLE — COLLECTIONNEUR DE SPECTRES devant la maison hantée (21,11) : 3 victoires + 3 spectres → CT26 ===
    {
        id: HH_COLLECTOR_ID,
        name: "COLLECTIONNEUR",
        mapId: HH_COLLECTOR_MAP,
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "👻", color: "#5e35b1" },
        initialX: HH_COLLECTOR_POS.x,
        initialY: HH_COLLECTOR_POS.y,
        dialoguesAfter: HH_COLLECTOR_INTRO_LINES,
    },

    // === CENDREVILLE — PANNEAU d'info de l'arène Eau « Sanctuaire des Marées » en (14,9) ===
    // Hotspot invisible (le panneau est déjà dessiné dans l'art de Cendreville) ; lu depuis (14,10).
    {
        id: "y_eau_arena_sign",
        name: "PANNEAU",
        mapId: "yellow_cendreville",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#3aa0e8" },
        initialX: 14,
        initialY: 9,
        dialoguesAfter: [
            "*Panneau du Sanctuaire des Marées.*",
            "⚡ Le Sanctuaire reste SCELLÉ tant que tu n'as pas vaincu l'arène ÉLECTRIQUE (Badge Éclair).",
            "ARÈNE EAU — Cheffe : ONDINE, Reine des Marées (type EAU).",
            "Bats ses 4 gardes (dans n'importe quel ordre), puis affronte ONDINE.",
            "Récompense : le BADGE EAU — la dernière clé pour entrer à la Ligue !",
        ],
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

    // === VILLE — CONSEILLER (à côté du Centre Daemon, case 29,25) ===
    // Le joueur lui pose une question → enregistrée en base (AdvisorQuestion), le
    // créateur y répond ; la réponse réapparaît dans le panneau (intercepté gameStore).
    {
        id: "y_conseiller",
        name: "CONSEILLER",
        mapId: "yellow_entrance",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧙", color: "#caa15a" }, // repli si le PNG NPC_SPRITES manquait
        initialX: 29,
        initialY: 25,
        dialoguesAfter: ["*Le conseiller t'accueille d'un signe de tête.*"], // repli si non intercepté
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

    {
        // BARMAN du casino : guide du bâtiment + vend des Potions "à prix libre" (porte-bonheur…).
        // On lui parle depuis (10,3)/(11,3) en regardant vers le haut → ouvre BarmanPanel (intercepté
        // côté UI, tryCasinoObjectA). Le sprite se tient derrière le comptoir en (10,2).
        id: "y_barman",
        name: "BARMAN",
        mapId: "yellow_casino",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🍸", color: "#7a4ec0" },
        initialX: 10,
        initialY: 2,
        dialoguesAfter: ["*Le barman astique un verre.* Qu'est-ce que je te sers ?"],
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
    {
        // Easter egg — poster mural GAUCHE du Centre (case 11,1). Activé depuis (11,2) en
        // regardant vers le haut → affiche une image (gameStore.pressA intercepte).
        id: "y_pasta_poster_1",
        name: "POSTER",
        mapId: "yellow_infirmary",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#e0a020" }, // invisible (l'image s'affiche au clic)
        initialX: 11,
        initialY: 1,
        dialoguesAfter: ["*Un poster un peu… particulier.*"], // repli si non intercepté
    },
    {
        // Easter egg — poster mural DROIT (case 12,1). 1er A → image 2 · 2e → image 3 · 3e → DIEU DES PÂTES (boucle).
        id: "y_pasta_poster_2",
        name: "POSTER",
        mapId: "yellow_infirmary",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#e0a020" },
        initialX: 12,
        initialY: 1,
        dialoguesAfter: ["*Un poster un peu… particulier.*"],
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
        // Prof. CHEN (chef du labo) : explique le terminal de défis + remet la Daemonflûte au sacre — intercepté gameStore. (5,3).
        id: "y_lab_scientist",
        name: "Prof. CHEN",
        mapId: "yellow_infirmary_2e",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#e0f0ff" }, // invisible (le Prof. CHEN est dessiné dans le décor)
        initialX: 5,
        initialY: 3,
        dialoguesAfter: ["*Le Prof. CHEN ajuste ses lunettes et te montre le terminal d'expériences.*"], // repli si non intercepté
    },
    {
        // Assistant du Prof. CHEN : aiguille vers les récompenses (CT terminal / CT blackjack / Tonytony) — intercepté gameStore. (7,6).
        id: "y_lab_assistant",
        name: "ASSISTANT",
        mapId: "yellow_infirmary_2e",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "", color: "#d0e0ff" }, // invisible (l'assistant est dessiné dans le décor à (7,6))
        initialX: 7,
        initialY: 6,
        dialoguesAfter: ["*L'assistant trie des Capsules Techniques en sifflotant.*"], // repli si non intercepté
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

    // === ARÈNE ÉLECTRIQUE — panneau-antisèche (Tour Hertz, près de l'entrée) ===
    {
        id: "y_elecarena_sign",
        name: "PANNEAU",
        mapId: "yellow_arena_elec",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🪧", color: "#f6c640" },
        initialX: 4,
        initialY: 8,
        dialoguesAfter: [
            "*Tu lis l'antisèche grésillante devant la Tour Hertz.*",
            "⚡ LA TOUR HERTZ est 100% ÉLECTRIK. Une clé domine tout : le SOL.",
            "🌍 Le SOL frappe l'Élec ×2 (et double-punit les Feu/Élec), et la foudre ne peut même PAS toucher un Daemon Sol (×0).",
            "🐗 Capture un ROCHE/SOL : CAILLOUTCHI (Route Nord) ou la lignée MOTTOCHE → QUADROC (Grotte). Immunisés à la foudre, ils traversent la tour.",
            "⛏️ Fais-le monter : CAILLOUTCHI évolue en ROCTAUR (N25) qui apprend SÉISME tout seul (N30, PUISSANCE 100) ! Sinon FAILLE SISMIQUE (cadeau de l'arène Roche, 90) ou la CT Séisme (Champion, 3 badges) s'enseignent à n'importe quel Roche/Sol.",
            "🪨 Le Sol ne touche pas le VOL : garde un coup ROCHE en secours (Lame de Roche, 90 — la CT du badge Roche). Une équipe variée ne se fait jamais surprendre.",
            "💪 SOL et ROCHE sont PHYSIQUES → mise sur ton ATTAQUE. La foudre, elle, frappe en SPÉCIAL → c'est ta SPÉ qui encaisse.",
            "🚫 N'amène ni EAU ni VOL : l'Élec leur fait ×2.",
            "🗝️ Bats les 4 gardes (ordre libre), puis VOLTA au sommet.",
        ],
    },

    // === PANNEAUX DE CONSEILS (map Nord) ===
    ...PARK_SIGN_NPCS,

    // === AUTEL DE LA CHIMÈRE (salle de fusion) — DEVANT la plateforme centrale en (9,6). Interaction interceptée dans gameStore
    //     (npc.id === "y_autel_chimere" → fusionMenuOpen) ; dialoguesAfter = repli. ===
    {
        id: "y_autel_chimere",
        name: "AUTEL DE LA CHIMÈRE",
        mapId: "yellow_combat_autel",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🧬", color: "#7c4fc0" },
        initialX: 9,
        initialY: 6,
        dialoguesAfter: ["« Pose deux Daemons sur l'autel… et n'en fais plus qu'UN, le temps d'un combat. »"],
    },
    // === ORDINATEUR de l'Autel (coin bas-gauche, 2,6) : ATELIER DE FUSION (boîte/équipe + les 6 slots de fusion).
    //     Interaction interceptée dans gameStore (npc.id === "y_autel_pc" → fusionAtelierOpen). ===
    {
        id: "y_autel_pc",
        name: "ORDINATEUR DE FUSION",
        mapId: "yellow_combat_autel",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "💻", color: "#3ad0c0" },
        initialX: 2,
        initialY: 6,
        dialoguesAfter: ["« Assemble ton équipe de fusion sur cet autel-machine. »"],
    },
    // === PANNEAU d'entrée de l'Autel (hub Zone de Combat, en 12,9) : signale l'entrée invisible en (13,9). ===
    {
        id: "y_autel_panneau",
        name: "PANNEAU",
        mapId: "yellow_zone_combat",
        kind: "static",
        interaction: "interactive",
        sprite: { emoji: "🪧", color: "#7c4fc0" },
        initialX: 12,
        initialY: 9,
        dialoguesAfter: ["*Tu lis le panneau.*", "🧬 AUTEL DE LA CHIMÈRE", "Entre par la case à l'EST pour fusionner 2 Daemons."],
    },

    // === DRESSEURS (combats) — dérivés de data/trainers.ts ===
    ...TRAINER_NPCS,
]
