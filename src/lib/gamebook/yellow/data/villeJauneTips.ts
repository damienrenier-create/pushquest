// src/lib/gamebook/yellow/data/villeJauneTips.ts
//
// PANNEAU D'ASTUCES de la Ville Jaune (case 23,1 — le « panneau standard » du décor Viridian, jusqu'ici muet).
//   Il affiche UN conseil précis, TIRÉ AU HASARD dans un pool de 20 et RENOUVELÉ toutes les 6 heures (déterministe :
//   tous les joueurs voient le même conseil sur le même créneau, stable tant qu'on ne change pas de fenêtre).
//   Chaque conseil LU s'inscrit dans le CALEPIN (clé = son titre, comme les panneaux du parc → cf. CalepinPanel).
//
// Data pure (aucun React / store) : importable par gameStore (interception du panneau) ET par CalepinPanel (rendu).

export interface VilleJauneTip {
    id: string      // slug stable (tests / futur), non affiché
    title: string   // titre CALEPIN (UNIQUE, distinct des TOPICS du parc) — sert aussi de clé d'enregistrement
    text: string     // le conseil, précis et concret
}

/** Les 20 conseils du panneau (pool de rotation). Titres volontairement distincts de ceux du Manuel/parc. */
export const VILLE_JAUNE_TIPS: readonly VilleJauneTip[] = [
    { id: "vj_capture_hp", title: "💡 Capturer : d'abord affaiblir",
        text: "À PV pleins, une capture plafonne à 40 %. Fais tomber le sauvage sous le TIERS de sa vie et le 100 % devient possible. Bonus : chaque ball ratée facilite un peu la suivante." },
    { id: "vj_capture_statut", title: "💡 Un statut double tes captures",
        text: "Un ennemi ENDORMI ou GELÉ se capture ×2,5 plus facilement ; empoisonné, paralysé ou brûlé, ×1,5. Pose le statut AVANT de lancer ta ball : bien plus rentable que d'enchaîner les jets." },
    { id: "vj_ball_palier", title: "💡 La bonne ball au bon niveau",
        text: "Chaque ball capture les COMMUNS jusqu'à un niveau (à 1/3 de vie) : Nexus < 10, Super < 20, Hyper < 40. Face à un rare ou un haut niveau, monte simplement d'une ball… ou affaiblis davantage." },
    { id: "vj_types_x4", title: "💡 Le ×4, ton meilleur ami",
        text: "Frapper avec un type super efficace, c'est ×2 de dégâts. Si la cible cumule DEUX faiblesses au même type (ex. Roche/Sol face à l'Eau), c'est ×4 : de quoi one-shot un ennemi bien plus costaud." },
    { id: "vj_wild_cap", title: "💡 Le plafond des sauvages",
        text: "Chaque badge d'arène relève le niveau maxi des sauvages : 12 → 17 → 30 → 45 → 60. Tes tout premiers combats sont volontairement plus doux — profites-en pour bâtir ton équipe." },
    { id: "vj_xp_partage", title: "💡 Faire monter un traînard",
        text: "L'XP d'un ennemi vaincu va à TOUS les Daemons qui l'ont affronté, pas au banc. Envoie une jeune recrue quelques secondes au front avant de la rappeler : même un bref passage lui donne sa part." },
    { id: "vj_4_moves", title: "💡 « Plus tard » existe",
        text: "Un Daemon ne retient que 4 attaques. Quand une 5e se présente (niveau ou CT), tu n'es plus forcé de choisir sur le moment : « Plus tard » la range dans sa FICHE, à installer au calme quand tu veux." },
    { id: "vj_buffs", title: "💡 Un tour de mise, puis on balaie",
        text: "Danse-Lames monte ton Attaque de 2 crans d'un coup : un tour investi, puis tu écrases. Les objets X font pareil EN plein combat (+1 cran sur une stat, le temps du duel) — gardes-en pour les gros dresseurs." },
    { id: "vj_ace", title: "💡 ACE, à battre chaque jour",
        text: "ACE se cale sur la moyenne de ton équipe +2, mais en CLIQUET : son niveau ne grimpe qu'APRÈS que tu l'aies battu, jamais parce que TU montes. Bats-le une fois par jour ; à la 7e victoire, il te lègue un Panthéon !" },
    { id: "vj_reflets", title: "💡 Les reflets rapportent gros",
        text: "Les reflets des autres dresseurs rôdent en ville et sur la Route Nord. Les vaincre donne XP DOUBLÉE, une ball et de l'énergie remboursée — une victoire par reflet et par jour. Un vrai bonus de progression." },
    { id: "vj_reflet_ball", title: "💡 La ball des reflets grimpe",
        text: "La ball gagnée sur un reflet suit ta progression d'arène : Nexus-Ball avant l'arène 3, Super Nexus-Ball ensuite, puis HYPER une fois les 5 arènes tombées. Plus tu avances, mieux tu es récompensé." },
    { id: "vj_archiviste", title: "💡 Le Collectionneur qui erre",
        text: "Un Collectionneur passionné arpente la ville et te défie 3 fois par jour avec les Daemons que TU as croisés. Facile avant ta 1re arène, à ton niveau vers la 3e, puis un cran au-dessus — et chaque match du jour est plus corsé." },
    { id: "vj_fuite", title: "💡 Fuir n'est pas tricher",
        text: "Face à un sauvage trop coriace, fuir n'a rien de honteux. Mais un DRESSEUR, lui, ne te laisse pas filer : dès que son regard te croise, c'est vaincre ou tomber. Soigne-toi AVANT de t'engager." },
    { id: "vj_centre", title: "💡 Le Centre et son étage",
        text: "Le Centre Daemon soigne toute l'équipe gratuitement et range tes captures au PC. Surtout, monte à l'ÉTAGE : le labo y brade des CT, distribue de l'énergie… et offre même un Daemon." },
    { id: "vj_iv", title: "💡 Deux clones, deux potentiels",
        text: "Deux Daemons de même espèce et niveau n'ont PAS les mêmes stats : leur potentiel génétique (IV) varie du tout au tout. Enchaîne les rencontres d'une espèce convoitée pour dénicher le spécimen PARFAIT." },
    { id: "vj_ev", title: "💡 L'entraînement se voit (EV)",
        text: "Battre des sauvages muscle discrètement les stats (EV) de ceux qui combattent. Sur la durée, un Daemon bien rôdé dépasse un clone négligé de plusieurs points par stat — varie tes adversaires pour l'équilibrer." },
    { id: "vj_super_pasta", title: "💡 Un Super Pasta pour débloquer",
        text: "Au labo (étage du Centre), un Super Pasta fait gagner un niveau d'un coup à un Daemon. Idéal pour pousser un traînard jusqu'à son évolution ou lui faire apprendre l'attaque du palier suivant." },
    { id: "vj_clans", title: "💡 Prête serment à un clan",
        text: "Dès ta 1re arène battue, la Chapelle de la ville te laisse jurer fidélité à UN clan : Air, Combat ou Roche. Le pacte t'offre un Daemon rare et ses faveurs — mais il est IRRÉVERSIBLE pour tout le run. Choisis bien." },
    { id: "vj_sage", title: "💡 Le Sage rebat les cartes",
        text: "Mal réparti les points de puissance d'un Daemon ? Un vieux Sage de la ville peut les REDISTRIBUER (dans une limite quotidienne). De quoi rattraper une erreur de jeunesse sans repartir de zéro." },
    { id: "vj_calepin", title: "💡 Ce panneau change… note-le !",
        text: "Ce panneau affiche une nouvelle astuce toutes les 6 heures. Chaque conseil que tu lis s'inscrit dans ton CALEPIN (menu START), où tu peux même ajouter tes notes. Repasse souvent pour tous les collectionner !" },
] as const

/** Durée d'une fenêtre de rotation : 6 heures (en millisecondes). */
export const VILLE_JAUNE_TIP_WINDOW_MS = 6 * 60 * 60 * 1000

/** Index du conseil affiché pour un instant donné : la fenêtre de 6 h est HACHÉE → tirage pseudo-aléatoire stable
 *  (ne défile pas dans l'ordre), identique pour tous les joueurs sur le même créneau. */
export function currentVilleJauneTipIndex(nowMs: number): number {
    const win = Math.floor(nowMs / VILLE_JAUNE_TIP_WINDOW_MS)
    let h = (win ^ 0x9e3779b9) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0
    h = (h ^ (h >>> 16)) >>> 0
    return h % VILLE_JAUNE_TIPS.length
}

/** Le conseil du créneau courant. */
export function currentVilleJauneTip(nowMs: number): VilleJauneTip {
    return VILLE_JAUNE_TIPS[currentVilleJauneTipIndex(nowMs)]
}
