"use client"

// src/app/gamebook/ShopModal.tsx
//
// v3.8 — Modal d'achat ouvert quand on parle à NUTRIPATES avec le sac.
// Liste les items achetables, leur prix, leur disponibilité.
// v3.8.9 — Header dynamique NUTRIPATES + remerciement à l'achat + tracker des achats.

import { useEffect, useMemo, useState } from "react"
import { ITEMS } from "@/lib/gamebook/items"
import { hasIntactItem, type InventoryEntry } from "@/lib/gamebook/inventory"
import { formatTimeAgo } from "@/lib/gamebook/mapEngine"

interface LastPurchase {
    userId: string
    nickname: string
    itemKey: string
    itemName: string
    at: string
}

interface Props {
    inventory: InventoryEntry[]
    availableEnergy: number
    nickname: string
    /** v3.10 — ratio de difficulté pour ajuster l'affichage des prix (onboarding paye moins) */
    difficultyRatio: number
    onBuy: (itemKey: string) => Promise<void>
    /** v3.8.9 — notifie le parent à la fermeture du modal, en indiquant si un achat a été fait. */
    onClose: (purchaseMade: boolean) => void
}

// Phrases d'accueil de NUTRIPATES (4 variantes selon l'état des news)
function greetingFor(lastPurchase: LastPurchase | null, currentNickname: string): string {
    if (!lastPurchase) {
        return "NUTRIPATES essuie son comptoir, l'air abattu. \"Personne ne vient plus acheter quoi que ce soit. La crise, sans doute. Ou alors c'est moi.\""
    }
    const ago = formatTimeAgo(lastPurchase.at)
    if (lastPurchase.nickname === currentNickname) {
        return `NUTRIPATES te reconnaît. "Ah, c'est encore toi. Ton dernier achat (${lastPurchase.itemName.toLowerCase()}, ${ago}) m'a fait plaisir. T'en veux un autre ?"`
    }
    return `NUTRIPATES sourit légèrement. "Le dernier client était ${lastPurchase.nickname}, ${ago}. Il a pris ${article(lastPurchase.itemName)}. Et toi, tu prends quoi ?"`
}

function article(itemName: string): string {
    const first = itemName.charAt(0).toLowerCase()
    return /[aeiouéèêh]/.test(first) ? `un·e ${itemName.toLowerCase()}` : `un·e ${itemName.toLowerCase()}`
}

export default function ShopModal({ inventory, availableEnergy, nickname, difficultyRatio, onBuy, onClose }: Props) {
    // v3.10 — Helper local : applique le ratio à un prix de base (Math.round neutre).
    // Doit rester aligné avec applyRatio() dans src/lib/gamebook/difficulty.ts.
    const adjustPrice = (base: number): number => {
        if (difficultyRatio >= 1) return base
        return Math.max(1, Math.round(base * difficultyRatio))
    }
    const [busy, setBusy] = useState(false)
    const [purchaseMade, setPurchaseMade] = useState(false)
    const [lastPurchase, setLastPurchase] = useState<LastPurchase | null>(null)
    const [loadingInfo, setLoadingInfo] = useState(true)

    // Charger les news du shop au montage
    useEffect(() => {
        let cancelled = false
        ; (async () => {
            try {
                const res = await fetch("/api/gamebook/shop/info", { cache: "no-store" })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const json = await res.json()
                if (!cancelled) setLastPurchase(json.lastPurchase ?? null)
            } catch {
                // silent : on tombera sur le dialogue "personne n'achète"
            } finally {
                if (!cancelled) setLoadingInfo(false)
            }
        })()
        return () => { cancelled = true }
    }, [])

    const greeting = useMemo(
        () => greetingFor(lastPurchase, nickname),
        [lastPurchase, nickname]
    )

    const handleClose = () => {
        onClose(purchaseMade)
    }

    const doBuy = async (itemKey: string) => {
        if (busy) return
        setBusy(true)
        try {
            await onBuy(itemKey)
            setPurchaseMade(true)
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
            onClick={handleClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a",
                    border: "3px solid #fff",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    maxWidth: 360,
                    width: "100%",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, letterSpacing: 4, fontWeight: "bold" }}>🛒 BOUTIQUE</div>
                    <button
                        onClick={handleClose}
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

                {/* v3.8.9 — Dialogue d'accueil de NUTRIPATES */}
                <div
                    style={{
                        background: "#2a2a2a",
                        border: "1px solid #555",
                        borderLeft: "3px solid #8050d0",
                        padding: "8px 10px",
                        marginBottom: 12,
                        fontSize: 10,
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        color: "#dcd0a0",
                        minHeight: 38,
                    }}
                >
                    {loadingInfo ? "..." : greeting}
                </div>

                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12, padding: "4px 8px" }}>
                    Énergie dispo : <strong style={{ color: "#ffe3a8" }}>{availableEnergy} reps</strong>
                </div>

                {ITEMS.map((item) => {
                    // v3.8.1 — on autorise le rachat si l'item existant est cassé
                    const alreadyIntact = hasIntactItem(inventory, item.key) && item.maxQuantity === 1
                    // v3.10 — prix affiché ajusté par le ratio de difficulté
                    const displayedPrice = adjustPrice(item.priceReps)
                    const canAfford = availableEnergy >= displayedPrice
                    const disabled = alreadyIntact || !canAfford || busy

                    let cta = "ACHETER"
                    if (alreadyIntact) cta = "DÉJÀ POSSÉDÉ"
                    else if (!canAfford) cta = "TROP CHER"

                    return (
                        <div
                            key={item.key}
                            style={{
                                background: "#222",
                                border: "1px solid #555",
                                padding: 10,
                                marginBottom: 8,
                                borderRadius: 4,
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                <span style={{ fontSize: 24 }}>{item.emoji}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 2 }}>
                                        {item.name.toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2, lineHeight: 1.4 }}>
                                        {item.description}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                                <div style={{ fontSize: 11, letterSpacing: 2 }}>
                                    💪 <strong>{displayedPrice}</strong> reps
                                    {displayedPrice !== item.priceReps && (
                                        <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.5, textDecoration: "line-through" }}>
                                            {item.priceReps}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => doBuy(item.key)}
                                    disabled={disabled}
                                    style={{
                                        background: disabled ? "#333" : "#4080d8",
                                        color: disabled ? "#666" : "#fff",
                                        border: "1px solid #fff",
                                        padding: "5px 12px",
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                        letterSpacing: 2,
                                        cursor: disabled ? "not-allowed" : "pointer",
                                        opacity: disabled ? 0.5 : 1,
                                    }}
                                >
                                    {cta}
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
