"use client"

// src/app/gamebook/StartMenu.tsx
//
// v3.8 — Menu Pokémon-like ouvert via le bouton START.
// Entries actuelles : SAC, RETOUR. Extensible (futur : STATUS, SAUVEGARDE...).
//
// Navigation : flèches haut/bas + A pour valider, ou clic direct.

import { useEffect, useState } from "react"

export type StartMenuEntry = "bag" | "travel" | "close"

interface Props {
    onSelect: (entry: StartMenuEntry) => void
    onClose: () => void
}

const ENTRIES: Array<{ key: StartMenuEntry; label: string }> = [
    { key: "bag", label: "🎒 SAC" },
    { key: "travel", label: "🗺️ VOYAGE" },
    { key: "close", label: "↩ RETOUR" },
]

export default function StartMenu({ onSelect, onClose }: Props) {
    const [cursor, setCursor] = useState(0)

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") {
                e.preventDefault()
                setCursor((c) => (c - 1 + ENTRIES.length) % ENTRIES.length)
            } else if (e.key === "ArrowDown") {
                e.preventDefault()
                setCursor((c) => (c + 1) % ENTRIES.length)
            } else if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "a") {
                e.preventDefault()
                const entry = ENTRIES[cursor]
                if (entry.key === "close") onClose()
                else onSelect(entry.key)
            } else if (e.key === "Escape") {
                e.preventDefault()
                onClose()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [cursor, onSelect, onClose])

    return (
        <div
            style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "min(60vw, 220px)",
                background: "#fcfcfc",
                color: "#181818",
                fontFamily: "'Courier New', monospace",
                zIndex: 8000,
                borderLeft: "4px solid #181818",
                padding: "12px 6px",
                userSelect: "none",
                boxShadow: "-4px 0 0 rgba(0,0,0,0.4)",
            }}
        >
            <div
                style={{
                    fontSize: 10,
                    letterSpacing: 3,
                    fontWeight: "bold",
                    marginBottom: 12,
                    paddingLeft: 8,
                    color: "#181818",
                }}
            >
                MENU
            </div>
            {ENTRIES.map((e, i) => {
                const selected = i === cursor
                return (
                    <button
                        key={e.key}
                        onClick={() => {
                            setCursor(i)
                            if (e.key === "close") onClose()
                            else onSelect(e.key)
                        }}
                        style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "6px 8px",
                            background: "transparent",
                            border: "none",
                            color: "#181818",
                            fontFamily: "'Courier New', monospace",
                            fontSize: 12,
                            letterSpacing: 2,
                            cursor: "pointer",
                            fontWeight: selected ? "bold" : "normal",
                        }}
                    >
                        {selected ? "▶ " : "  "}{e.label}
                    </button>
                )
            })}
            <div
                style={{
                    position: "absolute",
                    bottom: 12,
                    left: 8,
                    fontSize: 8,
                    letterSpacing: 2,
                    opacity: 0.5,
                }}
            >
                ↑↓ pour choisir · A pour valider · ESC pour quitter
            </div>
        </div>
    )
}
