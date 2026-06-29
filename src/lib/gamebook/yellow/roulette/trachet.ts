// src/lib/gamebook/yellow/roulette/trachet.ts
//
// Nexus — Roulette EU : « TRACHET TALK ». Feedback sarcastique/provoc du croupier (Daemon
// orienté à gauche, cf. DA). Texte UNIQUEMENT (zéro effet sur le hasard du jeu) → on peut
// utiliser Math.random pour la variété ; `rng` injectable pour des tests stables.

export interface TrachetContext {
    won: boolean
    net: number              // gain net de la donne (négatif = perte)
    winning: number          // numéro sorti
    isZero: boolean          // le 0 vert est sorti
    insistedColdNumber: boolean // a misé en PLEIN sur un numéro « froid » et perdu
    bankroll: number         // solde restant après la donne
}

const pick = (lines: string[], rng: () => number): string => lines[Math.floor(rng() * lines.length)] ?? lines[0]

const BANK = {
    zero: [
        "Le zéro. La maison t'embrasse sur le front. 💚",
        "Zéro pointé — au sens propre. La banque te remercie pour ta générosité.",
        "Ah, le 0. Statistiquement rare, émotionnellement dévastateur.",
    ],
    cold: [
        "Tu t'es acharné sur un numéro froid… et il est resté froid. Qui l'eût cru ? 🧊",
        "Le numéro « qui va finir par sortir ». Spoiler : pas aujourd'hui.",
        "La loi des grands nombres t'a regardé droit dans les yeux et a dit non.",
    ],
    bigWin: [
        "Bon. D'accord. Tu as gagné. Profites-en, ça ne durera pas. 😏",
        "Coup de génie ou coup de bol ? On sait tous les deux, mais bravo.",
        "Énorme. La maison note ton nom… pour la revanche.",
    ],
    smallWin: [
        "Un petit gain. De quoi t'illusionner encore un peu.",
        "Tu repars gagnant. Microscopiquement, mais gagnant.",
        "Joli. Tu as récupéré de quoi t'offrir… presque rien.",
    ],
    loss: [
        "Perdu. Mais c'est l'intention qui compte, paraît-il.",
        "La banque gagne toujours. C'est pas moi qui le dis, c'est les maths.",
        "Aïe. Reste digne, surtout devant ton Daemon.",
    ],
    broke: [
        "Il te reste des miettes. Le moment idéal pour « se refaire », non ? 🪙",
        "Solde critique. La sortie est à gauche. Comme moi.",
    ],
}

/** Renvoie UNE réplique adaptée au contexte (priorité : 0 > acharnement froid > gros gain > …). */
export function trachetLine(ctx: TrachetContext, rng: () => number = Math.random): string {
    if (ctx.isZero && !ctx.won) return pick(BANK.zero, rng)
    if (!ctx.won && ctx.insistedColdNumber) return pick(BANK.cold, rng)
    if (ctx.won && ctx.net >= 200) return pick(BANK.bigWin, rng)
    if (ctx.won) return pick(BANK.smallWin, rng)
    if (ctx.bankroll <= 25) return pick(BANK.broke, rng)
    return pick(BANK.loss, rng)
}
