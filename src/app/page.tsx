import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import ChallengeDashboard from "@/components/ChallengeDashboard"

export const dynamic = "force-dynamic"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect("/login")
  }

  // Invité : pas de dashboard PushQuest — son aventure se joue dans le Nexus Jaune.
  if ((session.user as any)?.isGuest === true) {
    redirect("/gamebook/yellow")
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <ChallengeDashboard />
    </main>
  )
}
