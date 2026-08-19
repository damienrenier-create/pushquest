// src/lib/gamebook/yellow/data/artisane.ts
//
// L'ARTISANE — PNJ qui pop au hasard dans la Grotte du Nexus 1F. Elle CRAFTE un objet tenu SIGNATURE, lié à UN
// Daemon précis (son uid) : un boost de stat (+10 à +40 %) dont la PRÉCISION (chance que le boost s'applique)
// dépend du POTENTIEL GÉNÉTIQUE (Σ IV) du Daemon. PV = toujours 100 %. Shiny = 100 %.
//
// GATING : il faut avoir battu ≥1 Ligue (arène OU fusion) pour y accéder, et rebattre une Ligue entre deux crafts.
//   Plafond À VIE : 6 objets avant la victoire de la Ligue Fusion BRONZE, +6 après (12 au total).
// COÛT : niveau du Daemon × demande d'amélioration (%). Ex. niv 50, 20 % → 1000 JC.

export const ARTISANE_NPC_ID = "y_artisane"
export const ARTISANE_MAP = "yellow_grotte_nexus"
export const ARTISANE_SPRITE = "/yellow/sprites/npc_artisane_gen3.png"

/** Spots walkable Grotte 1F (près de l'entrée 18,39). ⚠️ à vérifier en jeu (placement approximatif). */
export const ARTISANE_SPOTS: ReadonlyArray<readonly [number, number]> = [
    [18, 37], [19, 38], [17, 38], [20, 39], [18, 36], [16, 39],
]

/** Bornes de la demande d'amélioration (%). */
export const ARTISANE_MIN_PCT = 10
export const ARTISANE_MAX_PCT = 40

/** Stats craftables. NB : le jeu a un SEUL Spécial (spc) pour attaque ET défense spé → un seul objet « Spécial ».
 *  L'esquive (eva) n'est pas une base-stat : l'objet réduit la précision des attaques adverses (incomingAccMult). */
export type CraftStat = "hp" | "atk" | "def" | "spe" | "spc" | "eva"
export const CRAFT_STATS: CraftStat[] = ["hp", "atk", "def", "spe", "spc", "eva"]
export const CRAFT_STAT_LABEL: Record<CraftStat, string> = {
    hp: "PV", atk: "Attaque", def: "Défense", spe: "Vitesse", spc: "Spécial (att. & déf.)", eva: "Esquive",
}

/** Pools de noms d'objets par stat (~10 chacun). Un des noms est choisi de façon déterministe au craft. */
export const CRAFT_ITEM_NAMES: Record<CraftStat, string[]> = {
    hp: ["Ration de fer", "Festin royal", "Nectar vital", "Baie nourricière", "Gâteau d'endurance", "Miel revigorant", "Pain des cimes", "Bouillon ancestral", "Fruit de vie", "Élixir nourricier"],
    atk: ["Corne acérée", "Gantelets de force", "Serres tranchantes", "Croc de guerre", "Dard perforant", "Poing de fer", "Lame gravée", "Éperon d'assaut", "Mâchoire brute", "Griffe de combat"],
    def: ["Carapace renforcée", "Coquille d'acier", "Élytre blindé", "Plastron gravé", "Cuirasse ancestrale", "Écaille de titan", "Blindage runique", "Bouclier vivant", "Gangue de pierre", "Armure sylvestre"],
    spe: ["Sablier fugace", "Ailette du vent", "Ressort bondissant", "Plume véloce", "Semelle éclair", "Turbine légère", "Grelot du zéphyr", "Propulseur agile", "Bottes ailées", "Voile de célérité"],
    spc: ["Orbe psychique", "Prisme mystique", "Cristal résonnant", "Rune focalisante", "Talisman spectral", "Focus arcanique", "Sceau élémentaire", "Gemme concentrée", "Charme éthéré", "Cœur spirituel"],
    eva: ["Poussière d'ombre", "Chapeau réfléchissant", "Brume trompeuse", "Voile de mirage", "Leurre scintillant", "Cape de fumée", "Camouflage vif", "Écran de poudre", "Reflet fuyant", "Manteau de brume"],
}

/** Nom d'objet choisi de façon DÉTERMINISTE (seed = ex. hash de l'uid) → reproductible, pas de RNG non-seedé. */
export function craftItemName(stat: CraftStat, seed: number): string {
    const pool = CRAFT_ITEM_NAMES[stat]
    return pool[Math.abs(Math.floor(seed)) % pool.length]
}

/** Coût JC = niveau du Daemon × demande d'amélioration (%). Ex. niv 50, 20 % → 1000. */
export function craftCost(level: number, improvePct: number): number {
    return Math.max(1, Math.floor(Math.max(1, level)) * Math.floor(clampPct(improvePct)))
}

export function clampPct(pct: number): number {
    return Math.max(ARTISANE_MIN_PCT, Math.min(ARTISANE_MAX_PCT, Math.floor(pct)))
}

/** PRÉCISION de l'objet (% de chance que le boost s'applique) = potentiel génétique (Σ IV / 75). PV & shiny = 100 %.
 *  Plancher à 20 % pour ne jamais crafter un objet quasi-inutile. */
export function craftPrecision(stat: CraftStat, ivSum: number, shiny: boolean): number {
    if (stat === "hp" || shiny) return 100
    const iv = Math.max(0, Math.min(75, Math.floor(ivSum)))
    return Math.max(20, Math.round((iv / 75) * 100))
}

/** Plafond À VIE d'objets craftés : 6 avant la victoire de la Ligue Fusion BRONZE, 12 après (+6). */
export function craftLifetimeCap(fusionBronzeBeaten: boolean): number {
    return fusionBronzeBeaten ? 12 : 6
}

export const ARTISANE_LINES = [
    "*Une artisane aux doigts calleux t'observe, un établi portatif à ses côtés.*",
    "« Alors comme ça, tu veux un objet FORGÉ SUR MESURE pour l'un des tiens ? »",
    "« Présente-moi un Daemon et dis-moi ce que tu veux renforcer. Attention : ma pièce ne servira qu'à LUI. »",
]
export const ARTISANE_LOCKED_LINE = "« Reviens quand tu auras remporté une Ligue — je ne forge que pour les vainqueurs. »"
export const ARTISANE_NEED_LEAGUE_LINE = "« Tu as déjà pris ta pièce. Va décrocher une nouvelle Ligue, et je rallumerai ma forge. »"
export const ARTISANE_CAP_LINE = "« J'ai forgé tout ce que je pouvais pour toi. Mes mains ont besoin de repos… définitivement. »"
