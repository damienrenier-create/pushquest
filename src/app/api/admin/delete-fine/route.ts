import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user?.isAdmin) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { fineId } = await req.json();

        if (!fineId) {
            return NextResponse.json({ message: "ID manquant" }, { status: 400 });
        }

        await (prisma as any).fineRecord.delete({
            where: { id: fineId }
        });

        return NextResponse.json({ message: "Amende supprimée avec succès" });

    } catch (error) {
        console.error("Admin Delete Fine Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
