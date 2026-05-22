"use client"

// src/app/gamebook/PlayerMapModal.tsx
//
// v3.8.3 — Modal "Carte des Joueurs" ouvert depuis l'inventaire.
// Affiche la liste annuaire de tous les autres joueurs avec leur dernière position.
// Source : GET /api/gamebook/players (route existante, retourne tous les users non-system).

import { useEffect, useState } from "react"
import type { PlayerSnapshot } from "@/lib/gamebook/mapEngine"

// Mapping mapId → label user-friendly affiché dans la liste
const MAP_LABELS: Record<string, string> = {
    bourgpates: "Bourg-Boulette",
    route1: "Route 1 — Pont Pépite",
    pepiteville: "Pépiteville",
    hautespates: "Hautes-Pâtes",
    gym: "Gym (Bourg-Boulette)",
    casino: "Casino (Bourg-Boulette)",
    cave: "Grotte du Monstre",
    gym_pepite: "Gym (Pépiteville)",
    casino_pepite: "Casino (Pépiteville)",
    shop_interior: "Boutique de Pépiteville",
    tower_floor_1: "Tour — rez-de-chaussée",
    tower_floor_2: "Tour — étage 2",
    tower_floor_3: "Tour — étage 3",
    tower_floor_4: "Tour — étage 4",
    tower_floor_5: "Tour — sommet",
}

function labelForMap(mapId: string): string {
    return MAP_LABELS[mapId] ?? mapId
}

interface Props {
    onClose: () => void
}

export default function PlayerMapModal({ onClose }: Props) {
    const [players, setPlayers] = useState<PlayerSnapshot[] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        ; (async () => {
            try {
                const res = await fetch("/api/gamebook/players", { cache: "no-store" })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                if (cancelled) return
                setPlayers(Array.isArray(json.players) ? json.players : [])
            } catch (e) {
                if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue")
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

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
                    border: "3px solid #fff",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    maxWidth: 380,
                    width: "100%",
                    maxHeight: "80vh",
                    overflowY: "auto",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 4, fontWeight: "bold" }}>🗺️ CARTE DES JOUEURS</div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "1px solid #fff",
                            color: "#fff",
                            fontFamily: "monospace",
                            padding: "2px 8px",
                            fontSize: 10,
                            cursor: "pointer",
                            letterSpacing: 2,
                        }}
                    >
                        FERMER
                    </button>
                </div>

                {error && (
                    <div style={{ fontSize: 11, color: "#f88", padding: 12, textAlign: "center" }}>
                        Erreur : {error}
                    </div>
                )}

                {!error && players === null && (
                    <div style={{ fontSize: 11, opacity: 0.6, padding: 20, textAlign: "center" }}>
                        Chargement...
                    </div>
                )}

                {!error && players && players.length === 0 && (
                    <div style={{ fontSize: 11, opacity: 0.6, padding: 12, textAlign: "center" }}>
                        Personne d'autre n'est passé sur la carte récemment.
                    </div>
                )}

                {!error && players && players.length > 0 && (
                    <div>
                        {players
                            .slice()
                            .sort((a, b) => (a.todayRank ?? 999) - (b.todayRank ?? 999))
                            .map((p) => (
                                <div
                                    key={p.id}
                                    style={{
                                        background: "#222",
                                        border: "1px solid #555",
                                        padding: 10,
                                        marginBottom: 6,
                                        borderRadius: 4,
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        <span style={{ fontSize: 18 }}>{p.emoji}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 1 }}>
                                                {p.nickname.toUpperCase()}
                                                {typeof p.todayRank === "number" && (
                                                    <span style={{ marginLeft: 6, fontSize: 9, color: "#ffe3a8" }}>
                                                        #{p.todayRank} du jour
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 1 }}>
                                                {p.animal} · niv. {p.level}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.5, marginTop: 4 }}>
                                        📍 <strong>{labelForMap(p.mapId)}</strong>
                                        <span style={{ opacity: 0.6 }}> ({p.posX},{p.posY})</span>
                                    </div>
                                    <div style={{ fontSize: 9, opacity: 0.55, marginTop: 2 }}>
                                        {p.lastSeenAgo}
                                        {typeof p.todayReps === "number" && p.todayReps > 0 && (
                                            <span> · {p.todayReps} reps aujourd'hui</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}

                <div style={{ fontSize: 9, opacity: 0.4, marginTop: 8, textAlign: "center", letterSpacing: 1 }}>
                    Données mises à jour à chaque déplacement des joueurs.
                </div>
            </div>
        </div>
    )
}
