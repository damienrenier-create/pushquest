// src/lib/gamebook/yellow/data/duel.ts
//
// DUELS contre les reflets des autres joueurs (pilotés par l'IA) :
//   • VIRIDIAN  → reflets EXACTS (vraies équipes), rencontrés en roamant.
//   • ARÈNE EAU → reflets INVERSÉS (faiblesses), après ONDINE.
// Règle : 1 victoire par joueur-IA et par jour. Victoire → XP DOUBLE + cadeau du Dieu des Nouilles + HYPER Nexus-Ball,
// et le VRAI joueur mirouté reçoit (cadeau croisé) l'ÉNERGIE dépensée par le vainqueur dans le duel.
// Défaite → trashtalk monumental de l'adversaire + 30 énergie « par pitié ».

// Récompense = HYPER Nexus-Ball (id "hyper_ball" — meilleur taux de capture). (Avant : "poke_ball" = Nexus-Ball de base.)
export const DUEL_NEXUS_BALL_ID = "hyper_ball"
// XP des duels-reflets = DOUBLE de la normale (récompense d'un vrai défi contre un autre joueur).
export const DUEL_EXP_MULT = 2
export const DUEL_LOSS_CONSOLE_REPS = 30
export const DUEL_GOD_NPC = "dieu_nouilles"
export const DUEL_GOD_NAME = "DIEU DES NOUILLES"

/** %O = pseudo de l'adversaire. */
function fill(line: string, oppNick: string): string {
    return line.replace(/%O/g, oppNick)
}
function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)] ?? arr[0]
}

// ── VICTOIRE : le Dieu des Nouilles te félicite (+ Nexus Ball) ──
const WIN_LINES: readonly string[] = [
    "Ahhh… tu as terrassé le reflet de %O ! La Grande Marmite bouillonne de fierté.",
    "Le double de %O gît, al dente. Splendide duel, champion — la semoule jubile !",
    "%O ne s'en remettra pas (enfin, son reflet). Le Panthéon des Pâtes salue ton panache !",
    "Magnifique ! Tu as essoré le reflet de %O comme une botte de spaghettis. Régale-toi.",
    "Par tous les coudes de macaronis ! Le reflet de %O n'a pas tenu une louche face à toi.",
]
/** Dialogue de victoire DYNAMIQUE : le Dieu annonce chaque récompense réellement obtenue. */
export function duelWinLines(oppNick: string, r: { refund: number; ctDropped: boolean; energyToOpp: number }): string[] {
    const gifts = ["✨ XP DOUBLÉE", "🎁 une HYPER Nexus-Ball"]
    if (r.refund > 0) gifts.push(`⚡ +${r.refund} énergie remboursée (tu as sué pour cette victoire !)`)
    if (r.ctDropped) gifts.push("🌑 la CT60 « Reflet Fatal » — une relique INÉDITE des ténèbres !")
    return [
        fill(pick(WIN_LINES), oppNick),
        "🎉 Pour ta bravoure : " + gifts.join(" · ") + " !",
        `Et par équité de la Grande Marmite, le reflet de ${oppNick} récupère ${r.energyToOpp} énergie de ta sueur. Régale-toi, champion !`,
    ]
}

// ── DÉFAITE : l'adversaire (reflet) te trashtalk puis te jette 30 énergie « par pitié » ──
const LOSS_LINES: readonly string[] = [
    "Sérieusement ? CE move ? À CE moment ? J'ai vu des Magicarpe mieux jouer. %O n'a même pas transpiré.",
    "Tes choix d'attaques… une dissertation sur l'échec. Range-moi cette équipe, c'est une honte pour la semoule.",
    "Tu switches au pire moment, tu spammes au mauvais, tu lis le type-chart à l'envers… bref, tu es TOI. Pathétique.",
    "J'ai gagné en pilote automatique. Littéralement. Je suis une IA. Et tu as quand même trouvé le moyen de perdre.",
    "Ton équipe a la cohérence d'une lasagne tombée par terre. %O range ses Daemons en bâillant.",
]
export function duelLossLines(oppNick: string): string[] {
    return [
        fill(pick(LOSS_LINES), oppNick),
        "*Avec le plus grand dédain :* …Tiens. 30 énergies. Pour que tu arrêtes de pleurer. Maintenant dégage.",
    ]
}

// ── CADEAU CROISÉ : à la prochaine connexion du joueur mirouté, le Dieu Spaghetti a « rêvé »
//    qu'il s'est fait battre → consolation (+énergie). winnerNicks = vainqueurs ; total = énergie cumulée.
export const DUEL_DREAM_NPC = "spaghetti_dream"
export const DUEL_DREAM_NAME = "DIEU SPAGHETTI"
export function duelDreamLines(winnerNicks: string[], totalEnergy: number): string[] {
    const list = winnerNicks.length
        ? (winnerNicks.length === 1
            ? winnerNicks[0]
            : `${winnerNicks.slice(0, -1).join(", ")} et ${winnerNicks[winnerNicks.length - 1]}`)
        : "quelqu'un"
    return [
        "Bonjour, aventurier… dis-moi, as-tu bien dormi cette nuit ?",
        `Moi, j'ai fait un drôle de rêve : j'ai vu ${list} te battre en duel. Ça m'a rendu tout triste, tu sais.`,
        `Du coup… tiens, un petit cadeau pour nous consoler tous les deux : +${totalEnergy} énergie. Allez, garde la tête haute !`,
    ]
}
