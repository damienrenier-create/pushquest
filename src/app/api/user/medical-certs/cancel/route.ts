import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ message: "ID manquant" }, { status: 400 });
        }

        const cert = await (prisma as any).medicalCertificate.findUnique({
            where: { id }
        });

        if (!cert) {
            return NextResponse.json({ message: "Certificat introuvable" }, { status: 404 });
        }

        // Only owner or admin can cancel
        if (cert.userId !== user.id && !user.isAdmin) {
            return NextResponse.json({ message: "Action non autorisée" }, { status: 403 });
        }

        await (prisma as any).medicalCertificate.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Certificat annulé avec succès" });

    } catch (error) {
        console.error("Cancel Medical Cert Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
