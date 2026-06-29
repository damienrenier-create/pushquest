"use client"

// BARMAN du casino — guide du bâtiment + indice "jetons au sol" + vente de Potions À PRIX LIBRE.
// ⚠️ Les EFFETS des potions (esquive/crit/chance) sont SECRETS : ne jamais les afficher ici.
// Le barman suggère seulement que "payer plus porte chance".

import { useState } from "react"
import { usePlayer, buyBarmanPotion, barmanPotionBasePrice } from "@/lib/gamebook/yellow/store/playerStore"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"

const BUY_LINES = [
    "*Il te glisse la potion avec un clin d'œil.* À la tienne.",
    "*Il essuie le comptoir.* Bon choix. La maison te remercie.",
    "Tiens. On dit que les généreux ont… de la veine. Hé hé.",
    "*Il range les reps sous le comptoir.* Reviens quand tu veux.",
]

export default function BarmanPanel({ close }: { close: () => void }) {
    const player = usePlayer()
    const base = barmanPotionBasePrice()
    const [tab, setTab] = useState<"bar" | "shop">("bar")
    const [price, setPrice] = useState(base)
    const [msg, setMsg] = useState<string>("")
    const [tick, setTick] = useState(0)

    const dec = () => setPrice((p) => Math.max(base, p - base))
    const inc = () => setPrice((p) => Math.min(base * 9, p + base))
    const buy = () => {
        const r = buyBarmanPotion(price)
        if (r.ok) { persistYellowSave(); setMsg(BUY_LINES[tick % BUY_LINES.length]); setTick((t) => t + 1) }
        else setMsg(r.reason === "energy" ? "« Pas assez d'énergie, mon grand. »" : `« C'est ${base} ⚡ minimum. »`)
    }

    return (
        <div style={overlay} onClick={close}>
            <div style={box} onClick={(e) => e.stopPropagation()}>
                <div style={head}><span style={title}>🍸 LE BARMAN</span><span style={energy}>⚡ {player.reps}/{player.repsCap}</span></div>

                <div style={tabs}>
                    <button style={{ ...tabBtn, ...(tab === "bar" ? tabOn : {}) }} onClick={() => setTab("bar")}>💬 Le bar</button>
                    <button style={{ ...tabBtn, ...(tab === "shop" ? tabOn : {}) }} onClick={() => setTab("shop")}>🍶 Potions</button>
                </div>

                {tab === "bar" && (
                    <div style={body}>
                        <p style={p}>« Bienvenue au casino, l&apos;ami. Ici on se détend entre dresseurs. »</p>
                        <ul style={ul}>
                            <li>🎡 <b>La table de roulette</b> (juste là) : approche-toi et appuie sur A pour jouer. Mise de l&apos;énergie et des tickets — tout le monde joue la même manche.</li>
                            <li>🎲 <b>Le croupier</b> te montre les numéros chauds/froids et les plus gros coups.</li>
                            <li>⚔️ <b>Provoque les autres joueurs</b> en t&apos;approchant d&apos;eux + A. 💬 Tu peux aussi chatter et échanger.</li>
                            <li>🏛️ <b>Hall of Fame</b> (menu START) : les champions de la Ligue et des arènes.</li>
                        </ul>
                        <div style={hint}>🤫 « Entre nous… les joueurs maladroits font parfois tomber des <b>jetons</b> par terre. Si tu fouilles bien le sol (marche sur une case + A), qui sait ce que tu trouveras… »</div>
                    </div>
                )}

                {tab === "shop" && (
                    <div style={body}>
                        <div style={potionCard}>
                            <div style={{ fontSize: 30 }}>🧪</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 800 }}>Potion</div>
                                <div style={small}>Restaure 20 PV à un Daemon en combat.</div>
                            </div>
                        </div>
                        <div style={freeLine}>« Paie ce que tu veux (minimum {base} ⚡). On raconte que <b>plus tu es généreux, plus ça porte chance…</b> 😏 »</div>
                        <div style={priceRow}>
                            <button style={stepBtn} onClick={dec} disabled={price <= base}>−</button>
                            <div style={priceBox}>{price} ⚡{price > base && <span style={mult}> (×{Math.round(price / base)})</span>}</div>
                            <button style={stepBtn} onClick={inc} disabled={price >= base * 9}>+</button>
                        </div>
                        <button style={{ ...buyBtn, opacity: player.reps >= price ? 1 : 0.4 }} disabled={player.reps < price} onClick={buy}>Acheter pour {price} ⚡</button>
                        {msg && <div style={msgS}>{msg}</div>}
                    </div>
                )}

                <button style={closeBtn} onClick={close}>← Fermer</button>
            </div>
        </div>
    )
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 9300, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(8,6,18,0.85)", fontFamily: "'Courier New', monospace" }
const box: React.CSSProperties = { width: "min(420px,96vw)", background: "#1a1230", border: "2px solid #7a4ec0", borderRadius: 12, padding: 14, color: "#fff", boxShadow: "0 0 30px rgba(122,78,192,.3)" }
const head: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }
const title: React.CSSProperties = { fontSize: 16, fontWeight: 800, color: "#c9a8ff" }
const energy: React.CSSProperties = { fontSize: 12, color: "#ffd54a", fontWeight: 700 }
const tabs: React.CSSProperties = { display: "flex", gap: 6, marginBottom: 10 }
const tabBtn: React.CSSProperties = { flex: 1, padding: "7px 0", background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
const tabOn: React.CSSProperties = { background: "#7a4ec0", borderColor: "#7a4ec0" }
const body: React.CSSProperties = { minHeight: 180 }
const p: React.CSSProperties = { fontSize: 13, fontStyle: "italic", color: "#d8c8f0", margin: "0 0 8px" }
const ul: React.CSSProperties = { margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.5 }
const hint: React.CSSProperties = { marginTop: 10, fontSize: 12.5, lineHeight: 1.5, background: "rgba(255,213,74,0.1)", border: "1px dashed #ffd54a", borderRadius: 8, padding: "9px 11px", color: "#f3e0a0" }
const potionCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 12px" }
const small: React.CSSProperties = { fontSize: 11, opacity: 0.7 }
const freeLine: React.CSSProperties = { fontSize: 12.5, fontStyle: "italic", color: "#d8c8f0", margin: "12px 0 8px", lineHeight: 1.5 }
const priceRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 10, justifyContent: "center", margin: "6px 0 10px" }
const stepBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 8, background: "#2a1f44", color: "#fff", border: "1px solid #7a4ec0", fontSize: 20, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }
const priceBox: React.CSSProperties = { minWidth: 120, textAlign: "center", fontSize: 18, fontWeight: 800, color: "#ffd54a" }
const mult: React.CSSProperties = { fontSize: 11, color: "#9a8", opacity: 0.7 }
const buyBtn: React.CSSProperties = { width: "100%", padding: "11px 0", background: "#e0c020", color: "#1a1400", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }
const msgS: React.CSSProperties = { marginTop: 10, fontSize: 12.5, color: "#c9a8ff", textAlign: "center", fontStyle: "italic", lineHeight: 1.5 }
const closeBtn: React.CSSProperties = { marginTop: 12, width: "100%", padding: "9px 0", background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }
