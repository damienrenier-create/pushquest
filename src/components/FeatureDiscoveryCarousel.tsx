"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Slide = {
    title: string;
    text: string;
    feature: string;
    tip?: string;
    emoji: string;
};

const SLIDES: Slide[] = [
    {
        title: "Ton menu principal",
        text: "Le dashboard est ton camp de base : tu peux encoder tes efforts, suivre ta progression, consulter la cagnotte et surveiller les trophées.",
        feature: "Menu principal / Dashboard",
        tip: "Passe d’un onglet à l’autre pour voir tout ce que l’app cache.",
        emoji: "🎮"
    },
    {
        title: "Encode tes séries, même avec du retard",
        text: "Tu peux saisir tes efforts par séries, pour aujourd’hui, hier, J-2 ou J-3. L’app additionne tout et vérifie si ta journée est validée.",
        feature: "Saisie par séries + dates récentes",
        tip: "Si tu as oublié d’encoder hier, tu peux encore le faire.",
        emoji: "✍️"
    },
    {
        title: "Volume d’effort et gainage",
        text: "Pompes, squats, tractions et gainage peuvent participer à ton objectif. Pour le gainage, 5 secondes valent 1 unité d’effort.",
        feature: "Volume d’effort multi-exercices",
        tip: "Mixe plusieurs exercices pour atteindre la cible du jour.",
        emoji: "💪"
    },
    {
        title: "Tes progrès ne mentent pas",
        text: "L’onglet Graphiques montre ton évolution dans le temps. Tu peux aussi retrouver des graphiques plus détaillés dans les vitrines des joueurs.",
        feature: "Graphiques de progression",
        tip: "Compare tes 30 derniers jours avec ta progression globale.",
        emoji: "📈"
    },
    {
        title: "La cagnotte garde les comptes",
        text: "Les journées non validées peuvent alimenter la cagnotte. L’onglet Cagnotte montre le total, les contributions et les paliers.",
        feature: "Cagnotte / amendes",
        tip: "Va voir qui finance le prochain palier.",
        emoji: "💸"
    },
    {
        title: "Les trophées sont vivants",
        text: "Dans l’onglet Trophées, tu peux voir l’activité récente, les derniers exploits et certains badges en danger.",
        feature: "Onglet Trophées / activité récente",
        tip: "Regarde si un trophée est proche d’être volé.",
        emoji: "🏆"
    },
    {
        title: "Le Panthéon, c’est la salle de guerre",
        text: "Le Panthéon rassemble le Journal de Gloire, la Guerre des Trônes et les Cibles Prioritaires. C’est là que le jeu devient stratégique.",
        feature: "Panthéon",
        tip: "Ouvre le Panthéon pour voir qui règne vraiment.",
        emoji: "🏛️"
    },
    {
        title: "Le Journal de Gloire raconte la légende",
        text: "Le Journal de Gloire met en avant les nouveautés, les exploits récents et les mouvements importants du royaume.",
        feature: "Journal de Gloire",
        tip: "Va voir les derniers faits d’armes du groupe.",
        emoji: "📜"
    },
    {
        title: "Qui règne ? Qui menace ?",
        text: "La Guerre des Trônes montre les détenteurs actuels, les challengers les plus proches et l’écart à combler pour voler un titre.",
        feature: "Guerre des Trônes",
        tip: "Choisis un trophée à attaquer.",
        emoji: "👑"
    },
    {
        title: "Tes cibles faciles à portée de main",
        text: "Les Cibles Prioritaires t’aident à repérer les badges ou trophées que tu peux gagner le plus facilement.",
        feature: "Cibles Prioritaires",
        tip: "Cherche le badge le plus proche et fonce.",
        emoji: "🎯"
    },
    {
        title: "Espionne tes rivaux",
        text: "La Vitrine des Concurrents donne accès aux profils des joueurs : efforts, XP, titres, badges, graphiques, amendes et état de service.",
        feature: "Vitrine des Concurrents / profils",
        tip: "Clique sur un joueur pour découvrir sa fiche complète.",
        emoji: "🕵️"
    },
    {
        title: "Le résumé de l’équipe",
        text: "Le leaderboard compare les joueurs par XP, volume global ou exercice. C’est aussi un raccourci vers les profils des concurrents.",
        feature: "Leaderboard",
        tip: "Regarde qui domine chaque catégorie.",
        emoji: "📊"
    },
    {
        title: "La Place publique, c’est le QG du groupe",
        text: "Tu y trouves les événements, le badge à l’honneur, les humeurs, le mur de messages, la Gazette XP et les liens utiles.",
        feature: "Place publique",
        tip: "Passe par là pour voir ce qui se prépare.",
        emoji: "📢"
    },
    {
        title: "Des XP faciles se cachent partout",
        text: "Surveille le badge à l’honneur, les événements, la Gazette XP, les nouveaux trophées et la FAQ pour comprendre comment progresser plus vite.",
        feature: "Badge à l’honneur / événements / FAQ",
        tip: "Clique sur les liens de la Place publique pour découvrir les règles et les nouveautés.",
        emoji: "💎"
    }
];

const LS_KEY = "pushquest_feature_carousel_seen_v1";

export default function FeatureDiscoveryCarousel() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        try {
            const seen = localStorage.getItem(LS_KEY);
            if (seen !== "true") {
                setIsVisible(true);
            }
        } catch (e) {
            console.error("LocalStorage error:", e);
        }
    }, []);

    const markAsSeen = () => {
        try {
            localStorage.setItem(LS_KEY, "true");
        } catch (e) {
            console.error("LocalStorage error:", e);
        }
        setIsVisible(false);
    };

    const closeForSession = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    const currentSlide = SLIDES[currentIndex];
    const isLastSlide = currentIndex === SLIDES.length - 1;

    const nextSlide = () => {
        if (!isLastSlide) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white max-w-sm w-full rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col transform-gpu animate-in zoom-in-95 duration-300 spring-bounce-200">

                {/* Header with progress and close */}
                <div className="flex justify-between items-center px-6 pt-6 mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {currentIndex + 1} / {SLIDES.length}
                    </span>
                    <button
                        onClick={closeForSession}
                        aria-label="Fermer temporairement"
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all active:scale-90"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-inner animate-in slide-in-from-bottom-2 duration-500">
                        {currentSlide.emoji}
                    </div>

                    <h2 className="text-xl font-black text-slate-800 leading-tight mb-3">
                        {currentSlide.title}
                    </h2>

                    <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
                        {currentSlide.text}
                    </p>

                    {/* Feature Highlight */}
                    <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-left relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Fonctionnalité</span>
                        <span className="text-xs font-bold text-slate-700 block">{currentSlide.feature}</span>

                        {currentSlide.tip && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60">
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1 italic">À tester</span>
                                <span className="text-xs font-medium text-slate-600 italic block">{currentSlide.tip}</span>
                            </div>
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 w-full">
                        {currentIndex > 0 ? (
                            <button
                                onClick={prevSlide}
                                className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
                            >
                                <ChevronLeft size={24} strokeWidth={3} />
                            </button>
                        ) : null}

                        {!isLastSlide ? (
                            <button
                                onClick={nextSlide}
                                className="flex-1 h-14 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                Suivant <ChevronRight size={20} strokeWidth={3} />
                            </button>
                        ) : (
                            <button
                                onClick={markAsSeen}
                                className="flex-1 h-14 bg-emerald-500 text-white font-black rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                            >
                                J'ai compris !
                            </button>
                        )}
                    </div>

                    {/* Silent Dismiss */}
                    <button
                        onClick={markAsSeen}
                        className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                    >
                        Ne plus afficher
                    </button>
                </div>

                {/* Progress bar at the bottom */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-slate-100 w-full">
                    <div
                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${((currentIndex + 1) / SLIDES.length) * 100}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}
