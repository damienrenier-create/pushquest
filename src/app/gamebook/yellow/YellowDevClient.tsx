"use client"

// Nexus II — page de dev client qui rend GameBoyShell avec un contenu
// placeholder dans l'écran. Sert juste à valider visuellement la coque.

import { useState } from "react"
import GameBoyShell from "./GameBoyShell"

export default function YellowDevClient() {
    const [lastPressed, setLastPressed] = useState<string>("—")

    return (
        <div style={pageStyle}>
            <GameBoyShell
                onUp={() => setLastPressed("▲ UP")}
                onDown={() => setLastPressed("▼ DOWN")}
                onLeft={() => setLastPressed("◀ LEFT")}
                onRight={() => setLastPressed("▶ RIGHT")}
                onA={() => setLastPressed("A")}
                onB={() => setLastPressed("B")}
                onStart={() => setLastPressed("START")}
                onSelect={() => setLastPressed("SELECT")}
            >
                <ScreenPlaceholder lastPressed={lastPressed} />
            </GameBoyShell>
        </div>
    )
}

function ScreenPlaceholder({ lastPressed }: { lastPressed: string }) {
    return (
        <div style={screenContentStyle}>
            <div style={titleStyle}>NEXUS II</div>
            <div style={subtitleStyle}>JAUNE ÉCLAIR</div>
            <div style={dividerStyle} />
            <div style={statusLineStyle}>
                <span style={{ opacity: 0.7 }}>SCAFFOLDING</span>
            </div>
            <div style={statusLineStyle}>
                <span style={{ opacity: 0.7 }}>v0.1 — DEV</span>
            </div>
            <div style={dividerStyle} />
            <div style={pressLabelStyle}>DERNIÈRE TOUCHE</div>
            <div style={pressValueStyle}>{lastPressed}</div>
        </div>
    )
}

// === STYLES ===

const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
}

const screenContentStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    color: "#0f380f",
    fontFamily: "'Courier New', monospace",
    textAlign: "center",
}

const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
}

const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: 3,
    opacity: 0.8,
}

const dividerStyle: React.CSSProperties = {
    width: "70%",
    height: 1,
    background: "#0f380f",
    opacity: 0.4,
    margin: "6px 0",
}

const statusLineStyle: React.CSSProperties = {
    fontSize: 9,
    letterSpacing: 1,
}

const pressLabelStyle: React.CSSProperties = {
    fontSize: 8,
    letterSpacing: 2,
    opacity: 0.6,
    marginTop: 4,
}

const pressValueStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
    marginTop: 2,
}
