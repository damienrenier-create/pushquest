"use client"

// Prompt post-combat d'APPRENTISSAGE d'attaque (façon Gen 1) : quand un Daemon a appris une attaque
// alors que ses 4 slots étaient pleins, on lui propose ici d'en oublier une — ou de renoncer.
// Traite la file des `pendingMoves` de l'équipe, un Daemon/une attaque à la fois (resolveLearn).

import { useEffect } from "react"
import { usePlayer, resolveLearn } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import MoveCompare from "../MoveCompare"

export default function MoveLearnScreen({ onDone }: { onDone: () => void }) {
    const player = usePlayer()
    // Premier Daemon avec une attaque en attente.
    const mon = player.team.find((m) => (m.pendingMoves?.length ?? 0) > 0)
    const moveId = mon?.pendingMoves?.[0]

    // Plus rien à apprendre → on ferme (hors render pour éviter un setState pendant le rendu).
    useEffect(() => { if (!mon || !moveId) onDone() }, [mon, moveId, onDone])
    if (!mon || !moveId) return null

    const learn = (slot: number | null) => { resolveLearn(mon.uid, moveId, slot); persistYellowSave() }

    return (
        <div style={overlay}>
            <div style={box}>
                <MoveCompare mon={mon} newMoveId={moveId} onForget={(i) => learn(i)} onGiveUp={() => learn(null)} onLater={onDone} />
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9200, background: "rgba(8,6,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16, fontFamily: "'Courier New', monospace", color: "#f8f8e8",
}
const box: React.CSSProperties = {
    width: "min(420px, 96vw)", maxHeight: "92dvh", overflowY: "auto", background: "rgba(20,16,40,0.96)", border: "3px solid #f5d020", borderRadius: 14, padding: "18px 16px",
}
