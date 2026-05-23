"use client"

// src/app/gamebook/FastTravelModal.tsx
//
// v3.22 — Modal de fast travel.
// Liste les villes visitées et permet de s'y téléporter gratuitement.

import { useState } from "react"
import { TOWN_SPAWN_POINTS, TRAVEL_TOWN_IDS, type TravelTownId } from "@/lib/gamebook/maps"

interface Props {
    visitedTowns: string[]
    currentMapId: string
    onTravel: (townId: TravelTownId) => Promise<void>
    onClose: () => void
}

export default function FastTravelModal({ visitedTowns, currentMapId, onTravel, onClose }: Props) {
    const [busy, setBusy] = useState(false)

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                zIndex: 9000,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a",
                    border: "3px solid #c0a050",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 300,
                    maxWidth: 380,
                    width: "100%",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold" }}>🗺️ VOYAGE RAPIDE</div>
                    <button onClick={onClose} style={btnOutline}>FERMER</button>
                </div>

                <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 14, lineHeight: 1.5, fontStyle: "italic" }}>
                    Voyage gratuit vers une ville que tu as déjà visitée à pied.
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {TRAVEL_TOWN_IDS.map((townId) => {
                        const spawn = TOWN_SPAWN_POINTS[townId]
                        const unlocked = visitedTowns.includes(townId)
                        const isHere = currentMapId === spawn.mapId
                        const disabled = !unlocked || isHere || busy
                        return (
                            <button
                                key={townId}
                                onClick={async () => {
                                    if (disabled) return
                                    setBusy(true)
                                    try {
                                        await onTravel(townId)
                                    } finally {
                                        setBusy(false)
                                    }
                                }}
                                disabled={disabled}
                                style={{
                                    background: !unlocked ? "#222" : isHere ? "#205838" : busy ? "#444" : "#4060a0",
                                    color: !unlocked ? "#666" : "#fff",
                                    border: "1px solid #fff",
                                    padding: "10px 12px",
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    letterSpacing: 2,
                                    cursor: disabled ? "not-allowed" : "pointer",
                                    textAlign: "left",
                                    opacity: !unlocked ? 0.5 : 1,
                                }}
                            >
                                {unlocked ? (isHere ? "📍 " : "🗺️ ") : "🔒 "}
                                {spawn.name.toUpperCase()}
                                {isHere && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 6 }}>(ici)</span>}
                                {!unlocked && <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 6 }}>(non visitée)</span>}
                            </button>
                        )
                    })}
                </div>

                <button onClick={onClose} style={{ ...btnLarge, marginTop: 14 }}>QUITTER</button>
            </div>
        </div>
    )
}

const btnOutline: React.CSSProperties = {
    background: "transparent",
    border: "1px solid #fff",
    color: "#fff",
    padding: "2px 8px",
    fontSize: 10,
    cursor: "pointer",
    letterSpacing: 2,
    fontFamily: "monospace",
}

const btnLarge: React.CSSProperties = {
    width: "100%",
    background: "#444",
    color: "#fff",
    border: "2px solid #fff",
    padding: "10px 12px",
    fontFamily: "'Courier New', monospace",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 3,
    cursor: "pointer",
}
