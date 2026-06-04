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
import LearnScreen from "./LearnScreen"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { useBattle, useEvolutions, clearEvolutions, useWhiteout, clearWhiteout } from "@/lib/gamebook/yellow/store/battleStore"
import { loadYellowSave, initAutosave, persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getPlayer, setTeam, usePlayer, addItem, spendReps, markIntroSeen, resetForIntro, superPastaPrice, buySuperPasta, depositToPc, withdrawFromPc, renameDaemon, useHealItemOnTeam, allocateStatPoint } from "@/lib/gamebook/yellow/store/playerStore"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ITEMS, getItem } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { moveCostReps } from "@/lib/gamebook/yellow/data/combatCostConfig"
import { SAIYAN_POINT_VALUE } from "@/lib/gamebook/yellow/data/saiyanConfig"
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
    const setMap = useGameStore((s) => s.setMap)
    const battle = useBattle()
    const evolutions = useEvolutions()
    const whiteout = useWhiteout()
    const router = useRouter()
    const player = usePlayer()
    const [menu, setMenu] = useState<"none" | "pause" | "team" | "pc" | "bag">("none")
    const [selected, setSelected] = useState<MonInstance | null>(null)
    const [showIntro, setShowIntro] = useState(false)
    const [pastaPick, setPastaPick] = useState(false)
    const [toast, setToast] = useState<string | null>(null)
    const [renaming, setRenaming] = useState(false)
    const [renameText, setRenameText] = useState("")
    const [bagItem, setBagItem] = useState<string | null>(null)
    const [pcBox, setPcBox] = useState(0)

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

    // Toast éphémère : disparaît tout seul après 2,5 s.
    useEffect(() => {
        if (!toast) return
        const t = setTimeout(() => setToast(null), 2500)
        return () => clearTimeout(t)
    }, [toast])

    // Évite un flash à l'écran avant que l'état serveur soit chargé.
    // Si la requête échoue (offline / 403), on affiche quand même le state local.
    void hydrated

    // Équipe entièrement K.O. → renvoi immédiat au Centre Daemon (déjà soignée par
    // le store de combat). On warp dès que le combat est quitté.
    useEffect(() => {
        if (whiteout && !battle) {
            setMap("yellow_infirmary", 4, 3)
            persistYellowSave()
            clearWhiteout()
        }
    }, [whiteout, battle, setMap])

    // Fin d'intro : on accorde le starter choisi (niv 5) + un petit kit de départ,
    // on marque l'intro vue et on persiste.
    const onIntroComplete = (starterId: string) => {
        setTeam([createMonInstance(starterId, 5, { owned: true })])
        addItem("poke_ball", 5)
        // Pas d'argent offert : le portefeuille = reps de la veille (crédité au chargement).
        markIntroSeen()
        setShowIntro(false)
        persistYellowSave()
    }

    return (
        <div style={pageStyle}>
            {showIntro && <IntroCinematic onComplete={onIntroComplete} />}

            <GameBoyShell
                reps={player.reps}
                repsCap={player.repsCap}
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
                        <button style={menuBtnStyle} onClick={() => setMenu("pc")}>📦 PC (BOÎTES)</button>
                        <button style={menuBtnStyle} onClick={() => setMenu("bag")}>🎒 SAC</button>
                        <button style={menuBtnStyle} onClick={() => router.push("/gamebook/yellow/pokedex")}>📷 POKÉDEX</button>
                        <button style={menuBtnDimStyle} onClick={() => { resetForIntro(); persistYellowSave(); setMenu("none"); setShowIntro(true) }}>↺ REJOUER INTRO (dev)</button>
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

            {/* PC — boîtes : dépôt/retrait entre l'équipe et la réserve */}
            {!battle && menu === "pc" && (() => {
                const BOX_SIZE = 20
                const boxes = Math.max(1, Math.ceil(player.pc.length / BOX_SIZE))
                const box = Math.min(pcBox, boxes - 1)
                const slice = player.pc.slice(box * BOX_SIZE, box * BOX_SIZE + BOX_SIZE)
                return (
                    <div style={menuOverlayStyle} onClick={() => setMenu("pause")}>
                        <div style={{ ...menuBoxStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                            <div style={menuTitleStyle}>PC — RANGEMENT</div>
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: "2px 0" }}>ÉQUIPE ({player.team.length}/6)</div>
                            {player.team.map((m) => (
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%" }} onClick={() => setSelected(m)}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{displayName(m)}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>N.{m.level}</span>
                                </button>
                            ))}
                            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, margin: "8px 0 2px", display: "flex", justifyContent: "space-between" }}>
                                <span>BOÎTE {box + 1}/{boxes}</span>
                                <span>
                                    <button style={miniBtn} disabled={box <= 0} onClick={() => setPcBox(box - 1)}>◀</button>
                                    <button style={miniBtn} disabled={box >= boxes - 1} onClick={() => setPcBox(box + 1)}>▶</button>
                                </span>
                            </div>
                            {player.pc.length === 0 && <div style={{ fontSize: 11, opacity: 0.6 }}>Aucun Daemon en réserve.</div>}
                            {slice.map((m) => (
                                <button key={m.uid} style={{ ...teamRowStyle, cursor: "pointer", border: "none", background: "transparent", width: "100%" }} onClick={() => setSelected(m)}>
                                    <span style={{ fontWeight: 700, flex: 1, textAlign: "left" }}>{displayName(m)}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{getSpecies(m.speciesId)?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                </button>
                            ))}
                            <button style={{ ...menuBtnDimStyle, marginTop: 6 }} onClick={() => setMenu("pause")}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* SAC — objets utilisables hors combat (soins) */}
            {!battle && menu === "bag" && (
                <div style={menuOverlayStyle} onClick={() => { setMenu("pause"); setBagItem(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        {bagItem === null ? (
                            <>
                                <div style={menuTitleStyle}>SAC</div>
                                {Object.values(ITEMS).filter((it) => (player.items[it.id] ?? 0) > 0).map((it) => {
                                    const usable = it.category === "HEAL"
                                    return (
                                        <button
                                            key={it.id}
                                            style={usable ? menuBtnStyle : menuBtnDimStyle}
                                            disabled={!usable}
                                            onClick={() => usable && setBagItem(it.id)}
                                        >
                                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>{it.name}{usable ? "" : it.category === "BALL" ? " (en combat)" : ""}</span>
                                                <span>×{player.items[it.id]}</span>
                                            </span>
                                        </button>
                                    )
                                })}
                                {Object.values(ITEMS).filter((it) => (player.items[it.id] ?? 0) > 0).length === 0 && (
                                    <div style={{ fontSize: 11, opacity: 0.6 }}>Sac vide. Va à la boutique !</div>
                                )}
                                <button style={menuBtnDimStyle} onClick={() => setMenu("pause")}>← RETOUR</button>
                            </>
                        ) : (
                            <>
                                <div style={menuTitleStyle}>{getItem(bagItem)?.name} — SUR QUI ?</div>
                                {player.team.map((m) => {
                                    const sp = getSpecies(m.speciesId)
                                    const max = sp ? fullStats(m, sp).hp : m.currentHp
                                    const ko = m.currentHp <= 0
                                    const full = m.currentHp >= max
                                    const dis = ko || full
                                    return (
                                        <button
                                            key={m.uid}
                                            style={dis ? menuBtnDimStyle : menuBtnStyle}
                                            disabled={dis}
                                            onClick={() => {
                                                if (useHealItemOnTeam(m.uid, bagItem)) {
                                                    setToast(`${displayName(m)} récupère des PV !`)
                                                    persistYellowSave()
                                                }
                                                setBagItem(null)
                                            }}
                                        >
                                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                <span>{displayName(m)}{ko ? " (K.O.)" : ""}</span>
                                                <span>{m.currentHp}/{max}</span>
                                            </span>
                                        </button>
                                    )
                                })}
                                <button style={menuBtnDimStyle} onClick={() => setBagItem(null)}>← RETOUR</button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Boutique (vendeur) */}
            {!battle && shopOpen && (
                <div style={menuOverlayStyle} onClick={closeShop}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>BOUTIQUE</span><span>💪 {player.reps}/{player.repsCap} reps</span>
                        </div>
                        {Object.values(ITEMS).filter((it) => it.price > 0).map((it) => {
                            const owned = player.items[it.id] ?? 0
                            const afford = player.reps >= it.price
                            return (
                                <button
                                    key={it.id}
                                    style={afford ? menuBtnStyle : menuBtnDimStyle}
                                    disabled={!afford}
                                    onClick={() => { if (spendReps(it.price)) addItem(it.id, 1) }}
                                >
                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>{it.name}{owned > 0 ? ` (×${owned})` : ""}</span>
                                        <span>{it.price} reps</span>
                                    </span>
                                </button>
                            )
                        })}
                        {/* Super Pasta : +1 niveau, prix dynamique (monte à chaque achat du jour). */}
                        {(() => {
                            const price = superPastaPrice()
                            const afford = player.reps >= price && player.team.length > 0
                            return (
                                <button
                                    style={afford ? { ...menuBtnStyle, borderColor: "#f5d020" } : menuBtnDimStyle}
                                    disabled={!afford}
                                    onClick={() => setPastaPick(true)}
                                    title="Fait gagner 1 niveau à un Daemon de l'équipe"
                                >
                                    <span style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>🍝 Super Pasta (+1 niv.)</span>
                                        <span>{price} reps</span>
                                    </span>
                                </button>
                            )
                        })()}
                        <button style={menuBtnDimStyle} onClick={closeShop}>← QUITTER</button>
                    </div>
                </div>
            )}

            {/* Super Pasta : choix du Daemon à faire monter d'un niveau. */}
            {!battle && pastaPick && (
                <div style={menuOverlayStyle} onClick={() => setPastaPick(false)}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                            <span>🍝 QUEL DAEMON ?</span><span>{superPastaPrice()} reps</span>
                        </div>
                        {player.team.map((m) => (
                            <button
                                key={m.uid}
                                style={m.level >= 100 ? menuBtnDimStyle : menuBtnStyle}
                                disabled={m.level >= 100}
                                onClick={() => {
                                    const r = buySuperPasta(m.uid)
                                    if (r.ok && r.result) {
                                        setToast(`${displayName(m)} monte au niveau ${r.result.toLevel} !`)
                                        setPastaPick(false)
                                    } else if (r.reason === "reps") {
                                        setToast("Pas assez de reps.")
                                    } else if (r.reason === "max") {
                                        setToast(`${displayName(m)} est déjà au niveau max.`)
                                    }
                                }}
                            >
                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span>{displayName(m)}</span><span>N.{m.level}</span>
                                </span>
                            </button>
                        ))}
                        <button style={menuBtnDimStyle} onClick={() => setPastaPick(false)}>← ANNULER</button>
                    </div>
                </div>
            )}

            {/* Toast éphémère (achat, info). */}
            {toast && (
                <div style={toastStyle} onClick={() => setToast(null)}>{toast}</div>
            )}

            {/* Fiche / résumé d'un Daemon (équipe ou PC) + actions */}
            {selected && (() => {
                // Lit la version LIVE depuis le store (à jour après renommage/soin).
                const live = player.team.find((m) => m.uid === selected.uid) ?? player.pc.find((m) => m.uid === selected.uid)
                if (!live) { return null }
                const inTeam = player.team.some((m) => m.uid === live.uid)
                const sp = getSpecies(live.speciesId)
                const stats = sp ? fullStats(live, sp) : null
                const toNext = expForLevel(live.level + 1) - Math.max(live.exp, expForLevel(live.level))
                const closeFiche = () => { setSelected(null); setRenaming(false) }
                return (
                    <div style={menuOverlayStyle} onClick={closeFiche}>
                        <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                            <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                                <span>{displayName(live).toUpperCase()}</span><span>N.{live.level}</span>
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>{sp?.types.join(" / ")} · {sp?.name} · {inTeam ? "Équipe" : "PC"}</div>
                            {stats && (
                                <div style={{ fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", margin: "8px 0" }}>
                                    <span>PV : {live.currentHp}/{stats.hp}</span>
                                    <span>Vitesse : {stats.spe}</span>
                                    <span>Attaque : {stats.atk}</span>
                                    <span>Défense : {stats.def}</span>
                                    <span>Spécial : {stats.spc}</span>
                                    <span>Statut : {live.status === "NONE" ? "—" : live.status}</span>
                                </div>
                            )}
                            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 6 }}>Niveau suivant dans ~{Math.max(0, toNext).toLocaleString("fr-FR")} XP</div>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>ATTAQUES (coût en reps)</div>
                            {live.moves.map((mv) => {
                                const m = getMove(mv.moveId)
                                return (
                                    <div key={mv.moveId} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                                        <span>{m?.name ?? mv.moveId} <span style={{ opacity: 0.55 }}>({m?.type ?? "?"})</span></span>
                                        <span style={{ opacity: 0.7 }}>💪 {moveCostReps(mv.ppMax, live.level)}</span>
                                    </div>
                                )
                            })}

                            {/* ENTRAÎNEMENT SAIYAN : répartition des points de stats */}
                            {(live.statPoints ?? 0) > 0 && (
                                <div style={{ marginTop: 10, padding: 8, border: "2px solid #f5a020", borderRadius: 6, background: "#fff6e6" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                                        🔥 ENTRAÎNEMENT SAIYAN — <span style={{ color: "#e06000" }}>{live.statPoints} pt{(live.statPoints ?? 0) > 1 ? "s" : ""}</span>
                                    </div>
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 4 }}>
                                        {([["hp", "PV"], ["atk", "ATQ"], ["def", "DÉF"], ["spe", "VIT"], ["spc", "SPÉ"]] as const).map(([k, lbl]) => (
                                            <button
                                                key={k}
                                                style={{ ...menuBtnStyle, padding: "8px 2px", textAlign: "center", fontSize: 11 }}
                                                onClick={() => { if (allocateStatPoint(live.uid, k)) { setToast(`+${SAIYAN_POINT_VALUE[k]} ${lbl}`); persistYellowSave() } }}
                                            >
                                                +{lbl}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Renommage */}
                            {renaming ? (
                                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                                    <input
                                        autoFocus
                                        value={renameText}
                                        maxLength={12}
                                        placeholder={sp?.name ?? ""}
                                        onChange={(e) => setRenameText(e.target.value)}
                                        style={{ flex: 1, fontFamily: "inherit", fontSize: 13, padding: "8px 10px", border: "2px solid #1c1408", borderRadius: 6 }}
                                    />
                                    <button style={menuBtnStyle} onClick={() => { renameDaemon(live.uid, renameText); persistYellowSave(); setRenaming(false) }}>OK</button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                                    <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => { setRenameText(live.nickname ?? ""); setRenaming(true) }}>✏️ Renommer</button>
                                    {inTeam ? (
                                        <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => {
                                            const r = depositToPc(live.uid)
                                            if (r.ok) { setToast(`${displayName(live)} déposé au PC.`); persistYellowSave(); closeFiche() }
                                            else if (r.reason === "last") setToast("Tu dois garder au moins 1 Daemon !")
                                        }}>📦 Déposer</button>
                                    ) : (
                                        <button style={{ ...menuBtnStyle, flex: 1 }} onClick={() => {
                                            const r = withdrawFromPc(live.uid)
                                            if (r.ok) { setToast(`${displayName(live)} rejoint l'équipe.`); persistYellowSave(); closeFiche() }
                                            else if (r.reason === "full") setToast("Équipe pleine (6 max).")
                                        }}>➡️ Équipe</button>
                                    )}
                                </div>
                            )}

                            <button style={{ ...menuBtnDimStyle, marginTop: 8 }} onClick={closeFiche}>← RETOUR</button>
                        </div>
                    </div>
                )
            })()}

            {/* Cinématique d'évolution (post-combat, après QUITTER) */}
            {!battle && evolutions.length > 0 && (
                <EvolutionScreen evolutions={evolutions} onDone={clearEvolutions} />
            )}

            {/* Apprentissage d'attaque (4 slots pleins) — après les évolutions */}
            {!battle && !showIntro && evolutions.length === 0 && <LearnScreen />}
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
const miniBtn: React.CSSProperties = {
    background: "#fff", border: "2px solid #1c1408", borderRadius: 5, padding: "2px 8px",
    fontFamily: "inherit", fontWeight: 700, cursor: "pointer", color: "#1c1408", marginLeft: 4,
}
const toastStyle: React.CSSProperties = {
    position: "fixed", left: "50%", bottom: 90, transform: "translateX(-50%)", zIndex: 9300,
    background: "#1c1408", color: "#f5d020", border: "2px solid #f5d020", borderRadius: 8,
    padding: "10px 16px", fontFamily: "'Courier New', monospace", fontSize: 13, fontWeight: 700,
    maxWidth: 320, textAlign: "center", cursor: "pointer",
}

