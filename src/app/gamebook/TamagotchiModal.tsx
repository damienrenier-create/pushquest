"use client"

// src/app/gamebook/TamagotchiModal.tsx
//
// v3.23i — Refonte du modal V3T pour interaction directe avec l'animal.
// L'animal devient cliquable → ouvre un tray d'actions contextuelles :
//   - "Il a soif..."     [DONNER À BOIRE 💧]  si gourde avec stored > 0
//   - "Il a faim..."     [PARTAGER LES PÂTES 🍝]  si corned_pates en inventaire
//   - "Il s'ennuie..."   [LE CARESSER (gratuit, 0 reps mais lien)]
//   - "Il a la dalle"    [NOURRIR (20 reps, +30 happiness)]
//
// Après chaque action, V3T fait un commentaire encourageant (bulle de dialogue).
// Quand une étape est validée (drink, pates), un petit ✓ s'affiche.

import { useState } from "react"
import {
    type TamagotchiView,
    TAMAGOTCHI_FEED_COST,
    TAMAGOTCHI_HAPPINESS_MAX,
    isValidTamagotchiName,
} from "@/lib/gamebook/tamagotchi"
import { getLevelDetails } from "@/lib/xp"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

interface Props {
    tamagotchi: TamagotchiView | null
    availableEnergy: number
    inventory: InventoryEntry[]
    onAdopt: (name: string) => Promise<void>
    onFeed: () => Promise<void>
    onDrink?: () => Promise<{ ok: boolean; v3tComment?: string; reason?: string }>
    onFeedPates?: () => Promise<{ ok: boolean; v3tComment?: string; reason?: string }>
    onCheckDefis?: () => Promise<void>
    onLiberer?: () => Promise<void>
    onClose: () => void
}

export default function TamagotchiModal({
    tamagotchi, availableEnergy, inventory,
    onAdopt, onFeed, onDrink, onFeedPates, onCheckDefis, onLiberer, onClose,
}: Props) {
    const [name, setName] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [v3tBubble, setV3tBubble] = useState<string | null>(null)

    const showBubble = (text: string) => {
        setV3tBubble(text)
        setTimeout(() => setV3tBubble(null), 6000)
    }

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

    return (
        <div
            style={{
                position: "fixed", inset: 0,
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
                    maxWidth: 380,
                    width: "100%",
                    maxHeight: "90vh",
                    overflowY: "auto",
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
                        busy={busy}
                        error={error}
                        onAdopt={doAdopt}
                    />
                ) : (
                    <TamagotchiCard
                        tamagotchi={tamagotchi}
                        availableEnergy={availableEnergy}
                        inventory={inventory}
                        busy={busy}
                        error={error}
                        v3tBubble={v3tBubble}
                        onFeed={async () => {
                            if (busy) return
                            setBusy(true)
                            setError(null)
                            try { await onFeed(); showBubble("V3T : « Il mange avec appétit. Bien. »") } finally { setBusy(false) }
                        }}
                        onDrink={async () => {
                            if (!onDrink || busy) return
                            setBusy(true)
                            setError(null)
                            try {
                                const res = await onDrink()
                                if (res.ok) showBubble(res.v3tComment ?? "V3T : « Belle attention. »")
                                else setError(res.reason ?? "Impossible.")
                            } finally { setBusy(false) }
                        }}
                        onFeedPates={async () => {
                            if (!onFeedPates || busy) return
                            setBusy(true)
                            setError(null)
                            try {
                                const res = await onFeedPates()
                                if (res.ok) showBubble(res.v3tComment ?? "V3T : « Tu lui as donné le meilleur. »")
                                else setError(res.reason ?? "Impossible.")
                            } finally { setBusy(false) }
                        }}
                        onCheckDefis={onCheckDefis ? async () => {
                            if (busy) return
                            setBusy(true)
                            setError(null)
                            try { await onCheckDefis(); showBubble("V3T inspecte ton journal. « Voyons où tu en es... »") } finally { setBusy(false) }
                        } : undefined}
                        onLiberer={onLiberer ? async () => {
                            if (busy) return
                            setBusy(true)
                            setError(null)
                            try { await onLiberer() } finally { setBusy(false) }
                        } : undefined}
                    />
                )}
            </div>
        </div>
    )
}

function AdoptForm({
    name, setName, busy, error, onAdopt,
}: {
    name: string
    setName: (s: string) => void
    busy: boolean
    error: string | null
    onAdopt: () => Promise<void>
}) {
    const canAdopt = isValidTamagotchiName(name.trim())
    return (
        <div>
            <div style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 12, opacity: 0.9, fontStyle: "italic" }}>
                V3T se penche vers une des cages. &quot;Un compagnon t&apos;a remarqué. Il a senti ton odeur, ton souffle. Il n&apos;attend que toi.&quot;
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 12, opacity: 0.85 }}>
                &quot;Pas de prix. Pas de contrat. Donne-lui juste un nom — c&apos;est le début de la confiance.&quot;
            </div>
            <div style={{ fontSize: 10, lineHeight: 1.5, marginBottom: 12, opacity: 0.7 }}>
                &quot;Tu reviendras le voir, tu le nourriras, tu accompliras quelques épreuves... et un jour il décidera de te suivre. Va voir la bibliothécaire BIBLIO pour la liste précise des défis.&quot;
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 9, letterSpacing: 2, opacity: 0.7 }}>SON NOM (max 16)</label>
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
                    ADOPTER (gratuit)
                </button>
            </div>
        </div>
    )
}

function TamagotchiCard({
    tamagotchi, availableEnergy, inventory, busy, error, v3tBubble,
    onFeed, onDrink, onFeedPates, onCheckDefis, onLiberer,
}: {
    tamagotchi: TamagotchiView
    availableEnergy: number
    inventory: InventoryEntry[]
    busy: boolean
    error: string | null
    v3tBubble: string | null
    onFeed: () => Promise<void>
    onDrink: () => Promise<void>
    onFeedPates: () => Promise<void>
    onCheckDefis?: () => Promise<void>
    onLiberer?: () => Promise<void>
}) {
    const details = getLevelDetails(tamagotchi.displayLevel)
    const happinessPct = (tamagotchi.displayHappiness / TAMAGOTCHI_HAPPINESS_MAX) * 100
    const happinessColor =
        happinessPct > 60 ? "#48a830"
            : happinessPct > 25 ? "#f0a050"
                : "#c83838"
    const canFeed = availableEnergy >= TAMAGOTCHI_FEED_COST

    // Conditions pour boire/manger les pâtes
    const flask = inventory.find((e) => e.itemKey === "flask" || e.itemKey === "grande_gourde")
    const flaskStored = flask?.data && typeof (flask.data as { stored?: number }).stored === "number"
        ? (flask.data as { stored: number }).stored
        : 0
    const canDrink = flaskStored >= 10
    const cornedPates = inventory.find((e) => e.itemKey === "corned_pates" && e.quantity > 0)
    const canFeedPates = !!cornedPates

    // État des défis (pour afficher ✓ et raisons)
    const drinkDone = tamagotchi.defiProgress?.["1"] === true
    const patesDone = tamagotchi.defiProgress?.["2"] === true
    const dayHalvesDone = tamagotchi.defiProgress?.["3"] === true
    const plankDone = tamagotchi.defiProgress?.["4"] === true
    const pushupDone = tamagotchi.defiProgress?.["5"] === true
    const squatDone = tamagotchi.defiProgress?.["6"] === true

    const [showActions, setShowActions] = useState(false)

    return (
        <div>
            {/* Animal cliquable */}
            <div style={{ textAlign: "center", marginBottom: 10 }}>
                <button
                    onClick={() => setShowActions((s) => !s)}
                    disabled={busy}
                    style={{
                        background: "transparent",
                        border: "none",
                        cursor: busy ? "wait" : "pointer",
                        padding: 0,
                    }}
                >
                    <div style={{
                        fontSize: 56,
                        lineHeight: 1,
                        filter: tamagotchi.isFrozen ? "grayscale(0.8) brightness(0.7)" : "none",
                        animation: showActions ? "none" : "bobUp 1.5s infinite ease-in-out",
                        transition: "transform 0.2s",
                        transform: showActions ? "scale(1.1)" : "scale(1)",
                    }}>
                        {details.emoji}
                    </div>
                </button>
                <div style={{ fontSize: 14, fontWeight: "bold", letterSpacing: 2, marginTop: 6 }}>
                    {tamagotchi.name.toUpperCase()}
                </div>
                <div style={{ fontSize: 9, opacity: 0.7, letterSpacing: 1, marginTop: 2 }}>
                    {details.name} — Lv. {tamagotchi.displayLevel}
                </div>
                <div style={{ fontSize: 8, opacity: 0.55, letterSpacing: 1, marginTop: 2 }}>
                    {details.belt}
                </div>
                <div style={{ fontSize: 9, opacity: 0.6, marginTop: 4, fontStyle: "italic" }}>
                    {showActions ? "👆 Choisis une action" : "👆 Touche-le pour interagir"}
                </div>
            </div>

            {/* Happiness bar */}
            <div style={{ marginBottom: 10 }}>
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

            {/* Bulle de dialogue V3T (temporaire post-action) */}
            {v3tBubble && (
                <div style={{
                    background: "#0a3010",
                    border: "1px solid #48a868",
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 10,
                    fontSize: 10,
                    lineHeight: 1.5,
                    fontStyle: "italic",
                    animation: "fadeIn 0.3s ease",
                }}>
                    💬 {v3tBubble}
                </div>
            )}

            {/* Narrative V3T par défaut */}
            {!v3tBubble && (
                <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 10, lineHeight: 1.5, fontStyle: "italic" }}>
                    V3T te regarde calmement. &quot;{tamagotchi.v3tNarrative}&quot;
                </div>
            )}

            {/* Tray d'actions (montré au clic sur l'animal) */}
            {showActions && !tamagotchi.recovered && (
                <div style={{
                    background: "#0f0f0f",
                    border: "1px solid #444",
                    borderRadius: 4,
                    padding: 8,
                    marginBottom: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                }}>
                    {/* DONNER À BOIRE */}
                    <ActionRow
                        emoji="💧"
                        title={drinkDone ? "✓ Tu lui as déjà donné à boire" : "Il a l'air d'avoir soif..."}
                        cta={canDrink ? "DONNER À BOIRE" : "Ta gourde est vide"}
                        hint={!canDrink ? `Va remplir ta gourde à un point d'eau (stockée : ${flaskStored})` : "Gorgée de ta gourde (-10 stockés)"}
                        disabled={!canDrink || drinkDone || busy}
                        done={drinkDone}
                        onClick={onDrink}
                    />
                    {/* PARTAGER LES PÂTES */}
                    <ActionRow
                        emoji="🍝"
                        title={patesDone ? "✓ Tu as déjà partagé tes pâtes" : "Il a l'air d'avoir faim..."}
                        cta={canFeedPates ? "PARTAGER LES PÂTES" : "Pas de Corned Pâtes"}
                        hint={!canFeedPates ? "Va voir TRENETTE à Macaron'île" : "Consomme 1 Corned Pâtes"}
                        disabled={!canFeedPates || patesDone || busy}
                        done={patesDone}
                        onClick={onFeedPates}
                    />
                    {/* NOURRIR GÉNÉRIQUE */}
                    <ActionRow
                        emoji="🥩"
                        title="Il a la dalle..."
                        cta={canFeed ? `NOURRIR (${TAMAGOTCHI_FEED_COST} reps)` : `Pas assez d'énergie (${TAMAGOTCHI_FEED_COST} reps)`}
                        hint="+30 happiness (action illimitée)"
                        disabled={!canFeed || busy}
                        done={false}
                        onClick={onFeed}
                    />
                </div>
            )}

            {/* v4.0 — Progression défis : ne PAS spoiler le détail ici.
                Le joueur peut consulter les conditions d'adoption à la bibliothèque
                (rayon "Animaux & Défis" chez BIBLIO à Macaron'île).
                On garde juste le compteur global pour qu'il sache où il en est. */}
            {!tamagotchi.recovered && (
                <div style={{ marginBottom: 12, fontSize: 10, opacity: 0.85, lineHeight: 1.6, textAlign: "center" }}>
                    <div style={{ fontWeight: "bold" }}>
                        Défis : {tamagotchi.defisDone}/{tamagotchi.defisTotal}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.65, marginTop: 2, fontStyle: "italic" }}>
                        Consulte la bibliothèque pour découvrir les épreuves d'adoption.
                    </div>
                </div>
            )}

            {error && (
                <div style={{ fontSize: 10, color: "#f08080", marginBottom: 6 }}>{error}</div>
            )}

            {/* Boutons de contrôle */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {!tamagotchi.recovered && onCheckDefis && (
                    <button
                        onClick={onCheckDefis}
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
                {tamagotchi.eligibleToRecover && onLiberer && (
                    <button
                        onClick={onLiberer}
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

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-2px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}

function ActionRow({
    emoji, title, cta, hint, disabled, done, onClick,
}: {
    emoji: string
    title: string
    cta: string
    hint: string
    disabled: boolean
    done: boolean
    onClick: () => Promise<void>
}) {
    return (
        <div style={{
            background: done ? "#0a2010" : "#1a1a1a",
            border: `1px solid ${done ? "#48a868" : "#444"}`,
            borderRadius: 3,
            padding: 6,
        }}>
            <div style={{ fontSize: 10, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{emoji} {title}</span>
            </div>
            <button
                onClick={onClick}
                disabled={disabled}
                style={{
                    background: disabled ? "#333" : "#48a868",
                    color: "#fff",
                    border: "1px solid #fff",
                    padding: "5px 8px",
                    fontFamily: "'Courier New', monospace",
                    fontSize: 9,
                    fontWeight: "bold",
                    letterSpacing: 1,
                    cursor: disabled ? "not-allowed" : "pointer",
                    width: "100%",
                    opacity: done ? 0.6 : 1,
                }}
            >
                {cta}
            </button>
            <div style={{ fontSize: 8, opacity: 0.55, marginTop: 3, fontStyle: "italic" }}>
                {hint}
            </div>
        </div>
    )
}

function DefiLine({ done, text }: { done: boolean; text: string }) {
    return (
        <div style={{ opacity: done ? 1 : 0.5, color: done ? "#48a868" : "#fff" }}>
            {done ? "✓" : "•"} {text}
        </div>
    )
}
