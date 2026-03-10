"use client"

import React, { useState, useEffect } from "react"
import { Shield, Zap, Info, Trophy, Target, AlertCircle, Calculator, BookOpen } from "lucide-react"
import { BADGE_DEFINITIONS } from "@/config/badges"
import { getXPForReward } from "@/lib/rewards"
import { useSearchParams } from "next/navigation"

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

import { Suspense } from "react"

function FAQContent() {
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as 'rules' | 'bestiary' | 'catalogue') || 'rules';
    const [activeTab, setActiveTab] = useState<'rules' | 'bestiary' | 'catalogue'>(initialTab);

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#item-')) {
            setActiveTab('catalogue');
            setTimeout(() => {
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
        <main className="min-h-screen bg-gray-50 py-12 px-4 pb-24">
            <div className="max-w-3xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="inline-block p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-2">
                        <Info size={32} />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                        Guide Suprême du Pompes App
                    </h1>
                    <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">
                        Règles, XP, Badges et Hiérarchie Animale
                    </p>
                </div>

                {/* Tabs Navigation */}
                <div className="flex bg-white p-2 rounded-3xl shadow-sm border border-gray-100 gap-2">
                    <button
                        onClick={() => setActiveTab('rules')}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Zap size={16} />
                        Règles
                    </button>
                    <button
                        onClick={() => setActiveTab('bestiary')}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'bestiary' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <Shield size={16} />
                        Bestiaire
                    </button>
                    <button
                        onClick={() => setActiveTab('catalogue')}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${activeTab === 'catalogue' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <BookOpen size={16} />
                        Catalogue
                    </button>
                </div>

                {activeTab === 'rules' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                        {/* Gain d'XP de base */}
                        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Zap className="text-yellow-500" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Gain d'XP de base</h2>
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
                                        <p className="text-xs font-bold text-gray-500 mt-1 leading-snug">
                                            Objectif atteint pile poil (Total = Cible).
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                                    <div className="p-2 bg-indigo-200 rounded-xl text-indigo-700">🚀</div>
                                    <div>
                                        <h4 className="font-black text-indigo-900 uppercase text-sm">Surplus Flex (Exponentiel)</h4>
                                        <p className="text-xs font-bold text-indigo-700 mt-1 leading-snug space-y-2">
                                            <span>Le dépassement de l'objectif est récompensé par un bonus évolutif :</span>
                                            <ul className="list-disc pl-4 mt-2 mb-1">
                                                <li>Les premiers 10% au-dessus de l'objectif rapportent <strong>+1 XP par rep</strong>.</li>
                                                <li>Les 10% suivants rapportent <strong>+2 XP par rep</strong>.</li>
                                                <li>Les 10% d'après rapportent <strong>+3 XP par rep</strong>... etc.</li>
                                            </ul>
                                            <span className="block text-indigo-900 font-black text-[10px] uppercase mt-2">Plus tu dépasses l'objectif, plus chaque rep vaut cher.</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Valeurs des Badges */}
                        <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 space-y-6">
                            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                                <Trophy className="text-yellow-500" size={24} />
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Valeurs des Badges</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 text-sm">
                                <div className="p-5 border border-gray-100 rounded-3xl flex justify-between items-center group hover:bg-yellow-50 transition-colors">
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">Badges Compétitifs 🏅</h4>
                                        <p className="text-[10px] font-bold text-gray-500 mb-2">Volables, le montant reçu évolue en cours d'année</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-black text-yellow-800 bg-yellow-100/50 p-3 rounded-xl">
                                            <span>🔹 T1 : 500 XP</span>
                                            <span>🔹 Apr : 650 XP</span>
                                            <span>🔹 May : 800 XP</span>
                                            <span>🔹 Jun : 1000 XP</span>
                                            <span>🔹 Jul : 1250 XP</span>
                                            <span>🔹 Aug : 1500 XP</span>
                                            <span>🔹 Sep : 1800 XP</span>
                                            <span>🔹 Oct : 2200 XP</span>
                                            <span className="col-span-2 text-yellow-900">🔹 Nov : 2600 XP</span>
                                            <span className="col-span-2 text-yellow-900">🔥 Dec : 3000 XP</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5 border border-gray-100 rounded-3xl flex justify-between items-center group hover:bg-purple-50 transition-colors">
                                    <div>
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">Milestones (Paliers) 📈</h4>
                                        <p className="text-[10px] font-bold text-gray-500">Volume total (1k, 5k, 10k...)</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-black text-green-600 text-lg">25% du seuil</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Perte d'XP */}
                        <section className="bg-red-50 rounded-[2.5rem] p-8 border border-red-100 space-y-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="text-red-500" size={24} />
                                <h3 className="text-xl font-black text-red-900 uppercase italic tracking-tighter">Peut-on perdre de l'XP ?</h3>
                            </div>
                            <p className="text-sm font-bold text-red-800 leading-relaxed">
                                Jamais l'XP de tes entraînements. Cependant, perdre un badge compétitif (volé par un autre) retire son bonus d'XP, ce qui peut te faire perdre un niveau !
                            </p>
                        </section>
                    </div>
                )}

                {activeTab === 'bestiary' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        {/* Evolution Formula */}
                        <section className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none italic font-black">f(x)</div>
                            <div className="relative z-10 space-y-4">
                                <div className="flex items-center gap-3">
                                    <Calculator size={24} />
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">La Loi d'Évolution</h2>
                                </div>
                                <div className="bg-white/10 p-6 rounded-3xl border border-white/10">
                                    <code className="block text-2xl font-black text-center text-indigo-200 tracking-tighter">
                                        250(L-1) + 50(L-1)²
                                    </code>
                                    <p className="text-[10px] text-center font-bold uppercase tracking-widest mt-4 text-indigo-300">
                                        XP cumulé requis pour atteindre le niveau L.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Animal List */}
                        <div className="space-y-12">
                            {BELTS.map((belt) => (
                                <div key={belt.name} className="space-y-4">
                                    <div className="flex items-center gap-4 px-2">
                                        <h3 className={`text-xl font-black uppercase italic tracking-tighter ${belt.color}`}>
                                            {belt.name}
                                        </h3>
                                        <div className="h-px bg-gray-200 flex-1" />
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                            Nv. {belt.min} - {belt.max}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {ANIMALS.filter(a => a.level >= belt.min && a.level <= belt.max).map((animal) => {
                                            const xp = getXPForLevel(animal.level);
                                            return (
                                                <div key={animal.level} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-gray-50 group hover:border-indigo-100 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <span className="w-8 font-black text-gray-300 text-xs">#{animal.level}</span>
                                                        <span className="text-2xl group-hover:scale-125 transition-transform">{animal.emoji}</span>
                                                        <span className="font-black text-gray-800 uppercase tracking-tighter text-sm">
                                                            {animal.name}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block font-black text-indigo-600 tabular-nums">
                                                            {xp.toLocaleString('fr-FR')} XP
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'catalogue' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        {/* Catalogue Header */}
                        <section className="bg-indigo-600 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 text-8xl pointer-events-none italic font-black">100+</div>
                            <div className="relative z-10 space-y-2">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Catalogue des Récompenses</h2>
                                <p className="text-indigo-100 font-bold text-sm">Découvrez comment débloquer chaque badge et la gloire qu'il rapporte.</p>
                            </div>
                        </section>

                        {/* Catalogue Grid */}
                        <div className="grid grid-cols-1 gap-12">
                            {["COMPETITIVE", "LEGENDARY", "MILESTONE", "EVENT"].map(type => {
                                const badges = BADGE_DEFINITIONS.filter(b => b.type === type);
                                if (badges.length === 0) return null;

                                return (
                                    <div key={type} className="space-y-6">
                                        <div className="flex items-center gap-4 px-2">
                                            <h3 className="text-lg font-black uppercase italic tracking-tighter text-gray-900 flex items-center gap-2">
                                                {type === "COMPETITIVE" && <Zap size={18} className="text-yellow-500" />}
                                                {type === "LEGENDARY" && <Trophy size={18} className="text-indigo-500" />}
                                                {type === "MILESTONE" && <Target size={18} className="text-green-500" />}
                                                {type === "EVENT" && <Zap size={18} className="text-purple-500" />}
                                                {type === "COMPETITIVE" ? "Badges Compétitifs" :
                                                    type === "LEGENDARY" ? "Trophées Légendaires" :
                                                        type === "MILESTONE" ? "Hauts Faits (Milestones)" : "Événements Spéciaux"}
                                            </h3>
                                            <div className="h-px bg-gray-200 flex-1" />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {badges.map(badge => {
                                                const xp = getXPForReward(badge.key);
                                                return (
                                                    <div
                                                        key={badge.key}
                                                        id={`item-${badge.key}`}
                                                        className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group scroll-mt-24"
                                                    >
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-4xl group-hover:scale-110 transition-transform">{badge.emoji}</span>
                                                                <div>
                                                                    <h4 className="font-black text-gray-900 uppercase text-sm leading-tight italic">{badge.name}</h4>
                                                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">+{xp} XP</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3">
                                                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-50 group-hover:bg-indigo-50/30 group-hover:border-indigo-100/50 transition-colors">
                                                                <p className="text-xs font-bold text-gray-600 leading-relaxed italic mb-2">"{badge.description}"</p>
                                                                <div className="flex items-start gap-2">
                                                                    <Target size={12} className="text-indigo-400 mt-0.5 shrink-0" />
                                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight leading-none">Condition :</p>
                                                                </div>
                                                                <p className="text-[11px] font-black text-indigo-600 mt-1 pl-5">
                                                                    {badge.condition || "Non spécifié"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
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
