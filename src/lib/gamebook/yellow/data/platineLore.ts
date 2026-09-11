// src/lib/gamebook/yellow/data/platineLore.ts
//
// PALIER PLATINE — le TRÔNE. Textes du couloir : l'avertissement du Dieu Spaghetti avant d'entrer, l'accueil
// d'ACE (le portier), puis les répliques de sacre et de défaite.
//
// Ce palier ne se « termine » pas comme les autres : on n'y bat pas un boss, on PREND une place — et on la tient
// jusqu'à ce qu'un autre vienne la reprendre. Les textes doivent donc parler de DURÉE, pas de trophée.
//
// TONS (calqués sur l'existant, cf. data/ace.ts et DOME_SPAGHETTI_LINES) :
//   • DIEU SPAGHETTI : grandiloquent, chaleureux, solennel. Il vouvoie l'exploit, jamais le joueur.
//   • ACE : nihiliste, blasé, drôle à froid. Il appelle le joueur « rival ». Il ne se vante jamais vraiment.

/** Le grand discours n'est prononcé QU'UNE FOIS par joueur (marqueur dans defeatedTrainers) ; ensuite il
 *  s'efface et laisse passer (PLATINE_SPAGHETTI_SHORT). */
export const PLATINE_INTRO_MARKER = "platine_intro_seen"

/** Le Dieu Spaghetti, dans la salle de fusion, AVANT de laisser entrer dans le couloir platine. Il explique la
 *  règle du trône — et prévient que les adversaires ne sont plus des créatures de sa main, mais de vraies gens. */
export const PLATINE_SPAGHETTI_LINES = [
    "*La vapeur de sauce se fige d'un coup. Pour la première fois, le Dieu Spaghetti ne sourit pas.*",
    "« Tu as battu ma Ligue. Les quatre, le Champion, et moi-même. Je n'ai plus rien à t'opposer. »",
    "« Alors j'ouvre la dernière porte. Derrière, ce ne sont plus mes créatures : ce sont CELLES DES AUTRES. »",
    "« Chaque salle est un souvenir. L'équipe exacte d'un dresseur, figée le jour où il m'a vaincu. Ils ne vieillissent pas. Ils n'oublient pas. »",
    "« Au bout, il n'y a pas de coffre. Il y a une CHAISE. Celui qui l'occupe est le Maître Ultime du Nexus — jusqu'à ce qu'on vienne l'en déloger. »",
    "« Et tant qu'il la tient… chaque challenger qui échoue le rend plus grand. Y compris toi, si tu tombes. »",
]

/** Deuxième visite et suivantes : il ne refait pas tout le laïus. */
export const PLATINE_SPAGHETTI_SHORT = [
    "*Le Dieu Spaghetti s'écarte sans un mot, et désigne la porte.*",
    "« La chaise est toujours occupée. Va. »",
]

/** ACE, portier du trône. Il ouvre le couloir — avec son mépris habituel, mais on sent qu'il prend ça au sérieux. */
export const PLATINE_ACE_INTRO_VARIANTS: string[][] = [
    [
        "*ACE est assis en travers de la porte, comme s'il attendait là depuis des années.*",
        "« Ah. Le trône. Tout le monde finit par monter ici, rival. »",
        "« Je vais t'épargner le suspense : c'est une chaise. Une chaise où on attend d'être remplacé. »",
        "« Mais on ne passe pas sans moi. Montre-moi que ça valait le déplacement. »",
    ],
    [
        "*ACE ne se lève même pas. Il tapote l'accoudoir d'un siège invisible.*",
        "« Tu veux la place ? Tout le monde la veut. Personne ne la garde. »",
        "« Derrière moi il y a des fantômes — des gens bien réels, figés au meilleur jour de leur vie. »",
        "« Moi je suis juste le bruit que tu entends avant eux. Allez. »",
    ],
    [
        "*ACE lève les yeux, sincèrement surpris — une seconde.*",
        "« Tiens. T'es allé plus loin que je pariais. J'avais misé sur ton abandon au Dieu Spaghetti. »",
        "« Bon. Le règlement est simple : moi d'abord, les autres ensuite, la chaise à la fin. »",
        "« Et quand tu tomberas, celui qui est assis là-haut gagnera un point. Grâce à toi. De rien. »",
    ],
]

/** ACE battu au palier platine : il laisse passer. C'est la seule fois où il concède vraiment quelque chose. */
export const PLATINE_ACE_LOSE_LINES = [
    "*ACE se relève, époussette son épaule, et s'écarte de la porte.*",
    "« D'accord. Tu passes. »",
    "« Je te préviens quand même : moi, je n'étais que la porte. Ce qu'il y a derrière a déjà gagné, une fois. »",
]

/** ACE vainqueur : le couloir se referme, il ne se moque même pas — c'est pire. */
export const PLATINE_ACE_WIN_LINES = [
    "*ACE se rassoit en travers de la porte, sans un mot de trop.*",
    "« Reviens plus fort, rival. La chaise, elle, n'est pas pressée. »",
]

/** Entrée dans la salle d'un champion : son fantôme se lève. `{nick}` = pseudo, `{date}` = jour du sacre. */
export const PLATINE_ROOM_INTRO = "*Le souvenir de {nick} se dresse devant toi — son équipe exacte, figée le {date}.*"

/** SACRE — le joueur prend le trône. Le texte doit dire « à partir de maintenant », pas « bravo ». */
export const PLATINE_SACRE_LINES = [
    "*Le couloir s'éteint derrière toi. Au bout, la chaise est vide.*",
    "« Tu les as tous battus. Ceux d'avant, et celui qui tenait la place. »",
    "« À partir de cet instant, tu es le MAÎTRE ULTIME DU NEXUS. »",
    "« Ton équipe rejoint le couloir : les prochains devront te traverser, TOI, figé tel que te voilà. »",
    "« Garde-la longtemps. Ici, ce n'est pas la victoire qu'on compte — c'est la DURÉE. »",
]

/** DÉFAITE dans le couloir : le maître en titre marque un point. C'est le moment où on le dit au joueur. */
export const PLATINE_DEFEAT_LINES = [
    "*Le couloir se referme. Quelque part, au bout, quelqu'un n'a même pas eu à se lever.*",
    "« Tu es tombé. Le Maître en titre gagne un point — ta tentative le rend un peu plus grand. »",
    "« Reviens. La chaise ne bouge pas ; c'est celui qui s'y assoit qui fatigue. »",
]

/** GÉNÉRIQUE (sacre comme défaite) : intitulés des lignes du récapitulatif des meilleurs coups. */
export const PLATINE_CREDITS_TITLE_WIN = "👑 SACRE — MAÎTRE ULTIME DU NEXUS"
export const PLATINE_CREDITS_TITLE_LOSS = "🪑 LE TRÔNE RESTE OCCUPÉ"
export const PLATINE_CREDITS_MINE = "Tes chimères — leur plus grand coup"
export const PLATINE_CREDITS_FOES = "Ce qu'ils t'ont mis — leur plus grand coup"
export const PLATINE_CREDITS_EMPTY = "— aucun coup porté —"
