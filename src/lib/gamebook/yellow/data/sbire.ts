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
import { speciesAtLevel, baseSpeciesOf } from "./ace"

export const SBIRE_MAX_FIGHTS_PER_DAY = 6

/** Id partagé du combat de sbire (gameStore le lance, battleStore le reconnaît à la fin). */
export const SBIRE_TRAINER_ID = "y_sbire"

// RÉCOMPENSES par n° de victoire du jour (1-indexé), en plus du conseil distillé à chaque victoire :
//   1 → +50 reps · 2 → Nexus Ball · 3 → +75 reps · 4 → Super Nexus Ball · 5 → +100 reps
//   6 → CADEAU one-time : CT Fouet de Nouilles (sinon repli en reps si déjà reçue).
export const SBIRE_REWARD_REPS = 50              // victoire 1
export const SBIRE_REWARD_REPS_3 = 75            // victoire 3
export const SBIRE_REWARD_REPS_5 = 100           // victoire 5
export const SBIRE_REWARD_BALL_ID = "poke_ball"  // victoire 2 (Nexus Ball)
export const SBIRE_REWARD_BALL_ID_4 = "super_ball" // victoire 4 (Super Nexus Ball)
export const SBIRE_REWARD_CT_ID = "ct38"         // victoire 6 (Fouet de Nouilles, one-time)
export const SBIRE_REWARD_CT_FALLBACK_REPS = 120 // victoire 6 si la CT est déjà reçue

/** Petit hash stable (déterministe) d'une chaîne → varie le contre SANS aléatoire (combat 5 == combat 6). */
function hashStr(s: string): number {
    let h = 2166136261
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
    return h >>> 0
}

/** Espèce-contre, DÉTERMINISTE mais variée par membre : un type super-efficace contre `types`,
 *  puis une espèce « normale » de ce type (ni légendaire, ni exclusive), choisie par hash de `key`. */
function counterSpeciesFor(types: PokeType[], key: string): string {
    const superEff = POKE_TYPES.filter((t) => typeEffectiveness(t, types) > 1)
    const pool: PokeType[] = superEff.length ? superEff : ["NORMAL"]
    const t = pool[hashStr(key) % pool.length]
    const cands = Object.values(SPECIES).filter((s) =>
        s.types.includes(t) && !(s as { exclusive?: boolean }).exclusive && s.rarity !== "LEGENDARY")
    if (!cands.length) return Object.keys(SPECIES)[0]
    return cands[hashStr(key + t) % cands.length].id
}

/** Miroir d'un membre : même espèce, même niveau (+ offset éventuel). */
function mirror(m: MonInstance, lvlOffset = 0): MonInstance {
    return createMonInstance(m.speciesId, Math.max(1, m.level + lvlOffset))
}
/** Contre d'un membre : espèce super-efficace au bon STADE pour son niveau (+ offset éventuel). */
function counter(m: MonInstance, lvlOffset = 0): MonInstance {
    const lvl = Math.max(1, m.level + lvlOffset)
    const cId = counterSpeciesFor(getSpecies(m.speciesId)?.types ?? ["NORMAL"], m.speciesId)
    // baseSpeciesOf d'abord : counterSpeciesFor peut tirer une espèce déjà évoluée → on redescend à la
    // souche puis on remonte au bon stade pour le niveau (sinon ex. Fissuralave stade-2 au niveau 11).
    return createMonInstance(speciesAtLevel(baseSpeciesOf(cId), lvl), lvl)
}

/**
 * Équipe du sbire pour le combat n° fightIndex du jour (0-indexé), calée sur l'ÉQUIPE du joueur :
 *   0 → MIROIR du lead · 1 → FAIBLESSE du lead
 *   2 → MIROIR des 3 premiers · 3 → FAIBLESSE des 3 premiers
 *   4 → MIROIR + FAIBLESSE des 3 derniers (jusqu'à 6 Daemons)
 *   5 → idem combat 4 mais +2 niveaux par Daemon (rematch corsé → cadeau CT).
 */
export function buildSbireTeam(team: MonInstance[], fightIndex: number): MonInstance[] {
    const lead = team[0]
    const first3 = team.slice(0, 3)
    const last3 = team.slice(-3)
    switch (fightIndex) {
        case 0: return [mirror(lead)]
        case 1: return [counter(lead)]
        case 2: return first3.map((m) => mirror(m))
        case 3: return first3.map((m) => counter(m))
        case 4: return [...last3.map((m) => mirror(m)), ...last3.map((m) => counter(m))]
        default: return [...last3.map((m) => mirror(m, 2)), ...last3.map((m) => counter(m, 2))]
    }
}

// ============================================================
// RÉPLIQUES DU SBIRE — édite librement ce bloc (tout est ici).
// ============================================================

/**
 * Répliques AVANT le combat, selon le n° du combat du jour (0-indexé, 6 combats) :
 *   0 miroir lead · 1 faiblesse lead · 2 miroir 3 premiers · 3 faiblesse 3 premiers
 *   4 miroir+faiblesse 3 derniers · 5 rematch +2 niveaux (cadeau CT).
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
    [
        "Assez joué en solo. Je copie tes TROIS premiers !",
        "Vois si tu te bats aussi bien… contre toi-même en trio.",
    ],
    [
        "Le dieu Spaghetti m'inspire les FAIBLESSES de ton trio de tête.",
        "Trois contres taillés sur mesure. Adapte-toi ou tombe !",
    ],
    [
        "Maintenant ton arrière-garde : tes trois derniers, en miroir ET en faiblesse.",
        "Six Daemons. Le vrai test de profondeur de banc !",
    ],
    [
        "Ultime épreuve. La même meute… mais affûtée de deux niveaux.",
        "Triomphe et le dieu Spaghetti t'offrira une relique de pâtes !",
    ],
]

/** Répliques quand le sbire a déjà été battu le maximum de fois aujourd'hui. */
export const SBIRE_DONE_LINES: string[] = [
    "Pasta ! Tu m'as déjà vaincu six fois aujourd'hui.",
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
    // 16 — OBÉISSANCE (les badges = ton autorité)
    [
        "Écoute bien, car peu le savent : un Daemon trop PUISSANT pour tes badges n'en fera qu'à sa tête !",
        "En plein combat, il peut IGNORER ton ordre — tour perdu. Ton autorité de Dresseur se mérite avec les badges.",
        "Tes PROPRES Daemons sont les plus exigeants : garde-les proches du niveau de tes arènes — ≈20 sans badge, puis 30, 40, 50, 65 badge après badge.",
        "Un Daemon ÉCHANGÉ, reçu d'un ami, t'obéit un peu plus haut (35, 50, 65, 80…) — mais lui aussi te lâchera s'il te dépasse trop.",
        "La seule voie : décroche plus de BADGES. Les cinq réunis, et TOUS t'obéissent jusqu'au niveau 100. 🍝",
    ],
    // 17 — CT (Capsules Techniques)
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
        "Je t'attends ici six fois par jour, chaque jour.",
        "À chaque passage : de l'XP, de l'expérience de combat… et un nouveau conseil de ma part.",
        "Un sensei, ça s'use à la régularité.",
    ],
    // (Les conseils sur l'équipe, l'évolution, les attaques, la fuite et les types
    //  sont désormais lisibles sur les PANNEAUX de la map Nord — cf. data/parkSigns.ts.)
]

/** CONSEILS CLAN — le sbire médite désormais au cœur de la CHAPELLE DE NOUILLON : il est le mieux placé pour parler
 *  des pactes et des clans. Une bulle « clan » est AJOUTÉE à chaque conseil (cycle indépendant). Édite librement. */
export const SBIRE_CLAN_TIPS: string[] = [
    "🍝 Un mot sur les CLANS : trois maîtres t'entourent ici. Bats l'arène 1, puis prête serment à UN seul — c'est un pacte de sang, définitif pour tout ce run.",
    "🍝 Le triangle sacré : l'AIR fend le COMBAT, le COMBAT brise la ROCHE, la ROCHE écrase l'AIR. Choisis ton camp en connaissance de cause.",
    "🍝 Ton clan est jaloux : porte en équipe la signature d'un clan RIVAL, et ton maître te coupe tous ses bienfaits. Range l'intrus au PC pour réparer.",
    "🍝 Fais grandir ton Daemon-clan : au niveau 50, ton maître t'offre sa CT secrète ; au niveau 80, la Transcendance ultime.",
    "🍝 Entraîne-toi chez ton maître pour DOUBLER ton XP. Ose les clans rivaux : XP ET coût TRIPLÉS… mais quel butin d'expérience.",
    "🍝 La ferveur récompense la meute : quand un frère de clan croise un shiny, tu touches le TRIPLE des reps prévues.",
    "🍝 Un frère décroche un badge avec le Daemon-clan en équipe ? Toute la guilde reçoit une Super Pasta dans son sac.",
    "🍝 On n'affronte JAMAIS le reflet d'un frère de clan — on lui tape dans la main : un high-five, un petit mot, et quelques reps offerts.",
    "🍝 Reviens voir ton maître chaque jour : il te verse de l'énergie à hauteur du niveau de ton Daemon-clan (et une Nexus Ball aux dizaines).",
]

/**
 * Conseil (liste de bulles) à afficher pour la n-ième victoire (1-indexée), en cyclant sur le pool une fois tous
 * les conseils vus. On AJOUTE en dernière bulle un conseil CLAN (le sbire médite au cœur de la Chapelle).
 */
export function sbireExplanation(winNumber: number): string[] {
    const n = Math.max(1, winNumber)
    const tip = SBIRE_TIPS[(n - 1) % SBIRE_TIPS.length]
    const clanTip = SBIRE_CLAN_TIPS[(n - 1) % SBIRE_CLAN_TIPS.length]
    return [...tip, clanTip]
}
