"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminClient({ user }: { user: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState<string | null>(null);

    // Add state
    const [isAdding, setIsAdding] = useState(false);
    const [newSet, setNewSet] = useState({
        date: new Date().toISOString().split('T')[0],
        exercise: "PUSHUP",
        reps: ""
    });

    // Edit state
    const [editingSet, setEditingSet] = useState<string | null>(null);
    const [editData, setEditData] = useState({ date: "", exercise: "", reps: "" });

    // Profile state
    const [profileData, setProfileData] = useState({
        nickname: user.nickname,
        isAdmin: user.isAdmin,
        buyoutPaid: user.buyoutPaid,
        league: user.league,
    });

    const [xpAdj, setXpAdj] = useState({ amount: "", reason: "", date: new Date().toISOString().split('T')[0] });
    const [badgeKeyToReset, setBadgeKeyToReset] = useState("");
    const [alterEgoIdToLink, setAlterEgoIdToLink] = useState("");

    // Paris admin
    const [bets, setBets] = useState<any[]>([]);
    const [betsLoading, setBetsLoading] = useState(false);
    const [showBetsPanel, setShowBetsPanel] = useState(false);
    const [newBet, setNewBet] = useState({
        type: "PRONOSTIC",
        subType: "MULTI",
        title: "",
        description: "",
        options: [{ key: "opt1", label: "" }, { key: "opt2", label: "" }],
        closeAt: "",
        targetUserId: ""
    });
    const [betAction, setBetAction] = useState<{ betId: string; action: string } | null>(null);
    const [resolveOption, setResolveOption] = useState("");
    const [resolveNote, setResolveNote] = useState("");
    const [betMessage, setBetMessage] = useState<string | null>(null);

    // Correct-odd state
    const [correctOddForm, setCorrectOddForm] = useState<{ betId: string; entryId: string; userId: string } | null>(null);
    const [correctOddValue, setCorrectOddValue] = useState("");
    const [correctOddReason, setCorrectOddReason] = useState("");

    const deleteSet = async (setId: string) => {
        if (!confirm("Supprimer cette série ? Action irréversible.")) return;
        setLoading(setId);
        try {
            const res = await fetch("/api/admin/delete-set", {
                method: "POST",
                body: JSON.stringify({ setId }),
            });
            if (res.ok) router.refresh();
            else alert("Erreur lors de la suppression");
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const handleAddSet = async () => {
        if (!newSet.reps || Number(newSet.reps) <= 0) return alert("Reps invalides");
        setLoading("add");
        try {
            const res = await fetch("/api/admin/add-set", {
                method: "POST",
                body: JSON.stringify({ userId: user.id, ...newSet }),
            });
            if (res.ok) {
                setIsAdding(false);
                setNewSet({ date: new Date().toISOString().split('T')[0], exercise: "PUSHUP", reps: "" });
                router.refresh();
            } else alert("Erreur lors de l'ajout");
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const handleSaveEdit = async () => {
        if (!editData.reps || Number(editData.reps) <= 0) return alert("Reps invalides");
        setLoading(editingSet);
        try {
            const res = await fetch("/api/admin/edit-set", {
                method: "POST",
                body: JSON.stringify({ setId: editingSet, ...editData }),
            });
            if (res.ok) {
                setEditingSet(null);
                router.refresh();
            } else alert("Erreur lors de la modification");
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const startEdit = (set: any) => {
        setEditingSet(set.id);
        setEditData({ date: set.date, exercise: set.exercise, reps: set.reps.toString() });
    };

    const handleUpdateProfile = async () => {
        setLoading("profile");
        try {
            const res = await fetch("/api/admin/update-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, ...profileData }),
            });
            if (res.ok) {
                alert("Profil mis à jour !");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.message || "Erreur lors de la mise à jour");
            }
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const deleteFine = async (fineId: string) => {
        if (!confirm("Supprimer cette amende ?")) return;
        setLoading(fineId);
        try {
            const res = await fetch("/api/admin/delete-fine", {
                method: "POST",
                body: JSON.stringify({ fineId }),
            });
            if (res.ok) router.refresh();
            else alert("Erreur lors de la suppression");
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const handleDeleteUser = async () => {
        const confirm1 = confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${user.nickname} ?`);
        if (!confirm1) return;

        const confirm2 = confirm(`RAPPEL : Cette action est IRREVERSIBLE. Tout l'historique sera effacé. Confirmer ?`);
        if (!confirm2) return;

        setLoading("delete-user");
        try {
            const res = await fetch("/api/admin/delete-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id }),
            });
            if (res.ok) {
                alert("Utilisateur supprimé !");
                router.push("/admin");
            } else {
                const data = await res.json();
                alert(data.message || "Erreur lors de la suppression de l'utilisateur");
            }
        } catch (e) {
            alert("Erreur réseau");
        } finally {
            setLoading(null);
        }
    };

    const handleXpAdjustment = async () => {
        if (!xpAdj.amount || !xpAdj.reason) return alert("Données invalides");
        setLoading("xp-adj");
        try {
            const res = await fetch("/api/admin/xp-adjustment", {
                method: "POST",
                body: JSON.stringify({ userId: user.id, ...xpAdj }),
            });
            if (res.ok) {
                alert("XP ajustée !");
                setXpAdj({ amount: "", reason: "", date: new Date().toISOString().split('T')[0] });
                router.refresh();
            } else alert("Erreur lors de l'ajustement");
        } catch (e) { alert("Erreur réseau"); }
        finally { setLoading(null); }
    };

    const handleResetBadge = async () => {
        if (!badgeKeyToReset) return alert("Sélectionnez un badge");
        if (!confirm(`Réinitialiser le badge ${badgeKeyToReset} pour ${user.nickname} ?`)) return;
        setLoading("badge-reset");
        try {
            const res = await fetch("/api/admin/badges/reset", {
                method: "POST",
                body: JSON.stringify({ userId: user.id, badgeKey: badgeKeyToReset }),
            });
            if (res.ok) {
                alert("Badge réinitialisé !");
                setBadgeKeyToReset("");
                router.refresh();
            } else alert("Erreur lors de la réinitialisation");
        } catch (e) { alert("Erreur réseau"); }
        finally { setLoading(null); }
    };

    const handleLinkAlterEgo = async () => {
        if (!alterEgoIdToLink) return alert("ID Alter Ego requis");
        setLoading("link-ego");
        try {
            const res = await fetch("/api/admin/update-user", {
                method: "POST",
                body: JSON.stringify({ userId: user.id, alterEgoId: alterEgoIdToLink }),
            });
            if (res.ok) {
                alert("Alter Ego lié !");
                router.refresh();
            } else alert("Erreur lors du lien");
        } catch (e) { alert("Erreur réseau"); }
        finally { setLoading(null); }
    };

    const loadBets = async () => {
        setBetsLoading(true);
        try {
            const res = await fetch("/api/bets");
            const data = await res.json();
            setBets(data.bets || data || []);
        } catch (e) {
            setBetMessage("Erreur de chargement des paris");
        } finally {
            setBetsLoading(false);
        }
    };

    const handleCreateBet = async () => {
        if (!newBet.title || !newBet.closeAt) return setBetMessage("Titre et date de clôture requis");
        if (newBet.options.some(o => !o.label)) return setBetMessage("Toutes les options doivent avoir un label");
        try {
            const res = await fetch("/api/bets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: newBet.type,
                    subType: newBet.subType,
                    title: newBet.title,
                    description: newBet.description || undefined,
                    options: newBet.options,
                    closeAt: new Date(newBet.closeAt).toISOString(),
                    targetUserId: newBet.type === "DUEL" ? newBet.targetUserId : undefined
                })
            });
            const data = await res.json();
            if (res.ok) {
                setBetMessage("✅ Pari créé en brouillon");
                setNewBet({
                    type: "PRONOSTIC", subType: "MULTI", title: "", description: "",
                    options: [{ key: "opt1", label: "" }, { key: "opt2", label: "" }],
                    closeAt: "", targetUserId: ""
                });
                loadBets();
            } else {
                setBetMessage("❌ " + (data.message || "Erreur"));
            }
        } catch (e) {
            setBetMessage("❌ Erreur réseau");
        }
    };

    const handlePublishBet = async (betId: string) => {
        if (!confirm("Publier ce pari ? Les joueurs pourront miser.")) return;
        const res = await fetch(`/api/bets/${betId}/publish`, { method: "POST" });
        const data = await res.json();
        setBetMessage(res.ok ? "✅ Pari publié" : "❌ " + data.message);
        loadBets();
    };

    const handleResolveBet = async (betId: string) => {
        if (!resolveOption) return setBetMessage("Sélectionnez l'option gagnante");
        if (!confirm(`Résoudre sur "${resolveOption}" ? Les gains seront distribués immédiatement.`)) return;
        const res = await fetch(`/api/bets/${betId}/resolve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ winnerOption: resolveOption, note: resolveNote || undefined })
        });
        const data = await res.json();
        setBetMessage(res.ok ? `✅ Résolu — ${data.distribution?.length || 0} gagnants` : "❌ " + data.message);
        setBetAction(null);
        setResolveOption("");
        setResolveNote("");
        loadBets();
    };

    const handleCorrectOdd = async (betId: string, userId: string) => {
        const newOdd = parseFloat(correctOddValue);
        if (!newOdd || newOdd <= 0 || !correctOddReason) return setBetMessage("Cote et raison requises");
        const res = await fetch(`/api/admin/bets/${betId}/correct-odd`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, lockedOdd: newOdd, reason: correctOddReason })
        });
        const data = await res.json();
        setBetMessage(res.ok ? `✅ ${data.message}` : "❌ " + data.message);
        setCorrectOddForm(null);
        setCorrectOddValue("");
        setCorrectOddReason("");
        loadBets();
    };

    const handleCancelBet = async (betId: string) => {
        if (!confirm("Annuler ce pari ? Toutes les mises seront remboursées intégralement.")) return;
        const res = await fetch(`/api/bets/${betId}/cancel`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: "Annulé par l'admin" })
        });
        const data = await res.json();
        setBetMessage(res.ok ? `✅ Annulé — ${data.reimbursedCount} remboursements` : "❌ " + data.message);
        loadBets();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-4 mb-2">
                        <input
                            type="text"
                            value={profileData.nickname}
                            onChange={e => setProfileData({ ...profileData, nickname: e.target.value })}
                            className="bg-white/10 text-xl font-black italic uppercase tracking-tighter rounded px-2 py-1 border border-white/20 outline-none focus:bg-white/20 transition-all w-full max-w-[200px]"
                        />
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Buyout:</label>
                            <input
                                type="checkbox"
                                checked={profileData.buyoutPaid}
                                onChange={e => setProfileData({ ...profileData, buyoutPaid: e.target.checked })}
                                className="w-4 h-4 rounded border-white/20 bg-white/10"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase">League:</label>
                            <select
                                value={profileData.league}
                                onChange={e => setProfileData({ ...profileData, league: e.target.value })}
                                className="bg-white/10 text-[10px] font-black uppercase rounded border border-white/20 outline-none focus:bg-white/20 transition-all"
                            >
                                <option value="POMPES" className="bg-slate-900">POMPES</option>
                                {profileData.league === "GAINAGE" && (
                                    <option value="GAINAGE" className="bg-slate-900">GAINAGE</option>
                                )}
                            </select>
                        </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        ID: {user.id} • {user.email} {user.alterEgoId ? `• Alter Ego: ${user.alterEgoId}` : ""}
                    </p>
                </div>
                <button
                    onClick={handleUpdateProfile}
                    disabled={loading === "profile"}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl shadow-lg transition-all disabled:opacity-50"
                >
                    {loading === "profile" ? "ÉDITION..." : "Appliquer Changements"}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SETS */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-widest">
                            Séries Récentes (20)
                        </h3>
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase hover:bg-blue-100 transition-colors"
                        >
                            {isAdding ? "Annuler" : "+ Ajouter une série"}
                        </button>
                    </div>

                    {isAdding && (
                        <div className="p-4 bg-blue-50/50 border-b border-gray-100 grid grid-cols-2 gap-2">
                            <input type="date" value={newSet.date} onChange={e => setNewSet({ ...newSet, date: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-200 outline-none" />
                            <select value={newSet.exercise} onChange={e => setNewSet({ ...newSet, exercise: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-200 outline-none">
                                <option value="PUSHUP">POMPES</option>
                                <option value="PULLUP">TRACTIONS</option>
                                <option value="SQUAT">SQUATS</option>
                                <option value="PLANK">GAINAGE</option>
                            </select>
                            <input type="number" placeholder="Reps" value={newSet.reps} onChange={e => setNewSet({ ...newSet, reps: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-200 outline-none" />
                            <button onClick={handleAddSet} disabled={loading === "add"} className="px-2 py-1 bg-blue-600 text-white font-bold text-xs uppercase rounded hover:bg-blue-700 disabled:opacity-50">Valider</button>
                        </div>
                    )}
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {user.sets.map((set: any) => (
                            <div key={set.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                {editingSet === set.id ? (
                                    <div className="flex-1 grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center mr-2">
                                        <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-300 outline-none w-full" />
                                        <select value={editData.exercise} onChange={e => setEditData({ ...editData, exercise: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-300 outline-none w-full">
                                            <option value="PUSHUP">POMPES</option>
                                            <option value="PULLUP">TRACTIONS</option>
                                            <option value="SQUAT">SQUATS</option>
                                            <option value="PLANK">GAINAGE</option>
                                        </select>
                                        <input type="number" value={editData.reps} onChange={e => setEditData({ ...editData, reps: e.target.value })} className="px-2 py-1 text-xs rounded border border-gray-300 outline-none w-full" />
                                        <div className="flex flex-col gap-1">
                                            <button onClick={handleSaveEdit} disabled={loading === set.id} className="text-[10px] font-bold text-white bg-green-500 px-2 py-0.5 rounded hover:bg-green-600 uppercase">Save</button>
                                            <button onClick={() => setEditingSet(null)} className="text-[10px] font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded hover:bg-gray-300 uppercase">X</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-gray-900">{set.reps}</span>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                                                    {set.exercise}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                                {set.date} • {new Date(set.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => startEdit(set)}
                                                disabled={loading === set.id}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
                                                title="Modifier la série"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => deleteSet(set.id)}
                                                disabled={loading === set.id}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                                title="Supprimer la série"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                        {user.sets.length === 0 && (
                            <p className="p-8 text-center text-gray-400 font-bold uppercase text-xs italic">
                                Aucune série trouvée.
                            </p>
                        )}
                    </div>
                </section>

                {/* FINES */}
                <section className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-widest">
                            Amendes Récentes (20)
                        </h3>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                        {user.fines.map((fine: any) => (
                            <div key={fine.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-red-600">{fine.amountEur}€</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${fine.status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {fine.status === 'paid' ? 'Payée' : 'Due'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">
                                        Date: {fine.date}
                                    </p>
                                </div>
                                <button
                                    onClick={() => deleteFine(fine.id)}
                                    disabled={loading === fine.id}
                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                </button>
                            </div>
                        ))}
                        {user.fines.length === 0 && (
                            <p className="p-8 text-center text-gray-400 font-bold uppercase text-xs italic">
                                Aucune amende trouvée.
                            </p>
                        )}
                    </div>
                </section>
            </div>

            {/* MODERATOR TOOLS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                    <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Ajustement XP</h3>
                    <div className="space-y-3">
                        <input type="number" placeholder="Montant (ex: 500 ou -200)" value={xpAdj.amount} onChange={e => setXpAdj({ ...xpAdj, amount: e.target.value })} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />
                        <input type="text" placeholder="Raison" value={xpAdj.reason} onChange={e => setXpAdj({ ...xpAdj, reason: e.target.value })} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />
                        <button onClick={handleXpAdjustment} disabled={loading === "xp-adj"} className="w-full py-2 bg-indigo-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-indigo-700 disabled:opacity-50">Appliquer XP</button>
                    </div>
                </section>

                <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                    <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Reset Badge</h3>
                    <div className="space-y-3">
                        <select value={badgeKeyToReset} onChange={e => setBadgeKeyToReset(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none">
                            <option value="">Sélectionner un badge...</option>
                            <option value="unique_pushups_100">Premier 100 Pompes</option>
                            <option value="unique_pushups_80">Premier 80 Pompes</option>
                            <option value="unique_pushups_50">Premier 50 Pompes</option>
                            <option value="legendary_pullups_30">Traction God (30)</option>
                            <option value="legendary_pullups_20">Traction Master (20)</option>
                        </select>
                        <button onClick={handleResetBadge} disabled={loading === "badge-reset"} className="w-full py-2 bg-red-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-red-700 disabled:opacity-50">Réinitialiser Badge</button>
                    </div>
                </section>

                <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                    <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">Lien Alter-Ego</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="UserID de l'Alter Ego" value={alterEgoIdToLink} onChange={e => setAlterEgoIdToLink(e.target.value)} className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />
                        <button onClick={handleLinkAlterEgo} disabled={loading === "link-ego"} className="w-full py-2 bg-emerald-600 text-white font-bold text-xs uppercase rounded-xl hover:bg-emerald-700 disabled:opacity-50">Lier l'Alter Ego</button>
                    </div>
                </section>
            </div>

            {/* GESTION DES PARIS */}
            <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                        🎲 Gestion des Paris
                    </h2>
                    <button
                        onClick={() => { setShowBetsPanel(!showBetsPanel); if (!showBetsPanel) loadBets(); }}
                        className="px-4 py-2 bg-amber-500 text-white font-black text-xs uppercase rounded-xl hover:bg-amber-600"
                    >
                        {showBetsPanel ? "Fermer" : "Gérer les paris"}
                    </button>
                </div>

                {showBetsPanel && (
                    <div className="space-y-6">

                        {/* MESSAGE FEEDBACK */}
                        {betMessage && (
                            <div className={`p-3 rounded-xl text-sm font-bold ${betMessage.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                {betMessage}
                                <button onClick={() => setBetMessage(null)} className="ml-2 text-xs underline">Fermer</button>
                            </div>
                        )}

                        {/* CRÉER UN NOUVEAU PARI */}
                        <section className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                            <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4">
                                Créer un nouveau pari
                            </h3>
                            <div className="space-y-3">
                                {/* Type */}
                                <div className="flex gap-2">
                                    <select value={newBet.type} onChange={e => setNewBet({ ...newBet, type: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none">
                                        <option value="PRONOSTIC">Pronostic</option>
                                        <option value="DUEL">Duel</option>
                                        <option value="COURSE">Course</option>
                                    </select>
                                    <select value={newBet.subType} onChange={e => setNewBet({ ...newBet, subType: e.target.value })}
                                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none">
                                        <option value="BINARY">Binaire (Oui/Non)</option>
                                        <option value="MULTI">Choix multiple</option>
                                        <option value="PLAYER_RACE">Course entre joueurs</option>
                                    </select>
                                </div>

                                {/* Titre */}
                                <input type="text" placeholder="Titre du pari" value={newBet.title}
                                    onChange={e => setNewBet({ ...newBet, title: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />

                                {/* Description */}
                                <input type="text" placeholder="Description (optionnel)" value={newBet.description}
                                    onChange={e => setNewBet({ ...newBet, description: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />

                                {/* Options */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Options</p>
                                    {newBet.options.map((opt, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input type="text" placeholder={`Option ${i + 1}`} value={opt.label}
                                                onChange={e => {
                                                    const opts = [...newBet.options];
                                                    opts[i] = { ...opts[i], label: e.target.value };
                                                    setNewBet({ ...newBet, options: opts });
                                                }}
                                                className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />
                                            {newBet.options.length > 2 && (
                                                <button onClick={() => setNewBet({ ...newBet, options: newBet.options.filter((_, j) => j !== i) })}
                                                    className="px-3 py-2 text-red-400 hover:text-red-600 text-sm font-bold">✕</button>
                                            )}
                                        </div>
                                    ))}
                                    {newBet.options.length < 6 && (
                                        <button onClick={() => setNewBet({ ...newBet, options: [...newBet.options, { key: `opt${newBet.options.length + 1}`, label: "" }] })}
                                            className="text-xs text-amber-600 font-bold hover:underline">
                                            + Ajouter une option
                                        </button>
                                    )}
                                </div>

                                {/* Date de clôture */}
                                <input type="datetime-local" value={newBet.closeAt}
                                    onChange={e => setNewBet({ ...newBet, closeAt: e.target.value })}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />

                                {/* Target user pour DUEL */}
                                {newBet.type === "DUEL" && (
                                    <input type="text" placeholder="UserID du joueur ciblé (pour le duel)"
                                        value={newBet.targetUserId}
                                        onChange={e => setNewBet({ ...newBet, targetUserId: e.target.value })}
                                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 outline-none" />
                                )}

                                <button onClick={handleCreateBet} disabled={loading === "create-bet"}
                                    className="w-full py-2 bg-amber-500 text-white font-black text-xs uppercase rounded-xl hover:bg-amber-600 disabled:opacity-50">
                                    Créer en brouillon
                                </button>
                            </div>
                        </section>

                        {/* LISTE DES PARIS EXISTANTS */}
                        <section className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-widest">
                                    Paris existants
                                </h3>
                                <button onClick={loadBets} className="text-xs text-amber-600 font-bold hover:underline">
                                    Rafraîchir
                                </button>
                            </div>

                            {betsLoading && <p className="p-6 text-center text-gray-400 text-sm">Chargement...</p>}

                            <div className="divide-y divide-gray-50">
                                {bets.map((bet: any) => {
                                    const options = typeof bet.options === "string" ? JSON.parse(bet.options) : bet.options;
                                    const betMeta = (() => { try { return JSON.parse(bet.metadata || '{}'); } catch { return {}; } })();
                                    const statusColors: Record<string, string> = {
                                        DRAFT: "bg-gray-100 text-gray-600",
                                        OPEN: "bg-green-100 text-green-700",
                                        LOCKED: "bg-amber-100 text-amber-700",
                                        RESOLVED: "bg-blue-100 text-blue-700",
                                        CANCELLED: "bg-red-100 text-red-600"
                                    };

                                    // Détecter cotes incohérentes : par option, si ratio max/min > 2
                                    const activeEntries: any[] = (bet.entries || []).filter((e: any) => !e.withdrawn);
                                    const hasIncoherentOdds = options.some((opt: any) => {
                                        const odds = activeEntries
                                            .filter((e: any) => e.option === opt.key && e.lockedOdd)
                                            .map((e: any) => e.lockedOdd as number);
                                        if (odds.length < 2) return false;
                                        const maxOdd = Math.max(...odds);
                                        const minOdd = Math.min(...odds);
                                        return minOdd > 0 && maxOdd / minOdd > 2;
                                    });

                                    return (
                                        <div key={bet.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${statusColors[bet.status] || "bg-gray-100 text-gray-600"}`}>
                                                            {bet.status}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">{bet.type}</span>
                                                        {hasIncoherentOdds && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-700" title="Deux entrées sur la même option ont des cotes dont le ratio dépasse 2×">
                                                                ⚠️ Cotes incohérentes
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-sm text-gray-800">{bet.title}</p>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                                        Clôture : {bet.closeAt ? new Date(bet.closeAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : "—"}
                                                        {" · "}{bet.entries?.length || 0} parieurs
                                                    </p>

                                                    {/* Instructions de résolution depuis metadata */}
                                                    {betMeta.resolveInstructions && (
                                                        <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 font-bold">
                                                            📋 {betMeta.resolveInstructions}
                                                        </p>
                                                    )}

                                                    {/* Entrées actives avec lockedOdd */}
                                                    {activeEntries.length > 0 && (
                                                        <div className="mt-2 space-y-1">
                                                            {activeEntries.map((entry: any) => {
                                                                const optLabel = options.find((o: any) => o.key === entry.option)?.label || entry.option;
                                                                return (
                                                                    <div key={entry.id} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-2 py-1">
                                                                        <span className="text-[10px] font-bold text-gray-600 truncate max-w-[120px]" title={entry.userId}>
                                                                            {entry.userId.slice(0, 8)}…
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-blue-600 uppercase">{optLabel}</span>
                                                                        <span className="text-[10px] font-bold text-gray-700">{entry.xpStaked} XP</span>
                                                                        <span className="text-[10px] font-bold text-purple-700">
                                                                            ×{entry.lockedOdd?.toFixed(2) ?? "—"}
                                                                        </span>
                                                                        {(bet.status === "OPEN" || bet.status === "LOCKED") && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setCorrectOddForm({ betId: bet.id, entryId: entry.id, userId: entry.userId });
                                                                                    setCorrectOddValue(entry.lockedOdd?.toString() ?? "");
                                                                                    setCorrectOddReason("");
                                                                                }}
                                                                                className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full hover:bg-orange-100 transition-colors whitespace-nowrap"
                                                                            >
                                                                                Corriger la cote
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    {/* Mini-formulaire correction de cote */}
                                                    {correctOddForm?.betId === bet.id && (
                                                        <div className="mt-2 p-3 bg-orange-50 rounded-2xl border border-orange-200 space-y-2">
                                                            <p className="text-[10px] font-black text-orange-700 uppercase">
                                                                Corriger la cote — user {correctOddForm.userId.slice(0, 8)}…
                                                            </p>
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="1.01"
                                                                    placeholder="Nouvelle cote (ex: 2.50)"
                                                                    value={correctOddValue}
                                                                    onChange={e => setCorrectOddValue(e.target.value)}
                                                                    className="flex-1 px-3 py-1.5 text-sm rounded-xl border border-orange-200 outline-none"
                                                                />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                placeholder="Raison de la correction"
                                                                value={correctOddReason}
                                                                onChange={e => setCorrectOddReason(e.target.value)}
                                                                className="w-full px-3 py-1.5 text-sm rounded-xl border border-orange-200 outline-none"
                                                            />
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleCorrectOdd(correctOddForm.betId, correctOddForm.userId)}
                                                                    className="flex-1 py-1.5 bg-orange-600 text-white font-black text-xs uppercase rounded-xl hover:bg-orange-700"
                                                                >
                                                                    Appliquer
                                                                </button>
                                                                <button
                                                                    onClick={() => { setCorrectOddForm(null); setCorrectOddValue(""); setCorrectOddReason(""); }}
                                                                    className="px-4 py-1.5 bg-gray-200 text-gray-600 font-black text-xs uppercase rounded-xl hover:bg-gray-300"
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Actions selon statut */}
                                                <div className="flex flex-col gap-1.5 shrink-0">
                                                    {bet.status === "DRAFT" && (
                                                        <button onClick={() => handlePublishBet(bet.id)}
                                                            className="px-3 py-1.5 bg-green-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-green-700">
                                                            Publier
                                                        </button>
                                                    )}
                                                    {(bet.status === "OPEN" || bet.status === "LOCKED") && (
                                                        <>
                                                            <button onClick={() => {
                                                                setResolveOption("");
                                                                setResolveNote("");
                                                                setBetAction({ betId: bet.id, action: "resolve" });
                                                            }}
                                                                className="px-3 py-1.5 bg-blue-600 text-white font-black text-[10px] uppercase rounded-xl hover:bg-blue-700">
                                                                Résoudre
                                                            </button>
                                                            <button onClick={() => handleCancelBet(bet.id)}
                                                                className="px-3 py-1.5 bg-red-500 text-white font-black text-[10px] uppercase rounded-xl hover:bg-red-600">
                                                                Annuler
                                                            </button>
                                                        </>
                                                    )}
                                                    {bet.status === "RESOLVED" && (
                                                        <span className="text-[10px] text-blue-600 font-bold">
                                                            ✅ {bet.resolvedOption}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Panel de résolution inline */}
                                            {betAction?.betId === bet.id && betAction?.action === "resolve" && (
                                                <div className="mt-3 p-3 bg-blue-50 rounded-2xl border border-blue-100 space-y-2">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase">Option gagnante</p>
                                                    <select value={resolveOption} onChange={e => setResolveOption(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none">
                                                        <option value="">Sélectionner...</option>
                                                        {options.map((opt: any) => (
                                                            <option key={opt.key} value={opt.key}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                    <input type="text" placeholder="Note (optionnel)" value={resolveNote}
                                                        onChange={e => setResolveNote(e.target.value)}
                                                        className="w-full px-3 py-2 text-sm rounded-xl border border-blue-200 outline-none" />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleResolveBet(bet.id)}
                                                            className="flex-1 py-2 bg-blue-600 text-white font-black text-xs uppercase rounded-xl hover:bg-blue-700">
                                                            Confirmer et distribuer
                                                        </button>
                                                        <button onClick={() => { setBetAction(null); setResolveOption(""); setResolveNote(""); }}
                                                            className="px-4 py-2 bg-gray-200 text-gray-600 font-black text-xs uppercase rounded-xl hover:bg-gray-300">
                                                            Annuler
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {!betsLoading && bets.length === 0 && (
                                    <p className="p-8 text-center text-gray-400 font-bold uppercase text-xs italic">
                                        Aucun pari créé pour l'instant.
                                    </p>
                                )}
                            </div>
                        </section>

                    </div>
                )}
            </div>

            {/* DANGER ZONE */}
            <div className="mt-12 bg-red-50/50 border border-red-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h3 className="text-xl font-black text-red-900 uppercase italic tracking-tighter">Zone de Danger</h3>
                    <p className="text-sm text-red-600 font-bold mt-1">La suppression est définitive et entrainera la perte de tout de l'historique et des badges du joueur.</p>
                </div>
                <button
                    onClick={handleDeleteUser}
                    disabled={loading === "delete-user"}
                    className="bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest px-6 py-4 rounded-2xl shadow-lg transition-all disabled:opacity-50 whitespace-nowrap"
                >
                    {loading === "delete-user" ? "SUPPRESSION..." : "Supprimer le profil"}
                </button>
            </div>
        </div>
    );
}
