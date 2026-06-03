// src/app/gamebook/DaemonEvolutionScreen.tsx
//
// v4.y — Cinématique d'évolution Animal → Daemon (après avoir fait boire la
// Mega Gourde du Capo pleine). Déroule :
//   1. intro (l'animal boit)
//   2. récap des reps accumulées depuis le début de l'aventure Nexus
//   3. animation d'évolution (ancien animal → flash → nouvel animal du niveau actuel)
//   4. confirmation Daemon
//   5. teaser Chapitre 2 (Nexus Jaune Éclair)
// Tap / bouton pour avancer ; onDone à la fin.

"use client"

import { useState } from "react"

export interface DaemonEvolutionData {
    animalName: string
    totalReps: number
    fromLevel: number
    toLevel: number
    fromAnimal: { name: string; emoji: string }
    toAnimal: { name: string; emoji: string }
}

export default function DaemonEvolutionScreen({
    data,
    onDone,
}: {
    data: DaemonEvolutionData
    onDone: () => void
}) {
    // 0 intro · 1 récap reps · 2 évolution (animation) · 3 daemon · 4 teaser chapitre 2
    const [phase, setPhase] = useState(0)

    const next = () => {
        if (phase >= 4) { onDone(); return }
        setPhase((p) => p + 1)
    }

    return (
        <div
            onClick={next}
            style={{
                position: "fixed", inset: 0, zIndex: 9500,
                background: "#000",
                color: "#fff",
                fontFamily: "'Courier New', monospace",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: 24, textAlign: "center", cursor: "pointer",
            }}
        >
            {phase === 0 && (
                <div>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>🫙</div>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                        Tu débouches la <b>Mega Gourde du Capo</b> et la fais boire à{" "}
                        <b>{data.animalName}</b>…
                    </p>
                </div>
            )}

            {phase === 1 && (
                <div>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
                    <p style={{ fontSize: 13, lineHeight: 1.7, opacity: 0.9 }}>
                        Toute l'énergie que tu as forgée depuis le début de ton aventure Nexus
                        afflue dans la gourde…
                    </p>
                    <div style={{ fontSize: 34, fontWeight: "bold", color: "#f5d020", marginTop: 18, letterSpacing: 2 }}>
                        {data.totalReps.toLocaleString("fr-FR")}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>reps accumulées</div>
                </div>
            )}

            {phase === 2 && (
                <div>
                    <div style={{ position: "relative", height: 120, marginBottom: 16 }}>
                        <div className="evo-from" style={{ fontSize: 80, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {data.fromAnimal.emoji}
                        </div>
                        <div className="evo-to" style={{ fontSize: 80, position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {data.toAnimal.emoji}
                        </div>
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                        <b>{data.animalName}</b> évolue !
                    </p>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 6 }}>
                        {data.fromAnimal.name} <span style={{ color: "#f5d020" }}>→</span> {data.toAnimal.name}
                    </div>
                </div>
            )}

            {phase === 3 && (
                <div>
                    <div style={{ fontSize: 80, marginBottom: 14, filter: "drop-shadow(0 0 12px #b070ff)" }}>
                        {data.toAnimal.emoji}
                    </div>
                    <p style={{ fontSize: 15, lineHeight: 1.6 }}>
                        <b>{data.animalName}</b> est désormais un <b style={{ color: "#b070ff" }}>DAEMON 👾</b> !
                    </p>
                    <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8 }}>
                        Niveau {data.toLevel} — {data.toAnimal.name}. Stats de combat débloquées.
                    </div>
                </div>
            )}

            {phase === 4 && (
                <div>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🟡⚡</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7 }}>
                        Le Nexus frémit. Une voix résonne :
                    </p>
                    <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: "italic", color: "#f5d020", marginTop: 10 }}>
                        « Tu es prêt pour le <b>Chapitre 2 — Nexus Jaune Éclair</b>.
                        Mais le passage n'est pas encore ouvert… Patiente. Reviens bientôt. »
                    </p>
                </div>
            )}

            <div style={{ position: "absolute", bottom: 24, fontSize: 11, opacity: 0.55 }}>
                {phase >= 4 ? "Toucher pour terminer ▶" : "Toucher pour continuer ▶"}
            </div>

            <style jsx>{`
                .evo-from { animation: evoFromAnim 1.6s ease-in-out infinite; }
                .evo-to { animation: evoToAnim 1.6s ease-in-out infinite; }
                @keyframes evoFromAnim {
                    0%, 40% { opacity: 1; transform: scale(1); filter: none; }
                    50%, 90% { opacity: 0; transform: scale(0.6); filter: brightness(4); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes evoToAnim {
                    0%, 40% { opacity: 0; transform: scale(0.6); filter: brightness(4); }
                    50%, 90% { opacity: 1; transform: scale(1.1); filter: drop-shadow(0 0 14px #b070ff); }
                    100% { opacity: 0; transform: scale(0.6); }
                }
            `}</style>
        </div>
    )
}
