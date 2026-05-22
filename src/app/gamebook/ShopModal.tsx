"use client"

// src/app/gamebook/ShopModal.tsx
//
// v3.8 — Modal d'achat ouvert quand on parle à NUTRIPATES avec le sac.
// Liste les items achetables, leur prix, leur disponibilité.

import { useState } from "react"
import { ITEMS } from "@/lib/gamebook/items"
import { hasIntactItem, type InventoryEntry } from "@/lib/gamebook/inventory"

interface Props {
    inventory: InventoryEntry[]
    availableEnergy: number
    onBuy: (itemKey: string) => Promise<void>
    onClose: () => void
}

export default function ShopModal({ inventory, availableEnergy, onBuy, onClose }: Props) {
    const [busy, setBusy] = useState(false)

    const doBuy = async (itemKey: string) => {
        if (busy) return
        setBusy(true)
        try {
            await onBuy(itemKey)
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
                    border: "3px solid #fff",
                    borderRadius: 6,
                    padding: 16,
                    minWidth: 280,
                    maxWidth: 360,
                    width: "100%",
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: 4, fontWeight: "bold" }}>🛒 BOUTIQUE</div>
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

                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 12, padding: "4px 8px" }}>
                    Énergie dispo : <strong style={{ color: "#ffe3a8" }}>{availableEnergy} reps</strong>
                </div>

                {ITEMS.map((item) => {
                    // v3.8.1 — on autorise le rachat si l'item existant est cassé
                    const alreadyIntact = hasIntactItem(inventory, item.key) && item.maxQuantity === 1
                    const canAfford = availableEnergy >= item.priceReps
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
                                    💪 <strong>{item.priceReps}</strong> reps
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
