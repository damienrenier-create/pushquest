"use client"

import { useState } from "react"
import { GIFT_RECIPIENT_ID, isGiftWindowOpen } from "@/lib/gift"

/**
 * GiftRepsCard — Cadeau de naissance : offrir des reps à Milka (12/06 → 12/08).
 * Auto-affiché seulement pendant la fenêtre, et pas pour Milka lui-même.
 * Les reps offertes comptent dans le volume/XP du donneur mais remplissent le quota de Milka.
 */
export default function GiftRepsCard({
    currentUserId,
    today,
    onSaved,
}: {
    currentUserId?: string
    today: string
    onSaved?: () => void
}) {
    const [reps, setReps] = useState({ pushups: 0, pullups: 0, squats: 0, planks: 0 })
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

    // Garde : hors fenêtre, ou bénéficiaire lui-même → ne rien afficher
    if (!isGiftWindowOpen(today) || currentUserId === GIFT_RECIPIENT_ID) return null

    const total = reps.pushups + reps.pullups + reps.squats + Math.floor(reps.planks / 5)

    const submit = async () => {
        if (total <= 0) { setMsg({ text: "Entre au moins une rep à offrir", ok: false }); return }
        setSaving(true)
        setMsg(null)
        try {
            const res = await fetch("/api/logs/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: today,
                    offeredTo: GIFT_RECIPIENT_ID,
                    sets: {
                        pushups: reps.pushups > 0 ? [reps.pushups] : [],
                        pullups: reps.pullups > 0 ? [reps.pullups] : [],
                        squats: reps.squats > 0 ? [reps.squats] : [],
                        planks: reps.planks > 0 ? [reps.planks] : [],
                    },
                }),
            })
            const json = await res.json().catch(() => ({}))
            if (res.ok) {
                setMsg({ text: "Cadeau offert à Milka 🍼 Merci !", ok: true })
                setReps({ pushups: 0, pullups: 0, squats: 0, planks: 0 })
                onSaved?.()
            } else {
                setMsg({ text: json?.message || "Erreur lors du cadeau", ok: false })
            }
        } catch {
            setMsg({ text: "Erreur réseau", ok: false })
        } finally {
            setSaving(false)
        }
    }

    const field = (key: keyof typeof reps, label: string, emoji: string) => (
        <div className="flex-1 min-w-[70px]">
            <label className="block text-[10px] font-black text-pink-700 uppercase mb-1 ml-1">{emoji} {label}</label>
            <input
                type="number"
                min={0}
                value={reps[key] || ""}
                onChange={(e) => setReps({ ...reps, [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full h-12 bg-white border-2 border-pink-200 rounded-2xl text-center font-black text-lg outline-none focus:border-pink-400 text-gray-900"
            />
        </div>
    )

    return (
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl p-6 border-2 border-pink-200 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-black uppercase tracking-normal text-pink-800 flex items-center gap-2">
                    🎁 Offrir des reps à Milka
                </h3>
                <span className="bg-pink-200 px-3 py-1 rounded-full text-[10px] font-black uppercase text-pink-900">Cadeau de naissance 🍼</span>
            </div>
            <p className="text-[11px] font-bold text-pink-700 leading-snug">
                Tes reps offertes comptent dans <span className="font-black">ton</span> volume/XP, mais remplissent le quota de Milka
                pour lui éviter les amendes pendant son congé. (Max = ce qu'il lui manque aujourd'hui.)
            </p>

            <div className="flex flex-wrap gap-2">
                {field("pushups", "Pompes", "💪")}
                {field("pullups", "Tractions", "🦍")}
                {field("squats", "Squats", "🦵")}
                {field("planks", "Gainage(s)", "🛡️")}
            </div>

            {msg && (
                <p className={`text-xs font-bold ${msg.ok ? "text-green-600" : "text-red-500"}`}>{msg.text}</p>
            )}

            <button
                onClick={submit}
                disabled={saving}
                className="w-full h-12 bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-black rounded-2xl transition-all shadow-md uppercase tracking-wide text-sm"
            >
                {saving ? "Envoi..." : `Offrir ${total > 0 ? `${total} reps ` : ""}à Milka 🎁`}
            </button>
        </div>
    )
}
