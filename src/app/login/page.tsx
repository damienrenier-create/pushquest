"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
    const router = useRouter()
    const [identifier, setIdentifier] = useState("")
    const [code, setCode] = useState("")
    const [remember, setRemember] = useState(true)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        if (code.length < 3) {
            setError("Le code doit faire au moins 3 caractères.")
            setLoading(false)
            return
        }

        const res = await signIn("credentials", {
            redirect: false,
            identifier,
            code,
            remember: remember ? "true" : "false",
        })

        if (!res?.error) {
            router.push("/")
            router.refresh()
        } else {
            setError("Identifiant ou code incorrect.")
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                            Pompes entre potes
                        </h1>
                        <p className="text-gray-500">Connectez-vous pour entrer vos reps</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Identifiant (Pseudo ou Email)</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                                placeholder="Pseudo ou email"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 block">Code</label>
                            <input
                                type="password"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 placeholder:text-gray-400"
                                placeholder="3 caractères min"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors font-medium">
                                    Se souvenir de moi
                                </span>
                            </label>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${remember ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {remember ? "Session longue" : "Session courte"}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? "Connexion..." : "Se connecter"}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-500 mt-8">
                        Pas encore de compte ?{" "}
                        <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
                            S'inscrire
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
