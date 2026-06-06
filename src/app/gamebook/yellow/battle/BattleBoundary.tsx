"use client"

// Nexus Jaune Éclair — error boundary autour de l'écran de combat.
//
// Si le rendu du combat lève une exception (état corrompu, etc.), au lieu de
// figer l'app (et d'obliger un hard refresh), on affiche un écran de secours
// avec un bouton "Reprendre" qui quitte proprement le combat (onReset →
// endBattle côté parent) et réinitialise la boundary.

import { Component, type ReactNode } from "react"

interface Props {
    children: ReactNode
    /** Appelé quand l'utilisateur clique "Reprendre" (typiquement endBattle()). */
    onReset: () => void
}
interface State {
    hasError: boolean
}

export default class BattleBoundary extends Component<Props, State> {
    state: State = { hasError: false }

    static getDerivedStateFromError(): State {
        return { hasError: true }
    }

    componentDidCatch(error: unknown) {
        // Trace en console pour le debug (pas de télémétrie ici).
        console.error("[yellow] combat planté :", error)
    }

    handleReset = () => {
        this.setState({ hasError: false })
        this.props.onReset()
    }

    render() {
        if (!this.state.hasError) return this.props.children
        return (
            <div style={boxStyle}>
                <div style={titleStyle}>Le combat a rencontré un pépin.</div>
                <p style={textStyle}>Pas de panique, ta progression est sauvegardée. Tu peux reprendre.</p>
                <button style={btnStyle} onClick={this.handleReset}>↩︎ Reprendre</button>
            </div>
        )
    }
}

const boxStyle: React.CSSProperties = {
    maxWidth: 440, margin: "0 auto", padding: 20, textAlign: "center",
    fontFamily: "'Courier New', monospace", color: "#1c1408",
    background: "#f8f8e8", border: "3px solid #1c1408", borderRadius: 10,
}
const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 900, marginBottom: 8 }
const textStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, margin: "0 0 14px" }
const btnStyle: React.CSSProperties = {
    background: "#f5d020", border: "3px solid #1c1408", borderRadius: 8,
    padding: "12px 18px", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "#1c1408",
}
