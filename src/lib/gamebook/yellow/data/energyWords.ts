// src/lib/gamebook/yellow/data/energyWords.ts
//
// VOCABULAIRE DE L'ÉNERGIE selon le mode de jeu. En muscu, l'énergie vient des vraies REPS encodées (pompes, squats) :
// la monnaie s'affiche « reps ». En MODE FUN, rien n'est encodé (l'énergie vient des défis du labo, des hauts faits,
// de Chen, du clan…) : la même monnaie s'affiche « ⚡ » / « énergie ». Règle de Sartay (20/10/2026) : un joueur fun ne
// lit jamais « reps », « pompes » ni « quota ». Module PUR : l'appelant passe `fun` (getGameMode() === "fun").

/** Unité collée à un nombre : `${n}${repsUnit(fun)}` → « 500 reps » (muscu) · « 500⚡ » (fun). */
export function repsUnit(fun: boolean): string { return fun ? "⚡" : " reps" }

/** Icône devant un solde ou un coût : 💪 (muscu) · ⚡ (fun). */
export function repsIcon(fun: boolean): string { return fun ? "⚡" : "💪" }

/** Refus faute de solde. */
export function notEnoughReps(fun: boolean): string { return fun ? "Pas assez d'énergie." : "Pas assez de reps." }
