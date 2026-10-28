// src/lib/gamebook/yellow/data/genieLamp.ts
//
// Arc « La Lampe & le Génie » (Nexus Jaune) — constantes + helpers PURS partagés (React-free).
// Flow : embuscade (une rencontre sauvage devient un dresseur facile) → « vieille lampe rouillée » →
// frottement tactile → le génie apparaît → 3 vœux (zone de texte) → le créateur fixe une contrepartie
// par vœu → retour du génie (accepter/refuser). GLOBAL & automatique, UNE seule fois par joueur.

/** Dresseur-embuscade : lancé par CODE (swap depuis la rencontre sauvage), placé hors-carte pour éviter un hitbox overworld. */
export const GENIE_TRAINER_ID = "y_genie_ambush"
/** Objet remis à la victoire de l'embuscade. */
export const LAMP_ITEM_ID = "lampe_rouillee"
/** Marker (defeatedTrainers) posé quand la lampe est frottée → débloque l'onglet 🧞 (pas de nouveau champ de save). */
export const LAMP_RUBBED_MARKER = "lamp_rubbed"

/** Compteur avant embuscade : N COMBATS (rencontres sauvages) tiré dans [MIN, MAX], APRÈS le 2e badge (GENIE_MIN_BADGES).
 *  Choix créateur : entre 8 et 20 combats avant que la lampe puisse apparaître. */
export const LAMP_CD_MIN = 8
export const LAMP_CD_MAX = 20
/** L'embuscade ne se déclenche que si l'équipe est au-dessus de ce ratio de PV (fraîche → combat facile & juste). */
export const LAMP_HP_MIN_RATIO = 0.9
/** Plancher absolu du niveau du colporteur. */
export const GENIE_TRAINER_LEVEL_MIN = 3
/** Écart de niveau (cap) du colporteur SOUS la moyenne d'équipe, ÉCHELONNÉ : l'écart se creuse quand le joueur monte
 *  → reste « pas trop faible » tôt, « gagnable » tard. −2 (<20) · −3 (<40) · −4 (<60) · −5 (<80) · −6 (80+). */
export function genieTrainerDelta(refLevel: number): number {
    const l = Math.round(refLevel)
    return l < 20 ? 2 : l < 40 ? 3 : l < 60 ? 4 : l < 80 ? 5 : 6
}

/** Déploiement progressif de l'arc : GENIE_ARC_ALL=false → réservé à la liste blanche (test) ; true → TOUS les joueurs.
 *  L'embuscade (seul point d'amorçage) est gatée là-dessus → tout l'arc suit (lampe/génie/onglet n'existent qu'après). */
export const GENIE_ARC_ALL = true
export const GENIE_ARC_NICKS: readonly string[] = ["mools"]
export function genieArcEnabledFor(nickname?: string | null): boolean {
    if (GENIE_ARC_ALL) return true
    return !!nickname && GENIE_ARC_NICKS.includes(nickname.trim().toLowerCase())
}
/** Nb de badges d'arène requis AVANT que l'embuscade du génie puisse apparaître (« pas avant le 2e badge »). */
export const GENIE_MIN_BADGES = 2

/** Tire le compteur d'embuscade N ∈ [MIN, MAX]. `rng` optionnel (défaut Math.random). */
export function rollLampCountdown(rng: () => number = Math.random): number {
    return LAMP_CD_MIN + Math.floor(rng() * (LAMP_CD_MAX - LAMP_CD_MIN + 1))
}

/** Ratio de PV de l'équipe (Σ PV courants / Σ PV max). 0 si équipe vide / max nul. */
export function teamHpRatio(mons: ReadonlyArray<{ hp: number; maxHp: number }>): number {
    let cur = 0, max = 0
    for (const m of mons) { cur += Math.max(0, m.hp); max += Math.max(0, m.maxHp) }
    return max > 0 ? cur / max : 0
}

/** L'équipe est-elle assez fraîche pour déclencher l'embuscade ? (ratio de PV > LAMP_HP_MIN_RATIO) */
export function teamFreshEnough(mons: ReadonlyArray<{ hp: number; maxHp: number }>): boolean {
    return teamHpRatio(mons) > LAMP_HP_MIN_RATIO
}

/** Niveau du colporteur = MOYENNE d'équipe du joueur − écart échelonné (genieTrainerDelta), avec plancher. */
export function genieTrainerLevel(playerRefLevel: number): number {
    return Math.max(GENIE_TRAINER_LEVEL_MIN, Math.round(playerRefLevel) - genieTrainerDelta(playerRefLevel))
}

/** Phase de test (allowlist, GENIE_ARC_ALL=false) → l'embuscade pop dès la 1re rencontre sauvage (pas d'attente
 *  ni de garde PV). Une fois ouvert à tous (GENIE_ARC_ALL=true), on repasse au compteur N∈[3,10] + équipe fraîche. */
export function genieArcImmediate(): boolean {
    return !GENIE_ARC_ALL
}

/** Marqueur one-shot (dans defeatedTrainers) de l'effet du vœu `n` (1..3) pour un TOUR de vœux : tour 0 = « genie_fx<n> »
 *  (les 3 premiers vœux, inchangé), tour k ≥ 1 = « genie_fx<n>_r<k> ». Un nouveau tour accordé par le créateur ne bute donc
 *  jamais sur les marqueurs des vœux déjà exaucés (20/10/2026 : 2 nouveaux vœux pour Rob). */
export function genieFxMarker(n: number, round?: number | null): string {
    const r = Math.max(0, Math.floor(Number(round) || 0))
    return r > 0 ? `genie_fx${n}_r${r}` : `genie_fx${n}`
}
/** Ce marqueur est-il celui d'un vœu (genieFxMarker) ? Sert au registre des vœux payés (YellowSave.geniePaid). */
export function isGenieFxMarker(m: string): boolean {
    return /^genie_fx[1-3](_r[1-9]\d{0,2})?$/.test(m)
}
/** 🧞 Empreinte d'un LOT d'effets externes (FrontierProfile.pendingEffects), rangée au registre des vœux payés une fois le lot
 *  appliqué : un lot dont l'acquittement s'est perdu (réseau, onglet fermé, 2e chargement) n'est plus jamais réappliqué, il
 *  est seulement ré-acquitté (28/10/2026). ⚠️ Côté créateur : deux lots au texte IDENTIQUE compteraient pour un seul →
 *  ajouter un champ unique à chaque lot (ex. "tag": "2026-10-28-zyran"), que runGenieEffect ignore. */
export function genieExtMarker(raw: string): string {
    let h = 0x811c9dc5
    for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
    return `genie_ext_${h.toString(36)}`
}
/** 🧞 Empreinte d'un CADEAU D'ÉNERGIE crédité (FrontierProfile.energyGrantPending), gardée le temps de son acquittement :
 *  un acquittement perdu (ou un 2e onglet) ne le fait plus créditer deux fois (28/10/2026). */
export function genieGrantMarker(amount: number): string {
    return `genie_grant_${Math.max(0, Math.floor(amount))}`
}
/** ⛓️ Marqueur de SCEAU du défi némésis (`<espèce>_blocked`). UN SEUL prédicat pour le jeu ET pour parseSave : un filtre plus
 *  étroit au chargement jetterait du registre un sceau valide (ex. espèce custom à l'id long), puis l'effacerait de tous les
 *  mondes (revue du 28/10/2026). */
export function isNemesisSealMarker(m: unknown): m is string {
    return typeof m === "string" && m.length <= 160 && m.endsWith("_blocked")
}
/** Empreinte « EN VOL » (lot d'effets externes ou cadeau d'énergie) : n'a de sens que tant que le serveur le propose encore. */
export function isGenieInFlightMarker(m: string): boolean {
    return /^genie_(ext|grant)_/.test(m)
}
/** Marqueur admis au registre des vœux payés : un vœu (genieFxMarker), un lot d'effets externes (genieExtMarker) ou un
 *  cadeau d'énergie (genieGrantMarker) en cours d'acquittement. */
export function isGeniePaidMarker(m: string): boolean {
    return isGenieFxMarker(m) || /^genie_ext_[0-9a-z]{1,7}$/.test(m) || /^genie_grant_\d{1,7}$/.test(m)
}

/** UN VŒU SE PAIE UNE SEULE FOIS PAR JOUEUR, quel que soit le monde (run 1, run 2, rejeu…). Les marqueurs genieFxMarker
 *  vivent dans les marqueurs DU MONDE ; un monde neuf (run 2, bulle de rejeu) les a vides. Avant le 20/10/2026, chaque vœu
 *  exaucé se REJOUAIT donc en entier à l'entrée du run 2 : Kingme +15 000⚡ une 2e fois, TomGotrails 3 Pâtes de Bertie de
 *  plus, défi Blaziper de DaKumba réarmé (et perdu → Blaziper scellé dans son run 2).
 *  Désormais, un vœu déjà appliqué dans un AUTRE monde ne rejoue QUE ses effets PERMANENTS ci-dessous (bonus/malus portés
 *  par un marqueur, idempotents : ils doivent suivre le joueur dans chaque monde). Tous les autres sont des DONS UNIQUES. */
//   casino_cap n'en fait PAS partie : son seul cas réel (Jacanon) a été LEVÉ par le canal pendingEffects (casino_uncap,
//   15/10/2026), qui ne se rejoue jamais → le rejouer dans un monde neuf le re-bannirait à tort.
// 28/10/2026 (Sartay : « un vœu n'arrive qu'une fois ! si on rejoue le run, le vœu ne doit plus avoir lieu, sauf s'il dure
//   dans le temps ») : « déjà payé » ne dépend plus seulement des mondes encore présents. Un monde JETÉ (abandon du run 2,
//   nouveau départ du run 3, remise à zéro du chapitre) emportait son marqueur, et le vœu se repayait au chargement
//   suivant. Le registre GLOBAL YellowSave.geniePaid garde chaque vœu payé, quoi qu'il arrive aux mondes.
export const GENIE_PERSISTENT_EFFECT_KINDS: ReadonlySet<string> = new Set([
    "league_level_boost", "casino_uncap", "ace_daily_cap", "attack_cost_extended", "minitel_unlock", "wild_heal",
])
/** Les DONS UNIQUES connus (énergie, objets, défi némésis, pâtes, rencontres, charges, surtaxe, malédiction datée…) :
 *  jamais reversés dans un 2e monde. Un effet inconnu des deux listes est traité comme un don unique (prudence). */
export const GENIE_ONCE_EFFECT_KINDS: ReadonlySet<string> = new Set([
    "energy", "ball_lock", "item", "cap", "casino_cap", "energy_drain", "level_drain", "luxe_pasta_batch", "bertie_crochue_batch",
    "force_encounter", "nemesis_challenge", "abundance_curse", "dex_wish_days", "shop_surtax", "shiny_frenzy",
    "ephemeral_shiny_days", "ev_reset_charges", "guaranteed_captures",
])
/** Ce type d'effet est-il connu de CE build (classé ONCE ou PERSISTENT, donc géré par runGenieEffect) ? Un lot ou un vœu
 *  qui en contient un INCONNU attend le déploiement EN ENTIER : jamais à moitié payé, puis repayé (28/10/2026). */
export function isKnownGenieEffectKind(kind: string): boolean {
    return GENIE_ONCE_EFFECT_KINDS.has(kind) || GENIE_PERSISTENT_EFFECT_KINDS.has(kind)
}
