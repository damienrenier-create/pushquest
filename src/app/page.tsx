import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import ChallengeDashboard from "@/components/ChallengeDashboard"
import SimpleRepsDashboard from "@/components/SimpleRepsDashboard"

export const dynamic = "force-dynamic"

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  // Invité : par défaut PAS de dashboard (son aventure se joue dans le Nexus Jaune) → redirigé vers le jeu.
  //   EXCEPTION : accès EXPLICITE via ?dashboard=1 (bouton « 📊 Encoder mes reps » du jeu) → il peut logger ses
  //   séances ET tenter les défis du Prof Chen. Le comportement par défaut (redirect invité) reste inchangé.
  const sp = await searchParams
  if ((session.user as any)?.isGuest === true && sp?.dashboard !== "1") {
    redirect("/gamebook/yellow")
  }

  // Comptes "fun" (lien nexus-fun-2026) : interface muscu ULTRA-simplifiée (encodage + objectif + retour Nexus).
  //   Le gameMode n'est pas dans la session NextAuth → lecture directe. Tous les autres comptes = dashboard complet inchangé.
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id as string }, select: { gameMode: true } })
  if (dbUser?.gameMode === "fun") {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <SimpleRepsDashboard />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <ChallengeDashboard />
    </main>
  )
}
