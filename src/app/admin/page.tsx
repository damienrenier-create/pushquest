import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user?.isAdmin) {
        redirect("/");
    }

    const { q } = await searchParams;
    let targetUser = null;

    if (q) {
        targetUser = await (prisma as any).user.findUnique({
            where: { nickname: q },
            include: {
                sets: {
                    orderBy: { createdAt: "desc" },
                    take: 20,
                },
                fines: {
                    orderBy: { date: "desc" },
                    take: 20,
                },
            },
        });
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-8 pb-20">
            <header className="space-y-2">
                <h1 className="text-3xl font-black uppercase italic text-gray-900 tracking-tighter">
                    Administration <span className="text-red-600">Modérateur</span>
                </h1>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Recherche et modération des soldats
                </p>
            </header>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <form className="flex gap-2">
                    <input
                        type="text"
                        name="q"
                        defaultValue={q || ""}
                        placeholder="Pseudo du soldat..."
                        className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 font-bold outline-none transition-all"
                    />
                    <button
                        type="submit"
                        className="bg-gray-900 text-white font-black px-6 py-3 rounded-2xl hover:bg-black transition-colors uppercase text-xs tracking-widest"
                    >
                        Chercher
                    </button>
                </form>
            </section>

            {q && !targetUser && (
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 font-bold text-center">
                    Soldat "{q}" introuvable.
                </div>
            )}

            {targetUser && (
                <AdminClient user={targetUser} />
            )}
        </div>
    );
}
