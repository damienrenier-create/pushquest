"use client"

// src/app/gamebook/FrozenScreen.tsx
//
// v3.6 — Overlay anti-triche affiché à la place de la carte quand
// `gamebookFrozenUntil` est dans le futur. Le Monstre Spaghetti commente.
//
// Comportement :
//   - countdown live HH:MM:SS jusqu'au dégel
//   - phrase sarcastique aléatoire au montage (stable jusqu'au refresh)
//   - quand le countdown atteint 0, appelle onUnfrozen() pour permettre
//     au parent de re-fetch /api/gamebook/state et basculer sur MapClient

import { useEffect, useMemo, useState } from "react"

// v3.23s — Phrases adoucies (gel passé de 24h à 5 min). Plus de reset position non plus :
// le joueur reste là où il était, juste figé 5 min pour méditer son geste.
const MONSTER_LINES = [
    "Tu as effacé des reps. Mes spaghettis sont profondément déçus.",
    "Triche détectée. Le Monstre Spaghetti Volant siffle. Cinq minutes au piquet.",
    "On efface pas son passé chez moi, mon p'tit. Au coin pour 5 minutes.",
    "Tu pensais que je ne verrais pas ? Les nouilles voient tout.",
    "Réduire ses reps après coup, c'est niveau gainage moral : zéro.",
    "Cinq minutes de pause. Tu restes où tu es. Médite tes pompes.",
    "Frauder devant le Monstre, c'est comme nager dans la sauce tomate : visible.",
    "Tes mensonges valent 5 minutes de réflexion forcée. Bon courage.",
    "La carte est gelée. Toi aussi. Cinq minutes, ça passe vite.",
    "J'ai des yeux dans chaque brin de pâte. Tu n'as pas idée.",
]

function pickLine(): string {
    return MONSTER_LINES[Math.floor(Math.random() * MONSTER_LINES.length)]
}

function formatRemaining(ms: number): string {
    if (ms <= 0) return "00:00:00"
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
        .toString()
        .padStart(2, "0")
    const m = Math.floor((totalSec % 3600) / 60)
        .toString()
        .padStart(2, "0")
    const s = (totalSec % 60).toString().padStart(2, "0")
    return `${h}:${m}:${s}`
}

interface Props {
    /** ISO string ou Date de l'instant où le freeze prend fin. */
    frozenUntil: string | Date
    /** Callback déclenché une fois quand le countdown atteint 0. */
    onUnfrozen?: () => void
}

export default function FrozenScreen({ frozenUntil, onUnfrozen }: Props) {
    const line = useMemo(() => pickLine(), [])
    const targetMs = useMemo(() => {
        return frozenUntil instanceof Date
            ? frozenUntil.getTime()
            : new Date(frozenUntil).getTime()
    }, [frozenUntil])

    const [remaining, setRemaining] = useState<number>(() => targetMs - Date.now())

    useEffect(() => {
        const tick = setInterval(() => {
            const r = targetMs - Date.now()
            setRemaining(r)
            if (r <= 0) {
                clearInterval(tick)
                onUnfrozen?.()
            }
        }, 1000)
        return () => clearInterval(tick)
    }, [targetMs, onUnfrozen])

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#2a0d0d",
                color: "#f3c98b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontFamily: "'Courier New', monospace",
                zIndex: 9999,
                userSelect: "none",
                padding: 24,
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: 10,
                    letterSpacing: 6,
                    opacity: 0.5,
                    marginBottom: 24,
                }}
            >
                🍝 GEL ACTIF 🍝
            </div>

            <div
                style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    maxWidth: 480,
                    marginBottom: 32,
                    opacity: 0.9,
                }}
            >
                {line}
            </div>

            <div
                style={{
                    fontSize: 10,
                    letterSpacing: 4,
                    opacity: 0.4,
                    marginBottom: 8,
                }}
            >
                RETOUR AU JEU DANS
            </div>
            <div
                style={{
                    fontSize: 28,
                    letterSpacing: 6,
                    fontWeight: "bold",
                    color: "#ffe3a8",
                    marginBottom: 40,
                }}
            >
                {formatRemaining(remaining)}
            </div>

            <a
                href="/"
                style={{
                    fontSize: 11,
                    letterSpacing: 3,
                    color: "#f3c98b",
                    opacity: 0.6,
                    textDecoration: "underline",
                }}
            >
                QUITTER LE GAMEBOOK
            </a>
        </div>
    )
}
