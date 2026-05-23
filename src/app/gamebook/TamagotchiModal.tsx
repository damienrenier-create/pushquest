"use client"

// src/app/gamebook/TamagotchiModal.tsx
//
// v3.14 — Modal du vétérinaire V3T : adoption + suivi du tamagotchi.
// v3.15 — L'animal n'est plus egg/baby/adult mais l'animal du bestiaire correspondant
// au level XP réel du joueur (cf. lib/xp.ts XP_ANIMALS / getLevelDetails).
// Quand le tamagotchi est "frozen" (happiness=0), il garde son ancien level malgré la
// progression XP du joueur dans l'app — il faut le nourrir pour qu'il évolue à nouveau.

import { useState } from "react"
import {
    type TamagotchiView,
    TAMAGOTCHI_ADOPT_COST,
    TAMAGOTCHI_FEED_COST,
    TAMAGOTCHI_HAPPINESS_MAX,
    CANONICAL_DEFIS,
    isValidTamagotchiName,
} from "@/lib/gamebook/tamagotchi"
import { getLevelDetails } from "@/lib/xp"

interface Props {
    tamagotchi: TamagotchiView | null
    availableEnergy: number
    onAdopt: (name: string) => Promise<void>
    onFeed: () => Promise<void>
    /** v3.19 — Vérifier les 7 défis chez V3T (renvoie liste des défis nouvellement complétés) */
    onCheckDefis?: () => Promise<void>
    /** v3.19 — Libérer l'animal (les 7 défis doivent être validés) */
    onLiberer?: () => Promise<void>
    onClose: () => void
}

export default function TamagotchiModal({ tamagotchi, availableEnergy, onAdopt, onFeed, onCheckDefis, onLiberer, onClose }: Props) {
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const doAdopt = async () => {
        const trimmed = name.trim()
        if (!isValidTamagotchiName(trimmed)) {
            setError("Nom invalide (1 à 16 caractères, lettres/chiffres uniquement).")
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
                    <TamagotchiCard
                        tamagotchi={tamagotchi}
                        availableEnergy={availableEnergy}
                        busy={busy}
                        error={error}
                        onFeed={doFeed}
                        onCheckDefis={onCheckDefis}
                        onLiberer={onLiberer}
                        setBusy={setBusy}
                        setError={setError}
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
                V3T te tend un compagnon adapté à ton niveau actuel. "Donne-lui un nom et nourris-le pour qu'il évolue avec toi."
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
                    Coût d'adoption : {TAMAGOTCHI_ADOPT_COST} reps. Tu en as {availableEnergy}.
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

function TamagotchiCard({
    tamagotchi, availableEnergy, busy, error, onFeed, onCheckDefis, onLiberer, setBusy, setError,
}: {
    tamagotchi: TamagotchiView
    availableEnergy: number
    busy: boolean
    error: string | null
    onFeed: () => Promise<void>
    onCheckDefis?: () => Promise<void>
    onLiberer?: () => Promise<void>
    setBusy: (b: boolean) => void
    setError: (e: string | null) => void
}) {
    const details = getLevelDetails(tamagotchi.displayLevel)
    const happinessPct = (tamagotchi.displayHappiness / TAMAGOTCHI_HAPPINESS_MAX) * 100
    const happinessColor =
        happinessPct > 60 ? "#48a830"
            : happinessPct > 25 ? "#f0a050"
                : "#c83838"
    const canFeed = availableEnergy >= TAMAGOTCHI_FEED_COST
    return (
        <div>
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 48, lineHeight: 1, filter: tamagotchi.isFrozen ? "grayscale(0.8) brightness(0.7)" : "none" }}>
                    {details.emoji}
                </div>
                <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginTop: 6 }}>
                    {tamagotchi.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: 1, marginTop: 2 }}>
                    {details.name} — Lv. {tamagotchi.displayLevel}
                </div>
                <div style={{ fontSize: 8, opacity: 0.55, letterSpacing: 1, marginTop: 2 }}>
                    {details.belt}
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 4, display: "flex", justifyContent: "space-between" }}>
                    <span>BONHEUR</span>
                    <span>{tamagotchi.displayHappiness}/{TAMAGOTCHI_HAPPINESS_MAX}</span>
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

            <div style={{ fontSize: 10, opacity: 0.85, marginBottom: 10, lineHeight: 1.5, fontStyle: "italic" }}>
                V3T te regarde. "{tamagotchi.v3tNarrative}"
            </div>

            {/* v3.19 — Liste des 7 défis dans l'ordre spécifique à cet animal */}
            {!tamagotchi.recovered && (
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: 2, marginBottom: 4 }}>
                        DÉFIS D'ADOPTION ({tamagotchi.defisDone}/{tamagotchi.defisTotal})
                    </div>
                    <ol style={{ fontSize: 9, lineHeight: 1.5, paddingLeft: 20, marginBottom: 6 }}>
                        {tamagotchi.defiOrder.map((defiIdx) => {
                            const defi = CANONICAL_DEFIS[defiIdx]
                            const done = tamagotchi.defiProgress?.[String(defiIdx)] === true
                            return (
                                <li key={defiIdx} style={{ opacity: done ? 0.5 : 1, textDecoration: done ? "line-through" : "none" }}>
                                    {done ? "✅ " : "⬜ "}{defi.title}
                                </li>
                            )
                        })}
                    </ol>
                </div>
            )}

            {error && (
                <div style={{ fontSize: 10, color: "#f08080", marginBottom: 6 }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                {/* v3.19 — Vérifier les défis chez V3T */}
                {!tamagotchi.recovered && onCheckDefis && (
                    <button
                        onClick={async () => {
                            if (busy) return
                            setBusy(true)
                            setError(null)
                            try { await onCheckDefis() } finally { setBusy(false) }
                        }}
                        disabled={busy}
                        style={{
                            background: busy ? "#333" : "#4080d8",
                            color: "#fff",
                            border: "1px solid #fff",
                            padding: "7px 12px",
                            fontFamily: "'Courier New', monospace",
                            fontSize: 10,
                            letterSpacing: 1,
                            cursor: busy ? "not-allowed" : "pointer",
                            width: "100%",
                        }}
                    >
                        VÉRIFIER MES PROGRÈS
                    </button>
                )}
                {/* v3.19 — Libérer (visible une fois 7/7) */}
                {tamagotchi.eligibleToRecover && onLiberer && (
                    <button
                        onClick={async () => {
                            if (busy) return
                            setBusy(true)
                            setError(null)
                            try { await onLiberer() } finally { setBusy(false) }
                        }}
                        disabled={busy}
                        style={{
                            background: busy ? "#333" : "#48a868",
                            color: "#fff",
                            border: "2px solid #fff",
                            padding: "10px 12px",
                            fontFamily: "'Courier New', monospace",
                            fontSize: 12,
                            fontWeight: "bold",
                            letterSpacing: 2,
                            cursor: busy ? "not-allowed" : "pointer",
                            width: "100%",
                        }}
                    >
                        ✨ LIBÉRER MON ANIMAL ✨
                    </button>
                )}
            </div>

            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 6, textAlign: "center" }}>
                Énergie disponible : {availableEnergy}
            </div>
        </div>
    )
}
