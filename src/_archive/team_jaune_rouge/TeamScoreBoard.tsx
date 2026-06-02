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

  const scoreList = Object.values(scores)
  const hasAnyActivity = scoreList.length > 0 && scoreList.some(s => s.jaune.total > 0 || s.rouge.total > 0)

  // Sort score cards in descending order of the leading team's total
  const sortedScoreList = [...scoreList].sort((a, b) => {
    const maxA = Math.max(a.jaune.total, a.rouge.total)
    const maxB = Math.max(b.jaune.total, b.rouge.total)
    return maxB - maxA
  })

  // Map all scores keyed by exercise
  const scoresByExercise = useMemo(() => {
    const map: Record<string, TeamScoreData> = {}
    for (const s of Object.values(scores)) {
      map[s.exercise] = s
    }
    return map
  }, [scores])

  const DEFAULT_MEMBERS_JAUNE = { "Xa": 0, "Embi": 0, "Gg": 0 }
  const DEFAULT_MEMBERS_ROUGE = { "Neuneu": 0, "Mools": 0, "Milka": 0 }

  const getExerciseData = (ex: string): TeamScoreData => {
    return scoresByExercise[ex] || {
      betId: "",
      betTitle: "",
      exercise: ex,
      competitionStart: "2026-05-25",
      competitionEnd: "2026-06-01",
      jaune: { total: 0, members: DEFAULT_MEMBERS_JAUNE },
      rouge: { total: 0, members: DEFAULT_MEMBERS_ROUGE },
      leader: null,
      unit: ex === "PLANK" ? "s" : ""
    }
  }

  const EXERCISES = [
    { key: "PUSHUP", label: "💪 Pompes" },
    { key: "PULLUP", label: "🐴 Tractions" },
    { key: "SQUAT", label: "🦵 Squats" },
    { key: "PLANK", label: "🛡️ Gainage" },
  ] as const

  return (
    <div className="mb-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Tableau dynamique de composition des équipes & volumes */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-4 sm:p-6 space-y-5 font-mono text-xs sm:text-sm text-slate-300">
        
        {/* Table Header */}
        <div className="grid grid-cols-2 gap-4 border-b border-stone-800 pb-3 font-bold text-center">
          <div className="text-amber-400 text-sm sm:text-base flex items-center justify-center gap-1.5 uppercase font-black">
            <span>🟡</span> ÉQUIPE JAUNE
          </div>
          <div className="text-red-400 text-sm sm:text-base flex items-center justify-center gap-1.5 uppercase font-black">
            <span>🔴</span> ÉQUIPE ROUGE
          </div>
        </div>

        {/* Exercises Grid */}
        <div className="space-y-5">
          {EXERCISES.map((ex) => {
            const data = getExerciseData(ex.key)
            const { jaune, rouge, leader } = data
            const formatVal = (v: number) => {
              if (ex.key === "PLANK") {
                return `${v.toLocaleString("fr-FR")}s`
              }
              return `${v.toLocaleString("fr-FR")}`
            }

            return (
              <div key={ex.key} className="border-b border-stone-850/60 pb-5 last:border-0 last:pb-0">
                {/* Exercise Title */}
                <div className="text-center font-black text-slate-400 mb-3 text-xs sm:text-sm uppercase tracking-wide bg-stone-950/40 py-1 rounded-xl border border-stone-800/40 flex items-center justify-center gap-2">
                  <span>{ex.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Jaune Column */}
                  <div className={`p-3 rounded-2xl border transition-colors ${
                    leader === "jaune" ? "bg-yellow-950/15 border-yellow-500/20" : "bg-stone-950/50 border-stone-850/50"
                  }`}>
                    <div className="space-y-1">
                      {Object.entries(jaune.members)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, val]) => (
                          <div key={name} className="flex justify-between items-center text-slate-400 text-[10px] sm:text-xs">
                            <span className="truncate">{name}</span>
                            <span className="text-slate-200 font-bold">{formatVal(val)}</span>
                          </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-stone-800/40 pt-1.5 mt-1.5 font-bold">
                      <span className="text-amber-400/80 text-[10px] sm:text-xs">TOTAL</span>
                      <span className="text-amber-400 text-xs sm:text-sm flex items-center gap-0.5 font-black">
                        {formatVal(jaune.total)}
                        {leader === "jaune" && <span className="animate-pulse">🔥</span>}
                      </span>
                    </div>
                  </div>

                  {/* Rouge Column */}
                  <div className={`p-3 rounded-2xl border transition-colors ${
                    leader === "rouge" ? "bg-red-950/15 border-red-500/20" : "bg-stone-950/50 border-stone-850/50"
                  }`}>
                    <div className="space-y-1">
                      {Object.entries(rouge.members)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, val]) => (
                          <div key={name} className="flex justify-between items-center text-slate-400 text-[10px] sm:text-xs">
                            <span className="truncate">{name}</span>
                            <span className="text-slate-200 font-bold">{formatVal(val)}</span>
                          </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-stone-800/40 pt-1.5 mt-1.5 font-bold">
                      <span className="text-red-400/80 text-[10px] sm:text-xs">TOTAL</span>
                      <span className="text-red-400 text-xs sm:text-sm flex items-center gap-0.5 font-black">
                        {formatVal(rouge.total)}
                        {leader === "rouge" && <span className="animate-pulse">🔥</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {loading && scoreList.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {teamBets.map((tb) => (
            <div key={tb.id} className="h-48 bg-stone-900/60 rounded-2xl animate-pulse border border-stone-800" />
          ))}
        </div>
      ) : hasAnyActivity ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}
