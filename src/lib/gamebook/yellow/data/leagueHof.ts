// src/lib/gamebook/yellow/data/leagueHof.ts
//
// HALL OF FAME de la LIGUE (table LeagueChampion, `world`) — règle du 26/10/2026 (Sartay, « pour ne pas décourager les
// nouveaux ») : le palmarès du RUN 1 ne garde qu'UN sacre par joueur, le PREMIER. Tout re-sacre de la Ligue du run 1
// (typiquement un joueur qui a déjà fait la méga-fusion, avec une équipe de trois runs) part dans une catégorie à part,
// « RUN 1 · APRÈS FUSION » (`live_post`), visible SEULEMENT des joueurs arrivés au run fusion (run3Used). L'énergie
// offerte aux autres joueurs au sacre ne change pas. Module PUR — route hall-of-fame + HallOfFameViewer.

export const LEAGUE_POST_FUSION_WORLD = "live_post"

/** `world` à graver pour un sacre : runs 2/3 tels quels ; run 1 → `live` pour le PREMIER sacre d'un joueur encore hors run
 *  fusion, `live_post` sinon (déjà fusionné OU déjà un sacre run 1 au palmarès). */
export function leagueWorldForSacre(bodyWorld: unknown, run3Used: boolean, alreadyHasLive: boolean): string {
    if (bodyWorld === "ngplus" || bodyWorld === "run3") return bodyWorld
    return run3Used || alreadyHasLive ? LEAGUE_POST_FUSION_WORLD : "live"
}

/** Une ligne du HoF de la Ligue est-elle servie à ce spectateur ? Les sacres de FUSION ont leur propre onglet (route
 *  fusion-hall-of-fame) ; `live_post` n'existe que pour qui est au run fusion. */
export function leagueHofVisible(world: string | null | undefined, viewerRun3Used: boolean): boolean {
    const w = world ?? "live"
    if (w.startsWith("fusion:")) return false
    if (w === LEAGUE_POST_FUSION_WORLD) return viewerRun3Used
    return true
}

/** REPRISE des lignes existantes : pour chaque joueur, son PREMIER sacre `live` reste ; les suivants → `live_post`.
 *  Renvoie les ids à déplacer (rows triés par wonAt croissant). */
export function leagueLiveDuplicates(rows: readonly { id: string; userId: string; world: string | null; wonAt: Date | string }[]): string[] {
    const sorted = [...rows].filter((r) => (r.world ?? "live") === "live").sort((a, b) => +new Date(a.wonAt) - +new Date(b.wonAt))
    const seen = new Set<string>(); const dup: string[] = []
    for (const r of sorted) { if (seen.has(r.userId)) dup.push(r.id); else seen.add(r.userId) }
    return dup
}
