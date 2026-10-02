"use client"

// 🔢 VŒU « JE CHOISIS LE NUMÉRO » (Guillaume) — l'annonce du matin.
//
// À la PREMIÈRE connexion de la journée, le génie demande un numéro de Pokédex : ce sera le 10ᵉ Daemon sauvage
// croisé aujourd'hui. Sept journées en tout. La règle entière (cadence, résolution, comptage) vit dans data/dexWish.
//
// ⚠️ LE GÉNIE N'OPPOSE AUCUN REFUS, et c'est voulu (règle Sartay) : la journée est consommée DÈS l'annonce, et un
// numéro interdit (inexistant, légendaire, hors de son run) donnera un MissingNo niveau 5 au 10ᵉ pop. On ne
// l'avertit donc PAS ici — les trois limites sont énoncées dans le marché du génie, à lui de connaître son
// Pokédex. L'écran confirme l'annonce sans nommer l'espèce : la sanction se découvre sur le terrain.
//
// Une seule précaution d'interface : comme l'annonce est irréversible, elle passe par une CONFIRMATION explicite
// (un chiffre tapé de travers ne doit pas brûler une journée sur une simple faute de frappe).

import { useMemo, useState } from "react"
import { getDexWish, setDexWish, getPlayer, getActiveWorld } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { SPECIES } from "@/lib/gamebook/yellow/data/species"
import { runSpawnableSpecies, wildLevelCap } from "@/lib/gamebook/yellow/data/encounters"
import { resolveDexChoice, announceDex, dexAnnounceMessage, DEX_WISH_POP_INDEX } from "@/lib/gamebook/yellow/data/dexWish"

export default function DexWishModal({ onClose }: { onClose: () => void }) {
    const [raw, setRaw] = useState("")
    const [confirme, setConfirme] = useState(false)
    const [fait, setFait] = useState<string | null>(null)
    const wish = getDexWish()

    // Vivier : les espèces qui peuvent VRAIMENT apparaître dans SON run (run 1 = live, 2 = NG+, 3 = run 3).
    //   hideEndgame suit la règle du guide de capture : le contenu post-Ligue reste masqué avant le sacre.
    const { candidates, spawnable } = useMemo(() => {
        const w = getActiveWorld()
        const run = w === "ngplus" ? 2 : w === "run3" ? 3 : 1
        const hideEndgame = run === 1 && !getPlayer().isChampion
        return {
            candidates: Object.values(SPECIES).map((s) => ({ id: s.id, dexNo: s.dexNo, name: s.name, rarity: String(s.rarity) })),
            spawnable: runSpawnableSpecies(run, hideEndgame),
        }
    }, [])

    if (!wish) return null
    const n = Math.floor(Number(raw.trim()))
    const saisieOk = Number.isFinite(n) && n > 0

    function annoncer() {
        const outcome = resolveDexChoice(raw.trim(), candidates, spawnable)
        const next = announceDex(wish!, new Date().toISOString().slice(0, 10), outcome, wildLevelCap(getPlayer().badges))
        setDexWish(next)
        persistYellowSave()
        setFait(dexAnnounceMessage(outcome.dexNo, next.charges)) // ne nomme PAS l'espèce : ni le cadeau, ni la sanction
    }

    return (
        <div style={S.overlay} role="dialog" aria-modal="true" aria-label="Annoncer un numéro de Pokédex">
            <div style={S.sheet}>
                <div style={S.title}>🧞 L&apos;APPEL DU MATIN</div>
                {fait ? (
                    <>
                        <div style={S.speech}>{fait}</div>
                        <button style={S.primary} onClick={onClose}>En chasse !</button>
                    </>
                ) : (
                    <>
                        <div style={S.speech}>
                            « Annonce-moi un numéro, mortel. Le {DEX_WISH_POP_INDEX}ᵉ Daemon sauvage que tu croiseras
                            aujourd&apos;hui portera ce numéro — j&apos;y veillerai. »
                        </div>
                        <div style={S.hint}>
                            Journées restantes : <b>{wish.charges}</b>. Rappelle-toi les termes du marché :
                            il doit hanter les herbes de ton run, et aucun légendaire ne vient quand on le siffle.
                            <br /><b>Une annonce est définitive</b> — elle consomme ta journée.
                        </div>
                        <input
                            style={S.input} type="number" min={1} inputMode="numeric" placeholder="n° du Pokédex"
                            value={raw} onChange={(e) => { setRaw(e.target.value); setConfirme(false) }}
                            autoFocus
                        />
                        {!confirme ? (
                            <button style={{ ...S.primary, opacity: saisieOk ? 1 : 0.5 }} disabled={!saisieOk} onClick={() => setConfirme(true)}>
                                Annoncer le numéro {saisieOk ? n : ""}
                            </button>
                        ) : (
                            <>
                                <div style={S.warn}>Tu annonces le <b>n°{n}</b>. C&apos;est définitif, et ça consomme une de tes {wish.charges} journées.</div>
                                <button style={S.primary} onClick={annoncer}>✅ Je confirme le n°{n}</button>
                                <button style={S.ghost} onClick={() => setConfirme(false)}>Changer de numéro</button>
                            </>
                        )}
                        <button style={S.ghost} onClick={onClose}>Plus tard (rien n&apos;est consommé)</button>
                    </>
                )}
            </div>
        </div>
    )
}

const S: Record<string, React.CSSProperties> = {
    overlay: { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(8,6,14,0.92)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "16px 12px", fontFamily: "system-ui,sans-serif" },
    sheet: { width: "100%", maxWidth: 420, background: "radial-gradient(680px 340px at 50% -8%, #3a2c12 0%, #201a2e 55%, #141020 100%)", border: "2px solid #c9a227", borderRadius: 16, padding: "16px 18px 20px", color: "#f3ecff", boxShadow: "0 14px 46px rgba(0,0,0,0.55)" },
    title: { fontSize: 19, fontWeight: 900, textAlign: "center", color: "#ffd76a", textShadow: "0 0 14px #c9a22755", marginBottom: 10 },
    speech: { fontSize: 14, lineHeight: 1.55, color: "#f3ecff", fontStyle: "italic", background: "rgba(201,162,39,0.08)", border: "1px solid #c9a22740", borderRadius: 10, padding: "11px 13px" },
    hint: { fontSize: 12, lineHeight: 1.5, color: "#c9b8e8", marginTop: 10, textAlign: "center" },
    input: { width: "100%", boxSizing: "border-box", marginTop: 10, background: "rgba(20,16,32,0.8)", border: "1px solid #6a5a8a", borderRadius: 9, color: "#f3ecff", fontSize: 16, fontFamily: "system-ui,sans-serif", padding: "10px 11px", textAlign: "center", fontWeight: 800 },
    primary: { width: "100%", marginTop: 12, background: "linear-gradient(180deg,#e0b84a,#c9a227)", border: "1px solid #ffe08a", borderRadius: 10, color: "#241a06", fontSize: 14, fontWeight: 900, padding: "11px", cursor: "pointer" },
    ghost: { width: "100%", marginTop: 8, background: "transparent", border: "1px solid #6a5a8a", borderRadius: 10, color: "#c9b8e8", fontSize: 12.5, fontWeight: 700, padding: "9px", cursor: "pointer" },
    warn: { marginTop: 10, fontSize: 12.5, lineHeight: 1.5, color: "#ffe0a8", background: "rgba(201,162,39,0.14)", border: "1px solid #c9a22780", borderRadius: 8, padding: "9px 11px", textAlign: "center" },
}
