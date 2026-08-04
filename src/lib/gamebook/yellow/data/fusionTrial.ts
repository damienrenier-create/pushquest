// src/lib/gamebook/yellow/data/fusionTrial.ts
//
// ÉPREUVE D'OUVERTURE de la Ligue de Fusion (Autel de la Chimère). Le joueur PILOTE sa/ses propre(s) fusion(s)
// contre CES DEUX fusions ennemies. La victoire pose FUSION_UNLOCK_MARKER (battleStore.finishBattle) → la porte
// à dragons s'ouvre. Combat SANDBOX (trainerId "fusion:TRIAL", aucune écriture save autre que le marker).
//
// Choisi par Sartay : Tonytony+Calderont (EAU/NORMAL, spécial bulky) & Maîtrezenc+Hebulmin (COMBAT/ELEC, physique).
// Movesets curés (comme la Ligue) : STAB fidèle à la stat dominante + couverture.

import { createMonInstance } from "../battle/factory"
import { buildFusion } from "./fusionMon"
import { fusionSpritePath } from "./fusionSprite"
import type { MonInstance } from "../battle/types"

export interface TrialFusion { a: string; b: string; name: string; moves: string[] }
/** Les 2 fusions de l'épreuve d'ouverture (aussi lues par le registre des fusions officielles). */
export const FUSION_TRIAL_PAIRS: readonly TrialFusion[] = [
    // Tonyront [EAU/NORMAL] — attaquant SPÉCIAL encaisseur (spa élevé, def/spd hauts) : STAB Eau + couverture spé + Repos.
    { a: "tonytony", b: "calderont", name: "Tonyront", moves: ["deferlante", "blizzard", "lance_flammes", "repos"] }, // (ex-fulgurance hors-lignée → couverture FEU de lignée calderont)
    // Maîtrelmin [COMBAT/ELEC] — attaquant PHYSIQUE (atk énorme) : STAB Combat + Séisme + Cage-Éclair (para) + Danse-Lames.
    { a: "maitrezenc", b: "hebulmin", name: "Maîtrelmin", moves: ["coup_de_boutoir", "seisme", "cage_eclair", "danse_lames"] },
]

/** Les 2 fusions ennemies de l'épreuve, scalées au `level` donné (celui de la fusion du joueur). Renvoie
 *  {team, speciesIds} — les speciesIds éphémères sont à DÉTRUIRE (disposeFusion) après le combat. */
export function buildFusionTrialEnemy(level: number): { team: MonInstance[]; speciesIds: string[] } {
    const built = FUSION_TRIAL_PAIRS.map((t) => buildFusion(
        createMonInstance(t.a, level, { owned: false }),
        createMonInstance(t.b, level, { owned: false }),
        { name: t.name, moves: t.moves, sprite: fusionSpritePath(t.name) },
    ))
    return { team: built.map((b) => b.instance), speciesIds: built.map((b) => b.speciesId) }
}
