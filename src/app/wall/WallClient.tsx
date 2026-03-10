"use client"

import { useState, useEffect } from "react";
import { Send, Clock, CircleDashed, AlertTriangle } from "lucide-react";

interface Message {
    nickname: string;
    message: string;
    createdAt: string;
}

export default function WallClient({ nickname }: { nickname: string }) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchMessages = async () => {
        try {
            setError(null);
            const res = await fetch("/api/wall");
            if (!res.ok) throw new Error("Erreur de chargement");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(data.messages || []);
        } catch (err: any) {
            setError(err.message || "Impossible de charger les messages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const msg = content.trim();
        if (!msg) return;
        if (msg.length > 240) {
            setError("Message trop long (max 240 catactères)");
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const res = await fetch("/api/wall", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Erreur lors de l'envoi");
            }

            setContent("");
            // Refresh feed
            await fetchMessages();
        } catch (err: any) {
            setError(err.message || "L'envoi a échoué");
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (iso: string) => {
        try {
            const d = new Date(iso);
            return new Intl.DateTimeFormat('fr-FR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            }).format(d);
        } catch {
            return iso;
        }
    };

    return (
        <div className="space-y-8">
            {/* Composex un message */}
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            disabled={submitting}
                            maxLength={240}
                            placeholder={`Quoi de neuf ${nickname} ?...`}
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm text-gray-900 placeholder-gray-400 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none min-h-[100px]"
                        />
                        <div className={`absolute bottom-3 right-3 text-xs font-bold ${content.length > 200 ? 'text-orange-500' : 'text-gray-400'}`}>
                            {content.length}/240
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                            <AlertTriangle size={14} />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !content.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                        >
                            {submitting ? (
                                <CircleDashed className="animate-spin" size={16} />
                            ) : (
                                <Send size={16} />
                            )}
                            Publier
                        </button>
                    </div>
                </form>
            </div>

            {/* Flux de messages */}
            <div className="space-y-4">
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                    <Clock size={20} className="text-gray-400" />
                    Dernières Paroles
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <CircleDashed className="animate-spin text-blue-500" size={32} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 border-dashed">
                        <p className="text-gray-500 font-medium">Aucun message pour le moment. Sois le premier !</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group transition-all hover:shadow-md">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                                        {msg.nickname?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-gray-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                            {msg.nickname}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                                            {formatDate(msg.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm whitespace-pre-wrap ml-11">
                                    {msg.message}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
