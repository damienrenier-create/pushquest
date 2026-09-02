"use client"

// ARC LAMPE & GÉNIE — modal de la « vieille lampe rouillée » (clic depuis le sac → Objets clés).
//  1) FROTTER la lampe (mouvement pointer/tactile) → le GÉNIE apparaît (pose LAMP_RUBBED_MARKER → onglet 🧞).
//  2) Flow UN PAR UN : formuler UN vœu → le génie médite → (le créateur pose le dilemme) → le joueur ACCEPTE/REFUSE
//     → le vœu suivant se débloque. Après 3 vœux tranchés : SCELLÉ (plus de formulation). État dérivé du serveur
//     (GET) → le modal est une simple machine à états. Sprites lampe/génie fournis par Sartay (repli emoji).

import { useEffect, useRef, useState } from "react"
import { getPlayer, markTrainerDefeated, applyAcceptedGenieWishEffects, consumeGenieAnnouncements } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { LAMP_RUBBED_MARKER } from "@/lib/gamebook/yellow/data/genieLamp"

const RUB_TARGET = 1400 // distance de frottement cumulée (px) avant l'apparition du génie

interface WishRow {
    wish1: string; wish2: string; wish3: string
    condition1: string | null; condition2: string | null; condition3: string | null
    accepted1: boolean | null; accepted2: boolean | null; accepted3: boolean | null
    effect1?: string | null; effect2?: string | null; effect3?: string | null
}
type Phase = "loading" | "formulate" | "waiting" | "dilemma" | "done"

// Sprite du génie (fourni par Sartay), avec repli emoji si l'asset est absent.
function GenieArt() {
    const [err, setErr] = useState(false)
    return err
        ? <div style={{ fontSize: 84, textAlign: "center", margin: "2px 0 6px", filter: "drop-shadow(0 0 18px #7ad0ff88)" }}>🧞</div>
        : <img src="/yellow/sprites/genie.png" alt="Génie" draggable={false} onError={() => setErr(true)} style={{ display: "block", width: 148, height: 148, objectFit: "contain", imageRendering: "pixelated", margin: "0 auto 6px", filter: "drop-shadow(0 0 16px #7ad0ff88)" }} />
}

/** Dérive la phase courante + l'index (0-2) du vœu concerné à partir de la ligne serveur. */
function derive(row: WishRow | null): { phase: Phase; step: number; condition: string | null; first: boolean } {
    if (!row) return { phase: "formulate", step: 0, condition: null, first: true }
    const w = [row.wish1, row.wish2, row.wish3]
    const c = [row.condition1, row.condition2, row.condition3]
    const a = [row.accepted1, row.accepted2, row.accepted3]
    const submitted = w.map((x) => !!(x && x.trim()))
    const proposed = c.map((x) => x != null && x !== "")
    const resolved = a.map((x) => x === true || x === false)
    let step = resolved.findIndex((r) => !r) // 1er vœu non tranché
    if (step < 0) return { phase: "done", step: 3, condition: null, first: false }
    if (!submitted[step]) return { phase: "formulate", step, condition: null, first: step === 0 }
    if (!proposed[step]) return { phase: "waiting", step, condition: null, first: false }
    return { phase: "dilemma", step, condition: c[step], first: false }
}

export default function RustyLampModal({ onClose }: { onClose: () => void }) {
    // Le joueur doit FROTTER la lampe à CHAQUE ouverture pour invoquer le génie (choix Sartay 04/08) — que ce soit
    // pour consulter ses vœux ou en formuler un nouveau. Donc TOUJOURS false au montage (le marker lamp_rubbed sert
    // seulement à débloquer l'onglet 🧞 et n'est plus un raccourci de frottage).
    const [rubbed, setRubbed] = useState(false)
    const [rub, setRub] = useState(0)
    const [row, setRow] = useState<WishRow | null | undefined>(undefined) // undefined = pas chargé
    const [draft, setDraft] = useState("")
    const [busy, setBusy] = useState(false)
    const [lampErr, setLampErr] = useState(false)
    const [justSent, setJustSent] = useState(false) // vœu ENREGISTRÉ cette ouverture → verrouille le formulaire (anti-spam / anti-refaire)
    const [sendErr, setSendErr] = useState(false)   // l'envoi du vœu a échoué côté serveur → réessayer, ne pas verrouiller
    const rubRef = useRef(0)
    const last = useRef<{ x: number; y: number } | null>(null)
    const pressed = useRef(false)

    const load = async () => {
        try {
            const r = await fetch("/api/gamebook/yellow/genie-wish")
            if (!r.ok) return // erreur DB transitoire (503) → garder l'état de chargement, NE PAS retomber sur « 1re invocation »
            const j = await r.json()
            const w = (j?.wish ?? null) as WishRow | null
            setRow(w)
            // (Plus d'auto-skip du frottage : on veut que le joueur frotte à chaque fois.)
            // AUTO-APPLICATION : si un vœu vient d'être accepté (respond → load), on applique son effet machine
            //   TOUT DE SUITE (énergie/verrou/objet…), sans aller-retour créateur ni redéploiement. Idempotent.
            if (applyAcceptedGenieWishEffects(w)) persistYellowSave()
            consumeGenieAnnouncements() // le message du génie est DÉJÀ affiché dans ce modal → on vide la file (pas de re-annonce au prochain load)
        } catch { /* réseau → row reste undefined (chargement), pas de fausse 1re invocation */ }
    }
    // Charge TOUJOURS au montage (même avant frottage) → détecte un arc déjà entamé et évite un faux « 1re invocation ».
    useEffect(() => { void load() }, [])

    const onDown = (x: number, y: number) => { pressed.current = true; last.current = { x, y } }
    const onUp = () => { pressed.current = false; last.current = null }
    const onMove = (x: number, y: number) => {
        if (rubbed || !pressed.current) return
        if (last.current) {
            const nr = rubRef.current + Math.abs(x - last.current.x) + Math.abs(y - last.current.y)
            rubRef.current = nr
            setRub(nr)
            if (nr >= RUB_TARGET) {
                pressed.current = false
                if (!getPlayer().defeatedTrainers.includes(LAMP_RUBBED_MARKER)) { markTrainerDefeated(LAMP_RUBBED_MARKER); persistYellowSave() }
                setRubbed(true)
            }
        }
        last.current = { x, y }
    }

    const submit = async () => {
        if (!draft.trim() || busy || justSent) return
        setBusy(true); setSendErr(false)
        try {
            const r = await fetch("/api/gamebook/yellow/genie-wish", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "submit", wish: draft.trim() }),
            })
            const j = r.ok ? await r.json() : null
            if (!j?.saved) { setSendErr(true); return } // le serveur n'a PAS enregistré → ne pas verrouiller, on peut réessayer
            setJustSent(true) // verrouille SEULEMENT après confirmation d'enregistrement (anti-spam + anti-refaire)
            setDraft("")
            await load()
        } catch { setSendErr(true) } finally { setBusy(false) }
    }
    const respond = async (accepted: boolean) => {
        if (busy) return
        setBusy(true); setSendErr(false)
        try {
            const r = await fetch("/api/gamebook/yellow/genie-wish", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "respond", accepted }),
            })
            if (!r.ok) { setSendErr(true); return } // réponse non enregistrée (503) → laisser le dilemme, réessayer
            setJustSent(false) // dilemme tranché → le vœu SUIVANT pourra être formulé
            await load()
        } catch { setSendErr(true) } finally { setBusy(false) }
    }

    const pct = Math.min(100, (rub / RUB_TARGET) * 100)
    const info = derive(row === undefined ? null : row)
    // justSent (posé UNIQUEMENT après enregistrement confirmé) force l'attente le temps que load() rafraîchisse
    // la ligne → le formulaire ne réapparaît pas dans la foulée (anti-spam / anti-refaire).
    const phase: Phase = row === undefined ? "loading" : (justSent && info.phase === "formulate") ? "waiting" : info.phase

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
                {!rubbed ? (
                    // ── Étape LAMPE : la frotter (aucune consigne affichée — le joueur découvre par lui-même) ──
                    <>
                        <div style={S.title}>🪔 Lampe rouillée</div>
                        <div style={S.text}>Une vieille lampe sale et poussiéreuse, ternie par les siècles…</div>
                        <div
                            style={{ ...S.lampZone, transform: `scale(${1 + Math.min(0.16, (rub / RUB_TARGET) * 0.16)})` }}
                            onPointerDown={(e) => onDown(e.clientX, e.clientY)}
                            onPointerMove={(e) => onMove(e.clientX, e.clientY)}
                            onPointerUp={onUp}
                            onPointerLeave={onUp}
                        >
                            {lampErr
                                ? <span style={{ fontSize: 104, filter: `drop-shadow(0 0 ${8 + pct / 4}px #ffd76a)` }}>🪔</span>
                                : <img src="/yellow/sprites/lampe_rouillee.png" alt="Lampe rouillée" draggable={false} onError={() => setLampErr(true)} style={{ width: 156, height: 156, objectFit: "contain", imageRendering: "pixelated", pointerEvents: "none", filter: `drop-shadow(0 0 ${6 + pct / 4}px #ffd76a)` }} />}
                        </div>
                        <button style={S.ghost} onClick={onClose}>Ranger la lampe</button>
                    </>
                ) : phase === "loading" ? (
                    <div style={{ ...S.text, textAlign: "center", padding: 26 }}>✨ *La lampe frémit…*</div>
                ) : phase === "done" ? (
                    <>
                        <GenieArt />
                        <div style={S.speech}>« Mes faveurs sont épuisées, mortel. Ce qui est scellé le restera. »</div>
                        <button style={S.primary} onClick={onClose}>Fermer</button>
                    </>
                ) : phase === "waiting" ? (
                    <>
                        <GenieArt />
                        <div style={S.speech}>« Laisse-moi méditer sur ta demande… Reviens me voir plus tard. »</div>
                        <button style={S.primary} onClick={onClose}>Fermer</button>
                    </>
                ) : phase === "dilemma" ? (
                    <>
                        <GenieArt />
                        <div style={S.speech}>{info.condition}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                            <button style={{ ...S.primary, marginTop: 0, flex: 1, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => respond(true)}>✅ J&apos;accepte</button>
                            <button style={{ ...S.refuse, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => respond(false)}>❌ Je refuse</button>
                        </div>
                        {sendErr && <div style={S.err}>La lampe crépite… ta réponse n'est pas passée. Réessaie dans un instant.</div>}
                        <button style={S.ghost} onClick={onClose}>Plus tard</button>
                    </>
                ) : (
                    // phase "formulate"
                    <>
                        <GenieArt />
                        <div style={S.speech}>
                            {info.first
                                ? "*Une fumée s'échappe de la lampe et prend forme…* « Enfin libre. Tu m'as réveillé, mortel. Formule ton souhait — je verrai ce que je peux faire. »"
                                : "« Ton destin suit son cours… Parle : quel est ton souhait ? »"}
                        </div>
                        <textarea
                            style={S.input} rows={3} maxLength={280} autoFocus
                            placeholder="J'aimerais que…"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                        />
                        <button style={{ ...S.primary, opacity: draft.trim() && !busy ? 1 : 0.5, cursor: draft.trim() && !busy ? "pointer" : "default" }} disabled={!draft.trim() || busy} onClick={submit}>
                            {busy ? "…" : "🧞 Formuler ce vœu"}
                        </button>
                        {sendErr && <div style={S.err}>La lampe crépite… le génie n'a pas reçu ta demande. Réessaie dans un instant.</div>}
                        <button style={S.ghost} onClick={onClose}>Plus tard</button>
                    </>
                )}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "16px 12px", fontFamily: "system-ui,sans-serif" },
    sheet: { width: "100%", maxWidth: 420, background: "radial-gradient(680px 340px at 50% -8%, #3a2c12 0%, #201a2e 55%, #141020 100%)", border: "2px solid #c9a227", borderRadius: 16, padding: "16px 18px 20px", color: "#f3ecff", boxShadow: "0 14px 46px rgba(0,0,0,0.55)" },
    title: { fontSize: 19, fontWeight: 900, textAlign: "center", color: "#ffd76a", textShadow: "0 0 14px #c9a22755", marginBottom: 6 },
    text: { fontSize: 13.5, lineHeight: 1.5, color: "#efe6ff", textAlign: "center" },
    speech: { fontSize: 14, lineHeight: 1.55, color: "#f3ecff", fontStyle: "italic", background: "rgba(201,162,39,0.08)", border: "1px solid #c9a22740", borderRadius: 10, padding: "11px 13px" },
    lampZone: { height: 200, margin: "12px 0", borderRadius: 16, border: "1px solid #2a2136", background: "radial-gradient(circle at 50% 55%, #221a34, #120e1c)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", touchAction: "none", userSelect: "none", transition: "transform 0.05s linear" },
    input: { width: "100%", boxSizing: "border-box", marginTop: 10, background: "rgba(20,16,32,0.8)", border: "1px solid #6a5a8a", borderRadius: 9, color: "#f3ecff", fontSize: 13.5, fontFamily: "system-ui,sans-serif", padding: "9px 11px", resize: "vertical" },
    primary: { width: "100%", marginTop: 14, background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 14, fontWeight: 900, padding: "11px", cursor: "pointer" },
    refuse: { flex: 1, background: "rgba(30,22,48,0.7)", border: "1px solid #6a5a8a", borderRadius: 10, color: "#e6c9c9", fontSize: 13.5, fontWeight: 800, padding: "11px", cursor: "pointer" },
    ghost: { width: "100%", marginTop: 8, background: "transparent", border: "1px solid #6a5a8a", borderRadius: 10, color: "#c9b8e8", fontSize: 12.5, fontWeight: 700, padding: "9px", cursor: "pointer" },
    err: { marginTop: 8, fontSize: 12, color: "#f3bcbc", background: "rgba(232,136,136,0.12)", border: "1px solid #e88", borderRadius: 8, padding: "8px 10px", textAlign: "center" },
}
