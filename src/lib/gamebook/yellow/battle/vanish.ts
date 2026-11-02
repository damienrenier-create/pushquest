// src/lib/gamebook/yellow/battle/vanish.ts
//
// RANCŒUR CÉLESTE (signature de Namizeus, décision Sartay du 01/11/2026) — constantes, prédicats et TEXTES. Module PUR
// (aucun import du moteur) : lu par engine.ts, ai.ts, le store et l'écran de combat. Le mécanisme vit dans engine.ts
// (performMove → castVanish / endVanish).
//
// RÈGLES : lancement 90 % (jet PLAT, sur soi : ni esquive ni invulnérabilité adverse) → le lanceur DISPARAÎT 1 à 5 tours
// (sprite masqué) : INTOUCHABLE, seul un coup sûr (Météores) le touche ; les attaques que l'adversaire lance SUR LUI-MÊME
// marchent (Repos, Danse-Lames, concentration de Mitra-Poing… : cf. targetsFoe, Sartay 01/11/2026) ; chaque action choisie
// pendant ce temps n'aboutit qu'une fois sur deux (raté : énergie dépensée quand même). À la fin : SOMMEIL (même tirage
// qu'un sommeil infligé, écrase le statut comme Repos) + TOUS ses PV. Le rappel y met fin, sans soin.
// JOUEUR : sans limite. ORDINATEUR : jamais plus de 2 lancers d'affilée (série du CAMP : elle passe au Daemon entrant), et le
// soin final compte dans ses 3 régénérations (déjà consommées → l'orage retombe sans soin ni sommeil).

import type { BattleMon, MoveData, MoveEffect } from "./types"

/** Durée de la disparition, tirée UNIFORMÉMENT au lancement = nombre de tours où le Daemon choisit une action caché. */
export const VANISH_TURNS_MIN = 1
export const VANISH_TURNS_MAX = 5
/** Chance (%) qu'une action choisie pendant la disparition aboutisse (sinon : action perdue, énergie dépensée). */
export const VANISH_ACT_PCT = 50
/** L'ORDINATEUR ne la lance jamais plus de N fois d'affilée (les actions faites caché ne comptent pas ; la série est celle du
 *  camp ennemi et suit le Daemon actif, cf. engine doSwitch). */
export const AI_VANISH_MAX_STREAK = 2

/** Ce Daemon est-il DISPARU (intouchable, n'agit qu'une fois sur deux) ? */
export function isVanished(m: Pick<BattleMon, "vanishTurns"> | null | undefined): boolean {
    return (m?.vanishTurns ?? 0) > 0
}

/** Ce move est-il Rancœur Céleste (ou tout futur move portant l'effet) ? Clé = l'EFFET, jamais l'espèce (fusions). */
export function isVanishMove(mv: Pick<MoveData, "effect"> | null | undefined): boolean {
    return !!mv?.effect?.vanish
}

/** Effets qui ne touchent QUE le lanceur (ou son camp). Un move de STATUT fait uniquement de ceux-là marche même contre une
 *  cible invisible : Repos, Danse-Lames, Mur de Fer, Mirage, Machination, Aromathérapie, Cristallisation… */
const SELF_ONLY_EFFECTS: ReadonlySet<string> = new Set(["chance", "healPct", "restSleep", "selfVolatile", "healTeamStatus", "statChanges", "vanish"])

/** Ce move, CE tour, VISE-t-il l'adversaire (→ il manque une cible invisible, sous terre ou en vol, sauf coup sûr) ? NON pour
 *  (Sartay, 01/11/2026 ; même règle pour Rancœur Céleste et pour Tunnel/Vol) :
 *  - un statut SUR SOI (tous ses effets touchent le lanceur : soin, Repos, hausses de stats sur soi, carapace…) ;
 *  - la PHASE 1 d'un move en deux tours qui ne frappe pas encore : concentration (Mitra-Poing), creuser (Tunnel), s'envoler
 *    (Vol), absorber la lumière (Lance-Soleil). `releasing` = le lanceur libère sa charge (phase 2) : ce coup-là vise l'adversaire.
 *  Tout autre effet (statut infligé, stat adverse, dégâts fixes, vol de boosts, Brume Sporale…) vise l'adversaire. */
export function targetsFoe(mv: MoveData, releasing: boolean): boolean {
    const fx = mv.effect
    if (!releasing && (fx?.focusCharge || fx?.dig || fx?.fly || fx?.solarCharge)) return false
    if (mv.power > 0) return true
    if (!fx) return false // ne fait rien (« Mais rien ne se passe… ») : rien à manquer
    return Object.entries(fx).some(([k, v]) => v !== undefined && (!SELF_ONLY_EFFECTS.has(k)
        || (k === "statChanges" && ((v as MoveEffect["statChanges"]) ?? []).some((c) => c.target !== "self"))))
}

/** Garde-fou ORDINATEUR : peut-il la lancer maintenant ? Pas déjà disparu, moins de 2 lancers d'affilée et (camp plafonné)
 *  une régénération encore disponible (cf. data/healCap). */
export function aiMayCastVanish(m: Pick<BattleMon, "vanishTurns" | "vanishCastStreak">, healLeft = true): boolean {
    return !isVanished(m) && (m.vanishCastStreak ?? 0) < AI_VANISH_MAX_STREAK && healLeft
}

/** Messages de combat (moteur + store). */
export const VANISH_LINES = {
    cast: (n: string) => `${n} se dissout dans l'orage : il devient intouchable !`,
    castFail: (n: string) => `${n} appelle la rancœur du ciel… mais l'orage ne répond pas !`,
    castSpent: (n: string) => `${n} est à bout de forces : l'orage ne répond plus !`,
    passThrough: (n: string) => `${n} est invisible : l'attaque traverse l'orage sans le toucher !`,
    reappear: (n: string) => `${n} surgit de l'orage !`,
    reappearFail: (n: string, move: string) => `${n} tente de surgir pour lancer ${move}… mais l'orage le retient !`,
    alreadyVanished: (n: string, move: string) => `${n} est déjà dans l'orage : ${move} ne fait rien de plus.`,
    stormEnds: (n: string) => `L'orage retombe : ${n} réapparaît !`,
    fullHeal: (n: string) => `${n} récupère tous ses PV !`,
    healSpent: (n: string) => `${n} est à bout de forces : il n'arrive plus à récupérer !`,
    fallsAsleep: (n: string) => `${n} s'endort, épuisé !`,
    ballThrough: (n: string) => `La Ball traverse l'orage sans rien accrocher : ${n} est invisible !`,
    ballRefused: (n: string, ball: string) => `${n} est invisible : impossible de viser ! Ta ${ball} reste dans ton sac.`,
    recastRefused: (n: string) => `${n} est déjà invisible : relancer Rancœur Céleste ne servirait à rien !`,
} as const

/** Textes de l'écran de combat. */
export const VANISH_UI = {
    infoTag: "INVISIBLE",
    menuLocked: "déjà invisible",
    ballRowHint: "cible invisible",
    menuSelf: "👻 Invisible : 1 chance sur 2 de surgir pour agir. Raté, l'énergie part quand même.",
    menuSelfFree: "👻 Invisible : 1 chance sur 2 de surgir pour agir.",
    menuFoe: "👻 Cible invisible : cette attaque la manquera.",
    menuFoeSure: "✓ Ne rate jamais : touche même une cible invisible.",
    menuFoeCharge: "👻 Cible invisible : la préparation marche, mais le coup la manquera si elle l'est encore.",
} as const
