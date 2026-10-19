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

import { topHits, bestHitOverall, type BestHit, type PlatineLedger } from "./platineLedger"

/** ANNONCE D'OUVERTURE — posée à l'Autel, une seule fois. Le sacre OR d'un futur champion dit déjà « va au
 *  trône » (cf. le REFLET dans trainers.ts), mais les champions OR d'AVANT la feature ne reverront jamais
 *  ce texte : sans cette annonce, le palier leur serait ouvert en SILENCE et ils ne le sauraient jamais. */
export const PLATINE_ANNOUNCE_MARKER = "platine_announce_seen"

/** Le Dieu Spaghetti, sur le dôme de l'Autel, le jour où la dernière porte s'ouvre. */
export const PLATINE_THRONE_OPEN_LINES = [
    "*Le Dieu Spaghetti t'attend au pied de la porte à dragons. Il a l'air… nerveux.*",
    "« Maître de la Chimère. Tu as bouclé mon OR, et j'ai longtemps cru que c'était la fin de l'histoire. »",
    "« Je me trompais. Il restait une porte, derrière la mienne. Je viens de la descelller. »",
    "« Derrière, il n'y a plus de Conseil, plus de boss, plus de moi. Il y a un COULOIR — et au bout, une CHAISE. »",
    "« Celui qui l'occupe est le Maître Ultime du Nexus. Aujourd'hui, la chaise attend. Demain, quelqu'un d'autre y sera assis. »",
    "« La porte à dragons ne mène plus au Conseil. Elle mène là-haut. Quand tu voudras. »",
]

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

/** La version courte a-t-elle déjà été servie ? Au-delà, il laisse passer sans un mot : deux lignes à chaque
 *  entrée deviendraient un péage, et on retente ce couloir souvent. */
export const PLATINE_SHORT_SEEN_MARKER = "platine_short_seen"

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

/** Entrée dans la salle du MAÎTRE EN TITRE — la dernière. `{nick}` = pseudo, `{days}` = jours de règne. */
export const PLATINE_THRONE_INTRO = "*La chaise n'est pas vide. {nick} s'y tient depuis {days} — et son équipe se lève sans se presser.*"

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

// ─────────── L'EXCUSE ET LE POT-DE-VIN (idée Sartay) ───────────
// Perdre, c'est humiliant. Alors le vaincu se justifie — mal — puis achète le silence du joueur en jetons de
// combat. Le tarif est indexé sur les dégâts qu'il a causés : 50 JC par Daemon qu'il a mis K.O.
// Personne n'est dupe, et c'est tout l'intérêt.

/** Tarif du silence, par Daemon du joueur mis K.O. par le vaincu. */
export const PLATINE_BRIBE_PER_KO = 50

/** LE TARIF DU SILENCE, pour UNE salle.
 *
 *  ⚠️ Le couloir REPORTE les PV d'une salle à l'autre : en fin de combat, l'équipe contient aussi les morts
 *  des salles précédentes. Facturer le total reviendrait à faire payer à chaque adversaire les victimes de
 *  ses prédécesseurs (bug mesuré : ~1000-1500 JC sur un couloir complet au lieu de ~200). On ne facture donc
 *  que le DELTA de cette salle-là. Le delta est borné à 0 : si le compteur d'ouverture est en avance sur la
 *  réalité (équipe reconstruite, reprise de combat), on préfère ne rien facturer qu'inventer une dette. */
export function platineBribe(koAtEnd: number, koAtStart: number): { ko: number; jc: number } {
    const ko = Math.max(0, Math.floor(koAtEnd) - Math.floor(koAtStart))
    return { ko, jc: ko * PLATINE_BRIBE_PER_KO }
}

/** Excuses bidon. `{n}` = nombre de Daemons du joueur qu'il a mis K.O. (0 possible : il n'a rien touché). */
export const PLATINE_EXCUSES: string[] = [
    "« Le sol était glissant. Enfin — il l'aurait été, s'il y avait eu de l'eau. »",
    "« J'ai un souci de synergie en ce moment. C'est mes parents. Enfin, les leurs. »",
    "« Ma chimère a mal dormi. Les Spores Dodo, ça marche dans les deux sens, figure-toi. »",
    "« Techniquement, j'ai gagné. C'est juste que toi aussi, et plus fort. »",
    "« J'étais en train de compter mes points. On m'a déconcentré. »",
    "« La lumière de cette salle écrase les couleurs. Mes types ne ressortaient pas. »",
    "« Mon objet tenu était périmé. Je savais que j'aurais dû lire l'étiquette. »",
    "« Ce n'était pas mon vrai moveset. C'était… un brouillon. Un moveset de répétition. »",
    "« Le RNG. Je ne dirai rien de plus. Le RNG. »",
    "« J'ai voulu te laisser une chance, au début. Après, c'était trop tard pour faire demi-tour. »",
    "« Mes STAB étaient mal calibrées. Le Dieu Spaghetti me doit une révision. »",
    "« Honnêtement ? J'avais la tête au prochain palier. Celui d'après le tien. »",
]

/** La phrase du pot-de-vin. `{jc}` = montant, `{n}` = Daemons mis K.O. */
export const PLATINE_BRIBE_LINE = "*Il sort une poignée de jetons et te la fourre dans la main, sans te regarder.*"
export const PLATINE_BRIBE_DEAL = "« Tiens. {jc} jetons — {n} des tiens sont tombés, c'est le tarif. On est d'accord que rien de tout ça n'est arrivé ? »"
/** Cas où il n'a mis AUCUN Daemon K.O. : il n'a rien à monnayer, et c'est encore pire pour lui. */
export const PLATINE_BRIBE_NONE = "« Je te donnerais bien quelque chose pour ton silence, mais je n'ai même pas touché un seul des tiens. Garde ta pitié. »"

// ─────────── LE GÉNÉRIQUE, EN LIGNES LISIBLES ───────────
// Le registre (platineLedger) retient le plus gros coup de chaque chimère, des deux côtés. On en fait ici des
// lignes de dialogue : c'est ce qui transforme « tu as gagné » en récit — on se souvient du coup, pas du score.
// Fonction PURE (aucun store, aucune date) → testable, et réutilisable telle quelle par un futur écran dédié.

/** Récapitulatif des meilleurs coups du parcours, prêt à être affiché ligne par ligne. */
export function platineCreditsLines(ledger: PlatineLedger, won: boolean, limit = 3): string[] {
    const fmt = (h: BestHit) => `  ${h.name} — ${h.move} · ${h.damage} dégâts${h.room ? ` (${h.room})` : ""}`
    const mine = topHits(ledger, "mine", limit)
    const foes = topHits(ledger, "foes", limit)
    const out: string[] = [won ? PLATINE_CREDITS_TITLE_WIN : PLATINE_CREDITS_TITLE_LOSS]
    out.push(PLATINE_CREDITS_MINE, ...(mine.length ? mine.map(fmt) : [`  ${PLATINE_CREDITS_EMPTY}`]))
    out.push(PLATINE_CREDITS_FOES, ...(foes.length ? foes.map(fmt) : [`  ${PLATINE_CREDITS_EMPTY}`]))
    const best = bestHitOverall(ledger)
    if (best) out.push(`LE coup du parcours : ${best.name} — ${best.move}, ${best.damage} dégâts.`)
    return out
}

// ── LE DÉTENTEUR DANS SA SALLE (19/10/2026 — la « salle de trône vide » de Mools) ──
/** Dernier adversaire tombé : le joueur vient d'être SACRÉ. Le vaincu ne le chasse plus (« va-t'en »), il lui cède la chaise. */
export const PLATINE_JUST_CROWNED_LINES = [
    "*Il est à terre. Derrière lui, la chaise n'attend plus que toi.*",
    "« C'est fait. À partir de maintenant, le couloir porte TON nom — la porte de droite mène à ta chaise. »",
]
/** Couloir TERMINÉ, le joueur est devant la chaise : la salle n'est pas vide, elle est à lui. */
export const PLATINE_HOLDER_ROOM_LINES = [
    "*Au fond, la chaise. Personne devant : c'est TOI qui t'y assois.*",
    "« 👑 Tu es le MAÎTRE ULTIME DU NEXUS. Ton règne et ton équipe figée sont gravés : les prochains devront te traverser, et chacun qui tombe dans ton couloir t'apporte un point. »",
    "« Pour contempler ton règne : START → 🏆 Palmarès → 📊 Classement concours → onglet 🐉 Ligue → 💎 Empereurs du Nexus. »",
]
/** Le tenant affronte sa PROPRE chaise (dernière salle = lui-même). `{days}` = ancienneté du règne. Gagner regrave l'équipe sans toucher au chrono. */
export const PLATINE_SELF_THRONE_INTRO = "*La chaise n'est pas vide : c'est TOI qui t'y tiens depuis {days}. Ton double se lève — bats-le, et ton équipe gravée sera celle d'aujourd'hui.*"

/** Défaite alors que le trône est VACANT : personne ne marque de point (cf. PLATINE_DEFEAT_LINES quand il y a un tenant). */
export const PLATINE_DEFEAT_LINES_VACANT = [
    "*Le couloir se referme derrière toi.*",
    "« Tu es tombé. Personne ne marque sur ta chute : la chaise est toujours vide, et elle attend qu'on vienne la prendre. »",
]
/** Le MAÎTRE EN TITRE tombe dans son propre couloir : le serveur ignore ce point (pas d'auto-crédit), son règne ne bouge pas. */
export const PLATINE_DEFEAT_LINES_SELF = [
    "*Le couloir se referme derrière toi.*",
    "« Tombé dans ton propre couloir. Ta chaise reste à toi : on ne marque pas de point sur soi-même, et ton règne continue. »",
]
/** Lignes de défaite selon le tenant : `holderUserId` undefined = INCONNU (couloir pas chargé → cas général) ; null = trône
 *  vacant ; égal à `myUserId` = le Maître lui-même. */
export function platineDefeatBaseLines(holderUserId: string | null | undefined, myUserId: string | null): string[] {
    if (holderUserId === undefined) return [...PLATINE_DEFEAT_LINES]
    if (!holderUserId) return [...PLATINE_DEFEAT_LINES_VACANT]
    if (myUserId && holderUserId === myUserId) return [...PLATINE_DEFEAT_LINES_SELF]
    return [...PLATINE_DEFEAT_LINES]
}

/** Titre des crédits de défaite quand la chaise est VIDE (le titre par défaut dit « reste occupé »). */
export const PLATINE_CREDITS_TITLE_VACANT = "🪑 LA CHAISE RESTE VIDE"
/** Le sacre n'a pas encore été accepté par le serveur (POST en échec, rejoué au prochain chargement). */
export const PLATINE_CLAIM_PENDING_LINE = "« Le Nexus n'a pas encore gravé ton nom — il réessaiera au prochain chargement. »"
/** Intro de la chaise une fois le couloir terminé (remplace l'intro statique « quelqu'un devant elle »). */
export const PLATINE_EMPTY_CHAIR_INTRO = "*Au fond, la chaise t'attend. Personne devant.*"
