// src/lib/gamebook/yellow/storage/sessionKeys.ts
//
// Nexus Jaune Éclair — clés localStorage de la SESSION EN COURS. Cet état vit HORS de la save
// serveur (il n'est pas dans YellowSave) et sert à ne pas perdre une partie en cours sur un
// refresh : instantané du combat (cf. battleStore #8), série de la Zone de Combat / bracket du
// Dôme, dernier relevé de score du run 2.
//
// Regroupées ici pour une raison précise : quand on ÉCRASE la save (reset, outil super-admin),
// ces reliquats appartiennent à l'ANCIENNE partie. Laisser l'instantané de combat en place ferait
// que resumeBattleFromStorage() remet le joueur dans un combat périmé (équipe de l'ancienne save,
// espèces parfois plus résolubles) juste après le rechargement.

/** Instantané du combat en cours (battleStore) — repris au refresh. */
export const BATTLE_LS_KEY = "pq_yellow_battle_v1"
/** Série de la Zone de Combat (Tour/Usine : run + équipe louée) ou bracket du Dôme. */
export const FRONTIER_LS_KEY = "pq_yellow_frontier_v1"
/** Dernier relevé de score du run 2 (affiché au récap de fin de run). */
export const RUN2_SCORES_LS_KEY = "pq_yellow_run2scores_v1"

/** Toutes les clés de la session en cours (ordre non significatif). */
export const SESSION_LS_KEYS: readonly string[] = [BATTLE_LS_KEY, FRONTIER_LS_KEY, RUN2_SCORES_LS_KEY]

/**
 * Purge l'état de session en cours : le joueur SORT de son combat et de sa série en cours.
 * À appeler juste après avoir écrit une nouvelle save, AVANT de (re)charger le jeu.
 * No-op hors navigateur ; tolère un localStorage indisponible (mode privé, quota).
 */
export function clearRunSessionStorage(): void {
    if (typeof window === "undefined") return
    for (const k of SESSION_LS_KEYS) {
        try { window.localStorage.removeItem(k) } catch { /* indisponible : rien à purger */ }
    }
}
