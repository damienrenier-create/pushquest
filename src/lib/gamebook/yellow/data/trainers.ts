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
        mapId: "yellow_arena", x: 4, y: 3,
        team: [{ speciesId: "feuillichot", level: 7 }, { speciesId: "feuillichot", level: 9 }],
        reward: 60, aiLevel: "trainer",
        intro: ["*Un garde abaisse sa lance-feuille.*", "Le Bosquet ne laisse passer que les dignes !"],
        defeat: ["Tu as la sève vive…"],
    },
    {
        id: "y_arena_g2", name: "GARDE LIERRE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 4, y: 6,
        team: [{ speciesId: "broussours", level: 8 }, { speciesId: "pampousse", level: 12 }],
        reward: 80, aiLevel: "trainer",
        intro: ["Mes bêtes ont soif de ton sel !"],
        defeat: ["Racines brisées… passe."],
    },
    {
        id: "y_arena_g3", name: "GARDE SÈVE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 10, y: 3,
        team: [{ speciesId: "tamanpousse", level: 10 }, { speciesId: "pantheon", level: 8 }],
        reward: 90, aiLevel: "trainer",
        intro: ["*Le garde caresse un étrange tamanoir feuillu.*", "Des créatures inédites veillent ici…"],
        defeat: ["Le Druide t'attend."],
    },
    {
        id: "y_arena_g4", name: "GARDE ÉCORCE", title: "Garde du Bosquet",
        sprite: { emoji: "", color: "#3aa54a" }, // invisible : le garde est déjà dessiné sur l'image d'arène
        mapId: "yellow_arena", x: 10, y: 6,
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
        reward: 0, aiLevel: "trainer", badge: "plante",
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
]

const BY_ID = new Map(TRAINERS.map((t) => [t.id, t]))

export function getTrainer(id: string): TrainerData | null {
    return BY_ID.get(id) ?? null
}

export function trainersOnMap(mapId: string): TrainerData[] {
    return TRAINERS.filter((t) => t.mapId === mapId)
}
