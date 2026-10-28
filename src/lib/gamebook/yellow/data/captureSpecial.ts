// src/lib/gamebook/yellow/data/captureSpecial.ts
//
// OBTENTION SPÉCIALE — pour le Daemomaniaque (captureGuide). Décrit COMMENT obtenir les espèces qui NE se
// croisent PAS à l'état sauvage (évolutions par pierre/objet/échange, cadeaux de PNJ, boss statiques, rôdeurs,
// boss de fusion, achats boutique). Utilisé UNIQUEMENT en repli, quand la recherche sauvage ne renvoie rien
// pour la run consultée → si l'espèce EST sauvage dans cette run, c'est la localisation sauvage qui prime.
//
// Chaque texte est VÉRIFIÉ dans le code (audit 03/08/2026 — gekroc.ts, playerStore.ts, ace.ts, orcalineTrainer.ts,
// caveTrader.ts, hauntedNpcs.ts, pnj6.ts, sylvebarbe.ts, ukognofy.ts, labDefis.ts, CombatShopModal.tsx). Pas
// d'import (données pures) → aucun risque de cycle. { where } = 📍 OÙ/QUAND · { how } = 🎯 COMMENT · { note } = résumé.

export interface SpecialObtain {
    where?: string[]
    how?: string[]
    note?: string
    /** Runs où cette obtention est RÉELLEMENT possible : 1, 2, 3, et 4 = run fusion (live Champion, après la Ligue) comme après
     *  le run 3. [] = jamais obtenable (dex de référence). Absent = tous. Lu par runObtainableSpecies (Daemomaniaque, 26/10/2026). */
    runs?: number[]
}

// Les 6 panthères = évolution d'un Panthéon avec la Pierre Gékroc (choix du type). Texte commun généré ci-dessous.
const PANTHER_HOW = [
    "Panthéon = cadeau d'ACE à ta 7e victoire (1 combat/jour).",
    "Pierre Gékroc = bats ou capture le gardien de la Centrale (Gékroc au run 1, Gékraise au run 2, Gékosmic au run 3).",
]
const panther = (typeLabel: string): SpecialObtain => ({
    runs: [1, 2, 3, 4], // Panthéon (ACE) + Pierre (Gékroc / Gékraise / Gékosmic à la Centrale) dans chaque run
    note: `Fais évoluer un Panthéon avec la Pierre Gékroc en choisissant le type ${typeLabel}.`,
    how: PANTHER_HOW,
})

export const SPECIAL_OBTAIN: Record<string, SpecialObtain> = {
    // ── Évolutions par PIERRE (Panthéon → 6 panthères) ──
    pyropanthe: panther("FEU"),
    aquapanthe: panther("EAU"),
    voltapanthe: panther("ÉLEC"),
    florapanthe: panther("PLANTE"),
    panthegel: {
        runs: [1, 2, 3, 4],
        note: "Fais évoluer un Panthéon avec la Pierre Gékroc (type GLACE).",
        how: [...PANTHER_HOW, "Sinon : cadeau du Dresseur de Panthégel (plaine des Hautes Herbes) à ta 1re victoire en run 2."],
    },
    ombrapanthe: panther("SPECTRE"),

    // ── Évolution par OBJET (Magmator → Magnetor) ──
    magnetor: {
        runs: [3, 4],
        note: "Fais évoluer un Magmator (niv 50+) avec le Noyau de Métal.",
        how: [
            "Noyau de Métal = boutique Jetons de Combat (200 JC), à utiliser depuis la fiche du Magmator.",
            "En run 3 : le Prof. Chen le fait pour toi si tu as un Magmator niv 50+ en équipe.",
        ],
    },

    // ── Évolutions / obtentions par ÉCHANGE ──
    aquilord: {
        runs: [1, 3, 4],
        note: "Aquilothan évolue par ÉCHANGE.",
        how: ["Va voir le Brocanteur de Cendreville avec un Aquilothan (ou échange avec un autre joueur)."],
    },
    rochison: {
        runs: [1, 4],
        note: "Roctaur évolue par ÉCHANGE (run 1).",
        how: ["Échange un Roctaur au Brocanteur de Cendreville."],
    },
    morrow: {
        runs: [2],
        note: "Obtenu par ÉCHANGE — run 2 uniquement.",
        how: ["Échange un Roctaur au Brocanteur de Cendreville (run 2)."],
    },
    crocavern: {
        runs: [4],
        note: "Obtenu par ÉCHANGE uniquement — jamais sauvage (26/10/2026).",
        how: ["Bats l'Échangeur de la Grotte du Nexus (1F), puis échange ton Daemon de tête contre lui."],
    },
    belunode: {
        runs: [1, 2, 4],
        note: "Obtenu par ÉCHANGE.",
        how: ["Donne un Limaroche au Dénicheur (Route Nord, près de l'entrée de la grotte) — run 1 & 2."],
    },
    marmoterre: {
        runs: [3],
        note: "Obtenu par ÉCHANGE — run 3.",
        how: ["Donne un Ruffiant au Dénicheur (Route Nord) — run 3."],
    },

    // ── CADEAUX de PNJ ──
    pantheon: {
        runs: [1, 2, 3, 4],
        note: "Cadeau d'ACE.",
        how: ["Bats ACE 7 fois (1 combat/jour) — il te l'offre à ta 7e victoire."],
    },
    orcaline: {
        runs: [1, 2, 3, 4],
        note: "Cadeau du Dresseur d'Orcaline (run 1).",
        how: ["Bats le Dresseur d'Orcaline (plaine des Hautes Herbes) — il te l'offre à ta 1re victoire.", "En run 2/3 : sauvage à la Grotte Gelée (lead niv 35+)."],
    },
    tonytony: {
        runs: [1, 4],
        note: "Cadeau du casino.",
        how: ["Gagne 1000⚡ nettes au casino/blackjack, puis récupère-le au Labo (Prof. Chen). Shiny à 5000⚡."],
    },
    merorem: {
        runs: [2],
        note: "Cadeau du casino — run 2.",
        how: ["Comme Tonytony mais au run 2 : 1000⚡ nettes au casino, récupéré au Labo."],
    },

    // ── BOSS statiques capturables (+ rachat boutique) ──
    gekroc: {
        runs: [1, 4],
        note: "Mini-boss statique — run 1.",
        how: ["Bats OU capture Gékroc à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    gekraise: {
        runs: [2, 4],
        note: "Mini-boss statique — run 2.",
        how: ["Bats OU capture Gékraise à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    gekosmic: {
        runs: [3, 4],
        note: "Mini-boss statique — run 3.",
        how: ["Bats OU capture Gékosmic à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    geckebre: {
        runs: [4],
        note: "Achat boutique.",
        how: ["Boutique Jetons de Combat de la Zone de Combat (1500 JC) — livré niv 60."],
    },
    geaucke: {
        runs: [1, 2, 3, 4],
        note: "Achat boutique OU giga-rare à la pêche.",
        how: [
            "Boutique Jetons de Combat de la Zone de Combat (1500 JC) — livré niv 60.",
            "OU à la CANNE À PÊCHE : giga-rare (~1 % de touche, niv 30), face à un plan d'eau. Ne réapparaît plus une fois capturé.",
        ],
    },
    sylvebarbe: {
        runs: [4],
        note: "Boss statique.",
        how: ["Réveille-le avec la Daemonflûte (donnée par le Prof. Chen après la Ligue), puis bats/capture-le (route sud vers la Zone de Combat). Aussi en boutique Jetons (1500 JC)."],
    },

    // ── RÔDEURS / boss de fusion ──
    mimimoy: {
        runs: [1, 3, 4],
        note: "Rôdeur.",
        how: ["Il rôde et remplace une rencontre sauvage une fois « armé » (fais l'échange premium Aquilothan→Aquilord au Brocanteur). Chance décroissante ; disparaît une fois capturé."],
    },
    ukognofy: {
        runs: [4],
        note: "Boss de fusion légendaire.",
        how: ["Dans une chambre cachée de la Grotte (niv 100, la nuit 21h→3h, après avoir vu une fusion sauvage…). Capture UNIQUEMENT à la Fusio-Ball. Disparaît après capture OU 3 échecs."],
    },

    // ── Lignée Phoéchaud (sauvage Grotte run 3 — repli pour les autres runs) ──
    phoechaudi: {
        runs: [3],
        note: "Lignée du run 3.",
        how: ["Sauvage (rare) dans la Grotte au run 3 : capture Phoéchaudi, puis fais-le évoluer (niv 22 → 40)."],
    },

    // ── Starters du run 3 (bases) ──
    elefer: { runs: [3], note: "Starter du run 3 (jamais sauvage).", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE.", "⚠️ Seulement 2 des 3 lignées-starter par run 3 : pour la lignée qu'a choisie ACE, il faut RECOMMENCER un run 3 en la prenant comme starter."] },
    cornaive: { runs: [3], note: "Starter du run 3 (jamais sauvage).", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE.", "⚠️ Seulement 2 des 3 lignées-starter par run 3 : pour la lignée qu'a choisie ACE, il faut RECOMMENCER un run 3 en la prenant comme starter."] },
    coccipoing: { runs: [3], note: "Starter du run 3 (jamais sauvage).", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE.", "⚠️ Seulement 2 des 3 lignées-starter par run 3 : pour la lignée qu'a choisie ACE, il faut RECOMMENCER un run 3 en la prenant comme starter."] },

    // ── Création canonisée de Jacanon : depuis le 27/10/2026, la lignée ne se croise plus qu'au run 3, dans la Grotte Gelée,
    //    au stade Wallabisan minimum (niv 22+). Ces textes ne servent que hors de cette zone (repli du guide). ──
    joeyrrant: { runs: [], note: "Non obtenable.", how: ["Création canonisée de Jacanon. Sa lignée ne se croise plus qu'au stade Wallabisan (Grotte Gelée, run 3, niv 22+) : le petit Joeyrrant, lui, ne se capture plus."] },
    wallabisan: { runs: [], note: "Sauvage au run 3 uniquement.", how: ["Très rare dans la Grotte Gelée pendant le concours (run 3) : moins d'une rencontre sur 100, jamais sous le niv 22. Absent des autres runs."] },
    kangoudead: { runs: [], note: "Sauvage au run 3 uniquement.", how: ["Très rare dans la Grotte Gelée pendant le concours (run 3), dès le niv 40 (sinon : fais évoluer un Wallabisan). Absent des autres runs."] },

    // ── PÊCHE (canne offerte par la Fashion Victim, Grotte 1F — face à un plan d'eau) ──
    // ── Starters du run 1 (offerts par le Prof. Chen ; sauvages seulement au run 3, dans la Grotte) ──
    gouttiny: { runs: [1, 4], note: "Starter du run 1.", how: ["Offert par le Prof. Chen au tout début du run 1 (l'un des 3 au choix). Sauvage (rare) dans la Grotte au run 3."] },
    feuillichot: { runs: [1, 4], note: "Starter du run 1.", how: ["Offert par le Prof. Chen au tout début du run 1 (l'un des 3 au choix). Sauvage (rare) dans la Grotte au run 3."] },
    braisille: { runs: [1, 4], note: "Starter du run 1.", how: ["Offert par le Prof. Chen au tout début du run 1 (l'un des 3 au choix). Sauvage (rare) dans la Grotte au run 3."] },

    // ── Daemons de CLAN (Chapelle de Nouillon, Ville Jaune, dès 1 badge) : le chef confie son disciple niv 5 au pacte ──
    pivinci: { runs: [1, 2, 3, 4], note: "Daemon du clan de l'Air.", how: ["Rejoins le clan de l'Air à la Chapelle de Nouillon (Ville Jaune, dès 1 badge) : son chef te confie ce disciple niv 5 au moment du pacte. Un seul clan par monde."] },
    lapifrappe: { runs: [1, 2, 3, 4], note: "Daemon du clan du Combat.", how: ["Rejoins le clan du Combat à la Chapelle de Nouillon (Ville Jaune, dès 1 badge) : son chef te confie ce disciple niv 5 au moment du pacte. Un seul clan par monde."] },
    fujipanda: { runs: [1, 2, 3, 4], note: "Daemon du clan de la Roche.", how: ["Rejoins le clan de la Roche à la Chapelle de Nouillon (Ville Jaune, dès 1 badge) : son chef te confie ce disciple niv 5 au moment du pacte. Un seul clan par monde."] },

    // ── PÊCHE : signatures des plans d'eau (loutrille Grotte, obscurène Cendreville) et le rare du run 3 ──
    loutrille: {
        runs: [1, 2, 3, 4],
        note: "PÊCHABLE uniquement.",
        how: ["Canne à pêche face à l'eau de la Grotte Rocheuse (signature du plan d'eau, toutes runs). Au run 1, c'est aussi la prise commune de tous les autres plans d'eau."],
    },
    obscurene: {
        runs: [2, 3, 4],
        note: "PÊCHABLE à Cendreville.",
        how: ["Canne à pêche face à l'eau de Cendreville (signature du plan d'eau). Au run 1, seulement une fois Sylvebarbe vaincu (les Ténèbres n'apparaissent pas avant)."],
    },
    onirail: {
        runs: [3],
        note: "PÊCHABLE à Cendreville — run 3 uniquement (rare).",
        how: ["Canne à pêche face à l'eau de Cendreville pendant le concours : il remplace le rare horaire (Osquille/Rô). RARE ; affaiblis-le d'abord."],
    },
    guizer: {
        runs: [3],
        note: "PÊCHABLE à la Grotte Gelée — run 3 uniquement (très rare).",
        how: ["Canne à pêche face à l'eau de la Grotte Gelée pendant le concours : environ 3 % des lancers (une prise rare sur quatre ; les autres restent Osquille ou Rô). TRÈS RARE ; affaiblis-le d'abord. Il mord toujours au stade Guizer (niv 21 max) : à toi de le faire évoluer. Création canonisée de Task1."],
    },

    osquille: {
        runs: [1, 2, 3, 4],
        note: "PÊCHABLE de JOUR (8h→20h) — rare.",
        how: ["Canne à pêche face à un plan d'eau, de 8h à 20h. RARE (plus tu as fait de reps aujourd'hui, plus de chances) ; DURE à capturer : affaiblis-la d'abord. Présente aux 3 runs."],
    },
    ro: {
        runs: [1, 2, 3, 4],
        note: "PÊCHABLE de NUIT (20h→8h) — rare.",
        how: ["Canne à pêche face à un plan d'eau, de 20h à 8h. RARE (× tes reps du jour) ; DURE à capturer : affaiblis-la d'abord. Présente aux 3 runs."],
    },
    braisecaille: {
        runs: [1, 2, 3, 4],
        note: "PÊCHABLE uniquement (tous runs).",
        how: ["À la canne à pêche seulement, face à un plan d'eau (retirée du sauvage). Commune présente aux 3 runs."],
    },
    calderont: {
        runs: [1, 2, 3, 4],
        note: "Évolution d'un Braisécaille pêché.",
        how: ["Pêche un Braisécaille (canne, plan d'eau), puis fais-le évoluer (niv 32)."],
    },
}

/** Précisions PROPRES À UNE RUN, ajoutées au « comment » de l'obtention spéciale quand le guide consulte cette run. */
export const SPECIAL_OBTAIN_RUN_EXTRA: Record<string, Partial<Record<number, string[]>>> = {
    osquille: { 3: ["Au run 3 : jamais à Cendreville (Onirail y mord à la place) ; à la Grotte Gelée, une prise rare sur quatre est un Guizer."] },
    ro: { 3: ["Au run 3 : jamais à Cendreville (Onirail y mord à la place) ; à la Grotte Gelée, une prise rare sur quatre est un Guizer."] },
}

/** MODE FUN — « comment » de remplacement là où le texte classique parle des reps du jour (le joueur fun n'en encode
 *  aucune). Pêche : sans reps, la chance de RARE reste la base fixe FISHING_RARE_BASE = 12 % par lancer (data/fishing.ts,
 *  repsMult = 1 + dépassement de quota = 1 en fun), soit environ 1 lancer sur 8. */
export const SPECIAL_OBTAIN_FUN_HOW: Record<string, string[]> = {
    osquille: ["Canne à pêche face à un plan d'eau, de 8h à 20h. RARE (environ 1 lancer sur 8) ; DURE à capturer : affaiblis-la d'abord. Présente aux 3 runs."],
    ro: ["Canne à pêche face à un plan d'eau, de 20h à 8h. RARE (environ 1 lancer sur 8) ; DURE à capturer : affaiblis-la d'abord. Présente aux 3 runs."],
}
