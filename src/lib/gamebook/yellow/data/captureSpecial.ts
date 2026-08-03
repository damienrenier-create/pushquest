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
}

// Les 6 panthères = évolution d'un Panthéon avec la Pierre Gékroc (choix du type). Texte commun généré ci-dessous.
const PANTHER_HOW = [
    "Panthéon = cadeau d'ACE à ta 7e victoire (1 combat/jour).",
    "Pierre Gékroc = bats ou capture Gékroc (mini-boss statique de la Centrale).",
]
const panther = (typeLabel: string): SpecialObtain => ({
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
        note: "Fais évoluer un Panthéon avec la Pierre Gékroc (type GLACE).",
        how: [...PANTHER_HOW, "Sinon : cadeau du Dresseur de Panthégel (plaine des Hautes Herbes) à ta 1re victoire en run 2."],
    },
    ombrapanthe: panther("SPECTRE"),

    // ── Évolution par OBJET (Magmator → Magnetor) ──
    magnetor: {
        note: "Fais évoluer un Magmator (niv 50+) avec le Noyau de Métal.",
        how: [
            "Noyau de Métal = boutique Jetons de Combat (200 JC), à utiliser depuis la fiche du Magmator.",
            "En run 3 : le Prof. Chen le fait pour toi si tu as un Magmator niv 50+ en équipe.",
        ],
    },

    // ── Évolutions / obtentions par ÉCHANGE ──
    aquilord: {
        note: "Aquilothan évolue par ÉCHANGE.",
        how: ["Va voir le Brocanteur de Cendreville avec un Aquilothan (ou échange avec un autre joueur)."],
    },
    rochison: {
        note: "Roctaur évolue par ÉCHANGE (run 1).",
        how: ["Échange un Roctaur au Brocanteur de Cendreville."],
    },
    morrow: {
        note: "Obtenu par ÉCHANGE — run 2 uniquement.",
        how: ["Échange un Roctaur au Brocanteur de Cendreville (NG+)."],
    },
    crocavern: {
        note: "Obtenu par ÉCHANGE.",
        how: ["Bats l'Échangeur de la Grotte du Nexus (1F), puis échange ton Daemon de tête contre lui."],
    },
    belunode: {
        note: "Obtenu par ÉCHANGE.",
        how: ["Donne un Limaroche au Dénicheur (Route Nord, près de l'entrée de la grotte) — run 1 & 2."],
    },
    marmoterre: {
        note: "Obtenu par ÉCHANGE — run 3.",
        how: ["Donne un Ruffiant au Dénicheur (Route Nord) — run 3."],
    },

    // ── CADEAUX de PNJ ──
    pantheon: {
        note: "Cadeau d'ACE.",
        how: ["Bats ACE 7 fois (1 combat/jour) — il te l'offre à ta 7e victoire."],
    },
    orcaline: {
        note: "Cadeau du Dresseur d'Orcaline (run 1).",
        how: ["Bats le Dresseur d'Orcaline (plaine des Hautes Herbes) — il te l'offre à ta 1re victoire.", "En run 2/3 : sauvage à la Grotte Gelée (lead niv 35+)."],
    },
    tonytony: {
        note: "Cadeau du casino.",
        how: ["Gagne 1000⚡ nettes au casino/blackjack, puis récupère-le au Labo (Prof. Chen). Shiny à 5000⚡."],
    },
    merorem: {
        note: "Cadeau du casino — run 2.",
        how: ["Comme Tonytony mais en NG+ : 1000⚡ nettes au casino, récupéré au Labo."],
    },

    // ── BOSS statiques capturables (+ rachat boutique) ──
    gekroc: {
        note: "Mini-boss statique — run 1.",
        how: ["Bats OU capture Gékroc à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    gekraise: {
        note: "Mini-boss statique — run 2.",
        how: ["Bats OU capture Gékraise à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    gekosmic: {
        note: "Mini-boss statique — run 3.",
        how: ["Bats OU capture Gékosmic à la Centrale (une seule fois). Aussi en boutique Jetons de Combat (1500 JC)."],
    },
    geckebre: {
        note: "Achat boutique.",
        how: ["Boutique Jetons de Combat de la Zone de Combat (1500 JC) — livré niv 60."],
    },
    geaucke: {
        note: "Achat boutique.",
        how: ["Boutique Jetons de Combat de la Zone de Combat (1500 JC) — livré niv 60."],
    },
    sylvebarbe: {
        note: "Boss statique.",
        how: ["Réveille-le avec la Daemonflûte (donnée par le Prof. Chen après la Ligue), puis bats/capture-le (route sud vers la Zone de Combat). Aussi en boutique Jetons (1500 JC)."],
    },

    // ── RÔDEURS / boss de fusion ──
    mimimoy: {
        note: "Rôdeur.",
        how: ["Il rôde et remplace une rencontre sauvage une fois « armé » (fais l'échange premium Aquilothan→Aquilord au Brocanteur). Chance décroissante ; disparaît une fois capturé."],
    },
    ukognofy: {
        note: "Boss de fusion légendaire.",
        how: ["Dans une chambre cachée de la Grotte (niv 100, la nuit 21h→3h, après avoir vu une fusion sauvage…). Capture UNIQUEMENT à la Fusio-Ball. Disparaît après capture OU 3 échecs."],
    },

    // ── Lignée Phoéchaud (sauvage Grotte run 3 — repli pour les autres runs) ──
    phoechaudi: {
        note: "Lignée du run 3.",
        how: ["Sauvage (rare) dans la Grotte au run 3 : capture Phoéchaudi, puis fais-le évoluer (niv 22 → 40)."],
    },

    // ── Starters du run 3 (bases) ──
    elefer: { note: "Starter du run 3.", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE."] },
    cornaive: { note: "Starter du run 3.", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE."] },
    coccipoing: { note: "Starter du run 3.", how: ["Starter choisi au début du run 3, ou confié par l'Éleveur (plaine) s'il n'est ni le tien ni celui d'ACE."] },
}
