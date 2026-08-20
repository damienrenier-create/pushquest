// src/lib/gamebook/yellow/data/avatars.ts
//
// FASHION VICTIM — PNJ excentrique de la Grotte du Nexus (1F) qui propose au joueur de CHANGER D'AVATAR.
// L'avatar choisi est PARTAGÉ (rendu local + présence temps réel → les autres joueurs qui te croisent le voient),
// réutilisant l'infra `PLAYER_GEN3_SPRITE` existante. Planches Gen3 760×160 (comme les PNJ/potes).

/** EX-SKINS de potes (jadis hardcodés dans PLAYER_GEN3_SPRITE) versés au POOL + reproposés à leur ancien porteur (slot 2). */
export const EX_PLAYER_SKINS: Record<string, string> = {
    task1: "/yellow/sprites/npc_task1_gen3.png",
    franss: "/yellow/sprites/npc_franss_gen3.png",
    embi: "/yellow/sprites/npc_embi_gen3.png",
}
/** Les avatars sélectionnables : 75 planches Sprite Forge de Sartay + les ex-skins de potes. Pool ROLL / catalogue / offre. */
export const FASHION_AVATARS: string[] = [
    ...Array.from({ length: 75 }, (_, i) => `/yellow/sprites/avatar_${i + 1}_gen3.png`),
    ...Object.values(EX_PLAYER_SKINS),
]

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
/** Clé de jour (entier) à partir d'un timestamp ms → change à minuit UTC. (Legacy : plus utilisée pour l'offre.) */
export function fashionDayKey(nowMs: number): number { return Math.floor(nowMs / 86_400_000) }
/** Graine ALÉATOIRE tirée à CHAQUE VISITE chez la Fashion Victim (≠ tirage du jour identique pour tous). Chaque
 *  passage propose donc des skins DIFFÉRENTS → variété entre joueurs (sinon tout le monde finit avec le même skin,
 *  pas drôle). Runtime only (Math.random) ; les fonctions d'offre restent PURES/déterministes pour une graine donnée. */
export function randomFashionSeed(): number { return Math.floor(Math.random() * 0x1_0000_0000) >>> 0 }
/** Les 5 tenues du JOUR (déterministe par `dayKey`) — mélange Fisher-Yates seedé, puis on prend les 5 premières. */
export function dailyFashionOffer(dayKey: number): string[] {
    const rnd = mulberry32(dayKey >>> 0)
    const pool = [...FASHION_AVATARS]
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
    return pool.slice(0, FASHION_DAILY_COUNT)
}
/** Offre PERSONNELLE : le tirage du jour, mais si le joueur a un EX-SKIN (ancien pote hardcodé), on le lui remet en
 *  2e place (slot index 1) pour qu'il puisse le racheter. Sinon = tirage normal. */
export function personalFashionOffer(dayKey: number, nickname: string): string[] {
    const base = dailyFashionOffer(dayKey)
    const ex = EX_PLAYER_SKINS[(nickname ?? "").trim().toLowerCase()]
    if (ex && !base.includes(ex)) { const o = [...base]; o[1] = ex; return o }
    return base
}
/** Après le GAG (canne offerte), la Fashion Victim arbore SA planche « relookée » fixe (elle a changé de skin, pas toi). */
export const FASHION_POST_GAG_SPRITE = "/yellow/sprites/fashionvictim_6_gen3.png"

/** Coût (reps) pour REVENIR AU LOOK PAR DÉFAUT, selon le nb de reverts déjà faits (puis le dernier). Fort déterrent
 *  → le joueur garde son skin. Entrer chez la FV force déjà la 1re tenue (50 reps), donc revenir en arrière coûte cher. */
export const FASHION_REVERT_COSTS = [2000, 200, 20] as const
export function fashionRevertCost(revertsDone: number): number {
    return FASHION_REVERT_COSTS[Math.min(Math.max(0, revertsDone), FASHION_REVERT_COSTS.length - 1)]
}
/** Préfixe des marqueurs (defeatedTrainers) comptant les reverts — persiste SANS nouveau champ de save. */
export const FASHION_REVERT_MARKER = "fashion_revert_"

/** Un avatar est-il VALIDE ? Garde-fou : la présence est éphémère/non-fiable (payload d'un autre client) → on ne rend
 *  jamais un chemin arbitraire, seulement une BASE connue (la teinte n'est que des nombres, sans risque). */
export function isValidAvatar(p?: string | null): p is string {
    return typeof p === "string" && FASHION_AVATARS.includes(avatarSheet(p))
}

export const FASHION_VICTIM_NPC_ID = "y_fashion_victim"
/** La Fashion Victim vit désormais à VILLE JAUNE (couloir sud), visible par TOUT LE MONDE (fini la whitelist + les pops Grotte/Zone de Combat). */
export const FASHION_VICTIM_MAP = "yellow_entrance"

/** OUVERT À TOUS désormais (whitelist Mools levée). Conservé pour compat d'appel. */
export function fashionVictimVisibleFor(_nickname: string): boolean { return true }
/** Pseudos à « déflaguer » : leur chosenAvatar est réinitialisé à la 1re interaction FV → ils refont l'onboarding
 *  (tenue forcée + gag + canne) comme au 1er jour. Marqueur one-time (defeatedTrainers). */
export const FV_RESET_NICKS = new Set(["mools"])
export const FV_RESET_MARKER = "fv_reset_done"

/** Spots walkable de VILLE JAUNE (couloir sable sud, cols 22-25, où l'on arrive du sud). ⚠️ placement à vérifier en jeu. */
export const FASHION_SPOTS: ReadonlyArray<readonly [number, number]> = [
    [22, 36], [23, 36], [24, 36], [25, 36], [22, 37], [24, 37],
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
