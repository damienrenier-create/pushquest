"use client"

// Nexus Jaune Éclair — DEX de L'ARCHIVISTE (Collectionneur). Offert à sa 1re défaite (bouton menu gated).
//   Au départ VIDE (seule la table des types) ; une LIGNE apparaît à chaque Daemon RENCONTRÉ ce run (seenThisRun,
//   scoping strict par run → un joueur run 1 ne voit QUE des lignes run 1). La FICHE liée reste VERROUILLÉE 🔒
//   tant qu'on n'a pas (re)battu L'Archiviste (fichesUnlockedThisRun). Style natif GBC (cohérent avec /pokedex).

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { visibleDexSpecies, DEX_ULTRA_SECRET } from "@/lib/gamebook/yellow/data/species"
import { usePokedex } from "@/lib/gamebook/yellow/store/pokedexStore"
import { usePlayer, useActiveWorld, galijahCountdown } from "@/lib/gamebook/yellow/store/playerStore"
import { loadYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { POKE_TYPES, type PokeType, type SpeciesData } from "@/lib/gamebook/yellow/battle/types"
import { TYPE_COLORS, baseStatTotal, maskedBst, galijahCounterStyle } from "./dexShared"

// Vignette. `secret` (non rencontré / ultra-secret) → SILHOUETTE : bloc noir CSS PUR, on ne TÉLÉCHARGE PAS le PNG
//   (identité masquée de toute façon → perf : un catalogue de 150+ entrées ne fetch plus des dizaines de Mo de PNG).
//   Les sprites RÉVÉLÉS sont chargés en `loading="lazy"` (seuls ceux à l'écran partent au réseau).
function DexIcon({ sp, secret }: { sp: SpeciesData; secret?: boolean }) {
    const [err, setErr] = useState(false)
    if (secret) return <div style={S.icon}><div style={{ width: "72%", height: "72%", borderRadius: 8, background: "#131313", display: "flex", alignItems: "center", justifyContent: "center", color: "#3a3a3a", fontSize: 18, fontWeight: 900 }} aria-hidden>?</div></div>
    return (
        <div style={S.icon}>
            {err ? sp.name[0] : (
                <img src={sp.sprite} alt={sp.name} onError={() => setErr(true)} loading="lazy" decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            )}
        </div>
    )
}

export default function DexClient() {
    const router = useRouter()
    const dex = usePokedex()
    const player = usePlayer()
    const aw = useActiveWorld()
    const isRun2 = aw === "ngplus", isRun3 = aw === "run3"
    const [query, setQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<PokeType | null>(null)
    // Hydrate la save (idempotent) : sinon seenThisRun en mémoire est vide → dex apparaît vide au refresh direct.
    useEffect(() => { void loadYellowSave() }, [])

    // « RENCONTRÉ ce run » = capturé (Pokédex cumulatif) OU vu ce run (seenThisRun) OU run 3 (catalogue 100% révélé,
    //   hors ultra-secrets). Un Daemon rencontré est CLIQUABLE ; un non-rencontré = SILHOUETTE noire non-cliquable.
    const caughtSet = useMemo(() => new Set(dex.caught), [dex.caught])
    const seenSet = useMemo(() => new Set(player.seenThisRun), [player.seenThisRun])
    const revealed = useMemo(
        () => (sp: SpeciesData) => caughtSet.has(sp.id) || seenSet.has(sp.id) || (isRun3 && !DEX_ULTRA_SECRET.has(sp.id)),
        [caughtSet, seenSet, isRun3],
    )

    // CATALOGUE = TOUT le roster VISIBLE du run (tiéré par run via visibleDexSpecies) → les non-rencontrés apparaissent
    //   en SILHOUETTE. On EXCLUT du catalogue les surprises encore secrètes : hiddenUntilCaught (clan, Gékroc, Goshendofy…)
    //   et légendaires ultra-secrets NON rencontrés → pas même une silhouette (anti-spoiler), sauf run 3 (tout révélé).
    const roster = useMemo<SpeciesData[]>(
        () => visibleDexSpecies(dex.caught, player.isChampion, isRun2, isRun3, isRun3, player.seenThisRun)
            .filter((sp) => revealed(sp) || (!sp.hiddenUntilCaught && !DEX_ULTRA_SECRET.has(sp.id)))
            .sort((a, b) => a.dexNo - b.dexNo),
        [dex.caught, player.isChampion, player.seenThisRun, isRun2, isRun3, revealed],
    )
    const unlocked = useMemo(() => new Set(player.fichesUnlockedThisRun), [player.fichesUnlockedThisRun])
    const encounteredCount = useMemo(() => roster.reduce((n, sp) => n + (revealed(sp) ? 1 : 0), 0), [roster, revealed])

    const entries = useMemo(() => {
        const q = query.trim().toLowerCase()
        return roster.filter((sp) => {
            const enc = revealed(sp)
            // ANTI-LEAK : une SILHOUETTE (non rencontrée) n'apparaît JAMAIS via un filtre de type, et n'est trouvable
            //   en recherche que par son NUMÉRO (jamais par son nom).
            if (typeFilter && (!enc || !sp.types.includes(typeFilter))) return false
            if (q) {
                if (!enc) { if (!String(sp.dexNo).includes(q)) return false }
                else if (!sp.name.toLowerCase().includes(q) && !String(sp.dexNo).includes(q)) return false
            }
            return true
        })
    }, [query, typeFilter, roster, revealed])

    return (
        <div style={S.root}>
            <div style={S.header}>
                <div style={S.topRow}>
                    <button onClick={() => router.push("/gamebook/yellow")} style={S.back}>← Retour</button>
                    <button onClick={() => router.push("/gamebook/yellow/dex/types")} style={S.chartBtn}>📊 Table des types</button>
                </div>
                <h1 style={S.title}>📖 DEX NEXUS</h1>
                <div style={S.sub}>{encounteredCount} / {roster.length} rencontrées ce run · les autres restent en silhouette 🕳️</div>

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
                    const enc = revealed(sp)
                    // NON RENCONTRÉ ce run → SILHOUETTE noire, NON CLIQUABLE (« ??? », BST masqué). On sait juste
                    //   qu'il existe (numéro), rien d'autre. C'est le catalogue complet du run, façon Pokédex à trous.
                    if (!enc) {
                        return (
                            <div key={sp.id} style={{ ...S.card, ...S.cardSilhouette, cursor: "default" }} title="Pas encore rencontré ce run">
                                <div style={S.no}>N°{String(sp.dexNo).padStart(3, "0")}</div>
                                <DexIcon sp={sp} secret />
                                <div style={S.body}>
                                    <div style={S.name}>???</div>
                                    <div style={S.chips}>{sp.types.map((_t, i) => <span key={i} style={{ ...S.chip, background: "#555" }}>???</span>)}</div>
                                </div>
                                <div style={S.bst}><div style={S.bstNum}>{maskedBst(baseStatTotal(sp.baseStats))}</div><div style={S.bstLbl}>BST</div></div>
                            </div>
                        )
                    }
                    // ULTRA-SECRET rencontré mais non capturé : identité masquée « ??? ». Galijah : décompte énigmatique.
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
                {roster.length === 0 && <div style={S.empty}>Ton dex est vide. Rencontre des Daemons pour les répertorier, puis bats L'Archiviste pour ouvrir leurs fiches !</div>}
                {roster.length > 0 && entries.length === 0 && <div style={S.empty}>Aucun Daemon ne correspond.</div>}
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
    cardSilhouette: { background: "#d8d6c8", borderColor: "#9a9a8a", opacity: 0.8 },
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
