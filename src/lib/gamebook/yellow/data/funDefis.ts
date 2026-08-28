// src/lib/gamebook/yellow/data/funDefis.ts
//
// DÉFIS FUN (mode "fun", run 1) — REMPLACENT l'encodage muscu. 3 défis chronométrés qui créditent de l'énergie :
//   • ARÈNE : battre une arène (de A à Z) dans l'heure → 100/150/200/250/300⚡ (par n° d'arène).
//   • SPRINT : capturer N espèces DIFFÉRENTES en 10 min → 50×N⚡. Échelle N qui NE se réinitialise JAMAIS (3,4,5…).
//   • CIBLE DU JOUR : capturer LE Pokémon du jour (zone = dernière arène battue) dans l'heure → 20-100⚡ selon sa rareté.
// Complétion AUTOMATIQUE (hooks combat : badge / capture) tant que le défi est actif et dans sa fenêtre. Un seul défi
// actif à la fois. État groupé dans player.funDefis (save yellow JSON, aucune migration). Cf. la cible du jour :
// funDailyTarget() dans data/encounters.ts (accès aux pools + seed déterministe).

export type FunDefiKind = "arena" | "sprint" | "daily"

/** Défi fun EN COURS (chrono). */
export interface FunActiveDefi {
    kind: FunDefiKind
    /** Instant limite (ms epoch) : au-delà = expiré. */
    deadline: number
    /** SPRINT : nb d'espèces à capturer ; ARÈNE/CIBLE : 1. */
    target: number
    /** ARÈNE : nb de badges au LANCEMENT (pour détecter la nouvelle conquête). Sinon 0. */
    baseline: number
    /** SPRINT : espèces DISTINCTES capturées depuis le lancement. */
    caught: string[]
}

export interface FunDefisState {
    /** SPRINT : objectif courant N (démarre à 3, +1 par réussite, JAMAIS remis à zéro). */
    ladder: number
    /** CIBLE DU JOUR : jour (=creditedThrough) de la cible en cours. */
    dailyDate: string
    /** CIBLE DU JOUR : espèce visée + reps qu'elle rapporte (figés au tirage du jour). */
    dailySpecies: string
    dailyReps: number
    /** CIBLE DU JOUR : déjà réussie aujourd'hui ? */
    dailyDone: boolean
    /** Défi chronométré actif (un seul), ou null. */
    active: FunActiveDefi | null
}

export function emptyFunDefis(): FunDefisState {
    return { ladder: 3, dailyDate: "", dailySpecies: "", dailyReps: 0, dailyDone: false, active: null }
}

/** Parse défensif (comme parseLabDefi) — tolère toute vieille save. */
export function parseFunDefis(o: unknown): FunDefisState {
    const s = (o && typeof o === "object" ? o : {}) as Record<string, unknown>
    const a = (s.active && typeof s.active === "object" ? s.active : null) as Record<string, unknown> | null
    const kind = a && (a.kind === "arena" || a.kind === "sprint" || a.kind === "daily") ? (a.kind as FunDefiKind) : null
    return {
        ladder: typeof s.ladder === "number" ? Math.max(3, Math.floor(s.ladder)) : 3,
        dailyDate: typeof s.dailyDate === "string" ? s.dailyDate : "",
        dailySpecies: typeof s.dailySpecies === "string" ? s.dailySpecies : "",
        dailyReps: typeof s.dailyReps === "number" ? Math.max(0, Math.floor(s.dailyReps)) : 0,
        dailyDone: s.dailyDone === true,
        active: kind ? {
            kind,
            deadline: typeof a!.deadline === "number" ? Math.max(0, Math.floor(a!.deadline as number)) : 0,
            target: typeof a!.target === "number" ? Math.max(1, Math.floor(a!.target as number)) : 1,
            baseline: typeof a!.baseline === "number" ? Math.max(0, Math.floor(a!.baseline as number)) : 0,
            caught: Array.isArray(a!.caught) ? (a!.caught as unknown[]).filter((x): x is string => typeof x === "string") : [],
        } : null,
    }
}

// ── Fenêtres de temps ─────────────────────────────────────────────────────────────────────────────────────────
export const FUN_ARENA_WINDOW_MS = 60 * 60 * 1000    // 1 h
export const FUN_SPRINT_WINDOW_MS = 10 * 60 * 1000   // 10 min
export const FUN_DAILY_WINDOW_MS = 60 * 60 * 1000    // 1 h

// ── Récompenses (chiffres Sartay) ─────────────────────────────────────────────────────────────────────────────
/** ARÈNE : 100 (1re) → 300 (5e). `badgeCount` = nb de badges APRÈS la victoire (1..5). */
export function funArenaReward(badgeCount: number): number { return 50 + 50 * Math.max(1, Math.min(5, badgeCount)) }
/** SPRINT : 50 × N (N = objectif de la manche). */
export function funSprintReward(n: number): number { return 50 * Math.max(1, n) }
// CIBLE DU JOUR : la récompense (20-100 selon rareté) est figée dans dailyReps au tirage (cf. encounters.funDailyTarget).

/** ZONES ACCESSIBLES pour la « cible du jour » (union) : plus le joueur progresse, plus le pool s'élargit.
 *  Grotte←plante, Grotte Gelée←roche, Plage+Centrale←feu (Cendreville atteinte), Hautes Herbes←elec,
 *  Maison Hantée←un des 2 boss Aqua battu (y_aqua_boss_a/b). Route Nord = toujours (départ). */
export function funDailyZones(badges: readonly string[], defeatedTrainers: readonly string[]): string[] {
    const z = ["yellow_route_nord"]
    if (badges.includes("plante")) z.push("yellow_grotte")
    if (badges.includes("roche")) z.push("yellow_grotte_gelee")
    if (badges.includes("feu")) { z.push("yellow_plage"); z.push("yellow_centrale") }
    if (badges.includes("elec") || badges.includes("eau")) z.push("yellow_hautes_herbes")
    if (defeatedTrainers.includes("y_aqua_boss_a") || defeatedTrainers.includes("y_aqua_boss_b")) z.push("yellow_maison_hantee")
    return z
}

/** true si le défi actif est encore dans sa fenêtre. */
export function funInWindow(a: FunActiveDefi | null, now: number): boolean { return !!a && now <= a.deadline }
