// src/lib/gamebook/yellow/data/platineThrone.ts
//
// PALIER PLATINE — LE TRÔNE. Un seul joueur à la fois est « Maître Ultime du Nexus ». Il le reste jusqu'à ce
// qu'un challenger traverse tout le couloir — ACE, puis les salles des champions, puis SA salle à lui.
//
// CE QUI COMPTE ICI, C'EST LA DURÉE, PAS LE TROPHÉE :
//   • le règne est horodaté (`sinceAt`) → on peut afficher « Maître depuis 12 jours » ;
//   • chaque challenger qui ÉCHOUE rapporte +1 point au tenant (décision Sartay), SAUF s'il s'agit du tenant
//     lui-même — sinon il lui suffirait de perdre en boucle contre sa propre salle pour se gonfler.
//
// STOCKAGE — ZÉRO MIGRATION. On réutilise LeagueChampion avec `world = "platine"`.
// ⚠️ PAS "fusion:platine" : la route fusion-hall-of-fame ramasse TOUT ce qui commence par "fusion:" et fait un
//    JSON.parse(team) en attendant un TABLEAU. Or notre payload est un OBJET (équipe + skin + points + date).
//    Le préfixe distinct garde les deux mondes étanches.

import type { FusionChampionMon } from "../storage/save"

/** La valeur de `LeagueChampion.world` qui porte le trône. Volontairement SANS le préfixe "fusion:". */
export const PLATINE_THRONE_WORLD = "platine"

/** Le contenu de `LeagueChampion.team` pour le trône : un OBJET, pas un tableau (cf. avertissement ci-dessus). */
export interface ThroneSlot {
    /** Version de format — permet de faire évoluer le payload sans casser les règnes déjà gravés. */
    v: 1
    /** L'équipe FIGÉE du sacre : c'est elle que les prochains challengers affronteront en dernière salle. */
    team: FusionChampionMon[]
    /** Le skin du tenant au moment du sacre (même logique que le reflet de la Ligue OR). */
    avatar?: string
    /** +1 par challenger tombé dans le couloir. CUMULÉ À VIE (décision Sartay 11/09) : perdre le trône ne
     *  remet pas le compteur à zéro, sinon le classement des Empereurs n'aurait aucune mémoire et un règne
     *  long mais ancien vaudrait zéro. On repart donc de son score quand on reprend la chaise. */
    points: number
    /** ISO — début du règne EN COURS (remis à maintenant à chaque reprise du trône). */
    sinceAt: string
    /** Nombre de fois où ce joueur a pris la chaise. 1 au premier sacre. */
    reigns: number
}

/** Sérialise un trône pour la colonne `team` (String). */
export function encodeThrone(slot: ThroneSlot): string {
    return JSON.stringify(slot)
}

/** Lit un trône stocké. Défensif : un payload absent, illisible, ou d'un ancien format renvoie null plutôt que
 *  de faire exploser la route — un trône corrompu doit dégrader en « personne sur le trône », pas en 500. */
export function decodeThrone(raw: string | null | undefined): ThroneSlot | null {
    if (!raw) return null
    let o: unknown
    try { o = JSON.parse(raw) } catch { return null }
    if (!o || typeof o !== "object" || Array.isArray(o)) return null
    const r = o as Partial<ThroneSlot>
    if (!Array.isArray(r.team)) return null
    return {
        v: 1,
        team: r.team.slice(0, 6) as FusionChampionMon[],
        avatar: typeof r.avatar === "string" ? r.avatar.slice(0, 200) : undefined,
        points: Number.isFinite(r.points) ? Math.max(0, Math.floor(r.points as number)) : 0,
        sinceAt: typeof r.sinceAt === "string" ? r.sinceAt : new Date(0).toISOString(),
        reigns: Number.isFinite(r.reigns) ? Math.max(1, Math.floor(r.reigns as number)) : 1,
    }
}

/** Un NOUVEAU règne : l'équipe est figée, le compteur repart de zéro, le chrono démarre maintenant.
 *  `now` est injecté (jamais Date.now() implicite) → testable et déterministe. */
export function claimThrone(team: FusionChampionMon[], avatar: string | undefined, now: Date): ThroneSlot {
    return { v: 1, team: team.slice(0, 6), avatar, points: 0, sinceAt: now.toISOString(), reigns: 1 }
}

/** RETOUR SUR LE TRÔNE. Un ancien Maître qui reprend la chaise GARDE son score (points à vie), grave sa
 *  nouvelle équipe, et son chrono de règne repart de zéro. Sans ça, reprendre le trône COÛTERAIT des points. */
export function renewThrone(prev: ThroneSlot, team: FusionChampionMon[], avatar: string | undefined, now: Date): ThroneSlot {
    return { v: 1, team: team.slice(0, 6), avatar, points: prev.points, sinceAt: now.toISOString(), reigns: prev.reigns + 1 }
}

/** Un challenger vient d'échouer → +1 au tenant. Le tenant ne peut PAS se créditer lui-même (il lui suffirait
 *  de perdre exprès contre sa propre salle). Renvoie le trône inchangé dans ce cas. */
export function awardFailurePoint(slot: ThroneSlot, challengerUserId: string, holderUserId: string): ThroneSlot {
    if (!challengerUserId || challengerUserId === holderUserId) return slot
    return { ...slot, points: slot.points + 1 }
}

/** Durée du règne en JOURS PLEINS (0 le jour même). Sert au classement « plus on tient, mieux c'est ». */
export function reignDays(slot: ThroneSlot, now: Date): number {
    const start = Date.parse(slot.sinceAt)
    if (!Number.isFinite(start)) return 0
    return Math.max(0, Math.floor((now.getTime() - start) / 86400000))
}

/** Libellé lisible du règne, pour l'écran du trône et le Palmarès. */
export function reignLabel(slot: ThroneSlot, now: Date): string {
    const d = reignDays(slot, now)
    if (d <= 0) return "sacré aujourd'hui"
    if (d === 1) return "Maître depuis 1 jour"
    return `Maître depuis ${d} jours`
}

/** SCORE DE RÈGNE — ce qui départage les Maîtres au Palmarès. Les points (challengers repoussés) pèsent plus
 *  qu'un jour écoulé : tenir en repoussant du monde vaut mieux que tenir parce que personne n'est venu. */
export function throneScore(slot: ThroneSlot, now: Date): number {
    return slot.points * 10 + reignDays(slot, now)
}

// ─────────── LE CLASSEMENT DES EMPEREURS (idée Sartay 11/09) ───────────
// Deux titres, deux logiques, et c'est volontaire :
//   • le MAÎTRE EN TITRE (👑) est celui qu'on affronte en dernière salle — le dernier à s'être assis ;
//   • l'EMPEREUR est celui qui a repoussé le plus de challengers — il trône en tête du classement, qu'il
//     soit encore sur la chaise ou non. Tenir, c'est bien ; résister, c'est mieux.
// Un Maître en titre fraîchement sacré peut donc être dernier au classement : il n'a encore rien défendu.

export interface ThroneEntry { userId: string; nickname: string; slot: ThroneSlot }
export interface RankedThrone extends ThroneEntry {
    rank: number
    /** Assis sur la chaise en ce moment (celui qu'on affronte) — au plus un. */
    isHolder: boolean
    /** Tête du classement (le plus de points). Peut être quelqu'un d'autre que le Maître en titre. */
    isEmperor: boolean
    days: number
}

/** Range les Maîtres : POINTS d'abord (c'est le sens du palier : résister), puis l'ancienneté du règne en
 *  cours, puis le pseudo pour que l'ordre soit STABLE (deux ex æquo ne doivent pas permuter d'un chargement
 *  à l'autre). `holderUserId` ne change PAS l'ordre — il ne fait que poser la couronne. */
export function rankThrones(entries: readonly ThroneEntry[], holderUserId: string | null, now: Date): RankedThrone[] {
    return [...entries]
        .sort((a, b) =>
            b.slot.points - a.slot.points ||
            reignDays(b.slot, now) - reignDays(a.slot, now) ||
            a.nickname.localeCompare(b.nickname))
        .map((e, i) => ({
            ...e,
            rank: i + 1,
            isHolder: !!holderUserId && e.userId === holderUserId,
            isEmperor: i === 0 && e.slot.points > 0, // personne n'est Empereur sans avoir repoussé quelqu'un
            days: reignDays(e.slot, now),
        }))
}

/** Le titre à afficher devant un nom, au Palmarès comme dans la salle. */
export function throneTitle(r: RankedThrone): string {
    if (r.isEmperor && r.isHolder) return "👑 EMPEREUR DU NEXUS"
    if (r.isEmperor) return "⭐ Empereur du Nexus"
    if (r.isHolder) return "👑 Maître en titre"
    return "Ancien Maître"
}

// ─────────── BORNAGE DE L'ÉQUIPE GRAVÉE (pur, testable — déplacé ici depuis la route le 19/10/2026) ───────────
/** Ces chimères sont REJOUÉES telles quelles (frozenStats, aucun recalcul) par tous les challengers : une équipe bricolée
 *  à 9999 rendrait le trône imprenable à vie, et c'est un abus qui touche les AUTRES joueurs. On borne donc à l'écriture.
 *  On GARDE désormais `moveTypes`, `items` et `shiny` : la route les jetait, et le tenant était rejoué les mains vides,
 *  sans chromatique et sans ses types transmutés — plus facile à détrôner que sa propre salle OR, qui conserve tout.
 *  Renvoie [] si rien d'exploitable. (Plafonds larges : une fusion dorée platine tourne autour de 700-900 par stat.) */
export function sanitizeThroneTeam(raw: unknown): FusionChampionMon[] {
    if (!Array.isArray(raw)) return []
    const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)))
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "")
    const out: FusionChampionMon[] = []
    for (const m of raw.slice(0, 6)) {
        if (!m || typeof m !== "object") continue
        const o = m as Record<string, unknown>
        const st = (o.stats ?? {}) as Record<string, unknown>
        const name = str(o.name, 40)
        if (!name) continue // sans nom, la salle ne peut rien afficher : on préfère l'écarter
        const moveTypes: Record<string, string> = {}
        if (o.moveTypes && typeof o.moveTypes === "object") {
            for (const [k, v] of Object.entries(o.moveTypes as Record<string, unknown>).slice(0, 4)) { const kk = str(k, 40), vv = str(v, 20); if (kk && vv) moveTypes[kk] = vv }
        }
        const items = Array.isArray(o.items) ? o.items.map((x) => str(x, 40)).filter(Boolean).slice(0, 2) : []
        const mon: FusionChampionMon = {
            name, sprite: str(o.sprite, 300),
            types: Array.isArray(o.types) ? o.types.slice(0, 2).map((t) => str(t, 20)) : [],
            level: Math.max(1, Math.min(100, Math.floor(Number(o.level) || 1))),
            stats: { hp: num(st.hp, 2000), atk: num(st.atk, 1500), def: num(st.def, 1500), spe: num(st.spe, 1500), spc: num(st.spc, 1500) },
            moves: Array.isArray(o.moves) ? o.moves.slice(0, 4).map((x) => str(x, 40)) : [],
        }
        if (o.aId) mon.aId = str(o.aId, 64) // ids custom jusqu'à 43 car. (custom_<slug16>_<slug16>_sN) : tronqués, le sprite ne se résout plus
        if (o.bId) mon.bId = str(o.bId, 64)
        if (!(mon.stats.hp > 0)) continue // une chimère sans PV rendrait la salle absurde (relecture 19/10)
        if (Object.keys(moveTypes).length) mon.moveTypes = moveTypes
        if (items.length) mon.items = items
        if (o.shiny === true) mon.shiny = true
        out.push(mon)
    }
    return out
}

/** REPRISE DE LA CHAISE. Pas de fiche → nouveau règne (claimThrone). Une fiche ET le joueur est DÉJÀ le tenant (il vient de
 *  rebattre son propre couloir) → on regrave l'équipe et le skin SANS toucher au chrono ni au nombre de règnes : il n'a
 *  jamais perdu la chaise, son ancienneté continue (avant, se rebattre soi-même remettait le règne à zéro). Sinon (ancien
 *  Maître qui revient) → renewThrone. */
export function reclaimThrone(prev: ThroneSlot | null, team: FusionChampionMon[], avatar: string | undefined, now: Date, isTenant: boolean): ThroneSlot {
    if (!prev) return claimThrone(team, avatar, now)
    if (isTenant) return { ...prev, team: team.slice(0, 6), avatar: avatar ?? prev.avatar }
    return renewThrone(prev, team, avatar, now)
}

/** La save (flags bruts, côté serveur) porte-t-elle ce marqueur dans UN de ses mondes réels (principal, run 2, run 3) ?
 *  Les marqueurs de Ligue sont PAR MONDE ; ne lire que la racine refusait à tort un joueur qui a joué ailleurs. La bulle de
 *  rejeu est ignorée (jetable). */
export function saveHasMarker(flags: unknown, marker: string, opts?: { includeReplay?: boolean }): boolean {
    const f = (flags ?? {}) as { defeatedTrainers?: unknown; ngplusWorld?: { defeatedTrainers?: unknown } | null; run3World?: { defeatedTrainers?: unknown } | null; replayWorld?: { defeatedTrainers?: unknown } | null }
    const lists = [f.defeatedTrainers, f.ngplusWorld?.defeatedTrainers, f.run3World?.defeatedTrainers, ...(opts?.includeReplay ? [f.replayWorld?.defeatedTrainers] : [])]
    return lists.some((l) => Array.isArray(l) && l.includes(marker))
}
