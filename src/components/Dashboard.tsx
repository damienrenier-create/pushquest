"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trophy, History, Plus, CircleSlash } from "lucide-react"

type DashboardProps = {
    currentUserId: string;
    todayLog: { count: number, id: string } | null;
    yesterdayLog: { count: number, id: string } | null;
    last7Days: { date: string, count: number }[];
    leaderboard: {
        user: { id: string, nickname: string },
        today: number,
        yesterday: number,
    }[];
    todayStr: string;
}

export default function Dashboard({
    currentUserId,
    todayLog,
    yesterdayLog,
    last7Days,
    leaderboard,
    todayStr
}: DashboardProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // State for the log input
    const [count, setCount] = useState<number>(todayLog?.count || 0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [message, setMessage] = useState({ text: "", type: "" })

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setMessage({ text: "", type: "" })

        try {
            const res = await fetch("/api/pushups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count, date: todayStr }),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.message || "Erreur de sauvegarde")
            }

            setMessage({ text: "Pompes enregistrées !", type: "success" })

            // Refresh server component to get new data
            startTransition(() => {
                router.refresh()
            })
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Sort leaderboard: primary by today, secondary by yesterday desc
    const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        if (b.today !== a.today) return b.today - a.today
        return b.yesterday - a.yesterday
    })

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">

            {/* Top Section: Daily Entry */}
            <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="flex-1 w-full relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <Plus className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Vos pompes aujourd'hui</h2>
                    </div>
                    <p className="text-gray-500 text-sm mb-6">Entrez ou mettez à jour votre total pour {new Date().toLocaleDateString('fr-FR')}.</p>

                    <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-4 w-full">
                        <input
                            type="number"
                            min="0"
                            value={count}
                            onChange={(e) => setCount(Number(e.target.value))}
                            required
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-xl font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button
                            type="submit"
                            disabled={isSubmitting || isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 min-w-[120px]"
                        >
                            {isSubmitting || isPending ? "Enregistrement..." : "Sauvegarder"}
                        </button>
                    </form>

                    {message.text && (
                        <p className={`mt-3 text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                            {message.text}
                        </p>
                    )}
                </div>
            </section>

            <div className="grid md:grid-cols-3 gap-8 items-start">

                {/* Leaderboard Table */}
                <section className="md:col-span-2 bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                    <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                                <Trophy className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Leaderboard</h2>
                        </div>
                        <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-600 rounded-full">En direct</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-100">
                                    <th className="p-4 sm:px-8 font-medium">Position</th>
                                    <th className="p-4 sm:px-8 font-medium">Pote</th>
                                    <th className="p-4 sm:px-8 font-medium text-center">Aujourd'hui</th>
                                    <th className="p-4 sm:px-8 font-medium text-center">Hier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedLeaderboard.map((row, idx) => {
                                    const isMe = row.user.id === currentUserId
                                    return (
                                        <tr key={row.user.id} className={`transition-colors hover:bg-gray-50 ${isMe ? 'bg-blue-50/30' : ''}`}>
                                            <td className="p-4 sm:px-8">
                                                {idx === 0 ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">1</span>
                                                ) : idx === 1 ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-700 font-bold text-sm">2</span>
                                                ) : idx === 2 ? (
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">3</span>
                                                ) : (
                                                    <span className="inline-flex flex items-center justify-center w-8 h-8 text-gray-400 font-medium text-sm">{idx + 1}</span>
                                                )}
                                            </td>
                                            <td className="p-4 sm:px-8 font-medium text-gray-900 flex items-center gap-2">
                                                {row.user.nickname}
                                                {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Moi</span>}
                                            </td>
                                            <td className="p-4 sm:px-8 text-center">
                                                <span className={`font-bold ${row.today > 0 ? 'text-blue-600 text-lg' : 'text-gray-400'}`}>
                                                    {row.today}
                                                </span>
                                            </td>
                                            <td className="p-4 sm:px-8 text-center text-gray-500 font-medium">
                                                {row.yesterday}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {sortedLeaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-gray-500">
                                            <CircleSlash className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                                            Personne n'a encore fait de pompes.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 7-Days History */}
                <section className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <History className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Mes 7 derniers jours</h2>
                    </div>

                    <div className="space-y-4">
                        {last7Days.map((day, i) => {
                            const dateObj = new Date(day.date)
                            const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(dateObj)

                            // Find max count to normalize width
                            const maxCount = Math.max(1, ...last7Days.map(d => d.count))
                            const percentage = Math.round((day.count / maxCount) * 100)

                            return (
                                <div key={i} className="flex flex-col gap-1.5">
                                    <div className="flex justify-between text-sm font-medium">
                                        <span className="text-gray-600 capitalize">{label}</span>
                                        <span className={day.count > 0 ? 'text-gray-900 font-bold' : 'text-gray-400'}>{day.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${day.date === todayStr ? 'bg-blue-500' : 'bg-green-400'}`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

            </div>
        </div>
    )
}
