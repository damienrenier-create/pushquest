"use client"

// SUPER-ADMIN — GÉNÉRATEUR DE PROGRESSION (outil de test).
//
// Un formulaire à cases à cocher qui décrit un point du jeu (run visé, arènes conquises,
// Ligue, équipe, sac, déblocages), le convertit en YellowSave complète via le builder pur
// (lib/gamebook/yellow/admin/progressionRecipe) et l'écrit sur le compte COURANT :
//   1) backup de la save actuelle (history, réversible côté serveur),
//   2) POST /api/gamebook/yellow/save avec intentionalReset (contourne le garde-fou anti-wipe),
//   3) purge l'état de session (SORT du combat / de la série en cours — cf. storage/sessionKeys),
//   4) repositionne le joueur à l'entrée de Ville Jaune (optionnel),
//   5) rechargement DUR de /gamebook/yellow (les stores sont des modules : une nav SPA
//      garderait l'ancien état en mémoire — cf. saveManager.loaded).
//
// Écrit UNIQUEMENT la save du compte connecté (l'API ne permet rien d'autre) → pas de gestion
// de droits pour l'instant.

import { useState } from "react"
import {
    ARENA_STEPS, PRESETS, defaultRecipe, buildProgressionSave, recipeSummary,
    type ProgressionRecipe, type RunTarget, type TeamPool, type TeamBoost, type BagPreset,
} from "@/lib/gamebook/yellow/admin/progressionRecipe"
import type { BadgeId } from "@/lib/gamebook/yellow/data/cts"
import { YELLOW_ENTRANCE_MAP_ID } from "@/lib/gamebook/yellow/featureFlag"
import { clearRunSessionStorage } from "@/lib/gamebook/yellow/storage/sessionKeys"

/** Spawn par défaut — aligné sur DEFAULT_PLAYER de /api/gamebook/yellow/state (entrée sud de Ville Jaune). */
const ENTRANCE = { mapId: YELLOW_ENTRANCE_MAP_ID, posX: 22, posY: 38, direction: "up" as const }

const RUNS: { id: RunTarget; label: string; hint: string }[] = [
    { id: "run1", label: "Run 1 — Découverte", hint: "monde live, la recette telle quelle" },
    { id: "run2", label: "Run 2 — New Game+", hint: "un run 1 Champion est fabriqué en amont" },
    { id: "run3", label: "Run 3 — Concours", hint: "runs 1 et 2 Champions fabriqués en amont" },
]
const POOLS: { id: TeamPool; label: string }[] = [
    { id: "starters", label: "Starters run 1" },
    { id: "roster", label: "Roster run 1" },
    { id: "run3", label: "Starters run 3" },
    { id: "all", label: "Tout le catalogue" },
]
const BOOSTS: { id: TeamBoost; label: string }[] = [
    { id: "none", label: "Aucun" },
    { id: "guard", label: "Garde (EV 128)" },
    { id: "elite", label: "Élite (EV 252)" },
]
const BAGS: { id: BagPreset; label: string }[] = [
    { id: "none", label: "Vide" },
    { id: "basic", label: "De base" },
    { id: "full", label: "Complet" },
]

export default function SuperAdminPanel({ nickname }: { nickname: string }) {
    const [r, setR] = useState<ProgressionRecipe>(defaultRecipe())
    const [busy, setBusy] = useState<string | null>(null)
    const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null)
    const [resetPos, setResetPos] = useState(true)
    const [showJson, setShowJson] = useState(false)

    const patch = (p: Partial<ProgressionRecipe>) => setR((cur) => ({ ...cur, ...p }))
    const patchTeam = (p: Partial<ProgressionRecipe["team"]>) => setR((cur) => ({ ...cur, team: { ...cur.team, ...p } }))
    const toggleArena = (b: BadgeId) =>
        setR((cur) => ({ ...cur, arenas: cur.arenas.includes(b) ? cur.arenas.filter((x) => x !== b) : [...cur.arenas, b] }))

    /** Télécharge la save serveur actuelle (filet de sécurité avant de tout écraser). */
    async function downloadCurrent() {
        setBusy("download"); setMsg(null)
        try {
            const res = await fetch("/api/gamebook/yellow/save")
            const j = await res.json()
            const blob = new Blob([JSON.stringify(j?.save ?? {}, null, 2)], { type: "application/json" })
            const a = document.createElement("a")
            a.href = URL.createObjectURL(blob)
            a.download = `nexus-yellow-save-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`
            a.click()
            URL.revokeObjectURL(a.href)
            setMsg({ kind: "ok", text: "Save actuelle téléchargée." })
        } catch {
            setMsg({ kind: "err", text: "Téléchargement impossible." })
        } finally { setBusy(null) }
    }

    /** Écrit une save (générée ou importée) sur le compte, puis relance le jeu. */
    async function applySave(save: unknown, label: string) {
        setBusy(label); setMsg(null)
        try {
            // 1) Backup de l'état courant (réversible : conservé dans GamebookProgress.history).
            await fetch("/api/gamebook/yellow/save/backup", { method: "POST" }).catch(() => null)
            // 2) Écriture INTENTIONNELLE (le garde-fou anti-wipe refuserait sinon une save « plus petite »).
            const res = await fetch("/api/gamebook/yellow/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ save, intentionalReset: true }),
            })
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            // 3) SORTIE DU COMBAT EN COURS : l'instantané de combat (et la série Frontier/Dôme) vit dans
            //    localStorage, PAS dans la save. Sans purge, resumeBattleFromStorage() remettrait le joueur
            //    dans le combat de l'ANCIENNE partie au rechargement, avec une équipe périmée.
            clearRunSessionStorage()
            // 4) Position : entrée de Ville Jaune (le joueur pourrait être coincé dans une carte de run précédent).
            if (resetPos) {
                await fetch("/api/gamebook/yellow/state", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(ENTRANCE),
                }).catch(() => null)
            }
            setMsg({ kind: "ok", text: "Progression appliquée. Ouverture du Nexus…" })
            // 5) Rechargement DUR : les stores sont des modules en mémoire, une nav SPA les garderait.
            window.location.href = "/gamebook/yellow"
        } catch (e) {
            setMsg({ kind: "err", text: `Échec de l'écriture : ${(e as Error).message}` })
            setBusy(null)
        }
    }

    /** Restaure un JSON de save précédemment téléchargé. */
    async function importJson(file: File) {
        try {
            const save = JSON.parse(await file.text())
            await applySave(save, "import")
        } catch {
            setMsg({ kind: "err", text: "JSON illisible." })
        }
    }

    const generated = buildProgressionSave(r, { now: 0 })

    return (
        <div style={S.page}>
            <div style={S.wrap}>
                <header style={S.header}>
                    <div>
                        <div style={S.title}>⚙️ Super-Admin — Générateur de progression</div>
                        <div style={S.sub}>
                            Fabrique une sauvegarde à la carte pour re-tester le jeu. Écrit sur le compte <b>{nickname || "courant"}</b>.
                        </div>
                    </div>
                    <a href="/gamebook/yellow" style={S.linkBtn}>▶ Nexus</a>
                </header>

                <div style={S.warn}>
                    ⚠️ Écrase la progression du compte connecté. Un backup automatique est fait avant écriture
                    (colonne <code>history</code>) — pense aussi à <b>télécharger la save actuelle</b>.
                </div>

                {/* PRESETS */}
                <Section title="Presets">
                    <div style={S.row}>
                        {PRESETS.map((p) => (
                            <button key={p.id} style={S.preset} title={p.hint} onClick={() => setR(p.recipe)}>
                                <span>{p.label}</span>
                                <span style={S.presetHint}>{p.hint}</span>
                            </button>
                        ))}
                    </div>
                </Section>

                {/* RUN */}
                <Section title="Run visé">
                    <div style={S.row}>
                        {RUNS.map((x) => (
                            <Radio key={x.id} checked={r.run === x.id} label={x.label} hint={x.hint} onClick={() => patch({ run: x.id })} />
                        ))}
                    </div>
                </Section>

                {/* ARÈNES + LIGUE */}
                <Section title="Arènes conquises" hint="badge gagné + gardes et boss battus + CT-cadeau du boss">
                    <div style={S.grid}>
                        {ARENA_STEPS.map((a) => (
                            <Check
                                key={a.badge}
                                checked={r.arenas.includes(a.badge)}
                                label={`${a.label}`}
                                hint={`${a.bossName} · ${a.guardIds.length} gardes`}
                                onClick={() => toggleArena(a.badge)}
                            />
                        ))}
                    </div>
                    <div style={S.grid}>
                        <Check checked={r.arenaRematches} label="Revanches faites" hint="rematch des gardes + boss cochés" onClick={() => patch({ arenaRematches: !r.arenaRematches })} />
                        <Check checked={r.routeTrainers} label="PNJ hors arène battus" hint="dresseurs de route + sbire, ACE, Orcaline, PNJ 5, spectres, Dénicheur…" onClick={() => patch({ routeTrainers: !r.routeTrainers })} />
                        <Check checked={r.conseil} label="Conseil des 4 battu" hint="Olga · Aldo · Agatha · Peter" onClick={() => patch({ conseil: !r.conseil })} />
                        <Check checked={r.champion} label="Champion 👑" hint="Le Maître battu → Hall of Fame, post-game" onClick={() => patch({ champion: !r.champion })} />
                    </div>
                </Section>

                {/* ÉQUIPE */}
                <Section title="Équipe de Daemons">
                    <div style={S.row}>
                        <Num label="Daemons" value={r.team.count} min={0} max={6} onChange={(v) => patchTeam({ count: v })} />
                        <Num label="Niveau" value={r.team.level} min={1} max={100} onChange={(v) => patchTeam({ level: v })} />
                        <Num label="Au PC" value={r.team.pcCount} min={0} max={30} onChange={(v) => patchTeam({ pcCount: v })} />
                        <Num label="Graine" value={r.seed} min={1} max={9999} onChange={(v) => patch({ seed: v })} />
                    </div>
                    <div style={S.row}>
                        <Select label="Vivier" value={r.team.pool} options={POOLS} onChange={(v) => patchTeam({ pool: v as TeamPool })} />
                        <Select label="Entraînement" value={r.team.boost} options={BOOSTS} onChange={(v) => patchTeam({ boost: v as TeamBoost })} />
                    </div>
                    <div style={S.grid}>
                        <Check checked={r.team.shiny} label="Tous shiny ✨" hint="IV parfaits inclus" onClick={() => patchTeam({ shiny: !r.team.shiny })} />
                        <Check checked={r.team.evolve} label="Évoluer au niveau" hint="stade naturel du niveau choisi" onClick={() => patchTeam({ evolve: !r.team.evolve })} />
                    </div>
                    <div style={S.previewRow}>
                        {generated.activeWorld === "live" ? preview(generated) : preview(generated.run3World ?? generated.ngplusWorld ?? generated)}
                    </div>
                </Section>

                {/* INVENTAIRE */}
                <Section title="Énergie & inventaire">
                    <div style={S.row}>
                        <Num label="Énergie ⚡" value={r.reps} min={0} max={99999} step={100} onChange={(v) => patch({ reps: v })} />
                        <Select label="Sac" value={r.bag} options={BAGS} onChange={(v) => patch({ bag: v as BagPreset })} />
                        <Num label="Titres du Dôme" value={r.domeChampionships} min={0} max={10} onChange={(v) => patch({ domeChampionships: v })} />
                    </div>
                    <div style={S.grid}>
                        <Check checked={r.allCts} label="Toutes les CT" hint="catalogue complet, cadeaux et labo inclus" onClick={() => patch({ allCts: !r.allCts })} />
                        <Check checked={r.keyItems} label="Objets clés" hint="Daemonflûte, Pierre Gékroc, Noyau, torche, repousses" onClick={() => patch({ keyItems: !r.keyItems })} />
                        <Check checked={r.dexComplete} label="Pokédex complet" hint="tout vu + tout capturé" onClick={() => patch({ dexComplete: !r.dexComplete })} />
                    </div>
                </Section>

                {/* DÉBLOCAGES */}
                <Section title="Déblocages">
                    <div style={S.grid}>
                        <Check checked={r.skipCinematics} label="Sauter les cinématiques" hint="intro, Gène, roulette + cadeaux d'énergie déjà réclamés" onClick={() => patch({ skipCinematics: !r.skipCinematics })} />
                        <Check checked={r.sylvebarbe} label="Sylvebarbe réveillé" hint="sortie sud de Ville Jaune → Zone de Combat" onClick={() => patch({ sylvebarbe: !r.sylvebarbe })} />
                        <Check checked={r.berrySecret} label="Secret des baies" hint="récolte des arbres active" onClick={() => patch({ berrySecret: !r.berrySecret })} />
                        <Check checked={r.gekroc} label="Gékroc résolu" hint="mini-boss de la Centrale (battu ou capturé)" onClick={() => patch({ gekroc: !r.gekroc })} />
                        <Check checked={resetPos} label="Replacer à Ville Jaune" hint="entrée sud (évite de spawner dans une carte d'un autre run)" onClick={() => setResetPos(!resetPos)} />
                    </div>
                </Section>

                {/* RÉSUMÉ + ACTIONS */}
                <Section title="Résumé">
                    <ul style={S.summary}>
                        {recipeSummary(r).map((l) => <li key={l}>{l}</li>)}
                    </ul>
                    <button style={S.ghost} onClick={() => setShowJson(!showJson)}>
                        {showJson ? "▾ Masquer le JSON généré" : "▸ Voir le JSON généré"}
                    </button>
                    {showJson && <pre style={S.json}>{JSON.stringify(generated, null, 1)}</pre>}
                </Section>

                {msg && <div style={{ ...S.msg, ...(msg.kind === "ok" ? S.msgOk : S.msgErr) }}>{msg.text}</div>}

                <div style={S.actions}>
                    <button style={S.primary} disabled={!!busy} onClick={() => applySave(generated, "apply")}>
                        {busy === "apply" ? "Application…" : "⚡ Générer & appliquer"}
                    </button>
                    <button style={S.secondary} disabled={!!busy} onClick={downloadCurrent}>
                        {busy === "download" ? "…" : "📥 Télécharger la save actuelle"}
                    </button>
                    <label style={S.secondary}>
                        📤 Importer un JSON
                        <input
                            type="file" accept="application/json" style={{ display: "none" }}
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f) }}
                        />
                    </label>
                </div>
            </div>
        </div>
    )
}

/** Aperçu textuel de l'équipe générée (espèce niv. X). */
function preview(w: { team: { speciesId: string; level: number; shiny?: boolean }[] }) {
    if (!w.team.length) return <span style={S.previewEmpty}>Aucun Daemon (l'intro du jeu prendra le relais).</span>
    return w.team.map((m, i) => (
        <span key={i} style={S.chip}>{m.speciesId} <b>niv.{m.level}</b>{m.shiny ? " ✨" : ""}</span>
    ))
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
    return (
        <section style={S.section}>
            <div style={S.sectionTitle}>{title}{hint && <span style={S.sectionHint}> — {hint}</span>}</div>
            {children}
        </section>
    )
}

function Check({ checked, label, hint, onClick }: { checked: boolean; label: string; hint?: string; onClick: () => void }) {
    return (
        <button style={{ ...S.check, ...(checked ? S.checkOn : {}) }} onClick={onClick} type="button">
            <span style={S.box}>{checked ? "✓" : null}</span>
            <span>
                <span style={S.checkLabel}>{label}</span>
                {hint && <span style={S.checkHint}>{hint}</span>}
            </span>
        </button>
    )
}

function Radio({ checked, label, hint, onClick }: { checked: boolean; label: string; hint?: string; onClick: () => void }) {
    return (
        <button style={{ ...S.check, ...(checked ? S.checkOn : {}) }} onClick={onClick} type="button">
            <span style={{ ...S.box, borderRadius: "50%" }}>{checked ? "●" : null}</span>
            <span>
                <span style={S.checkLabel}>{label}</span>
                {hint && <span style={S.checkHint}>{hint}</span>}
            </span>
        </button>
    )
}

function Num({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
    return (
        <label style={S.field}>
            <span style={S.fieldLabel}>{label}</span>
            <input
                type="number" value={value} min={min} max={max} step={step} style={S.input}
                onChange={(e) => onChange(Math.max(min, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
            />
        </label>
    )
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: { id: string; label: string }[]; onChange: (v: string) => void }) {
    return (
        <label style={S.field}>
            <span style={S.fieldLabel}>{label}</span>
            <select value={value} style={S.input} onChange={(e) => onChange(e.target.value)}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
        </label>
    )
}

const S: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#0b0f18", color: "#e8ecf6", fontFamily: "system-ui,sans-serif", padding: "24px 12px" },
    wrap: { maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 },
    header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    title: { fontSize: 22, fontWeight: 800 },
    sub: { fontSize: 13, color: "#95a1bd", marginTop: 4 },
    linkBtn: { background: "#1d4ed8", color: "#fff", padding: "9px 14px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" },
    warn: { background: "rgba(224,80,42,.12)", border: "1px solid #7a3520", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: "#f0c0ae", lineHeight: 1.5 },
    section: { background: "#141b2b", border: "1px solid #2a3550", borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 },
    sectionTitle: { fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase", color: "#95a1bd", fontWeight: 700 },
    sectionHint: { textTransform: "none", letterSpacing: 0, color: "#6b7690", fontWeight: 500 },
    row: { display: "flex", flexWrap: "wrap", gap: 8 },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 8 },
    check: { display: "flex", alignItems: "flex-start", gap: 9, textAlign: "left", background: "#1a2334", border: "1px solid #2a3550", borderRadius: 10, padding: "9px 11px", color: "#c3cbdc", cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
    checkOn: { borderColor: "#f6c640", background: "rgba(246,198,64,.10)", color: "#fff" },
    box: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, flex: "0 0 18px", borderRadius: 5, border: "1px solid #3a4767", fontSize: 12, marginTop: 1 },
    checkLabel: { display: "block", fontWeight: 700 },
    checkHint: { display: "block", fontSize: 11.5, color: "#6b7690", marginTop: 2, lineHeight: 1.35 },
    preset: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, background: "#1a2334", border: "1px solid #2a3550", borderRadius: 10, padding: "9px 12px", color: "#e8ecf6", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700 },
    presetHint: { fontSize: 11, color: "#6b7690", fontWeight: 500 },
    field: { display: "flex", flexDirection: "column", gap: 4 },
    fieldLabel: { fontSize: 11.5, color: "#95a1bd", fontWeight: 600 },
    input: { background: "#0f1523", border: "1px solid #2a3550", borderRadius: 8, color: "#e8ecf6", padding: "7px 9px", fontFamily: "inherit", fontSize: 13, minWidth: 110 },
    previewRow: { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
    previewEmpty: { fontSize: 12, color: "#6b7690" },
    chip: { background: "#0f1523", border: "1px solid #2a3550", borderRadius: 20, padding: "4px 10px", fontSize: 11.5, color: "#c3cbdc" },
    summary: { margin: 0, paddingLeft: 18, fontSize: 13, color: "#c3cbdc", lineHeight: 1.7 },
    ghost: { alignSelf: "flex-start", background: "transparent", border: "none", color: "#7f8cab", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: 0, textDecoration: "underline" },
    json: { background: "#0a0e16", border: "1px solid #2a3550", borderRadius: 8, padding: 10, fontSize: 10.5, maxHeight: 320, overflow: "auto", color: "#8fa0c4" },
    actions: { display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 32 },
    primary: { background: "#f6c640", border: "none", color: "#1a1405", fontWeight: 800, padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 14 },
    secondary: { background: "#20293e", border: "1px solid #2a3550", color: "#c3cbdc", fontWeight: 700, padding: "12px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13 },
    msg: { borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 600 },
    msgOk: { background: "rgba(58,165,74,.14)", border: "1px solid #2f6b39", color: "#a9e0b3" },
    msgErr: { background: "rgba(224,80,42,.14)", border: "1px solid #7a3520", color: "#f0b6a4" },
}
