"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

// Bannière INVITÉ : remplace le carousel de 1re connexion (réservé aux comptes complets).
// On dit simplement à l'invité que les Pokémons / l'aventure se passent dans le Nexus.
// In-flow (pas un modal plein écran), dismissible, mémorisée en localStorage.
const LS_KEY = "pushquest_guest_nexus_hint_seen_v1";

export default function GuestNexusHint({ isGuest }: { isGuest?: boolean | null }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // null/undefined = statut encore inconnu → on attend ; false = compte complet → rien.
        if (isGuest !== true) return;
        try {
            if (localStorage.getItem(LS_KEY) !== "true") setIsVisible(true);
        } catch (e) {
            console.error("LocalStorage error:", e);
        }
    }, [isGuest]);

    const dismiss = () => {
        try {
            localStorage.setItem(LS_KEY, "true");
        } catch (e) {
            console.error("LocalStorage error:", e);
        }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="relative mx-auto mb-4 flex max-w-2xl items-start gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm text-slate-800 shadow-sm">
            <span className="text-2xl leading-none">🍝</span>
            <div className="flex-1">
                <p className="font-black">Bienvenue, invité !</p>
                <p className="mt-1 text-slate-600">
                    Les Pokémons et ton aventure se trouvent dans le <strong>Nexus</strong>.
                </p>
                <Link
                    href="/gamebook"
                    prefetch={false}
                    onClick={dismiss}
                    className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-400 transition-all hover:bg-slate-800 active:scale-95"
                >
                    Aller au Nexus →
                </Link>
            </div>
            <button
                onClick={dismiss}
                aria-label="Fermer"
                className="text-slate-400 transition-colors hover:text-slate-700"
            >
                <X size={18} strokeWidth={3} />
            </button>
        </div>
    );
}
