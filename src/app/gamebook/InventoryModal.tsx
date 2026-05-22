"use client"

// src/app/gamebook/InventoryModal.tsx
//
// v3.8 — Modal du sac. Liste les items possédés.
// Pour la gourde : affiche le niveau de remplissage + actions Remplir/Boire.

import { useState } from "react"
import { ITEMS, readStored, type ItemDefinition } from "@/lib/gamebook/items"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

interface Props {
    inventory: InventoryEntry[]
    availableEnergy: number
    onUse: (itemKey: string, action: "fill" | "drink", amount?: number) => Promise<void>
    onClose: () => void
}

export default function InventoryModal({ inventory, availableEnergy, onUse, onClose }: Props) {
    const owned = inventory
        .map((e) => {
            const def = ITEMS.find((i) => i.key === e.itemKey)
            return def ? { entry: e, def } : null
        })
        .filter((x): x is { entry: InventoryEntry; def: ItemDefinition } => x !== null)

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
                    <div style={{ fontSize: 12, letterSpacing: 4, fontWeight: "bold" }}>🎒 SAC</div>
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

                {owned.length === 0 && (
                    <div style={{ fontSize: 11, opacity: 0.6, padding: 12, textAlign: "center" }}>
                        Le sac est vide. Va voir NUTRIPATES à la boutique de Pépiteville.
                    </div>
                )}

                {owned.map(({ entry, def }) => (
                    <ItemRow
                        key={def.key}
                        entry={entry}
                        def={def}
                        availableEnergy={availableEnergy}
                        onUse={onUse}
                    />
                ))}
            </div>
        </div>
    )
}

function ItemRow({
    entry,
    def,
    availableEnergy,
    onUse,
}: {
    entry: InventoryEntry
    def: ItemDefinition
    availableEnergy: number
    onUse: (itemKey: string, action: "fill" | "drink", amount?: number) => Promise<void>
}) {
    const [fillInput, setFillInput] = useState<string>("10")
    const [busy, setBusy] = useState(false)

    const isStorable = !!def.capabilities.canStore
    const stored = isStorable ? readStored(entry.data) : 0
    const capacity = def.capabilities.canStore?.maxCapacity ?? 0

    const doAction = async (action: "fill" | "drink") => {
        if (busy) return
        setBusy(true)
        try {
            const amount = action === "fill" ? Math.max(0, parseInt(fillInput, 10) || 0) : undefined
            await onUse(def.key, action, amount)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div
            style={{
                background: "#222",
                border: "1px solid #555",
                padding: 10,
                marginBottom: 8,
                borderRadius: 4,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{def.emoji}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 2 }}>
                        {def.name.toUpperCase()}
                        {isStorable && ` — ${stored}/${capacity}`}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2, lineHeight: 1.4 }}>
                        {def.description}
                    </div>
                </div>
            </div>

            {isStorable && (
                <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                    <input
                        type="number"
                        min="1"
                        max={Math.min(capacity - stored, availableEnergy)}
                        value={fillInput}
                        onChange={(e) => setFillInput(e.target.value)}
                        disabled={busy || capacity - stored <= 0 || availableEnergy <= 0}
                        style={{
                            width: 50,
                            background: "#111",
                            color: "#fff",
                            border: "1px solid #555",
                            padding: "4px 6px",
                            fontFamily: "monospace",
                            fontSize: 11,
                        }}
                    />
                    <button
                        onClick={() => doAction("fill")}
                        disabled={busy || capacity - stored <= 0 || availableEnergy <= 0}
                        style={btnStyle(busy || capacity - stored <= 0 || availableEnergy <= 0)}
                    >
                        REMPLIR
                    </button>
                    <button
                        onClick={() => doAction("drink")}
                        disabled={busy || stored <= 0}
                        style={btnStyle(busy || stored <= 0, "#c83838")}
                    >
                        BOIRE TOUT
                    </button>
                </div>
            )}
        </div>
    )
}

function btnStyle(disabled: boolean, bg = "#4060a0") {
    return {
        background: disabled ? "#333" : bg,
        color: disabled ? "#666" : "#fff",
        border: "1px solid #fff",
        padding: "4px 10px",
        fontFamily: "'Courier New', monospace",
        fontSize: 10,
        fontWeight: "bold" as const,
        letterSpacing: 2,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
    }
}
