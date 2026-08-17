"use client"

// CT DU MAÎTRE — choix de récompense du champion d'une facilité (Dôme / Usine / Tour). Le joueur en choisit UNE ;
// les CT déjà possédées ne sont plus proposées (jamais 2× la même → triple-champion = 3/4). Réutilisable partout.

import { useState } from "react"
import { getCt } from "@/lib/gamebook/yellow/data/cts"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { availableMasterCtIds, claimMasterCt } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"

export default function MasterCtChoice({ facility, onClaimed }: { facility: "dome" | "tour" | "usine"; onClaimed: (ctName: string) => void }) {
    const [available] = useState(() => availableMasterCtIds())
    const [done, setDone] = useState(false)
    if (done) return null
    if (available.length === 0) return <div style={{ fontSize: 11, opacity: 0.75 }}>Tu as déjà décroché toutes les CT du Maître. 🏆</div>
    const pick = (ctId: string) => {
        const ct = getCt(ctId); const mv = ct ? getMove(ct.moveId) : null
        if (claimMasterCt(ctId, facility)) { persistYellowSave(); setDone(true); onClaimed(mv?.name ?? ctId) }
    }
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 11, opacity: 0.85, marginBottom: 2 }}>Choisis TA CT de champion — une seule, <b>définitive</b> :</div>
            {available.map((ctId) => {
                const ct = getCt(ctId); const mv = ct ? getMove(ct.moveId) : null
                if (!mv) return null
                return (
                    <button key={ctId} onClick={() => pick(ctId)} style={{ textAlign: "left", background: "rgba(255,215,74,.12)", border: "1px solid #ffd54a", borderRadius: 8, padding: "8px 10px", cursor: "pointer", color: "#fff", fontFamily: "inherit" }}>
                        <div style={{ fontWeight: 800, color: "#ffd54a", fontSize: 12 }}>🎁 {mv.name} <span style={{ fontSize: 9, opacity: 0.7 }}>· {mv.type} · puiss. {mv.power}</span></div>
                        <div style={{ fontSize: 10, opacity: 0.78, lineHeight: 1.35, marginTop: 2 }}>{mv.description}</div>
                    </button>
                )
            })}
        </div>
    )
}
