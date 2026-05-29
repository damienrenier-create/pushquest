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
    /** Bonus XP transférable qui accompagne le badge platine du record holder.
     *  Si quelqu'un bat le record, l'ancien holder perd ce XP et le nouveau le gagne. */
    xpPlatinumBonus?: number;
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
            // Étape 1 (Base)
            { type: 'PLANK', label: 'Gainage 30s', goal: 30, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats x10', goal: 10, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes x10', goal: 10, unit: 'REPS' },
            { type: 'RUN', label: 'Course 1km', goal: 1, unit: 'KILOMETERS' },
            // Étape 2 (2x Base)
            { type: 'PLANK', label: 'Gainage 60s', goal: 60, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats x20', goal: 20, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes x20', goal: 20, unit: 'REPS' },
            { type: 'RUN', label: 'Course 2km', goal: 2, unit: 'KILOMETERS' },
            // Étape 3 (3x Base - SOMMET)
            { type: 'PLANK', label: 'Gainage 90s', goal: 90, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats x30', goal: 30, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes x30', goal: 30, unit: 'REPS' },
            { type: 'RUN', label: 'Course 3km', goal: 3, unit: 'KILOMETERS' },
            // Étape 4 (2x Base)
            { type: 'PLANK', label: 'Gainage 60s', goal: 60, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats x20', goal: 20, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes x20', goal: 20, unit: 'REPS' },
            { type: 'RUN', label: 'Course 2km', goal: 2, unit: 'KILOMETERS' },
            // Étape 5 (Base)
            { type: 'PLANK', label: 'Gainage 30s', goal: 30, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats x10', goal: 10, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes x10', goal: 10, unit: 'REPS' },
            { type: 'RUN', label: 'Course 1km', goal: 1, unit: 'KILOMETERS' }
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
        endDate: '2026-06-30',
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
        endDate: '2026-06-30',
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
        endDate: '2026-06-30',
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
        endDate: '2026-06-30',
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
        endDate: '2026-06-30',
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
    },
    // ═══════════════════════════════════════════════════
    // SÉRIE WOD — Workouts of the Day CrossFit-style (v4.0, 2026-05-27)
    // ═══════════════════════════════════════════════════
    {
        id: 'workout-09-wod-emom',
        slug: 'wod-emom-last-stand',
        name: 'WOD 1 — EMOM 10',
        description: 'Chaque minute, ON THE MINUTE : 10s de gainage + 10 squats + 10 pompes. Le reste de la minute = repos. Refais le cycle tant que tu tiens. Saisis le nombre de minutes complètes tenues (1 à 100).',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'PLANK', label: 'Gainage 10s', goal: 10, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats ×10', goal: 10, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes ×10', goal: 10, unit: 'REPS' },
        ],
        scoringType: 'REPS',
        xpBonus: 350,
        xpPlatinumBonus: 100,
    },
    {
        id: 'workout-09b-wod-emom-12',
        slug: 'wod-emom-12',
        name: 'WOD 1b — EMOM 12',
        description: 'Chaque minute, ON THE MINUTE : 12s de gainage + 12 squats + 12 pompes. Le reste de la minute = repos. Refais le cycle tant que tu tiens. Saisis le nombre de minutes complètes tenues (1 à 100).',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'PLANK', label: 'Gainage 12s', goal: 12, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats ×12', goal: 12, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes ×12', goal: 12, unit: 'REPS' },
        ],
        scoringType: 'REPS',
        xpBonus: 500,
        xpPlatinumBonus: 150,
    },
    {
        id: 'workout-09c-wod-emom-15',
        slug: 'wod-emom-15',
        name: 'WOD 1c — EMOM 15',
        description: 'Chaque minute, ON THE MINUTE : 15s de gainage + 15 squats + 15 pompes. Le reste de la minute = repos. Refais le cycle tant que tu tiens. Saisis le nombre de minutes complètes tenues (1 à 100).',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'PLANK', label: 'Gainage 15s', goal: 15, unit: 'SECONDS' },
            { type: 'SQUATS', label: 'Squats ×15', goal: 15, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes ×15', goal: 15, unit: 'REPS' },
        ],
        scoringType: 'REPS',
        xpBonus: 700,
        xpPlatinumBonus: 300,
    },
    {
        id: 'workout-10-wod-five-rounds',
        slug: 'wod-five-rounds-finisher',
        name: 'WOD 2 — Five Rounds + 100',
        description: '(1 km course + 100 cordes à sauter + 50 squats) × 5 tours. Puis 100 pompes en finisher. Au chrono — le plus rapide gagne.',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            ...Array.from({ length: 5 }).flatMap((_, i) => [
                { type: 'RUN' as const, label: `Course 1km (tour ${i + 1}/5)`, goal: 1, unit: 'KILOMETERS' as const },
                { type: 'JUMP_ROPE' as const, label: `Corde ×100 (tour ${i + 1}/5)`, goal: 100, unit: 'REPS' as const },
                { type: 'SQUATS' as const, label: `Squats ×50 (tour ${i + 1}/5)`, goal: 50, unit: 'REPS' as const },
            ]),
            { type: 'PUSHUPS', label: 'Pompes ×100 (finisher)', goal: 100, unit: 'REPS' },
        ],
        scoringType: 'TIME',
        xpBonus: 1200,
    },
    {
        id: 'workout-11-wod-abc-cycles',
        slug: 'wod-abc-cycles',
        name: 'WOD 3 — Cycles A/B/C',
        description: 'A : 6 burpees en 1 min · B : 12 squats en 1 min · C : 18 cordes à sauter en 1 min. Enchaîne A-B-C en cycles continus. Fais-en le plus possible.',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'BURPEES', label: 'Burpees ×6 (1 min)', goal: 6, unit: 'REPS' },
            { type: 'SQUATS', label: 'Squats ×12 (1 min)', goal: 12, unit: 'REPS' },
            { type: 'JUMP_ROPE', label: 'Corde ×18 (1 min)', goal: 18, unit: 'REPS' },
        ],
        scoringType: 'REPS',
        xpBonus: 650,
    },
    {
        id: 'workout-12-wod-ladder-pullups',
        slug: 'wod-ladder-tractions',
        name: 'WOD 4 — Ladder Tractions (20 min)',
        description: '300 cordes à sauter + 200 squats + 100 pompes — PUIS max tractions sur le temps restant. Total imparti : 20 minutes. Score = nombre de tractions sur le finisher.',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'JUMP_ROPE', label: 'Corde ×300', goal: 300, unit: 'REPS' },
            { type: 'SQUATS', label: 'Squats ×200', goal: 200, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes ×100', goal: 100, unit: 'REPS' },
            { type: 'PULLUPS', label: 'Tractions (max sur temps restant)', unit: 'REPS' },
        ],
        scoringType: 'REPS',
        xpBonus: 1100,
    },
    {
        id: 'workout-13-wod-mountain-sprint',
        slug: 'wod-mountain-sprint',
        name: 'WOD 5 — Mountain Sprint',
        description: '200 mètres de dénivelé positif (gros mollets) + 200 squats. Le plus rapidement possible. Saisis le D+ dans le champ "Course" en mètres.',
        date: '2026-05-27',
        endDate: '2026-08-31',
        exercises: [
            { type: 'RUN', label: 'Dénivelé positif (200 m)', goal: 200, unit: 'METERS' },
            { type: 'SQUATS', label: 'Squats ×200', goal: 200, unit: 'REPS' },
        ],
        scoringType: 'TIME',
        xpBonus: 950,
    },
    // ═══════════════════════════════════════════════════
    // 🎖️ MURPH (Hero WOD) — semaine du 2026-06-06
    // ═══════════════════════════════════════════════════
    {
        id: 'workout-14-murph',
        slug: 'murph-d-day',
        name: 'MURPH — D-Day',
        description: 'Le Hero WOD. 1,6 km course + 100 tractions + 200 pompes + 300 squats + 1,6 km course. ORDRE STRICT — un exo doit être complété avant le suivant. Au chrono. Honore les fallen.',
        date: '2026-06-06',
        endDate: '2026-06-13',
        exercises: [
            { type: 'RUN', label: 'Course 1,6 km (mile 1)', goal: 1.6, unit: 'KILOMETERS' },
            { type: 'PULLUPS', label: 'Tractions ×100', goal: 100, unit: 'REPS' },
            { type: 'PUSHUPS', label: 'Pompes ×200', goal: 200, unit: 'REPS' },
            { type: 'SQUATS', label: 'Squats ×300', goal: 300, unit: 'REPS' },
            { type: 'RUN', label: 'Course 1,6 km (mile 2)', goal: 1.6, unit: 'KILOMETERS' },
        ],
        scoringType: 'TIME',
        xpBonus: 2500,
    },
];
