// src/lib/gamebook/yellow/data/pcBoxes.ts
//
// PC — BOÎTES DU JOUEUR (projet de Zyran, demandé le 25/10/2026 : « créer une ou plusieurs sous-boîtes dans lesquelles
// nous pourrions classer nos Daemons par type ou, mieux, par EV »). Module PUR et sans dépendance : save.ts l'importe,
// donc aussi la route serveur de la save — ne JAMAIS y importer les données d'espèces.
//
// Stockage : UN champ de save PAR MONDE, `pcBoxes = { boxes, of }` (of : uid du Daemon → id de sa boîte). AUCUNE donnée de
// boîte sur le Daemon lui-même : rien ne voyage avec un échange, l'étal ou l'Espion, et ranger un Daemon n'écrit jamais
// `team` ni `pc` (on ne peut ni perdre ni dupliquer un Daemon en rangeant). Absent = aucune boîte : tout est « Non rangés ».

export interface PcBox { id: string; name: string }
export interface PcBoxes { boxes: PcBox[]; of: Record<string, string> }

/** Boîtes qu'un joueur peut CRÉER dans un monde. */
export const PC_BOX_MAX = 12
/** Longueur max d'un nom de boîte (en caractères, un émoji compte pour un). */
export const PC_BOX_NAME_MAX = 14
/** Borne de lecture et de fusion : 3 mondes fusionnés × 12, plus de la marge. */
export const PC_BOX_PARSE_MAX = 40
/** Borne du nombre de Daemons rangés lus par monde. */
export const PC_BOX_OF_MAX = 3000

// Ids générés par newPcBoxId ("bx…") : le préfixe évite toute confusion avec les vues réservées « all » et « none ».
const BOX_ID_RE = /^bx[A-Za-z0-9_-]{1,30}$/
// Caractères de contrôle et invisibles retirés des noms (C0/C1, espaces de largeur nulle, marques et isolats de direction,
// BOM). Le ZWJ (U+200D) est gardé : il compose les émojis.
const NAME_STRIP_RE = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** Nom propre : sans caractère invisible, espaces compactés, au plus PC_BOX_NAME_MAX caractères (jamais un émoji coupé). */
export function cleanBoxName(raw: unknown): string {
    if (typeof raw !== "string") return ""
    const s = raw.replace(NAME_STRIP_RE, "").replace(/\s+/g, " ").trim()
    return Array.from(s).slice(0, PC_BOX_NAME_MAX).join("").trim()
}

/** Clé de comparaison des noms : « Ligue », « ligue » et « LIGUÉ » désignent la même boîte. */
export function boxNameKey(name: string): string {
    return name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Nouvel id de boîte : "bx" + horodatage + 4 caractères aléatoires (base 36). */
export function newPcBoxId(now: number, rnd: () => number): string {
    let tail = ""
    for (let i = 0; i < 4; i++) tail += Math.min(35, Math.floor(Math.max(0, rnd()) * 36)).toString(36)
    return `bx${Math.max(0, Math.floor(now)).toString(36)}${tail}`
}

/** Uids VIVANTS d'un monde : son équipe, son PC et le Daemon que le Voleur détient (il reviendra dans sa boîte). */
export function pcLiveUids(team: readonly { uid?: unknown }[], pc: readonly { uid?: unknown }[], stolenUid?: unknown): Set<string> {
    const s = new Set<string>()
    for (const m of [...team, ...pc]) if (typeof m?.uid === "string" && m.uid) s.add(m.uid)
    if (typeof stolenUid === "string" && stolenUid) s.add(stolenUid)
    return s
}

/** Lecture DÉFENSIVE (client et serveur) : n'importe quelle valeur → boîtes valides ou `undefined`. Ne garde que les
 *  rangements d'un Daemon vivant vers une boîte qui existe. Idempotente. */
export function parsePcBoxes(raw: unknown, live: ReadonlySet<string>): PcBoxes | undefined {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
    const o = raw as { boxes?: unknown; of?: unknown }
    if (!Array.isArray(o.boxes)) return undefined
    const boxes: PcBox[] = []
    const ids = new Set<string>()
    for (const b of o.boxes) {
        if (boxes.length >= PC_BOX_PARSE_MAX) break
        if (!b || typeof b !== "object") continue
        const id = (b as { id?: unknown }).id
        if (typeof id !== "string" || !BOX_ID_RE.test(id) || ids.has(id)) continue
        ids.add(id)
        boxes.push({ id, name: cleanBoxName((b as { name?: unknown }).name) || `Boîte ${boxes.length + 1}` })
    }
    if (!boxes.length) return undefined
    const of: [string, string][] = []
    if (o.of && typeof o.of === "object" && !Array.isArray(o.of)) {
        for (const [uid, bid] of Object.entries(o.of as Record<string, unknown>)) {
            if (of.length >= PC_BOX_OF_MAX) break
            if (typeof bid === "string" && ids.has(bid) && live.has(uid)) of.push([uid, bid])
        }
    }
    return { boxes, of: Object.fromEntries(of) }
}

/** Boîte d'un Daemon, ou null s'il n'est pas rangé (« Non rangés »). */
export function boxOf(pb: PcBoxes | undefined, uid: string): string | null {
    if (!pb || !has(pb.of, uid)) return null
    const id = pb.of[uid]
    return pb.boxes.some((b) => b.id === id) ? id : null
}

/** Retire les rangements des Daemons qui ne sont plus là (relâchés, échangés). Même objet si rien ne change. */
export function prunePcBoxes(pb: PcBoxes | undefined, live: ReadonlySet<string>): PcBoxes | undefined {
    if (!pb) return pb
    const kept = Object.entries(pb.of).filter(([uid]) => live.has(uid))
    return kept.length === Object.keys(pb.of).length ? pb : { boxes: pb.boxes, of: Object.fromEntries(kept) }
}

/** Crée une boîte. Nom vide → la première « Boîte N » libre. Refus : 12 boîtes déjà, nom déjà pris (casse et accents
 *  ignorés), ou id invalide / déjà utilisé (l'appelant retente avec un autre id). */
export function createBox(pb: PcBoxes | undefined, id: string, rawName: unknown):
    { ok: true; pb: PcBoxes; id: string; name: string } | { ok: false; reason: "max" | "taken" | "id" } {
    const boxes = pb?.boxes ?? []
    if (boxes.length >= PC_BOX_MAX) return { ok: false, reason: "max" }
    if (!BOX_ID_RE.test(id) || boxes.some((b) => b.id === id)) return { ok: false, reason: "id" }
    const taken = (n: string) => boxes.some((b) => boxNameKey(b.name) === boxNameKey(n))
    let name = cleanBoxName(rawName)
    if (!name) { let n = 1; while (taken(`Boîte ${n}`)) n++; name = `Boîte ${n}` }
    else if (taken(name)) return { ok: false, reason: "taken" }
    return { ok: true, pb: { boxes: [...boxes, { id, name }], of: pb?.of ?? {} }, id, name }
}

/** Renomme une boîte. Refus : boîte introuvable, nom vide, ou nom déjà porté par une AUTRE boîte. */
export function renameBox(pb: PcBoxes | undefined, id: string, rawName: unknown):
    { ok: true; pb: PcBoxes; name: string } | { ok: false; reason: "introuvable" | "vide" | "taken" } {
    if (!pb || !pb.boxes.some((b) => b.id === id)) return { ok: false, reason: "introuvable" }
    const name = cleanBoxName(rawName)
    if (!name) return { ok: false, reason: "vide" }
    if (pb.boxes.some((b) => b.id !== id && boxNameKey(b.name) === boxNameKey(name))) return { ok: false, reason: "taken" }
    return { ok: true, pb: { boxes: pb.boxes.map((b) => (b.id === id ? { ...b, name } : b)), of: pb.of }, name }
}

/** Supprime une boîte : ses Daemons retournent dans « Non rangés » (AUCUN n'est relâché). Plus aucune boîte → undefined. */
export function deleteBox(pb: PcBoxes | undefined, id: string): { pb: PcBoxes | undefined; removed: number } {
    if (!pb || !pb.boxes.some((b) => b.id === id)) return { pb, removed: 0 }
    const boxes = pb.boxes.filter((b) => b.id !== id)
    const kept = Object.entries(pb.of).filter(([, bid]) => bid !== id)
    const removed = Object.keys(pb.of).length - kept.length
    return { pb: boxes.length ? { boxes, of: Object.fromEntries(kept) } : undefined, removed }
}

/** Range des Daemons dans une boîte (`null` = les sortir : « Non rangés »). Un Daemon n'est que dans UNE boîte : le ranger
 *  ailleurs le déplace. Boîte inconnue → rien ne change (même objet, 0). */
export function assignBox(pb: PcBoxes | undefined, uids: readonly string[], boxId: string | null): { pb: PcBoxes | undefined; changed: number } {
    if (!pb) return { pb, changed: 0 }
    if (boxId !== null && !pb.boxes.some((b) => b.id === boxId)) return { pb, changed: 0 }
    const of = new Map(Object.entries(pb.of))
    let changed = 0
    for (const uid of uids) {
        if (typeof uid !== "string" || !uid) continue
        const cur = of.get(uid)
        if (boxId === null) { if (cur !== undefined) { of.delete(uid); changed++ } }
        else if (cur !== boxId && (cur !== undefined || of.size < PC_BOX_OF_MAX)) { of.set(uid, boxId); changed++ }
    }
    return changed ? { pb: { boxes: pb.boxes, of: Object.fromEntries(of) }, changed } : { pb, changed: 0 }
}

/** ONGLET RESTÉ SUR UNE VERSION D'AVANT LES BOÎTES (route serveur de la save) : il ne connaît pas `pcBoxes` et les effacerait
 *  à chaque sauvegarde. On remet alors, monde par monde, les boîtes déjà stockées, relues contre les Daemons reçus. Un monde
 *  qui arrive AVEC des boîtes n'est pas touché. Renvoie true si des boîtes ont été remises. */
interface PcBoxesWorld { team: readonly { uid?: unknown }[]; pc: readonly { uid?: unknown }[]; pcBoxes?: PcBoxes; thief?: { stolen?: { uid?: unknown } | null } | null }
export function keepPcBoxesFromStored(stored: unknown, save: PcBoxesWorld & { ngplusWorld?: PcBoxesWorld | null; run3World?: PcBoxesWorld | null }): boolean {
    if (!stored || typeof stored !== "object") return false
    const s = stored as { ngplusWorld?: unknown; run3World?: unknown }
    let changed = false
    const carry = (from: unknown, to: PcBoxesWorld | null | undefined) => {
        if (!to || to.pcBoxes || !from || typeof from !== "object") return
        const pb = parsePcBoxes((from as { pcBoxes?: unknown }).pcBoxes, pcLiveUids(to.team, to.pc, (to.thief ?? save.thief)?.stolen?.uid))
        if (pb) { to.pcBoxes = pb; changed = true }
    }
    carry(stored, save)
    carry(s.ngplusWorld, save.ngplusWorld)
    carry(s.run3World, save.run3World)
    return changed
}

/** FUSION DE FIN DE RUN (mergeWorlds) : les boîtes du monde absorbé rejoignent celles du monde gardé. Même id ou même nom
 *  → une seule boîte (celle du monde gardé). Les Daemons absorbés changent d'uid : `remap` = [ancien uid, nouvel uid].
 *  Au-delà de PC_BOX_PARSE_MAX boîtes, les boîtes en trop sont abandonnées et leurs Daemons arrivent dans « Non rangés ». */
export function mergePcBoxes(primary: PcBoxes | undefined, secondary: PcBoxes | undefined, remap: ReadonlyArray<readonly [string, string]>): PcBoxes | undefined {
    if (!secondary) return primary
    const boxes: PcBox[] = primary ? [...primary.boxes] : []
    const idMap = new Map<string, string>() // id de boîte du monde absorbé → id final
    for (const b of secondary.boxes) {
        const same = boxes.find((p) => p.id === b.id) ?? boxes.find((p) => boxNameKey(p.name) === boxNameKey(b.name))
        if (same) { idMap.set(b.id, same.id); continue }
        if (boxes.length >= PC_BOX_PARSE_MAX) continue
        boxes.push(b); idMap.set(b.id, b.id)
    }
    const of = new Map<string, string>(primary ? Object.entries(primary.of) : [])
    for (const [oldUid, newUid] of remap) {
        if (!has(secondary.of, oldUid)) continue
        const target = idMap.get(secondary.of[oldUid])
        if (target && of.size < PC_BOX_OF_MAX) of.set(newUid, target)
    }
    return boxes.length ? { boxes, of: Object.fromEntries(of) } : undefined
}
