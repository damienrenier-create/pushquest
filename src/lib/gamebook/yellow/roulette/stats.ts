// src/lib/gamebook/yellow/roulette/stats.ts
//
// Nexus — Roulette EU : tracker de STATISTIQUES en temps réel (pur, dérivé de l'historique).
// % de couleurs, numéros CHAUDS (fréquents) / FROIDS (les plus en retard), et les SÉRIES EN COURS
// (couleur / parité / manque-passe). `history[0]` = numéro le plus récent.

import { colorOf, type RouletteColor } from "./wheel"

export interface RouletteStats {
    spins: number
    colors: { red: number; black: number; green: number; redPct: number; blackPct: number; greenPct: number }
    /** Numéros les plus SORTIS (sur la fenêtre). */
    hot: Array<{ n: number; count: number }>
    /** Numéros les plus EN RETARD (gap depuis la dernière sortie ; = spins si jamais vu sur la fenêtre). */
    cold: Array<{ n: number; sinceSpins: number }>
    /** Séries EN COURS, lues depuis la tête de l'historique (0 = vert casse parité & manque/passe). */
    streaks: {
        color: { value: RouletteColor; len: number } | null
        parity: { value: "pair" | "impair"; len: number } | null
        range: { value: "manque" | "passe"; len: number } | null
    }
}

const ALL_NUMBERS = Array.from({ length: 37 }, (_, n) => n) // 0..36

/** Compte la série en tête tant que `key(n)` reste égale ET non-null. */
function headStreak<T>(history: number[], key: (n: number) => T | null): { value: T; len: number } | null {
    if (history.length === 0) return null
    const first = key(history[0])
    if (first === null) return null
    let len = 0
    for (const n of history) {
        if (key(n) === first) len++
        else break
    }
    return { value: first, len }
}

const parityOf = (n: number): "pair" | "impair" | null => (n === 0 ? null : n % 2 === 0 ? "pair" : "impair")
const rangeOf = (n: number): "manque" | "passe" | null => (n === 0 ? null : n <= 18 ? "manque" : "passe")

export function computeStats(history: number[], opts: { window?: number; topK?: number } = {}): RouletteStats {
    const topK = opts.topK ?? 4
    const win = opts.window ?? history.length
    const h = history.slice(0, win)
    const spins = h.length

    // Couleurs
    let red = 0, black = 0, green = 0
    for (const n of h) { const c = colorOf(n); if (c === "red") red++; else if (c === "black") black++; else green++ }
    const pct = (x: number) => (spins ? Math.round((x / spins) * 1000) / 10 : 0)

    // Fréquences + retard (gap depuis la dernière apparition)
    const count: Record<number, number> = {}
    const lastSeen: Record<number, number> = {}
    for (const n of ALL_NUMBERS) { count[n] = 0; lastSeen[n] = -1 }
    h.forEach((n, i) => { count[n]++; if (lastSeen[n] < 0) lastSeen[n] = i })

    const hot = [...ALL_NUMBERS]
        .sort((a, b) => count[b] - count[a] || a - b)
        .slice(0, topK)
        .map((n) => ({ n, count: count[n] }))

    const cold = [...ALL_NUMBERS]
        .map((n) => ({ n, sinceSpins: lastSeen[n] < 0 ? spins : lastSeen[n] }))
        .sort((a, b) => b.sinceSpins - a.sinceSpins || a.n - b.n)
        .slice(0, topK)

    return {
        spins,
        colors: { red, black, green, redPct: pct(red), blackPct: pct(black), greenPct: pct(green) },
        hot,
        cold,
        streaks: {
            color: headStreak(h, (n) => colorOf(n)),
            parity: headStreak(h, parityOf),
            range: headStreak(h, rangeOf),
        },
    }
}
