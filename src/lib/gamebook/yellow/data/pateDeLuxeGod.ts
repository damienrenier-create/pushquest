// src/lib/gamebook/yellow/data/pateDeLuxeGod.ts
//
// Le DIEU SPAGHETTI commente le résultat quand un Daemon goûte une Pâte de Luxe (loterie génétique).
// Réplique tirée selon l'issue (parfait / rang D / shiny+parfait). Module PUR (testable, injecte `rand`).

/** Issues d'une Pâte de Luxe (miroir de LuxeOutcome, redéfini ici pour éviter tout cycle data⟷store). */
export type PateLuxeOutcome = "perfect" | "min" | "shiny_perfect"

/** NPC + nom pour le dialogue (portrait Dieu Spaghetti). */
export const PATE_LUXE_GOD_NPC = "spaghetti_dream"
export const PATE_LUXE_GOD_NAME = "DIEU SPAGHETTI"

const LINES: Record<PateLuxeOutcome, readonly ((n: string) => string)[]> = {
    shiny_perfect: [
        (n) => `PAR TOUTES LES NOUILLES DORÉES !! ${n} scintille ET touche la PERFECTION — la pâte de légende ! Une bouchée sur mille, cuisinier. Le destin te bénit.`,
        (n) => `IMPOSSIBLE… et pourtant ! ${n} en ressort SHINY et parfait, IV au sommet. Savoure ce miracle : il ne se reproduira pas de sitôt.`,
    ],
    perfect: [
        (n) => `Mmmh, cuisson SUBLIME ! ${n} a absorbé tout le génie de la pâte — IV au maximum. Un vrai chef-d'œuvre.`,
        (n) => `La Grande Marmite jubile : ${n} atteint la PERFECTION génétique ! Bien joué, audacieux.`,
        (n) => `Al dente, parfait en tout point ! ${n} n'a jamais été aussi affûté. Régale-toi.`,
    ],
    min: [
        (n) => `AÏE. Génome carbonisé… ${n} s'effondre au RANG D, le plus infâme. La marmite est cruelle — mais tu connaissais le pari.`,
        (n) => `Beurk, fournée ratée ! ${n} ressort tout raplapla (IV au plancher). Le hasard t'a puni, mortel… ce sera pour la prochaine.`,
        (n) => `Oh non… ${n} a avalé la pire des pâtes. Rang D. Ne pleure pas sur le lait de coco renversé — c'était la loi du jeu !`,
    ],
}

/** Réplique du Dieu Spaghetti sur le résultat. `rand`∈[0,1) → variante (déterministe/testable). Renvoie un tableau
 *  de lignes (prêt pour showDialogue). Issue inconnue → repli sur les répliques « parfait ». */
export function pateDeLuxeGodLines(outcome: PateLuxeOutcome, monName: string, rand: number): string[] {
    const arr = LINES[outcome] ?? LINES.perfect
    const i = Math.min(arr.length - 1, Math.max(0, Math.floor(Math.max(0, Math.min(0.999999, rand)) * arr.length)))
    return [arr[i](monName)]
}
