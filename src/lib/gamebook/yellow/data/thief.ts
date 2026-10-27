// src/lib/gamebook/yellow/data/thief.ts
//
// LE VOLEUR — PNJ de CENDREVILLE (demande Sartay du 27/10/2026), présent dans TOUTES les runs (1, 2, 3, fusion), jamais en rejeu.
//   • CHEZ LUI en (37,18) : un INCONNU aborde le joueur gentiment, raconte une ANECDOTE (dexLore) sur un Daemon AU HASARD de
//     l'équipe (tirage stable dans la journée : recharger la page ne change pas la cible)… puis le VOLE et disparaît vers une
//     CACHETTE (37,27) / (6,32) / (25,11) — un vol par JOUR au maximum.
//   • LORS DU VOL (lecture littérale de la demande) : 1er vol → le Daemon volé reçoit le SURIN DU VOLEUR (objet tenu : AU DÉBUT
//     du combat, s'il est envoyé en premier, l'adversaire perd autant de PV que le niveau du porteur, sans jamais tomber K.O.) ;
//     2e vol → il s'excuse et offre 3 PÂTES DE LUXE en expliquant la loterie ; 3e vol → une HYPER NEXUS-BALL +. Il laisse un mot.
//   • CACHÉ : il change de cachette (toujours une AUTRE que la dernière vue) à chaque chargement de Cendreville. Retrouvé → « Ah !
//     tu m'as trouvé, zut… » → COMBAT contre les NÉMÉSIS du jour : le CONTRE de chaque Daemon de l'équipe telle qu'elle était À
//     L'INSTANT du vol (comme le Défi Némésis : même niveau, mêmes IV, même entraînement), le Daemon VOLÉ en personne prenant la
//     place de son propre contre. IA « hof » (la plus poussée). Défaite : il garde le Daemon (retentable, sans XP gardée).
//     Victoire : le Daemon revient TEL QUEL (équipe, sinon boîte PC). Après le 3e vol résolu, il disparaît pour de bon.
//   • Jamais volés : le dernier Daemon, un Daemon posé sur l'étal du Marchand, le DISCIPLE de clan, un Daemon lié à une pièce
//     de l'ARTISANE (liaisons par uid qui casseraient). Cf. playerStore.thiefProtectedUids.
//   • ÉTAT GLOBAL AU PROFIL (`PlayerState.thief`, sérialisé au haut niveau de la save, parsé côté serveur) : un vol commis en
//     run 1 et non résolu SUIT le joueur en run 2/3 — le Voleur et son larcin l'y attendent (seule façon de faire passer un
//     Daemon d'une run à l'autre). Compteurs partagés entre les mondes ; seul le reset VOLONTAIRE du chapitre les efface.
// Module de DONNÉES pur (pas d'import de store). Câblage : playerStore (commitTheft / recoverStolen / getThief /
// thiefVictimsNow), gameStore (PNJ + flux), battleStore (victoire), save.ts (parse), saveManager (global), engine (Surin).

import type { MonInstance, StatKey } from "../battle/types"
import { fullStats } from "../battle/stats"
import { createMonInstance } from "../battle/factory"
import { getSpecies } from "./species"
import { dexLore } from "./dexLore"
import { THIEF_ITEM_ID, getHeldItem, isHeldItem } from "./heldItems"
import { bestCounter, baseSpeciesOf, speciesAtLevel } from "./ace"
import { distributeEvs } from "./evConfig"

export { THIEF_ITEM_ID }

export const THIEF_NPC_ID = "y_voleur"
export const THIEF_TRAINER_ID = "y_voleur"
export const THIEF_NAME = "VOLEUR"
/** Nom affiché tant qu'il n'a encore jamais volé ce joueur (la révélation vient après le premier larcin). */
export const THIEF_STRANGER_NAME = "INCONNU"
export const THIEF_MAP_ID = "yellow_cendreville"
/** Planche Gen 3 (19×4, 760×160) fournie par Sartay le 27/10/2026. */
export const THIEF_SPRITE = "/yellow/sprites/npc_voleur_gen3.png"
/** Chez lui : rue est de Cendreville, près de l'arrivée depuis la Ville Jaune. */
export const THIEF_HOME = { x: 37, y: 18 } as const
/** Cachettes (Sartay : 37,27 · 6,32 · 26,11). ⚠️ (26,11) est un MUR sur la grille de Cendreville → (25,11), la case
 *  praticable voisine (à confirmer par Sartay). Re-tirée à chaque chargement de Cendreville, jamais la même deux fois de suite. */
export const THIEF_HIDEOUTS: readonly (readonly [number, number])[] = [[37, 27], [6, 32], [25, 11]]
export const THIEF_MAX_THEFTS = 3
/** Nb de Pâtes de Luxe offertes au 2e vol. */
export const THIEF_LUXE_GIFT = 3
export const THIEF_BALL_GIFT_ID = "hyper_ball_plus"
export const THIEF_LUXE_ITEM_ID = "pate_de_luxe"

/** État GLOBAL au profil (save haut niveau). `stolen` = le Daemon volé tel qu'au moment du vol (Surin compris au 1er vol) ;
 *  `snapshot` = l'équipe ENTIÈRE à cet instant (volé compris, à sa place) → base des némésis du combat. */
export interface ThiefState {
    thefts: number          // vols commis (0..3)
    lastTheftDay: string    // jour LOCAL du dernier vol ("" si jamais)
    stolen: MonInstance | null
    snapshot: MonInstance[]
    stolenAt: string        // ISO du vol ("" si aucun en cours)
    stolenWorld: string     // monde du vol (live / ngplus / run3), informatif
}

/** Ce que le vol a laissé au joueur (lu par playerStore pour remplir le sac, et par le mot du Voleur). */
export interface ThiefGift {
    theftNo: number                 // n° du vol qui vient d'avoir lieu (1..3)
    surin?: "mon" | "bag"           // 1er vol : Surin glissé au Daemon volé, ou dans le sac s'il tenait un objet inconnu
    returnedItem?: string           // 1er vol : objet que tenait le Daemon volé, rendu au sac
}

export function emptyThiefState(): ThiefState {
    return { thefts: 0, lastTheftDay: "", stolen: null, snapshot: [], stolenAt: "", stolenWorld: "" }
}

/** Jour civil LOCAL (comme l'Orfèvre). */
export function thiefDayKey(now = new Date()): string {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

/** Un vol est en cours (Daemon à récupérer) ? */
export function thiefPending(s: ThiefState | null | undefined): boolean { return !!s?.stolen }
/** Le Voleur a disparu pour de bon (3 vols résolus) ? */
export function thiefGone(s: ThiefState | null | undefined): boolean { return !!s && s.thefts >= THIEF_MAX_THEFTS && !s.stolen }
/** Peut-il voler aujourd'hui ? (pas de vol en cours, pas disparu, pas déjà volé ce jour) */
export function thiefCanStealToday(s: ThiefState | null | undefined, day = thiefDayKey()): boolean {
    const st = s ?? emptyThiefState()
    return !st.stolen && !thiefGone(st) && st.lastTheftDay !== day
}

/** Daemons VOLABLES de l'équipe : il faut rester ≥ 1 Daemon ; jamais un Daemon posé sur l'étal du Marchand (escrow) ni un
 *  uid PROTÉGÉ (disciple de clan, Daemon lié à une pièce de l'Artisane — cf. playerStore.thiefProtectedUids). */
export function thiefEligibleVictims(team: readonly MonInstance[], protectedUids?: ReadonlySet<string>): MonInstance[] {
    if (team.length < 2) return []
    return team.filter((m) => m.tradeState !== "listed" && !protectedUids?.has(m.uid))
}

/** La cible du jour : tirage DÉTERMINISTE (jour local + n° du vol) parmi les volables triés par uid. Recharger la page pendant
 *  l'anecdote re-désigne donc la MÊME victime (pas de re-tirage par F5) ; seul un changement d'équipe change la cible. */
export function pickThiefVictim(victims: readonly MonInstance[], day: string, thefts: number): MonInstance {
    const sorted = [...victims].sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))
    const key = `${day}|${thefts}`
    let h = 2166136261 // FNV-1a 32 bits
    for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619) >>> 0
    return sorted[h % sorted.length]
}

/** Prochaine cachette : au hasard, mais JAMAIS la même que la précédente (« il change de place à chaque chargement »). */
export function nextThiefSpotIdx(prev: number, rand: number): number {
    const n = THIEF_HIDEOUTS.length
    const r = Math.max(0, Math.min(0.999999, rand))
    if (n < 2 || prev < 0 || prev >= n) return Math.floor(r * n)
    const k = Math.floor(r * (n - 1)) // 0..n-2, on saute l'index précédent
    return k >= prev ? k + 1 : k
}

/** Nom affiché d'un Daemon (surnom sinon espèce). */
export function thiefMonName(m: Pick<MonInstance, "nickname" | "speciesId">): string {
    return m.nickname ?? getSpecies(m.speciesId)?.name ?? m.speciesId
}

/** Anecdote sur l'espèce (carnet de terrain du dex : note, sinon dicton, sinon écologie). */
export function thiefAnecdote(speciesId: string): string {
    const l = dexLore(speciesId)
    const raw = l?.note || l?.dicton || l?.ecology
    return raw ? raw.trim() : "On dit qu'il porte chance à qui prend le temps de l'écouter. Et qu'il a un faible pour les inconnus bien habillés."
}

/** Copie de données d'un Daemon (moves/IV clonés) SANS le champ transient `signatureItem` (Artisane, re-dérivé à l'hydrate
 *  pour l'équipe/PC seulement) → l'instantané a la même force avant et après un rechargement. */
function frozenCopy(m: MonInstance): MonInstance {
    const c: MonInstance = { ...m, moves: m.moves.map((mv) => ({ ...mv })), ivs: { ...m.ivs } }
    delete (c as { signatureItem?: unknown }).signatureItem
    return c
}

/** Le Daemon VOLÉ en combat : PV pleins, pas de statut, PP pleins, uid préfixé, non possédé (copie de combat). */
function stolenFighter(m: MonInstance, i: number): MonInstance {
    const sp = getSpecies(m.speciesId)
    const max = sp ? fullStats(m, sp).hp : Math.max(1, m.currentHp)
    return { ...frozenCopy(m), uid: `thief-${i}-${m.uid}`, currentHp: max, status: "NONE", statusCounter: 0, moves: m.moves.map((mv) => ({ ...mv, pp: mv.ppMax })), owned: false, tradeState: undefined, tradeListingId: undefined }
}

/** La NÉMÉSIS d'un Daemon de l'instantané : son CONTRE (comme le Défi Némésis, bestCounter + stade au niveau), au MÊME niveau,
 *  avec les MÊMES IV, le même total d'EV (réparti sur ses points forts) et les mêmes points Saiyan (60/40 sur ses 2 meilleures
 *  stats), chromatique s'il l'était. null si l'espèce est inconnue (Daemon custom non enregistré). */
function nemesisOf(m: MonInstance, i: number): MonInstance | null {
    const sp = getSpecies(m.speciesId)
    if (!sp) return null
    const counterId = speciesAtLevel(baseSpeciesOf(bestCounter([...sp.types])), m.level)
    const csp = getSpecies(counterId)
    if (!csp) return null
    const evTotal = Object.values(m.ev ?? {}).reduce((a, v) => a + (v ?? 0), 0)
    const saiyan = Object.values(m.allocated ?? {}).reduce((a, v) => a + (v ?? 0), 0)
    const best = (Object.keys(csp.baseStats) as StatKey[]).sort((a, b) => csp.baseStats[b] - csp.baseStats[a])
    const allocated: Partial<Record<StatKey, number>> = saiyan > 0 ? { [best[0]]: Math.round(saiyan * 0.6), [best[1]]: saiyan - Math.round(saiyan * 0.6) } : {}
    const c = createMonInstance(counterId, m.level, { owned: false, ivsByStat: m.ivs, ev: evTotal > 0 ? distributeEvs(csp.baseStats, evTotal) : undefined, allocated, shiny: m.shiny })
    return { ...c, uid: `thief-${i}-${c.uid}` }
}

/** L'équipe du Voleur : pour chaque Daemon de l'instantané, sa NÉMÉSIS — sauf le Daemon volé, qui combat EN PERSONNE (avec son
 *  Surin au 1er vol). Repli défensif = le volé seul. Max 6. */
export function buildThiefTeam(s: ThiefState): MonInstance[] {
    const base = s.snapshot.length ? s.snapshot : (s.stolen ? [s.stolen] : [])
    const out: MonInstance[] = []
    base.slice(0, 6).forEach((m, i) => {
        if (s.stolen && m.uid === s.stolen.uid) { out.push(stolenFighter(s.stolen, i)); return }
        const n = nemesisOf(m, i)
        if (n) out.push(n)
    })
    if (out.length === 0 && s.stolen) out.push(stolenFighter(s.stolen, 0))
    return out
}

/** Construit l'état après un vol : le volé sort de l'équipe (tel quel, PV compris ; Surin glissé au 1er vol), l'équipe entière
 *  est figée en instantané. null (rien ne change) si un vol est en cours, s'il a disparu, si l'équipe est trop petite ou si la
 *  cible est intouchable. `gift` = ce que le vol laisse au joueur (playerStore remplit le sac). */
export function stateAfterTheft(
    prev: ThiefState | null | undefined, team: readonly MonInstance[], victimUid: string, world: string,
    opts?: { now?: Date; protectedUids?: ReadonlySet<string> },
): { state: ThiefState; stolen: MonInstance; remaining: MonInstance[]; gift: ThiefGift } | null {
    const st = prev ?? emptyThiefState()
    if (st.stolen || thiefGone(st) || team.length < 2) return null
    const victim = thiefEligibleVictims(team, opts?.protectedUids).find((m) => m.uid === victimUid)
    if (!victim) return null
    const now = opts?.now ?? new Date()
    const theftNo = st.thefts + 1
    const gift: ThiefGift = { theftNo }
    let stolen = frozenCopy(victim)
    if (theftNo === 1) {
        if (stolen.heldItem && !isHeldItem(stolen.heldItem)) gift.surin = "bag" // objet inconnu : il le garde, le Surin va au sac
        else {
            if (stolen.heldItem) gift.returnedItem = stolen.heldItem
            stolen = { ...stolen, heldItem: THIEF_ITEM_ID }
            gift.surin = "mon"
        }
    }
    return {
        state: {
            thefts: theftNo,
            lastTheftDay: thiefDayKey(now),
            stolen,
            snapshot: team.map((m) => (m.uid === victimUid ? stolen : frozenCopy(m))),
            stolenAt: now.toISOString(),
            stolenWorld: world,
        },
        stolen,
        remaining: team.filter((m) => m.uid !== victimUid),
        gift,
    }
}

// ── Dialogues ──
export function thiefHomeLines(victimName: string, anecdote: string): string[] {
    return [
        "*Un gaillard à cape sombre, sourire en coin, te barre gentiment la route.*",
        `« Oh, mais c'est un ${victimName} que tu as là ! Un sacré numéro, celui-là. Tu sais ce qu'on raconte sur son espèce ? »`,
        `« ${anecdote} »`,
        "« Passionnant, hein ? Allez, c'était un plaisir, dresseur. À un de ces jours… »",
    ]
}
const SURIN_EFFECT = "au début d'un combat, s'il est envoyé en premier, il entaille l'adversaire d'autant de PV que son niveau, sans jamais le mettre K.O."
/** Après le vol : la disparition, puis le MOT laissé par le Voleur (cadeau du vol n° `gift.theftNo`). */
export function thiefStoleLines(victimName: string, gift: ThiefGift): string[] {
    const first = gift.theftNo <= 1
    const lines = [
        first
            ? `*…Il s'est volatilisé, et ${victimName} avec lui ! Ce type était un VOLEUR !*`
            : `*…Il s'est volatilisé, et ${victimName} avec lui. Le VOLEUR a encore frappé !*`,
        "*Il a laissé un mot :*",
    ]
    if (first) {
        lines.push(gift.surin === "bag"
            ? `« Merci pour ${victimName} ! Il tenait déjà quelque chose, alors j'ai glissé mon SURIN dans ton sac : ${SURIN_EFFECT} »`
            : `« Merci pour ${victimName} ! Je lui ai glissé mon SURIN : ${SURIN_EFFECT} »`)
        if (gift.returnedItem) lines.push(`*L'objet qu'il tenait, ${getHeldItem(gift.returnedItem)?.name ?? gift.returnedItem}, est retombé dans ton sac.*`)
    } else if (gift.theftNo === 2) {
        lines.push(
            "« Pardon, pardon… je n'ai pas pu m'en empêcher. Pour me faire pardonner : TROIS PÂTES DE LUXE, dans ton sac. »",
            "« Écoute bien : une Pâte de Luxe RE-TIRE tout le génome d'un Daemon, à pile ou face : PARFAIT (IV au maximum)… ou RANG D (IV au plancher). Une seule par Daemon, et c'est verrouillé ensuite : seul un TIRAMISU peut lui rendre ses gènes d'origine. Le Dieu Spaghetti te préviendra avant chaque bouchée. »",
        )
    } else {
        lines.push("« Trois fois… c'est la dernière, promis. Une HYPER NEXUS-BALL +, dans ton sac, pour la route. »")
    }
    lines.push("*Il n'a pas pu aller bien loin : fouille Cendreville et retrouve-le.*")
    return lines
}
export const THIEF_ALREADY_TODAY_LINES: readonly string[] = ["« Pas deux fois le même jour, l'ami… j'ai mes principes. Repasse demain ! »"]
export const THIEF_LONELY_LINES: readonly string[] = ["« Un seul Daemon sur toi ? Trop risqué… pour toi. Reviens mieux accompagné. »"]
export const THIEF_NOTHING_TEMPTING_LINES: readonly string[] = ["« Hmm… rien dans ton équipe ne me fait de l'œil aujourd'hui. Repasse avec d'autres têtes ! »"]
export function thiefFoundLines(victimName: string): string[] {
    return [
        `« Ah ! Tu m'as trouvé, zut. Je voulais garder ton ${victimName} pour moi. Il est trop miiiignon. »`,
        "« Bon… puisque tu y tiens : viens le chercher ! Mes amis et moi, on connaît ton équipe par cœur. »",
    ]
}
export function thiefNoTeamLines(victimName: string): string[] {
    return [`« Ton équipe est à terre ? Reviens quand tu tiendras debout — je garde ${victimName} au chaud. »`]
}
/** Victoire : le Daemon revient TEL QUEL. `theftNo` = n° du vol résolu ; au 3e, il raccroche pour de bon. */
export function thiefWinLines(theftNo: number, victimName: string, placed: "team" | "pc"): string[] {
    const back = placed === "team" ? `${victimName} retrouve ton équipe.` : `Ton équipe est au complet : ${victimName} t'attend dans la boîte PC.`
    if (theftNo >= THIEF_MAX_THEFTS) return [
        "« Trois fois… tu m'as eu trois fois. Je raccroche. Adieu, dresseur : tu ne me reverras plus. »",
        `*${back}*`,
    ]
    return ["« D'accord, d'accord, reprends-le ! On se reverra, l'ami… »", `*${back}*`]
}
