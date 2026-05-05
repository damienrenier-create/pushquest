import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodayISO } from "@/lib/challenge";
import { calculateWithdrawReturn } from "@/lib/bets";

export const dynamic = "force-dynamic";

// ─── POST — Se retirer avec malus ────────────────────────────────────────────

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    return NextResponse.json(
        { message: "Le retrait de mise n'est pas disponible pour l'instant." },
        { status: 403 }
    );
}
