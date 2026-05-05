import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { calculateOddsDisplay } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── GET — Liste des paris OPEN et LOCKED ────────────────────────────────────

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        const userId = (session.user as any).id;

        const bets = await (prisma as any).bet.findMany({
            where: { status: { in: ["OPEN", "LOCKED", "DRAFT", "RESOLVED"] } },
            include: {
                entries: {
                    select: {
                        id: true,
                        userId: true,
                        option: true,
                        xpStaked: true,
                        multiplier: true,
                        ecStaked: true,
                        withdrawn: true,
                        xpReturned: true,
                        placedAt: true,
                    }
                },
                result: true,
            },
            orderBy: { createdAt: "desc" }
        });

        const now = new Date();

        const formatted = bets.map((bet: any) => {
            const options = (() => {
                try { return JSON.parse(bet.options); } catch { return []; }
            })();

            const activeEntries = bet.entries.filter((e: any) => !e.withdrawn);
            const totalPool = activeEntries.reduce((sum: number, e: any) => sum + e.xpStaked, 0)
                - bet.entries.reduce((sum: number, e: any) => sum + (e.xpReturned || 0), 0);

            const oddsDisplay = (bet.status === "OPEN" || bet.status === "LOCKED") && bet.openAt && bet.closeAt
                ? calculateOddsDisplay(options, bet.entries, new Date(bet.openAt), new Date(bet.closeAt), now)
                : [];

            const myEntry = bet.entries.find((e: any) => e.userId === userId) || null;

            return {
                id: bet.id,
                type: bet.type,
                subType: bet.subType,
                title: bet.title,
                description: bet.description,
                options,
                status: bet.status,
                openAt: bet.openAt,
                closeAt: bet.closeAt,
                lockAt: bet.lockAt,
                resolvedAt: bet.resolvedAt,
                resolvedOption: bet.resolvedOption,
                createdAt: bet.createdAt,
                totalPool,
                oddsDisplay,
                myEntry,
                result: bet.result || null,
            };
        });

        return NextResponse.json(formatted);

    } catch (error) {
        console.error("GET /api/bets error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}

// ─── POST — Créer un pari (admin) ─────────────────────────────────────────────

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        if (!(session.user as any).isAdmin) {
            return NextResponse.json({ message: "Accès admin requis" }, { status: 403 });
        }

        const body = await req.json();
        const { type, subType, title, description, options, closeAt, targetUserId } = body;

        // Validations
        if (!type || !title || !options || !closeAt) {
            return NextResponse.json({ message: "Champs requis manquants : type, title, options, closeAt" }, { status: 400 });
        }
        if (!Array.isArray(options) || options.length < 2) {
            return NextResponse.json({ message: "options doit contenir au moins 2 éléments [{ key, label }]" }, { status: 400 });
        }
        for (const opt of options) {
            if (!opt.key || !opt.label) {
                return NextResponse.json({ message: "Chaque option doit avoir key et label" }, { status: 400 });
            }
        }
        if (new Date(closeAt) <= new Date()) {
            return NextResponse.json({ message: "closeAt doit être dans le futur" }, { status: 400 });
        }
        if (type === "DUEL" && !targetUserId) {
            return NextResponse.json({ message: "targetUserId requis pour un pari de type DUEL" }, { status: 400 });
        }

        const bet = await (prisma as any).bet.create({
            data: {
                type,
                subType: subType || "BINARY",
                title,
                description: description || null,
                options: JSON.stringify(options),
                status: "DRAFT",
                closeAt: new Date(closeAt),
                createdByUserId: (session.user as any).id,
                targetUserId: targetUserId || null,
                metadata: null,
            }
        });

        return NextResponse.json({ ...bet, options });

    } catch (error) {
        console.error("POST /api/bets error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
