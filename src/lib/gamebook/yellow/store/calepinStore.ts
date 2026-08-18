// src/lib/gamebook/yellow/store/calepinStore.ts
//
// LE CALEPIN — carnet d'astuces du joueur. Donné par ACE à la 1re défaite ; consigne les conseils reçus (panneaux du
//   parc), dans l'ordre, avec des notes perso. Stocké en localStorage PAR COMPTE → suit le joueur de A à Z (n'est PAS
//   effacé par un reset de run/chapitre, contrairement à la save). Purement local (pas de serveur).

export interface Calepin { owned: boolean; tips: string[]; notes: Record<string, string> }
const EMPTY: Calepin = { owned: false, tips: [], notes: {} }
const key = (userId: string) => `yellow_calepin_${userId || "anon"}`

function read(userId: string): Calepin {
    if (typeof window === "undefined") return { ...EMPTY }
    try {
        const raw = window.localStorage.getItem(key(userId))
        if (!raw) return { ...EMPTY }
        const o = JSON.parse(raw)
        return { owned: !!o?.owned, tips: Array.isArray(o?.tips) ? o.tips.filter((t: unknown) => typeof t === "string") : [], notes: o?.notes && typeof o.notes === "object" ? o.notes : {} }
    } catch { return { ...EMPTY } }
}
function write(userId: string, c: Calepin) {
    if (typeof window === "undefined") return
    try { window.localStorage.setItem(key(userId), JSON.stringify(c)) } catch { /* quota/private mode → ignore */ }
}

export function getCalepin(userId: string): Calepin { return read(userId) }
export function calepinOwned(userId: string): boolean { return read(userId).owned }

/** ACE remet le calepin (1re défaite). Idempotent : ne le redonne pas s'il est déjà là. Renvoie true si NOUVEAU. */
export function grantCalepin(userId: string): boolean {
    const c = read(userId)
    if (c.owned) return false
    write(userId, { ...c, owned: true })
    return true
}

/** Consigne une astuce reçue (ordre chronologique, sans doublon). Enregistre même avant l'obtention du calepin (le
 *  carnet révélera rétroactivement ce qu'on a déjà lu). */
export function recordCalepinTip(userId: string, tipId: string) {
    if (!tipId) return
    const c = read(userId)
    if (c.tips.includes(tipId)) return
    write(userId, { ...c, tips: [...c.tips, tipId] })
}

export function setCalepinNote(userId: string, tipId: string, note: string) {
    const c = read(userId)
    const notes = { ...c.notes }
    if (note.trim()) notes[tipId] = note.slice(0, 300); else delete notes[tipId]
    write(userId, { ...c, notes })
}
