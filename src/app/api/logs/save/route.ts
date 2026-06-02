import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getAllowedEncodingDates, getDailyTargetForUserOnDate } from "@/lib/challenge";
import { GIFT_RECIPIENT_ID, isGiftDateAllowed } from "@/lib/gift";
import { setEffort } from "@/lib/quota";
import { initBadges } from "@/lib/badges";
import { BADGE_DEFINITIONS } from "@/config/badges";
import { updateBadgesPostSave } from "@/lib/badges";
import { checkAndClaimTorch } from "@/lib/torch";
import { calculateAllUsersXP } from "@/lib/xp";
import { captureRepsSnapshot, detectRepsDropAndPenalize } from "@/lib/gamebook/antiCheat";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const body = await req.json();
        const { date, sets, offeredTo } = body;

        if (!date || !sets) {
            return NextResponse.json({ message: "Données manquantes" }, { status: 400 });
        }

        const allowedDates = getAllowedEncodingDates();
        if (!allowedDates.includes(date)) {
            return NextResponse.json({ message: "Date non autorisée" }, { status: 403 });
        }

        const userId = session.user.id;
        const league = (session.user as any).league || "POMPES";

        // --- Mode CADEAU : reps offertes à Milka (comptent dans le volume du donneur, remplissent le quota de Milka) ---
        const isGift = !!offeredTo;
        const offeredToUserId: string | null = isGift ? GIFT_RECIPIENT_ID : null;
        if (isGift) {
            if (offeredTo !== GIFT_RECIPIENT_ID) {
                return NextResponse.json({ message: "Bénéficiaire de cadeau invalide" }, { status: 400 });
            }
            if (userId === GIFT_RECIPIENT_ID) {
                return NextResponse.json({ message: "Milka ne peut pas s'offrir des reps à lui-même" }, { status: 403 });
            }
            if (!isGiftDateAllowed(date)) {
                return NextResponse.json({ message: "Hors période du cadeau (12/06 → 12/08)" }, { status: 403 });
            }
            // Cap : on ne peut pas offrir plus que le quota du jour de Milka (déduction faite de ce qu'il a déjà + cadeaux des autres)
            const milka = await (prisma as any).user.findUnique({
                where: { id: GIFT_RECIPIENT_ID },
                include: { sets: { where: { date } } },
            });
            const milkaQuota = getDailyTargetForUserOnDate(milka, date);
            const milkaOwn = (milka?.sets || []).filter((s: any) => !s.offeredToUserId).reduce((a: number, s: any) => a + setEffort(s), 0);
            const giftsAll = await (prisma as any).exerciseSet.findMany({ where: { date, offeredToUserId: GIFT_RECIPIENT_ID } });
            const giftsFromOthers = giftsAll.filter((s: any) => s.userId !== userId).reduce((a: number, s: any) => a + setEffort(s), 0);
            const maxOfferable = Math.max(0, milkaQuota - milkaOwn - giftsFromOthers);

            const submissionEffort =
                (sets.pushups || []).reduce((a: number, r: number) => a + (Number(r) || 0), 0) +
                (sets.pullups || []).reduce((a: number, r: number) => a + (Number(r) || 0), 0) +
                (sets.squats || []).reduce((a: number, r: number) => a + (Number(r) || 0), 0) +
                Math.floor((sets.planks || []).reduce((a: number, r: number) => a + (Number(r) || 0), 0) / 5);

            if (submissionEffort > maxOfferable) {
                return NextResponse.json({
                    message: `Tu peux offrir au maximum ${maxOfferable} reps à Milka aujourd'hui (son quota est presque rempli).`,
                    maxOfferable,
                }, { status: 400 });
            }
        }

        // v3.6 — Snapshot AVANT delete+create pour détecter une baisse de reps sur cette date
        const cheatSnapshot = await captureRepsSnapshot(userId, [date]);

        // 1. Pre-calculate XP to intercept Level Up (BEFORE transaction)
        const allUsersOld = await (prisma as any).user.findMany({
            where: { league, isSystem: false },
            include: { sets: true, xpAdjustments: true }
        });
        const badgeOwnershipsOld = await (prisma as any).badgeOwnership.findMany();
        const allEvents = await (prisma as any).badgeEvent.findMany();
        const allXpOld = await calculateAllUsersXP(allUsersOld, badgeOwnershipsOld, undefined, allEvents);
        const oldXp = allXpOld.find(x => x.id === userId);

        // 2. Transaction: delete existing for this date and user, then create new
        await (prisma as any).$transaction([
            // delete scopé : ne touche QUE les reps du même type (normales OU offertes), pour ne pas s'écraser mutuellement
            (prisma as any).exerciseSet.deleteMany({
                where: { userId, date, offeredToUserId }
            }),
            (prisma as any).exerciseSet.createMany({
                data: [
                    ...(sets.pushups || []).map((reps: number) => ({ userId, date, exercise: "PUSHUP", reps: Math.min(500, Math.max(0, Number(reps) || 0)), offeredToUserId })),
                    ...(sets.pullups || []).map((reps: number) => ({ userId, date, exercise: "PULLUP", reps: Math.min(500, Math.max(0, Number(reps) || 0)), offeredToUserId })),
                    ...(sets.squats || []).map((reps: number) => ({ userId, date, exercise: "SQUAT", reps: Math.min(500, Math.max(0, Number(reps) || 0)), offeredToUserId })),
                    ...(sets.planks || []).map((reps: number) => ({ userId, date, exercise: "PLANK", reps: Math.min(7200, Math.max(0, Number(reps) || 0)), offeredToUserId })),
                ]
            })
        ]);

        // 3. Trigger badge calculation
        await updateBadgesPostSave(userId);
        // Le flambeau (torch) récompense la perf quotidienne du joueur : on ne le déclenche pas sur un cadeau
        if (!isGift) await checkAndClaimTorch(userId, date);

        // 4. Check for Level Up/Down for ALL users (since badges could be stolen from others)
        const allUsersNew = await (prisma as any).user.findMany({
            where: { league, isSystem: false },
            include: { sets: true, xpAdjustments: true }
        });
        const badgeOwnershipsNew = await (prisma as any).badgeOwnership.findMany();
        const allXpNew = await calculateAllUsersXP(allUsersNew, badgeOwnershipsNew, undefined, allEvents);

        for (const newXp of allXpNew) {
            const oldXp = allXpOld.find((x: any) => x.id === newXp.id);
            if (oldXp && newXp.level !== oldXp.level) {
                const isLevelUp = newXp.level > oldXp.level;
                const xpDiff = newXp.totalXP - oldXp.totalXP;

                const reasonsArr = [];

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

        // v3.6 — Détection anti-triche : si le total reps du jour a baissé → freeze Gamebook
        // (désactivé pour les cadeaux : ajouter/retirer des reps offertes ne doit pas pénaliser)
        const cheatResult = isGift ? { triggered: false } : await detectRepsDropAndPenalize(userId, cheatSnapshot);

        return NextResponse.json({
            message: "Séries enregistrées ✅",
            ...(cheatResult.triggered ? { gamebookPenaltyTriggered: true } : {}),
        });

    } catch (error) {
        console.error("Save Logs Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
