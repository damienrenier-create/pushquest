// src/lib/gamebook/yellow/data/run3Feats.ts
//
// RUN 3 (le CONCOURS) — HAUTS FAITS « GUIDE ».
// ⚠️ Contrairement aux hauts faits run 1/2, ceux-ci ne rapportent NI énergie NI points : le run 3 a une
//    source d'énergie UNIQUE (les arènes) et se classe uniquement au SCORE. Ils servent PUREMENT de GUIDE —
//    ils montrent au joueur la voie du concours (arènes, donjons, légendaires, sacre). TOUJOURS affichés
//    (gris = pas encore atteint, coché = atteint), jamais secrets.
//
// Évaluation depuis l'état ACTIF (getPlayer() reflète run3World quand activeWorld==="run3"), pas depuis la
// save brute : caughtThisRun / badges / isChampion / ownedCts / domeChampionships sont tous per-monde run 3.

export interface Run3FeatInput {
    caughtThisRun: readonly string[]   // espèces capturées CE run (overlay dex run 3)
    badges: readonly string[]          // badges d'arène du run 3 (plante/roche/feu/elec/eau)
    isChampion: boolean                // sacre du concours (Ligue/Dieu Spaghetti battus)
    ownedCts: readonly string[]        // CT possédées (ct58 = récompense Maison du Combat)
    domeChampionships: number          // couronnes de la Zone de Combat (Dôme)
}

export interface Run3Feat {
    id: string
    label: string
    cat: string   // catégorie (réutilise CAT_ORDER du panel)
    emoji: string
    done: (i: Run3FeatInput) => boolean
}

const caught = (i: Run3FeatInput, id: string): boolean => i.caughtThisRun.includes(id)

/** Le guide du concours. Ordre = ordre d'affichage dans chaque catégorie. */
export const RUN3_FEATS: readonly Run3Feat[] = [
    // ── Le concours (progression) ──
    { id: "r3_start", cat: "progression", emoji: "🎬", label: "Lancer le concours (1ʳᵉ capture)", done: (i) => i.caughtThisRun.length >= 1 },
    { id: "r3_plante", cat: "progression", emoji: "🌿", label: "Vaincre l'arène Plante", done: (i) => i.badges.includes("plante") },
    { id: "r3_roche", cat: "progression", emoji: "🪨", label: "Vaincre l'arène Roche", done: (i) => i.badges.includes("roche") },
    { id: "r3_feu", cat: "progression", emoji: "🔥", label: "Vaincre l'arène Feu", done: (i) => i.badges.includes("feu") },
    { id: "r3_elec", cat: "progression", emoji: "⚡", label: "Vaincre l'arène Électrik", done: (i) => i.badges.includes("elec") },
    { id: "r3_eau", cat: "progression", emoji: "💧", label: "Vaincre l'arène Eau", done: (i) => i.badges.includes("eau") },
    { id: "r3_champion", cat: "progression", emoji: "👑", label: "Remporter le concours (sacre)", done: (i) => i.isChampion },

    // ── Donjons (exploration) ──
    { id: "r3_centrale", cat: "exploration", emoji: "🧠", label: "Centrale : capturer Karmaki", done: (i) => caught(i, "karmaki") },
    { id: "r3_maison_combat", cat: "exploration", emoji: "🥋", label: "Maison du Combat : décrocher Mitra-Poing (CT)", done: (i) => i.ownedCts.includes("ct58") },

    // ── Rencontres (légendaires & némésis) ──
    { id: "r3_flamarokto", cat: "rencontres", emoji: "❄️", label: "Capturer Flamarokto (le légendaire)", done: (i) => caught(i, "flamarokto") },
    { id: "r3_onirail", cat: "rencontres", emoji: "🎣", label: "Pêcher Onirail à Cendreville", done: (i) => caught(i, "onirail") },
    { id: "r3_nemesis", cat: "rencontres", emoji: "😈", label: "Vaincre ta némésis (Condombre ou Karatame)", done: (i) => caught(i, "condombre") || caught(i, "karatame") },

    // ── Collection du concours ──
    { id: "r3_dex10", cat: "collection", emoji: "📘", label: "Capturer 10 espèces du concours", done: (i) => i.caughtThisRun.length >= 10 },
    { id: "r3_dex30", cat: "collection", emoji: "📗", label: "Capturer 30 espèces du concours", done: (i) => i.caughtThisRun.length >= 30 },

    // ── Zone de Combat ──
    { id: "r3_dome", cat: "dome", emoji: "🏛️", label: "Décrocher une couronne à la Zone de Combat", done: (i) => i.domeChampionships >= 1 },
]

export interface Run3FeatState extends Run3Feat { earned: boolean }

/** Évalue le guide run 3 : chaque jalon avec son statut atteint/pas atteint. Aucun point, aucune reps. */
export function evaluateRun3Feats(i: Run3FeatInput): { feats: Run3FeatState[]; earnedCount: number } {
    const feats = RUN3_FEATS.map((f) => ({ ...f, earned: f.done(i) }))
    return { feats, earnedCount: feats.filter((f) => f.earned).length }
}
