// src/lib/gamebook/yellow/storage/saveGuard.ts
//
// GARDE-FOU ANTI-ÉCRASEMENT (perte de save). Un autosave d'une session « fraîche » (nouvel appareil,
// cache vidé, nouvelle partie) peut POSTer une save VIERGE par-dessus un compte AVANCÉ → perte totale.
// Ce module PUR décide, à chaque sauvegarde, si l'écriture entrante est : OK · une RÉGRESSION (on garde
// une copie de sécurité avant d'écrire) · ou DESTRUCTIVE (vierge par-dessus un compte plein → on REFUSE
// et on sauvegarde l'ancien). Philosophie : jamais d'écrasement destructif sans trace, et on BLOQUE
// l'accident au lieu de le « rendre récupérable ». 100 % testable, zéro dépendance.

/** Combien de copies de sécurité on garde dans `history` (audit + annulation). */
export const MAX_HISTORY = 12

export interface SaveMarkers { team: number; badges: number; caught: number; maxLevel: number; champion: boolean }

/** Extrait les marqueurs de progression d'une save (robuste au contenu inconnu/partiel). */
export function saveMarkers(flags: unknown): SaveMarkers {
    const f = (flags && typeof flags === "object" ? flags : {}) as {
        team?: Array<{ level?: number }>; badges?: unknown[]; pokedex?: { caught?: unknown[] }; isChampion?: boolean
    }
    const team = Array.isArray(f.team) ? f.team : []
    return {
        team: team.length,
        badges: Array.isArray(f.badges) ? f.badges.length : 0,
        caught: Array.isArray(f.pokedex?.caught) ? f.pokedex!.caught!.length : 0,
        maxLevel: team.reduce((mx, m) => Math.max(mx, typeof m?.level === "number" ? m.level : 0), 0),
        champion: f.isChampion === true,
    }
}

/** Une save « mérite d'être protégée » (progression réelle) ? */
export function isMeaningful(m: SaveMarkers): boolean {
    return m.badges >= 1 || m.caught >= 5 || m.maxLevel >= 12 || m.team >= 2 || m.champion
}
/** Une save entrante ressemble-t-elle à une NOUVELLE PARTIE (vierge) ? */
export function isFreshStart(m: SaveMarkers): boolean {
    return m.badges === 0 && m.caught <= 1 && m.team <= 1 && m.maxLevel <= 6 && !m.champion
}

export type Verdict = "ok" | "regression" | "destructive"

/**
 * Décide du sort d'un écrasement `current → incoming` :
 *  • "destructive" : le compte serveur est PLEIN et l'entrant est VIERGE → accident quasi certain (à REFUSER).
 *  • "regression"  : l'entrant a MOINS que le serveur (badges/pokédex/champion perdus) sans être vierge →
 *                    on écrit mais on garde une copie de sécurité d'abord.
 *  • "ok"          : rien à protéger (nouveau joueur, ou progression égale/supérieure).
 */
export function classifyOverwrite(currentFlags: unknown, incomingFlags: unknown): Verdict {
    const cur = saveMarkers(currentFlags)
    if (!isMeaningful(cur)) return "ok" // rien à perdre côté serveur
    const inc = saveMarkers(incomingFlags)
    if (isFreshStart(inc)) return "destructive"
    const regressed = inc.badges < cur.badges || inc.caught + 3 < cur.caught || (cur.champion && !inc.champion)
    return regressed ? "regression" : "ok"
}

// ═══════════════════════ GARDE ANTI-TRICHE ÉNERGIE (reps) ═══════════════════════
// La save est CLIENTE-AUTORITAIRE → un joueur peut rejouer le POST avec un `reps` gonflé (exploit constaté).
// Principe : PLAFONNER + TRACER, JAMAIS refuser (un 409 sur une save honnête = perte de session = règle d'or #1).
//
// INVARIANT UNIVERSEL (tous modes) : `reps ≤ repsCap × 2`. En jeu, l'énergie est TOUJOURS bornée au cap dur
//   (grantReps/creditReps/bankReps/casino → Math.min(repsCap)), et le SEUL dépassement légitime vient du plafond
//   SOUPLE `grantRepsSoftCap` (≤ 2× cap, éphémère). Les cadeaux « hors-plafond » (anniversaire) RELÈVENT le cap
//   d'abord → reps reste ≤ cap. Donc plafonner reps à 2× le cap ne peut JAMAIS léser un joueur honnête.
export const ENERGY_SOFT_MULT = 2
/** Hausse de reps (sans relèvement de cap, au-dessus du cap dur) au-delà de laquelle on TRACE (sans plafonner) → visibilité créateur. */
export const ENERGY_AUDIT_GAIN = 8000

function repsOf(flags: unknown): { reps: number; repsCap: number } {
    const f = (flags && typeof flags === "object" ? flags : {}) as { reps?: unknown; repsCap?: unknown }
    return { reps: typeof f.reps === "number" ? f.reps : 0, repsCap: typeof f.repsCap === "number" ? f.repsCap : 0 }
}

/** Décide du sort de l'ÉNERGIE entrante. `clampedReps` != null → écrire cette valeur (plafonnée). `audit` != null →
 *  graver une trace dans `history`. Ne refuse JAMAIS. `prevFlags` = save serveur actuelle (null au 1er enregistrement). */
export function energyGuard(prevFlags: unknown, incFlags: unknown): { clampedReps: number | null; audit: string | null } {
    const prev = repsOf(prevFlags)
    const inc = repsOf(incFlags)
    // 1) PLAFOND DUR : reps > 2× cap = injection (impossible légitimement). On plafonne + trace.
    if (inc.repsCap > 0 && inc.reps > inc.repsCap * ENERGY_SOFT_MULT) {
        const clamped = Math.floor(inc.repsCap * ENERGY_SOFT_MULT)
        return { clampedReps: clamped, audit: `energy-clamp: reps ${inc.reps} > 2×cap(${inc.repsCap}) → plafonné à ${clamped}` }
    }
    // 2) TRACE (pas de plafond) : grosse hausse SANS relèvement du cap et AU-DESSUS du cap dur → suspect
    //    (ex. reps injectés sous le plafond souple). On laisse passer mais on grave une trace pour revue manuelle.
    const gain = inc.reps - prev.reps
    if (gain > ENERGY_AUDIT_GAIN && inc.repsCap <= prev.repsCap && inc.reps > inc.repsCap) {
        return { clampedReps: null, audit: `energy-audit: +${gain} reps (${prev.reps}→${inc.reps}) sans hausse de cap (cap ${inc.repsCap}) — à vérifier` }
    }
    return { clampedReps: null, audit: null }
}

export interface BackupEntry { at: string; reason: string; flags: unknown }
/** Ajoute une copie de sécurité horodatée à l'historique (borné à MAX_HISTORY). */
export function appendBackup(history: unknown, flags: unknown, reason: string, at: string): BackupEntry[] {
    const prev = (Array.isArray(history) ? history : []) as BackupEntry[]
    return [...prev, { at, reason, flags }].slice(-MAX_HISTORY)
}
