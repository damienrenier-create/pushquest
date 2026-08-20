// src/lib/gamebook/yellow/store/fusionGauntlet.ts
//
// LIGUE DE FUSION — mode GAUNTLET : l'équipe de fusions est assemblée UNE fois à l'entrée et CONSERVE ses
// PV / PP / K.O. de salle en salle (aucun soin). État TRANSIENT (jamais persisté ; perdu au reload → la Ligue
// redémarre proprement, cf. gameStore). Module LEAF (types seuls) → importable par gameStore ET battleStore
// sans cycle. Le cycle de vie des ESPÈCES éphémères (registerCustomSpecies/disposeFusion) reste géré par gameStore.

import type { BuiltFusion } from "../data/fusionMon"
import type { BattleMon } from "../battle/types"

let team: BuiltFusion[] | null = null

// OBJETS TENUS ENNEMIS — les BAIES ennemies sont-elles actives pour CETTE run de gauntlet ? (règle « 1re run du jour »
//   en argent ; toujours en or). Calculé au DÉMARRAGE de la run (gameStore beginFusionLeagueTry) puis lu à chaque
//   construction d'équipe ennemie. TRANSIENT comme le reste du gauntlet (perdu au reload → recalculé au redémarrage).
let gauntletBerries = false
/** Fixe si les baies ennemies sont actives pour cette run (calculé une fois au démarrage). */
export function setGauntletBerries(v: boolean): void { gauntletBerries = v }
/** Les baies ennemies sont-elles actives pour la run en cours ? */
export function getGauntletBerries(): boolean { return gauntletBerries }

// SALLE ULTIME — le Dieu Spaghetti a-t-il été vaincu DANS CETTE run (argent/or) ? → ouvre la porte droite du miroir
//   vers la salle ultime (ton reflet). TRANSIENT (reload → run redémarre → flag remis à false).
let gauntletBossBeaten = false
/** Marque le Dieu Spaghetti vaincu cette run (ouvre la salle ultime). */
export function setGauntletBossBeaten(v: boolean): void { gauntletBossBeaten = v }
/** Le Dieu Spaghetti est-il vaincu dans la run en cours ? (porte du miroir → salle ultime) */
export function getGauntletBossBeaten(): boolean { return gauntletBossBeaten }

// PERSISTANCE INSTANTANÉE (anti-refresh) : l'usure du gauntlet est mirroir-ée en localStorage À CHAQUE TOUR
//   (synchrone, sans réseau, sans débounce) → un refresh EN PLEIN COMBAT reprend l'équipe avec son usure RÉELLE
//   (fini le soin gratuit / la résurrection des K.O. entre deux salles). Le save serveur (fusionLeagueCarry) reste
//   la source DURABLE/cross-device ; le miroir LS est prioritaire au reload car TOUJOURS le plus frais.
const CARRY_LS_KEY = "yellow_fusion_gauntlet_carry"
/** Écrit (ou efface si null) le miroir localStorage de l'usure du gauntlet. Synchrone, fail-safe (quota/SSR). */
export function writeGauntletCarryLs(json: string | null): void {
    if (typeof window === "undefined") return
    try { if (json) window.localStorage.setItem(CARRY_LS_KEY, json); else window.localStorage.removeItem(CARRY_LS_KEY) } catch { /* quota / hors-navigateur : on ignore */ }
}
/** Lit le miroir localStorage de l'usure du gauntlet (null si absent). */
export function readGauntletCarryLs(): string | null {
    if (typeof window === "undefined") return null
    try { return window.localStorage.getItem(CARRY_LS_KEY) } catch { return null }
}

/** L'équipe-gauntlet courante (null = pas de Ligue de Fusion en cours). */
export function getGauntletTeam(): BuiltFusion[] | null { return team }
/** Pose l'équipe-gauntlet (à l'entrée) ou la vide (fin de run — le dispose des espèces est fait par l'appelant). */
export function setGauntletTeam(t: BuiltFusion[] | null): void { team = t }
/** Au moins une fusion encore debout ? (false = wipe). */
export function gauntletHasAlive(): boolean { return !!team && team.some((f) => f.instance.currentHp > 0) }

/** Usure sérialisable d'UNE fusion du gauntlet. Clé = paire de parents (a,b = uids des Daemons parents, STABLES au
 *  reload car sauvegardés) → permet de ré-appliquer PV/statut/PP après reconstruction (les uids de fusion, eux, changent). */
export interface GauntletCarryMon { a: string; b: string; hp: number; status: string; statusCounter: number; pp: Record<string, number>; moves: string[] }
/** Sérialise l'usure de l'équipe-gauntlet courante (pour persistance → REPRISE au reload). null = pas de gauntlet.
 *  `moves` = ordre COURANT des attaques (le joueur peut le réordonner) → restauré tel quel au reload. */
export function serializeGauntletCarry(): GauntletCarryMon[] | null {
    if (!team) return null
    return team.map((f) => {
        const parents = (f.instance as { fusionParents?: [string, string] }).fusionParents
        return {
            a: parents?.[0] ?? "", b: parents?.[1] ?? "",
            hp: Math.max(0, f.instance.currentHp),
            status: String(f.instance.status ?? "NONE"),
            statusCounter: f.instance.statusCounter ?? 0,
            pp: Object.fromEntries(f.instance.moves.map((m) => [m.moveId, m.pp])),
            moves: f.instance.moves.map((m) => m.moveId),
        }
    })
}

/** Réordonne l'ÉQUIPE-gauntlet : déplace la fusion `uid` juste avant/après (swap de 2 positions). true si fait. */
export function swapGauntletTeam(uidA: string, uidB: string): boolean {
    if (!team) return false
    const i = team.findIndex((f) => f.instance.uid === uidA)
    const j = team.findIndex((f) => f.instance.uid === uidB)
    if (i < 0 || j < 0 || i === j) return false
    const next = [...team];[next[i], next[j]] = [next[j], next[i]]; team = next
    return true
}
/** Réordonne les ATTAQUES d'une fusion du gauntlet (déplace le move d'index `from` vers `to`). true si fait. */
export function reorderGauntletMoves(fusionUid: string, from: number, to: number): boolean {
    if (!team) return false
    const f = team.find((x) => x.instance.uid === fusionUid)
    if (!f) return false
    const mv = f.instance.moves
    if (from < 0 || from >= mv.length || to < 0 || to >= mv.length || from === to) return false
    const next = [...mv]; const [it] = next.splice(from, 1); next.splice(to, 0, it); f.instance.moves = next
    return true
}

/** CARRY entre salles : recopie PV / statut / PP de l'équipe de COMBAT finale vers les instances persistantes
 *  (matchées par uid). Appelé en fin de chaque combat de Ligue → la salle suivante réutilise ces MÊMES instances
 *  (donc PV/PP entamés, K.O. conservés). Ne touche pas frozenStats (les stats de combat sont figées). */
export function writeBackGauntlet(finalTeam: ReadonlyArray<BattleMon>): void {
    if (!team) return
    const pairKey = (p?: [string, string]) => (p ? (p[0] < p[1] ? `${p[0]}|${p[1]}` : `${p[1]}|${p[0]}`) : "")
    for (const f of team) {
        // uid EXACT (même session) → sinon PAIRE DE PARENTS (stable au reload) : après une REPRISE de combat, les uids
        //   de l'équipe de combat (instantané) diffèrent de l'équipe-gauntlet reconstruite, mais les parents sont identiques.
        const fk = pairKey((f.instance as { fusionParents?: [string, string] }).fusionParents)
        const bm = finalTeam.find((m) => m.uid === f.instance.uid)
            ?? (fk ? finalTeam.find((m) => pairKey((m as { fusionParents?: [string, string] }).fusionParents) === fk) : undefined)
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
