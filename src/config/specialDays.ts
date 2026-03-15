export interface SpecialDay {
    label: string;
    emoji: string;
    description: string;
    reward: string;
}

export const SPECIAL_DAYS: Record<string, SpecialDay> = {
    "2026-03-08": { 
        label: "Saint Marvin", 
        emoji: "🔥", 
        description: "Journée hommage au fondateur. Battez EMBI !", 
        reward: "Badge Saint Marvin + XP Doublée (XP x2)." 
    },
    "2026-03-17": { 
        label: "Saint-Patrick", 
        emoji: "🍀", 
        description: "Célébration irlandaise. Séries de compétitions par catégories.", 
        reward: "Badges Trèfle Chance/Or. Top Catégories: Diamant, Émeraude, Rubis, Saphir." 
    },
    "2026-03-20": { 
        label: "Équinoxe de Printemps", 
        emoji: "🌱", 
        description: "L'équilibre parfait. Visez le 50/50.", 
        reward: "Badge Maître de l'Équinoxe + 250 XP (Ratio Pompes/Squats 50/50 requis)." 
    },
    "2026-04-01": { 
        label: "1er Avril", 
        emoji: "🎭", 
        description: "Prends la première place du volume global. Pas de blague !", 
        reward: "Badge Le Gran Blanc (1000 XP) + Poissons paliers." 
    },
    "2026-04-05": { 
        label: "Pâques", 
        emoji: "🐣", 
        description: "Chasse aux œufs. Faites exactement 10, 20 et 30 reps.", 
        reward: "Badge Easter Egg Hunter + 750 XP." 
    },
    "2026-06-03": { 
        label: "Saint Kevin", 
        emoji: "🥛", 
        description: "Défiez Milkardashian !", 
        reward: "Badge St Kevin + XP x2 + 500 XP bonus." 
    },
    "2026-06-06": { 
        label: "D-Day (Semaine du Murph)", 
        emoji: "🎖️", 
        description: "Semaine héroïque. Le MURPH est disponible.", 
        reward: "Badge Héros du D-Day + 250 XP (Completion Murph)." 
    },
    "2026-06-21": { 
        label: "Solstice d'été", 
        emoji: "☀️", 
        description: "La journée la plus longue. 15h de jour = 900 reps.", 
        reward: "Badge Roi du Soleil + 500 XP bonus." 
    },
    "2026-07-03": { 
        label: "Saint Thomas", 
        emoji: "🍺", 
        description: "Défiez Neuneu !", 
        reward: "Badge St Thomas + XP x2 + 500 XP bonus." 
    },
    "2026-09-22": { 
        label: "Équinoxe d'Automne", 
        emoji: "🍂", 
        description: "L'équilibre revient. Visez le 50/50.", 
        reward: "Badge Maître de l'Équinoxe + 250 XP (Ratio Pompes/Squats 50/50 requis)." 
    },
    "2026-09-26": { 
        label: "Saint Damien", 
        emoji: "⚔️", 
        description: "Fête du Grand Prévôt. Battez Mools !", 
        reward: "Badge Gardien du Temple + XP x2 + 500 XP bonus." 
    },
    "2026-12-03": { 
        label: "Saint Xavier", 
        emoji: "❌", 
        description: "Défiez Xa !", 
        reward: "Badge St Xavier + XP x2 + 500 XP bonus." 
    },
    "2026-12-06": { 
        label: "Saint Nicolas", 
        emoji: "🍊", 
        description: "Faites un total finissant par 6.", 
        reward: "Badge Petit Saint + 500 XP bonus." 
    },
    "2026-12-21": { 
        label: "Solstice d'hiver", 
        emoji: "❄️", 
        description: "Le froid n'arrête pas le soldat. 1 rep/h sur 12h.", 
        reward: "Badge Guerrier du Froid + 500 XP bonus." 
    },
    "2026-12-25": { 
        label: "Noël", 
        emoji: "🎄", 
        description: "Trêve hivernale. Faites la série Sapin (1 à 12).", 
        reward: "Badge Cadeau Suprême + 2000 XP." 
    },
};
