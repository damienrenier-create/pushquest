"use client"

// src/app/gamebook/InventoryModal.tsx
//
// v3.8 — Modal du sac.
// v3.8.1 — Gère maxCapacity dynamique de la gourde + état "Cassé" + baskets (durabilité).
// v3.23o — Refonte UX :
//          - 2 onglets (poches) : "EN COURS" (fonctionnels) / "USÉS" (cassés)
//          - Scroll mobile-friendly (overflow-y auto + max-height limité)
//          - Bouton "REFERMER LE SAC" en bas
//          - Limite affichée 15 par poche

import { useState } from "react"
import { ITEMS, readStored, readMaxCapacity, readDurability, isBrokenItem, type ItemDefinition } from "@/lib/gamebook/items"
import type { InventoryEntry } from "@/lib/gamebook/inventory"

type UseAction = "fill" | "drink" | "consume" | "feed_animal" | "drink_to_animal"
type Pocket = "working" | "broken"

export const POCKET_MAX_ITEMS = 15

interface Props {
    inventory: InventoryEntry[]
    availableEnergy: number
    onUse: (itemKey: string, action: UseAction, amount?: number) => Promise<void>
    onView?: (itemKey: string, kind: "playerMap" | "treasureMap" | "tree_book") => void
    onClose: () => void
    // v3.33 — Contexte pour activer les actions "donner à l'animal" chez le véto
    mapId?: string
    hasTamagotchi?: boolean
}

export default function InventoryModal({ inventory, availableEnergy, onUse, onView, onClose, mapId, hasTamagotchi }: Props) {
    const [activePocket, setActivePocket] = useState<Pocket>("working")

    const ownedAll = inventory
        .map((e) => {
            const def = ITEMS.find((i) => i.key === e.itemKey)
            return def ? { entry: e, def, broken: isBrokenItem(e.data, def) } : null
        })
        .filter((x): x is { entry: InventoryEntry; def: ItemDefinition; broken: boolean } => x !== null)

    const working = ownedAll.filter((x) => !x.broken)
    const broken = ownedAll.filter((x) => x.broken)
    const visible = activePocket === "working" ? working : broken

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
                padding: 12,
            }}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "#1a1a1a",
                    border: "3px solid #fff",
                    borderRadius: 6,
                    padding: 12,
                    minWidth: 280,
                    maxWidth: 380,
                    width: "100%",
                    maxHeight: "calc(100vh - 24px)",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexShrink: 0 }}>
                    <div style={{ fontSize: 12, letterSpacing: 4, fontWeight: "bold" }}>🎒 SAC</div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent",
                            border: "1px solid #fff",
                            color: "#fff",
                            fontFamily: "monospace",
                            padding: "4px 10px",
                            fontSize: 11,
                            cursor: "pointer",
                            letterSpacing: 1,
                            minWidth: 32,
                        }}
                        aria-label="Fermer"
                    >
                        ✕
                    </button>
                </div>

                {/* Onglets (poches) */}
                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexShrink: 0 }}>
                    <PocketTab
                        active={activePocket === "working"}
                        onClick={() => setActivePocket("working")}
                        label={`🎒 EN COURS`}
                        count={working.length}
                    />
                    <PocketTab
                        active={activePocket === "broken"}
                        onClick={() => setActivePocket("broken")}
                        label={`🪦 USÉS`}
                        count={broken.length}
                    />
                </div>

                {/* Contenu scrollable */}
                <div
                    style={{
                        flex: 1,
                        overflowY: "auto",
                        WebkitOverflowScrolling: "touch",
                        marginBottom: 10,
                        paddingRight: 4,
                    }}
                >
                    {visible.length === 0 && (
                        <div style={{ fontSize: 11, opacity: 0.6, padding: 20, textAlign: "center" }}>
                            {activePocket === "working"
                                ? "Poche vide. Va voir NUTRIPATES à Pépiteville ou TRENETTE à Macaron'île."
                                : "Aucun objet usé. Bien joué."}
                        </div>
                    )}

                    {visible.map(({ entry, def }) => (
                        <ItemRow
                            key={def.key}
                            entry={entry}
                            def={def}
                            availableEnergy={availableEnergy}
                            onUse={onUse}
                            onView={onView}
                            mapId={mapId}
                            hasTamagotchi={hasTamagotchi}
                        />
                    ))}
                </div>

                {/* Bouton "REFERMER LE SAC" en bas */}
                <button
                    onClick={onClose}
                    style={{
                        width: "100%",
                        background: "#444",
                        color: "#fff",
                        border: "2px solid #fff",
                        padding: "12px 12px",
                        fontFamily: "'Courier New', monospace",
                        fontSize: 12,
                        fontWeight: "bold",
                        letterSpacing: 2,
                        cursor: "pointer",
                        flexShrink: 0,
                    }}
                >
                    REFERMER LE SAC
                </button>
            </div>
        </div>
    )
}

function PocketTab({
    active, onClick, label, count,
}: {
    active: boolean
    onClick: () => void
    label: string
    count: number
}) {
    const overLimit = count > POCKET_MAX_ITEMS
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                background: active ? "#48a868" : "#222",
                color: "#fff",
                border: active ? "2px solid #fff" : "1px solid #555",
                padding: "8px 6px",
                fontFamily: "'Courier New', monospace",
                fontSize: 10,
                fontWeight: "bold",
                letterSpacing: 1,
                cursor: "pointer",
                borderRadius: 4,
            }}
        >
            <div>{label}</div>
            <div style={{ fontSize: 9, opacity: 0.8, marginTop: 2, color: overLimit ? "#f08080" : "#fff" }}>
                {count} / {POCKET_MAX_ITEMS}
            </div>
        </button>
    )
}

function ItemRow({
    entry,
    def,
    availableEnergy,
    onUse,
    onView,
    mapId,
    hasTamagotchi,
}: {
    entry: InventoryEntry
    def: ItemDefinition
    availableEnergy: number
    onUse: (itemKey: string, action: UseAction, amount?: number) => Promise<void>
    onView?: (itemKey: string, kind: "playerMap" | "treasureMap" | "tree_book") => void
    mapId?: string
    hasTamagotchi?: boolean
}) {
    const [fillInput, setFillInput] = useState<string>("10")
    const [busy, setBusy] = useState(false)

    const isStorable = !!def.capabilities.canStore
    const isWearable = !!def.capabilities.canWear
    const isViewable = !!def.capabilities.canView
    const isConsumable = !!def.capabilities.canConsume
    const broken = isBrokenItem(entry.data, def)

    const stored = isStorable ? readStored(entry.data) : 0
    const capacity = isStorable ? readMaxCapacity(entry.data, def) : 0

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
                <span style={{ fontSize: 22 }}>{def.emoji}</span>
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
                    {/* v3.33 — Donner à boire à l'animal (chez le véto uniquement) */}
                    {mapId === "veterinaire" && hasTamagotchi && (
                        <button
                            onClick={() => doAction("drink_to_animal")}
                            disabled={busy || stored < 10}
                            style={btnStyle(busy || stored < 10, "#4a8030")}
                        >
                            🐾 DONNER À BOIRE
                        </button>
                    )}
                </div>
            )}

            {broken && (
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 6, fontStyle: "italic" }}>
                    Va t'en racheter un(e) chez NUTRIPATES ou TRENETTE.
                </div>
            )}

            {isViewable && def.capabilities.canView && onView && !broken && (
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={() => onView(def.key, def.capabilities.canView!.kind)}
                        style={btnStyle(false, "#4080d8")}
                    >
                        CONSULTER
                    </button>
                </div>
            )}

            {isConsumable && !broken && (
                <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <button
                        onClick={() => doAction("consume")}
                        disabled={busy}
                        style={btnStyle(busy, "#d06030")}
                    >
                        CONSOMMER
                    </button>
                    {/* v3.33 — Donner à l'animal (corned_pates chez le véto) */}
                    {mapId === "veterinaire" && hasTamagotchi && def.key === "corned_pates" && (
                        <button
                            onClick={() => doAction("feed_animal")}
                            disabled={busy}
                            style={btnStyle(busy, "#4a8030")}
                        >
                            🐾 DONNER À L'ANIMAL
                        </button>
                    )}
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
