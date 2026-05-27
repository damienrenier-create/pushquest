"use client"

// src/app/gamebook/StartMenu.tsx
//
// v3.8 — Menu Pokémon-like ouvert via le bouton START.
// Entries actuelles : SAC, RETOUR. Extensible (futur : STATUS, SAUVEGARDE...).
//
// Navigation : flèches haut/bas + A pour valider, ou clic direct.

import { useEffect, useState } from "react"

export type StartMenuEntry = "bag" | "travel" | "daemon" | "close"

interface Props {
    onSelect: (entry: StartMenuEntry) => void
    onClose: () => void
    /** v4.0 Phase 1.D.bis Option B — true si au moins un Daemon a reçu le sérum.
     *  Conditionne le label "👾 DAEMON" (après sérum) vs "🐾 ANIMAUX" (avant). */
    hasUnlockedDaemon?: boolean
    /** v4.0 — true si au moins un Daemon a recovered=true (adoption complète chez V3T).
     *  Cache l'entrée DAEMON/ANIMAUX du menu START tant qu'aucun Daemon n'est officiellement reçu. */
    hasRecoveredDaemon?: boolean
}

// v3.33 — VOYAGE désactivé (fast travel mis en pause).
// v4.0 Phase 1.D — DAEMON ajouté (équipe Daemon up to 6 slots).
// v4.0 Phase 1.D.bis Option B — label dynamique selon sérum reçu.
// v4.0 — Entrée DAEMON cachée tant que recovered=false (avant remise officielle par V3T).
export default function StartMenu({ onSelect, onClose, hasUnlockedDaemon = false, hasRecoveredDaemon = false }: Props) {
    const ENTRIES: Array<{ key: StartMenuEntry; label: string }> = [
        { key: "bag", label: "🎒 SAC" },
        // L'entrée DAEMON/ANIMAUX n'apparaît qu'après avoir officiellement reçu son animal.
        ...(hasRecoveredDaemon ? [{ key: "daemon" as const, label: hasUnlockedDaemon ? "👾 DAEMON" : "🐾 ANIMAUX" }] : []),
        { key: "close", label: "↩ RETOUR" },
    ]
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
