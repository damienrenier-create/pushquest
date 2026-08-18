import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChallengeDashboard from "@/components/ChallengeDashboard"

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

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <ChallengeDashboard />
    </main>
  )
}
