"use client"

// src/app/gamebook/yellow/HeldItemModal.tsx
//
// OBJET TENU — équiper / retirer l'objet tenu d'un Daemon (1 max). Les objets tenus s'achètent en
// Jetons de Combat chez le marchand de la Zone de Combat ; ici on les pioche dans le sac et on les
// pose sur un Daemon (l'effet est appliqué par le moteur). Verrou : un objet SIGNATURE ne s'équipe
// que sur son espèce.

import { usePlayer, equipHeldItem, unequipHeldItem } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getHeldItem, isHeldItem, HELD_ITEMS } from "@/lib/gamebook/yellow/data/heldItems"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"

export default function HeldItemModal({ uid, onClose }: { uid: string; onClose: () => void }) {
    const player = usePlayer()
    const mon = player.team.find((m) => m.uid === uid) ?? player.pc.find((m) => m.uid === uid)
    if (!mon) return null
    const monName = mon.nickname ?? getSpecies(mon.speciesId)?.name ?? mon.speciesId
    const current = getHeldItem(mon.heldItem)
    const owned = Object.entries(player.items)
        .filter(([id, n]) => isHeldItem(id) && n > 0)
        .map(([id, n]) => ({ it: HELD_ITEMS[id], n }))

    const equip = (id: string) => { if (equipHeldItem(uid, id)) persistYellowSave() }
    const unequip = () => { if (unequipHeldItem(uid)) persistYellowSave() }

    return (
        <div onClick={onClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🎒 OBJET TENU <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>{monName}</span></div>
                <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                    {current ? (
                        <div style={{ ...card, border: "2px solid #3a8ee0", background: "#eaf4ff" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{current.emoji} {current.name} <span style={{ fontSize: 10, opacity: 0.7 }}>(équipé)</span></div>
                            <div style={{ fontSize: 11, color: INK, opacity: 0.75, margin: "2px 0 6px" }}>{current.description}</div>
                            <button onClick={unequip} style={ghost}>Retirer (retour au sac)</button>
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: INK, opacity: 0.75, marginBottom: 10 }}>Aucun objet tenu pour le moment.</div>
                    )}

                    <div style={{ fontSize: 12, fontWeight: 800, color: INK, margin: "10px 0 6px" }}>👜 Dans ton sac</div>
                    {owned.length === 0 ? (
                        <div style={{ fontSize: 11, color: INK, opacity: 0.65, lineHeight: 1.4 }}>Aucun objet tenu en stock. Achètes-en chez le <b>marchand de la Zone de Combat</b> (contre des Jetons de Combat).</div>
                    ) : owned.map(({ it, n }) => {
                        const locked = !!it.species && it.species !== mon.speciesId
                        const isCurrent = mon.heldItem === it.id
                        const lockName = it.species ? (getSpecies(it.species)?.name ?? it.species) : ""
                        return (
                            <div key={it.id} style={card}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{it.emoji} {it.name} <span style={{ fontSize: 10, opacity: 0.6 }}>×{n}</span></div>
                                        <div style={{ fontSize: 10, color: INK, opacity: 0.65, lineHeight: 1.3 }}>{it.description}{locked ? ` · 🔒 réservé à ${lockName}` : ""}</div>
                                    </div>
                                    <button onClick={() => equip(it.id)} disabled={locked || isCurrent} style={{ ...primary, ...(locked || isCurrent ? off : {}) }}>{isCurrent ? "Équipé" : "Équiper"}</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <button onClick={onClose} style={closeBtn}>FERMER</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const card: React.CSSProperties = { background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 8, padding: 10, marginBottom: 8 }
const primary: React.CSSProperties = { padding: "6px 12px", background: INK, color: CREAM, border: "none", borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }
const off: React.CSSProperties = { background: DARK, cursor: "not-allowed" }
const ghost: React.CSSProperties = { width: "100%", padding: "6px 0", background: "transparent", color: INK, border: `1px solid ${DARK}`, borderRadius: 6, fontWeight: 600, fontSize: 11, cursor: "pointer" }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
