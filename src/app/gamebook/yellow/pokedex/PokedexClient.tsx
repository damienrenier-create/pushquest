"use client"

// Nexus Jaune Éclair — écran Pokédex. Lit le store Pokédex (seen/caught) + les
// espèces. N'exécute aucune règle : pur affichage synchronisé.

import { useRouter } from "next/navigation"
import { usePokedex, pokedexCompletion } from "@/lib/gamebook/yellow/store/pokedexStore"
import { SPECIES } from "@/lib/gamebook/yellow/data/species"

export default function PokedexClient() {
    const router = useRouter()
    const dex = usePokedex()
    const comp = pokedexCompletion()
    const entries = Object.values(SPECIES).sort((a, b) => a.dexNo - b.dexNo)

    return (
        <div style={S.root}>
            <div style={S.header}>
                <button onClick={() => router.back()} style={S.back}>← Retour</button>
                <h1 style={S.title}>📷 POKÉDEX NEXUS</h1>
                <div style={S.compRow}>
                    <span style={S.compTxt}>{comp.caught}/{comp.total} capturés — {comp.pct}%</span>
                    <div style={S.compTrack}><div style={{ ...S.compFill, width: `${comp.pct}%` }} /></div>
                </div>
            </div>

            <div style={S.list}>
                {entries.map((sp) => {
                    const caught = dex.caught.includes(sp.id)
                    const seen = caught || dex.seen.includes(sp.id)
                    return (
                        <div key={sp.id} style={{ ...S.card, opacity: seen ? 1 : 0.5 }}>
                            <div style={S.no}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                            <div style={{ ...S.icon, filter: caught ? "none" : "grayscale(1) brightness(0.6)" }}>
                                {seen ? sp.name[0] : "?"}
                            </div>
                            <div style={S.body}>
                                <div style={S.name}>{seen ? sp.name.toUpperCase() : "???"}</div>
                                {seen && (
                                    <div style={S.types}>{sp.types.join(" / ")}</div>
                                )}
                                {caught ? (
                                    <div style={S.desc}>{sp.description}</div>
                                ) : (
                                    <div style={S.state}>{seen ? "VU" : "Inconnu"}</div>
                                )}
                            </div>
                            <div style={S.tag}>{caught ? "✔ CAPTURÉ" : seen ? "👁 VU" : ""}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#1a1a1a", color: "#f8f8e8", fontFamily: "'Courier New', monospace", padding: 16 },
    header: { maxWidth: 560, margin: "0 auto 16px" },
    back: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "5px 12px", color: "#c8c8c8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer", marginBottom: 10 },
    title: { fontSize: 18, fontWeight: 900, letterSpacing: 2, marginBottom: 8 },
    compRow: { display: "flex", flexDirection: "column", gap: 4 },
    compTxt: { fontSize: 12, opacity: 0.85 },
    compTrack: { height: 8, background: "#404040", borderRadius: 4, overflow: "hidden", border: "1px solid #000" },
    compFill: { height: "100%", background: "#f5d020", transition: "width 0.4s" },
    list: { maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 },
    card: { display: "flex", alignItems: "center", gap: 12, background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 8, padding: "8px 12px" },
    no: { fontSize: 10, fontWeight: 700, opacity: 0.6, width: 38 },
    icon: { width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "2px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, flexShrink: 0 },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 13, fontWeight: 900, letterSpacing: 1 },
    types: { fontSize: 9, fontWeight: 700, color: "#8868c0", marginTop: 1 },
    desc: { fontSize: 9, opacity: 0.7, marginTop: 2, lineHeight: 1.3 },
    state: { fontSize: 9, opacity: 0.6, marginTop: 2, fontStyle: "italic" },
    tag: { fontSize: 8, fontWeight: 700, whiteSpace: "nowrap" },
}
