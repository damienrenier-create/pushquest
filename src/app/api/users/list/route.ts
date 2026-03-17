import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateAllUsersXP } from "@/lib/xp";

export async function GET() {
    try {
        const users = await (prisma.user as any).findMany({
            where: {
                nickname: { not: 'modo' }
            },
            include: {
                sets: true,
                xpAdjustments: true,
                badges: true
            }
        });

        const badgeOwnerships = await (prisma as any).badgeOwnership.findMany();
        const xpData = await calculateAllUsersXP(users, badgeOwnerships);

        const userList = xpData.map((u: any) => ({
            nickname: u.nickname,
            animal: u.animal,
            emoji: u.emoji
        }));

        return NextResponse.json(userList);
    } catch (error) {
        console.error("[USERS_LIST_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
