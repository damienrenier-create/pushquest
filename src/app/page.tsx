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

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <ChallengeDashboard />
    </main>
  )
}
