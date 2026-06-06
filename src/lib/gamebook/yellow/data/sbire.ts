// src/lib/gamebook/yellow/data/sbire.ts
//
// Nexus Jaune Éclair — SBIRE du dieu Spaghetti : rival-sensei récurrent (2×/jour).
// 1er combat du jour = MIROIR (même Daemon que ton lead). 2e = ta FAIBLESSE
// (un Daemon d'un type super-efficace contre toi). Toujours à niveau équivalent.
// Chaque victoire délivre une explication sur l'app.

import { SPECIES, getSpecies } from "./species"
import { typeEffectiveness } from "../battle/typeChart"
import { POKE_TYPES, type PokeType, type MonInstance } from "../battle/types"
import { createMonInstance } from "../battle/factory"

export const SBIRE_MAX_FIGHTS_PER_DAY = 2

/** Id partagé du combat de sbire (gameStore le lance, battleStore le reconnaît à la fin). */
export const SBIRE_TRAINER_ID = "y_sbire"

// RÉCOMPENSES (en plus du conseil distillé à chaque victoire) :
//   1re victoire du jour → de l'énergie (reps)
//   2e victoire du jour  → une ball
/** Énergie (reps) offerte à la 1re victoire du jour. */
export const SBIRE_REWARD_REPS = 50
/** Objet offert à la 2e victoire du jour. */
export const SBIRE_REWARD_BALL_ID = "poke_ball"

/** Un type super-efficace contre les types du lead (repli NORMAL si rien). */
function counterTypeFor(types: PokeType[]): PokeType {
    for (const t of POKE_TYPES) {
        if (typeEffectiveness(t, types) > 1) return t
    }
    return "NORMAL"
}

/** Une espèce (déterministe) du type donné. */
function speciesOfType(t: PokeType): string {
    const match = Object.values(SPECIES).find((s) => s.types.includes(t))
    return match?.id ?? Object.keys(SPECIES)[0]
}

/**
 * Équipe du sbire pour le combat n° fightIndex du jour :
 *   0 → MIROIR (même espèce/niveau que le lead),
 *   1 → FAIBLESSE (espèce d'un type super-efficace contre le lead, même niveau).
 */
export function buildSbireTeam(lead: MonInstance, fightIndex: number): MonInstance[] {
    const level = lead.level
    if (fightIndex <= 0) return [createMonInstance(lead.speciesId, level)]
    const sp = getSpecies(lead.speciesId)
    const counter = speciesOfType(counterTypeFor(sp?.types ?? ["NORMAL"]))
    return [createMonInstance(counter, level)]
}

// ============================================================
// RÉPLIQUES DU SBIRE — édite librement ce bloc (tout est ici).
// ============================================================

/**
 * Répliques AVANT le combat, selon le n° du combat du jour :
 *   index 0 → 1er combat (MIROIR), index 1 → 2e combat (FAIBLESSE).
 */
export const SBIRE_INTRO_LINES: string[][] = [
    [
        "Je suis un sbire du dieu Spaghetti.",
        "Si tu me bas tu seras récompensé !",
        "En garde !",
    ],
    [
        "Tu reviens ? Cette fois, je frapperai plus fort.",
        "Prouve-moi que tu sais t'adapter !",
    ],
]

/** Répliques quand le sbire a déjà été battu le maximum de fois aujourd'hui. */
export const SBIRE_DONE_LINES: string[] = [
    "Pasta ! Tu m'as déjà vaincu deux fois aujourd'hui.",
    "Reviens demain, je te testerai encore.",
]

/** Répliques quand toute l'équipe du joueur est K.O. */
export const SBIRE_NO_TEAM_LINES: string[] = [
    "Tes Daemons sont tous K.O. !",
    "Soigne-les au Centre avant de m'affronter.",
]

/** Répliques d'intro pour le combat n° fightIndex du jour (clamp sur la dernière). */
export function sbireIntroLines(fightIndex: number): string[] {
    const i = Math.max(0, Math.min(fightIndex, SBIRE_INTRO_LINES.length - 1))
    return SBIRE_INTRO_LINES[i]
}

/**
 * Conseils distillés une par victoire (cycle sur le pool). Chaque conseil est un
 * TABLEAU de bulles (une par tap), pour pouvoir détailler un concept.
 * Tout est calé sur les vrais systèmes du jeu — édite/ajoute librement.
 */
export const SBIRE_TIPS: string[][] = [
    // 1 — Reps = énergie
    [
        "Tes reps de la vraie vie sont ton énergie de combat ici.",
        "Chaque jour, ce que tu fais dehors vient gonfler ton portefeuille de reps.",
        "Mais il a un plafond (1000 au départ). Au-delà, le surplus est perdu — alors dépense avant d'être au max !",
    ],
    // 2 — Coût des attaques
    [
        "Oublie les PP : ici, chaque attaque se paie en reps.",
        "Plus une attaque est puissante, plus elle coûte cher — et la note grimpe avec le niveau du Daemon.",
        "Frappe fort quand ça compte, économise sur les petits combats.",
    ],
    // 3 — Charge Désespérée (anti soft-lock)
    [
        "À sec de reps ou d'énergie en plein combat ? La Charge Désespérée reste gratuite.",
        "Mais elle est faible et te blesse toi-même. C'est un filet de secours, pas un plan de jeu.",
    ],
    // 4 — Deux limites différentes (portefeuille vs énergie/combat)
    [
        "Méfie-toi : il y a DEUX jauges à ne pas confondre.",
        "Ton portefeuille total de reps… et un plafond d'énergie dépensable DANS un seul combat (200 au début).",
        "Même riche en reps, tu ne peux pas tout cramer d'un coup. Gère ton tempo.",
    ],
    // 5 — IV piloté par l'effort
    [
        "Chaque Daemon sauvage naît avec un potentiel génétique : ses IV, notés de D à PARFAIT.",
        "Et c'est TON effort qui le décide : plus tu approches ton quota du jour, plus le potentiel garanti monte.",
        "Boucle ton quota AVANT de partir chasser, et tu attraperas bien mieux.",
    ],
    // 6 — Daemon PARFAIT
    [
        "Tu rêves d'un Daemon PARFAIT, tous les IV au sommet ?",
        "Dépasse largement ton quota du jour : plus tu en fais, plus la chance d'en croiser un grimpe.",
    ],
    // 7 — EV (expérience de combat)
    [
        "En combattant, tes Daemons engrangent de l'expérience de combat — comme des vétérans.",
        "Chaque victoire muscle un peu la stat dominante de l'adversaire vaincu.",
        "C'est plafonné : tu peux spécialiser environ deux stats par Daemon. Choisis bien tes proies.",
    ],
    // 8 — EV ciblé
    [
        "Tu veux un Daemon véloce ? Affronte souvent des ennemis dont la Vitesse est la stat reine.",
        "C'est précisément là que l'expérience de combat se dépose.",
    ],
    // 9 — Points Saiyan
    [
        "À chaque niveau gagné, ton Daemon reçoit des points d'entraînement à répartir où tu veux.",
        "En PV, un point vaut gros (×3). En Attaque ou Vitesse, tu sculptes un foudroyeur fragile.",
        "Tank ou glass cannon : c'est ta main qui façonne le monstre.",
    ],
    // 10 — Saiyan = discipline réelle
    [
        "Cet entraînement récompense ta discipline DANS la vraie vie.",
        "Quota dépassé chaque jour ? Deux points par niveau. Une seule amende ? Zéro point.",
        "La régularité bat l'intensité. Ne lâche rien.",
    ],
    // 11 — Rencontres pilotées par pompes/squats
    [
        "Les Daemons que tu croises dépendent de ton entraînement du jour.",
        "Beaucoup de pompes attirent les types Combat. Beaucoup de squats, les types Roche et Sol.",
    ],
    // 12 — Élec / rares
    [
        "Quota du jour atteint ? Les Daemons Électriques se montrent davantage.",
        "Et un gros dépassement fait surgir les espèces rares… parfois un cran au-dessus de ton équipe.",
    ],
    // 13 — Biomes
    [
        "Le décor n'est pas qu'un décor : montagne, forêt de sapins et points d'eau abritent des familles différentes.",
        "Repère le terrain pour cibler les captures que tu cherches.",
    ],
    // 14 — Switch / types
    [
        "Un combat se gagne souvent avant le premier coup : envoie le bon type.",
        "N'aie jamais peur de changer de Daemon en pleine bataille pour renverser le rapport de force.",
    ],
    // 15 — Badges d'arène
    [
        "Trois salles, trois chefs : Feu, Plante, Eau.",
        "Chaque badge agrandit ton portefeuille de reps, gonfle ton énergie par combat et débloque de nouvelles CT.",
        "Réunis les trois et le Champion t'ouvrira son trône.",
    ],
    // 16 — CT (Capsules Techniques)
    [
        "Les CT enseignent de nouvelles attaques à tes Daemons, contre des reps.",
        "Certaines sont libres dès le départ ; d'autres ne s'achètent qu'une fois le bon badge en poche.",
        "Garde toujours quelques reps d'avance pour la CT qui changera ton équipe.",
    ],
    // 17 — Super Pasta
    [
        "Pressé de faire grandir un Daemon ? La Super Pasta lui offre un niveau d'un coup.",
        "Mais son prix flambe à chaque achat dans la même journée. À savourer avec modération.",
    ],
    // 18 — Capture
    [
        "Pour capturer, affaiblis d'abord le sauvage… sans le mettre K.O.",
        "Une bonne ball lancée au bon moment, et il rejoint tes rangs.",
    ],
    // 19 — Centre Daemon & PC
    [
        "Au Centre Daemon, soigne ton équipe et range tes prises dans le PC.",
        "Six places seulement en équipe : compose-la selon le défi qui t'attend.",
    ],
    // 20 — Reviens chaque jour
    [
        "Je t'attends ici deux fois par jour, chaque jour.",
        "À chaque passage : de l'XP, de l'expérience de combat… et un nouveau conseil de ma part.",
        "Un sensei, ça s'use à la régularité.",
    ],
    // (Les conseils sur l'équipe, l'évolution, les attaques, la fuite et les types
    //  sont désormais lisibles sur les PANNEAUX de la map Nord — cf. data/parkSigns.ts.)
]

/**
 * Conseil (liste de bulles) à afficher pour la n-ième victoire (1-indexée),
 * en cyclant sur le pool une fois tous les conseils vus.
 */
export function sbireExplanation(winNumber: number): string[] {
    const i = (Math.max(1, winNumber) - 1) % SBIRE_TIPS.length
    return SBIRE_TIPS[i]
}
