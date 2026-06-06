// src/lib/gamebook/yellow/data/parkSigns.ts
//
// Nexus Jaune Éclair — CONSEILS lisibles sur les buissons (# isolés) de la map
// Nord ("le parc"). Chaque buisson est un panneau interactif : le lire affiche
// un conseil. Les conseils tournent en boucle sur l'ensemble des buissons
// (cf. npcs.ts → PARK_SIGN_NPCS, index % nombre de conseils).
//
// Édite librement les textes : chaque conseil est un tableau de bulles (une par tap).

/** Conseils affichés sur les buissons (cyclés sur tous les buissons de la Route Nord). */
export const PARK_SIGN_TIPS: ReadonlyArray<ReadonlyArray<string>> = [
    // — Le Daemon de tête —
    [
        "Le Daemon en tête de ton équipe n'est pas qu'un favori.",
        "C'est lui qui fixe le niveau des sauvages que tu croises — et c'est lui que le sbire copie face à toi.",
        "Réordonne ton équipe pour choisir qui ouvre le bal.",
    ],
    // — Partage d'XP —
    [
        "Tu n'es jamais seul à progresser : tous les Daemons qui ont mis une patte au combat touchent de l'XP.",
        "Fais tourner les jeunes recrues : même un bref passage les fait grandir.",
    ],
    // — Évolution —
    [
        "À force de niveaux, certains Daemons franchissent un cap et évoluent.",
        "Plus de stats, parfois une nouvelle allure… patience et entraînement payent.",
    ],
    // — Attaques de statut —
    [
        "Toutes les attaques ne font pas de dégâts directs.",
        "Poison, confusion, paralysie… elles rongent l'adversaire ou le déboussolent tour après tour.",
        "Bien placées, elles renversent un combat sans que tu prennes un seul coup.",
    ],
    // — Attaques de renforcement —
    [
        "Certaines techniques ne visent pas l'ennemi mais TOI.",
        "Un tour passé à aiguiser ton attaque ou durcir ta défense, et les coups suivants font mal.",
        "Sacrifier un tour pour en gagner trois : voilà la patience du guerrier.",
    ],
    // — Apprentissage d'attaque —
    [
        "Un Daemon ne retient que quatre attaques à la fois.",
        "Quand il en apprend une cinquième, à toi de choisir laquelle laisser partir. Réfléchis : variété de types, coût, utilité.",
    ],
    // — Fuite —
    [
        "Face à un sauvage trop coriace, la fuite n'a rien de honteux.",
        "Mais contre un dresseur, impossible de tourner les talons : il faut vaincre ou tomber.",
    ],
    // — Triangle des types —
    [
        "Souviens-toi du vieux triangle : le Feu brûle la Plante, la Plante boit l'Eau, l'Eau éteint le Feu.",
        "Garde des Daemons de types variés pour ne jamais être pris au dépourvu.",
    ],
]
