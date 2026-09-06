// src/lib/gamebook/yellow/data/bertieCrochue.ts
//
// Le DIEU SPAGHETTI commente le résultat d'une Pâte de Bertie Crochue (pari d'évolution). Réplique tirée selon l'issue
// (évolution forcée / +1 niveau seul / dé-évolution / malédiction sèche). Module PUR (testable, injecte `rand`).

/** Issues d'une Pâte de Bertie Crochue (miroir de BertieOutcome, redéfini ici pour éviter tout cycle data⟷store). */
export type BertieOutcomeLite = "evolved" | "flat" | "devolved" | "cursed"

/** NPC + nom pour le dialogue (portrait Dieu Spaghetti, réutilisé). */
export const BERTIE_NPC = "spaghetti_dream"
export const BERTIE_NAME = "DIEU SPAGHETTI"

// (from, to) : selon l'issue, "to" = forme évoluée (evolved), forme régressée (devolved), ou = from (flat/cursed).
const LINES: Record<BertieOutcomeLite, readonly ((from: string, to: string) => string)[]> = {
    evolved: [
        (f, t) => `PAR TOUTES LES NOUILLES ! La pâte tordue opère : ${f} gagne un niveau ET se métamorphose sur-le-champ en ${t} ! Hors de tout palier — quelle magie douteuse !`,
        (f, t) => `Croustillant prodige ! ${f} monte d'un cran puis ÉVOLUE illico en ${t}. Bertie Crochue tient parfois ses promesses les plus folles.`,
        (f, t) => `Miam-évolution ! ${f} avale la pâte, grandit, et jaillit en ${t} avant l'heure. Le hasard t'a souri, gourmand.`,
    ],
    flat: [
        (f) => `${f} gagne un niveau… mais la pâte n'a plus rien à faire évoluer (ou son estomac refuse encore de changer de forme). Un petit plus, sans métamorphose.`,
        (f) => `Cuisson tiède : ${f} prend un niveau, point. Pas d'évolution cette fois — la pâte a fait un rot magique et s'est calmée.`,
    ],
    devolved: [
        (f, t) => `OH NON. Fournée maudite ! ${f} régresse et redevient… ${t} ! Et le voilà QUI BOUDE : il refusera d'évoluer pendant plusieurs niveaux. Tu connaissais le pari, mortel.`,
        (f, t) => `Beurk, la mauvaise bouchée ! ${f} rétrograde en ${t}, humilié. Vexé, il se braque : aucune évolution avant un bon moment. La roulette des pâtes est cruelle.`,
    ],
    cursed: [
        (f) => `Drôle de goût… ${f} n'a rien de plus bas où retomber, mais la pâte l'a AIGRI : il refusera d'évoluer pendant plusieurs niveaux. Mauvais tirage, cuisinier.`,
        (f) => `La pâte tourne mal ! ${f} ne peut régresser davantage, mais le voilà BOUDEUR — pas d'évolution avant longtemps. Le pari s'est retourné contre toi.`,
    ],
}

/** Réplique du Dieu Spaghetti sur le résultat d'une Bertie Crochue. `rand`∈[0,1) → variante (déterministe/testable).
 *  Renvoie un tableau de lignes (prêt pour showDialogue). Issue inconnue → repli sur « flat ». */
export function bertieCrochueLines(outcome: BertieOutcomeLite, fromName: string, toName: string, rand: number): string[] {
    const arr = LINES[outcome] ?? LINES.flat
    const i = Math.min(arr.length - 1, Math.max(0, Math.floor(Math.max(0, Math.min(0.999999, rand)) * arr.length)))
    return [arr[i](fromName, toName)]
}
