import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BadgesClient from "./BadgesClient";

export default async function BadgesPage() {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const userId = session.user.id;

    // Current user's badges
    const ownedBadges = await prisma.badgeOwnership.findMany({
        where: { currentUserId: userId },
        include: { badge: true },
        orderBy: { achievedAt: "desc" },
    });

    // All users with their badges (for Vitrine)
    const allUsersWithBadges = await prisma.user.findMany({
        where: {
            nickname: { not: 'modo' },
            badges: { some: {} }
        },
        select: {
            id: true,
            nickname: true,
            badges: {
                include: {
                    badge: true,
                    currentUser: {
                        select: { nickname: true }
                    }
                },
                orderBy: { achievedAt: "desc" }
            }
        }
    });

    return (
        <div className="max-w-6xl mx-auto p-4 space-y-8 pb-20">
            <header className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                        Le Panthéon <span className="text-indigo-500">des Badges</span>
                    </h1>
                    <p className="mt-2 text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Exploits, distinctions et vitrine de la gloire.
                    </p>
                </div>
                <Link
                    href="/"
                    className="w-full sm:w-auto px-6 py-3 text-xs font-black uppercase tracking-widest text-white bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 shadow-xl"
                >
                    ← Retour
                </Link>
            </header>

            <BadgesClient
                ownedBadges={ownedBadges as any}
                allUsersWithBadges={allUsersWithBadges as any}
                currentUserId={userId}
            />
        </div>
    );
}
