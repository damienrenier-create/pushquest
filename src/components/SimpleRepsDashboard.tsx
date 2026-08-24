"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import WorkoutEntry from "./dashboard/WorkoutEntry"

// Interface muscu ULTRA-simplifiée pour les comptes "fun" (lien nexus-fun-2026). On ne garde QUE :
//   1. l'encodage des reps du jour (le composant WorkoutEntry, réutilisé tel quel),
//   2. l'objectif du jour,
//   3. un bouton retour au Nexus.
// Aucun onglet, tableau, classement, cagnotte, pari, graphique — tout le reste du dashboard est masqué.
// Le dashboard complet (ChallengeDashboard) n'est PAS touché : cette page est un composant séparé.

type Sets = { pushups: (number | "")[]; pullups: (number | "")[]; squats: (number | "")[]; planks: (number | "")[] }

const EMPTY: Sets = { pushups: [""], pullups: [""], squats: [""], planks: [""] }
const sum = (a: (number | "")[]) => (a || []).reduce<number>((x, y) => x + (Number(y) || 0), 0)

export default function SimpleRepsDashboard() {
    const router = useRouter()
    const { data: session } = useSession()
    const league = (session?.user as any)?.league || "POMPES"

    const [localSets, setLocalSets] = useState<Sets>(EMPTY)
    const [required, setRequired] = useState(0)
    const [selectedDate, setSelectedDate] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

    const showToast = useCallback((msg: string, ok: boolean) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 2600)
    }, [])

    const fetchData = useCallback(async () => {
        try {
            const res = await fetch("/api/dashboard")
            if (res.ok) {
                const d = await res.json()
                setSelectedDate(d.selectedDateISO || d.todayISO || "")
                setRequired(d.requiredReps?.selected ?? 0)
                setLocalSets({
                    pushups: d.setsSelected?.pushups?.length > 0 ? d.setsSelected.pushups : [""],
                    pullups: d.setsSelected?.pullups?.length > 0 ? d.setsSelected.pullups : [""],
                    squats: d.setsSelected?.squats?.length > 0 ? d.setsSelected.squats : [""],
                    planks: d.setsSelected?.planks?.length > 0 ? d.setsSelected.planks : [""],
                })
            } else {
                showToast("Erreur de chargement", false)
            }
        } catch {
            showToast("Erreur de chargement", false)
        } finally {
            setLoading(false)
        }
    }, [showToast])

    useEffect(() => { fetchData() }, [fetchData])

    // Total du jour : même formule que le dashboard complet (pompes + tractions + squats + gainage/5).
    const currentTotal = sum(localSets.pushups) + sum(localSets.pullups) + sum(localSets.squats) + Math.floor(sum(localSets.planks) / 5)
    const done = required > 0 && currentTotal >= required
    const pct = required > 0 ? Math.min(100, Math.round((currentTotal / required) * 100)) : (currentTotal > 0 ? 100 : 0)

    const saveLogs = async () => {
        const all = [...localSets.pushups, ...localSets.pullups, ...localSets.squats, ...localSets.planks].map((r) => Number(r) || 0)
        const total = all.reduce((a, b) => a + b, 0)
        if (total <= 0) {
            showToast("Entre au moins une répétition", false)
            return
        }
        const high = all.find((r) => r >= 200)
        if (high && !confirm(`Tu as saisi une série de ${high} répétitions. Confirmer ?`)) return

        setSaving(true)
        try {
            const res = await fetch("/api/logs/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ date: selectedDate, sets: localSets }),
            })
            if (res.ok) {
                showToast("Séance enregistrée 💪", true)
                fetchData()
            } else {
                showToast("Erreur d'enregistrement", false)
            }
        } catch {
            showToast("Erreur réseau", false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-blue-600 leading-none">Mes reps du jour 💪</h1>
                    <p className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">Encode ta séance, c'est tout !</p>
                </div>
            </div>

            {/* Objectif du jour */}
            <div className={`rounded-3xl p-5 border-2 transition-all ${done ? "bg-green-50 border-green-200" : "bg-white border-gray-100 shadow-sm"}`}>
                <div className="flex items-center justify-between mb-2">
                    <span className="font-black uppercase text-xs tracking-wider text-gray-500">🎯 Objectif du jour</span>
                    {done && <span className="bg-green-200 text-green-800 px-3 py-0.5 rounded-full text-[10px] font-black uppercase">Atteint ✅</span>}
                </div>
                <div className="flex items-end justify-between">
                    <p className="font-black text-3xl text-gray-900">{loading ? "…" : currentTotal}<span className="text-base text-gray-400 font-bold"> / {required || "—"}</span></p>
                    <p className="text-[11px] font-bold text-gray-400">points</p>
                </div>
                <div className="mt-3 h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${done ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Formulaire d'encodage (réutilise le composant existant) */}
            {loading ? (
                <div className="text-center py-10 text-gray-400 font-black uppercase text-xs tracking-widest">Chargement…</div>
            ) : (
                <WorkoutEntry
                    league={league}
                    localSets={localSets}
                    setLocalSets={setLocalSets}
                    saving={saving}
                    saveLogs={saveLogs}
                />
            )}

            {/* Retour au Nexus */}
            <button
                onClick={() => router.push("/gamebook/yellow")}
                className="w-full py-4 rounded-3xl font-black uppercase tracking-widest text-sm bg-slate-900 text-yellow-400 hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
            >
                🍝 Retour au Nexus
            </button>

            {/* Toast minimal */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl font-black text-sm shadow-2xl ${toast.ok ? "bg-green-600 text-white" : "bg-red-500 text-white"}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    )
}
