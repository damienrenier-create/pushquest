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
    /** OPENING SCRIPTÉ : moveIds imposés à ses 1ers tours (ordre), quoi qu'il arrive — priorité
     *  sur l'IA et le budget d'énergie. Ex. un boss qui lance sa signature d'entrée. */
    opening?: string[]
    /** OBJET TENU imposé (id de data/heldItems.ts) — ex. le boss de l'arène 1 fait tenir des BAIES à ses Daemons. */
    heldItem?: string
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
    /** Boss d'arène — 2e verrou : son 1er combat reste fermé tant que ces dresseurs n'ont
     *  pas donné leur REVANCHE (= été RE-battus). Message dédié, sans spoiler du rematch boss. */
    requiresRematch?: string[]
    /** CT CADEAU remise gratuitement à la victoire (trophée du boss, cf. cts.ts). */
    giftCt?: string
    /** REMATCH (match retour) : 2e équipe, proposée UNE fois ce dresseur déjà battu.
     *  - reward  : énergie (reps) offerte à la victoire du rematch.
     *  - giftCt  : CT cadeau remise à la victoire du rematch (ex. boss → Mirage).
     *  - requiresRematch : rematch VERROUILLÉ tant que ces dresseurs ne sont pas RE-battus
     *                      (le boss exige les rematchs de ses gardes).
     *  - intro/defeat : répliques propres au rematch (defeat = jouée APRÈS la victoire,
     *                   suivie du message de récompense auto). */
    rematch?: {
        team: TrainerMonSpec[]
        reward?: number
        /** CT(s) cadeau remises à la victoire du rematch (ex. boss → Surtension + Mirage). */
        giftCts?: string[]
        intro?: string[]
        defeat?: string[]
    }
    /** BOSS À 2 PHASES : la 1re défaite enchaîne DIRECTEMENT sur le rematch (phase 2), sans ressortir.
     *  Si K.O. en phase 2, le checkpoint rematch fait reprendre la phase 2 (pas la phase 1). Ex. VOLTA. */
    chainRematch?: boolean
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

    // === GROTTE DU NEXUS B2F — le spéléologue égaré (35,7) : teaser du légendaire nocturne à la défaite ===
    {
        id: "y_pnj1_grotte_b2f",
        name: "SPÉLÉOLOGUE",
        title: "Spéléologue égaré",
        sprite: { emoji: "🔦", color: "#8a6d3b" }, // fallback ; PNG dédié via MapView NPC_SPRITES
        mapId: "yellow_grotte_nexus_b2f",
        x: 35,
        y: 7,
        team: [
            { speciesId: "supabatchu", level: 75 },
            { speciesId: "karatame", level: 80 },
            { speciesId: "tenebrir", level: 75 },
            { speciesId: "omnhippo", level: 80 },
            { speciesId: "alirocaillus", level: 75 },
            { speciesId: "mouflorage", level: 80 },
        ],
        reward: 1000,
        aiLevel: "ace",
        training: "elite", // EV + Saiyan → vrai défi de fin de jeu à niv 75-80
        intro: [
            "*Une lampe frontale vacille dans le noir.*",
            "Cette grotte est vraiment… BIZARRE ! On dirait que les échelles BOUGENT…",
            "Je me suis perdu tant de fois ! Tiens — un combat me changera les idées !",
        ],
        defeat: [
            "*Il rajuste sa lampe, pensif.*",
            "Tu es sacrément doué… Écoute, je vais te confier une rumeur.",
            "On dit qu'un Daemon LÉGENDAIRE rôderait dans cette grotte… mais qu'on ne peut l'apercevoir que la NUIT.",
        ],
    },

    // === GROTTE DU NEXUS B2F — l'ermite entraîneur (30,28) : 2e indice du légendaire (« il faut un niv 100 ») ===
    {
        id: "y_pnj2_grotte_b2f",
        name: "ERMITE",
        title: "Ermite entraîneur",
        sprite: { emoji: "🧙", color: "#7a5ac0" }, // fallback (sprite PNG à câbler plus tard si fourni)
        mapId: "yellow_grotte_nexus_b2f",
        x: 30,
        y: 28,
        team: [
            { speciesId: "karmaki", level: 80 },
            { speciesId: "shade", level: 80 },
            { speciesId: "merorem", level: 85 },
            { speciesId: "goshendofy", level: 90 },
            { speciesId: "ukognos", level: 90 },
        ],
        reward: 1200,
        aiLevel: "ace",
        training: "elite",
        intro: [
            "*Un ermite se dresse, une canne à la main.*",
            "En garde, jeune padawan !",
        ],
        defeat: [
            "*Il s'incline, un sourire malicieux aux lèvres.*",
            "Il ne me reste qu'UNE place dans mon équipe… et elle est réservée au Daemon le plus légendaire de tous.",
            "On dit que pour le trouver, il faut posséder un Daemon de NIVEAU 100 ! Alors je m'entraîne…",
        ],
    },

    // === GROTTE DU NEXUS B2F — l'aventurier BLOQUEUR (13,9, de profil) : barre le couloir (14,9)/(15,9) tant qu'il
    //   n'est pas VAINCU ; à la défaite, révèle les REPOUSSE (vendues par son frère en Zone de Combat) ===
    {
        id: "y_pnj3_grotte_b2f",
        name: "AVENTURIER",
        title: "Aventurier rusé",
        sprite: { emoji: "🧗", color: "#b5793a" }, // fallback ; PNG dédié (de profil) via MapView NPC_SPRITES
        mapId: "yellow_grotte_nexus_b2f",
        x: 13,
        y: 9,
        team: [
            { speciesId: "colosfer", level: 85 },
            { speciesId: "lunarque", level: 85 },
            { speciesId: "coccimperatrice", level: 85 },
            { speciesId: "cerfeuillu", level: 85 },
            { speciesId: "razmaree", level: 85 },
            { speciesId: "pyrokoss", level: 85 },
        ],
        reward: 1300,
        aiLevel: "ace",
        training: "elite",
        intro: [
            "*Un aventurier balèze te barre le couloir, bras croisés.*",
            "On ne passe pas sans se mesurer à moi ! En garde !",
        ],
        defeat: [
            "*Il s'écarte du passage en riant.*",
            "Beau combat ! Tu veux mon secret pour n'avoir QUE des Daemons costauds ?",
            "Les REPOUSSE ! Elles chassent les Daemons sauvages faiblards. Mon FRÈRE en vend dans la ZONE DE COMBAT — dis-lui que tu viens de ma part !",
        ],
    },

    // === GROTTE DU NEXUS B2F — l'explorateur chanceux (25,8) : 3e indice — il a APERÇU le légendaire (Repousse + nuit + échelle) ===
    {
        id: "y_pnj4_grotte_b2f",
        name: "EXPLORATEUR",
        title: "Explorateur fiévreux",
        sprite: { emoji: "🔥", color: "#d9542a" }, // équipe 100 % Feu ; emoji fallback (pas de PNG fourni)
        mapId: "yellow_grotte_nexus_b2f",
        x: 25,
        y: 8,
        team: [
            { speciesId: "gekraise", level: 75 },
            { speciesId: "magnetor", level: 80 },
            { speciesId: "phoechaudiii", level: 85 },
            { speciesId: "dracarlin", level: 90 },
            { speciesId: "pyrozly", level: 95 },
            { speciesId: "thundah", level: 100 },
        ],
        reward: 1500,
        aiLevel: "ace",
        training: "elite",
        intro: [
            "*Un explorateur au regard fiévreux serre son sac contre lui.*",
            "Toi aussi tu cherches quelque chose ici ?! Prouve-moi ta force d'abord !",
        ],
        defeat: [
            "*Il baisse la voix, encore secoué.*",
            "Écoute… l'autre nuit, je suis tombé sur un Daemon que je n'avais JAMAIS vu. Une créature… indescriptible. Je n'ai pas osé m'approcher.",
            "J'utilisais des Repousses, en pleine nuit. J'ai descendu une échelle — je ne sais même plus laquelle — et il était LÀ, devant moi.",
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
            { speciesId: "vipember", level: 32, moves: ["pyrotechnie", "lance_flammes", "vague_mentale", "flamme_ardente"], opening: ["pyrotechnie", "pyrotechnie"] },
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

    // ===== ARÈNE ÉLECTRIQUE "LA TOUR HERTZ" (4e arène, badge "elec") =====
    {
        id: "y_elecarena_g1", name: "APPRENTI BOBINE", title: "Gardien de la Tour",
        sprite: { emoji: "⚡", color: "#ffcc33" },
        mapId: "yellow_arena_elec", x: 4, y: 3,
        team: [
            { speciesId: "trolystrik", level: 16 },
            { speciesId: "boltah", level: 16 },
            { speciesId: "heatah", level: 30 },
            { speciesId: "brutetrik", level: 30 },
        ],
        reward: 220, aiLevel: "trainer",
        intro: ["*Un gamin recharge une bobine en faisant crépiter ses doigts.*", "La Tour Hertz ne laisse passer que ceux qui encaissent le courant. À toi !"],
        defeat: ["Court-circuit… passe à l'étage suivant."],
        rematch: {
            team: [
                { speciesId: "boltah", level: 33 },
                { speciesId: "heatah", level: 36 },
                { speciesId: "brutetrik", level: 36 },
            ],
            reward: 50,
            intro: ["*BOBINE claque une bobine flambant neuve, l'œil brillant.*", "Revanche ! Mes nouveaux Daemons sont taillés pour la VITESSE. Suis le rythme si tu peux !"],
            defeat: ["Re-grillé… t'es increvable, toi."],
        },
    },
    {
        id: "y_elecarena_g2", name: "TECHNICIENNE OHM", title: "Gardienne de la Tour",
        sprite: { emoji: "⚡", color: "#ffcc33" },
        mapId: "yellow_arena_elec", x: 10, y: 2,
        team: [
            { speciesId: "electroatiss", level: 15 },
            { speciesId: "belunode", level: 15 },
            { speciesId: "couranti", level: 25 },
            { speciesId: "zappeureal", level: 36 },
        ],
        reward: 240, aiLevel: "trainer",
        intro: ["Je règle la résistance de chaque câble de cette tour. La tienne va lâcher !"],
        defeat: ["Surtension imprévue… tu conduis mieux que je pensais."],
        rematch: {
            team: [
                { speciesId: "sonarque", level: 30 },
                { speciesId: "leviathonn", level: 36 },
                { speciesId: "zappeureal", level: 36 },
            ],
            reward: 50,
            intro: ["*OHM replonge ses câbles dans un bassin d'eau salée.*", "Eau ET foudre : cette fois je conduis le courant à pleine puissance. Revanche !"],
            defeat: ["Court-circuit dans l'eau… bien joué."],
        },
    },
    {
        id: "y_elecarena_g3", name: "PILOTE FOUDRE", title: "Gardien de la Tour",
        sprite: { emoji: "⚡", color: "#ffcc33" },
        mapId: "yellow_arena_elec", x: 11, y: 3,
        team: [
            { speciesId: "oragron", level: 35 },
            { speciesId: "pantheon", level: 20 },
            { speciesId: "namicha", level: 28 },
            { speciesId: "voltapanthe", level: 30 },
        ],
        reward: 270, aiLevel: "trainer",
        intro: ["*Le vent s'engouffre dans la tour, chargé d'électricité statique.*", "Mon Oragron frappe avant l'orage. Tu ne le verras pas venir."],
        defeat: ["Foudroyé en plein vol…"],
        rematch: {
            team: [
                { speciesId: "oragron", level: 35 },
                { speciesId: "namizeus", level: 35 },
                { speciesId: "jerbiwat", level: 35 },
                { speciesId: "voltapanthe", level: 35 },
            ],
            reward: 50,
            intro: ["*FOUDRE siffle ; des ombres électriques rampent à ses pieds.*", "Revanche ! Mes spectres frappent vite et se font insaisissables. Bonne chance pour les toucher."],
            defeat: ["Insaisissables… et pourtant tu m'as eu."],
        },
    },
    {
        id: "y_elecarena_g4", name: "SENTINELLE ARC", title: "Sentinelle de la Tour",
        sprite: { emoji: "⚡", color: "#ffcc33" },
        mapId: "yellow_arena_elec", x: 12, y: 4,
        team: [
            { speciesId: "brutetrik", level: 30 },
            { speciesId: "couranti", level: 32 },
            { speciesId: "voltapanthe", level: 34 },
        ],
        reward: 300, aiLevel: "trainer",
        intro: ["Cent mille volts gardent ce palier. Touche le garde-fou si tu l'oses."],
        defeat: ["Disjoncté… VOLTA t'attend au sommet de la Tour."],
        rematch: {
            team: [
                { speciesId: "thundah", level: 40 },
                { speciesId: "leviathonn", level: 36 },
                { speciesId: "namizeus", level: 38 },
            ],
            reward: 50,
            intro: ["*ARC pousse le voltage de la Tour à son maximum.*", "Dernier garde-fou avant VOLTA. Ma revanche te disjonctera à coup sûr !"],
            defeat: ["Disjoncté… file en haut, elle t'attend."],
        },
    },
    {
        id: "y_elecarena_boss", name: "VOLTA", title: "Architecte de la Tour Hertz",
        sprite: { emoji: "🗲", color: "#ffaa00" },
        mapId: "yellow_arena_elec", x: 7, y: 1,
        requiresTrainers: ["y_elecarena_g1", "y_elecarena_g2", "y_elecarena_g3", "y_elecarena_g4"],
        // 2e verrou : il faut AUSSI avoir donné aux 4 gardes leur revanche (les re-battre).
        requiresRematch: ["y_elecarena_g1", "y_elecarena_g2", "y_elecarena_g3", "y_elecarena_g4"],
        team: [
            // Movesets explicites : chaque Daemon de la Tour a au moins UNE attaque ÉLEC (arène élec oblige).
            { speciesId: "hebulmin", level: 38, moves: ["fulgurance", "crochet_maitre", "etincelle", "vive_attaque"] },
            { speciesId: "oragron", level: 35, moves: ["fulgurance", "fonce_bec", "etincelle", "vive_attaque"] },
            { speciesId: "zappeureal", level: 36, moves: ["fulgurance", "etincelle", "cage_eclair", "vive_attaque"] },
            // L'AS : ouvre sur sa SIGNATURE Surtension (charge → décharge foudroyante à haut critique).
            { speciesId: "voltapanthe", level: 40, moves: ["mirage", "surtension", "fulgurance", "vive_attaque"], opening: ["mirage", "surtension"] },
        ],
        // Phase 1 = Badge. Puis ENCHAÎNEMENT DIRECT sur la phase 2 (rematch) sans ressortir (chainRematch).
        reward: 0, aiLevel: "trainer", badge: "elec", chainRematch: true,
        intro: [
            "*Au sommet de la Tour Hertz, une silhouette se découpe sur un ciel d'orage.*",
            "Je suis VOLTA, l'Architecte. J'ai bâti cette tour pour capter la foudre du Nexus.",
            "Mon Voltapanthe charge avant de foudroyer. Montre-moi ton voltage !",
        ],
        defeat: [
            "Disjoncté… deux fois, par un courant plus pur que le mien.",
            "La Tour Hertz t'a tout livré : son badge ET ses deux secrets. Tu ES la foudre du Nexus.",
        ],
        rematch: {
            // Défi FINAL de la Tour (offert dès la 1re victoire sur VOLTA — les revanches de
            // gardes étaient déjà requises pour l'atteindre). Deux fauves OUVRENT sur Mirage
            // (esquive) → l'AS Voltapanthe reste sur Surtension. Récompense : les 2 CT signature.
            team: [
                { speciesId: "hebulmin", level: 41, moves: ["fulgurance", "crochet_maitre", "etincelle", "seisme"] },
                { speciesId: "jerbiwat", level: 42, moves: ["fulgurance", "vague_mentale", "etincelle", "vive_attaque"] },
                { speciesId: "leviathonn", level: 43, moves: ["fulgurance", "hydrocanon", "etincelle", "lame_eau"] },
                { speciesId: "thundah", level: 44, moves: ["mirage", "fulgurance", "flamme_ardente", "etincelle"], opening: ["mirage"] },
                { speciesId: "namizeus", level: 45, moves: ["mirage", "fulgurance", "ball_ombre", "vive_attaque"], opening: ["mirage"] },
                { speciesId: "voltapanthe", level: 46, moves: ["mirage", "surtension", "fulgurance", "vive_attaque"], opening: ["mirage", "surtension"] },
            ],
            giftCts: ["ct22", "ct25"], // Surtension + Mirage, remises ensemble
            intro: [
                "*Le Badge à peine en poche, la Tour Hertz vrombit d'une charge aveuglante — VOLTA tend déjà la main vers le ciel.*",
                "Le Badge Éclair ? Ce n'était que l'orage de surface. MAINTENANT, ma VRAIE tempête — deux de mes fauves s'effaceront dans le Mirage. SANS répit !",
                "Bats-moi encore, et mes deux secrets seront tiens. Que le meilleur conducteur gagne !",
            ],
            defeat: [
                "Disjonctée… une seconde fois. Tu ES la foudre du Nexus.",
                "*VOLTA fait crépiter entre ses doigts deux capsules grésillantes.*",
            ],
        },
    },

    // ===== ARÈNE EAU "LE SANCTUAIRE DES MARÉES" (badge "eau", à Cendreville — DERNIER gate avant la Ligue) =====
    // Coords PLACEHOLDER (mapId "yellow_arena_eau" à créer par Sartay) ; niveaux 42-53 (entre la Centrale et la Ligue).
    {
        id: "y_eauarena_g1", name: "PLONGEUR REMOUS", title: "Gardien des Marées",
        sprite: { emoji: "💧", color: "#3aa0e8" },
        mapId: "yellow_arena_eau", x: 5, y: 8,
        team: [
            { speciesId: "herondee", level: 43 },   // VOL/EAU
            { speciesId: "grenarc", level: 43 },     // ROCHE/EAU
            { speciesId: "sonarque", level: 43 },    // EAU/ÉLEC
            { speciesId: "ondulo", level: 42 },      // EAU (lignée starter)
        ],
        reward: 240, aiLevel: "trainer",
        intro: ["*L'eau ruisselle entre les cendres.* Bienvenue au Sanctuaire des Marées ! Je tiens la première vague."],
        defeat: ["Submergé… file vers le courant suivant."],
    },
    {
        id: "y_eauarena_g2", name: "DOMPTEUSE ÉCUME", title: "Gardienne des Marées",
        sprite: { emoji: "💧", color: "#3aa0e8" },
        mapId: "yellow_arena_eau", x: 5, y: 11,
        // Lignée loutre, du marcassin des flots au seigneur des rivières.
        team: [
            { speciesId: "ondaloutre", level: 44 },
            { speciesId: "ondaloutre", level: 45 },
            { speciesId: "naiadrak", level: 47 },
        ],
        reward: 260, aiLevel: "trainer",
        intro: ["J'élève mes loutres des flots jusqu'au dragon des rivières. Regarde la marée monter !"],
        defeat: ["Mes loutres ont encore à apprendre…"],
    },
    {
        id: "y_eauarena_g3", name: "PÊCHEUR ABYSSE", title: "Gardien des Marées",
        sprite: { emoji: "💧", color: "#3aa0e8" },
        mapId: "yellow_arena_eau", x: 11, y: 8,
        // Trois colosses des profondeurs (3 lignées différentes : crapaud-titan, tortue feu/eau, colosse abyssal).
        team: [
            { speciesId: "crapotaure", level: 47 },  // ROCHE/EAU
            { speciesId: "calderont", level: 48 },   // FEU/EAU
            { speciesId: "leviathonn", level: 49 },  // EAU/ÉLEC (colosse abyssal)
        ],
        reward: 280, aiLevel: "trainer",
        intro: ["*Des bulles géantes crèvent la surface.* Trois titans des abysses te barrent la route d'ONDINE."],
        defeat: ["Tu nages plus fort que le courant…"],
    },
    {
        id: "y_eauarena_g4", name: "SENTINELLE RESSAC", title: "Sentinelle du Sanctuaire",
        sprite: { emoji: "💧", color: "#3aa0e8" },
        mapId: "yellow_arena_eau", x: 11, y: 11,
        // Une seule Daemon, mais de niveau boss.
        team: [
            { speciesId: "razmaree", level: 50 },
        ],
        reward: 300, aiLevel: "trainer",
        intro: ["Une seule Daemon. Mais un seul raz-de-marée suffit à noyer les téméraires."],
        defeat: ["Passe… ONDINE règne au cœur du sanctuaire."],
    },
    {
        id: "y_eauarena_boss", name: "ONDINE", title: "Reine des Marées",
        sprite: { emoji: "🌊", color: "#1e78c8" },
        mapId: "yellow_arena_eau", x: 7, y: 3,
        // GATE : avoir battu les 4 gardes (n'importe quel ordre).
        requiresTrainers: ["y_eauarena_g1", "y_eauarena_g2", "y_eauarena_g3", "y_eauarena_g4"],
        team: [
            // Aquapanthe OUVRE sur DÉFERLANTE (signature d'ONDINE) → vue dès le 1er tour (Razmarée la garde aussi en finale).
            { speciesId: "aquapanthe", level: 51, moves: ["deferlante", "hydrocanon", "lame_eau", "vive_attaque"], opening: ["deferlante"] },
            { speciesId: "crapotaure", level: 50 },  // ROCHE/EAU
            { speciesId: "calderont", level: 50 },   // FEU/EAU
            { speciesId: "ondaloutre", level: 49 },  // EAU (lignée loutre)
            // Les 2 AS d'ONDINE : Naïadrak (dragon des rivières) + Razmarée (raz-de-marée), qui OUVRE
            // sur la signature DÉFERLANTE (move de CT). Léviathonn lui a cédé sa place.
            { speciesId: "naiadrak", level: 52, moves: ["hydrocanon", "lame_eau", "draco_souffle", "belier"] },
            { speciesId: "razmaree", level: 53, moves: ["deferlante", "hydrocanon", "lame_eau", "belier"], opening: ["deferlante"] },
        ],
        reward: 0, aiLevel: "trainer", badge: "eau", giftCt: "ct27",
        intro: [
            "*Au cœur du sanctuaire, une marée jaillit des cendres ; une femme s'y dresse, sereine.*",
            "Je suis ONDINE, Reine des Marées. Dans cette ville de cendre, c'est moi qui fais jaillir la vie.",
            "Mes deux marées jumelles — Naïadrak et Razmarée — déferlent sans répit. Montre-moi si tu sais nager contre le destin !",
        ],
        defeat: [
            "Balayée… par une vague plus haute que la mienne.",
            "Le Badge Eau est à toi — et avec lui, TES CINQ BADGES sont enfin réunis !",
            "*ONDINE dépose une capsule ruisselante au creux de ta main.*",
            "Garde ma DÉFERLANTE : que la marée porte tes pas jusqu'au trône du Nexus !",
            "*Les eaux du sanctuaire se mettent à refléter d'autres dresseurs…*",
            "Avec tous les badges, mon Sanctuaire devient une ARÈNE D'ENTRAÎNEMENT : touche un dresseur pour affronter sa VRAIE équipe, autant de fois que tu veux.",
            "Et là-haut, dans la Tour Hertz, les courants ont changé : des REFLETS MIROIRS t'y attendent — des versions inversées, taillées pour exploiter tes faiblesses. À toi de voir si tu oses les défier !",
        ],
    },

    // ===== LA LIGUE DE CENDREVILLE — Conseil des 4 (hommage Gen1) + Maître =====
    // Gauntlet : se débloque après le Badge Eau ; ordre imposé (requiresTrainers) ; point de
    // non-retour (mécanique map/store à venir). Équipes 100% sur le roster existant.
    // mapId "yellow_ligue" = placeholder tant que la map du Sud de Cendreville n'est pas créée.
    {
        id: "y_ligue_1_olga", name: "OLGA", title: "Conseil des 4",
        sprite: { emoji: "❄️", color: "#6cc6e8" },
        mapId: "yellow_ligue_glace", x: 10, y: 2,
        // Glace — mur d'endurance d'entrée : yéti, panthère de givre, orque polaire, ourse, AS Naïadrak.
        team: [
            { speciesId: "yetiroche", level: 52 },
            { speciesId: "panthegel", level: 53 },
            { speciesId: "orcaline", level: 54 },
            { speciesId: "auroraur", level: 55 },
            { speciesId: "naiadrak", level: 56 },
        ],
        reward: 300, aiLevel: "trainer",
        intro: [
            "*Le sol se couvre de givre.* Bienvenue, challenger. Je suis OLGA, première du Conseil des 4.",
            "On ne survit pas sans esprit de compétition… et mes Daemons de glace te figeront sur place !",
        ],
        defeat: ["Gelée à mon propre jeu… Passe. Les autres t'attendent, et il n'y a plus de retour en arrière."],
    },
    {
        id: "y_ligue_2_aldo", name: "ALDO", title: "Conseil des 4",
        sprite: { emoji: "🥊", color: "#b8702e" },
        mapId: "yellow_ligue_combat", x: 10, y: 2,
        requiresTrainers: ["y_ligue_1_olga"],
        // Combat/Roche — 6 brutes physiques, que des stades FINALS (attaque brute + défense de pierre).
        team: [
            { speciesId: "hebulmin", level: 53 },
            { speciesId: "tauricendre", level: 54 },
            { speciesId: "enclumind", level: 55 },
            { speciesId: "magmator", level: 55 },
            { speciesId: "bouhbou", level: 56 },
            { speciesId: "maitrezenc", level: 57 },
        ],
        reward: 350, aiLevel: "trainer",
        intro: [
            "Hi-yah ! Je suis ALDO, deuxième du Conseil des 4.",
            "À force d'entraînement, on devient invincible. Mes colosses vont te broyer — montre tes muscles !",
        ],
        defeat: ["Brisé… par plus dur que le roc. Avance, mais sache que la sortie est scellée derrière toi."],
    },
    {
        id: "y_ligue_3_agatha", name: "AGATHA", title: "Conseil des 4",
        sprite: { emoji: "👻", color: "#8a5cc0" },
        mapId: "yellow_ligue_spectre", x: 10, y: 2,
        requiresTrainers: ["y_ligue_2_aldo"],
        // Spectre/Poison — rapides, esquive, poison, altérations (vitrine des nouveaux spectres).
        team: [
            { speciesId: "necrolopendre", level: 54 },
            { speciesId: "necrocorbe", level: 55 },
            // Archibouh disrupteur : ouvre sur HYPNOSE (sommeil), puis STAB Psy + drain Spectre + confusion.
            { speciesId: "archibouh", level: 55, moves: ["hypnose", "vague_mentale", "drain_ame", "onde_folie"], opening: ["hypnose"] },
            { speciesId: "brookhante", level: 56 },
            // ACE agressif : Vague Mentale (PSY 90 = sa VRAIE menace, sur son gros Spé) + Ball'Ombre (STAB Spectre)
            // + Méga-Sangsue (drain) + Toxik (poison croissant → PRESSION qui garantit la fin du combat). PAS de soin
            //   PUR (fini le mur qui stalle à l'infini). Ouvre sur Toxik pour mettre la pression d'entrée.
            { speciesId: "mycedruide", level: 58, moves: ["vague_mentale", "ball_ombre", "mega_sangsue", "toxik"], opening: ["toxik"] },
        ],
        reward: 400, aiLevel: "trainer",
        intro: [
            "Hi hi hi… Je suis AGATHA, troisième du Conseil des 4.",
            "Le Prof te trouve doué ? Pour moi tu n'es qu'un marmot. Mes spectres vont te glacer le sang !",
        ],
        defeat: ["Pfff… du cran, pour un marmot. File. Le dernier siège est le plus terrible."],
    },
    {
        id: "y_ligue_4_peter", name: "PETER", title: "Conseil des 4",
        sprite: { emoji: "🐲", color: "#5a6cd8" },
        mapId: "yellow_ligue_dragon", x: 10, y: 2,
        requiresTrainers: ["y_ligue_3_agatha"],
        // Dragon/Vol — créatures mythiques, stats massives, attaques dévastatrices.
        team: [
            // Conseil 4 = MAÎTRE DRAGON : 3 dragons (Dracarlin/Cryotyran/Draconarque) + 2 rapaces. Formes finales only.
            { speciesId: "dracarlin", level: 55 },   // FEU/DRAGON — carlin-dragon (sprinter)
            { speciesId: "toucanyon", level: 56 },   // VOL/FEU — rapace de feu
            { speciesId: "chronorex", level: 57 },   // ROCHE/VOL — façon Ptéra
            { speciesId: "cryotyran", level: 58 },   // DRAGON/GLACE — tyran des glaces
            { speciesId: "draconarque", level: 60, moves: ["draco_charge", "pique_fatal", "belier", "danse_lames"], opening: ["danse_lames"] }, // VOL/DRAGON — l'AS dragon
        ],
        reward: 450, aiLevel: "trainer",
        intro: [
            "Bienvenue, challenger. Je suis PETER, dernier rempart du Conseil des 4.",
            "Mes dragons sont des créatures mythiques et invincibles. Contemple leur vraie puissance !",
        ],
        defeat: ["Mes dragons… terrassés. Il ne reste plus que le Maître. Va. Affronte ton destin."],
    },
    {
        id: "y_ligue_maitre", name: "LE MAÎTRE", title: "Maître de la Ligue",
        sprite: { emoji: "👑", color: "#e8c34a" },
        mapId: "yellow_ligue_rival", x: 10, y: 2,
        requiresTrainers: ["y_ligue_4_peter"],
        // ACE national / RIVAL en habit de Champion : équipe ÉQUILIBRÉE menée par ses 3 panthères.
        // (Le 6e slot "on verra" — à affiner : starter du rival ou pièce signature.)
        team: [
            { speciesId: "pyropanthe", level: 58 },
            { speciesId: "aquapanthe", level: 59 },
            { speciesId: "voltapanthe", level: 59 },
            { speciesId: "aquilothan", level: 60 },
            { speciesId: "divinpate", level: 60 },
            { speciesId: "megalithe", level: 62 },
        ],
        reward: 0, aiLevel: "ace",
        intro: [
            "*Au bout de la salle du trône, une silhouette familière se retourne en souriant.*",
            "Surpris ? J'ai pris le chemin le plus court : pendant que tu suais, je suis devenu Maître de la Ligue.",
            "Mes panthères et moi t'attendions. Montre-moi tout ce que le Nexus t'a appris !",
        ],
        defeat: [
            "…Battu. Pour de bon, cette fois. Tu as toujours eu une longueur d'avance.",
            "*Il s'incline.* Le Nexus a son nouveau Maître. La couronne est à toi.",
        ],
    },
    {
        // TON DOUBLE (run 2, salle dorée) — combat FINAL contre ton ancienne équipe run 1. Le `name` est REMPLACÉ
        //   à l'exécution par le pseudo du joueur (gameStore) ; l'`team` ci-dessous n'est PAS utilisée : le combat
        //   passe par startNgPlusFinalBattle (ancienne équipe GELÉE, sans soin). Sprite = joueur + halo mauve (MapView).
        id: "y_ligue_double", name: "TON REFLET", title: "Ton ancien toi",
        sprite: { emoji: "🕴️", color: "#8a2be2" },
        mapId: "yellow_ligue_final", x: 10, y: 2,
        team: [{ speciesId: "divinpate", level: 60 }], // placeholder (jamais fieldé : cf. startNgPlusFinalBattle)
        reward: 0, aiLevel: "hof",
        intro: [
            "*Sous les projecteurs dorés, une silhouette te fait face — c'est TOI. Ton toi d'avant, auréolé d'une lueur mauve.*",
            "« Alors c'est là que tu en es… Moi, je suis celui que tu étais avant de tout recommencer. »",
            "« Le Maître n'était qu'un échauffement. Le VRAI dernier obstacle, c'est ton passé. Prouve que tu es devenu meilleur — DANS L'ÉTAT où tu es, sans répit ! »",
        ],
        defeat: [
            "« …Tu m'as dépassé. Je ne suis plus qu'un souvenir. »",
            "*Ton reflet s'efface dans une volute mauve. Tu es, enfin, pleinement Maître du Nexus.*",
        ],
    },
    // ===== LIGUE DE FUSION — Autel de la Chimère (Conseil des Chimères + Champion + Miroir) =====
    // Le joueur PILOTE son roster de FUSIONS ; l'équipe adverse est bâtie à l'exécution (buildFusionLeagueTeam),
    // donc `team` ci-dessous n'est JAMAIS fieldée (placeholder). aiLevel "hof" OBLIGATOIRE (Déf Spé séparée).
    // Salles en enfilade `yellow_fusion_*`, gauntlet gated (requiresTrainers), entrée depuis l'Autel. 3 paliers.
    {
        id: "y_fusion_1", name: "LORELEI", title: "Conseil des Chimères",
        sprite: { emoji: "🧊", color: "#5fc4d4" },
        mapId: "yellow_fusion_glace", x: 10, y: 2,
        team: [{ speciesId: "morrow", level: 80 }],
        reward: 0, aiLevel: "hof",
        intro: [
            "*L'air se cristallise.* Bienvenue à la Ligue de Fusion, challenger. Je suis LORELEI, gardienne des chimères de GLACE.",
            "Deux âmes fondues en une seule… mes chimères te figeront avant que tu ne comprennes. Montre-moi les tiennes !",
        ],
        defeat: ["Mes chimères de givre… fondues. Passe. Le Conseil t'attend, et l'on ne recule pas ici."],
    },
    {
        id: "y_fusion_2", name: "BRUNO", title: "Conseil des Chimères",
        sprite: { emoji: "🥊", color: "#c0392b" },
        mapId: "yellow_fusion_combat", x: 10, y: 2,
        requiresTrainers: ["y_fusion_1"],
        team: [{ speciesId: "maitrezenc", level: 80 }],
        reward: 0, aiLevel: "hof",
        intro: [
            "Hi-yah ! LORELEI t'a laissé passer ? Voyons si tu tiens face à la FORCE fusionnée.",
            "Mes chimères de combat frappent deux fois plus fort qu'un Daemon seul. En garde !",
        ],
        defeat: ["Broyé par plus fort que mes colosses… Avance. La sortie est scellée derrière toi."],
    },
    {
        id: "y_fusion_3", name: "AGATHA", title: "Conseil des Chimères",
        sprite: { emoji: "👻", color: "#6b4e9e" },
        mapId: "yellow_fusion_spectre", x: 10, y: 2,
        requiresTrainers: ["y_fusion_2"],
        team: [{ speciesId: "ombrapanthe", level: 80 }],
        reward: 0, aiLevel: "hof",
        intro: [
            "Hi hi hi… Deux spectres pour le prix d'un. Je suis AGATHA, et mes chimères sont plus rapides que ton ombre.",
            "Tu ne les verras même pas frapper. Amuse-moi… si tu peux.",
        ],
        defeat: ["Pfff… du cran, pour un vivant. File. L'avant-dernier siège est le plus cruel."],
    },
    {
        id: "y_fusion_4", name: "PETER", title: "Conseil des Chimères",
        sprite: { emoji: "🐉", color: "#6b34ec" },
        mapId: "yellow_fusion_dragon", x: 10, y: 2,
        requiresTrainers: ["y_fusion_3"],
        team: [{ speciesId: "draconarque", level: 80 }],
        reward: 0, aiLevel: "hof",
        intro: [
            "Je suis PETER, dernier du Conseil. Mes chimères DRAGON sont l'apogée de la fusion.",
            "Deux légendes en une bête. Prie pour que tes fusions tiennent le choc !",
        ],
        defeat: ["Mes dragons-chimères, à terre… Impossible. Va. Le Champion des Chimères t'attend."],
    },
    {
        id: "y_fusion_maitre", name: "ACE", title: "Champion des Chimères",
        sprite: { emoji: "👑", color: "#b06cff" },
        mapId: "yellow_fusion_maitre", x: 10, y: 2,
        requiresTrainers: ["y_fusion_4"],
        team: [{ speciesId: "golemini", level: 80 }],
        reward: 0, aiLevel: "hof",
        intro: [
            "*Sur un trône de lumière mauve.* Te voilà. Le Conseil t'a jugé digne… on verra.",
            "Je suis ACE, Champion des Chimères. Mon équipe rassemble les six fusions les plus parfaites du Nexus.",
            "Bats-moi, et il ne te restera qu'un dernier adversaire… le plus terrible de tous.",
        ],
        defeat: ["« …Six chimères parfaites, vaincues. Tu es prêt. Mais es-tu prêt à t'affronter TOI-MÊME ? »"],
    },
    {
        // BOSS FINAL — LE DIEU SPAGHETTI, forme ULTIME (remplace l'ancien miroir/reflet). Équipe FIXE bâtie à
        //   l'exécution (buildFusionBossTeam, gameStore) : 3 chimères + UKOGNOFY (les 2 légendaires fusionnés).
        id: "y_fusion_miroir", name: "DIEU SPAGHETTI", title: "Forme Ultime",
        sprite: { emoji: "🍝", color: "#e8b84a" },
        mapId: "yellow_fusion_miroir", x: 10, y: 2,
        requiresTrainers: ["y_fusion_maitre"],
        team: [{ speciesId: "morrow", level: 80 }], // placeholder (jamais fieldé : équipe dynamique par palier)
        reward: 0, aiLevel: "hof",
        intro: [
            "*La porte à dragons franchie, ce n'est pas un reflet qui t'attend… mais une silhouette de semoule dorée que tu connais trop bien.*",
            "« Ha ha ! Surpris ? Depuis le tout premier jour, jeune Dresseur, je t'ai guidé vers CE moment précis. »",
            "« Je suis l'ORIGINE de la fusion. Et j'ai gardé pour la fin ma plus belle œuvre : UKOGNOFY — le dragon légendaire et son écho féerique, ne faisant plus qu'UN. »",
            "« Montre-moi si l'élève a dépassé le maître. EN GARDE ! »",
        ],
        defeat: [
            "« …Inouï. Tu as terrassé ma chimère ultime. »",
            "*Le Dieu Spaghetti s'incline dans un tourbillon de vapeur dorée.*",
            "« Le titre de MAÎTRE DE LA CHIMÈRE t'appartient, pour de bon. Le Nexus est à toi. »",
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
