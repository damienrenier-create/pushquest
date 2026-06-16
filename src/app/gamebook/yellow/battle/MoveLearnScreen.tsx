"use client"

// Prompt post-combat d'APPRENTISSAGE d'attaque (façon Gen 1) : quand un Daemon a appris une attaque
// alors que ses 4 slots étaient pleins, on lui propose ici d'en oublier une — ou de renoncer.
// Traite la file des `pendingMoves` de l'équipe, un Daemon/une attaque à la fois (resolveLearn).

import { useEffect } from "react"
import { usePlayer, resolveLearn } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"

export default function MoveLearnScreen({ onDone }: { onDone: () => void }) {
    const player = usePlayer()
    // Premier Daemon avec une attaque en attente.
    const mon = player.team.find((m) => (m.pendingMoves?.length ?? 0) > 0)
    const moveId = mon?.pendingMoves?.[0]

    // Plus rien à apprendre → on ferme (hors render pour éviter un setState pendant le rendu).
    useEffect(() => { if (!mon || !moveId) onDone() }, [mon, moveId, onDone])
    if (!mon || !moveId) return null

    const newMove = getMove(moveId)
    const name = mon.nickname ?? getSpecies(mon.speciesId)?.name ?? mon.speciesId
    const learn = (slot: number | null) => { resolveLearn(mon.uid, moveId, slot); persistYellowSave() }

    return (
        <div style={overlay}>
            <div style={box}>
                <div style={title}>{name} veut apprendre <b style={{ color: "#f5d020" }}>{newMove?.name ?? moveId}</b> !</div>
                <div style={sub}>
                    {newMove ? `${newMove.type} · puiss. ${newMove.power || "—"} · ${newMove.pp} PP` : ""}
                </div>
                <div style={sub}>Mais il connaît déjà 4 capacités. Laquelle oublier ?</div>
                <div style={list}>
                    {mon.moves.map((m, i) => {
                        const mv = getMove(m.moveId)
                        return (
                            <button key={i} style={moveBtn} onClick={() => learn(i)}>
                                <b>{mv?.name ?? m.moveId}</b>
                                <span style={meta}>{mv?.type}{mv?.power ? ` · ${mv.power}` : ""}</span>
                            </button>
                        )
                    })}
                </div>
                <button style={giveUpBtn} onClick={() => learn(null)}>✋ Renoncer à {newMove?.name ?? moveId}</button>
                <button style={laterBtn} onClick={onDone}>Plus tard ▶ (revoir dans la fiche)</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, zIndex: 9200, background: "rgba(8,6,16,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16, fontFamily: "'Courier New', monospace", color: "#f8f8e8",
}
const box: React.CSSProperties = {
    width: "min(420px, 96vw)", background: "rgba(20,16,40,0.96)", border: "3px solid #f5d020", borderRadius: 14, padding: "18px 16px", textAlign: "center",
}
const title: React.CSSProperties = { fontSize: 16, fontWeight: 800, marginBottom: 4 }
const sub: React.CSSProperties = { fontSize: 12, opacity: 0.8, marginBottom: 8 }
const list: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, margin: "10px 0" }
const moveBtn: React.CSSProperties = {
    display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", fontFamily: "inherit", fontSize: 13,
    color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, cursor: "pointer",
}
const meta: React.CSSProperties = { fontSize: 10, opacity: 0.6 }
const giveUpBtn: React.CSSProperties = {
    width: "100%", marginTop: 4, padding: "9px", fontFamily: "inherit", fontSize: 12, fontWeight: 700, color: "#1a1400",
    background: "#f5d020", border: "none", borderRadius: 8, cursor: "pointer",
}
const laterBtn: React.CSSProperties = {
    width: "100%", marginTop: 8, padding: "8px", fontFamily: "inherit", fontSize: 11, color: "#fff",
    background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer",
}
