// src/lib/gamebook/items.ts
//
// v3.8 — Catalogue extensible des items achetables au shop de Pépiteville.
// v3.8.1 — Ajout boots (baskets) avec capability canWear (durabilité + réduction COST_MOVE)
//        + flask qui s'use (-10 maxCapacity par drink)
// v3.13 — Ajout corned_pates (canConsume) + lunettes (canCosmetic)
// v3.17 — Ajout grande_gourde, chaussures_course, brassards, carte_tresor.
//        canWear.tileRestriction permet de limiter la réduction à une tile (brassards = waterShallow).
//        ItemDefinition.availableAt sépare le catalogue NUTRIPATES (basique) du catalogue TRENETTE (exotique/upgrade).
//        Lunettes ont maintenant un effet : -10% sur les coûts "sociaux" (cf applyLunettesDiscount).
//
// Pour ajouter un nouvel item :
//   1. Ajoute une entrée dans ITEMS ci-dessous
//   2. Définis ses capabilities (canStore, canWear, etc.)
//   3. Initial data via getInitialItemData()
//   4. Si action spécifique → étends le switch dans /api/gamebook/inventory/use
//
// Aucune dépendance Prisma ou React. Lib pure réutilisable côté serveur ET client.

import type { TileType } from "./mapEngine"
import type { InventoryEntry } from "./inventory"

export interface ItemCapabilities {
    /** Item qui peut stocker de l'énergie (gourde). */
    canStore?: {
        /** Capacité initiale à l'achat (peut décroître à l'usage). */
        maxCapacity: number
        unit: "reps"
        /** v3.8.1 — combien de maxCapacity perdue par boire. */
        wearOnDrink?: number
    }
    /** Item équipable qui modifie une mécanique (baskets réduisent COST_MOVE). */
    canWear?: {
        /** Durabilité initiale à l'achat (nombre d'usages avant cassure). */
        initialDurability: number
        /** Combien de reps économisés par case (10 - moveCostReduction). */
        moveCostReduction: number
        /** v3.17 — Si défini, la réduction ne s'applique que quand on entre sur cette tile. */
        tileRestriction?: TileType
    }
    /** v3.8.3 — Item consultable qui ouvre une vue côté UI (ne se consomme pas, infinie). */
    canView?: {
        /** Identifiant du modal à ouvrir côté client. */
        kind: "playerMap" | "treasureMap" | "tree_book"
    }
    /** v3.13 — Item consommable instantané. Une utilisation = l'item disparaît du sac. */
    canConsume?: {
        /** Effet à l'utilisation côté serveur. */
        effect: "doubleEnergy" | "fillFlask"
    }
    /** v3.13 — Item cosmétique visible sur le sprite du joueur. Pas de consommation. */
    canCosmetic?: {
        /** Slot d'équipement (pour ne pas en porter deux du même type). */
        slot: "head" | "face" | "body" | "neck"
        /** v3.17 — Si défini, applique un discount automatique sur certains coûts sociaux. */
        socialDiscount?: number  // 0.1 = -10%
        /** v3.17d — Si défini, applique un bonus multiplicatif sur certaines récompenses bonus
         *   (case cachée casino, défi du Nageur). 0.1 = +10%. */
        rewardBonus?: number
        /** v3.17d — Durabilité initiale (s'use d'1 par pas). À 0 → cassé, plus de bonus, sprite retiré. */
        initialDurability?: number
    }
    /** v3.20 — Item qui préserve l'usure des autres wearables/storables.
     *  Chaque wear a `wearSkipChance` % de chance d'être annulé. 0.5 = -50% wear en moyenne. */
    canPreserve?: {
        wearSkipChance: number
    }
    /** v3.23 — Vélo (monture). Permet de gravir le Mont Pasta-Ventoux.
     *  costPerCase : coût de base par case sur le Mont (10 sans vélo = blocage, 8/4/2 selon vélo). */
    canRide?: {
        initialDurability: number
        /** Coût en reps par case sur le Mont Pasta-Ventoux (avant modulation cadence). */
        costPerCase: number
    }
    /** v3.24a-3 — Casquette de flic : immune à l'écrasement sur la route Vegas.
     *  S'use d'1 à chaque case "road" traversée (pas à chaque pas).
     *  À 0 → cassée → plus de protection. */
    canBypassRoad?: {
        initialDurability: number
    }
    /** v3.24a-3 — Arrosoir magique : permet de faire repousser les fruits d'un arbre.
     *  Usage : interagir avec un arbre vide. Reset le compteur du jour pour cet arbre.
     *  S'use d'1 par utilisation. À 0 → cassé. */
    canWater?: {
        initialDurability: number
    }
    /** v4.0 Phase 5 — Item équipable sur UN Daemon (équipement combat).
     *  Stocké dans Daemon.equippedItems (Json array de string keys), max 4.
     *  Bonus stat appliqué côté combat (snapshot au démarrage de battle).
     *  durabilityBattles : nombre de combats avant cassure (cf. Daemon.equippedItems[].durability). */
    canEquipDaemon?: {
        /** Stat boostée (clé de DaemonStats). */
        stat: "force" | "vitesse" | "defense" | "intelligence" | "endurance"
        /** Bonus de stat (additif). */
        bonus: number
        durabilityBattles: number
    }
    /** v4.0 Phase 5 — Item à consommer en plein combat (potion-like).
     *  Effet appliqué au Daemon actif (heal HP, boost stat tour, +happiness, etc.). */
    canUseInBattle?: {
        effect: "heal_hp" | "happiness_boost" | "vitesse_buff_one_battle"
        amount: number
    }
}

export interface ItemDefinition {
    key: string
    name: string
    description: string
    emoji: string
    priceReps: number
    /** Quantité maximale qu'un joueur peut posséder. 1 = item unique. */
    maxQuantity: number
    /** v3.17 — Catalogue d'origine : "nutripates" (Pépiteville), "trenette" (Macaron'île),
     * "both" (les deux shops), "gift" (donné, pas vendu).
     * v3.23 : ajout "muscuville_bikes" pour le magasin de vélos.
     * v3.24a-3 : ajout "vegas_habits" (Lasagnas Vegas) et "vegas_bouffe" (Lasagnas Vegas premium). */
    availableAt?: "nutripates" | "trenette" | "both" | "gift" | "muscuville_bikes" | "vegas_habits" | "vegas_bouffe" | "pastagone_cuisine" | "pastagone_armurerie"
    capabilities: ItemCapabilities
}

export const ITEMS: ItemDefinition[] = [
    {
        key: "flask",
        name: "Gourde",
        emoji: "🧴",
        description: "Stocke jusqu'à 100 reps. Bois pour récupérer toute l'énergie d'un trait. Elle s'use de 10 à chaque gorgée.",
        priceReps: 50,
        maxQuantity: 1,
        // v3.33 — Disponible chez NUTRIPATES (Pépiteville), TRENETTE (Macaron'île) et PELOTON (Muscuville).
        availableAt: "both",
        capabilities: {
            canStore: { maxCapacity: 100, unit: "reps", wearOnDrink: 10 },
        },
    },
    {
        key: "boots",
        name: "Baskets",
        emoji: "👟",
        description: "Réduit le coût de déplacement de 10 à 8 reps par case. Durent 500 pas. Souvent offertes par MAMAN.",
        priceReps: 200,
        maxQuantity: 1,
        // v3.33 — Disponible chez NUTRIPATES (Pépiteville), TRENETTE (Macaron'île) et PELOTON (Muscuville).
        availableAt: "both",
        capabilities: {
            canWear: { initialDurability: 500, moveCostReduction: 2 },
        },
    },
    {
        key: "map",
        name: "Carte des Joueurs",
        emoji: "🗺️",
        description: "Affiche en temps quasi-réel la position de tous les joueurs. Offerte par PEPITO avec le sac.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {
            canView: { kind: "playerMap" },
        },
    },
    {
        key: "swim_set",
        name: "Set de Nage",
        emoji: "🏊",
        description: "Maillot et palmes hérités de la grand-mère de JOJO. Indispensable pour traverser les eaux du sud.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {},
    },
    // v3.13 — Items TRENETTE (frère de NUTRIPATES) — Macaron'île
    {
        key: "corned_pates",
        name: "Corned Pâtes",
        emoji: "🥫",
        description: "Conserve de pâtes énergétique. Double instantanément ton énergie disponible. Disparaît à l'usage.",
        priceReps: 80,
        maxQuantity: 1,
        availableAt: "trenette",
        capabilities: {
            canConsume: { effect: "doubleEnergy" },
        },
    },
    {
        key: "lunettes",
        name: "Lunettes",
        emoji: "🕶️",
        description: "Stylées. On dit qu'elles changent la manière dont les autres te perçoivent. Mais elles ne sont pas indestructibles.",
        priceReps: 50,
        maxQuantity: 1,
        availableAt: "trenette",
        capabilities: {
            canCosmetic: {
                slot: "face",
                socialDiscount: 0.1,
                rewardBonus: 0.1,
                initialDurability: 500,
            },
        },
    },
    // v3.17 — Nouveaux items TRENETTE (Macaron'île)
    {
        key: "grande_gourde",
        name: "Grande Gourde",
        emoji: "⛲",
        description: "Une grande gourde, capacité 200 reps. Plus gros stockage. S'use de 10 par boire (idem la normale).",
        priceReps: 200,
        maxQuantity: 1,
        availableAt: "trenette",
        capabilities: {
            canStore: { maxCapacity: 200, unit: "reps", wearOnDrink: 10 },
        },
    },
    {
        key: "chaussures_course",
        name: "Chaussures de course",
        emoji: "🥾",
        description: "Chaussures de pro. -8 reps/case (2 au lieu de 10) — efficacité ×2 vs baskets. Durée ×4 (2000 pas). Incompatibles avec les baskets.",
        priceReps: 400,
        maxQuantity: 1,
        availableAt: "trenette",
        capabilities: {
            canWear: { initialDurability: 2000, moveCostReduction: 8 },
        },
    },
    {
        key: "brassards",
        name: "Brassards de nage",
        emoji: "🟠",
        description: "Brassards orange flashy. -2 reps/case quand tu nages (waterShallow). Cumulable avec tes baskets/chaussures.",
        priceReps: 100,
        maxQuantity: 1,
        availableAt: "trenette",
        capabilities: {
            canWear: { initialDurability: 500, moveCostReduction: 2, tileRestriction: "waterShallow" },
        },
    },
    {
        // v3.23p — Retirée du shop TRENETTE. À obtenir plus tard via une quête narrative
        // (probablement ORZO qui foreshadow déjà la case cachée du casino Bourg).
        // Reste dans le catalogue pour ne pas casser les inventaires existants.
        key: "carte_tresor",
        name: "Carte aux trésors",
        emoji: "📜",
        description: "Vieux parchemin froissé. Quand tu l'as sur toi, tu remarques des détails étranges au sol de certains lieux.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {
            canView: { kind: "treasureMap" },
        },
    },
    // v3.20 — Cadeau du Monstre (gift only, non vendu)
    {
        key: "amulette_monstre",
        name: "Amulette du Monstre",
        emoji: "🦴",
        description: "Cadeau du Monstre. Tant qu'elle est sur toi, tes équipements (gourdes, baskets, lunettes…) s'usent en moyenne deux fois moins vite.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {
            canPreserve: { wearSkipChance: 0.5 },
        },
    },
    // v3.23 — Vélos du magasin de Muscuville (3 tiers)
    {
        key: "velo_basique",
        name: "Vieux Vélo",
        emoji: "🚲",
        description: "Un vélo rouillé mais fonctionnel. Permet l'ascension du Mont Pasta-Ventoux. Coût 8 reps/case (avant cadence). Durée 200 km.",
        priceReps: 100,
        maxQuantity: 1,
        availableAt: "muscuville_bikes",
        capabilities: {
            canRide: { initialDurability: 200, costPerCase: 8 },
        },
    },
    {
        key: "velo_sport",
        name: "Vélo Sport",
        emoji: "🚴",
        description: "Cadre alu, bonnes vitesses. Coût 4 reps/case sur le Mont. Durée 400 km. Pour les ambitieux.",
        priceReps: 300,
        maxQuantity: 1,
        availableAt: "muscuville_bikes",
        capabilities: {
            canRide: { initialDurability: 400, costPerCase: 4 },
        },
    },
    {
        key: "velo_pro",
        name: "Vélo Pro",
        emoji: "🚵",
        description: "Carbone, électronique. Coût 2 reps/case sur le Mont. Durée 800 km. Du matériel de champion.",
        priceReps: 600,
        maxQuantity: 1,
        availableAt: "muscuville_bikes",
        capabilities: {
            canRide: { initialDurability: 800, costPerCase: 2 },
        },
    },
    // ============================================================
    // v3.24a-3 — Items Lasagnas Vegas
    // ============================================================
    {
        key: "casquette_flic",
        name: "Casquette de Flic",
        emoji: "👮",
        description: "Casquette autoritaire. Les voitures de Vegas s'arrêtent net pour te laisser passer. S'use de 1 par traversée de route (50 traversées).",
        priceReps: 200,
        maxQuantity: 1,
        availableAt: "vegas_habits",
        capabilities: {
            canBypassRoad: { initialDurability: 50 },
        },
    },
    {
        key: "arrosoir",
        name: "Arrosoir Magique",
        emoji: "🪣",
        description: "Reçu par BASILICO le jardinier (ou acheté). Permet de faire repousser les fruits d'un arbre vide. S'use de 1 par utilisation (5 utilisations).",
        priceReps: 900,
        maxQuantity: 1,
        availableAt: "vegas_bouffe",
        capabilities: {
            canWater: { initialDurability: 5 },
        },
    },
    {
        key: "corned_pates_truffees",
        name: "Corned Pâtes Truffées",
        emoji: "🥫",
        description: "Version PREMIUM. Double instantanément ton énergie ET donne +5 happiness à ton tamagotchi. Disparaît à l'usage.",
        priceReps: 200,
        maxQuantity: 1,
        availableAt: "vegas_bouffe",
        capabilities: {
            canConsume: { effect: "doubleEnergy" },
        },
    },
    {
        key: "lunettes_diamant",
        name: "Lunettes Diamant",
        emoji: "👓",
        description: "Version PREMIUM des Lunettes (-20% prix sociaux + +20% rewards bonus). Durent 1500 pas. Pièce de luxe.",
        priceReps: 700,
        maxQuantity: 1,
        availableAt: "vegas_habits",
        capabilities: {
            canCosmetic: { slot: "face", socialDiscount: 0.2, rewardBonus: 0.2, initialDurability: 1500 },
        },
    },
    {
        key: "grande_gourde_xl",
        name: "Grande Gourde XL",
        emoji: "⛲",
        description: "Capacité 400 reps. Idéale pour les longues sorties. S'use de 5 à chaque gorgée.",
        priceReps: 500,
        maxQuantity: 1,
        availableAt: "vegas_bouffe",
        capabilities: {
            canStore: { maxCapacity: 400, unit: "reps", wearOnDrink: 5 },
        },
    },
    {
        key: "mega_gourde",
        name: "Mega Gourde du Capo",
        emoji: "🧪",
        description: "Capacité 1000 reps. Trophée d'IL CAPO. Ne s'achète pas — se gagne.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {
            canStore: { maxCapacity: 1000, unit: "reps", wearOnDrink: 5 },
        },
    },
    {
        key: "tree_book",
        name: "Livre des Arbres",
        emoji: "📗",
        description: "Catalogue des essences d'arbres du Nexus. Rédigé par la bibliothécaire. Flou les espèces non rencontrées.",
        priceReps: 0,
        maxQuantity: 1,
        availableAt: "gift",
        capabilities: {
            canView: { kind: "tree_book" },
        },
    },
    {
        key: "chaussures_air_pasta",
        name: "Chaussures Air Pasta",
        emoji: "🥾",
        description: "Réduit le coût de déplacement à 2 reps/case. Durent 4000 pas. Le top du top.",
        priceReps: 800,
        maxQuantity: 1,
        availableAt: "vegas_habits",
        capabilities: {
            canWear: { initialDurability: 4000, moveCostReduction: 8 },
        },
    },
    {
        key: "brassards_or",
        name: "Brassards d'Or",
        emoji: "🥇",
        description: "Réduit le coût en eau à 2 reps/case. Durent 1500 pas. La nage de luxe.",
        priceReps: 250,
        maxQuantity: 1,
        availableAt: "vegas_habits",
        capabilities: {
            canWear: { initialDurability: 1500, moveCostReduction: 8, tileRestriction: "waterShallow" },
        },
    },
    {
        key: "smoking_vip",
        name: "Smoking VIP",
        emoji: "🤵",
        description: "Tenue exigée pour entrer dans la salle VIP du casino. Cosmétique éternel.",
        priceReps: 300,
        maxQuantity: 1,
        availableAt: "vegas_habits",
        capabilities: {
            canCosmetic: { slot: "body" },
        },
    },
    {
        key: "grain_de_pate",
        name: "Grain de Pâte",
        emoji: "🌾",
        description: "Nourriture pour coqs de combat. Donne-le à un coq avant le combat de 21h pour +10% de chance qu'il gagne (cumulable).",
        priceReps: 30,
        maxQuantity: 10,
        availableAt: "vegas_bouffe",
        capabilities: {
            canConsume: { effect: "doubleEnergy" },  // placeholder — vraie logique gérée dans /api/gamebook/coq/feed (à venir v3.24b)
        },
    },
    // ============================================================
    // v4.0 Phase 5 — Catalogue Pastagone (4 wearables Daemon + 3 consommables)
    // ============================================================
    {
        key: "collier_renforce",
        name: "Collier renforcé",
        emoji: "🦴",
        description: "Cuir épais + métal. Protège la nuque du Daemon. +3 DÉFENSE pour 5 combats.",
        priceReps: 120,
        maxQuantity: 5,
        availableAt: "pastagone_armurerie",
        capabilities: {
            canEquipDaemon: { stat: "defense", bonus: 3, durabilityBattles: 5 },
        },
    },
    {
        key: "muselière_dressage",
        name: "Muselière dressage",
        emoji: "🥊",
        description: "Force le Daemon à concentrer sa morsure. +4 FORCE pour 5 combats.",
        priceReps: 130,
        maxQuantity: 5,
        availableAt: "pastagone_armurerie",
        capabilities: {
            canEquipDaemon: { stat: "force", bonus: 4, durabilityBattles: 5 },
        },
    },
    {
        key: "harnais_leger",
        name: "Harnais léger",
        emoji: "🪶",
        description: "Aérodynamique. +3 VITESSE pour 5 combats.",
        priceReps: 110,
        maxQuantity: 5,
        availableAt: "pastagone_armurerie",
        capabilities: {
            canEquipDaemon: { stat: "vitesse", bonus: 3, durabilityBattles: 5 },
        },
    },
    {
        key: "plaque_mentale",
        name: "Plaque mentale",
        emoji: "🧠",
        description: "Renforce l'intuition combat. +3 INTELLIGENCE pour 5 combats.",
        priceReps: 140,
        maxQuantity: 5,
        availableAt: "pastagone_armurerie",
        capabilities: {
            canEquipDaemon: { stat: "intelligence", bonus: 3, durabilityBattles: 5 },
        },
    },
    {
        key: "steak_nerveux",
        name: "Steak nerveux",
        emoji: "🥩",
        description: "Bourre la viande crue dans la gueule de ton Daemon. Restaure 50 HP en plein combat.",
        priceReps: 80,
        maxQuantity: 10,
        availableAt: "pastagone_cuisine",
        capabilities: {
            canUseInBattle: { effect: "heal_hp", amount: 50 },
        },
    },
    {
        key: "os_a_moelle",
        name: "Os à moelle",
        emoji: "🦴",
        description: "Comfort food canin. +20 bonheur au Daemon (utilisable hors combat).",
        priceReps: 60,
        maxQuantity: 10,
        availableAt: "pastagone_cuisine",
        capabilities: {
            canUseInBattle: { effect: "happiness_boost", amount: 20 },
        },
    },
    {
        key: "espresso_canin",
        name: "Espresso canin",
        emoji: "☕",
        description: "Caféine concentrée. +2 VITESSE pour 1 combat (consommé à l'usage).",
        priceReps: 100,
        maxQuantity: 5,
        availableAt: "pastagone_cuisine",
        capabilities: {
            canUseInBattle: { effect: "vitesse_buff_one_battle", amount: 2 },
        },
    },
]

export function getItem(key: string): ItemDefinition | null {
    return ITEMS.find((i) => i.key === key) ?? null
}

/**
 * v3.17 — Items disponibles à l'achat dans un shop donné.
 * "both" est inclus dans les deux shops. "gift" est exclu.
 * v3.23 — Étendu pour supporter "muscuville_bikes" (magasin de vélos).
 */
export function itemsAvailableAtShop(shop: "nutripates" | "trenette" | "muscuville_bikes" | "vegas_habits" | "vegas_bouffe" | "pastagone_cuisine" | "pastagone_armurerie"): ItemDefinition[] {
    return ITEMS.filter((i) => {
        // v3.33 — Si pas d'availableAt, l'item n'est pas vendu (= gift only).
        if (!i.availableAt) return false
        const at = i.availableAt
        if (at === "gift") return false
        // v3.33 — PELOTON (Muscuville) vend les vélos ET les essentiels "both" (Gourde, Baskets).
        if (shop === "muscuville_bikes") return at === "muscuville_bikes" || at === "both"
        if (shop === "vegas_habits") return at === "vegas_habits"
        if (shop === "vegas_bouffe") return at === "vegas_bouffe"
        // v4.0 Phase 5 — Shops Pastagone (cuisine + armurerie)
        if (shop === "pastagone_cuisine") return at === "pastagone_cuisine"
        if (shop === "pastagone_armurerie") return at === "pastagone_armurerie"
        if (at === "muscuville_bikes" || at === "vegas_habits" || at === "vegas_bouffe"
            || at === "pastagone_cuisine" || at === "pastagone_armurerie") return false
        if (at === "both") return true
        return at === shop
    })
}

/**
 * v3.23 — Vélo actif (le meilleur si plusieurs, mais maxQuantity=1 par type).
 * Retourne le vélo avec le costPerCase le plus bas (= le meilleur), intact.
 */
export function getActiveBicycle(inventory: InventoryEntry[]): { entry: InventoryEntry; def: ItemDefinition } | null {
    let best: { entry: InventoryEntry; def: ItemDefinition; cost: number } | null = null
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canRide) continue
        if (isBrokenItem(entry.data, def)) continue
        const cost = def.capabilities.canRide.costPerCase
        if (!best || cost < best.cost) {
            best = { entry, def, cost }
        }
    }
    return best ? { entry: best.entry, def: best.def } : null
}

// ============================================================
// Helpers pour les items stockables (gourde)
// ============================================================

export function readStored(data: unknown): number {
    if (data && typeof data === "object" && "stored" in data) {
        const v = (data as { stored: unknown }).stored
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return 0
}

/**
 * v3.8.1 — Capacité max actuelle (peut décroître avec l'usage).
 * Fallback sur la capacité initiale de la définition si data ne la contient pas (vieilles gourdes).
 */
export function readMaxCapacity(data: unknown, def: ItemDefinition): number {
    if (data && typeof data === "object" && "maxCapacity" in data) {
        const v = (data as { maxCapacity: unknown }).maxCapacity
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return def.capabilities.canStore?.maxCapacity ?? 0
}

// ============================================================
// Helpers pour les items équipables (baskets / chaussures / brassards)
// ============================================================

/**
 * v3.8.1 — Durabilité actuelle d'un wearable.
 * Fallback sur la durabilité initiale de la définition si data ne la contient pas.
 */
export function readDurability(data: unknown, def: ItemDefinition): number {
    if (data && typeof data === "object" && "durability" in data) {
        const v = (data as { durability: unknown }).durability
        if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.floor(v))
    }
    return def.capabilities.canWear?.initialDurability ?? 0
}

/**
 * v3.8.1 — Renvoie le data initial à associer à un item nouvellement acheté.
 * v3.17d — Si canCosmetic a une initialDurability, on l'initialise aussi.
 */
export function getInitialItemData(def: ItemDefinition): Record<string, unknown> | undefined {
    if (def.capabilities.canStore) {
        return { stored: 0, maxCapacity: def.capabilities.canStore.maxCapacity }
    }
    if (def.capabilities.canWear) {
        return { durability: def.capabilities.canWear.initialDurability }
    }
    if (def.capabilities.canCosmetic?.initialDurability !== undefined) {
        return { durability: def.capabilities.canCosmetic.initialDurability }
    }
    // v3.23 — vélos
    if (def.capabilities.canRide) {
        return { durability: def.capabilities.canRide.initialDurability }
    }
    // v3.24a-3 — casquette de flic + arrosoir
    if (def.capabilities.canBypassRoad) {
        return { durability: def.capabilities.canBypassRoad.initialDurability }
    }
    if (def.capabilities.canWater) {
        return { durability: def.capabilities.canWater.initialDurability }
    }
    return undefined
}

/**
 * v3.8.1 — Renvoie true si l'item est cassé / inutilisable.
 *   - flask / grande_gourde : maxCapacity ≤ 0
 *   - boots / chaussures / brassards : durability ≤ 0
 */
export function isBrokenItem(data: unknown, def: ItemDefinition): boolean {
    if (def.capabilities.canStore) {
        return readMaxCapacity(data, def) <= 0
    }
    if (def.capabilities.canWear) {
        return readDurability(data, def) <= 0
    }
    // v3.23 — vélos (canRide) ont aussi durabilité
    if (def.capabilities.canRide) {
        if (data && typeof data === "object" && "durability" in data) {
            const v = (data as { durability: unknown }).durability
            if (typeof v === "number" && Number.isFinite(v)) return v <= 0
        }
        return false
    }
    // v3.24a-3 — casquette de flic + arrosoir : data.durability ≤ 0
    if (def.capabilities.canBypassRoad || def.capabilities.canWater) {
        if (data && typeof data === "object" && "durability" in data) {
            const v = (data as { durability: unknown }).durability
            if (typeof v === "number" && Number.isFinite(v)) return v <= 0
        }
        return false
    }
    return false
}

// ============================================================
// v3.17 — Helpers pour le système d'équipement étendu (boots/chaussures/brassards)
// ============================================================

/**
 * v3.17 — Trouve le meilleur wearable intact applicable à une tile donnée.
 * - On filtre les items dont canWear est défini, intact, et compatible avec la tile.
 * - On retourne celui avec la plus grande moveCostReduction (le meilleur).
 * Returns { entry, def } or null.
 */
export function findActiveWearableForTile(
    inventory: InventoryEntry[],
    enteringTile: TileType,
): { entry: InventoryEntry; def: ItemDefinition } | null {
    const candidates: Array<{ entry: InventoryEntry; def: ItemDefinition; reduction: number }> = []
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canWear) continue
        if (isBrokenItem(entry.data, def)) continue
        const tileRestriction = def.capabilities.canWear.tileRestriction
        if (tileRestriction && tileRestriction !== enteringTile) continue
        // Si tileRestriction est défini ET ne match pas, skip. Si non défini, applicable partout.
        candidates.push({
            entry,
            def,
            reduction: def.capabilities.canWear.moveCostReduction,
        })
    }
    if (candidates.length === 0) return null
    candidates.sort((a, b) => b.reduction - a.reduction)
    return { entry: candidates[0].entry, def: candidates[0].def }
}

/**
 * v3.17 — Vérifie si le joueur a au moins un item avec canCosmetic.socialDiscount.
 * Retourne le facteur multiplicatif à appliquer (ex: 0.9 pour -10%) ou 1.0 si aucun.
 * Note : actuellement seul "lunettes" propose ce discount.
 */
export function getSocialDiscountMultiplier(inventory: InventoryEntry[]): number {
    let totalDiscount = 0
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canCosmetic?.socialDiscount) continue
        totalDiscount += def.capabilities.canCosmetic.socialDiscount
    }
    // Clamp pour éviter qu'un cumul fasse passer le facteur sous 0
    return Math.max(0, 1 - Math.min(0.9, totalDiscount))
}

/**
 * v3.17 — Applique le discount social (lunettes) à un coût en reps.
 * v3.17d — Désormais utilise la version stricte qui vérifie la durabilité (cassées = pas de discount).
 * Round to nearest, min 1.
 */
export function applySocialDiscount(cost: number, inventory: InventoryEntry[]): number {
    if (cost <= 0) return cost
    const mult = getSocialDiscountMultiplierStrict(inventory)
    if (mult >= 1) return cost
    return Math.max(1, Math.round(cost * mult))
}

/**
 * v3.17d — Lunettes intactes ?
 * True si l'inventaire contient des lunettes avec durability > 0 (ou pas de durability tracking).
 */
export function hasIntactLunettes(inventory: InventoryEntry[]): boolean {
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canCosmetic) continue
        if (def.capabilities.canCosmetic.initialDurability === undefined) {
            // Lunettes sans tracking durability → toujours intactes
            return entry.itemKey === "lunettes" ? true : false
        }
        // Avec tracking : check durability
        if (entry.itemKey === "lunettes") {
            const data = entry.data
            if (data && typeof data === "object" && "durability" in data) {
                const v = (data as { durability: unknown }).durability
                if (typeof v === "number" && Number.isFinite(v)) {
                    return v > 0
                }
            }
            // Pas de durability stockée = item ancien (acheté avant durability tracking) → intact par défaut
            return true
        }
    }
    return false
}

/**
 * v3.17d — Recalcule le getSocialDiscountMultiplier en tenant compte de la durabilité.
 * Si Lunettes cassées → pas de discount.
 */
export function getSocialDiscountMultiplierStrict(inventory: InventoryEntry[]): number {
    let totalDiscount = 0
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canCosmetic?.socialDiscount) continue
        // Si l'item a un tracking durabilité, on doit vérifier qu'il est intact
        const durTracked = def.capabilities.canCosmetic.initialDurability !== undefined
        if (durTracked) {
            const data = entry.data
            if (data && typeof data === "object" && "durability" in data) {
                const v = (data as { durability: unknown }).durability
                if (typeof v === "number" && Number.isFinite(v) && v <= 0) {
                    // Cassé → skip
                    continue
                }
            }
        }
        totalDiscount += def.capabilities.canCosmetic.socialDiscount
    }
    return Math.max(0, 1 - Math.min(0.9, totalDiscount))
}

/**
 * v3.17d — Multiplicateur de récompense bonus (lunettes intactes → +10%).
 * Retourne 1.0 si pas de bonus actif, 1.x sinon.
 */
export function getRewardBonusMultiplier(inventory: InventoryEntry[]): number {
    let totalBonus = 0
    for (const entry of inventory) {
        const def = getItem(entry.itemKey)
        if (!def?.capabilities.canCosmetic?.rewardBonus) continue
        const durTracked = def.capabilities.canCosmetic.initialDurability !== undefined
        if (durTracked) {
            const data = entry.data
            if (data && typeof data === "object" && "durability" in data) {
                const v = (data as { durability: unknown }).durability
                if (typeof v === "number" && Number.isFinite(v) && v <= 0) continue
            }
        }
        totalBonus += def.capabilities.canCosmetic.rewardBonus
    }
    return 1 + totalBonus
}

/**
 * v3.17d — Applique le bonus de récompense lunettes à une valeur de gain.
 * Returns Math.round(value * (1 + bonus)).
 */
export function applyRewardBonus(value: number, inventory: InventoryEntry[]): number {
    if (value <= 0) return value
    const mult = getRewardBonusMultiplier(inventory)
    if (mult <= 1) return value
    return Math.round(value * mult)
}
