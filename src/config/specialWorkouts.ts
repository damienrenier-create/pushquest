export type ExerciseType = 
    | 'PUSHUPS' 
    | 'PULLUPS' 
    | 'SQUATS' 
    | 'PLANK' 
    | 'SQUAT_JUMP' 
    | 'BURPEES' 
    | 'RUN' 
    | 'PISTOL_SQUAT' 
    | 'JUMP_ROPE';

export interface WorkoutExercise {
    type: ExerciseType;
    label: string;
    goal?: number;
    unit: 'REPS' | 'SECONDS' | 'METERS';
}

export interface SpecialWorkout {
    id: string;
    slug: string;
    name: string;
    description: string;
    date: string; // YYYY-MM-DD
    exercises: WorkoutExercise[];
    scoringType: 'TIME' | 'REPS' | 'COMPOSITE';
    standardBadgeKey: string;
    platinumBadgeKey: string;
    xpBonus: number;
}

export const SPECIAL_WORKOUTS: SpecialWorkout[] = [
    {
        id: 'the-gauntlet-01',
        slug: 'le-gantelet',
        name: 'Le Gantelet de Printemps',
        description: 'Enchaînez les exercices le plus vite possible. Le meilleur temps décroche le Platine.',
        date: '2026-03-21',
        exercises: [
            { type: 'BURPEES', label: 'Burpees', goal: 50, unit: 'REPS' },
            { type: 'SQUAT_JUMP', label: 'Squat Jumps', goal: 50, unit: 'REPS' },
            { type: 'PISTOL_SQUAT', label: 'Pistol Squats', goal: 20, unit: 'REPS' },
            { type: 'PLANK', label: 'Gainage', goal: 60, unit: 'SECONDS' },
            { type: 'RUN', label: 'Sprint', goal: 400, unit: 'METERS' }
        ],
        scoringType: 'TIME',
        standardBadgeKey: 'workout_gauntlet_std',
        platinumBadgeKey: 'workout_gauntlet_plat',
        xpBonus: 1000
    },
    {
        id: 'rope-master-01',
        slug: 'maitre-de-la-corde',
        name: 'Maître de la Corde',
        description: 'Maximum de sauts à la corde en 5 minutes.',
        date: '2026-03-28',
        exercises: [
            { type: 'JUMP_ROPE', label: 'Corde à sauter', unit: 'REPS' }
        ],
        scoringType: 'REPS',
        standardBadgeKey: 'workout_rope_std',
        platinumBadgeKey: 'workout_rope_plat',
        xpBonus: 800
    }
];
