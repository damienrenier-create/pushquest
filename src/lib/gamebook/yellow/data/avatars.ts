// src/lib/gamebook/yellow/data/avatars.ts
//
// FASHION VICTIM — PNJ excentrique de la Grotte du Nexus (1F) qui propose au joueur de CHANGER D'AVATAR.
// L'avatar choisi est PARTAGÉ (rendu local + présence temps réel → les autres joueurs qui te croisent le voient),
// réutilisant l'infra `PLAYER_GEN3_SPRITE` existante. Planches Gen3 760×160 (comme les PNJ/potes).

/** Les 75 avatars (planches Gen3 « Sprite Forge », fournies par Sartay). Pool tiré par le ROLL / catalogue complet. */
export const FASHION_AVATARS: string[] = Array.from({ length: 75 }, (_, i) => `/yellow/sprites/avatar_${i + 1}_gen3.png`)

/** Les 6 « looks » que le PNJ Fashion Victim arbore lui-même (tirés au hasard à chaque pop). */
export const FASHION_VICTIM_SPRITES: string[] = Array.from({ length: 6 }, (_, i) => `/yellow/sprites/fashionvictim_${i + 1}_gen3.png`)

/** PERSONNALISATION : un avatar peut porter une TEINTE encodée « base#h,s,b » (h° 0-360, s/b multiplicateurs).
 *  Rendu par un simple `filter` CSS sur le sprite (aucun canvas) → marche sur la carte ET via la présence.
 *  Sans fragment « # » = préréglage brut. La BASE doit toujours être l'une des planches connues (garde-fou présence). */
export function avatarSheet(p: string): string { return p.split("#")[0] }
/** Filtre CSS d'une teinte encodée (ou "" si pas de teinte / valeurs invalides). */
export function avatarFilter(p?: string | null): string {
    if (typeof p !== "string") return ""
    const frag = p.split("#")[1]
    if (!frag) return ""
    const [h, s, b] = frag.split(",").map(Number)
    if (![h, s, b].every((n) => Number.isFinite(n))) return ""
    return `hue-rotate(${Math.round(h)}deg) saturate(${Math.max(0, s)}) brightness(${Math.max(0, b)})`
}
/** Encode base + teinte → « base#h,s,b ». */
export function encodeAvatar(base: string, h: number, s: number, b: number): string {
    return `${base}#${Math.round(((h % 360) + 360) % 360)},${s.toFixed(2)},${b.toFixed(2)}`
}
/** Tire une teinte au hasard (bouton ROLL) — teinte pleine, saturation/luminosité dans des bornes lisibles. */
export function rollAvatarTint(rnd: () => number): { h: number; s: number; b: number } {
    return { h: Math.floor(rnd() * 360), s: +(0.7 + rnd() * 1.0).toFixed(2), b: +(0.85 + rnd() * 0.4).toFixed(2) }
}
/** Décode la teinte d'un avatar encodé (défauts neutres h=0 s=1 b=1 si pas de fragment). Pour l'éditeur. */
export function parseAvatarTint(p?: string | null): { h: number; s: number; b: number } {
    const frag = typeof p === "string" ? p.split("#")[1] : undefined
    if (!frag) return { h: 0, s: 1, b: 1 }
    const [h, s, b] = frag.split(",").map(Number)
    return { h: Number.isFinite(h) ? h : 0, s: Number.isFinite(s) ? s : 1, b: Number.isFinite(b) ? b : 1 }
}

// ═══════════════ ÉCONOMIE (en REPS — les Jetons de Combat n'existent qu'en post-run-3) ═══════════════
/** Prix (reps) pour ADOPTER une tenue du TIRAGE DU JOUR, par rang (1re à 5e). */
export const FASHION_PRICES = [50, 100, 200, 300, 400] as const
/** Prix (reps) pour piocher N'IMPORTE QUELLE planche du catalogue complet. */
export const FASHION_CATALOG_PRICE = 1000
export const FASHION_DAILY_COUNT = 5

// Mulberry32 (PRNG déterministe, comme les PNJ) → tirage du jour STABLE et identique pour tous, tourne chaque jour.
function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}
/** Clé de jour (entier) à partir d'un timestamp ms → change à minuit UTC. */
export function fashionDayKey(nowMs: number): number { return Math.floor(nowMs / 86_400_000) }
/** Les 5 tenues du JOUR (déterministe par `dayKey`) — mélange Fisher-Yates seedé, puis on prend les 5 premières. */
export function dailyFashionOffer(dayKey: number): string[] {
    const rnd = mulberry32(dayKey >>> 0)
    const pool = [...FASHION_AVATARS]
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
    return pool.slice(0, FASHION_DAILY_COUNT)
}
/** Après le GAG (canne offerte), la Fashion Victim arbore SA planche « relookée » fixe (elle a changé de skin, pas toi). */
export const FASHION_POST_GAG_SPRITE = "/yellow/sprites/fashionvictim_6_gen3.png"

/** Un avatar est-il VALIDE ? Garde-fou : la présence est éphémère/non-fiable (payload d'un autre client) → on ne rend
 *  jamais un chemin arbitraire, seulement une BASE connue (la teinte n'est que des nombres, sans risque). */
export function isValidAvatar(p?: string | null): p is string {
    return typeof p === "string" && FASHION_AVATARS.includes(avatarSheet(p))
}

export const FASHION_VICTIM_NPC_ID = "y_fashion_victim"
export const FASHION_VICTIM_MAP = "yellow_grotte_nexus"
/** 2ᵉ apparition (même whitelist Mools) : hub ZONE DE COMBAT, spot fixe choisi par Sartay. */
export const FASHION_VICTIM_MAP_2 = "yellow_zone_combat"
export const FASHION_VICTIM_SPOT_2: readonly [number, number] = [16, 10]

/** Pseudos (en minuscule) autorisés à voir le PNJ « pour le moment » (Mools). Extensible → ouvrir à tous plus tard. */
export const FASHION_VICTIM_WHITELIST = new Set(["mools"])
export function fashionVictimVisibleFor(nickname: string): boolean {
    return FASHION_VICTIM_WHITELIST.has((nickname ?? "").normalize("NFC").trim().toLowerCase())
}

/** Spots walkable de la Grotte 1F (près de l'entrée 18,39). ⚠️ à vérifier en jeu (placement approximatif). */
export const FASHION_SPOTS: ReadonlyArray<readonly [number, number]> = [
    [18, 38], [18, 37], [17, 39], [19, 39], [18, 36], [17, 38],
]

export const FASHION_VICTIM_LINES = [
    "*Un personnage excentrique t'accoste — il change de tenue à chaque clignement d'œil.*",
    "« Oh là là, CHÉRI… ce look ! Enfin… ce NON-look. On ne peut PAS te laisser te balader comme ça. »",
    "« Laisse la Fashion Victim s'occuper de toi : un nouveau look, un VRAI. Et crois-moi — TOUT LE MONDE le verra. »",
]

/** GAG du 1er achat de skin (1×/run) : tu gardes TA tenue, elle te vanne, c'est ELLE qui se relooke, se vante… puis
 *  t'offre la CANNE À PÊCHE. Séquence RALLONGÉE et NON-SKIPPABLE (petite pause/ligne) pour appuyer le cadeau. */
export const FASHION_ROD_GIFT_LINES = [
    "*La Fashion Victim recule d'un pas, une main sur la bouche, l'autre sur le cœur.*",
    "« ... »",
    "« Non. NON. Chéri… tu as VRAIMENT choisi ÇA ? Avec l'argent de tes reps ?! »",
    "« *pouffe* Haha— pardon, pardon ! Tiens, regarde comment on porte VRAIMENT une pièce. »",
    "*Elle claque des doigts. En un éclair, c'est ELLE qui change de tenue — plus flashy, plus léchée.*",
    "« Voilà. TU vois la différence ? Avoue : ça me va quand même carrément mieux à MOI. »",
    "« Mais garde le tien, va, garde-le ! Franchement avec ça tu SLAYES… un vrai look de cheur-pé ! »",
    "« Un cheur-pé, un PÊ-CHEUR, tu piges ? Haha ! Bon. Puisque tu tiens le rôle à fond… »",
    "*Elle fouille dans un sac hors de proportion et en sort un objet long, fuselé, qui brille.*",
    "« TIENS. Une CANNE À PÊCHE. Une VRAIE. Regarde-moi bien : TRÈS peu de dresseurs en possèdent une. »",
    "« Ne la perds JAMAIS. C'est un cadeau en or, chéri — tu me remercieras la première fois qu'un truc mordra. »",
    "*Tu reçois la CANNE À PÊCHE ! 🎣 (Sac → Pêche.) Utilise-la face à un plan d'eau. Un sacré cadeau — prends-en soin !*",
]
