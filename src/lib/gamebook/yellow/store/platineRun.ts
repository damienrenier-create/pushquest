// src/lib/gamebook/yellow/store/platineRun.ts
//
// PALIER PLATINE — ÉTAT D'UN PARCOURS DE COULOIR. La salle du trône est UNE SEULE carte réutilisée : c'est donc
// un COMPTEUR D'ÉTAPE qui décide de l'adversaire qu'on y trouve.
//
// La séquence est toujours :   ACE  →  chaque salle de champion  →  le MAÎTRE en titre (s'il y en a un)
// Si personne ne tient encore le trône, le couloir s'arrête après les champions : le joueur devient le PREMIER
// Maître Ultime.
//
// ON TRAVERSE D'UNE TRAITE — mais le parcours SURVIT À UN RECHARGEMENT (choix Sartay). Quitter la salle par la
// gauche abandonne toujours la tentative, et tomber au combat aussi : c'est ce qui donne sa valeur au trône.
// En revanche un onglet tué (PWA mobile) n'est pas un abandon. Le combat, lui, était déjà reprenable : sans
// parcours persisté, on reprenait le combat contre le Maître à l'ÉTAPE 0 — on le battait sans être sacré, puis
// la porte renvoyait sur ACE. Le parcours est donc miroité en localStorage, et n'est restauré QUE si le couloir
// rendu par le serveur est le MÊME (signature) : si le trône a changé de main entre-temps, on repart de zéro.
//
// Le couloir lui-même vient du SERVEUR (route platine-throne) : on le dépose ici une fois à l'entrée, puis
// gameStore le lit SYNCHRONEMENT au moment de lancer chaque combat.

import type { PlatineChampion } from "../data/platineArena"
import type { FusionChampionMon } from "../storage/save"
import { emptyLedger, type PlatineLedger } from "../data/platineLedger"
import { PLATINE_RUN_LS_KEY, PLATINE_CLAIM_LS_KEY } from "../storage/sessionKeys"

/** Le Maître en titre, tel que le renvoie la route. */
export interface PlatineThroneHolder {
    userId: string
    nickname: string
    points: number
    sinceAt: string
    reignDays: number
    team: FusionChampionMon[]
    avatar?: string
}

/** Ce qu'on trouve dans la salle à une étape donnée. */
export type PlatineOpponent =
    | { kind: "ace"; label: string; avatar?: string }
    | { kind: "room"; label: string; avatar?: string; champion: PlatineChampion }
    | { kind: "throne"; label: string; avatar?: string; holder: PlatineThroneHolder }

let rooms: PlatineChampion[] = []
let holder: PlatineThroneHolder | null = null
let loaded = false
let step = 0
/** L'adversaire de l'ÉTAPE COURANTE est-il vaincu ? C'est lui qui DÉVERROUILLE la porte droite : on bat, puis
 *  on franchit la porte, et c'est le franchissement qui fait apparaître le suivant. Sans ce drapeau, la porte
 *  n'aurait aucun rôle (le PNJ changerait tout seul dans le dos du joueur). */
let beaten = false
let ledger: PlatineLedger = emptyLedger()

// ─────────── MIROIR LOCALSTORAGE (anti-rechargement) ───────────

interface PersistedRun { v: 1; sig: string; step: number; beaten: boolean; ledger: PlatineLedger }

/** SIGNATURE du couloir : qui on affronte, dans quel ordre, et depuis quand. Elle change dès qu'un champion
 *  s'ajoute ou que le trône passe de main — auquel cas un parcours sauvegardé ne veut plus rien dire et on
 *  repart d'ACE. C'est la garde qui empêche de restaurer une étape dans un couloir qui n'est plus le même. */
function corridorSignature(rs: readonly PlatineChampion[], h: PlatineThroneHolder | null): string {
    const r = rs.map((c) => `${c.userId}@${c.wonAt}`).join(",")
    return `${r}|${h ? `${h.userId}@${h.sinceAt}` : "-"}`
}

/** Écrit le parcours courant. Fail-safe (quota, mode privé, SSR) : perdre le miroir n'est jamais fatal. */
function writeRun(): void {
    if (typeof window === "undefined" || !loaded) return
    const payload: PersistedRun = { v: 1, sig: corridorSignature(rooms, holder), step, beaten, ledger }
    try { window.localStorage.setItem(PLATINE_RUN_LS_KEY, JSON.stringify(payload)) } catch { /* ignoré */ }
}

/** Lit le parcours sauvegardé. Défensif : un payload abîmé vaut « pas de parcours », jamais une exception. */
function readRun(): PersistedRun | null {
    if (typeof window === "undefined") return null
    try {
        const raw = window.localStorage.getItem(PLATINE_RUN_LS_KEY)
        if (!raw) return null
        const o = JSON.parse(raw) as Partial<PersistedRun>
        if (o.v !== 1 || typeof o.sig !== "string" || typeof o.step !== "number") return null
        return {
            v: 1, sig: o.sig,
            step: Math.max(0, Math.floor(o.step)),
            beaten: o.beaten === true,
            ledger: o.ledger && typeof o.ledger === "object" ? o.ledger : emptyLedger(),
        }
    } catch { return null }
}

/** Efface le miroir. Réservé aux VRAIES fins de parcours : abandon, défaite, sacre. */
function clearRun(): void {
    if (typeof window === "undefined") return
    try { window.localStorage.removeItem(PLATINE_RUN_LS_KEY) } catch { /* ignoré */ }
}

/** Dépose le couloir récupéré au serveur (à l'entrée de la salle). Remet le parcours à zéro. */
export function setPlatineCorridor(nextRooms: PlatineChampion[], nextHolder: PlatineThroneHolder | null): void {
    rooms = [...nextRooms]
    holder = nextHolder
    loaded = true
    step = 0
    beaten = false
    ledger = emptyLedger()
    // REPRISE : on ne restaure que si le couloir est BIT POUR BIT le même (mêmes salles, même tenant, même
    //   date de règne) ET que l'étape sauvegardée existe encore. Sinon on efface : mieux vaut refaire le
    //   couloir que de se retrouver à affronter quelqu'un d'autre que celui que le compteur annonce.
    const saved = readRun()
    if (saved && saved.sig === corridorSignature(rooms, holder) && saved.step < platineTotalSteps()) {
        step = saved.step
        beaten = saved.beaten
        ledger = saved.ledger
    } else if (saved) {
        clearRun()
    }
    writeRun()
}

/** Le couloir a-t-il été chargé ? Sert à afficher un message plutôt que de lancer un combat dans le vide. */
export function isPlatineCorridorLoaded(): boolean { return loaded }

/** Les salles du couloir (hors ACE et hors trône). */
export function getPlatineRooms(): PlatineChampion[] { return rooms }

/** Le Maître en titre, ou null si le trône est vacant (personne n'a encore réussi). */
export function getPlatineHolder(): PlatineThroneHolder | null { return holder }

/** Nombre TOTAL d'adversaires du couloir : ACE + les salles + éventuellement le Maître. */
export function platineTotalSteps(): number {
    return 1 + rooms.length + (holder ? 1 : 0)
}

/** Étape courante (0 = ACE). */
export function getPlatineStep(): number { return step }

/** L'adversaire de l'étape courante, ou null si le couloir est terminé (→ sacre). */
export function currentPlatineOpponent(): PlatineOpponent | null {
    if (!loaded) return null
    if (step === 0) return { kind: "ace", label: "ACE" }
    const roomIdx = step - 1
    if (roomIdx < rooms.length) {
        const c = rooms[roomIdx]
        return { kind: "room", label: c.nickname, avatar: c.avatar, champion: c }
    }
    if (holder && roomIdx === rooms.length) return { kind: "throne", label: holder.nickname, avatar: holder.avatar, holder }
    return null
}

/** VICTOIRE dans la salle : on NE change PAS encore d'adversaire — on déverrouille la porte. */
export function markPlatineOpponentBeaten(): void { beaten = true; writeRun() }
/** L'adversaire du moment est-il tombé ? (= la porte droite est-elle ouverte ?) */
export function isPlatineOpponentBeaten(): boolean { return beaten }
/** FRANCHISSEMENT de la porte : c'est LÀ que le suivant prend place dans la salle. */
export function advancePlatineStep(): void { step += 1; beaten = false; writeRun() }

/** L'adversaire du moment est-il le DERNIER du couloir ? Le battre déclenche le sacre : on ne fait pas franchir
 *  une porte de plus pour trouver une salle vide. */
export function isPlatineFinalStep(): boolean {
    return loaded && step === platineTotalSteps() - 1
}

/** Le couloir est-il TERMINÉ ? (plus aucun adversaire → le joueur prend la chaise) */
export function isPlatineCorridorCleared(): boolean {
    return loaded && currentPlatineOpponent() === null
}

/** Le registre des meilleurs coups du parcours (matière du générique). */
export function getPlatineLedger(): PlatineLedger { return ledger }
export function setPlatineLedger(next: PlatineLedger): void { ledger = next; writeRun() }

/** Oublie le parcours EN MÉMOIRE seulement. ⚠️ N'efface PAS le miroir : ce reset est aussi appelé au montage
 *  du hook (avant l'hydratation, la carte courante n'est pas encore la salle du trône) — l'effacer là
 *  détruirait le parcours à chaque chargement de page, c'est-à-dire précisément le cas qu'on veut sauver. */
export function resetPlatineRun(): void {
    rooms = []
    holder = null
    loaded = false
    step = 0
    beaten = false
    ledger = emptyLedger()
}

/** SACRE : le couloir est bouclé. On efface le miroir (il n'y a plus rien à reprendre) mais on GARDE l'état
 *  en mémoire — le joueur est encore dans la salle, et le PNJ doit pouvoir finir de s'afficher proprement. */
export function clearPlatineRunMirror(): void { clearRun() }

/** VRAIE fin de parcours — abandon par la porte gauche, défaite, ou sacre. Oublie tout, miroir compris :
 *  au prochain passage on repart d'ACE. C'est ce qui garde l'échec réel. */
export function abandonPlatineRun(): void {
    resetPlatineRun()
    clearRun()
}

// ─────────── REMONTÉE AU SERVEUR ───────────
// Best-effort et JAMAIS bloquant : un réseau muet ne doit pas gâcher une victoire ni figer un écran de fin.
// Le serveur refait de toute façon les vérifications qui comptent (identité, anti-auto-crédit, unicité du trône).

const THRONE_API = "/api/gamebook/yellow/platine-throne"

interface PendingClaim { v: 1; team: FusionChampionMon[]; avatar?: string; at: string }

/** Met le sacre de côté pour le rejouer au prochain chargement. */
function queueClaim(team: FusionChampionMon[], avatar?: string): void {
    if (typeof window === "undefined") return
    const payload: PendingClaim = { v: 1, team: team.slice(0, 6), avatar, at: new Date().toISOString() }
    try { window.localStorage.setItem(PLATINE_CLAIM_LS_KEY, JSON.stringify(payload)) } catch { /* ignoré */ }
}
function dropQueuedClaim(): void {
    if (typeof window === "undefined") return
    try { window.localStorage.removeItem(PLATINE_CLAIM_LS_KEY) } catch { /* ignoré */ }
}

/** Y a-t-il un sacre non encore gravé ? L'écran de sacre s'en sert pour le dire au joueur plutôt que de le
 *  laisser croire qu'il est Maître alors que le serveur n'a rien reçu. */
export function hasPendingPlatineClaim(): boolean {
    if (typeof window === "undefined") return false
    try { return !!window.localStorage.getItem(PLATINE_CLAIM_LS_KEY) } catch { return false }
}

/** Envoie un sacre et dit s'il a été GRAVÉ. La réponse est RELUE : la route renvoie désormais un vrai échec
 *  (500/503) quand elle n'a rien pu écrire — l'avaler laissait le joueur croire qu'il régnait. */
async function postClaim(team: FusionChampionMon[], avatar?: string): Promise<boolean> {
    try {
        const r = await fetch(THRONE_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "claim", team: team.slice(0, 6), avatar }),
        })
        if (!r.ok) return false
        const j = await r.json()
        return j?.ok === true
    } catch { return false }
}

/** SACRE : le joueur a traversé tout le couloir → il prend la place, avec son équipe figée et son skin.
 *  UNE retentative immédiate (un hoquet de Neon dure rarement deux appels), puis mise en file. */
export function reportPlatineClaim(team: FusionChampionMon[], avatar?: string): void {
    queueClaim(team, avatar) // posé D'ABORD : si l'onglet meurt pendant l'envoi, le sacre survit quand même
    void (async () => {
        if (await postClaim(team, avatar)) { dropQueuedClaim(); return }
        if (await postClaim(team, avatar)) { dropQueuedClaim(); return }
        // Toujours rien : le sacre reste en file, rejoué au prochain chargement (cf. flushPendingPlatineClaim).
    })()
}

/** À appeler AU CHARGEMENT du jeu : rejoue un sacre resté en carafe. No-op s'il n'y en a pas. */
export async function flushPendingPlatineClaim(): Promise<boolean> {
    if (typeof window === "undefined") return false
    let raw: string | null = null
    try { raw = window.localStorage.getItem(PLATINE_CLAIM_LS_KEY) } catch { return false }
    if (!raw) return false
    let p: PendingClaim
    try { p = JSON.parse(raw) } catch { dropQueuedClaim(); return false }
    if (p?.v !== 1 || !Array.isArray(p.team) || p.team.length === 0) { dropQueuedClaim(); return false }
    if (await postClaim(p.team, p.avatar)) { dropQueuedClaim(); return true }
    return false // on garde la file : on retentera au prochain chargement
}

/** ÉCHEC : le challenger est tombé → le Maître en titre marque +1. Le serveur ignore l'auto-crédit. */
export function reportPlatineFail(): void {
    void fetch(THRONE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fail" }),
    }).catch(() => { /* best-effort */ })
}
