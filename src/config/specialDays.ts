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
        description: "Journée hommage au fondateur.", 
        reward: "Badge Saint Marvin + XP Doublée sur tous les exos." 
    },
    "2026-03-17": { 
        label: "Saint-Patrick", 
        emoji: "🍀", 
        description: "Célébration irlandaise, tout le monde en vert !", 
        reward: "Badges Chance & Or. COMPET: Trèfles Diamant (Volume), Émeraude (Pompes), Rubis (Squats) & Saphir (Tractions)." 
    },
    "2026-04-01": { 
        label: "1er Avril", 
        emoji: "🎭", 
        description: "Prends la première place du volume global.", 
        reward: "Badge Mégalo-Carcharodon (Épique)." 
    },
    "2026-04-05": { 
        label: "Pâques", 
        emoji: "🐣", 
        description: "Chasse aux œufs et aux reps.", 
        reward: "Badge Lapin de Pâques + Surprise XP." 
    },
    "2026-06-21": { 
        label: "Solstice d'été", 
        emoji: "☀️", 
        description: "La journée la plus longue pour s'entraîner.", 
        reward: "Badge Roi du Soleil + 500 XP bonus." 
    },
    "2026-12-06": { 
        label: "Saint Nicolas", 
        emoji: "🍊", 
        description: "Distribution de mandarines et de reps.", 
        reward: "Badge Petit Saint + Bonus XP." 
    },
    "2026-12-18": { 
        label: "Saint Damien", 
        emoji: "⚔️", 
        description: "Fête du Grand Prévôt.", 
        reward: "Badge Gardien du Temple + 1000 XP." 
    },
    "2026-12-21": { 
        label: "Solstice d'hiver", 
        emoji: "❄️", 
        description: "Le froid n'arrête pas le soldat.", 
        reward: "Badge Guerrier du Froid." 
    },
    "2026-12-25": { 
        label: "Noël", 
        emoji: "🎄", 
        description: "Trêve hivernale mais pas pour les pompes.", 
        reward: "Badge Cadeau Suprême + 2000 XP." 
    },
};
