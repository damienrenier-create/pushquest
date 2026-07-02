// src/lib/gamebook/yellow/data/labDialogues.ts
//
// Dialogues des PNJ du LABO SCIENTIFIQUE (étage du Centre Pokémon, yellow_infirmary_2e) :
//   • Prof. CHEN — le chef du labo (5,3). Explique le terminal de DÉFIS + ses enjeux ; t'invite à revenir
//     après la Ligue (il te remettra la DAEMONFLÛTE, cf. data/sylvebarbe.ts FLUTE_GIVE_LINES). Mélomane,
//     il bâtit l'instrument qui réveillera le colosse endormi au sud.
//   • L'ASSISTANT — son apprenti (7,6). Aiguille vers les récompenses : CT du terminal, CT UNIQUE du
//     blackjack (Apothéose), et l'œuf-soigneur TONYTONY ; révèle le grand projet du Prof.

/** Prof. CHEN — explication du terminal de défis (quand il ne remet pas la Daemonflûte). */
export const CHEN_LAB_LINES = [
    "« Bienvenue dans mon laboratoire ! Je suis le Prof. CHEN. Ce terminal, juste là, lance des DÉFIS : pompes, squats, ou infliger assez de dégâts d'un type au combat. »",
    "« Les réussir rapporte gros : de l'énergie, des multiplicateurs… et même des CT rares. Mais un défi lancé t'engage — l'échouer, c'est une chance gâchée pour la journée. Choisis bien ton moment ! »",
    "« Et quand tu auras vaincu la Ligue, reviens me voir : j'aurai pour toi une pièce unique… le fruit de toute une vie de recherche. »",
]

/** NG+ — le Prof. CHEN propose d'ABANDONNER le New Game+ (fenêtre des 15 combats) : rendre le starter +
 *  les 6000⚡ (perdus À JAMAIS) contre le retour à la partie de Champion + la flûte + la Zone de Combat. */
export const CHEN_ABANDON_OFFER_LINES = [
    "« Ah… toi. La recrue au Daemon si singulier. Ton regard hésite, mélomane d'un jour. »",
    "« Si ce New Game+ te pèse, je peux tout arrêter : rends-moi ton starter et tes 6000 énergies — perdus À JAMAIS — et je te rends ta vie de Champion, ta Daemonflûte et l'accès à la Zone de Combat. »",
    "« Mais décide-toi vite : encore quelques combats et il sera trop tard. Alors… tu renonces ? »",
]

/** L'ASSISTANT du Prof. CHEN (7,6) — guide vers les récompenses du casino et révèle le projet du chef.
 *  Explique APOTHÉOSE de façon PÉDAGOGIQUE (3 répliques dédiées : le problème → la solution → l'exemple). */
export const LAB_ASSISTANT_LINES = [
    "« Salut ! Je suis l'assistant du Prof. CHEN. Tu as repéré le terminal ? On y gagne des CT en infligeant assez de dégâts d'un type donné — de quoi compléter n'importe quel moveset. »",
    "« Mais la CT la plus folle se gagne au CASINO, à la table de BLACKJACK : amasse 1000 d'énergie et tu débloques APOTHÉOSE. Laisse-moi t'expliquer pourquoi elle change tout… »",
    "« Souviens-toi : chaque attaque tape soit sur l'ATTAQUE, soit sur le SPÉCIAL — ça dépend de son TYPE. Résultat, un Daemon balèze en Attaque dont les attaques de son type passent par le Spécial… gâche la moitié de sa force. »",
    "« APOTHÉOSE règle ça : elle prend le TYPE de ton Daemon (donc le bonus de +50 % du même type est TOUJOURS actif) ET elle frappe sur sa MEILLEURE stat — Attaque ou Spécial, la plus haute chez lui. »",
    "« Exemple concret : un Feu énorme en Attaque mais faible en Spécial. D'habitude ses flammes tapent mou… Avec Apothéose, il crache enfin du Feu à PLEINE puissance, sur son Attaque ! Jamais gâchée, toujours au maximum. »",
    "« Et puis il y a TONYTONY, l'œuf-soigneur. 1000 d'énergie cumulée au casino et il rejoint ton équipe : increvable, il soigne et berce l'adversaire. Un pilier. »",
    "« Le Prof., lui, est un grand mélomane. En ce moment il façonne un instrument censé réveiller le Daemon colossal qui dort au sud de la ville… S'il réussit, ça ouvrira de nouvelles routes ! »",
]
