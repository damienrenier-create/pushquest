// src/lib/gamebook/yellow/data/shopPricing.ts
//
// LA BOURSE DU NEXUS — prix DYNAMIQUES du magasin (endgame, dès le run 3). Trois effets se CUMULENT :
//   1. BOURSE (tous les objets) : le prix monte de +10 % COMPOSÉ par heure, de 8h à 20h (heure SERVEUR, anti-triche),
//      puis « reset » chaque nuit (prix de base de minuit à 8h). À 20h → ×1,10^12 ≈ ×3,14.
//   2. SYLVEBARBE (potions/soins only) : une fois Sylvebarbe battu/capturé, les soins coûtent ×1,5 (fin de l'ère du
//      soin pas cher).
//   3. INFLATION PERSO (potions/soins only) : le prix de base grimpe de +1 % à CHAQUE achat (par lot), propre à chaque
//      joueur, remis à zéro chaque jour → spammer les potions coûte de plus en plus cher dans la journée.
//
// Fonctions PURES (heure + flags passés en paramètre) → testables et déterministes ; l'heure serveur et le compteur
// perso sont fournis par l'appelant (API /shop-time + save).

export const BOURSE_START_HOUR = 8   // avant : prix de base (reset de la nuit)
export const BOURSE_END_HOUR = 20    // après : figé au max de la journée jusqu'au reset de minuit
export const BOURSE_HOURLY = 1.10    // +10 % composé par heure
export const SYLVEBARBE_POTION_MULT = 1.5
export const POTION_INFLATION_PER_BUY = 0.01 // +1 % par achat (lot), reset quotidien

/** Multiplicateur « bourse » à une heure donnée (0-23, heure SERVEUR). 8h→×1 … 20h→×1,10^12. Hors 8-20h : bornes. */
export function bourseMultiplier(hour: number): number {
    const h = Math.max(BOURSE_START_HOUR, Math.min(BOURSE_END_HOUR, Math.floor(hour))) - BOURSE_START_HOUR // 0..12
    return Math.pow(BOURSE_HOURLY, h)
}

export interface ShopPriceCtx {
    hour: number                // heure serveur (0-23)
    sylvebarbeAwake: boolean    // Sylvebarbe battu/capturé → potions ×1,5
    potionBuysToday: number     // nb d'achats de soins du joueur AUJOURD'HUI (inflation perso), reset quotidien
    active: boolean             // la bourse est-elle ACTIVE ? (débloquée au run 3). Sinon → prix de base immuables.
}

/** Prix effectif d'un objet du magasin (arrondi, plancher 1). `category` = ITEMS[id].category. */
export function shopPrice(base: number, category: string, ctx: ShopPriceCtx): number {
    if (!ctx.active || base <= 0) return base // bourse pas encore débloquée (avant run 3) → prix d'origine
    let p = base * bourseMultiplier(ctx.hour) // BOURSE : tous les objets
    if (category === "HEAL") {                // SOINS : Sylvebarbe + inflation perso (cumulés)
        if (ctx.sylvebarbeAwake) p *= SYLVEBARBE_POTION_MULT
        p *= Math.pow(1 + POTION_INFLATION_PER_BUY, Math.max(0, ctx.potionBuysToday))
    }
    return Math.max(1, Math.round(p))
}

// ==================== DIALOGUES DU DIEU SPAGHETTI — la Bourse expliquée (run 3) ====================
// Deux one-shot (markers ci-dessous, dans defeatedTrainers) : ① après la 1re arène du run 3, ② au 1er retour au magasin.
export const BOURSE_INTRO_MARKER = "bourse_intro"
export const BOURSE_SHOP_MARKER = "bourse_shop_intro"
export const BOURSE_INTRO_LINES: string[] = [
    "« Ah, Maître de la Chimère… dans ce Nexus revisité, l'économie est VIVANTE. »",
    "« Au magasin, les prix montent de 10 % CHAQUE HEURE, de 8h à 20h — puis retombent dans la nuit. Achète TÔT le matin, c'est mon conseil ! »",
    "« Et gare aux potions : plus tu en achètes dans la journée, plus TON prix grimpe. La Bourse du Nexus ne fait pas de cadeaux. 🍝 »",
]
export const BOURSE_SHOP_LINES: string[] = [
    "« Bienvenue à la BOURSE DU NEXUS, champion ! Ici les prix dansent avec l'horloge : bas le matin, au sommet à 20h, remis à zéro chaque nuit. »",
    "« Ton compteur perso grimpe aussi à chaque potion achetée. Achète malin — l'heure, c'est de l'énergie. 🍝 »",
]
