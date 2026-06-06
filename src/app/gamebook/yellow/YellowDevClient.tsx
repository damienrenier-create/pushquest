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
import BattleControls, { BATTLE_CONTROLS_HEIGHT } from "./battle/BattleControls"
import BattleBoundary from "./battle/BattleBoundary"
import { useCasinoPresence } from "@/lib/gamebook/yellow/multiplayer/useCasinoPresence"
import EvolutionScreen from "./battle/EvolutionScreen"
import IntroCinematic from "./IntroCinematic"
import LearnScreen from "./LearnScreen"
import { useGameStore } from "@/lib/gamebook/yellow/store/gameStore"
import { useBattle, useEvolutions, clearEvolutions, useWhiteout, clearWhiteout, useSbireWin, clearSbireWin, dispatchBattleInput, endBattle, getSbireRewardMsg } from "@/lib/gamebook/yellow/store/battleStore"
import { sbireExplanation } from "@/lib/gamebook/yellow/data/sbire"
import { loadYellowSave, initAutosave, persistYellowSave, processSaiyanPoints, resetYellowChapter } from "@/lib/gamebook/yellow/store/saveManager"
import { getPlayer, setTeam, usePlayer, addItem, spendReps, markIntroSeen, superPastaPrice, buySuperPasta, depositToPc, withdrawFromPc, renameDaemon, healTeamMember, allocateStatPoint, teachCt, swapTeam } from "@/lib/gamebook/yellow/store/playerStore"
import { purchasableCts, getCt, canLearnCt } from "@/lib/gamebook/yellow/data/cts"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { maxHpOf, displayName } from "@/lib/gamebook/yellow/battle/engine"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { ITEMS, getItem } from "@/lib/gamebook/yellow/data/items"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { moveCostReps } from "@/lib/gamebook/yellow/data/combatCostConfig"
import { SAIYAN_POINT_VALUE } from "@/lib/gamebook/yellow/data/saiyanConfig"
import { ivTier, ivTotal, ivTierColor } from "@/lib/gamebook/yellow/data/ivConfig"
import { evTotal, topEvStats, EV_TOTAL_CAP } from "@/lib/gamebook/yellow/data/evConfig"
import { fullStats } from "@/lib/gamebook/yellow/battle/stats"
import { expForLevel } from "@/lib/gamebook/yellow/battle/xp"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

export default function YellowDevClient({ userId = "" }: { userId?: string }) {
    const move = useGameStore((s) => s.move)
    const mapPlayer = useGameStore((s) => s.player)
    const pressA = useGameStore((s) => s.pressA)
    const pressB = useGameStore((s) => s.pressB)
    const hydrate = useGameStore((s) => s.hydrate)
    const hydrated = useGameStore((s) => s.hydrated)
    const shopOpen = useGameStore((s) => s.shopOpen)
    const closeShop = useGameStore((s) => s.closeShop)
    const pcOpen = useGameStore((s) => s.pcOpen)
    const closePc = useGameStore((s) => s.closePc)
    const setMap = useGameStore((s) => s.setMap)
    const showDialogue = useGameStore((s) => s.showDialogue)
    const battle = useBattle()
    const evolutions = useEvolutions()
    const whiteout = useWhiteout()
    const sbireWin = useSbireWin()
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
    const [ctShop, setCtShop] = useState(false)
    const [ctPick, setCtPick] = useState<string | null>(null)
    const [confirmReset, setConfirmReset] = useState(false)
    const [swapPick, setSwapPick] = useState<string | null>(null) // uid du Daemon "à déplacer"

    // Multijoueur casino : présence + déplacements temps réel des autres joueurs.
    // Actif uniquement quand on EST dans le casino, hors combat et hors intro.
    const inCasino = mapPlayer.mapId === "yellow_casino"
    const remotePlayers = useCasinoPresence({
        active: inCasino && !battle && !showIntro && !!userId,
        myUserId: userId,
        posX: mapPlayer.posX,
        posY: mapPlayer.posY,
        direction: mapPlayer.direction,
    })

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
            const inB = !!battle
            if (e.key === "ArrowUp") { e.preventDefault(); inB ? dispatchBattleInput("up") : move("up") }
            else if (e.key === "ArrowDown") { e.preventDefault(); inB ? dispatchBattleInput("down") : move("down") }
            else if (e.key === "ArrowLeft") { e.preventDefault(); inB ? dispatchBattleInput("left") : move("left") }
            else if (e.key === "ArrowRight") { e.preventDefault(); inB ? dispatchBattleInput("right") : move("right") }
            else if (e.key === " " || e.key === "Enter" || e.key.toLowerCase() === "a") {
                e.preventDefault(); inB ? dispatchBattleInput("a") : pressA()
            }
            else if (e.key === "Escape" || e.key.toLowerCase() === "b") {
                e.preventDefault(); inB ? dispatchBattleInput("b") : pressB()
            }
        }
        window.addEventListener("keydown", handler)
        return () => window.removeEventListener("keydown", handler)
    }, [move, pressA, pressB, battle])

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

    // Victoire sur le sbire : on délivre une explication sur l'app, une fois le
    // combat quitté ET l'éventuelle cinématique d'évolution terminée.
    useEffect(() => {
        if (sbireWin !== null && !battle && evolutions.length === 0) {
            const reward = getSbireRewardMsg()
            const lines = [...sbireExplanation(sbireWin), ...(reward ? [reward] : [])]
            showDialogue("y_sbire", "SBIRE", lines)
            clearSbireWin()
        }
    }, [sbireWin, battle, evolutions.length, showDialogue])

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

            {/* En COMBAT : plein écran, SANS la coque Game Boy. La coque enfermait
                le combat dans l'écran 3:2 et coupait les menus (cf. retour Sartay).
                Le BattleScreen est entièrement jouable au doigt (boutons d'options
                tactiles) + clavier (dispatchBattleInput), donc pas besoin du D-pad. */}
            {battle ? (
                <div style={battleWrapStyle}>
                    {/* Error boundary : si le combat plante, on propose "Reprendre"
                        (endBattle) au lieu d'obliger un hard refresh. */}
                    <BattleBoundary onReset={() => endBattle()}>
                        <BattleScreen />
                    </BattleBoundary>
                    {/* Boutons (D-pad + A/B) en footer FIXE : ne bougent jamais. */}
                    <BattleControls />
                </div>
            ) : (
                <GameBoyShell
                    reps={player.reps}
                    repsCap={player.repsCap}
                    onUp={() => move("up")}
                    onDown={() => move("down")}
                    onLeft={() => move("left")}
                    onRight={() => move("right")}
                    onA={() => pressA()}
                    onB={() => pressB()}
                    onStart={() => setMenu((m) => (m === "none" ? "pause" : "none"))}
                    onSelect={() => setMenu((m) => (m === "none" ? "pause" : "none"))}
                >
                    <MapView remotePlayers={remotePlayers} />
                </GameBoyShell>
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
                        {confirmReset ? (
                            <>
                                <div style={{ fontSize: 11, color: "#c83030", fontWeight: 700, textAlign: "center" }}>
                                    Effacer TOUTE ta progression du Chapitre 2 ?<br />(équipe, Pokédex, badges, reps — irréversible)
                                </div>
                                <button style={{ ...menuBtnStyle, borderColor: "#c83030", color: "#c83030" }} onClick={() => { resetYellowChapter(); setConfirmReset(false); setMenu("none"); setShowIntro(true) }}>✓ OUI, tout recommencer</button>
                                <button style={menuBtnDimStyle} onClick={() => setConfirmReset(false)}>← Annuler</button>
                            </>
                        ) : (
                            <button style={menuBtnDimStyle} onClick={() => setConfirmReset(true)}>♻️ RECOMMENCER LE CHAPITRE 2</button>
                        )}
                        <button style={menuBtnDimStyle} onClick={() => setMenu("none")}>← FERMER</button>
                    </div>
                </div>
            )}

            {/* Overlay Équipe */}
            {!battle && menu === "team" && (
                <div style={menuOverlayStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>
                    <div style={menuBoxStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={menuTitleStyle}>ÉQUIPE</div>
                        {player.team.length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>Aucun Daemon.</div>}
                        {player.team.map((m) => {
                            const sp = getSpecies(m.speciesId)
                            const max = maxHpOf(m)
                            const pct = Math.max(0, Math.min(100, (m.currentHp / max) * 100))
                            const picked = swapPick === m.uid
                            return (
                                <div key={m.uid} style={{ ...teamRowStyle, alignItems: "center", outline: picked ? "2px solid #e0b020" : "none", borderRadius: picked ? 4 : 0 }}>
                                    {/* Poignée de réordonnancement : 1er tap = "à déplacer", 2e tap (autre) = échange. */}
                                    <button
                                        title={picked ? "Annuler le déplacement" : "Déplacer ce Daemon"}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (!swapPick) { setSwapPick(m.uid); return }
                                            if (swapPick === m.uid) { setSwapPick(null); return }
                                            if (swapTeam(swapPick, m.uid)) { persistYellowSave(); setSwapPick(null) }
                                        }}
                                        style={{ background: picked ? "#e0b020" : "transparent", border: "1px solid #b8941c", color: picked ? "#3a2a00" : "#b8941c", borderRadius: 4, cursor: "pointer", fontSize: 13, padding: "2px 6px", marginRight: 6, lineHeight: 1 }}
                                    >⇅</button>
                                    <span onClick={() => setSelected(m)} title="Voir la fiche" style={{ fontWeight: 700, flex: 1, cursor: "pointer" }}>{displayName(m)}</span>
                                    <span style={{ opacity: 0.6, fontSize: 10 }}>{sp?.types.join("/")}</span>
                                    <span style={{ width: 38, textAlign: "right" }}>N.{m.level}</span>
                                    <span style={{ width: 78, textAlign: "right", color: pct > 50 ? "#2a8a2a" : pct > 20 ? "#b88010" : "#c83030" }}>
                                        {m.currentHp}/{max}{m.status !== "NONE" ? ` ${m.status}` : ""}
                                    </span>
                                </div>
                            )
                        })}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                            {swapPick ? "Touche un autre ⇅ pour échanger les places." : "⇅ pour déplacer · nom pour la fiche."}
                        </div>
                        {player.pc.length > 0 && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>PC : {player.pc.length} Daemon(s) en réserve</div>}
                        <button style={menuBtnDimStyle} onClick={() => { setMenu("pause"); setSwapPick(null) }}>← RETOUR</button>
                    </div>
                </div>
            )}

            {/* PC — boîtes : dépôt/retrait entre l'équipe et la réserve.
                Ouvert via le menu START (menu="pc") OU l'ordinateur du Centre (pcOpen). */}
            {!battle && (menu === "pc" || pcOpen) && (() => {
                const BOX_SIZE = 20
                const boxes = Math.max(1, Math.ceil(player.pc.length / BOX_SIZE))
                const box = Math.min(pcBox, boxes - 1)
                const slice = player.pc.slice(box * BOX_SIZE, box * BOX_SIZE + BOX_SIZE)
                const closePcUi = () => { closePc(); setMenu(menu === "pc" ? "pause" : "none") }
                return (
                    <div style={menuOverlayStyle} onClick={closePcUi}>
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
                            <button style={{ ...menuBtnDimStyle, marginTop: 6 }} onClick={closePcUi}>← RETOUR</button>
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
                                                if (healTeamMember(m.uid, bagItem)) {
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
                        {/* Accès aux Capsules Techniques (CT) */}
                        <button style={menuBtnStyle} onClick={() => { setCtShop(true); setCtPick(null) }}>
                            <span style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>🎓 Capsules CT</span><span>attaques</span>
                            </span>
                        </button>
                        <button style={menuBtnDimStyle} onClick={closeShop}>← QUITTER</button>
                    </div>
                </div>
            )}

            {/* Boutique de CT : acheter une attaque et l'enseigner à un Daemon compatible */}
            {!battle && ctShop && (
                <div style={menuOverlayStyle} onClick={() => { setCtShop(false); setCtPick(null) }}>
                    <div style={{ ...menuBoxStyle, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
                        {ctPick === null ? (
                            <>
                                <div style={{ ...menuTitleStyle, display: "flex", justifyContent: "space-between" }}>
                                    <span>🎓 CAPSULES CT</span><span>⚡ {player.reps}</span>
                                </div>
                                <div style={{ maxHeight: "55vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                                    {purchasableCts(player.badges).map((ct) => {
                                        const mv = getMove(ct.moveId)
                                        const afford = player.reps >= ct.price
                                        return (
                                            <button key={ct.id} style={afford ? menuBtnStyle : menuBtnDimStyle} disabled={!afford} onClick={() => setCtPick(ct.id)}>
                                                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                                    <span>{ct.label} · {mv?.name}<br /><span style={{ fontSize: 10, opacity: 0.6 }}>{mv?.type}{mv && mv.power > 0 ? ` · ${mv.power}` : " · statut"}</span></span>
                                                    <span>{ct.price} reps</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <div style={{ fontSize: 10, opacity: 0.55, marginTop: 4 }}>D'autres CT se débloquent avec les badges d'arène.</div>
                                <button style={menuBtnDimStyle} onClick={() => setCtShop(false)}>← QUITTER</button>
                            </>
                        ) : (() => {
                            const ct = getCt(ctPick)!
                            const mv = getMove(ct.moveId)
                            return (
                                <>
                                    <div style={menuTitleStyle}>{mv?.name} — QUEL DAEMON ?</div>
                                    {player.team.map((m) => {
                                        const sp = getSpecies(m.speciesId)
                                        const compatible = sp ? canLearnCt(sp, ct) : false
                                        const known = m.moves.some((s) => s.moveId === ct.moveId)
                                        const dis = !compatible || known
                                        return (
                                            <button key={m.uid} style={dis ? menuBtnDimStyle : menuBtnStyle} disabled={dis}
                                                onClick={() => {
                                                    const r = teachCt(m.uid, ct.id)
                                                    if (r.ok) { setToast(r.queued ? `${displayName(m)} : choisis une attaque à oublier.` : `${displayName(m)} apprend ${mv?.name} !`); persistYellowSave(); setCtShop(false); setCtPick(null) }
                                                    else if (r.reason === "reps") setToast("Pas assez de reps.")
                                                }}>
                                                <span style={{ display: "flex", justifyContent: "space-between" }}>
                                                    <span>{displayName(m)}{known ? " (déjà apprise)" : compatible ? "" : " (incompatible)"}</span><span>N.{m.level}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                    <button style={menuBtnDimStyle} onClick={() => setCtPick(null)}>← RETOUR</button>
                                </>
                            )
                        })()}
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
                                        void processSaiyanPoints() // convertit le niveau gagné en points Saiyan
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
                            {(() => {
                                const tier = ivTier(live.ivs)
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        Potentiel génétique : <b style={{ color: ivTierColor(tier) }}>{tier === "PARFAIT" ? "★ PARFAIT" : tier}</b>
                                        <span style={{ opacity: 0.5 }}> ({ivTotal(live.ivs)}/75 IV)</span>
                                    </div>
                                )
                            })()}
                            {(() => {
                                const total = evTotal(live.ev)
                                const STAT_FR: Record<string, string> = { hp: "PV", atk: "ATQ", def: "DÉF", spe: "VIT", spc: "SPÉ" }
                                const tops = topEvStats(live.ev).slice(0, 2).map((k) => STAT_FR[k]).join(" / ")
                                return (
                                    <div style={{ fontSize: 11, marginBottom: 6 }}>
                                        Expérience de combat : <b>{total}/{EV_TOTAL_CAP}</b>
                                        {tops ? <span style={{ opacity: 0.5 }}> (surtout {tops})</span> : <span style={{ opacity: 0.5 }}> — pas encore aguerri</span>}
                                    </div>
                                )
                            })()}
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
    alignItems: "center",        // bloc compact centré verticalement → boutons dans la zone du pouce, pas de scroll
    justifyContent: "center",    // centrée horizontalement sur grand écran
    padding: 0,
}

// Combat plein écran (hors coque) : centré, scrollable si le contenu dépasse.
// paddingBottom réserve la place du footer de contrôles FIXE (sinon il masque
// les dernières options).
const battleWrapStyle: React.CSSProperties = {
    width: "100%", maxWidth: 480, margin: "0 auto",
    padding: "14px 12px", boxSizing: "border-box",
    maxHeight: "100dvh", overflowY: "auto",
    paddingBottom: `calc(${BATTLE_CONTROLS_HEIGHT}px + env(safe-area-inset-bottom, 0px) + 16px)`,
}

const menuOverlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9100,
    background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
}
const menuBoxStyle: React.CSSProperties = {
    background: "#f8f8e8", color: "#1c1408", border: "3px solid #1c1408", borderRadius: 10,
    padding: 16, width: "100%", maxWidth: 360, fontFamily: "'Courier New', monospace",
    display: "flex", flexDirection: "column", gap: 8,
    // Mobile : ne jamais dépasser l'écran → scroll interne (boutons toujours atteignables).
    maxHeight: "88dvh", overflowY: "auto",
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

