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
    countedInDailyTotal?: boolean;
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
    },
    {
        id: 'workout-03-pyramid',
        slug: 'la-grande-pyramide',
        name: 'La Grande Pyramide',
        description: 'Un défi infernal en pyramide avec une ascension vers le sommet de l\'effort puis une descente vers la base.',
        date: '2026-04-28',
        endDate: '2026-05-28',
        isActive: true,
        exercises: [
            { type: 'PLANK', label: 'Gainage', goal: 30, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 10, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 10, unit: 'REPS' },
            { type: 'RUN', label: 'Course', goal: 1, unit: 'KILOMETERS' },
            { type: 'PLANK', label: 'Gainage', goal: 60, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 20, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 20, unit: 'REPS' },
            { type: 'RUN', label: 'Course', goal: 2, unit: 'KILOMETERS' },
            { type: 'PLANK', label: 'Gainage', goal: 90, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 30, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 30, unit: 'REPS' },
            { type: 'RUN', label: 'Course', goal: 3, unit: 'KILOMETERS' },
            { type: 'PLANK', label: 'Gainage', goal: 90, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 30, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 30, unit: 'REPS' },
            { type: 'RUN', label: 'Course', goal: 2, unit: 'KILOMETERS' },
            { type: 'PLANK', label: 'Gainage', goal: 60, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 20, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 20, unit: 'REPS' },
            { type: 'RUN', label: 'Course', goal: 1, unit: 'KILOMETERS' },
            { type: 'PLANK', label: 'Gainage', goal: 30, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats', goal: 10, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes', goal: 10, unit: 'REPS' }
        ],
        scoringType: 'TIME',
        xpBonus: 1000
    },
    // ═══════════════════════════════════════════════════
    // SÉRIE KHÉOPS — Pyramides Khéops
    // ═══════════════════════════════════════════════════
    {
        id: 'workout-04-kheops-pompes',
        slug: 'kheops-pompes',
        name: 'Khéops — Pompes',
        description: '225 pompes en pyramide : montée de 1 à 15, descente de 14 à 1.',
        date: '2026-05-01',
        endDate: '2026-05-31',
        exercises: [
            ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => ({
                type: 'PUSHUPS' as const, label: `Pompes ×${n}`, goal: n, unit: 'REPS' as const
            }))
        ],
        scoringType: 'TIME',
        xpBonus: 750
    },
    {
        id: 'workout-05-kheops-squats',
        slug: 'kheops-squats',
        name: 'Khéops — Squats',
        description: '225 squats en pyramide : montée de 1 à 15, descente de 14 à 1.',
        date: '2026-05-01',
        endDate: '2026-05-31',
        exercises: [
            ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => ({
                type: 'SQUATS' as const, label: `Squats ×${n}`, goal: n, unit: 'REPS' as const
            }))
        ],
        scoringType: 'TIME',
        xpBonus: 700
    },
    {
        id: 'workout-06-kheops-tractions',
        slug: 'kheops-tractions',
        name: 'Khéops — Tractions',
        description: '100 tractions en pyramide : montée de 1 à 10, descente de 9 à 1. Pour élites seulement.',
        date: '2026-05-01',
        endDate: '2026-05-31',
        exercises: [
            ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => ({
                type: 'PULLUPS' as const, label: `Tractions ×${n}`, goal: n, unit: 'REPS' as const
            }))
        ],
        scoringType: 'TIME',
        xpBonus: 900
    },
    {
        id: 'workout-07-kheops-gainage',
        slug: 'kheops-gainage',
        name: 'Khéops — Gainage',
        description: '720s cumulées de gainage (12 min) en pyramide de 5s en 5s. Rappel : 5s = 1 unité d\'effort.',
        date: '2026-05-01',
        endDate: '2026-05-31',
        exercises: [
            ...[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 55, 50, 45, 40, 35, 30, 25, 20, 15, 10, 5].map(n => ({
                type: 'PLANK' as const, label: `Gainage ${n}s`, goal: n, unit: 'SECONDS' as const
            }))
        ],
        scoringType: 'TIME',
        xpBonus: 650
    },
    {
        id: 'workout-08-kheops-fullbody',
        slug: 'kheops-fullbody',
        name: 'Khéops — Full Body',
        description: 'Le défi ultime : pyramide de 1à 10 (étage X = X pompes + X squats + X tractions + X×5s gainage). 100+100+100+500s.',
        date: '2026-05-01',
        endDate: '2026-05-31',
        exercises: [
            ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].flatMap(n => [
                { type: 'PUSHUPS' as const, label: `Pompes ×${n}`, goal: n, unit: 'REPS' as const },
                { type: 'SQUATS' as const, label: `Squats ×${n}`, goal: n, unit: 'REPS' as const },
                { type: 'PULLUPS' as const, label: `Tractions ×${n}`, goal: n, unit: 'REPS' as const },
                { type: 'PLANK' as const, label: `Gainage ${n * 5}s`, goal: n * 5, unit: 'SECONDS' as const },
            ])
        ],
        scoringType: 'TIME',
        xpBonus: 1000
    }
];
