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

    // === ARÈNE — CHEFS DE SALLE (badge à la clé) + CHAMPION ===
    {
        id: "y_chef_feu",
        name: "CHEF IGNIS",
        title: "Chef de la Salle Feu",
        sprite: { emoji: "🔥", color: "#e0502a" },
        mapId: "yellow_arena",
        x: 7, y: 8,
        team: [
            { speciesId: "pyrenard", level: 18 },
            { speciesId: "lavapetit", level: 19 },
            { speciesId: "flamkure", level: 20 },
        ],
        reward: 0,
        aiLevel: "trainer",
        badge: "feu",
        intro: [
            "*La chaleur de la Salle Feu te coupe le souffle.*",
            "Je suis IGNIS. Ici, on forge les âmes dans le brasier !",
            "Prouve que ta flamme intérieure vaut la mienne !",
        ],
        defeat: [
            "Quelle ardeur… Tu mérites le Badge Flamme.",
            "Va défier les autres salles, champion en herbe.",
        ],
    },
    {
        id: "y_chef_plante",
        name: "CHEF FLORA",
        title: "Chef de la Salle Plante",
        sprite: { emoji: "🌿", color: "#3aa54a" },
        mapId: "yellow_arena",
        x: 16, y: 4,
        team: [
            { speciesId: "feliane", level: 20 },
            { speciesId: "broutame", level: 21 },
            { speciesId: "sylvapuce", level: 22 },
        ],
        reward: 0,
        aiLevel: "trainer",
        badge: "plante",
        intro: [
            "*Des lianes frémissent autour de FLORA.*",
            "La patience de la nature broie la précipitation.",
            "Enracine-toi… si tu peux !",
        ],
        defeat: [
            "Tu as su grandir plus vite que mes ronces.",
            "Le Badge Feuille est à toi.",
        ],
    },
    {
        id: "y_chef_eau",
        name: "CHEF ONDINE",
        title: "Chef de la Salle Eau",
        sprite: { emoji: "💧", color: "#3a8ee0" },
        mapId: "yellow_arena",
        x: 35, y: 16,
        team: [
            { speciesId: "herondee", level: 22 },
            { speciesId: "ondaloutre", level: 23 },
            { speciesId: "razmaree", level: 24 },
        ],
        reward: 0,
        aiLevel: "trainer",
        badge: "eau",
        intro: [
            "*L'eau de la salle clapote doucement.*",
            "Je suis ONDINE. Le courant emporte les imprudents.",
            "Montre-moi que tu sais nager à contre-courant !",
        ],
        defeat: [
            "Tu fends les flots sans broncher… Le Badge Goutte est tien.",
            "Le Champion t'attend sur son trône.",
        ],
    },
    {
        id: "y_champion",
        name: "CHAMPION RIVALDI",
        title: "Champion de l'Arène",
        sprite: { emoji: "👑", color: "#d4af37" },
        mapId: "yellow_arena",
        x: 35, y: 3,
        team: [
            { speciesId: "magmator", level: 28 },
            { speciesId: "razmaree", level: 29 },
            { speciesId: "druidours", level: 29 },
            { speciesId: "draconarque", level: 32 },
        ],
        reward: 0,
        aiLevel: "trainer",
        requiresAllBadges: true,
        intro: [
            "*Le Champion se lève de son trône, les trois éléments tournoyant à ses pieds.*",
            "Trois badges… Tu as donc dompté le feu, la sève et l'onde.",
            "Mais maîtrises-tu les trois À LA FOIS ? Montre-moi ta voie !",
        ],
        defeat: [
            "Incroyable… La couronne te revient de droit.",
            "Le Nexus Jaune Éclair a un nouveau Champion.",
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
