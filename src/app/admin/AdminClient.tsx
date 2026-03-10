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
                                <option value="GAINAGE" className="bg-slate-900">GAINAGE</option>
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
