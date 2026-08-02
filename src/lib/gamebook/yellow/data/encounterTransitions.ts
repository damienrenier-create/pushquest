// src/lib/gamebook/yellow/data/encounterTransitions.ts
//
// Nexus Jaune Éclair — TRANSITIONS DE RENCONTRE (data-driven, React/CSS).
// 8 profils mappés aux types/raretés ; 3 variantes (subtle/normal/epic) ;
// le composant <EncounterTransition> lit ces profils et joue l'anim CSS.

export type EtxKind = "wipe" | "wave" | "circle" | "fold" | "glitch"
export type EtxMotion = "fall" | "rise" | "scatter" | "drift"

export interface EtxProfile {
    id: string
    kind: EtxKind
    durationMs: number
    palette: [string, string]
    particle: { emoji: string; count: number; motion: EtxMotion }
    easing: string
    sfx: string            // note de sound design (à brancher plus tard)
    bloom?: boolean
    shake?: boolean
    vignette?: boolean
    rays?: boolean
    zoom?: boolean
    flash?: boolean
}

export const ETX_PROFILES: Record<string, EtxProfile> = {
    leaf_slide: {
        id: "leaf_slide", kind: "wipe", durationMs: 700, palette: ["#9ACD32", "#2E8B57"],
        particle: { emoji: "🍃", count: 8, motion: "fall" }, easing: "cubic-bezier(.25,.46,.45,.94)",
        sfx: "whoosh doux + bruissement de feuilles",
    },
    tide_wash: {
        id: "tide_wash", kind: "wave", durationMs: 800, palette: ["#7AD7F0", "#1C6FB0"],
        particle: { emoji: "💧", count: 10, motion: "fall" }, easing: "cubic-bezier(.37,0,.63,1)",
        sfx: "vague qui déferle + goutte", bloom: true,
    },
    ember_burst: {
        id: "ember_burst", kind: "circle", durationMs: 700, palette: ["#FFD24A", "#E0502A"],
        particle: { emoji: "🔥", count: 12, motion: "rise" }, easing: "cubic-bezier(.22,.61,.36,1)",
        sfx: "crépitement + souffle chaud", bloom: true, flash: true,
    },
    static_glitch: {
        id: "static_glitch", kind: "glitch", durationMs: 600, palette: ["#FFF27A", "#3A8EE0"],
        particle: { emoji: "⚡", count: 8, motion: "scatter" }, easing: "steps(6)",
        sfx: "bzzt électrique sec", flash: true,
    },
    stone_shatter: {
        id: "stone_shatter", kind: "circle", durationMs: 750, palette: ["#C9B27A", "#5E4A2A"],
        particle: { emoji: "🪨", count: 10, motion: "scatter" }, easing: "cubic-bezier(.7,0,.84,0)",
        sfx: "impact sourd + gravats", shake: true,
    },
    spectral_fold: {
        id: "spectral_fold", kind: "fold", durationMs: 1000, palette: ["#7A5AD0", "#1A0F2E"],
        particle: { emoji: "🌀", count: 7, motion: "drift" }, easing: "cubic-bezier(.65,0,.35,1)",
        sfx: "drone inquiétant", bloom: true,
    },
    frost_bloom: {
        id: "frost_bloom", kind: "circle", durationMs: 900, palette: ["#CFF6FF", "#2FB8C0"],
        particle: { emoji: "❄️", count: 10, motion: "fall" }, easing: "cubic-bezier(.34,1.56,.64,1)",
        sfx: "tintement cristallin", vignette: true, bloom: true,
    },
    nemesis_iris: {
        id: "nemesis_iris", kind: "circle", durationMs: 1200, palette: ["#1C1408", "#F5D020"],
        particle: { emoji: "✨", count: 14, motion: "scatter" }, easing: "cubic-bezier(.83,0,.17,1)",
        sfx: "grondement + sting cuivré", bloom: true, shake: true, rays: true, zoom: true, flash: true,
    },
    // Intro SPÉCIALE Ligue de Fusion : nettement plus LONGUE (≈ durationMs×epic+450 ≈ 3,8 s) — solennelle, thème
    //   chimère mauve/or. Sert aussi de marge de sécurité pendant que les sprites de fusion finissent de se générer.
    //   Reste SKIPPABLE (B/Échap) et respecte prefers-reduced-motion (cf. EncounterTransition).
    fusion_league: {
        id: "fusion_league", kind: "fold", durationMs: 2600, palette: ["#2A1C50", "#C79CFF"],
        particle: { emoji: "🧬", count: 16, motion: "drift" }, easing: "cubic-bezier(.83,0,.17,1)",
        sfx: "montée épique + double battement de cœur + chœur", bloom: true, shake: true, rays: true, zoom: true, flash: true,
    },
    // ── Profils type-cohérents (corrigent les incohérences : COMBAT/NORMAL n'ont plus de cailloux, etc.) ──
    combat_strike: {
        id: "combat_strike", kind: "circle", durationMs: 750, palette: ["#FF8A4A", "#B02000"],
        particle: { emoji: "🥊", count: 9, motion: "scatter" }, easing: "cubic-bezier(.7,0,.84,0)",
        sfx: "impact de poing sec", shake: true,
    },
    normal_pop: {
        id: "normal_pop", kind: "circle", durationMs: 700, palette: ["#EDEDED", "#9AA0A6"],
        particle: { emoji: "⭐", count: 8, motion: "scatter" }, easing: "cubic-bezier(.34,1.4,.64,1)",
        sfx: "pop léger + scintillement",
    },
    venom_haze: {
        id: "venom_haze", kind: "fold", durationMs: 800, palette: ["#B05AD0", "#3A1A4A"],
        particle: { emoji: "☠️", count: 9, motion: "drift" }, easing: "cubic-bezier(.37,0,.63,1)",
        sfx: "bulles toxiques", bloom: true,
    },
    gale_sweep: {
        id: "gale_sweep", kind: "wipe", durationMs: 750, palette: ["#BFE3FF", "#5A8FD0"],
        particle: { emoji: "🕊️", count: 9, motion: "drift" }, easing: "cubic-bezier(.25,.46,.45,.94)",
        sfx: "rafale d'ailes",
    },
}

/** type (1er) → profil. Tous les 15 types couverts. */
export const TYPE_PROFILE: Record<string, string> = {
    PLANTE: "leaf_slide", INSECTE: "leaf_slide",
    EAU: "tide_wash",
    FEU: "ember_burst",
    ELEC: "static_glitch",
    ROCHE: "stone_shatter", SOL: "stone_shatter",
    COMBAT: "combat_strike", NORMAL: "normal_pop", VOL: "gale_sweep", POISON: "venom_haze",
    SPECTRE: "spectral_fold", PSY: "spectral_fold",
    GLACE: "frost_bloom",
    DRAGON: "nemesis_iris",
}

export type EtxVariant = "subtle" | "normal" | "epic"
export const ETX_VARIANTS: Record<EtxVariant, { durationScale: number; particleScale: number; bloom: boolean; shake: boolean; sparkle: boolean }> = {
    subtle: { durationScale: 0.6, particleScale: 0.5, bloom: false, shake: false, sparkle: false },
    normal: { durationScale: 1.0, particleScale: 1.0, bloom: false, shake: false, sparkle: false },
    epic: { durationScale: 1.3, particleScale: 2.0, bloom: true, shake: true, sparkle: true },
}

export interface EncounterData { type?: string; rarity?: string; levelDiff?: number; isSpecial?: boolean; fusionLeague?: boolean }

/** Choisit profil + variante + flag "danger" selon les flags de la rencontre. */
export function pickTransition(d: EncounterData): { profile: EtxProfile; variant: EtxVariant; danger: boolean } {
    const lvlDiff = d.levelDiff ?? 0
    let profileId: string
    let variant: EtxVariant
    if (d.fusionLeague) {
        profileId = "fusion_league"; variant = "epic" // intro solennelle + plus longue, prioritaire
    } else if (d.isSpecial || d.rarity === "BOSS" || d.rarity === "LEGENDARY") {
        profileId = "nemesis_iris"; variant = "epic"
    } else {
        profileId = (d.type && TYPE_PROFILE[d.type]) || "stone_shatter"
        variant = (d.rarity === "RARE" || d.rarity === "VERY_RARE") ? "epic" : "normal"
    }
    return { profile: ETX_PROFILES[profileId] ?? ETX_PROFILES.stone_shatter, variant, danger: lvlDiff > 3 }
}
