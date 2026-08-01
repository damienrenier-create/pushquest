// src/lib/gamebook/yellow/store/fusionGauntlet.ts
//
// LIGUE DE FUSION — mode GAUNTLET : l'équipe de fusions est assemblée UNE fois à l'entrée et CONSERVE ses
// PV / PP / K.O. de salle en salle (aucun soin). État TRANSIENT (jamais persisté ; perdu au reload → la Ligue
// redémarre proprement, cf. gameStore). Module LEAF (types seuls) → importable par gameStore ET battleStore
// sans cycle. Le cycle de vie des ESPÈCES éphémères (registerCustomSpecies/disposeFusion) reste géré par gameStore.

import type { BuiltFusion } from "../data/fusionMon"
import type { BattleMon } from "../battle/types"

let team: BuiltFusion[] | null = null

/** L'équipe-gauntlet courante (null = pas de Ligue de Fusion en cours). */
export function getGauntletTeam(): BuiltFusion[] | null { return team }
/** Pose l'équipe-gauntlet (à l'entrée) ou la vide (fin de run — le dispose des espèces est fait par l'appelant). */
export function setGauntletTeam(t: BuiltFusion[] | null): void { team = t }
/** Au moins une fusion encore debout ? (false = wipe). */
export function gauntletHasAlive(): boolean { return !!team && team.some((f) => f.instance.currentHp > 0) }

/** CARRY entre salles : recopie PV / statut / PP de l'équipe de COMBAT finale vers les instances persistantes
 *  (matchées par uid). Appelé en fin de chaque combat de Ligue → la salle suivante réutilise ces MÊMES instances
 *  (donc PV/PP entamés, K.O. conservés). Ne touche pas frozenStats (les stats de combat sont figées). */
export function writeBackGauntlet(finalTeam: ReadonlyArray<BattleMon>): void {
    if (!team) return
    for (const f of team) {
        const bm = finalTeam.find((m) => m.uid === f.instance.uid)
        if (!bm) continue
        f.instance.currentHp = Math.max(0, bm.currentHp)
        f.instance.status = bm.status
        f.instance.statusCounter = bm.statusCounter
        for (const mv of f.instance.moves) {
            const b = bm.moves.find((x) => x.moveId === mv.moveId)
            if (b) mv.pp = b.pp
        }
    }
}
