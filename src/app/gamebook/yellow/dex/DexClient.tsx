"use client"

// Nexus Jaune Éclair — DEX de L'ARCHIVISTE (Collectionneur). Offert à sa 1re défaite (bouton menu gated).
//   Au départ VIDE (seule la table des types) ; une LIGNE apparaît à chaque Daemon RENCONTRÉ ce run (seenThisRun,
//   scoping strict par run → un joueur run 1 ne voit QUE des lignes run 1). La FICHE liée reste VERROUILLÉE 🔒
//   tant qu'on n'a pas (re)battu L'Archiviste (fichesUnlockedThisRun). Style natif GBC (cohérent avec /pokedex).

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { getSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { usePlayer, galijahCountdown } from "@/lib/gamebook/yellow/store/playerStore"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { POKE_TYPES, type PokeType, type SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import { TYPE_COLORS, baseStatTotal, maskedBst, galijahCounterStyle } from "./dexShared"

// Vignette : sprite PNG, repli sur l'initiale si le fichier manque. `secret` = ULTRA-SECRET non capturé → on ne
// montre que l'OMBRE NOIRE du sprite (silhouette, brightness(0)) pour ne pas révéler l'identité.
function DexIcon({ sp, secret }: { sp: SpeciesData; secret?: boolean }) {
    const [err, setErr] = useState(false)
    return (
        <div style={S.icon}>
            {err ? (secret ? "?" : sp.name[0]) : (
                <img src={sp.sprite} alt={secret ? "?" : sp.name} onError={() => setErr(true)}
                    style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated", ...(secret ? { filter: "brightness(0)" } : {}) }} />
            )}
        </div>
    )
}

export default function DexClient() {
    const router = useRouter()
    const dex = usePokedex()
    const player = usePlayer()
    const [query, setQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<PokeType | null>(null)
    // Hydrate la save (idempotent) : sinon seenThisRun en mémoire est vide → dex apparaît vide au refresh direct.
    useEffect(() => { void loadYellowSave() }, [])

    // LIGNES = espèces VUES ce run (seenThisRun) → scoping strict par run, natif (plus de tiérage run3Used/cumulatif).
    const seen = useMemo<SpeciesData[]>(
        () => player.seenThisRun.map((id) => getSpecies(id)).filter((s): s is SpeciesData => !!s),
        [player.seenThisRun],
    )
    const unlocked = useMemo(() => new Set(player.fichesUnlockedThisRun), [player.fichesUnlockedThisRun])
    const lockedCount = useMemo(() => seen.reduce((n, sp) => n + (unlocked.has(sp.id) ? 0 : 1), 0), [seen, unlocked])

    const entries = useMemo(() => {
        const q = query.trim().toLowerCase()
        return seen
            .filter((sp) => {
                const secret = DEX_ULTRA_SECRET.has(sp.id) && !dex.caught.includes(sp.id)
                // ANTI-LEAK : un ultra-secret non capturé n'apparaît JAMAIS via un filtre de type, et n'est trouvable
                // en recherche que par son NUMÉRO (jamais par son nom).
                if (typeFilter && (secret || !sp.types.includes(typeFilter))) return false
                if (q) {
                    if (secret) { if (!String(sp.dexNo).includes(q)) return false }
                    else if (!sp.name.toLowerCase().includes(q) && !String(sp.dexNo).includes(q)) return false
                }
                return true
            })
            .sort((a, b) => a.dexNo - b.dexNo)
    }, [query, typeFilter, seen, dex.caught])

    return (
        <div style={S.root}>
            <div style={S.header}>
                <div style={S.topRow}>
                    <button onClick={() => router.push("/gamebook/yellow")} style={S.back}>← Retour</button>
                    <button onClick={() => router.push("/gamebook/yellow/dex/types")} style={S.chartBtn}>📊 Table des types</button>
                </div>
                <h1 style={S.title}>📖 DEX NEXUS</h1>
                <div style={S.sub}>{entries.length} / {seen.length} espèces vues{lockedCount > 0 ? ` · 🔒 ${lockedCount} fiche(s) verrouillée(s)` : ""}</div>

                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un Daemon…"
                    style={S.search}
                />

                <div style={S.filterRow}>
                    <button
                        onClick={() => setTypeFilter(null)}
                        style={{ ...S.filterChip, ...(typeFilter === null ? S.filterChipOn : {}), background: typeFilter === null ? "#f5d020" : "#404040", color: typeFilter === null ? "#1c1408" : "#c8c8c8" }}
                    >TOUS</button>
                    {POKE_TYPES.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter((cur) => (cur === t ? null : t))}
                            style={{ ...S.filterChip, background: TYPE_COLORS[t], opacity: typeFilter === null || typeFilter === t ? 1 : 0.4 }}
                        >{t}</button>
                    ))}
                </div>
            </div>

            <div style={S.list}>
                {entries.map((sp) => {
                    // ULTRA-SECRET non capturé : tout masqué (ombre, nom/types « ??? », BST « 5XX »). Galijah : décompte énigmatique.
                    const secret = DEX_ULTRA_SECRET.has(sp.id) && !dex.caught.includes(sp.id)
                    const galijahRem = secret && sp.id === "galijah" ? galijahCountdown(dex.caught.length) : null
                    // FICHE verrouillée : la LIGNE apparaît (on a vu le Daemon) mais le détail est bloqué tant que L'Archiviste
                    //   n'a pas été (re)battu. On garde le clic → la page détail affiche l'écran « fiche verrouillée ».
                    const locked = !unlocked.has(sp.id)
                    return (
                        <button
                            key={sp.id}
                            onClick={() => router.push(`/gamebook/yellow/dex/${sp.id}`)}
                            style={{ ...S.card, ...(locked && !secret ? S.cardLocked : {}) }}
                            title={locked ? "Fiche verrouillée — bats L'Archiviste pour l'ouvrir" : sp.name}
                        >
                            <div style={S.no}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                            <DexIcon sp={sp} secret={secret} />
                            <div style={S.body}>
                                <div style={S.name}>{secret ? "???" : sp.name.toUpperCase()}</div>
                                <div style={S.chips}>{secret
                                    ? sp.types.map((_t, i) => <span key={i} style={{ ...S.chip, background: "#555" }}>???</span>)
                                    : sp.types.map((t) => <span key={t} style={{ ...S.chip, background: TYPE_COLORS[t] }}>{t}</span>)}</div>
                            </div>
                            <div style={S.bst}>
                                {galijahRem !== null
                                    ? <div style={galijahCounterStyle(galijahRem)}>{galijahRem}</div>
                                    : locked && !secret
                                        ? <div style={S.lock}>🔒</div>
                                        : <><div style={S.bstNum}>{secret ? maskedBst(baseStatTotal(sp.baseStats)) : baseStatTotal(sp.baseStats)}</div><div style={S.bstLbl}>BST</div></>}
                            </div>
                        </button>
                    )
                })}
                {seen.length === 0 && <div style={S.empty}>Ton dex est vide. Rencontre des Daemons pour les répertorier, puis bats L'Archiviste pour ouvrir leurs fiches !</div>}
                {seen.length > 0 && entries.length === 0 && <div style={S.empty}>Aucun Daemon ne correspond.</div>}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    root: { minHeight: "100dvh", background: "#1a1a1a", color: "#f8f8e8", fontFamily: "'Courier New', monospace", padding: 16 },
    header: { maxWidth: 560, margin: "0 auto 16px" },
    topRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 },
    back: { background: "transparent", border: "1px solid #555", borderRadius: 6, padding: "5px 12px", color: "#c8c8c8", fontFamily: "'Courier New', monospace", fontSize: 12, cursor: "pointer" },
    chartBtn: { background: "#f5d020", border: "2px solid #000", borderRadius: 6, padding: "5px 12px", color: "#1c1408", fontFamily: "'Courier New', monospace", fontSize: 12, fontWeight: 700, cursor: "pointer" },
    title: { fontSize: 18, fontWeight: 900, letterSpacing: 2, marginBottom: 4 },
    sub: { fontSize: 11, opacity: 0.7, marginBottom: 10 },
    search: { width: "100%", boxSizing: "border-box", background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 8, padding: "8px 12px", fontFamily: "'Courier New', monospace", fontSize: 13, marginBottom: 10 },
    filterRow: { display: "flex", flexWrap: "wrap", gap: 5 },
    filterChip: { border: "1px solid #000", borderRadius: 5, padding: "3px 7px", fontSize: 9, fontWeight: 700, color: "#1c1408", cursor: "pointer", fontFamily: "'Courier New', monospace", letterSpacing: 0.5 },
    filterChipOn: {},
    list: { maxWidth: 560, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 },
    card: { display: "flex", alignItems: "center", gap: 12, background: "#f8f8e8", color: "#1c1408", border: "2px solid #000", borderRadius: 8, padding: "8px 12px", cursor: "pointer", textAlign: "left", width: "100%", fontFamily: "'Courier New', monospace" },
    cardLocked: { opacity: 0.62, borderColor: "#7a7a7a", background: "#e6e4d6" },
    no: { fontSize: 10, fontWeight: 700, opacity: 0.6, width: 38 },
    icon: { width: 44, height: 44, borderRadius: "50%", background: "#fff", border: "2px solid #1c1408", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, flexShrink: 0 },
    body: { flex: 1, minWidth: 0 },
    name: { fontSize: 13, fontWeight: 900, letterSpacing: 1 },
    chips: { display: "flex", gap: 4, marginTop: 3 },
    chip: { fontSize: 8, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5, textShadow: "0 1px 1px rgba(0,0,0,0.4)" },
    bst: { textAlign: "center", flexShrink: 0 },
    bstNum: { fontSize: 15, fontWeight: 900 },
    bstLbl: { fontSize: 8, opacity: 0.6, fontWeight: 700 },
    lock: { fontSize: 18 },
    empty: { textAlign: "center", opacity: 0.6, fontSize: 12, padding: 24, lineHeight: 1.5 },
}
