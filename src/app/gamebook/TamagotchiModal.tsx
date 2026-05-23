"use client"

// src/app/gamebook/TamagotchiModal.tsx
//
// v3.14 — Modal du vétérinaire V3T. Affiche soit le formulaire d'adoption,
// soit l'état actuel du tamagotchi avec un bouton pour le nourrir.

import { useState } from "react"
import {
    type Tamagotchi,
    TAMAGOTCHI_ADOPT_COST,
    TAMAGOTCHI_FEED_COST,
    TAMAGOTCHI_HAPPINESS_MAX,
    isValidTamagotchiName,
} from "@/lib/gamebook/tamagotchi"

interface Props {
    tamagotchi: Tamagotchi | null
    availableEnergy: number
    onAdopt: (name: string) => Promise<void>
    onFeed: () => Promise<void>
    onClose: () => void
}

const STAGE_EMOJI: Record<Tamagotchi["stage"], string> = {
    egg: "🥚",
    baby: "🐣",
    adult: "🐤",
}

const STAGE_LABEL: Record<Tamagotchi["stage"], string> = {
    egg: "ŒUF",
    baby: "BÉBÉ",
    adult: "ADULTE",
}

export default function TamagotchiModal({ tamagotchi, availableEnergy, onAdopt, onFeed, onClose }: Props) {
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const doAdopt = async () => {
        const trimmed = name.trim()
        if (!isValidTamagotchiName(trimmed)) {
            setError("Nom invalide (1 à 16 caractères, lettres et chiffres uniquement).")
            return
        }
        if (busy) return
        setBusy(true)
        setError(null)
        try {
            await onAdopt(trimmed)
        } finally {
            setBusy(false)
        }
    }

    const doFeed = async () => {
        if (busy) return
        setBusy(true)
        setError(null)
        try {
            await onFeed()
        } finally {
            setBusy(false)
        }
    }

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
                    border: "3px solid #48a868",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    maxWidth: 360,
                    width: "100%",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 3, fontWeight: "bold" }}>🩺 VÉTÉRINAIRE V3T</div>
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

                {tamagotchi === null ? (
                    <AdoptForm
                        name={name}
                        setName={setName}
                        availableEnergy={availableEnergy}
                        busy={busy}
                        error={error}
                        onAdopt={doAdopt}
                    />
                ) : (
                    <TamagotchiView
                        tamagotchi={tamagotchi}
                        availableEnergy={availableEnergy}
                        busy={busy}
                        error={error}
                        onFeed={doFeed}
                    />
                )}
            </div>
        </div>
    )
}

function AdoptForm({
    name, setName, availableEnergy, busy, error, onAdopt,
}: {
    name: string
    setName: (s: string) => void
    availableEnergy: number
    busy: boolean
    error: string | null
    onAdopt: () => Promise<void>
}) {
    const canAdopt = availableEnergy >= TAMAGOTCHI_ADOPT_COST && isValidTamagotchiName(name.trim())
    return (
        <div>
            <div style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 12, opacity: 0.85 }}>
                V3T te tend un œuf chaud. "Si tu veux l'adopter, il te faudra {TAMAGOTCHI_ADOPT_COST} reps et un petit nom."
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 9, letterSpacing: 2, opacity: 0.7 }}>NOM (max 16)</label>
                <input
                    type="text"
                    value={name}
                    maxLength={16}
                    onChange={(e) => setName(e.target.value)}
                    disabled={busy}
                    placeholder="Pat'oeuf"
                    style={{
                        background: "#111",
                        color: "#fff",
                        border: "1px solid #555",
                        padding: "6px 8px",
                        fontFamily: "monospace",
                        fontSize: 12,
                        letterSpacing: 1,
                    }}
                />
                <div style={{ fontSize: 9, opacity: 0.6 }}>
                    Coût : {TAMAGOTCHI_ADOPT_COST} reps. Tu en as {availableEnergy}.
                </div>
                {error && (
                    <div style={{ fontSize: 10, color: "#f08080", marginTop: 4 }}>{error}</div>
                )}
                <button
                    onClick={onAdopt}
                    disabled={busy || !canAdopt}
                    style={{
                        background: canAdopt && !busy ? "#48a868" : "#333",
                        color: "#fff",
                        border: "1px solid #fff",
                        padding: "8px 12px",
                        fontFamily: "'Courier New', monospace",
                        fontSize: 11,
                        fontWeight: "bold",
                        letterSpacing: 2,
                        cursor: canAdopt && !busy ? "pointer" : "not-allowed",
                        marginTop: 4,
                    }}
                >
                    ADOPTER
                </button>
            </div>
        </div>
    )
}

function TamagotchiView({
    tamagotchi, availableEnergy, busy, error, onFeed,
}: {
    tamagotchi: Tamagotchi
    availableEnergy: number
    busy: boolean
    error: string | null
    onFeed: () => Promise<void>
}) {
    const happinessPct = (tamagotchi.happiness / TAMAGOTCHI_HAPPINESS_MAX) * 100
    const happinessColor =
        happinessPct > 60 ? "#48a830"
            : happinessPct > 25 ? "#f0a050"
                : "#c83838"
    const canFeed = availableEnergy >= TAMAGOTCHI_FEED_COST
    return (
        <div>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 48, lineHeight: 1 }}>{STAGE_EMOJI[tamagotchi.stage]}</div>
                <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginTop: 6 }}>
                    {tamagotchi.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, opacity: 0.6, letterSpacing: 2 }}>
                    STADE : {STAGE_LABEL[tamagotchi.stage]} ({tamagotchi.feedCount} repas)
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>BONHEUR</span>
                    <span>{tamagotchi.happiness}/{TAMAGOTCHI_HAPPINESS_MAX}</span>
                </div>
                <div style={{ background: "#111", height: 10, borderRadius: 4, overflow: "hidden", border: "1px solid #444" }}>
                    <div
                        style={{
                            width: `${happinessPct}%`,
                            height: "100%",
                            background: happinessColor,
                            transition: "width 0.3s",
                        }}
                    />
                </div>
            </div>

            <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 10, lineHeight: 1.5 }}>
                {tamagotchi.happiness < 20 && "Il a l'air triste. Une bouchée lui ferait du bien."}
                {tamagotchi.happiness >= 20 && tamagotchi.happiness < 70 && "Il pourrait être plus heureux."}
                {tamagotchi.happiness >= 70 && "Il a l'air en forme !"}
            </div>

            {error && (
                <div style={{ fontSize: 10, color: "#f08080", marginBottom: 6 }}>{error}</div>
            )}

            <button
                onClick={onFeed}
                disabled={busy || !canFeed}
                style={{
                    background: canFeed && !busy ? "#d06030" : "#333",
                    color: "#fff",
                    border: "1px solid #fff",
                    padding: "8px 12px",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 11,
                    fontWeight: "bold",
                    letterSpacing: 2,
                    cursor: canFeed && !busy ? "pointer" : "not-allowed",
                    width: "100%",
                }}
            >
                NOURRIR ({TAMAGOTCHI_FEED_COST} reps)
            </button>
            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, textAlign: "center" }}>
                Énergie disponible : {availableEnergy}
            </div>
        </div>
    )
}
