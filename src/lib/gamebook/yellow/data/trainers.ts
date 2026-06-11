// src/lib/gamebook/yellow/data/trainers.ts
//
// Nexus Jaune Éclair — registre des DRESSEURS (combats non-sauvages).
// Données pures (React-free). Chaque dresseur : une équipe de Daemons, un dialogue
// d'intro (avant combat) et de défaite (après qu'on l'a battu), une récompense en
// argent et une difficulté d'IA. Le combat lui-même est joué par le moteur
// (createBattle isWild:false → l'équipe s'enchaîne via les switchs forcés).

import type { AiLevel } from "../battle/ai"
import type { BadgeId } from "./cts"
import type { StatKey } from "../battle/types"
import { getSpecies } from "./species"

/** Niveau d'entraînement d'un dresseur → boost Saiyan/EV de ses Daemons. */
export type TrainTier = "guard" | "elite"

export interface TrainerMonSpec {
    speciesId: string
    level: number
    /** Attaques imposées (sinon auto depuis le learnset) — pour les moves signature exclusifs. */
    moves?: string[]
}

export interface TrainerData {
    id: string
    /** Nom affiché en combat / dialogue (ex. "GAMIN LÉO"). */
    name: string
    /** Classe de dresseur (cosmétique). */
    title: string
    sprite: { emoji: string; color: string }
    mapId: string
    x: number
    y: number
    team: TrainerMonSpec[]
    /** Argent gagné en le battant. */
    reward: number
    aiLevel: AiLevel
    /** Réplique(s) avant le combat. */
    intro: string[]
    /** Réplique(s) une fois battu (ré-interaction ultérieure). */
    defeat: string[]
    /** Chef de salle d'arène : badge accordé en le battant. */
    badge?: BadgeId
    /** Champion : ne peut être défié qu'avec les 3 badges. */
    requiresAllBadges?: boolean
    /** Boss d'arène : ne peut être défié qu'après avoir battu ces dresseurs (les gardes). */
    requiresTrainers?: string[]
    /** CT CADEAU remise gratuitement à la victoire (trophée du boss, cf. cts.ts). */
    giftCt?: string
    /** Entraînement : boost Saiyan/EV des Daemons (gardien = moyen, élite = boss/ACE). */
    training?: TrainTier
    /** Rival de route (Léo/Mia) : monte au niveau du garde le plus fort de l'arène la plus
     *  récemment battue (plante→roche→feu), avec ÉVOLUTION de ses Daemons au stade du niveau.
     *  Sinon niveaux fixes. */
    scaleWithBadges?: boolean
}

/** Niveau-cible des rivaux de route (Léo/Mia) = niveau du GARDE LE PLUS FORT de l'arène la
 *  plus récemment battue. null si aucune arène battue → on garde les niveaux fixes du dresseur. */
export function arenaScaledLevel(badges: readonly string[]): number | null {
    if (badges.includes("feu")) return 29    // garde le plus fort de l'Arène Feu (g4, nerfé)
    if (badges.includes("roche")) return 18  // garde le plus fort de l'Arène Roche
    if (badges.includes("plante")) return 16 // garde le plus fort de l'Arène Plante
    return null
}

const TIER_EV: Record<TrainTier, number> = { guard: 128, elite: 252 }
const TIER_RATE: Record<TrainTier, number> = { guard: 0.5, elite: 1 }

/**
 * Boost "entraînement" d'un Daemon de dresseur (EV + points Saiyan), simulant un
 * joueur entraîné → les dresseurs ne sont plus surclassés par les Daemons boostés.
 * EV sur la stat signature ; points Saiyan répartis 60% signature / 25% PV / 15% déf.
 */
export function trainerBoost(speciesId: string, level: number, tier?: TrainTier): { ev?: Partial<Record<StatKey, number>>; allocated?: Partial<Record<StatKey, number>> } {
    if (!tier) return {}
    const sp = getSpecies(speciesId)
    if (!sp) return {}
    const b = sp.baseStats
    const stats: [StatKey, number][] = [["hp", b.hp], ["atk", b.atk], ["def", b.def], ["spe", b.spe], ["spc", b.spc]]
    const sig = stats.reduce((a, c) => (c[1] > a[1] ? c : a))[0]      // stat signature (plus haute base)
    const defStat: StatKey = b.def >= b.spc ? "def" : "spc"          // meilleure défense
    const ev: Partial<Record<StatKey, number>> = { [sig]: TIER_EV[tier] }
    const P = Math.floor(level * TIER_RATE[tier])
    const allocated: Partial<Record<StatKey, number>> = {}
    const add = (k: StatKey, n: number) => { if (n > 0) allocated[k] = (allocated[k] ?? 0) + n }
    const pSig = Math.floor(P * 0.6), pHp = Math.floor(P * 0.25)
    add(sig, pSig)
    add("hp", pHp)
    add(defStat, P - pSig - pHp)
    return { ev, allocated }
}

export const TRAINERS: TrainerData[] = [
    {
        id: "y_trainer_leo",
        name: "GAMIN LÉO",
        title: "Gamin",
        sprite: { emoji: "🧒", color: "#4a90d9" },
        scaleWithBadges: true,
        mapId: "yellow_route_nord",
        x: 24,
        y: 37,
        team: [
            { speciesId: "plumiot", level: 5 },
            { speciesId: "cailloutchi", level: 6 },
        ],
        reward: 90,
        aiLevel: "trainer",
        intro: [
            "*Un gamin te barre la route.*",
            "Hé ! T'as des Daemons toi aussi ?",
            "Le premier qui perd a un gage !",
        ],
        defeat: [
            "Bon… t'es plus fort que moi.",
            "Je vais m'entraîner sur la Route Nord !",
        ],
    },
    {
        id: "y_trainer_mia",
        name: "EXPLORATRICE MIA",
        title: "Exploratrice",
        sprite: { emoji: "🧭", color: "#d96a4a" },
        scaleWithBadges: true,
        mapId: "yellow_route_nord",
        x: 23,
        y: 34,
        team: [
            { speciesId: "cornaissant", level: 7 },
            { speciesId: "trolystrik", level: 7 },
        ],
        reward: 140,
        aiLevel: "trainer",
        intro: [
            "*Une exploratrice ajuste sa boussole.*",
            "On ne passe pas la Route Nord sans la mériter.",
            "Montre-moi ce que valent tes Daemons !",
        ],
        defeat: [
            "Impressionnant. La Route Nord est à toi.",
            "Méfie-toi des hautes herbes, plus loin…",
        ],
    },

    // === ARÈNE PLANTE — "Bosquet Sacré" : 4 gardes + le Druide (boss, badge Feuille) ===
    // NB : les anciens chefs Feu/Eau + Champion seront recréés quand on ajoutera
    // les arènes suivantes (modèle "1 arène, PNJ qui changent par badge").
    {
        id: "y_arena_g1", name: "GARDE RONCE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 2, y: 1,
        team: [{ speciesId: "feuillichot", level: 7 }, { speciesId: "feuillichot", level: 9 }],
        reward: 60, aiLevel: "trainer",
        intro: ["*Un garde abaisse sa lance-feuille.*", "Le Bosquet ne laisse passer que les dignes !"],
        defeat: ["Tu as la sève vive…"],
    },
    {
        id: "y_arena_g2", name: "GARDE LIERRE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 3, y: 1,
        team: [{ speciesId: "broussours", level: 8 }, { speciesId: "pampousse", level: 12 }],
        reward: 80, aiLevel: "trainer",
        intro: ["Mes bêtes ont soif de ton sel !"],
        defeat: ["Racines brisées… passe."],
    },
    {
        id: "y_arena_g3", name: "GARDE SÈVE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 11, y: 1,
        team: [{ speciesId: "tamanpousse", level: 10 }, { speciesId: "pantheon", level: 8 }],
        reward: 90, aiLevel: "trainer",
        intro: ["*Le garde caresse un étrange tamanoir feuillu.*", "Des créatures inédites veillent ici…"],
        defeat: ["Le Druide t'attend."],
    },
    {
        id: "y_arena_g4", name: "GARDE ÉCORCE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 12, y: 1,
        team: [{ speciesId: "feliane", level: 16 }],
        reward: 110, aiLevel: "trainer",
        intro: ["Dernier rempart avant le Doyen. En garde !"],
        defeat: ["Tu es prêt à l'affronter…"],
    },
    {
        id: "y_arena_druide", name: "DRUIDE SYLVAIN", title: "Doyen du Bosquet Sacré",
        sprite: { emoji: "", color: "#2c6e2c" }, // invisible : déjà dessiné sur l'image
        mapId: "yellow_arena", x: 7, y: 1,
        // GATE : il faut avoir battu les 4 gardes (dans n'importe quel ordre).
        requiresTrainers: ["y_arena_g1", "y_arena_g2", "y_arena_g3", "y_arena_g4"],
        team: [
            { speciesId: "broutame", level: 16 },
            { speciesId: "florapanthe", level: 16 }, // ace inédit (attaque signature)
        ],
        reward: 0, aiLevel: "trainer", badge: "plante", giftCt: "ct17",
        intro: [
            "*Le Doyen lève son bâton feuillu ; tout le Bosquet bruisse.*",
            "Je suis SYLVAIN, gardien du Bosquet Sacré.",
            "La nature absorbe tout — même ta sueur. Montre-moi ta racine !",
        ],
        defeat: [
            "Tu as grandi plus vite que mes ronces…",
            "Le Badge Feuille est tien. Que la sève te guide.",
        ],
    },

    // === ARÈNE ROCHE — "Caverne Minière" : 4 gardes + le Maître (boss, badge Roche) ===
    // Même bâtiment de gym que l'arène Plante : il se RÉORGANISE selon les badges
    // (cf. currentArenaMapId). PNJ visibles via emoji (sprites à venir).
    {
        id: "y_rocharena_g1", name: "MINEUR BURIN", title: "Garde de la Caverne",
        sprite: { emoji: "⛏️", color: "#a08050" },
        mapId: "yellow_arena_roche", x: 4, y: 5,
        team: [
            { speciesId: "cailloutchi", level: 14 },
            { speciesId: "rembodo", level: 16 },
            { speciesId: "limaroche", level: 17 },
        ],
        reward: 120, aiLevel: "trainer",
        intro: ["*Un mineur fait rouler un caillou dans sa paume.*", "On ne passe pas la Caverne sans s'écorcher !"],
        defeat: ["Solide… file au suivant."],
    },
    {
        id: "y_rocharena_g2", name: "GAMIN GALET", title: "Garde de la Caverne",
        sprite: { emoji: "⛏️", color: "#a08050" },
        mapId: "yellow_arena_roche", x: 4, y: 7,
        // Le "collectionneur de cailloux" : sa lignée Mottoche à différents stades.
        team: [
            { speciesId: "mottoche", level: 5 },
            { speciesId: "mottoche", level: 7 },
            { speciesId: "dumotte", level: 9 },
            { speciesId: "dumotte", level: 11 },
            { speciesId: "quadroc", level: 13 },
        ],
        reward: 100, aiLevel: "trainer",
        intro: ["Regarde mes cailloux GRANDIR ! Ils valent de l'or… enfin, du diamant !"],
        defeat: ["Mes bébés cailloux… vous serez forts un jour !"],
    },
    {
        id: "y_rocharena_g3", name: "FORGEUR BRAISE", title: "Garde de la Caverne",
        sprite: { emoji: "⛏️", color: "#a08050" },
        mapId: "yellow_arena_roche", x: 10, y: 5,
        team: [
            { speciesId: "lavapetit", level: 15 },
            { speciesId: "lavapetit", level: 15 },
            { speciesId: "fissuralave", level: 17 },
        ],
        reward: 120, aiLevel: "trainer",
        intro: ["*La chaleur monte près des filons de lave.*", "Roche ET feu : double peine pour toi !"],
        defeat: ["Mes braises s'éteignent…"],
    },
    {
        id: "y_rocharena_g4", name: "GUIDE STALAGM", title: "Garde de la Caverne",
        sprite: { emoji: "⛏️", color: "#a08050" },
        mapId: "yellow_arena_roche", x: 10, y: 7,
        team: [
            { speciesId: "marmoterre", level: 18 },
            { speciesId: "tetardoc", level: 17 },
        ],
        reward: 140, aiLevel: "trainer",
        intro: ["Dernier rempart avant le Maître. La Caverne te jauge !"],
        defeat: ["Le Maître t'attend au fond."],
    },
    {
        id: "y_rocharena_boss", name: "MAÎTRE GRANIT", title: "Doyen de la Caverne Minière",
        sprite: { emoji: "🗿", color: "#7a6a55" },
        mapId: "yellow_arena_roche", x: 7, y: 3,
        // GATE : avoir battu les 4 gardes (n'importe quel ordre).
        requiresTrainers: ["y_rocharena_g1", "y_rocharena_g2", "y_rocharena_g3", "y_rocharena_g4"],
        team: [
            // Le boss OUVRE avec sa signature : son Roctaur a appris FAILLE SISMIQUE via
            // la CT (un move de CT est enseignable légitimement → ce n'est PAS un move
            // hors-learnset interdit). Les 3 autres moves sont naturels (≤25).
            { speciesId: "roctaur", level: 21, moves: ["faille_sismique", "eboulis", "jet_pierres", "charge"] },
            { speciesId: "retroraptor", level: 21 }, // Roche/Vol RAPIDE (Vit 91) : outspeed + Picpic ×2 sur Plante, neutre à Étreinte
            { speciesId: "fissuralave", level: 18 }, // Roche/Feu, Flammèche natif (×2 sur Plante)
            { speciesId: "iorours", level: 20 },     // Roche/Glace (×2 sur Plante)
            { speciesId: "octoroc", level: 20 },     // mur Roche/Sol
        ],
        reward: 0, aiLevel: "trainer", badge: "roche", giftCt: "ct19",
        intro: [
            "*Une silhouette de pierre se dresse, immobile depuis des siècles.*",
            "Je suis GRANIT, Doyen de la Caverne Minière.",
            "La roche endure tout. Brise-la… si tu peux !",
        ],
        defeat: [
            "Fissuré… par plus dur que la pierre elle-même.",
            "Le Badge Roche est tien, tu l'as arraché à la montagne.",
            "*GRANIT dépose une CT au creux de ta main.*",
            "Et prends ça : ma FAILLE SISMIQUE. Continue de creuser ta voie, gamin — le Nexus a besoin de roc comme toi. Va plus loin !",
        ],
    },

    // ===== ARÈNE FEU "LA CALDEIRA" (3e arène, tenue par des femmes) =====
    {
        id: "y_feuarena_g1", name: "NOVICE ÉTINCELLE", title: "Gardienne du Brasier",
        sprite: { emoji: "🔥", color: "#ff6a3a" },
        mapId: "yellow_arena_feu", x: 3, y: 3,
        // Jeune recrue : équipe VARIÉE mais 100% sur le thème du feu (du Feu/Combat au Roche/Feu).
        // (Avant : un Plumiot Normal/Vol hors-thème + un Panthéon LÉGENDAIRE — absurde sur un garde novice.)
        team: [
            { speciesId: "brasicow", level: 20 },
            { speciesId: "braisecaille", level: 20 },
            { speciesId: "pyrozly", level: 21 },
            { speciesId: "colibraise", level: 19 },
            { speciesId: "lavapetit", level: 18 },
        ],
        reward: 150, aiLevel: "trainer",
        intro: ["*Une jeune dresseuse jongle avec une flammèche.*", "L'arène est tenue par des femmes de feu — et je tiens la première garde !"],
        defeat: ["Pas mal… mes grandes sœurs vont te chauffer pour de bon."],
    },
    {
        id: "y_feuarena_g2", name: "ÉLEVEUSE EMBRA", title: "Gardienne du Brasier",
        sprite: { emoji: "🔥", color: "#ff6a3a" },
        mapId: "yellow_arena_feu", x: 5, y: 7,
        // 5 Daemons de la MÊME lignée (oiseau de feu), du poussin au grand rapace.
        team: [
            { speciesId: "colibraise", level: 22 },
            { speciesId: "colibraise", level: 24 },
            { speciesId: "arardent", level: 26 },
            { speciesId: "arardent", level: 27 },
            { speciesId: "toucanyon", level: 27 },
        ],
        reward: 170, aiLevel: "trainer",
        intro: ["J'élève mes oiseaux de braise du premier duvet jusqu'au grand rapace. Regarde-les grandir !"],
        defeat: ["Mes oisillons ont encore des plumes à faire pousser…"],
    },
    {
        id: "y_feuarena_g3", name: "PRÊTRESSE LAVE", title: "Gardienne du Brasier",
        sprite: { emoji: "🔥", color: "#ff6a3a" },
        mapId: "yellow_arena_feu", x: 11, y: 7,
        // 3 costaudes (formes finales).
        team: [
            { speciesId: "tauricendre", level: 28 },
            { speciesId: "calderont", level: 28 },
            { speciesId: "arardent", level: 28 },
        ],
        reward: 200, aiLevel: "trainer",
        intro: ["*La chaleur devient suffocante.*", "Trois titans de feu te barrent la route de la Doyenne."],
        defeat: ["Tu brûles d'un feu plus vif que le mien…"],
    },
    {
        id: "y_feuarena_g4", name: "GARDIENNE MAGMA", title: "Sentinelle de la Caldeira",
        sprite: { emoji: "🔥", color: "#ff6a3a" },
        mapId: "yellow_arena_feu", x: 13, y: 3,
        // Une seule Daemon, mais de niveau boss.
        team: [
            { speciesId: "toucanyon", level: 29 },
        ],
        reward: 220, aiLevel: "trainer",
        intro: ["Je n'ai qu'une Daemon. Mais une seule suffit pour calciner les imprudents."],
        defeat: ["Passe… PYRA t'attend au sommet."],
    },
    {
        id: "y_feuarena_boss", name: "PYRA", title: "Doyenne de la Caldeira",
        sprite: { emoji: "🌋", color: "#ff4a2a" },
        mapId: "yellow_arena_feu", x: 8, y: 2,
        // GATE : avoir battu les 4 gardes (n'importe quel ordre).
        requiresTrainers: ["y_feuarena_g1", "y_feuarena_g2", "y_feuarena_g3", "y_feuarena_g4"],
        team: [
            // 2 faibles (bases), 2 fortes (finales), 2 niveau-boss — dont son AS Vipember qui
            // OUVRE sur sa signature PYROTECHNIE (move de CT, enseignable légitimement).
            { speciesId: "brasicow", level: 24 },
            { speciesId: "braisecaille", level: 24 },
            { speciesId: "tauricendre", level: 29 },
            { speciesId: "calderont", level: 30 },
            { speciesId: "toucanyon", level: 31 },
            { speciesId: "vipember", level: 32, moves: ["pyrotechnie", "lance_flammes", "vague_mentale", "flamme_ardente"] },
        ],
        reward: 0, aiLevel: "trainer", badge: "feu", giftCt: "ct21",
        intro: [
            "*Au sommet de la caldeira, une femme se tient dans les flammes, impassible.*",
            "Je suis PYRA, Doyenne de cette arène. Ici, ce sont les femmes qui règnent sur le feu.",
            "Mon Vipember ne se contente pas de brûler : il consume l'esprit. Montre-moi ta flamme !",
        ],
        defeat: [
            "Éteinte… par une flamme plus pure que la mienne.",
            "Le Badge Feu est à toi — tu as dansé dans la caldeira sans flancher.",
            "*PYRA dépose une CT brûlante dans ta paume.*",
            "Et garde ma PYROTECHNIE : que le feu de l'esprit éclaire ta route. Le Nexus t'attend plus loin !",
        ],
    },
]

const BY_ID = new Map(TRAINERS.map((t) => [t.id, t]))

export function getTrainer(id: string): TrainerData | null {
    return BY_ID.get(id) ?? null
}

export function trainersOnMap(mapId: string): TrainerData[] {
    return TRAINERS.filter((t) => t.mapId === mapId)
}
