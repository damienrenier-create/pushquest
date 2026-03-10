import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const certs = await (prisma.medicalCertificate as any).findMany({
            where: { userId: session.user.id },
            orderBy: { startDateISO: "desc" }
        });

        return NextResponse.json(certs);
    } catch (error) {
        console.error("Medical Certs GET Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
        }

        const { startDateISO, endDateISO, note } = await req.json();
        const userId = session.user.id;

        // Validation simple des dates
        if (!startDateISO || !endDateISO) {
            return NextResponse.json({ message: "Dates manquantes" }, { status: 400 });
        }

        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Vérifier si un certificat existe déjà pour ce mois de création
        const existing = await (prisma.medicalCertificate as any).findUnique({
            where: {
                userId_createdMonthKey: {
                    userId,
                    createdMonthKey: monthKey
                }
            }
        });

        if (existing) {
            // Mise à jour de la date de fin uniquement
            const updated = await (prisma.medicalCertificate as any).update({
                where: { id: existing.id },
                data: { endDateISO, note: note || existing.note }
            });
            return NextResponse.json({ message: "Certificat mis à jour", cert: updated });
        } else {
            // Création d'un nouveau certificat
            const created = await (prisma.medicalCertificate as any).create({
                data: {
                    userId,
                    startDateISO,
                    endDateISO,
                    createdMonthKey: monthKey,
                    note
                }
            });
            return NextResponse.json({ message: "Certificat créé", cert: created });
        }
    } catch (error) {
        console.error("Medical Certs POST Error:", error);
        return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
    }
}
