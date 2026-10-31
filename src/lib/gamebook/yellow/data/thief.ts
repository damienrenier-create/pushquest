// src/lib/gamebook/yellow/data/thief.ts
//
// LE VOLEUR — PNJ de CENDREVILLE (demande Sartay du 27/10/2026, NEUF vols depuis le 31/10/2026), présent dans TOUTES les runs
// (1, 2, 3, fusion), jamais en rejeu.
//   • CHEZ LUI en (37,18) : un INCONNU aborde le joueur gentiment, raconte une ANECDOTE (dexLore) sur un Daemon AU HASARD de
//     l'équipe (tirage stable dans la journée : recharger la page ne change pas la cible)… puis le VOLE et file se CACHER — un
//     vol par JOUR au maximum, neuf en tout.
//   • LORS DU VOL (lecture littérale de la demande) : 1er vol → le Daemon volé reçoit le SURIN DU VOLEUR (objet tenu : AU DÉBUT
//     du combat, s'il est envoyé en premier, l'adversaire perd autant de PV que le niveau du porteur, sans jamais tomber K.O.) ;
//     2e vol → il s'excuse et offre 3 PÂTES DE LUXE en expliquant la loterie ; 3e vol → une HYPER NEXUS-BALL +. Vols 4 à 9
//     (Sartay, 31/10/2026) : un BUTIN tiré d'un vœu du génie, en plus petit — 2 Bons Bonbons EV · 2 captures garanties ·
//     15 soins après un combat sauvage gagné · MINITEL 10 appels · 10 combats à coups gratuits · la Frénésie du Voleur (24 h,
//     un sauvage sur deux shiny jusqu'au premier capturé). Les CHARGES vivent dans cet état GLOBAL ; les POUVOIRS (soins,
//     MINITEL, coups gratuits, frénésie) dorment sous les règles du run 3, comme les vœux — les captures garanties marchent
//     partout. Vœu déjà ENTIER (MINITEL de Task1, soins de Gass) → 2 Pâtes de Luxe du Voleur à la place. Son mot explique tout.
//   • CACHÉ : la cachette est re-tirée à CHAQUE ENTRÉE sur une carte du tirage, jamais la même deux fois de suite, et peut tomber
//     sur une AUTRE carte (il n'est alors pas là). Cendreville d'abord ; dès la fuite du 3e vol, aussi la VILLE JAUNE ; dès celle
//     du 6e, aussi la GROTTE GELÉE, la PLAGE et la PLAINE D'ENTRAÎNEMENT (une carte hors d'atteinte des badges du monde actif sort
//     du tirage). Son mot ne dit plus où chercher à partir du 3e vol (Sartay : « Rien »). Retrouvé → « Ah !
//     tu m'as trouvé, zut… » → COMBAT contre les NÉMÉSIS du jour : le CONTRE de chaque Daemon de l'équipe telle qu'elle était À
//     L'INSTANT du vol (comme le Défi Némésis : même niveau, mêmes IV, même entraînement), le Daemon VOLÉ en personne prenant la
//     place de son propre contre. IA « hof » (la plus poussée). Défaite : il garde le Daemon (retentable, sans XP gardée).
//     Victoire : le Daemon revient TEL QUEL (équipe, sinon boîte PC). Au 3e vol résolu il fait ses adieux… et ment : il revient.
//     Après le 9e, il disparaît pour de bon.
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
import { bestCounter, baseSpeciesOf, npcSpeciesAtLevel } from "./ace"
import { PATE_LUXE_VOLEUR_ITEM_ID } from "./items"
import { distributeEvs } from "./evConfig"
import { shinyFrenzyActive, onShinyCaptured, type ShinyFrenzyState } from "./shinyFrenzy"
import { THIEF_MAX_THEFTS, THIEF_LOOT_CATCHES, THIEF_LOOT_HEALS, THIEF_LOOT_MINITEL, THIEF_LOOT_FREE_FIGHTS, THIEF_FRENZY_CAPTURES } from "./thiefLimits"

export { THIEF_ITEM_ID, THIEF_MAX_THEFTS, THIEF_LOOT_CATCHES, THIEF_LOOT_HEALS, THIEF_LOOT_MINITEL, THIEF_LOOT_FREE_FIGHTS, THIEF_FRENZY_CAPTURES }

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
/** Une cachette : carte + case. */
export interface ThiefSpot { mapId: string; x: number; y: number }
/** CACHETTES, carte par carte (Sartay, 31/10/2026). `fromThefts` : la carte entre dans le tirage dès la FUITE du vol n° fromThefts
 *  (« dès la fuite du 3e et du 6e vol ») ; `needs` : badges du MONDE ACTIF sans lesquels on ne peut pas l'atteindre (elle sort
 *  alors du tirage). Cendreville (27/10) : (26,11) est un MUR → (25,11), validé par Sartay. Toutes les cases : praticables, hors
 *  sorties, PNJ, regards de dresseurs, rives de pêche et passages obligés, invisibles depuis les arrivées (cf. thief.test). */
export const THIEF_HIDEOUT_POOLS: readonly { mapId: string; fromThefts: number; needs: readonly string[]; spots: readonly (readonly [number, number])[] }[] = [
    { mapId: "yellow_cendreville", fromThefts: 1, needs: [], spots: [[37, 27], [6, 32], [25, 11]] },
    { mapId: "yellow_entrance", fromThefts: 3, needs: [], spots: [[7, 29], [14, 33], [41, 31], [38, 4]] },
    { mapId: "yellow_grotte_gelee", fromThefts: 6, needs: ["plante", "roche"], spots: [[6, 6], [15, 4], [22, 15], [6, 28]] },
    { mapId: "yellow_plage", fromThefts: 6, needs: ["plante", "roche", "feu"], spots: [[13, 12], [17, 30], [6, 34], [7, 26]] },
    { mapId: "yellow_hautes_herbes", fromThefts: 6, needs: ["feu", "elec"], spots: [[5, 2], [10, 2], [2, 6], [13, 6]] },
]
/** Nb de Pâtes de Luxe offertes au 2e vol. */
export const THIEF_LUXE_GIFT = 3
export const THIEF_BALL_GIFT_ID = "hyper_ball_plus"
/** Les Pâtes offertes au 2e vol sont des Pâtes de Luxe DU VOLEUR : 1/3 shiny+parfait, 1/3 parfait, 1/3 rang D (Sartay 27/10/2026). */
export const THIEF_LUXE_ITEM_ID = PATE_LUXE_VOLEUR_ITEM_ID
// ── Butins des vols 4 à 9 (Sartay, 31/10/2026 : « inspirés des vœux, dans une mesure moindre ») — tailles des charges 5 à 8 et
//    du vol 9 dans data/thiefLimits (partagées avec le parse de la save) ──
/** Vol 4 : Bons Bonbons EV (Zyran en a eu 7). */
export const THIEF_BONBON_GIFT = 2
/** Vol 9 : Frénésie du Voleur — 24 h, un sauvage sur deux shiny, jusqu'au premier shiny capturé (Jacanon : 24 h, 3 captures). */
export const THIEF_FRENZY_HOURS = 24
/** Vœu déjà ENTIER (soins de Gass, MINITEL de Task1) : 2 Pâtes de Luxe du Voleur à la place (Sartay, 31/10/2026). */
export const THIEF_SWAP_PATES = 2

/** État GLOBAL au profil (save haut niveau). `stolen` = le Daemon volé tel qu'au moment du vol (Surin compris au 1er vol) ;
 *  `snapshot` = l'équipe ENTIÈRE à cet instant (volé compris, à sa place) → base des némésis du combat. */
export interface ThiefState {
    thefts: number          // vols commis (0..9)
    lastTheftDay: string    // jour LOCAL du dernier vol ("" si jamais)
    stolen: MonInstance | null
    snapshot: MonInstance[]
    stolenAt: string        // ISO du vol ("" si aucun en cours)
    stolenWorld: string     // monde du vol (live / ngplus / run3), informatif
    // 🎁 BUTINS des vols 5 à 9 (31/10/2026) — charges RESTANTES, globales au profil comme le reste. ADDITIF : absent = 0.
    lootCatches?: number    // vol 5 : captures garanties
    lootHeals?: number      // vol 6 : soins après un combat sauvage gagné
    lootMinitel?: number    // vol 7 : appels MINITEL
    lootFreeFights?: number // vol 8 : combats à coups gratuits
    lootFrenzy?: ShinyFrenzyState // vol 9 : fenêtre (until = 0 → attend le retour hors run 3) + shinies à capturer
}

/** Butin d'un vol 4 à 9 (cf. THIEF_LOOT_BY_THEFT) ; "pates" = 2 Pâtes de Luxe du Voleur à la place d'un vœu déjà entier. */
export type ThiefLoot = "bonbons" | "catches" | "heals" | "minitel" | "freeFights" | "frenzy" | "pates"
/** Le butin prévu pour chaque vol (Sartay, 31/10/2026). */
export const THIEF_LOOT_BY_THEFT: Readonly<Record<number, Exclude<ThiefLoot, "pates">>> = { 4: "bonbons", 5: "catches", 6: "heals", 7: "minitel", 8: "freeFights", 9: "frenzy" }

/** Ce que le vol a laissé au joueur (lu par playerStore pour remplir le sac, et par le mot du Voleur). */
export interface ThiefGift {
    theftNo: number                 // n° du vol qui vient d'avoir lieu (1..9)
    surin?: "mon" | "bag"           // 1er vol : Surin glissé au Daemon volé, ou dans le sac s'il tenait un objet inconnu
    returnedItem?: string           // 1er vol : objet que tenait le Daemon volé, rendu au sac
    loot?: ThiefLoot                // vols 4 à 9 : le butin remis
    swappedFor?: "heals" | "minitel" // le vœu entier que les Pâtes remplacent (Gass, Task1…)
    asleep?: boolean                // vol commis sous les règles du run 3 : le pouvoir attend la fin du run 3
    frenzyUntil?: number            // vol 9 : fin de la frénésie (epoch ms) ; 0 = elle commencera après le run 3
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
/** Le Voleur a disparu pour de bon (9 vols résolus) ? */
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

/** Les cachettes en jeu pendant le vol n° `thefts` (celui qui court), avec les badges du MONDE ACTIF. */
export function thiefHideoutPool(thefts: number, badges: readonly string[]): ThiefSpot[] {
    const out: ThiefSpot[] = []
    for (const p of THIEF_HIDEOUT_POOLS) {
        if (thefts < p.fromThefts || !p.needs.every((b) => badges.includes(b))) continue
        for (const [x, y] of p.spots) out.push({ mapId: p.mapId, x, y })
    }
    return out
}
const sameSpot = (a: ThiefSpot, b: ThiefSpot) => a.mapId === b.mapId && a.x === b.x && a.y === b.y
/** Prochaine cachette : au hasard dans `pool` (une case = une chance : plus une carte en a, plus il y traîne), mais JAMAIS la
 *  même que la précédente (« il change de place à chaque entrée »). null si aucune cachette n'est en jeu. */
export function nextThiefSpot(pool: readonly ThiefSpot[], prev: ThiefSpot | null, rand: number): ThiefSpot | null {
    const r = Math.max(0, Math.min(0.999999, rand))
    const choices = prev && pool.length > 1 ? pool.filter((s) => !sameSpot(s, prev)) : pool
    return choices.length ? choices[Math.floor(r * choices.length)] : null
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
    const counterId = npcSpeciesAtLevel(baseSpeciesOf(bestCounter([...sp.types])), m.level) // PNJ : évolutions par échange comprises
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
/** Les options du butin : `ownsMinitel` / `ownsWildHeal` = le joueur a DÉJÀ ce vœu en entier (n'importe lequel de ses mondes) ;
 *  `run3Rules` = vol commis sous les règles du run 3 (le pouvoir dort jusqu'au retour, la frénésie ne démarre qu'alors). */
export function stateAfterTheft(
    prev: ThiefState | null | undefined, team: readonly MonInstance[], victimUid: string, world: string,
    opts?: { now?: Date; protectedUids?: ReadonlySet<string>; ownsMinitel?: boolean; ownsWildHeal?: boolean; run3Rules?: boolean },
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
    // `...st` d'abord : les charges des butins déjà reçus SURVIVENT au vol suivant (l'état était reconstruit champ par champ).
    const state: ThiefState = {
        ...st,
        thefts: theftNo,
        lastTheftDay: thiefDayKey(now),
        stolen,
        snapshot: team.map((m) => (m.uid === victimUid ? stolen : frozenCopy(m))),
        stolenAt: now.toISOString(),
        stolenWorld: world,
    }
    // VOLS 4 à 9 : le BUTIN. Les charges s'AJOUTENT (jamais de remplacement). Vœu déjà entier → les Pâtes à la place.
    const loot = THIEF_LOOT_BY_THEFT[theftNo]
    if (loot === "bonbons") gift.loot = "bonbons"
    else if (loot === "catches") { gift.loot = "catches"; state.lootCatches = (st.lootCatches ?? 0) + THIEF_LOOT_CATCHES }
    else if (loot === "heals") {
        if (opts?.ownsWildHeal) { gift.loot = "pates"; gift.swappedFor = "heals" }
        else { gift.loot = "heals"; state.lootHeals = (st.lootHeals ?? 0) + THIEF_LOOT_HEALS }
    } else if (loot === "minitel") {
        if (opts?.ownsMinitel) { gift.loot = "pates"; gift.swappedFor = "minitel" }
        else { gift.loot = "minitel"; state.lootMinitel = (st.lootMinitel ?? 0) + THIEF_LOOT_MINITEL }
    } else if (loot === "freeFights") { gift.loot = "freeFights"; state.lootFreeFights = (st.lootFreeFights ?? 0) + THIEF_LOOT_FREE_FIGHTS }
    else if (loot === "frenzy") {
        gift.loot = "frenzy"
        // Run 3 : la fenêtre ne s'ouvre qu'au retour (until = 0) — 24 h passées sous scellés seraient 24 h perdues.
        state.lootFrenzy = { until: opts?.run3Rules ? 0 : now.getTime() + THIEF_FRENZY_HOURS * 3_600_000, left: THIEF_FRENZY_CAPTURES }
        gift.frenzyUntil = state.lootFrenzy.until
    }
    if (opts?.run3Rules && (gift.loot === "heals" || gift.loot === "minitel" || gift.loot === "freeFights" || gift.loot === "frenzy")) gift.asleep = true
    return { state, stolen, remaining: team.filter((m) => m.uid !== victimUid), gift }
}

// ── Butins : lectures PURES (le store branche le monde actif et l'horloge) ──
/** La Frénésie du Voleur attend-elle d'être lancée (vol 9 commis sous les règles du run 3) ? */
export function thiefFrenzyPending(s: ThiefState | null | undefined): boolean {
    return !!s?.lootFrenzy && s.lootFrenzy.left > 0 && s.lootFrenzy.until === 0
}
/** La Frénésie du Voleur court-elle (fenêtre ouverte, shiny pas encore capturé) ? */
export function thiefFrenzyRunning(s: ThiefState | null | undefined, now: number): boolean {
    return shinyFrenzyActive(s?.lootFrenzy, now)
}
/** Lance une frénésie en attente : la fenêtre de 24 h part de `now`. Inchangé si rien n'attend. */
export function startPendingThiefFrenzy(s: ThiefState, now: number): ThiefState {
    if (!thiefFrenzyPending(s) || !s.lootFrenzy) return s
    return { ...s, lootFrenzy: { ...s.lootFrenzy, until: now + THIEF_FRENZY_HOURS * 3_600_000 } }
}
/** Un shiny vient d'être CAPTURÉ pendant la frénésie : elle s'éteint (1 capture). null si elle ne courait pas. */
export function thiefFrenzyAfterCapture(s: ThiefState, now: number): ThiefState | null {
    if (!s.lootFrenzy || !thiefFrenzyRunning(s, now)) return null
    const r = onShinyCaptured(s.lootFrenzy, now)
    const next: ThiefState = { ...s }
    if (r.done) delete next.lootFrenzy
    else next.lootFrenzy = r.state
    return next
}
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"]
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
/** « samedi 1er novembre à 18h05 » (heure LOCALE du joueur). */
export function thiefFrenzyEndLabel(until: number): string {
    const d = new Date(until)
    const day = d.getDate() === 1 ? "1er" : String(d.getDate())
    return `${JOURS[d.getDay()]} ${day} ${MOIS[d.getMonth()]} à ${d.getHours()}h${String(d.getMinutes()).padStart(2, "0")}`
}

// ── Dialogues ──
/** Au 3e vol résolu, il fait ses adieux (texte d'origine, déjà lu par les premiers joueurs)… et MENT : il revient voler. */
export const THIEF_FAKE_FAREWELL = 3
/** Son retour après ses faux adieux du 3e vol (Sartay, 31/10/2026) : en tête de tout ce qu'il dit chez lui tant qu'il n'a pas revolé. */
export const THIEF_COMEBACK_LINES: readonly string[] = [
    "*Le VOLEUR est de retour chez lui, adossé au mur comme si de rien n'était.*",
    "« Tu croyais m'avoir vu pour la dernière fois ? Un voleur qui tient parole, ça n'existe pas. »",
]
/** Chez lui. `comeback` : il revient après ses faux adieux du 3e vol. */
export function thiefHomeLines(victimName: string, anecdote: string, opts?: { comeback?: boolean }): string[] {
    return [
        ...(opts?.comeback ? THIEF_COMEBACK_LINES : ["*Un gaillard à cape sombre, sourire en coin, te barre gentiment la route.*"]),
        `« Oh, mais c'est un ${victimName} que tu as là ! Un sacré numéro, celui-là. Tu sais ce qu'on raconte sur son espèce ? »`,
        `« ${anecdote} »`,
        "« Passionnant, hein ? Allez, c'était un plaisir, dresseur. À un de ces jours… »",
    ]
}
const SURIN_EFFECT = "au début d'un combat, s'il est envoyé en premier, il entaille l'adversaire d'autant de PV que son niveau, sans jamais le mettre K.O."
const PATES_RECIPE = "« Écoute bien, c'est ma recette : la Pâte RE-TIRE tout le génome d'un Daemon. Un tiers des fois, il en ressort SHINY et PARFAIT ; un tiers, PARFAIT (IV au maximum) ; un tiers, RANG D (IV au plancher). Une seule Pâte par Daemon, et c'est DÉFINITIF : aucun retour en arrière possible. Le Dieu Spaghetti te préviendra avant chaque bouchée. »"
const ASLEEP_LINE = "« Au run 3, ce cadeau reste dans ma poche : il marchera dès que ton run 3 sera terminé. »"
/** MODE D'EMPLOI de chaque butin à charges : le mot du Voleur le donne au vol, la poche « Butins du Voleur » du sac le rappelle. */
export const THIEF_LOOT_HOWTO: Readonly<Record<"catches" | "heals" | "minitel" | "freeFights" | "frenzy", { emoji: string; name: string; how: string }>> = {
    catches: { emoji: "🎯", name: "Captures garanties", how: "Ta prochaine Ball lancée sur un Daemon sauvage le capture à coup sûr. La charge ne part que si la capture réussit, et jamais quand la Ball était déjà sûre (Master-Éclair, Super Méga Nexus-Ball sur son légendaire affaibli…). Sans effet sur une fusion (il lui faut sa Fusio-Ball, aux conditions habituelles) ni sur un Daemon unique déjà possédé. Marche partout, run 3 compris, sauf en rejeu." },
    heals: { emoji: "🩹", name: "Pansements du Voleur", how: "Après une victoire contre un Daemon sauvage (K.O. ou capture), tes Daemons encore debout retrouvent tous leurs PV et sont guéris de leurs statuts. Un soin n'est décompté que s'il a servi. Les K.O. restent K.O., et fuir ne soigne pas." },
    minitel: { emoji: "📟", name: "MINITEL du Voleur", how: "En combat, choisis 📟 MINITEL pour passer l'appel : si ton DERNIER Daemon tombe K.O., un renfort tiré au hasard de ton PC débarque à pleine vie (il ne gagne pas d'XP). Un appel par combat, décompté seulement si le renfort arrive. Pas en duel PvP ni à l'épreuve de fusion de l'Autel." },
    freeFights: { emoji: "⚔️", name: "Coups gratuits", how: "Tes attaques coûtent 0⚡, sans rien faire de spécial, contre les sauvages comme contre les dresseurs (pas en duel PvP, ni en Zone de Combat, ni à l'épreuve de fusion de l'Autel). Un combat n'est décompté qu'à ta première attaque : fuir avant d'attaquer ne coûte rien." },
    frenzy: { emoji: "✨", name: "Frénésie du Voleur", how: "Un Daemon sauvage sur deux croisé dans les hautes herbes ou les grottes est SHINY (pas en surfant, ni sur l'île Émeraude, ni à la pêche, ni dans les rencontres spéciales), jusqu'à ce que tu captures un shiny. Tant qu'elle court, tous tes shinies restent un secret : pas de fête pour le Nexus." },
}
/** Ce qu'il reste des butins (lu par la poche « Butins du Voleur » du sac, cf. playerStore.getThiefLoot). */
export interface ThiefLootView {
    catches: number; heals: number; minitel: number; freeFights: number
    frenzyUntil: number | null      // fin d'une frénésie EN COURS
    frenzyPending: boolean          // frénésie reçue au run 3, pas encore lancée
    asleep: "run3" | "replay" | null // pourquoi les pouvoirs dorment ici (null : ils marchent)
}
/** Les lignes de la poche « Butins du Voleur » : un butin à charges encore actif = son nom, son compteur, son mode d'emploi. */
export function thiefLootRows(v: ThiefLootView): { emoji: string; name: string; count: string; how: string }[] {
    const h = THIEF_LOOT_HOWTO
    const rows: { emoji: string; name: string; count: string; how: string }[] = []
    if (v.catches > 0) rows.push({ ...h.catches, count: `×${v.catches}` })
    if (v.heals > 0) rows.push({ ...h.heals, count: `×${v.heals}` })
    if (v.minitel > 0) rows.push({ ...h.minitel, count: `×${v.minitel}` })
    if (v.freeFights > 0) rows.push({ ...h.freeFights, count: `×${v.freeFights}` })
    // Déjà lancée, elle dort au run 3 et en rejeu… mais son compte à rebours (heure réelle) continue.
    if (v.frenzyUntil && v.asleep) rows.push({ ...h.frenzy, count: "sans effet ici", how: `Elle ne marche pas ici, mais son compte à rebours continue : elle s'éteint le ${thiefFrenzyEndLabel(v.frenzyUntil)}. ${h.frenzy.how}` })
    else if (v.frenzyUntil) rows.push({ ...h.frenzy, count: "en cours", how: `Jusqu'au ${thiefFrenzyEndLabel(v.frenzyUntil)}. ${h.frenzy.how}` })
    else if (v.frenzyPending) rows.push({ ...h.frenzy, count: "en attente", how: `Elle commencera à ton premier pas de chasse après le run 3, pour 24 h. ${h.frenzy.how}` })
    return rows
}
/** Pourquoi les pouvoirs dorment ici (run 3 ou rejeu), en une phrase ; null s'ils marchent. */
export function thiefLootAsleepNote(asleep: ThiefLootView["asleep"]): string | null {
    if (asleep === "run3") return "Au run 3, les pansements, le MINITEL, les coups gratuits et une frénésie pas encore lancée dorment, comme les vœux du génie : ils reprendront dès que ton run 3 sera terminé. Une frénésie déjà lancée, elle, continue de s'écouler. Les captures garanties marchent."
    if (asleep === "replay") return "En rejeu, les butins du Voleur dorment, captures comprises : ils t'attendent à ton retour. Une frénésie déjà lancée, elle, continue de s'écouler."
    return null
}
/** Après le vol : la disparition, puis le MOT laissé par le Voleur (cadeau du vol n° `gift.theftNo`, avec son mode d'emploi). */
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
            "« Pardon, pardon… je n'ai pas pu m'en empêcher. Pour me faire pardonner : TROIS PÂTES DE LUXE DU VOLEUR, dans ton sac. »",
            PATES_RECIPE,
        )
    } else if (gift.theftNo === 3) {
        lines.push(
            "« Trois fois… c'est la dernière, promis. Une HYPER NEXUS-BALL +, dans ton sac, pour la route. »",
            "« Elle attrape mieux encore qu'une Hyper Nexus-Ball : garde-la pour une proie coriace. »",
        )
    } else if (gift.loot === "pates") {
        lines.push(gift.swappedFor === "heals"
            ? "« Six coups… mais tes Daemons se soignent déjà tout seuls après chaque sauvage : mes pansements ne te serviraient à rien. Prends plutôt DEUX PÂTES DE LUXE DU VOLEUR, dans ton sac. »"
            : "« Sept… mais ton MINITEL à toi sonne déjà sans limite : le mien ne te servirait à rien. Prends plutôt DEUX PÂTES DE LUXE DU VOLEUR, dans ton sac. »",
        PATES_RECIPE)
    } else if (gift.loot === "bonbons") {
        lines.push(
            "« J'avais dit que je raccrochais ? Mentir, c'est le métier. Pour me faire pardonner : DEUX BONS BONBONS EV, dans ton sac. »",
            "« Mode d'emploi : ouvre ton sac, poche 🍬 Bons Bonbons EV, et choisis QUI croque. Au prochain K.O. que ce Daemon inflige, il gagne d'un coup le MAXIMUM d'EV dans la stat que rapporte le vaincu, sa stat la plus forte. Plus de place pour cet entraînement ? Il garde le bonbon en joue pour la fois suivante. »",
        )
    } else if (gift.loot === "catches") {
        lines.push("« Cinq ! Je t'ai au moins appris à viser ? Je te laisse DEUX CAPTURES GARANTIES. »", "« Mode d'emploi : tes deux prochaines Balls lancées sur un Daemon sauvage le captureront à coup sûr. Une charge ne part que si la capture réussit, et jamais quand la Ball était déjà sûre (Master-Éclair…). Sans effet sur une fusion (il lui faut sa Fusio-Ball, aux conditions habituelles) ni sur un Daemon unique déjà possédé. Elles marchent partout, run 3 compris, sauf en rejeu. »")
    } else if (gift.loot === "heals") {
        lines.push("« Six coups, et tu tiens encore debout. Tiens, mes PANSEMENTS : QUINZE SOINS. »", `« Mode d'emploi : ${THIEF_LOOT_HOWTO.heals.how} »`)
    } else if (gift.loot === "minitel") {
        lines.push("« Sept… Un vieux MINITEL trouvé dans une poubelle de la Centrale : DIX APPELS, pas un de plus. »", `« Mode d'emploi : ${THIEF_LOOT_HOWTO.minitel.how} »`)
    } else if (gift.loot === "freeFights") {
        lines.push("« Huit. Tes DIX PROCHAINS COMBATS ne te coûteront rien. Ne me remercie pas : je l'ai volé aussi. »", `« Mode d'emploi : ${THIEF_LOOT_HOWTO.freeFights.how} »`)
    } else if (gift.loot === "frenzy") {
        lines.push(
            "« Neuf. Mon dernier coup, et cette fois c'est vrai. Mon cadeau d'adieu : la FRÉNÉSIE DU VOLEUR. »",
            gift.frenzyUntil
                ? `« Jusqu'au ${thiefFrenzyEndLabel(gift.frenzyUntil)}, un Daemon sauvage sur deux croisé dans les hautes herbes ou les grottes sera SHINY (pas en surfant, ni sur l'île Émeraude, ni à la pêche), jusqu'à ce que tu captures un shiny. Tant qu'elle court, tous tes shinies restent entre nous : pas de fête pour le Nexus. »`
                : "« Pendant 24 h, un Daemon sauvage sur deux croisé dans les hautes herbes ou les grottes sera SHINY (pas en surfant, ni sur l'île Émeraude, ni à la pêche), jusqu'à ce que tu captures un shiny. Tant qu'elle court, tous tes shinies restent entre nous : pas de fête pour le Nexus. »",
        )
        if (gift.asleep) lines.push("« Au run 3, elle attend : elle commencera à ton premier pas de chasse une fois ton run 3 terminé, et durera 24 h. »")
        lines.push("« Trouve-moi une dernière fois, et je raccroche pour de bon. »")
    }
    if (gift.asleep && gift.loot !== "frenzy") lines.push(ASLEEP_LINE)
    // Vols 1-2 : Cendreville est sa seule planque. Ensuite, le mot ne dit plus rien de la cachette (Sartay : « Rien »).
    lines.push(gift.theftNo <= 2 ? "*Il n'a pas pu aller bien loin : fouille Cendreville et retrouve-le.*" : "*Pas un mot sur sa cachette. À toi de le retrouver.*")
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
/** Victoire : le Daemon revient TEL QUEL. `theftNo` = n° du vol résolu ; au 3e, de faux adieux ; au 9e, il raccroche pour de bon. */
export function thiefWinLines(theftNo: number, victimName: string, placed: "team" | "pc"): string[] {
    const back = placed === "team" ? `${victimName} retrouve ton équipe.` : `Ton équipe est au complet : ${victimName} t'attend dans la boîte PC.`
    if (theftNo >= THIEF_MAX_THEFTS) return [
        "« Neuf fois… tu m'as eu neuf fois. Cette fois, je raccroche pour de vrai. Adieu, dresseur, et merci pour les souvenirs. »",
        `*${back}*`,
    ]
    if (theftNo === THIEF_FAKE_FAREWELL) return [
        "« Trois fois… tu m'as eu trois fois. Je raccroche. Adieu, dresseur : tu ne me reverras plus. »",
        `*${back}*`,
    ]
    if (theftNo === 6) return ["« Six fois… Tu es plus coriace que prévu. Mais je n'ai pas dit mon dernier mot. »", `*${back}*`]
    return ["« D'accord, d'accord, reprends-le ! On se reverra, l'ami… »", `*${back}*`]
}

// ── Butins en action : des lignes du JOURNAL DE COMBAT (jamais une fenêtre d'après-combat, qui écraserait celle d'ACE, du sbire,
//    d'un duel ou de la Pierre Gékroc — revue du 31/10/2026) ──
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`
/** Ouverture d'un combat offert (vol 8). `left` = combats gratuits restants, celui-ci compris. */
export function thiefFreeFightStartLine(left: number): string {
    return `🥷 COUPS GRATUITS du Voleur : tes attaques coûtent 0⚡ dans ce combat. Il te reste ${plural(left, "combat")} gratuit${left > 1 ? "s" : ""}, celui-ci compris : il n'est décompté qu'à ta première attaque.`
}
/** Après un combat sauvage gagné, un pansement a servi (vol 6). */
export function thiefHealUsedLine(left: number): string {
    return `🩹 Les pansements du Voleur soignent tes Daemons encore debout. ${left > 0 ? `Encore ${plural(left, "soin")}.` : "C'était le dernier."}`
}
/** Le renfort vient d'arriver par le MINITEL du Voleur (vol 7) : `left` = appels qui resteront après ce combat. */
export function thiefMinitelUsedLine(left: number): string {
    return `📟 Le MINITEL du Voleur a servi. ${left > 0 ? `Encore ${plural(left, "appel")}.` : "C'était le dernier appel."}`
}
/** Une capture garantie du Voleur a servi (vol 5). */
export function thiefCatchUsedLine(left: number): string {
    return left > 0 ? `🎯 Captures garanties du Voleur : encore ${plural(left, "capture")}.` : "🎯 C'était ta dernière capture garantie du Voleur."
}
/** Le premier shiny capturé éteint la Frénésie du Voleur (vol 9). */
export const THIEF_FRENZY_CAUGHT_LINE = "🥷 « Et voilà ton shiny ! Le charme est rompu : les sauvages retrouvent leurs couleurs habituelles. »"
