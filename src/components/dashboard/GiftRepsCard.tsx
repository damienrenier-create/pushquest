"use client"

import { useState, useEffect, useCallback } from "react"
import { GIFT_RECIPIENT_ID, isGiftWindowOpen } from "@/lib/gift"

/**
 * GiftRepsCard — Cadeau de naissance : offrir des reps à Milka (12/06 → 12/08).
 * Auto-affiché seulement pendant la fenêtre, et pas pour Milka lui-même.
 * Les reps offertes comptent dans le volume/XP du donneur mais remplissent le quota de Milka.
 * Les cadeaux s'ACCUMULENT (plusieurs séries/jour) → on liste les séries du jour avec une croix
 * pour en supprimer une (utile pour nettoyer les doublons).
 */
type GiftSet = { id: string; exercise: string; reps: number; offeredToUserId: string | null }

const EX: Record<string, { e: string; l: string }> = {
    PUSHUP: { e: "💪", l: "pompes" },
    PULLUP: { e: "🦍", l: "tractions" },
    SQUAT: { e: "🦵", l: "squats" },
    PLANK: { e: "🛡️", l: "gainage(s)" },
}

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
    const [giftSets, setGiftSets] = useState<GiftSet[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const windowOpen = isGiftWindowOpen(today) && currentUserId !== GIFT_RECIPIENT_ID

    // Charge les séries-cadeau déjà offertes aujourd'hui (pour les afficher avec une croix).
    const loadGifts = useCallback(async () => {
        try {
            const r = await fetch(`/api/logs/gift?date=${encodeURIComponent(today)}`)
            const j = r.ok ? await r.json() : null
            setGiftSets((j?.sets ?? []) as GiftSet[])
        } catch { /* silencieux */ }
    }, [today])

    useEffect(() => { if (windowOpen) loadGifts() }, [windowOpen, loadGifts])

    // Garde : hors fenêtre, ou bénéficiaire lui-même → ne rien afficher
    if (!windowOpen) return null

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
                await loadGifts()
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

    const deleteGift = async (id: string) => {
        setDeletingId(id)
        try {
            const res = await fetch("/api/logs/gift", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            })
            if (res.ok) {
                setGiftSets((prev) => prev.filter((s) => s.id !== id))
                setMsg({ text: "Série supprimée.", ok: true })
                onSaved?.()
            } else {
                setMsg({ text: "Suppression impossible", ok: false })
            }
        } catch {
            setMsg({ text: "Erreur réseau", ok: false })
        } finally {
            setDeletingId(null)
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

            {/* Séries-cadeau déjà offertes aujourd'hui — croix pour en supprimer une (nettoyage des doublons). */}
            {giftSets.length > 0 && (
                <div className="pt-2 border-t border-pink-200">
                    <p className="text-[10px] font-black text-pink-700 uppercase mb-2">Tes cadeaux offerts aujourd&apos;hui</p>
                    <div className="flex flex-wrap gap-2">
                        {giftSets.map((s) => {
                            const ex = EX[s.exercise] ?? { e: "•", l: s.exercise.toLowerCase() }
                            return (
                                <span key={s.id} className="relative inline-flex items-center gap-1 bg-white border-2 border-pink-200 rounded-full pl-3 pr-7 py-1 text-xs font-black text-pink-800">
                                    {ex.e} {s.reps}
                                    <button
                                        onClick={() => deleteGift(s.id)}
                                        disabled={deletingId === s.id}
                                        title="Supprimer cette série"
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-400 hover:bg-red-500 disabled:opacity-50 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow"
                                    >✕</button>
                                </span>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
