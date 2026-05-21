"use client"

// src/app/gamebook/BlackScreen.tsx
//
// Écran noir affiché 10 secondes la PREMIÈRE FOIS qu'un user arrive sur /gamebook.
// Sert à éviter que les utilisateurs "tombent" sur le jeu par hasard avant qu'il soit prêt.
// L'info "déjà vu" est persistée via hasSeenWelcomeScreen dans GamebookProgress.

import { useEffect, useState } from "react"

const DURATION_MS = 10_000

export default function BlackScreen({ onDone }: { onDone: () => void }) {
    const [seconds, setSeconds] = useState(Math.ceil(DURATION_MS / 1000))

    useEffect(() => {
        const tick = setInterval(() => {
            setSeconds((s) => Math.max(0, s - 1))
        }, 1000)
        const done = setTimeout(() => {
            onDone()
        }, DURATION_MS)
        return () => {
            clearInterval(tick)
            clearTimeout(done)
        }
    }, [onDone])

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "#000",
                color: "#222",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                fontFamily: "'Courier New', monospace",
                zIndex: 9999,
                userSelect: "none",
            }}
        >
            <div
                style={{
                    fontSize: "10px",
                    letterSpacing: "4px",
                    opacity: 0.4,
                    marginBottom: "16px",
                }}
            >
                CHARGEMENT...
            </div>
            <div
                style={{
                    fontSize: "12px",
                    opacity: 0.3,
                    letterSpacing: "2px",
                }}
            >
                {seconds}
            </div>
        </div>
    )
}
