"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

interface TeamStats {
  total: number
  members: Record<string, number>
}

interface TeamScoreData {
  betId: string
  betTitle: string
  exercise: string
  competitionStart: string
  competitionEnd: string
  jaune: TeamStats
  rouge: TeamStats
  leader: "jaune" | "rouge" | null
  unit: string
}

const EXERCISE_LABELS: Record<string, string> = {
  PUSHUP: "Pompes 💪",
  PULLUP: "Tractions 🏋️",
  SQUAT: "Squats 🦵",
  PLANK: "Gainage 🧘",
}

const TAGLINES: Record<string, string> = {
  PUSHUP: "Les bras qui plient décident du destin.",
  PULLUP: "S'élever ou périr — la gravité ne pardonne pas.",
  SQUAT: "Les jambes portent les empires.",
  PLANK: "La tempête s'en prend aux faibles. Les forts tiennent.",
}

function ScoreCard({ data, title }: { data: TeamScoreData; title: string }) {
  const { jaune, rouge, leader, exercise } = data
  const total = jaune.total + rouge.total

  const formatVal = (v: number) => {
    if (exercise === "PLANK") {
      return `${v.toLocaleString("fr-FR")}s`
    }
    return `${v.toLocaleString("fr-FR")}`
  }

  const isZero = total === 0

  // Calculate percentages
  const jaunePercent = isZero ? 50 : (jaune.total / total) * 100
  const rougePercent = isZero ? 50 : (rouge.total / total) * 100

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-4 font-mono text-sm text-slate-300">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <span className="text-amber-400 font-bold uppercase tracking-wider">
          {EXERCISE_LABELS[exercise] || title}
        </span>
        <div className="flex gap-2 items-center">
          {leader === "jaune" && <span className="text-xs text-yellow-400 font-bold animate-pulse">🟡 🔥 MÈNE</span>}
          {leader === "rouge" && <span className="text-xs text-red-400 font-bold animate-pulse">🔴 🔥 MÈNE</span>}
          {leader === null && !isZero && <span className="text-xs text-slate-400">⚖️ ÉGALITÉ</span>}
        </div>
      </div>

      {/* Tagline */}
      {TAGLINES[exercise] && (
        <p className="text-[11px] text-slate-500 italic">
          &ldquo;{TAGLINES[exercise]}&rdquo;
        </p>
      )}

      {/* Progress Bar or Waiting Message */}
      {isZero ? (
        <div className="bg-stone-950 text-stone-500 text-center py-2 rounded-xl text-xs border border-stone-800 italic">
          En attente du 25 mai
        </div>
      ) : (
        <div className="relative h-4 w-full bg-stone-950 rounded-full overflow-hidden flex gap-px border border-stone-850">
          <div
            className="bg-yellow-500 h-full transition-all duration-500"
            style={{ width: `${jaunePercent}%` }}
          />
          <div
            className="bg-red-500 h-full transition-all duration-500"
            style={{ width: `${rougePercent}%` }}
          />
        </div>
      )}

      {/* Scores Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team Jaune */}
        <div className={`p-3 rounded-xl border ${leader === "jaune" ? "bg-yellow-950/20 border-yellow-500/30" : "bg-stone-950 border-stone-800/60"}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-yellow-400 font-black text-xs">🟡 JAUNE</span>
            {leader === "jaune" && <span className="text-[10px] text-yellow-500 animate-bounce">🔥</span>}
          </div>
          <p className="text-white font-black text-base">{formatVal(jaune.total)}</p>
          <div className="mt-2 space-y-1 border-t border-stone-800/40 pt-1.5">
            {Object.entries(jaune.members)
              .sort((a, b) => b[1] - a[1])
              .map(([name, val]) => (
                <div key={name} className="flex justify-between text-[11px] text-slate-400">
                  <span className="truncate mr-1">{name}</span>
                  <span className="font-bold text-slate-200">{formatVal(val)}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Team Rouge */}
        <div className={`p-3 rounded-xl border ${leader === "rouge" ? "bg-red-950/20 border-red-500/30" : "bg-stone-950 border-stone-800/60"}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-red-400 font-black text-xs">🔴 ROUGE</span>
            {leader === "rouge" && <span className="text-[10px] text-red-500 animate-bounce">🔥</span>}
          </div>
          <p className="text-white font-black text-base">{formatVal(rouge.total)}</p>
          <div className="mt-2 space-y-1 border-t border-stone-800/40 pt-1.5">
            {Object.entries(rouge.members)
              .sort((a, b) => b[1] - a[1])
              .map(([name, val]) => (
                <div key={name} className="flex justify-between text-[11px] text-slate-400">
                  <span className="truncate mr-1">{name}</span>
                  <span className="font-bold text-slate-200">{formatVal(val)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamScoreBoard({ bets }: { bets: any[] }) {
  const [scores, setScores] = useState<Record<string, TeamScoreData>>({})
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Filter team bets
  const teamBets = useMemo(() => {
    return bets.filter(b => {
      try {
        const meta = typeof b.metadata === 'string' ? JSON.parse(b.metadata) : b.metadata
        return meta?.teamBet === true
      } catch {
        return false
      }
    })
  }, [bets])

  const fetchScores = useCallback(async () => {
    if (teamBets.length === 0) return
    try {
      const results = await Promise.all(
        teamBets.map(async (b) => {
          try {
            const res = await fetch(`/api/bets/team-score?betId=${b.id}`)
            if (res.ok) {
              const data = await res.json()
              return { betId: b.id, data }
            }
          } catch (e) {
            console.error("Failed to fetch score for bet", b.id, e)
          }
          return null
        })
      )

      const newScores: Record<string, TeamScoreData> = {}
      for (const res of results) {
        if (res && res.data) {
          newScores[res.betId] = {
            ...res.data,
            betTitle: teamBets.find(tb => tb.id === res.betId)?.title || "",
          }
        }
      }
      setScores(newScores)
      setLastUpdated(new Date())
    } catch (e) {
      console.error("Error fetching team scores:", e)
    } finally {
      setLoading(false)
    }
  }, [teamBets])

  useEffect(() => {
    fetchScores()
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchScores()
      }
    }, 30000)
    return () => clearInterval(intervalId)
  }, [fetchScores])

  if (teamBets.length === 0) return null

  if (loading && Object.keys(scores).length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {teamBets.map((tb) => (
          <div key={tb.id} className="h-48 bg-stone-900/60 rounded-2xl animate-pulse border border-stone-800" />
        ))}
      </div>
    )
  }

  const scoreList = Object.values(scores)
  if (scoreList.length === 0) return null

  // If a clan has 0 reps everywhere, hide scoreboard block as per guidelines
  const hasAnyActivity = scoreList.some(s => s.jaune.total > 0 || s.rouge.total > 0)
  if (!hasAnyActivity) return null

  // Sort score cards in descending order of the leading team's total
  const sortedScoreList = [...scoreList].sort((a, b) => {
    const maxA = Math.max(a.jaune.total, a.rouge.total)
    const maxB = Math.max(b.jaune.total, b.rouge.total)
    return maxB - maxA
  })

  return (
    <div className="mb-8 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-800 pb-2">
        <h3 className="text-amber-400 font-bold uppercase tracking-wider text-xs font-mono">
          ⚔️ Tableau des Scores (Semaine des Équipes)
        </h3>
        {lastUpdated && (
          <span className="text-[10px] text-slate-500 font-mono">
            Màj: {lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedScoreList.map((s) => (
          <ScoreCard key={s.betId} data={s} title={s.betTitle} />
        ))}
      </div>
    </div>
  )
}
