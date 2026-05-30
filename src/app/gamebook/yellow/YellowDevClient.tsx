"use client"

// Nexus II — page de dev client.
//
// Branche le D-pad du GameBoyShell au store Zustand : chaque pression appelle
// useGameStore.move(direction), qui calcule le nouveau player state via le
// moteur pur tryMove(). Le MapView ré-render automatiquement.
//
// Pas encore : interaction A/B (NPCs, dialogues), START (menu), SELECT.

import { useEffect } from "react"
import GameBoyShell from "./GameBoyShell"
import MapView from "./MapView"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"

export default function YellowDevClient() {
    const move = useGameStore((s) => s.move)
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)

    // Support clavier desktop : flèches + Espace/Entrée/A (= A), Escape/B (= B)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "ArrowUp") { e.preventDefault(); move("up") }
            else if (e.key === "ArrowDown") { e.preventDefault(); move("down") }
            else if (e.key === "ArrowLeft") { e.preventDefault(); move("left") }
            else if (e.key === "ArrowRight") { e.preventDefault(); move("right") }
            else if (e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "a") {
                e.preventDefault(); pressA()
            }
            else if (e.key === "Escape" || e.key.toLowerCase() === "b") {
                e.preventDefault(); pressB()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [move, pressA, pressB])

    return (
        <div style={pageStyle}>
            <GameBoyShell
                onUp={() => move("up")}
                onDown={() => move("down")}
                onLeft={() => move("left")}
                onRight={() => move("right")}
                onA={pressA}
                onB={pressB}
                onStart={() => console.log("[yellow] START pressed (à implémenter)")}
                onSelect={() => console.log("[yellow] SELECT pressed (à implémenter)")}
            >
                <MapView />
            </GameBoyShell>
        </div>
    )
}

// === STYLES ===

const pageStyle: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
}
