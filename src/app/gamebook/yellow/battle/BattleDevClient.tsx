"use client"

// Nexus Jaune Éclair — harnais de DEV pour tester le moteur de combat en conditions réelles.
// Construit une équipe joueur + un sauvage, lance un combat, et affiche BattleScreen.

import { useBattle, startWildBattle, endBattle } from "@/lib/gamebook/yellow/store/battleStore"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import BattleScreen from "./BattleScreen"

function launch() {
    const playerTeam = [
        createMonInstance("flordaemon", 16, { owned: true, nickname: "Flora" }),
        createMonInstance("galet", 14, { owned: true }),
    ]
    const wild = [createMonInstance("rongeur", 5)]
    const seed = (typeof performance !== "undefined" ? Math.floor(performance.now()) : 12345) ^ Math.floor(Math.random() * 1e9)
    startWildBattle(playerTeam, wild, seed >>> 0)
}

export default function BattleDevClient() {
    const battle = useBattle()

    return (
        <div style={{ minHeight: "100dvh", background: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
            {battle ? (
                <BattleScreen />
            ) : (
                <div style={{ textAlign: "center", color: "#f8f8e8", fontFamily: "'Courier New', monospace" }}>
                    <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>⚡ COMBAT — TEST</h1>
                    <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 20 }}>Flordaemon N.16 + Galet N.14 vs Rongeur sauvage N.5</p>
                    <button
                        onClick={launch}
                        style={{ background: "#f5d020", border: "3px solid #f8f8e8", borderRadius: 8, padding: "14px 26px", fontFamily: "inherit", fontSize: 15, fontWeight: 900, letterSpacing: 1, cursor: "pointer", color: "#1c1408" }}
                    >
                        LANCER UN COMBAT
                    </button>
                </div>
            )}
            {battle && (
                <button
                    onClick={() => endBattle()}
                    style={{ background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "6px 14px", color: "#888", fontFamily: "'Courier New', monospace", fontSize: 11, cursor: "pointer" }}
                >
                    abandonner (dev)
                </button>
            )}
        </div>
    )
}
