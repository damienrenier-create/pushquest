import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ─── POST — Publier un pari DRAFT → OPEN (admin) ─────────────────────────────

export async function POST(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }
        if (!(session.user as any).isAdmin) {
            return NextResponse.json({ message: "Accès admin requis" }, { status: 403 });
        }

        const { id } = params;

        const bet = await (prisma as any).bet.findUnique({ where: { id } });

        if (!bet) {
            return NextResponse.json({ message: "Pari introuvable" }, { status: 404 });
        }
        if (bet.status !== "DRAFT") {
            return NextResponse.json({ message: `Impossible de publier un pari en statut "${bet.status}" — statut DRAFT requis` }, { status: 400 });
        }
        if (!bet.closeAt || new Date(bet.closeAt) <= new Date()) {
            return NextResponse.json({ message: "closeAt doit être dans le futur pour pouvoir publier" }, { status: 400 });
        }

        const updated = await (prisma as any).bet.update({
            where: { id },
            data: {
                status: "OPEN",
                openAt: new Date(),
            }
        });

        const options = (() => {
            try { return JSON.parse(updated.options); } catch { return []; }
        })();

        return NextResponse.json({ ...updated, options });

    } catch (error) {
        console.error("POST /api/bets/[id]/publish error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
