// src/lib/gamebook/yellow/data/trainers.ts
//
// Nexus Jaune Éclair — registre des DRESSEURS (combats non-sauvages).
// Données pures (React-free). Chaque dresseur : une équipe de Daemons, un dialogue
// d'intro (avant combat) et de défaite (après qu'on l'a battu), une récompense en
// argent et une difficulté d'IA. Le combat lui-même est joué par le moteur
// (createBattle isWild:false → l'équipe s'enchaîne via les switchs forcés).

import type { AiLevel } from "../battle/ai"
import type { BadgeId } from "./cts"

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
}

export const TRAINERS: TrainerData[] = [
    {
        id: "y_trainer_leo",
        name: "GAMIN LÉO",
        title: "Gamin",
        sprite: { emoji: "🧒", color: "#4a90d9" },
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
            { speciesId: "grenarc", level: 18 },
            { speciesId: "iorours", level: 20 },
            { speciesId: "octoroc", level: 20 },
            // Ace : Roctaur 25 avec la SIGNATURE Faille Sismique (exclusive, donnée en CT).
            { speciesId: "roctaur", level: 25, moves: ["faille_sismique", "eboulis", "seisme", "carapace_diamant"] },
        ],
        reward: 0, aiLevel: "trainer", badge: "roche", giftCt: "ct19",
        intro: [
            "*Une silhouette de pierre se dresse, immobile depuis des siècles.*",
            "Je suis GRANIT, Doyen de la Caverne Minière.",
            "La roche endure tout. Brise-la… si tu peux !",
        ],
        defeat: [
            "Fissuré… par plus dur que moi.",
            "Le Badge Roche est tien. Prends aussi ma FAILLE SISMIQUE.",
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
