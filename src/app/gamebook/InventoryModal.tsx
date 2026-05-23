"use client"

// src/app/gamebook/InventoryModal.tsx
//
// v3.8 — Modal du sac.
// v3.8.1 — Gère maxCapacity dynamique de la gourde + état "Cassé" + baskets (durabilité).

import { useState } from "react"
import { ITEMS, readStored, readMaxCapacity, readDurability, isBrokenItem, type ItemDefinition } from "@/lib/gamebook/items"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

type UseAction = "fill" | "drink" | "consume"

interface Props {
    inventory: InventoryEntry[]
    availableEnergy: number
    onUse: (itemKey: string, action: UseAction, amount?: number) => Promise<void>
    onView?: (itemKey: string, kind: "playerMap" | "treasureMap") => void
    onClose: () => void
}

export default function InventoryModal({ inventory, availableEnergy, onUse, onView, onClose }: Props) {
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
                        onView={onView}
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
    onView,
}: {
    entry: InventoryEntry
    def: ItemDefinition
    availableEnergy: number
    onUse: (itemKey: string, action: UseAction, amount?: number) => Promise<void>
    onView?: (itemKey: string, kind: "playerMap" | "treasureMap") => void
}) {
    const [fillInput, setFillInput] = useState<string>("10")
    const [busy, setBusy] = useState(false)

    const isStorable = !!def.capabilities.canStore
    const isWearable = !!def.capabilities.canWear
    const isViewable = !!def.capabilities.canView
    const isConsumable = !!def.capabilities.canConsume
    const broken = isBrokenItem(entry.data, def)

    // v3.8.1 — capacité dynamique pour la gourde (peut décroître)
    const stored = isStorable ? readStored(entry.data) : 0
    const capacity = isStorable ? readMaxCapacity(entry.data, def) : 0

    // v3.8.1 — durabilité pour les baskets
    const durability = isWearable ? readDurability(entry.data, def) : 0
    const initialDurability = def.capabilities.canWear?.initialDurability ?? 0
    const durabilityPct = initialDurability > 0 ? (durability / initialDurability) * 100 : 0

    const doAction = async (action: UseAction) => {
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
                border: broken ? "1px solid #c83838" : "1px solid #555",
                padding: 10,
                marginBottom: 8,
                borderRadius: 4,
                opacity: broken ? 0.6 : 1,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{def.emoji}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: "bold", letterSpacing: 2 }}>
                        {def.name.toUpperCase()}
                        {isStorable && (broken ? " — 🪦 CASSÉE" : ` — ${stored}/${capacity}`)}
                        {isWearable && (broken ? " — 🪦 CASSÉES" : "")}
                    </div>
                    <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2, lineHeight: 1.4 }}>
                        {def.description}
                    </div>
                </div>
            </div>

            {/* v3.8.1 — barre de durabilité pour les baskets */}
            {isWearable && !broken && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, opacity: 0.7, marginBottom: 2 }}>
                        Usure : {durability}/{initialDurability} pas restants
                    </div>
                    <div style={{ background: "#111", height: 6, borderRadius: 3, overflow: "hidden", border: "1px solid #444" }}>
                        <div
                            style={{
                                width: `${durabilityPct}%`,
                                height: "100%",
                                background:
                                    durabilityPct > 50 ? "#48a830"
                                        : durabilityPct > 20 ? "#f0a050"
                                            : "#c83838",
                                transition: "width 0.3s",
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Actions pour la gourde (uniquement si pas cassée) */}
            {isStorable && !broken && (
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

            {/* Hint pour items cassés */}
            {broken && (
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 6, fontStyle: "italic" }}>
                    Va t'en racheter un(e) chez NUTRIPATES.
                </div>
            )}

            {/* v3.8.3 — Actions de consultation pour items canView (ex: carte des joueurs) */}
            {isViewable && def.capabilities.canView && onView && (
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={() => onView(def.key, def.capabilities.canView!.kind)}
                        style={btnStyle(false, "#4080d8")}
                    >
                        CONSULTER
                    </button>
                </div>
            )}

            {/* v3.13 — Action consommer (corned pâtes, etc.) */}
            {isConsumable && (
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={() => doAction("consume")}
                        disabled={busy}
                        style={btnStyle(busy, "#d06030")}
                    >
                        CONSOMMER
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
