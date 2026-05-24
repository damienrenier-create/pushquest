"use client"

// src/app/gamebook/PiaffiniFlightScreen.tsx
//
// v3.11 — Cinématique de vol de PIAFFINI.
//
// Fond noir progressif, emoji 🐦 traverse l'écran en CSS, texte centré
// "PIAFFINI t'emporte loin...". Après ~3s, callback onDone() qui déclenche
// la route /api/gamebook/piaffini/rescue côté MapClient (téléport + récompenses).

import { useEffect, useRef, useState } from "react"

const DURATION_MS = 3200

export default function PiaffiniFlightScreen({ onDone }: { onDone: () => void }) {
    const [textVisible, setTextVisible] = useState(false)

    // v3.23d FIX — Le parent (MapClient) re-rend toutes les ~400ms (animation jambes,
    // Pusher, etc.), ce qui change la référence d'onDone à chaque render. Si on met
    // onDone dans les deps de useEffect, le timeout est reset à zéro à chaque re-render
    // du parent → DURATION_MS n'est JAMAIS atteint → onDone() jamais appelé →
    // pas de téléport, pas de badge, pas de Set de Nage. Bug critique.
    //
    // Fix : on stocke onDone dans une ref (mise à jour à chaque render) et on lance
    // les timeouts UNE seule fois au mount (deps = []). La ref garantit qu'on appellera
    // la dernière version d'onDone à l'expiration.
    const onDoneRef = useRef(onDone)
    useEffect(() => {
        onDoneRef.current = onDone
    }, [onDone])

    useEffect(() => {
        const showText = setTimeout(() => setTextVisible(true), 500)
        const done = setTimeout(() => onDoneRef.current(), DURATION_MS)
        return () => {
            clearTimeout(showText)
            clearTimeout(done)
        }
    }, [])  // Mount-only — ne pas remettre onDone dans les deps

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#000",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                zIndex: 9999,
                userSelect: "none",
                overflow: "hidden",
            }}
        >
            {/* Étoiles statiques d'ambiance */}
            <Star top="15%" left="20%" />
            <Star top="35%" left="65%" />
            <Star top="55%" left="30%" />
            <Star top="75%" left="80%" />
            <Star top="25%" left="85%" />
            <Star top="65%" left="10%" />

            {/* L'oiseau qui traverse l'écran de gauche à droite */}
            <style jsx>{`
                @keyframes piaffiniFly {
                    0% {
                        transform: translateX(-15vw) translateY(0) rotate(-5deg);
                        opacity: 0;
                    }
                    20% {
                        opacity: 1;
                    }
                    50% {
                        transform: translateX(40vw) translateY(-10px) rotate(5deg);
                    }
                    80% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(110vw) translateY(0) rotate(-5deg);
                        opacity: 0;
                    }
                }
                .piaffini-flying {
                    position: absolute;
                    top: 45%;
                    left: 0;
                    font-size: 56px;
                    animation: piaffiniFly 3.2s ease-in-out forwards;
                    filter: drop-shadow(0 4px 8px rgba(240, 208, 64, 0.6));
                }
                @keyframes textPulse {
                    0%, 100% { opacity: 0.8; }
                    50% { opacity: 1; }
                }
            `}</style>
            <div className="piaffini-flying">🐦</div>

            {/* Texte centré */}
            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 12,
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        fontSize: 14,
                        letterSpacing: 6,
                        opacity: textVisible ? 0.9 : 0,
                        transition: "opacity 1s ease",
                        animation: textVisible ? "textPulse 2s infinite ease-in-out" : undefined,
                        textAlign: "center",
                    }}
                >
                    PIAFFINI T'EMPORTE LOIN...
                </div>
                <div
                    style={{
                        fontSize: 10,
                        letterSpacing: 4,
                        opacity: textVisible ? 0.5 : 0,
                        transition: "opacity 1.5s ease 0.5s",
                        textAlign: "center",
                    }}
                >
                    Direction : Bourg-Boulette
                </div>
            </div>
        </div>
    )
}

function Star({ top, left }: { top: string; left: string }) {
    return (
        <div
            style={{
                position: "absolute",
                top,
                left,
                width: 3,
                height: 3,
                background: "#fff",
                borderRadius: "50%",
                opacity: 0.6,
                boxShadow: "0 0 4px rgba(255, 255, 255, 0.6)",
                animation: "gbBlink 2.5s infinite",
            }}
        />
    )
}
