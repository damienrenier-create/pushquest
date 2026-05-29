import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { SPECIAL_WORKOUTS } from "@/config/specialWorkouts"
import { BADGE_DEFINITIONS } from "@/config/badges"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 })
        }

        const { workoutId, data, completionTime, date, proofUrl } = await req.json()

        if (!workoutId || !data || !date) {
            return NextResponse.json({ message: "Données manquantes" }, { status: 400 })
        }

        // --- DB SEED CHECK (Ensure dynamic badge definitions exist in DB) ---
        const workoutKeys = [`workout_${workoutId}_std`, `workout_${workoutId}_plat` ];
        for (const k of workoutKeys) {
            const def = BADGE_DEFINITIONS.find(d => d.key === k);
            if (def) {
                await prisma.badgeDefinition.upsert({
                    where: { key: k },
                    create: {
                        key: def.key,
                        name: def.name,
                        description: def.description,
                        emoji: def.emoji,
                        metricType: def.metricType,
                        exerciseScope: def.exerciseScope,
                        isUnique: def.isUnique || false,
                        isTransferable: def.isTransferable !== false
                    },
                    update: {
                        name: def.name,
                        description: def.description,
                        emoji: def.emoji
                    }
                });
            }
        }

        const userId = session.user.id;

        // Lookup workout config once (used for scoring direction, XP bonus, platinum bonus)
        const workout = SPECIAL_WORKOUTS.find(w => w.id === workoutId);

        // 1. Save or Update the workout entry
        // EMOM (slug "wod-emom*") : score = nombre de minutes tenues (higher = better) → totalScore positif
        // Autres défis : score = temps de réalisation (lower time = better) → totalScore = -completionTime
        const isEmom = workout?.slug?.startsWith('wod-emom') ?? false;
        const totalScoreValue = completionTime
            ? (isEmom ? completionTime : -completionTime)
            : 0;

        const entry = await prisma.specialWorkoutEntry.upsert({
            where: { userId_workoutId: { userId, workoutId } },
            create: {
                userId,
                workoutId,
                data,
                completionTime,
                proofUrl,
                date,
                totalScore: totalScoreValue
            },
            update: {
                data,
                completionTime,
                proofUrl,
                date,
                totalScore: totalScoreValue
            }
        });

        // 2. Dynamic Badge Keys
        const participationBadgeKey = `workout_${workoutId}_std`;
        const platinumBadgeKey = `workout_${workoutId}_plat`;

        // 3. Assign Participation Badge (everyone who completes it)
        // FIX: Use BadgeEvent instead of BadgeOwnership to allow multiple participants
        const existingParticipation = await prisma.badgeEvent.findFirst({
            where: {
                badgeKey: participationBadgeKey,
                toUserId: userId,
                eventType: "UNIQUE_AWARDED"
            }
        });

        if (!existingParticipation) {
            await prisma.badgeEvent.create({
                data: {
                    badgeKey: participationBadgeKey,
                    toUserId: userId,
                    fromUserId: null,
                    eventType: "UNIQUE_AWARDED",
                    newValue: 1,
                    previousValue: 0
                }
            });
        }

        // 4. Handle Platinum Badge (Record Holder - Transferable)
        const bestEntry = await prisma.specialWorkoutEntry.findFirst({
            where: { workoutId },
            orderBy: { totalScore: 'desc' }
        });

        if (bestEntry && bestEntry.userId === userId) {
            // Capture previous holder BEFORE updating ownership, to transfer platinum XP if needed
            const previousBadge = await prisma.badgeOwnership.findUnique({
                where: { badgeKey: platinumBadgeKey }
            });
            const previousHolderId = previousBadge?.currentUserId ?? null;

            // Update or Reassign the record badge to the current winner
            await prisma.badgeOwnership.upsert({
                where: {
                    badgeKey: platinumBadgeKey
                },
                create: {
                    badgeKey: platinumBadgeKey,
                    currentUserId: userId,
                    currentValue: entry.totalScore || 0,
                    achievedAt: new Date()
                },
                update: {
                    currentUserId: userId,
                    currentValue: entry.totalScore || 0,
                    achievedAt: new Date()
                }
            });

            // Transferable platinum XP bonus : ancien holder perd le bonus, nouveau le gagne
            const xpPlatBonus = workout?.xpPlatinumBonus ?? 0;
            if (xpPlatBonus > 0 && previousHolderId !== userId) {
                const platReason = `Record Platine: ${workout?.name ?? workoutId}`;
                if (previousHolderId) {
                    await prisma.xpAdjustment.create({
                        data: {
                            userId: previousHolderId,
                            amount: -xpPlatBonus,
                            reason: `${platReason} (transféré au nouveau record)`,
                            date
                        }
                    });
                }
                await prisma.xpAdjustment.create({
                    data: {
                        userId,
                        amount: xpPlatBonus,
                        reason: platReason,
                        date
                    }
                });
            }
        }

        // 5. XP Reward Logic (participation XP, une seule fois par user/workout)
        if (workout) {
            const reason = `Special Workout: ${workout.name}`;
            const existingAdj = await prisma.xpAdjustment.findFirst({
                where: { userId, reason }
            });

            if (!existingAdj) {
                await prisma.xpAdjustment.create({
                    data: {
                        userId,
                        amount: workout.xpBonus || 1000,
                        reason,
                        date: date
                    }
                });
            }
        }

        // 6. Retroactive Check for OTHERS (Optional but good: check if anyone else is missing XP)
        // For simplicity, we just handle the current user. 
        // If Mools submits again, he'll get his XP.

        return NextResponse.json({ 
            entry, 
            message: "Entraînement et badges mis à jour avec succès !" 
        }, { status: 200 })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { message: "Erreur lors de l'enregistrement de l'entraînement" },
            { status: 500 }
        )
    }
}
