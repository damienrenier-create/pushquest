"use client"

// Nexus Jaune Éclair — écran d'APPRENTISSAGE d'attaque (4 slots pleins).
// Apparaît post-combat tant qu'un Daemon a une attaque en attente. Le joueur
// choisit une capacité à oublier, ou renonce. Traite les apprentissages 1 par 1.

import { usePlayer, pendingLearns, resolveLearn } from "@/lib/gamebook/yellow/store/playerStore"
import { getMove } from "@/lib/gamebook/yellow/data/moves"

export default function LearnScreen() {
    usePlayer() // réactivité : se met à jour quand l'équipe change
    const list = pendingLearns()
    if (list.length === 0) return null

    const cur = list[0]
    const learn = getMove(cur.moveId)
    const learnLabel = (id: string) => {
        const m = getMove(id)
        return m ? `${m.name} · ${m.type}${m.power > 0 ? ` · ${m.power}` : " · statut"}` : id
    }

    return (
        <div style={S.overlay}>
            <div style={S.box}>
                <p style={S.title}>{cur.name} veut apprendre <b style={{ color: "#f5d020" }}>{learn?.name ?? cur.moveId}</b> !</p>
                <p style={S.sub}>{learn ? learnLabel(cur.moveId) : ""}</p>
                <p style={S.q}>Oublier quelle capacité ?</p>
                <div style={S.list}>
                    {cur.moves.map((slot, i) => (
                        <button key={i} style={S.btn} onClick={() => resolveLearn(cur.uid, cur.moveId, i)}>
                            {learnLabel(slot.moveId)}
                        </button>
                    ))}
                    <button style={S.btnDim} onClick={() => resolveLearn(cur.uid, cur.moveId, null)}>
                        Renoncer à {learn?.name ?? "cette attaque"}
                    </button>
                </div>
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 9250, background: "#0a0a14ee", color: "#f8f8e8", fontFamily: "'Courier New', monospace", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
    box: { width: "100%", maxWidth: 380, background: "#1c1408", border: "3px solid #f5d020", borderRadius: 10, padding: 18, maxHeight: "88dvh", overflowY: "auto" },
    title: { fontSize: 14, fontWeight: 700, lineHeight: 1.5, margin: "0 0 4px" },
    sub: { fontSize: 11, opacity: 0.7, margin: "0 0 14px" },
    q: { fontSize: 12, fontWeight: 700, margin: "0 0 10px" },
    list: { display: "flex", flexDirection: "column", gap: 8 },
    btn: { background: "#f8f8e8", color: "#1c1408", border: "2px solid #1c1408", borderRadius: 6, padding: "10px 12px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer", textAlign: "left" },
    btnDim: { background: "transparent", color: "#c8c8c8", border: "1px solid #555", borderRadius: 6, padding: "9px 12px", fontFamily: "inherit", fontSize: 11, fontWeight: 700, cursor: "pointer" },
}
