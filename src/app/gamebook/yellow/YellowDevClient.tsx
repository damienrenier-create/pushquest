"use client"

// Nexus II — page de dev client.
//
// Branche le D-pad du GameBoyShell au store Zustand : chaque pression appelle
// useGameStore.move(direction), qui calcule le nouveau player state via le
// moteur pur tryMove(). Le MapView ré-render automatiquement.
//
// Pas encore : interaction A/B (NPCs, dialogues), START (menu), SELECT.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import GameBoyShell from "./GameBoyShell"
import MapView from "./MapView"
import BattleScreen from "./battle/BattleScreen"
import EvolutionScreen from "./battle/EvolutionScreen"
import IntroCinematic from "./IntroCinematic"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { useBattle, useEvolutions, clearEvolutions } from "@/lib/gamebook/yellow/store/battleStore"
import { loadYellowSave, initAutosave, persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getPlayer, setTeam, usePlayer, addItem, addMoney, spendMoney, markIntroSeen } from "@/lib/gamebook/yellow/store/playerStore"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ITEMS } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

export default function YellowDevClient() {
    const move = useGameStore((s) => s.move)
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)
    const hydrate = useGameStore((s) => s.hydrate)
    const hydrated = useGameStore((s) => s.hydrated)
    const shopOpen = useGameStore((s) => s.shopOpen)
    const closeShop = useGameStore((s) => s.closeShop)
    const battle = useBattle()
    const evolutions = useEvolutions()
    const router = useRouter()
    const player = usePlayer()
    const [menu, setMenu] = useState<"none" | "pause" | "team">("none")
    const [selected, setSelected] = useState<MonInstance | null>(null)
    const [showIntro, setShowIntro] = useState(false)

    // Au mount : charge l'état du joueur depuis le serveur (DB Neon).
    // Si le joueur n'a jamais joué, on garde le state par défaut (déjà set
    // côté store) — l'API renvoie les mêmes defaults dans ce cas.
    useEffect(() => {
        fetch("/api/gamebook/yellow/state")
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (data?.player) hydrate(data.player)
            })
            .catch((e) => console.warn("[yellow] load failed", e))
    }, [hydrate])

    // Charge la sauvegarde de jeu (équipe / Pokédex / objets) + auto-save.
    useEffect(() => {
        let cancelled = false
        ; (async () => {
            await loadYellowSave()
            initAutosave()
            // 1re entrée (intro jamais vue + aucune équipe) → cinématique + choix du starter.
            if (!cancelled && !getPlayer().introSeen && getPlayer().team.length === 0) {
                setShowIntro(true)
            }
        })()
        return () => { cancelled = true }
    }, [])

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

    // Évite un flash à l'écran avant que l'état serveur soit chargé.
    // Si la requête échoue (offline / 403), on affiche quand même le state local.
    void hydrated

    // Fin d'intro : on accorde le starter choisi (niv 5) + un petit kit de départ,
    // on marque l'intro vue et on persiste.
    const onIntroComplete = (starterId: string) => {
        setTeam([createMonInstance(starterId, 5, { owned: true })])
        addItem("poke_ball", 5)
        addMoney(500)
        markIntroSeen()
        setShowIntro(false)
        persistYellowSave()
    }

    return (
        <div style={pageStyle}>
            {showIntro && <IntroCinematic onComplete={onIntroComplete} />}

            <GameBoyShell
                onUp={() => move("up")}
                onDown={() => move("down")}
                onLeft={() => move("left")}
                onRight={() => move("right")}
                onA={pressA}
                onB={pressB}
                onStart={() => setMenu((m) => (m === "none" ? "pause" : "none"))}
                onSelect={() => setMenu((m) => (m === "none" ? "pause" : "none"))}
            >
                <MapView />
            </GameBoyShell>

            {/* Overlay de combat : apparaît quand une rencontre se déclenche dans l'herbe. */}
            {battle && (
                <div style={battleOverlayStyle}>
                    <BattleScreen />
                </div>
            )}

            {/* Menu START (pause) */}
            {!battle && menu === "pause" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("none")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>MENU</div>
                        <button style={menuBtnStyle} onClick={() => setMenu("team")}>🐾 ÉQUIPE</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/pokedex")}>📷 POKÉDEX</button>
                        <button style={menuBtnDimStyle} onClick={() => setMenu("none")}>← FERMER</button>
                    </div>
                </div>
            )}

            {/* Overlay Équipe */}
            {!battle && menu === "team" && (
                <div style={menuOverlayStyle} onClick={() => setMenu("pause")}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>ÉQUIPE</div>
                        {player.team.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>Aucun Daemon.</div>}
                        {player.team.map((m) => {
                            const sp = getSpecies(m.speciesId)
                            const max = maxHpOf(m)
                            const pct = Math.max(0, Math.min(100, (m.currentHp / max) * 100))
                            return (
                                <div key={m.uid} style={{ ...teamRowStyle, cursor: "pointer" }} onClick={() => setSelected(m)} title="Voir la fiche">
                                    <span style={{ fontWeight: 700, flex: 1 }}>{displayName(m)}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{sp?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                    <span style={{ width: 78, textAlign: "right", color: pct > 50 ? "#2a8a2a" : pct > 20 ? "#b88010" : "#c83030" }}>
                                        {m.currentHp}/{max}{m.status !== "NONE" ? ` ${m.status}` : ""}
                                    </span>
                                </div>
                            )
                        })}
                        {player.pc.length > 0 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>PC : {player.pc.length} Daemon(s) en réserve</div>}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("pause")}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* Boutique (vendeur) */}
            {!battle && shopOpen && (
                <div style={menuOverlayStyle} onClick={closeShop}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>BOUTIQUE</span><span>💰 {player.money}</span>
                        </div>
                        {Object.values(ITEMS).filter((it) => it.price > 0).map((it) => {
                            const owned = player.items[it.id] ?? 0
                            const afford = player.money >= it.price
                            return (
                                <button
                                    key={it.id}
                                    style={afford ? menuBtnStyle : menuBtnDimStyle}
                                    disabled={!afford}
                                    onClick={() => { if (spendMoney(it.price)) addItem(it.id, 1) }}
                                >
                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>{it.name}{owned > 0 ? ` (×${owned})` : ""}</span>
                                        <span>{it.price}💰</span>
                                    </span>
                                </button>
                            )
                        })}
                        <button style={menuBtnDimStyle} onClick={closeShop}>← QUITTER</button>
                    </div>
                </div>
            )}

            {/* Fiche / résumé d'un Daemon (depuis l'Équipe) */}
            {selected && (() => {
                const sp = getSpecies(selected.speciesId)
                const stats = sp ? fullStats(selected, sp) : null
                const toNext = expForLevel(selected.level + 1) - Math.max(selected.exp, expForLevel(selected.level))
                return (
                    <div style={menuOverlayStyle} onClick={() => setSelected(null)}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                                <span>{displayName(selected).toUpperCase()}</span><span>N.{selected.level}</span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>{sp?.types.join(" / ")} · {sp?.name}</div>
                            {stats && (
                                <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", margin: "8px 0" }}>
                                    <span>PV : {selected.currentHp}/{stats.hp}</span>
                                    <span>Vitesse : {stats.spe}</span>
                                    <span>Attaque : {stats.atk}</span>
                                    <span>Défense : {stats.def}</span>
                                    <span>Spécial : {stats.spc}</span>
                                    <span>Statut : {selected.status === "NONE" ? "—" : selected.status}</span>
                                </div>
                            )}
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>Niveau suivant dans ~{Math.max(0, toNext).toLocaleString("fr-FR")} XP</div>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>ATTAQUES</div>
                            {selected.moves.map((mv) => {
                                const m = getMove(mv.moveId)
                                return (
                                    <div key={mv.moveId} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                        <span>{m?.name ?? mv.moveId} <span style={{ opacity: 0.55 }}>({m?.type ?? "?"})</span></span>
                                        <span style={{ opacity: 0.7 }}>{mv.pp}/{mv.ppMax} PP</span>
                                    </div>
                                )
                            })}
                            <button style={{ ...menuBtnDimStyle, marginTop: 8 }} onClick={() => setSelected(null)}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* Cinématique d'évolution (post-combat, après QUITTER) */}
            {!battle && evolutions.length > 0 && (
                <EvolutionScreen evolutions={evolutions} onDone={clearEvolutions} />
            )}
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

const battleOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "#1a1a1a",
    zIndex: 9000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
}

const menuOverlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9100,
    background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
}
const menuBoxStyle: React.CSSProperties = {
    background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 10,
    padding: 16, width: "100%", maxWidth: 360, fontFamily: "'Courier New', monospace",
    display: "flex", flexDirection: "column", gap: 8,
}
const menuTitleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }
const menuBtnStyle: React.CSSProperties = {
    background: "#fff", border: "2px solid #1c1408", borderRadius: 6, padding: "12px 14px",
    fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", textAlign: "left", color: "#1c1408",
}
const menuBtnDimStyle: React.CSSProperties = { ...menuBtnStyle, background: "#e0e0d0", border: "2px solid #888", color: "#555" }
const teamRowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 0", borderBottom: "1px solid #00000018",
}

