"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import RewardDetailSheet from "@/components/RewardDetailSheet"

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()

    const [nickname, setNickname] = useState("")
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState({ text: "", type: "" })

    const [buyoutPaid, setBuyoutPaid] = useState(false)
    const [medicalCerts, setMedicalCerts] = useState<any[]>([])
    const [showMedForm, setShowMedForm] = useState(false)
    const [medDates, setMedDates] = useState({ start: "", end: "", note: "" })
    const [records, setRecords] = useState({ pushups: 0, pullups: 0, squats: 0 })
    const [rewardDetail, setRewardDetail] = useState<any | null>(null)

    useEffect(() => {
        if (session === null) {
            router.push("/login")
        } else if (session?.user) {
            setNickname(session.user.name || "")
            fetchProfileData()
        }
    }, [session, router])

    const fetchProfileData = async () => {
        try {
            const res = await fetch("/api/user/profile")
            if (res.ok) {
                const data = await res.json()
                setNickname(data.nickname)
                setBuyoutPaid(data.buyoutPaid)
                setMedicalCerts(data.medicalCertificates)
                setRecords(data.records)
            }
        } catch (e) { }
    }

    const handleBuyout = async () => {
        if (!confirm("Voulez-vous vraiment payer le buyout de 50€ ? Cela stoppera toutes vos futures amendes.")) return
        setLoading(true)
        try {
            const res = await fetch("/api/user/buyout", { method: "POST" })
            const data = await res.json()
            if (res.ok) {
                setBuyoutPaid(true)
                setMessage({ text: "Buyout effectué ! Vous êtes libre (pour le futur).", type: "success" })
            } else {
                throw new Error(data.message)
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" })
        } finally {
            setLoading(false)
        }
    }

    const handleMedSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch("/api/user/medical-certs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    startDateISO: medDates.start,
                    endDateISO: medDates.end,
                    note: medDates.note
                })
            })
            const data = await res.json()
            if (res.ok) {
                setMessage({ text: "Certificat enregistré avec succès.", type: "success" })
                setShowMedForm(false)
                fetchProfileData()
            } else {
                throw new Error(data.message)
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" })
        } finally {
            setLoading(false)
        }
    }

    const cancelCert = async (id: string) => {
        if (!confirm("Annuler ce certificat ?")) return
        setLoading(true)
        try {
            const res = await fetch("/api/user/medical-certs/cancel", {
                method: "POST",
                body: JSON.stringify({ id })
            })
            if (res.ok) {
                setMessage({ text: "Certificat annulé.", type: "success" })
                fetchProfileData()
            } else {
                const data = await res.json()
                throw new Error(data.message)
            }
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" })
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage({ text: "", type: "" })

        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nickname }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || "Erreur lors de la mise à jour")
            }

            // Update NextAuth session to reflect the new nickname
            await update({ name: nickname })

            setMessage({ text: "Surnom mis à jour avec succès !", type: "success" })
        } catch (err: any) {
            setMessage({ text: err.message, type: "error" })
        } finally {
            setLoading(false)
        }
    }

    if (!session) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const isInjured = medicalCerts.some((c: any) => {
        const today = new Date().toISOString().split('T')[0];
        return today >= c.startDateISO && today <= c.endDateISO;
    });

    return (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 mt-8 pb-20">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 sm:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
                        <div className="flex gap-2">
                            <Link href="/faq" className="p-2 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-all border border-transparent hover:border-gray-100" title="Besoin d'aide ?">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </Link>
                            {isInjured && <span className="text-xl animate-pulse cursor-help" title="Tu es actuellement déclaré blessé (Mise à pied médicale)">🚑</span>}
                            {buyoutPaid && <span className="text-xl cursor-help" title="Tu es Vétéran (Buyout payé, plus d'amendes futures)">🕊️</span>}
                            {!isInjured && !buyoutPaid && <span className="text-xl opacity-20 grayscale" title="Tu es apte au service">✅</span>}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message.text && (
                            <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Email</label>
                            <input
                                type="text"
                                value={session.user?.email || ""}
                                disabled
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Surnom</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
                                placeholder="Votre surnom"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || nickname === session.user?.name}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Enregistrement..." : "Enregistrer"}
                        </button>
                    </form>

                    {/* --- GESTION DU DÉFI --- */}
                    <div className="mt-12 pt-8 border-t border-gray-100 space-y-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Buyout Défi</h2>
                            <p className="text-gray-500 text-sm mb-4">
                                Pour 50€, vous pouvez stopper la génération de toute amende future.
                                Les amendes déjà émises restent dues à la cagnotte.
                            </p>

                            {buyoutPaid ? (
                                <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 font-bold flex items-center gap-2">
                                    <span>✅</span> Buyout Activé
                                </div>
                            ) : (
                                <button
                                    onClick={handleBuyout}
                                    disabled={loading}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2"
                                >
                                    <span>💸</span> Payer le Buyout (50€)
                                </button>
                            )}
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Absences Médicales</h2>
                            <p className="text-gray-500 text-sm mb-4">
                                Déclarez une période d'incapacité pour suspendre les amendes.
                                Un seul certificat peut être créé par mois.
                            </p>

                            <div className="space-y-4">
                                {medicalCerts.map((cert) => (
                                    <div key={cert.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">Du {cert.startDateISO} au {cert.endDateISO}</p>
                                            {cert.note && <p className="text-xs text-gray-400">{cert.note}</p>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-[10px] font-black text-blue-500 uppercase">Actif</div>
                                            <button
                                                onClick={() => cancelCert(cert.id)}
                                                className="p-1 text-red-400 hover:text-red-600 transition-colors"
                                                title="Annuler"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {showMedForm ? (
                                    <form onSubmit={handleMedSubmit} className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-blue-700 uppercase">Début</label>
                                                <input
                                                    type="date"
                                                    value={medDates.start}
                                                    onChange={(e) => setMedDates({ ...medDates, start: e.target.value })}
                                                    required
                                                    className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-blue-700 uppercase">Fin</label>
                                                <input
                                                    type="date"
                                                    value={medDates.end}
                                                    onChange={(e) => setMedDates({ ...medDates, end: e.target.value })}
                                                    required
                                                    className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-blue-700 uppercase">Note (optionnel)</label>
                                            <input
                                                type="text"
                                                value={medDates.note}
                                                onChange={(e) => setMedDates({ ...medDates, note: e.target.value })}
                                                placeholder="Lumbago, grippe..."
                                                className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-sm">Enregistrer</button>
                                            <button type="button" onClick={() => setShowMedForm(false)} className="px-4 py-2 text-blue-600 font-bold text-sm">Annuler</button>
                                        </div>
                                    </form>
                                ) : (
                                    <button
                                        onClick={() => setShowMedForm(true)}
                                        disabled={loading}
                                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold hover:border-blue-300 hover:text-blue-500 transition-all text-sm"
                                    >
                                        + Déclarer une période d'absence
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-6">Mes Records Personnels</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div
                                onClick={() => setRewardDetail({ name: "Record Personnel Pompes", emoji: "💪", description: "Ta meilleure performance en une seule série de pompes.", type: 'RECORD PERSONNEL', currentValue: records.pushups })}
                                className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                                <p className="text-2xl mb-1">💪</p>
                                <p className="text-xl font-black text-blue-700">{records.pushups}</p>
                                <p className="text-[8px] font-bold text-blue-400 uppercase">Pompes</p>
                            </div>
                            <div
                                onClick={() => setRewardDetail({ name: "Record Personnel Tractions", emoji: "🦍", description: "Ta meilleure performance en une seule série de tractions.", type: 'RECORD PERSONNEL', currentValue: records.pullups })}
                                className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-center cursor-pointer hover:bg-orange-100 transition-colors"
                            >
                                <p className="text-2xl mb-1">🦍</p>
                                <p className="text-xl font-black text-orange-700">{records.pullups}</p>
                                <p className="text-[8px] font-bold text-orange-400 uppercase">Tractions</p>
                            </div>
                            <div
                                onClick={() => setRewardDetail({ name: "Record Personnel Squats", emoji: "🦵", description: "Ta meilleure performance en une seule série de squats.", type: 'RECORD PERSONNEL', currentValue: records.squats })}
                                className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center cursor-pointer hover:bg-green-100 transition-colors"
                            >
                                <p className="text-2xl mb-1">🦵</p>
                                <p className="text-xl font-black text-green-700">{records.squats}</p>
                                <p className="text-[8px] font-bold text-green-400 uppercase">Squats</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-center text-gray-400 mt-6 italic">Retrouvez votre progression détaillée sur le <Link href="/" className="text-blue-500 font-black hover:underline">tableau de bord</Link>.</p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Inviter un pote</h2>
                        <p className="text-gray-500 text-sm mb-4">Partagez ce lien avec vos amis pour qu'ils vous rejoignent dans les classements.</p>

                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                readOnly
                                value={typeof window !== "undefined" ? `${window.location.origin}/register` : ""}
                                className="flex-1 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-700 font-mono focus:outline-none"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(typeof window !== "undefined" ? `${window.location.origin}/register` : "")
                                    setMessage({ text: "Lien copié dans le presse-papier !", type: "success" })
                                }}
                                className="bg-gray-900 hover:bg-black text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors shrink-0"
                            >
                                Copier
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
