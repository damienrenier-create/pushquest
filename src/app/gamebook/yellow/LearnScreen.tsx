"use client"

// Nexus Jaune Éclair — écran d'APPRENTISSAGE d'attaque (4 slots pleins).
// Apparaît post-combat tant qu'un Daemon a une attaque en attente. Le joueur
// choisit une capacité à oublier, ou renonce. Traite les apprentissages 1 par 1.

import { usePlayer, pendingLearns, resolveLearn } from "@/lib/gamebook/yellow/store/playerStore"
import MoveCompare from "./MoveCompare"

export default function LearnScreen() {
    const player = usePlayer() // réactivité : se met à jour quand l'équipe change
    const list = pendingLearns()
    if (list.length === 0) return null

    const cur = list[0]
    const mon = player.team.find((m) => m.uid === cur.uid)
    if (!mon) return null

    return (
        <div style={S.overlay}>
            <div style={S.box}>
                <MoveCompare mon={mon} newMoveId={cur.moveId} onForget={(i) => resolveLearn(cur.uid, cur.moveId, i)} onGiveUp={() => resolveLearn(cur.uid, cur.moveId, null)} />
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9250, background: "#0a0a14ee", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    box: { width: "100%", maxWidth: 400, background: "#1c1408", border: "3px solid #f5d020", borderRadius: 10, padding: 18, maxHeight: "88dvh", overflowY: "auto" },
}
