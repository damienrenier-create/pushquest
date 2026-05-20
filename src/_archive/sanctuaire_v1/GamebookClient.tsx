"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import SanctuaireTab from "./SanctuaireTab"

interface UserStats {
  xpTotal: number
  rivalName: string
  lastWodDate: string
  lastScore: number
  lastExercise: string
  rank: number
  daysStreak: number
}

type Props = {
  nickname: string
  userId: string
}

export default function GamebookClient({ nickname, userId }: Props) {
  const [nexusStats, setNexusStats] = useState<UserStats | null>(null)

  useEffect(() => {
    fetch("/api/user/nexus-stats")
      .then(r => r.json())
      .then(data => setNexusStats(data))
      .catch(() => {})
  }, [])

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au Dashboard
        </Link>
        <span className="text-xs font-mono text-slate-400 tracking-widest">
          /gamebook
        </span>
      </div>

      <SanctuaireTab
        nickname={nickname}
        userId={userId}
        userStats={nexusStats}
      />
    </div>
  )
}
