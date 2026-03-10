import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllowedEncodingDates } from "@/lib/challenge";
import { initBadges } from "@/lib/badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { updateBadgesPostSave } from "@/lib/badges";
import { calculateAllUsersXP } from "@/lib/xp";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { date, sets } = body;

        if (!date || !sets) {
            return NextResponse.json({ message: "Données manquantes" }, { status: 400 });
        }

        const allowedDates = getAllowedEncodingDates();
        if (!allowedDates.includes(date)) {
            return NextResponse.json({ message: "Date non autorisée" }, { status: 403 });
        }

        const userId = session.user.id;
        const league = (session.user as any).league || "POMPES";

        // 1. Pre-calculate XP to intercept Level Up (BEFORE transaction)
        const allUsersOld = await (prisma as any).user.findMany({
            where: { league },
            include: { sets: true, xpAdjustments: true }
        });
        const badgeOwnershipsOld = await (prisma as any).badgeOwnership.findMany();
        const allXpOld = calculateAllUsersXP(allUsersOld, badgeOwnershipsOld);
        const oldXp = allXpOld.find(x => x.id === userId);

        // 2. Transaction: delete existing for this date and user, then create new
        await (prisma as any).$transaction([
            (prisma as any).exerciseSet.deleteMany({
                where: { userId, date }
            }),
            (prisma as any).exerciseSet.createMany({
                data: [
                    ...(sets.pushups || []).map((reps: number) => ({ userId, date, exercise: "PUSHUP", reps: Math.min(500, Math.max(0, Number(reps) || 0)) })),
                    ...(sets.pullups || []).map((reps: number) => ({ userId, date, exercise: "PULLUP", reps: Math.min(500, Math.max(0, Number(reps) || 0)) })),
                    ...(sets.squats || []).map((reps: number) => ({ userId, date, exercise: "SQUAT", reps: Math.min(500, Math.max(0, Number(reps) || 0)) })),
                ]
            })
        ]);

        // 3. Trigger badge calculation
        await updateBadgesPostSave(userId);

        // 4. Check for Level Up/Down for ALL users (since badges could be stolen from others)
        const allUsersNew = await (prisma as any).user.findMany({
            where: { league },
            include: { sets: true, xpAdjustments: true }
        });
        const badgeOwnershipsNew = await (prisma as any).badgeOwnership.findMany();
        const allXpNew = calculateAllUsersXP(allUsersNew, badgeOwnershipsNew);

        for (const newXp of allXpNew) {
            const oldXp = allXpOld.find((x: any) => x.id === newXp.id);
            if (oldXp && newXp.level !== oldXp.level) {
                const isLevelUp = newXp.level > oldXp.level;
                const xpDiff = newXp.totalXP - oldXp.totalXP;

                let reasonsArr = [];

                if (newXp.details.repsXP !== oldXp.details.repsXP) {
                    const diff = newXp.details.repsXP - oldXp.details.repsXP;
                    reasonsArr.push(`un entraînement acharné (${diff > 0 ? '+' : ''}${Math.round(diff)} XP)`);
                }
                if (newXp.details.badgesXP !== oldXp.details.badgesXP) {
                    const diff = newXp.details.badgesXP - oldXp.details.badgesXP;
                    reasonsArr.push(`un trophée (${diff > 0 ? '+' : ''}${Math.round(diff)} XP)`);
                }
                if (newXp.details.flexXP !== oldXp.details.flexXP) {
                    const diff = newXp.details.flexXP - oldXp.details.flexXP;
                    reasonsArr.push(`un bonus de régularité Flex (${diff > 0 ? '+' : ''}${Math.round(diff)} XP)`);
                }
                if (newXp.details.recordsXP !== oldXp.details.recordsXP) {
                    const diff = newXp.details.recordsXP - oldXp.details.recordsXP;
                    reasonsArr.push(`un record majestueux (${diff > 0 ? '+' : ''}${Math.round(diff)} XP)`);
                }
                if (newXp.details.finesXP !== oldXp.details.finesXP) {
                    const diff = newXp.details.finesXP - oldXp.details.finesXP;
                    reasonsArr.push(`une pénalité financière (${diff > 0 ? '+' : ''}${Math.round(diff)} XP)`);
                }

                let culprit = null;
                if (!isLevelUp) {
                    const latestSteal = await (prisma as any).badgeEvent.findFirst({
                        where: {
                            toUserId: newXp.id,
                            eventType: "STEAL",
                            createdAt: { gte: new Date(Date.now() - 60000) }
                        },
                        include: { fromUser: { select: { nickname: true } } }
                    });
                    if (latestSteal?.fromUser) {
                        culprit = latestSteal.fromUser.nickname;
                    }
                }

                const reason = reasonsArr.length > 0
                    ? `grâce à : ` + reasonsArr.join(", ")
                    : (isLevelUp ? `par l'opération du Saint-Esprit` : `à cause d'une perte d'XP`);

                // Create the event
                await (prisma as any).badgeEvent.create({
                    data: {
                        eventType: isLevelUp ? "LEVEL_UP" : "LEVEL_DOWN",
                        badgeKey: isLevelUp ? "level_up" : "level_down",
                        toUserId: newXp.id,
                        newValue: newXp.level,
                        previousValue: oldXp.level,
                        metadata: JSON.stringify({
                            animal: newXp.animal,
                            emoji: newXp.emoji,
                            xpDiff: Math.round(xpDiff),
                            reason,
                            culprit
                        })
                    }
                });
            }
        }

        return NextResponse.json({ message: "Séries enregistrées ✅" });

    } catch (error) {
        console.error("Save Logs Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
