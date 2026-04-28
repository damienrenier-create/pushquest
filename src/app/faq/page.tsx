"use client"

import React, { useState, useEffect, Suspense } from "react"
import { Shield, Zap, Info, Trophy, Target, AlertCircle, Calculator, BookOpen, Search, Calendar, ChevronRight, X } from "lucide-react"
import { BADGE_DEFINITIONS } from "@/config/badges"
import { getXPForReward } from "@/lib/rewards"
import { useSearchParams } from "next/navigation"
import RewardDetailSheet from "@/components/RewardDetailSheet"

// XP formula: 250 * (Lvl-1) + 50 * (Lvl-1)^2
function getXPForLevel(level: number) {
    if (level <= 1) return 0;
    return 250 * (level - 1) + 50 * Math.pow(level - 1, 2);
}

const ANIMALS = [
    { level: 1, name: "Moustique", emoji: "🦟" }, { level: 2, name: "Fourmi", emoji: "🐜" }, { level: 3, name: "Abeille", emoji: "🐝" },
    { level: 4, name: "Papillon", emoji: "🦋" }, { level: 5, name: "Mante religieuse", emoji: "🦗" }, { level: 6, name: "Scorpion", emoji: "🦂" },
    { level: 7, name: "Mygale", emoji: "🕷️" }, { level: 8, name: "Escargot", emoji: "🐌" }, { level: 9, name: "Grenouille dendrobate", emoji: "🐸" },
    { level: 10, name: "Axolotl", emoji: "🦎" }, { level: 11, name: "Salamandre géante", emoji: "🦎" }, { level: 12, name: "Hippocampe", emoji: "🧜‍♂️" },
    { level: 13, name: "Poisson-globe", emoji: "🐡" }, { level: 14, name: "Poisson-lion", emoji: "🐠" }, { level: 15, name: "Murène", emoji: "🐍" },
    { level: 16, name: "Martin-pêcheur", emoji: "🐦" }, { level: 17, name: "Chouette effraie", emoji: "🦉" }, { level: 18, name: "Faucon pèlerin", emoji: "🦅" },
    { level: 19, name: "Corbeau", emoji: "🐦‍⬛" }, { level: 20, name: "Hibou grand-duc", emoji: "🦉" }, { level: 21, name: "Aigle royal", emoji: "🦅" },
    { level: 22, name: "Condor des Andes", emoji: "🦅" }, { level: 23, name: "Fennec", emoji: "🦊" }, { level: 24, name: "Suricate", emoji: "🦦" },
    { level: 25, name: "Lémurien", emoji: "🐒" }, { level: 26, name: "Ornithorynque", emoji: "🦆" }, { level: 27, name: "Panda roux", emoji: "🐼" },
    { level: 28, name: "Paresseux", emoji: "🦥" }, { level: 29, name: "Koala", emoji: "🐨" }, { level: 30, name: "Loutre", emoji: "🦦" },
    { level: 31, name: "Blaireau", emoji: "🦡" }, { level: 32, name: "Glouton", emoji: "🐻" }, { level: 33, name: "Caracal", emoji: "🐈" },
    { level: 34, name: "Serval", emoji: "🐆" }, { level: 35, name: "Lynx", emoji: "🐈" }, { level: 36, name: "Renard", emoji: "🦊" },
    { level: 37, name: "Chacal", emoji: "🐺" }, { level: 38, name: "Dingo", emoji: "🐕" }, { level: 39, name: "Loup", emoji: "🐺" },
    { level: 40, name: "Capybara", emoji: "🐹" }, { level: 41, name: "Sanglier", emoji: "🐗" }, { level: 42, name: "Cerf", emoji: "🦌" },
    { level: 43, name: "Renne", emoji: "🦌" }, { level: 44, name: "Wapiti", emoji: "🦌" }, { level: 45, name: "Kangourou roux", emoji: "🦘" },
    { level: 46, name: "Puma", emoji: "🐆" }, { level: 47, name: "Guépard", emoji: "🐆" }, { level: 48, name: "Léopard", emoji: "🐆" },
    { level: 49, name: "Panthère noire", emoji: "🐆" }, { level: 50, name: "Jaguar", emoji: "🐆" }, { level: 51, name: "Hyène tachetée", emoji: "🐺" },
    { level: 52, name: "Lion", emoji: "🦁" }, { level: 53, name: "Tigre", emoji: "🐅" }, { level: 54, name: "Chimpanzé", emoji: "🐒" },
    { level: 55, name: "Orang-outan", emoji: "🦧" }, { level: 56, name: "Gorille", emoji: "🦍" }, { level: 57, name: "Autruche", emoji: "🦅" },
    { level: 58, name: "Pélican", emoji: "🦤" }, { level: 59, name: "Albatros", emoji: "🕊️" }, { level: 60, name: "Manchot empereur", emoji: "🐧" },
    { level: 61, name: "Panda géant", emoji: "🐼" }, { level: 62, name: "Anaconda", emoji: "🐍" }, { level: 63, name: "Python", emoji: "🐍" },
    { level: 64, name: "Cobra royal", emoji: "🐍" }, { level: 65, name: "Tortue des Galápagos", emoji: "🐢" }, { level: 66, name: "Tortue luth", emoji: "🐢" },
    { level: 67, name: "Dragon de Komodo", emoji: "🦎" }, { level: 68, name: "Alligator", emoji: "🐊" }, { level: 69, name: "Crocodile du Nil", emoji: "🐊" },
    { level: 70, name: "Requin blanc", emoji: "🦈" }, { level: 71, name: "Requin-marteau", emoji: "🦈" }, { level: 72, name: "Raie manta", emoji: "🪸" },
    { level: 73, name: "Poisson-lune", emoji: "🐟" }, { level: 74, name: "Otarie", emoji: "🦭" }, { level: 75, name: "Phoque", emoji: "🦭" },
    { level: 76, name: "Dauphin", emoji: "🐬" }, { level: 77, name: "Béluga", emoji: "🐳" }, { level: 78, name: "Narval", emoji: "🐋" },
    { level: 79, name: "Orque", emoji: "🐋" }, { level: 80, name: "Requin-baleine", emoji: "🦈" }, { level: 81, name: "Rhinocéros", emoji: "🦏" },
    { level: 82, name: "Hippopotame", emoji: "🦛" }, { level: 83, name: "Girafe", emoji: "🦒" }, { level: 84, name: "Bison", emoji: "🦬" },
    { level: 85, name: "Yak", emoji: "🐂" }, { level: 86, name: "Éléphant d’Afrique", emoji: "🐘" }, { level: 87, name: "Cachalot", emoji: "🐳" },
    { level: 88, name: "Baleine bleue", emoji: "🐋" }, { level: 89, name: "Calmar géant", emoji: "🦑" }, { level: 90, name: "Pieuvre géante", emoji: "🐙" },
    { level: 91, name: "Licorne", emoji: "🦄" }, { level: 92, name: "Pégase", emoji: "🐎" }, { level: 93, name: "Griffon", emoji: "🦅" },
    { level: 94, name: "Sphinx", emoji: "🦁" }, { level: 95, name: "Phénix", emoji: "🐦🔥" }, { level: 96, name: "Basilic", emoji: "🦎" },
    { level: 97, name: "Hydre", emoji: "🐉" }, { level: 98, name: "Dragon", emoji: "🐉" }, { level: 99, name: "Kraken", emoji: "🦑" },
    { level: 100, name: "Léviathan", emoji: "🐋" }
];

const BELTS = [
    { min: 1, max: 9, name: "White Belt", color: "text-gray-400" },
    { min: 10, max: 19, name: "Yellow Belt", color: "text-yellow-500" },
    { min: 20, max: 29, name: "Orange Belt", color: "text-orange-500" },
    { min: 30, max: 39, name: "Green Belt", color: "text-green-500" },
    { min: 40, max: 49, name: "Blue Belt", color: "text-blue-500" },
    { min: 50, max: 59, name: "Brown Belt", color: "text-amber-800" },
    { min: 60, max: 69, name: "Black Belt 1st Dan", color: "text-black" },
    { min: 70, max: 79, name: "Black Belt 2nd Dan", color: "text-black" },
    { min: 80, max: 89, name: "Supreme Master", color: "text-red-600" },
    { min: 90, max: 100, name: "Living Legend", color: "text-indigo-600" },
];

function FAQContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'rules' | 'bestiary' | 'catalogue' | 'news') || 'rules';
    const [activeTab, setActiveTab] = useState<'rules' | 'bestiary' | 'catalogue' | 'news'>(initialTab);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<'ALL' | 'COMPETITIVE' | 'LEGENDARY' | 'MILESTONE' | 'EVENT'>('ALL');
    const [selectedBadge, setSelectedBadge] = useState<any>(null);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#item-')) {
            setTimeout(() => {
                setActiveTab('catalogue');
                const element = document.getElementById(hash.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-indigo-500/30', 'border-indigo-500');
                    setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-indigo-500/30', 'border-indigo-500');
                    }, 3000);
                }
            }, 500);
        }
    }, [searchParams]);

    return (
        <main className="min-h-screen bg-gray-50 py-6 sm:py-12 px-3 sm:px-4 pb-24">
            <div className="max-w-3xl mx-auto space-y-6 sm:space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-2">
                        <Info size={32} />
                    </div>
                    <h1 className="text-2xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tight sm:tracking-tighter leading-tight sm:leading-none px-2">
                        Guide Suprême du Pompes App
                    </h1>
                    <p className="text-gray-500 font-bold text-[9px] sm:text-sm uppercase tracking-widest px-4">
                        Règles, XP, Badges et Hiérarchie Animale
                    </p>
                </div>

                {/* Tabs Navigation */}
                <div className="flex bg-white p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 gap-1 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth w-full">
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-none sm:flex-1 px-5 sm:px-0 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Zap size={14} className="shrink-0" />
                        <span>Règles</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('bestiary')}
                        className={`flex-none sm:flex-1 px-4 sm:px-0 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'bestiary' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Shield size={14} />
                        Bestiaire
                    </button>
                    <button
                        onClick={() => setActiveTab('catalogue')}
                        className={`flex-none sm:flex-1 px-4 sm:px-0 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'catalogue' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <BookOpen size={14} />
                        Catalogue
                    </button>
                    <button
                        onClick={() => setActiveTab('news')}
                        className={`flex-none sm:flex-1 px-4 sm:px-0 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'news' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Zap size={14} />
                        Nouveautés
                    </button>
                </div>

                {activeTab === 'rules' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                        {/* Gain d'XP de base */}
                        <section className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm border border-gray-100 space-y-4 sm:space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-3 sm:pb-4">
                                <Zap className="text-yellow-500" size={24} />
                                <h2 className="text-xl sm:text-2xl font-black uppercase italic tracking-tighter">Gain d'XP de base</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 bg-blue-50 rounded-2xl text-center">
                                    <span className="block text-2xl mb-1">💪</span>
                                    <span className="block font-black text-blue-900">1 Pompe</span>
                                    <span className="text-blue-600 font-bold">+1 XP</span>
                                </div>
                                <div className="p-4 bg-orange-50 rounded-2xl text-center">
                                    <span className="block text-2xl mb-1">🦍</span>
                                    <span className="block font-black text-orange-900">1 Traction</span>
                                    <span className="text-orange-600 font-bold">+3 XP</span>
                                </div>
                                <div className="p-4 bg-green-50 rounded-2xl text-center">
                                    <span className="block text-2xl mb-1">🦵</span>
                                    <span className="block font-black text-green-900">1 Squat</span>
                                    <span className="text-green-600 font-bold">+1 XP</span>
                                </div>
                            </div>
                        </section>

                        {/* MÉCANIQUES UNIQUES */}
                        <section className="bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-[2.5rem] p-8 shadow-xl text-white space-y-8">
                            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                <Shield className="text-indigo-400" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Mécaniques Uniques</h2>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">🚩</span>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-indigo-300">Le Flambeau</h3>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-100 leading-relaxed">
                                        Le premier utilisateur qui valide ses répétitions quotidiennes devient le <span className="text-yellow-400 font-black italic">Porteur du Flambeau</span>.
                                    </p>
                                    <ul className="text-[10px] font-black text-indigo-200 uppercase tracking-widest space-y-1 pl-4 border-l-2 border-indigo-500/30">
                                        <li>🔥 Bonus de +100 XP immédiat</li>
                                        <li>📊 Incrémente ton compteur "Sprinter"</li>
                                        <li>🛡️ Débloque le badge "Le Flambeau" affichant ton record consécutif</li>
                                    </ul>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">🎶</span>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-pink-400">Bring Sally Up</h3>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-100 leading-relaxed">
                                        Le défi mensuel épique le <span className="underline decoration-pink-500 decoration-2">dernier jour de chaque mois</span>.
                                    </p>
                                    <ul className="text-[10px] font-black text-indigo-200 uppercase tracking-widest space-y-1 pl-4 border-l-2 border-pink-500/30">
                                        <li>🏅 Participation : +250 XP</li>
                                        <li>👑 Podium (1er) : +1000 XP & Badge Spécial</li>
                                    </ul>
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">🌪️</span>
                                        <h3 className="text-lg font-black uppercase tracking-tight text-blue-400">Records Temporaires</h3>
                                    </div>
                                    <p className="text-sm font-bold text-indigo-100 leading-relaxed">
                                        L'XP volatile liée au classement. <span className="text-red-400 uppercase font-black">Attention</span> : si on te dépasse, tu perds cet XP !
                                    </p>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <div className="p-2 bg-white/5 rounded-2xl text-center border border-white/5">
                                            <span className="block font-black text-blue-400 text-[8px]">JOUR</span>
                                            <span className="block font-black text-[10px]">+250</span>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-2xl text-center border border-white/5">
                                            <span className="block font-black text-blue-400 text-[8px]">MOIS</span>
                                            <span className="block font-black text-[10px]">+1000</span>
                                        </div>
                                        <div className="p-2 bg-white/5 rounded-2xl text-center border border-white/5">
                                            <span className="block font-black text-blue-400 text-[8px]">AN</span>
                                            <span className="block font-black text-[10px]">+2500</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Bonus de Régularité */}
                        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Target className="text-indigo-500" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Bonus de Régularité</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-3xl">
                                    <div className="p-2 bg-green-100 rounded-xl text-green-600">🎯</div>
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase text-sm">Le Jour Parfait (+200 XP)</h4>
                                        <p className="text-xs font-bold text-gray-500 mt-1 leading-snug">Objectif atteint pile poil.</p>
                                        <p className="text-[10px] uppercase font-black text-indigo-400 mt-2 italic flex items-center gap-1"><Info size={12} /> Le badge évolue secrètement si la série parfaite se prolonge...</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-5 bg-indigo-50 rounded-3xl border border-indigo-100 shadow-sm transition-transform hover:scale-[1.02]">
                                    <div className="p-2 bg-indigo-200 rounded-xl text-indigo-700">🚀</div>
                                    <div>
                                        <h4 className="font-black text-indigo-900 uppercase text-sm">Surplus Flex (Expansion)</h4>
                                        <p className="text-xs font-bold text-indigo-700 mt-1 leading-snug space-y-2">
                                            <span>Le dépassement de l'objectif est récompensé par un bonus évolutif par tranches de 10% :</span>
                                            <div className="flex items-center justify-between mt-2 px-4 py-1 bg-indigo-950/5 rounded-xl border border-indigo-100 font-black text-[10px] tabular-nums">
                                                <span>Tranche 1 (0-10%)</span>
                                                <span className="text-indigo-600">+1 XP / rep</span>
                                            </div>
                                            <div className="flex items-center justify-between px-4 py-1 bg-indigo-950/10 rounded-xl border border-indigo-200/50 font-black text-[10px] tabular-nums">
                                                <span>Tranche 2 (10-20%)</span>
                                                <span className="text-indigo-700">+2 XP / rep</span>
                                            </div>
                                            <span className="block text-indigo-900 font-extrabold text-[8px] uppercase text-center mt-2 tracking-widest">Capé à 1000 XP de bonus flex par jour</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-5 bg-orange-50 rounded-3xl border border-orange-100 shadow-sm transition-transform hover:scale-[1.02]">
                                    <div className="p-2 bg-orange-200 rounded-xl text-orange-700">🌅</div>
                                    <div>
                                        <h4 className="font-black text-orange-900 uppercase text-sm">Habitudes Tiers</h4>
                                        <p className="text-xs font-bold text-orange-800 mt-1 leading-snug">
                                            Les bonus "Lève-tôt" et "Oiseau de Nuit" évoluent : <span className="font-black">3j (+50), 7j (+150), 14j (+350), 30j (+1000)</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Trophy className="text-yellow-500" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Valeurs des Badges</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="p-4 sm:p-5 border border-gray-100 rounded-2xl sm:rounded-3xl flex flex-col group hover:bg-yellow-50 transition-colors">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight text-xs sm:text-sm">Compétitifs 🏅</h4>
                                        <span className="text-[9px] sm:text-xs font-black text-yellow-600 bg-yellow-100 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">Variable</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-[10px] font-black text-yellow-800 uppercase tabular-nums">
                                        <div className="flex justify-between"><span>🔹 T1</span><span>500</span></div>
                                        <div className="flex justify-between"><span>🔹 Avr</span><span>650</span></div>
                                        <div className="flex justify-between"><span>🔹 Mai</span><span>800</span></div>
                                        <div className="flex justify-between"><span>🔹 Juin</span><span>1000</span></div>
                                        <div className="flex justify-between"><span>🔹 Juil</span><span>1250</span></div>
                                        <div className="flex justify-between"><span>🔹 Août</span><span>1500</span></div>
                                        <div className="flex justify-between"><span>🔹 Sept</span><span>1800</span></div>
                                        <div className="flex justify-between"><span>🔹 Oct</span><span>2200</span></div>
                                        <div className="flex justify-between col-span-2"><span>🔹 Nov</span><span>2600</span></div>
                                        <div className="flex justify-between col-span-2 text-yellow-900 ring-1 ring-yellow-300 p-1 text-center bg-yellow-400/10 rounded-lg"><span>🔥 Déc</span><span>3000 XP</span></div>
                                    </div>
                                </div>
                                <div className="p-5 border border-gray-100 rounded-3xl flex justify-between items-center bg-gray-50/50">
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">Milestones 📈</h4>
                                        <p className="text-[10px] font-bold text-gray-500">Volume total cumulé.</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-indigo-600">10% du seuil</span>
                                        <span className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest">Capé à 10k XP</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Calendar className="text-pink-500" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Calendrier Force</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { d: "20 Mar / 22 Sep", e: "Equinoxes 🌓", c: "Equilibre Push/Squat (50/50)" },
                                    { d: "21 Juin", e: "Solstice Eté ☀️", c: "Massif (>900 reps)" },
                                    { d: "21 Déc", e: "Solstice Hiver ❄️", c: "12h de présence" },
                                    { d: "06 Déc", e: "St Nicolas 🎅", c: "Total finissant par '6'" },
                                    { d: "25 Déc", e: "Noël 🎄", c: "Echelle de 1 à 12 reps" },
                                    { d: "06 Juin", e: "The Murph 🎖️", c: "Le défi légendaire du D-Day" }
                                ].map(ev => (
                                    <div key={ev.e} className="flex justify-between items-center py-2 px-4 bg-gray-50 rounded-xl hover:bg-white border border-transparent hover:border-gray-100 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="font-black text-[9px] text-pink-500 uppercase">{ev.d}</span>
                                            <span className="font-black text-gray-800 text-[10px] uppercase">{ev.e}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 italic text-right max-w-[120px] group-hover:text-gray-600 transition-colors">{ev.c}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'bestiary' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <section className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none italic font-black">f(x)</div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calculator size={24} />
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Loi d'Évolution</h2>
                                </div>
                                <div className="bg-white/10 p-6 rounded-3xl border border-white/10 text-center text-indigo-100">
                                    <code className="block text-2xl font-black">250(L-1) + 50(L-1)²</code>
                                    <p className="text-[10px] uppercase tracking-widest mt-2">XP cumulé pour le niveau L</p>
                                </div>
                            </div>
                        </section>

                        <div className="space-y-12">
                            {BELTS.map((belt) => (
                                <div key={belt.name} className="space-y-4">
                                    <div className="flex items-center gap-4 px-2 font-black uppercase italic tracking-tighter">
                                        <h3 className={`text-xl ${belt.color}`}>{belt.name}</h3>
                                        <div className="h-px bg-gray-200 flex-1" />
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">Nv. {belt.min} - {belt.max}</span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {ANIMALS.filter(a => a.level >= belt.min && a.level <= belt.max).map((animal) => (
                                            <div key={animal.level} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50 group hover:border-indigo-100 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 font-black text-gray-300 text-xs">#{animal.level}</span>
                                                    <span className="text-2xl group-hover:scale-125 transition-transform">{animal.emoji}</span>
                                                    <span className="font-black text-gray-800 uppercase tracking-tighter text-sm">{animal.name}</span>
                                                </div>
                                                <div className="text-right font-black text-indigo-600 tabular-nums">
                                                    {getXPForLevel(animal.level).toLocaleString('fr-FR')} XP
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'catalogue' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <section className="bg-indigo-600 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl italic font-black">100+</div>
                            <div className="relative z-10 space-y-6">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Catalogue de la Gloire</h2>
                                <div className="space-y-4">
                                    <div className="relative max-w-md mx-auto">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Trouver un badge..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-indigo-950/30 border border-white/20 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-indigo-200 focus:outline-none transition-all font-bold text-sm text-center shadow-inner"
                                        />
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {['ALL', 'COMPETITIVE', 'LEGENDARY', 'MILESTONE', 'EVENT'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFilter(f as any)}
                                                className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border ${filter === f ? 'bg-white text-indigo-600 shadow-xl' : 'bg-white/5 text-indigo-100 border-white/10'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <div className="space-y-12">
                            {["COMPETITIVE", "LEGENDARY", "MILESTONE", "EVENT"].filter(t => filter === 'ALL' || filter === t).map(type => {
                                const badges = BADGE_DEFINITIONS.filter(b =>
                                    b.type === type && (searchQuery === "" || b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                );
                                if (badges.length === 0) return null;
                                return (
                                    <div key={type} className="space-y-6">
                                        <div className="flex items-center gap-4 px-2 font-black uppercase italic tracking-tighter text-gray-900 text-lg">
                                            <span>{type === "COMPETITIVE" ? "Compétitifs" : type === "LEGENDARY" ? "Légendaires" : type === "MILESTONE" ? "Milestones" : "Spéciaux"}</span>
                                            <div className="h-px bg-gray-200 flex-1" />
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                            {badges.map(badge => (
                                                <button
                                                    key={badge.key}
                                                    id={`item-${badge.key}`}
                                                    onClick={() => setSelectedBadge({
                                                        ...badge,
                                                        xp: getXPForReward(badge.key)
                                                    })}
                                                    className={`group relative bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-5 border-2 transition-all hover:scale-[1.02] hover:shadow-xl active:scale-95 scroll-mt-24 text-left flex flex-col items-center justify-center gap-2 sm:gap-3 ${badge.rarity === 'LEGENDARY' ? 'border-orange-100 hover:border-orange-300 bg-orange-50/5' : badge.rarity === 'EPIC' ? 'border-purple-100 hover:border-purple-300 bg-purple-50/5' : 'border-gray-50 hover:border-indigo-200'}`}
                                                >
                                                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-2xl sm:text-4xl shadow-inner shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3 ${badge.rarity === 'LEGENDARY' ? 'bg-orange-100/50' : badge.rarity === 'EPIC' ? 'bg-purple-100/50' : 'bg-gray-100'}`}>
                                                        {badge.emoji}
                                                    </div>
                                                    <div className="text-center w-full">
                                                        <h3 className="text-[10px] sm:text-xs font-black text-gray-900 uppercase italic tracking-tight line-clamp-2 leading-tight">
                                                            {badge.name}
                                                        </h3>
                                                        <div className={`mt-1.5 inline-block px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${badge.rarity === 'LEGENDARY' ? 'bg-orange-600 text-white' : badge.rarity === 'EPIC' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                            {badge.rarity}
                                                        </div>
                                                    </div>

                                                    {/* Hover Overlay info hint */}
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Info size={12} className="text-gray-300" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Badge Detail Modal */}
                <RewardDetailSheet
                    detail={selectedBadge}
                    onClose={() => setSelectedBadge(null)}
                />

                {activeTab === 'news' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <section className="bg-gradient-to-r from-pink-600 to-rose-600 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl italic font-black">NEW</div>
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Dernières Mises à Jour</h2>
                        </section>
                        <div className="space-y-6">
                            <p className="text-center font-black text-gray-400 uppercase tracking-widest text-[10px]">Découvrez les nouveaux trophées récemment ajoutés !</p>
                            <div className="grid grid-cols-1 gap-4">
                                {BADGE_DEFINITIONS.filter(b => b.addedAt).sort((a, b) => b.addedAt!.localeCompare(a.addedAt!)).slice(0, 5).map(badge => (
                                    <div key={badge.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between group hover:border-pink-200 transition-all">
                                        <div className="flex items-center gap-4">
                                            <span className="text-4xl group-hover:rotate-12 transition-transform">{badge.emoji}</span>
                                            <div>
                                                <h4 className="font-black text-gray-900 uppercase text-xs italic">{badge.name}</h4>
                                                <p className="text-[9px] font-bold text-gray-500">{badge.description}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setActiveTab('catalogue');
                                                setTimeout(() => {
                                                    const el = document.getElementById(`item-${badge.key}`);
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                }, 100);
                                            }}
                                            className="p-2 hover:bg-pink-50 rounded-xl transition-colors"
                                        >
                                            <ChevronRight className="text-pink-600" size={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic pb-12">
                    Design & Logic by Pompes App Engine v2.1
                </p>
            </div>
        </main>
    );
}

export default function FAQPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <FAQContent />
        </Suspense>
    );
}
