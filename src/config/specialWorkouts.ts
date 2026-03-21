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
    unit: 'REPS' | 'SECONDS' | 'METERS' | 'KILOMETERS';
}

export interface SpecialWorkout {
    id: string;
    slug: string;
    name: string;
    description: string;
    date: string; // YYYY-MM-DD (Start date)
    exercises: WorkoutExercise[];
    scoringType: 'TIME' | 'REPS' | 'COMPOSITE';
    xpBonus: number;
    isActive?: boolean;
    endDate?: string; // YYYY-MM-DD
}

export const SPECIAL_WORKOUTS: SpecialWorkout[] = [
    {
        id: 'workout-01-the-first',
        slug: 'premier-exploit',
        name: 'Premier Exploit',
        description: 'L\'entraînement inaugural : un défi complet mêlant endurance et puissance.',
        date: '2026-03-14',
        isActive: true,
        exercises: [
            { type: 'PLANK', label: 'Gainage', goal: 120, unit: 'SECONDS' },
            { type: 'RUN', label: 'Course', goal: 2000, unit: 'METERS' },
            { type: 'BURPEES', label: 'Burpees', goal: 20, unit: 'REPS' },
            { type: 'JUMP_ROPE', label: 'Corde à sauter', goal: 200, unit: 'REPS' },
            { type: 'PISTOL_SQUAT', label: 'Pistol Squat', goal: 2, unit: 'REPS' },
            { type: 'SQUAT_JUMP', label: 'Squat Jumps', goal: 20, unit: 'REPS' }
        ],
        scoringType: 'TIME',
        xpBonus: 1000,
        endDate: '2026-03-31'
    },
    {
        id: 'workout-02-spring',
        slug: 'le-souffle-du-printemps',
        name: 'Le Souffle du Printemps',
        description: 'Célébrez l\'équinoxe avec ce défi d\'endurance. Note : les exercices peuvent être faits dans n\'importe quel ordre et par séries, mais vous devez terminer toutes les répétitions d\'un exercice avant de passer au suivant.',
        date: '2026-03-21',
        endDate: '2026-04-21',
        isActive: true,
        exercises: [
            { type: 'RUN', label: 'Course', goal: 10, unit: 'KILOMETERS' },
            { type: 'SQUATS', label: 'Squats', goal: 100, unit: 'REPS' },
            { type: 'PLANK', label: 'Gainage', goal: 100, unit: 'SECONDS' },
            { type: 'BURPEES', label: 'Burpees', goal: 10, unit: 'REPS' }
        ],
        scoringType: 'TIME',
        xpBonus: 1000
    }
];
