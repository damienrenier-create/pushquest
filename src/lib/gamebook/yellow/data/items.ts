// src/lib/gamebook/yellow/data/items.ts
//
// Nexus Jaune Éclair — objets : Balls (capture) + soins. Data-driven.
// L'achat/coût se paie en ÉNERGIE PushQuest (reps) → couche meta (hors moteur).

export type ItemCategory = "BALL" | "HEAL" | "STATUS_HEAL" | "BOOST" | "MISC" | "REVIVE"

/** Statuts majeurs gérés (aligné sur MajorStatus). "ALL" = tous. */
export type CurableStatus = "ALL" | "BURN" | "POISON" | "TOXIC" | "PARALYSIS" | "SLEEP" | "FREEZE"

export interface ItemData {
    id: string
    name: string
    category: ItemCategory
    description: string
    /** Coût en reps (énergie PushQuest). */
    price: number
    /** Pour les Balls : multiplicateur de capture. */
    ballBonus?: number
    /** Ball à capture GARANTIE (Master-Ball) : bypasse toute la formule. */
    guaranteed?: boolean
    /** Pour les soins : PV restaurés (0 = full). */
    healHp?: number
    /** REVIVE (Rappel) : ranime un Daemon K.O. en lui rendant cette FRACTION de ses PV max (ex. 0.1 = 1/10). */
    reviveFrac?: number
    /** STATUS_HEAL : statuts guéris. */
    cures?: CurableStatus[]
    /** BOOST (objet X) : stat boostée + nombre de crans (appliqué en combat). */
    boostStat?: "atk" | "def" | "spe" | "spc"
    boostStages?: number
    /** REPOUSSE (MISC, s'utilise HORS combat) : nombre de pas sans rencontre sauvage. */
    repelSteps?: number
    /** LAMPE TORCHE (MISC, s'utilise HORS combat) : dans une map SOMBRE, étend le rayon de vision (cases) pour torchSteps pas. */
    torchRadius?: number
    torchSteps?: number
    /** CANNE À PÊCHE (MISC, s'utilise HORS combat, FACE À L'EAU) : ferre un Daemon aquatique. OUTIL réutilisable
     *  (jamais consommé). La présence de ce marqueur range l'objet dans la poche « Pêche » + lui donne son handler. */
    fishingRod?: boolean
    /** SUPER PASTA (MISC, s'utilise HORS combat) : +1 niveau à un Daemon au choix. Offerte par la ferveur de clan
     *  (badge d'un allié). Un clic dans le sac ouvre le sélecteur de Super Pasta (application GRATUITE, consomme 1). */
    superPasta?: boolean
    /** PÂTE DE LUXE (MISC, s'utilise HORS combat) : RE-TIRE les IV d'un Daemon → PARFAIT ou rang D (loterie).
     *  Un clic dans le sac ouvre le sélecteur ; l'effet est révélé à l'usage (cf. useLuxePasta). */
    luxePasta?: boolean
    /** TIRAMISU (MISC, s'utilise HORS combat) : « seconde chance » sur un Daemon DÉJÀ pâté (Pâte de Luxe) → au choix
     *  RESTAURER ses IV d'origine, ou RE-TENTER la loterie. Un clic dans le sac ouvre le sélecteur (cf. useTiramisu). */
    tiramisu?: boolean
}

export const ITEMS: Record<string, ItemData> = {
    poke_ball: {
        id: "poke_ball", name: "Nexus-Ball", category: "BALL",
        description: "Ball standard pour capturer un Daemon affaibli.", price: 10, ballBonus: 1,
    },
    poke_ball_plus: {
        id: "poke_ball_plus", name: "Nexus-Ball +", category: "BALL",
        description: "Un cran au-dessus de la Nexus-Ball de base.", price: 15, ballBonus: 1.5,
    },
    super_ball: {
        id: "super_ball", name: "Super Nexus-Ball", category: "BALL",
        description: "Bon taux de capture.", price: 20, ballBonus: 2,
    },
    super_ball_plus: {
        id: "super_ball_plus", name: "Super Nexus-Ball +", category: "BALL",
        description: "Très bon taux de capture.", price: 50, ballBonus: 3,
    },
    hyper_ball: {
        id: "hyper_ball", name: "Hyper Nexus-Ball", category: "BALL",
        description: "Excellent taux de capture.", price: 70, ballBonus: 4,
    },
    hyper_ball_plus: {
        id: "hyper_ball_plus", name: "Hyper Nexus-Ball +", category: "BALL",
        description: "Le summum hors Master — pour les proies les plus coriaces.", price: 90, ballBonus: 5,
    },
    master_ball: {
        id: "master_ball", name: "Master-Éclair", category: "BALL",
        description: "Capture infaillible. Rarissime.", price: 0, ballBonus: 255, guaranteed: true,
    },
    // Récompense du DRESSEUR D'ORCALINE (plaine d'entraînement). Très forte (ballBonus 6 → satisfait toute
    // exigence de Ball), ET capture GARANTIE sur GOSHENDOFY s'il est sous 50% PV (cas spécial dans engine.ts).
    super_mega_nexus_ball: {
        id: "super_mega_nexus_ball", name: "Super Méga Nexus-Ball", category: "BALL",
        description: "Ball légendaire. Capture à coup sûr le plus insaisissable des Daemons s'il est suffisamment affaibli.", price: 0, ballBonus: 6,
    },
    // FUSIO-BALL : le SEUL vecteur pour capturer un Daemon FUSIONNÉ sauvage (Grotte du Nexus). Refusée sur les
    //   non-fusions (garde dans engine.performCapture). price 0 = hors shop normal → vendue via l'éco Ligue de
    //   Fusion (1 par complétion, 1000 reps). ballBonus 4 : capture DURE (les fusions ont catchRate 3).
    fusio_ball: {
        id: "fusio_ball", name: "Fusio-Ball", category: "BALL",
        // EXCLUSIVE aux fusions (verrou engine.performCapture). TRÈS forte (ballBonus 8) mais NON garantie : le taux
        //   effectif dépend du BST du fusionné (catchRate calculé dans buildFusionSpecies) → une fusion faible est
        //   facile une fois affaiblie, une fusion très puissante (BST énorme) reste ardue. Sans effet sur les autres.
        description: "La SEULE Ball qui capture un Daemon FUSIONNÉ. Redoutablement efficace — mais les fusions les plus puissantes résistent. Sans effet sur les autres Daemons.", price: 0, ballBonus: 8,
    },
    potion: {
        id: "potion", name: "Potion", category: "HEAL",
        description: "Restaure 20 PV à un Daemon.", price: 10, healHp: 20,
    },
    super_potion: {
        id: "super_potion", name: "Super Potion", category: "HEAL",
        description: "Restaure 50 PV.", price: 50, healHp: 50,
    },
    hyper_potion: {
        id: "hyper_potion", name: "Hyper Potion", category: "HEAL",
        description: "Restaure 100 PV.", price: 100, healHp: 100,
    },

    // --- Anti-statut (en combat) ---
    antidote: {
        id: "antidote", name: "Antidote", category: "STATUS_HEAL",
        description: "Soigne le Poison.", price: 0, cures: ["POISON", "TOXIC"],
    },
    anti_para: {
        id: "anti_para", name: "Anti-Para", category: "STATUS_HEAL",
        description: "Soigne la Paralysie.", price: 0, cures: ["PARALYSIS"],
    },
    reveil: {
        id: "reveil", name: "Réveil", category: "STATUS_HEAL",
        description: "Réveille un Daemon endormi.", price: 0, cures: ["SLEEP"],
    },
    antigel: {
        id: "antigel", name: "Antigel", category: "STATUS_HEAL",
        description: "Dégèle un Daemon gelé.", price: 0, cures: ["FREEZE"],
    },
    anti_brulure: {
        id: "anti_brulure", name: "Anti-Brûlure", category: "STATUS_HEAL",
        description: "Soigne la Brûlure.", price: 0, cures: ["BURN"],
    },
    total_soin: {
        id: "total_soin", name: "Total Soin", category: "STATUS_HEAL",
        description: "Soigne TOUS les statuts.", price: 250, cures: ["ALL"],
    },

    // --- Objets X : boostent une stat de +1 cran pour le combat (consomment le tour) ---
    x_attaque: {
        id: "x_attaque", name: "X-Attaque", category: "BOOST",
        description: "Attaque +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "atk", boostStages: 1,
    },
    x_defense: {
        id: "x_defense", name: "X-Défense", category: "BOOST",
        description: "Défense +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "def", boostStages: 1,
    },
    x_vitesse: {
        id: "x_vitesse", name: "X-Vitesse", category: "BOOST",
        description: "Vitesse +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "spe", boostStages: 1,
    },
    x_special: {
        id: "x_special", name: "X-Spé", category: "BOOST",
        description: "Spécial +1 cran (~+50%) jusqu'à la fin du combat.", price: 120, boostStat: "spc", boostStages: 1,
    },

    // --- Objet d'ÉVOLUTION (Part B : Pierre Gékroc → fait évoluer Panthéon vers la panthère du type choisi) ---
    pierre_gekroc: {
        id: "pierre_gekroc", name: "Pierre Gékroc", category: "MISC",
        description: "Pierre d'évolution crépitante, libérée par Gékroc. Permet à Panthéon d'évoluer vers la panthère du type de ton choix.", price: 0,
    },
    // REPOUSSE — objet d'EXPLORATION (s'utilise HORS combat) : éloigne les Daemons sauvages 30 pas.
    //   Vendue par le FRÈRE de l'AVENTURIER (Zone de Combat), une fois PNJ 3 (Grotte B2F) vaincu.
    repousse: {
        id: "repousse", name: "Repousse", category: "MISC",
        description: "Éloigne les Daemons sauvages pendant 30 pas. À utiliser hors combat.", price: 100, repelSteps: 30,
    },
    // LAMPES TORCHES — s'achètent en Jetons de Combat chez le marchand (Zone de Combat). Dans la Grotte du Nexus
    //   (plongée dans le noir), elles élargissent le rayon de vision, plus ou moins loin et plus ou moins longtemps.
    torche_1: {
        id: "torche_1", name: "Torche vacillante", category: "MISC",
        description: "Éclaire un rayon de 2 cases dans le noir, pendant 150 pas.", price: 0, torchRadius: 2, torchSteps: 150,
    },
    torche_2: {
        id: "torche_2", name: "Torche solide", category: "MISC",
        description: "Éclaire un rayon de 3 cases dans le noir, pendant 300 pas.", price: 0, torchRadius: 3, torchSteps: 300,
    },
    torche_3: {
        id: "torche_3", name: "Torche-tempête", category: "MISC",
        description: "Éclaire un rayon de 4 cases dans le noir, pendant 600 pas.", price: 0, torchRadius: 4, torchSteps: 600,
    },
    // RAPPEL (revive) — ranime UN Daemon K.O. et lui rend 1/10 de ses PV. Utilisable EN COMBAT et hors combat.
    rappel: {
        id: "rappel", name: "Rappel", category: "REVIVE",
        description: "Ranime un Daemon K.O. et lui rend 1/10 de ses PV. En combat ou hors combat.", price: 0, reviveFrac: 0.1,
    },
    // Objet clé remis par le SCIENTIFIQUE du labo au sacre (récompense du Dieu Spaghetti) : sa mélodie
    // réveille le SYLVEBARBE endormi qui bouche la sortie sud de Ville Jaune (combat → markSylvebarbeAwake).
    daemonflute: {
        id: "daemonflute", name: "Daemonflûte", category: "MISC",
        description: "Flûte mystérieuse mise au point au labo. Sa mélodie ancestrale peut tirer un Daemon du plus profond sommeil…", price: 0,
    },
    // Objet d'ÉVOLUTION (run 3) : le Prof CHEN remet ce Noyau pour faire évoluer Magmator en Magnetor.
    // Le MOYEN de l'obtenir (Chen le donne) reste à câbler — pas encore distribuable. Cf. evolveMagmatorWithChen().
    noyau_metal: {
        id: "noyau_metal", name: "Noyau de Métal", category: "MISC",
        description: "Alliage expérimental du Prof. Chen. Son cœur métallique transmute la roche de Magmator en un métal vivant — le fait évoluer en Magnetor.", price: 0,
    },
    // Arc « La Lampe & le Génie » : remise par le dresseur-embuscade vaincu. Objet CLÉ (MISC pur, aucun
    // repelSteps/torchRadius/reviveFrac) → apparaît dans la poche « Objets clés » ; un clic ouvre le modal
    // de frottement (RustyLampModal), SANS consommer l'objet. Cf. data/genieLamp.ts (LAMP_ITEM_ID).
    lampe_rouillee: {
        id: "lampe_rouillee", name: "Lampe rouillée", category: "MISC",
        description: "Une vieille lampe sale et poussiéreuse. On dirait qu'un bon frottage ne lui ferait pas de mal…", price: 0,
    },
    // CANNE À PÊCHE — offerte par la Fashion Victim (Grotte 1F) avec le nouveau skin. OUTIL réutilisable : à utiliser
    //   depuis le sac en étant FACE À UN PLAN D'EAU → ferre un Daemon aquatique. Cf. data/fishing.ts + castFishingRod().
    canne_a_peche: {
        id: "canne_a_peche", name: "Canne à pêche", category: "MISC",
        description: "Un petit accessoire trop stylé signé Fashion Victim. À utiliser face à un plan d'eau pour ferrer un Daemon aquatique !", price: 0, fishingRod: true,
    },
    // SUPER PASTA (objet) — offerte GRATUITEMENT par la ferveur de clan (un allié gagne un badge avec le Daemon-clan
    //   en équipe). Reçue DANS LE SAC ; un clic ouvre le sélecteur de Super Pasta → +1 niveau à un Daemon, sans payer.
    super_pasta: {
        id: "super_pasta", name: "Super Pasta", category: "MISC",
        description: "Un plat de pâtes légendaire offert par ta guilde. Donne +1 niveau au Daemon de ton choix. Cadeau de la ferveur de clan !", price: 0, superPasta: true,
    },
    pate_de_luxe: {
        id: "pate_de_luxe", name: "Pâte de Luxe", category: "MISC",
        description: "Un plat gastronomique au génome instable. Donné à un Daemon, il RE-TIRE tout son potentiel génétique : PARFAIT… ou catastrophique (rang D). Un seul essai par Daemon — à tes risques !", price: 0, luxePasta: true,
    },
    tiramisu: {
        id: "tiramisu", name: "Tiramisu", category: "MISC",
        description: "Dessert du remords. Sur un Daemon qui a déjà goûté une Pâte de Luxe : au choix, RESTAURER ses IV d'origine… ou RE-TENTER la loterie (PARFAIT/rang D). La seconde chance des cuisiniers repentis.", price: 0, tiramisu: true,
    },
}

/** Id de l'objet Super Pasta (cadeau de ferveur de clan). */
export const SUPER_PASTA_ITEM_ID = "super_pasta"

/** Id de l'objet Pâte de Luxe (loterie génétique : IV re-tirés → PARFAIT ou rang D). */
export const PATE_LUXE_ITEM_ID = "pate_de_luxe"

/** Id de l'objet Tiramisu (seconde chance : restaurer les IV d'origine OU re-tenter la loterie). */
export const TIRAMISU_ITEM_ID = "tiramisu"

/** Objet d'évolution Magmator → Magnetor (remis par le Prof CHEN). */
export const MAGNETOR_EVO_ITEM = "noyau_metal"

export function getItem(id: string): ItemData | null {
    return ITEMS[id] ?? null
}

/** Multiplicateur de Ball (1 par défaut si inconnu / non-Ball). */
export function ballBonusOf(itemId: string): number {
    const it = ITEMS[itemId]
    return it?.category === "BALL" ? (it.ballBonus ?? 1) : 1
}

/** Ball à capture garantie (Master-Éclair) ? */
export function isGuaranteedBall(itemId: string): boolean {
    return getItem(itemId)?.guaranteed === true
}
