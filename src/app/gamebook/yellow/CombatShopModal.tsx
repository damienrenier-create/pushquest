"use client"

// src/app/gamebook/yellow/CombatShopModal.tsx
//
// ZONE DE COMBAT — BOUTIQUE DE JETONS DE COMBAT (marchand du hub).
// Dépense les JC gagnés à la Tour/Usine/Dôme : énergie · CT rares · symboles de prestige.
// La dépense passe par le serveur (postSpend, débite les JC + ajoute le symbole atomiquement) ;
// la récompense (énergie/CT) est créditée côté client à la confirmation.

import { useState, useEffect } from "react"
import { usePlayer, grantReps, grantCt, addItem, addCaught, markCaughtThisRun, spendReps } from "@/lib/gamebook/yellow/store/playerStore"
import { getPokedex, markCaught } from "@/lib/gamebook/yellow/store/pokedexStore"
import { createMonInstance } from "@/lib/gamebook/yellow/battle/factory"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { persistYellowSave } from "@/lib/gamebook/yellow/store/saveManager"
import { fetchFrontierProfile, postSpend } from "@/lib/gamebook/yellow/frontier/frontierApi"
import { getCurrentNickname } from "@/lib/gamebook/yellow/store/gameStore"
import { getCt } from "@/lib/gamebook/yellow/data/cts"
import { getMove } from "@/lib/gamebook/yellow/data/moves"
import { HELD_ITEM_LIST, type HeldItemCategory } from "@/lib/gamebook/yellow/data/heldItems"

const INK = "#2a1c10", CREAM = "#f4ecd4", DARK = "#cdbb86"

const ENERGY = [{ amount: 250, price: 40 }, { amount: 600, price: 85 }]
const CT_LOT = ["ct08", "ct12", "ct14", "ct15", "ct16", "ct24", "ct20", "ct10"] // CT fortes (alternative aux badges)
const CT_PRICE = 120
const SYMBOLS = [
    { id: "sym_tour", emoji: "🏯", label: "Symbole de la Tour" },
    { id: "sym_usine", emoji: "🏭", label: "Symbole de l'Usine" },
    { id: "sym_dome", emoji: "🏆", label: "Symbole du Dôme" },
]
const SYMBOL_PRICE = 150
const HELD_GROUPS: { title: string; cat: HeldItemCategory }[] = [
    { title: "🎨 Objets de type (+10 % dégâts)", cat: "type" },
    { title: "💊 Soin", cat: "soin" },
    { title: "⚔️ Combat", cat: "combat" },
    { title: "⭐ Signatures (Daemon précis)", cat: "signature" },
]
// DAEMONS DE LÉGENDE : les Cerveaux/gardiens uniques (trio Gék + Sylvebarbe) rachetables au marchand si
// jamais capturés — voie de rattrapage HORS-PRIX (dernier recours du complétionniste). Livrés niv 60.
const LEGENDARY_LOT = ["gekroc", "gekraise", "gekosmic", "sylvebarbe"]
const LEGENDARY_PRICE = 1500
const LEGENDARY_LEVEL = 60

// COÛT D'ENTRÉE GROTTE (temporaire, Sartay) : 5 JC pour Mools (testeur), 2000 JC pour tous les autres → on garde
// la Grotte quasi-fermée au reste du groupe tant que le contenu (fusions sauvages, PNJ 7, biotopes) est en chantier.
const GROTTE_ENTRY_COST_MOOLS = 5
const GROTTE_ENTRY_COST_OTHERS = 2000
function grotteEntryCost(): number {
    return getCurrentNickname().normalize("NFC").toLowerCase() === "mools" ? GROTTE_ENTRY_COST_MOOLS : GROTTE_ENTRY_COST_OTHERS
}

export default function CombatShopModal({ onClose, onEnterGrotte }: { onClose: () => void; onEnterGrotte?: () => void }) {
    const player = usePlayer()
    const [jc, setJc] = useState<number | null>(null)
    const [symbols, setSymbols] = useState<string[]>([])
    const [busy, setBusy] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    useEffect(() => { fetchFrontierProfile().then((p) => { setJc(p.jc); setSymbols(p.symbols) }) }, [])

    const spend = async (price: number, opts: { symbol?: string; grant?: () => void; toast: string }) => {
        if (busy) return
        if (jc === null) { setMsg("Chargement du solde…"); return }
        if (jc < price) { setMsg(`Pas assez de Jetons (${price} requis, ${jc} dispo).`); return }
        setBusy(true); setMsg(null)
        const r = await postSpend(price, opts.symbol)
        setBusy(false)
        if (!r.ok) { setMsg("Achat refusé (solde serveur insuffisant)."); if (typeof r.jc === "number") setJc(r.jc); return }
        setJc(r.jc)
        if (r.symbols) setSymbols(r.symbols)
        if (opts.grant) { opts.grant(); persistYellowSave() }
        setMsg(opts.toast)
    }

    const ownedCt = (id: string) => player.ownedCts.includes(id) || player.boughtCts.includes(id)
    const ctOffer = CT_LOT.filter((id) => !ownedCt(id))
    const symOffer = SYMBOLS.filter((s) => !symbols.includes(s.id))
    const legendaryOffer = LEGENDARY_LOT.filter((id) => !!getSpecies(id) && !getPokedex().caught.includes(id))

    return (
        <div onClick={onClose} style={overlay}>
            <div onClick={(e) => e.stopPropagation()} style={box}>
                <div style={header}>🛒 BOUTIQUE DE JETONS <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 600 }}>Zone de Combat</span></div>
                <div style={{ padding: 12, overflowY: "auto", flex: 1 }}>
                    <div style={bar}>💠 Jetons de Combat : <b>{jc ?? "…"}</b></div>

                    {onEnterGrotte && (
                        <Section title="🕳️ Grotte du Nexus">
                            <div style={{ fontSize: 10, opacity: 0.7, color: INK, marginBottom: 6, lineHeight: 1.3 }}>Le casse-tête souterrain (Mt. Moon). Le passage se paie en Jetons de Combat.</div>
                            <Row label="⛏️ Entrer dans la Grotte" price={grotteEntryCost()} disabled={busy || (jc ?? 0) < grotteEntryCost()}
                                onBuy={() => spend(grotteEntryCost(), { grant: () => onEnterGrotte(), toast: "🕳️ Tu t'enfonces dans la Grotte du Nexus…" })} />
                        </Section>
                    )}

                    <Section title="⚡ Recharge d'énergie">
                        {ENERGY.map((e) => (
                            <Row key={e.amount} label={`+${e.amount} énergie`} price={e.price} disabled={busy || (jc ?? 0) < e.price}
                                onBuy={() => spend(e.price, { grant: () => grantReps(e.amount), toast: `✅ +${e.amount} énergie !` })} />
                        ))}
                    </Section>

                    {/* REPOUSSE — débloquée après avoir battu l'AVENTURIER (PNJ 3, Grotte B2F) : son frère marchand les vend. Payé en ÉNERGIE. */}
                    {player.defeatedTrainers.includes("y_pnj3_grotte_b2f") && (
                        <Section title="🧴 Repousses (de mon frère l'Aventurier)">
                            <div style={{ fontSize: 10, opacity: 0.7, color: INK, marginBottom: 6, lineHeight: 1.3 }}>Éloigne les Daemons sauvages 30 pas — à utiliser hors combat. Payé en énergie.</div>
                            <Row label={`🧴 Repousse${(player.items["repousse"] ?? 0) > 0 ? ` (×${player.items["repousse"]})` : ""}`} price={100} currency="⚡" disabled={busy || player.reps < 100}
                                onBuy={() => { if (spendReps(100)) { addItem("repousse", 1); persistYellowSave(); setMsg("✅ Repousse achetée ! (dans le sac → Exploration)") } else { setMsg("Pas assez d'énergie (100 requis).") } }} />
                        </Section>
                    )}

                    <Section title="💿 CT rares">
                        {ctOffer.length === 0 ? <Empty>Tu possèdes déjà toutes les CT du lot.</Empty> : ctOffer.map((id) => {
                            const ct = getCt(id); const mv = ct ? getMove(ct.moveId) : null
                            return <Row key={id} label={mv?.name ?? id} price={CT_PRICE} disabled={busy || (jc ?? 0) < CT_PRICE}
                                onBuy={() => spend(CT_PRICE, { grant: () => grantCt(id), toast: `✅ CT ${mv?.name ?? id} obtenue !` })} />
                        })}
                    </Section>

                    {HELD_GROUPS.map((g) => {
                        const items = HELD_ITEM_LIST.filter((it) => it.category === g.cat)
                        return (
                            <Section key={g.cat} title={`🎒 ${g.title}`}>
                                {items.map((it) => {
                                    const owned = player.items[it.id] ?? 0
                                    return <Row key={it.id} label={`${it.emoji} ${it.name}${owned > 0 ? ` (×${owned})` : ""}`} desc={it.description} price={it.jcPrice} disabled={busy || (jc ?? 0) < it.jcPrice}
                                        onBuy={() => spend(it.jcPrice, { grant: () => addItem(it.id, 1), toast: `✅ ${it.name} acheté !` })} />
                                })}
                            </Section>
                        )
                    })}

                    <Section title="🌟 Daemons de légende">
                        <div style={{ fontSize: 10, opacity: 0.7, color: INK, marginBottom: 6, lineHeight: 1.3 }}>Les gardiens uniques — dernier recours pour compléter ton Pokédex. Prix exorbitant.</div>
                        {legendaryOffer.length === 0 ? <Empty>Tous les gardiens sont déjà à toi. 🏅</Empty> : legendaryOffer.map((id) => {
                            const sp = getSpecies(id)
                            return <Row key={id} label={sp?.name ?? id} desc={`${(sp?.types ?? []).join(" / ")} · niv ${LEGENDARY_LEVEL} · exemplaire unique`} price={LEGENDARY_PRICE} disabled={busy || (jc ?? 0) < LEGENDARY_PRICE}
                                onBuy={() => spend(LEGENDARY_PRICE, { grant: () => { addCaught(createMonInstance(id, LEGENDARY_LEVEL)); markCaught(id); markCaughtThisRun(id) }, toast: `🌟 ${sp?.name ?? id} rejoint tes rangs !` })} />
                        })}
                    </Section>

                    <Section title="🎖️ Symboles de prestige">
                        {symOffer.length === 0 ? <Empty>Tous les symboles obtenus ! 🏅</Empty> : symOffer.map((s) => (
                            <Row key={s.id} label={`${s.emoji} ${s.label}`} price={SYMBOL_PRICE} disabled={busy || (jc ?? 0) < SYMBOL_PRICE}
                                onBuy={() => spend(SYMBOL_PRICE, { symbol: s.id, toast: `✅ ${s.label} obtenu !` })} />
                        ))}
                        {symbols.length > 0 && <div style={{ fontSize: 10, opacity: 0.7, color: INK, marginTop: 4 }}>Obtenus : {symbols.map((id) => SYMBOLS.find((s) => s.id === id)?.emoji ?? "🎖️").join(" ")}</div>}
                    </Section>

                    {msg && <div style={msgBox}>{msg}</div>}
                </div>
                <button onClick={onClose} style={closeBtn}>QUITTER</button>
            </div>
        </div>
    )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <div style={{ marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 800, color: INK, marginBottom: 6 }}>{title}</div>{children}</div>
}
function Row({ label, desc, price, onBuy, disabled, currency = "💠" }: { label: string; desc?: string; price: number; onBuy: () => void; disabled: boolean; currency?: string }) {
    return (
        <div style={row}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 12, color: INK, fontWeight: 700 }}>{label}</div>
                {desc && <div style={{ fontSize: 10, color: INK, opacity: 0.65, lineHeight: 1.3 }}>{desc}</div>}
            </div>
            <button onClick={onBuy} disabled={disabled} style={{ ...buyBtn, ...(disabled ? buyOff : {}) }}>{price} {currency}</button>
        </div>
    )
}
function Empty({ children }: { children: React.ReactNode }) {
    return <div style={{ fontSize: 11, opacity: 0.65, color: INK, paddingLeft: 2 }}>{children}</div>
}

const overlay: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 12 }
const box: React.CSSProperties = { background: CREAM, border: `3px solid ${INK}`, borderRadius: 10, width: "100%", maxWidth: 440, maxHeight: "86%", display: "flex", flexDirection: "column", boxShadow: "0 6px 24px rgba(0,0,0,0.5)", fontFamily: "system-ui, sans-serif" }
const header: React.CSSProperties = { padding: "10px 12px", borderBottom: `2px solid ${DARK}`, color: INK, fontWeight: 800, fontSize: 14 }
const bar: React.CSSProperties = { fontSize: 12, color: INK, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "6px 8px", marginBottom: 10, fontWeight: 700 }
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, padding: "6px 8px", marginBottom: 6 }
const buyBtn: React.CSSProperties = { background: INK, color: CREAM, border: "none", borderRadius: 6, fontWeight: 800, fontSize: 12, padding: "5px 10px", cursor: "pointer" }
const buyOff: React.CSSProperties = { background: DARK, cursor: "not-allowed" }
const msgBox: React.CSSProperties = { marginTop: 8, padding: 8, background: "#fff8e8", border: `1px solid ${DARK}`, borderRadius: 6, fontSize: 12, color: INK }
const closeBtn: React.CSSProperties = { margin: 10, marginTop: 0, padding: "8px 0", background: INK, color: CREAM, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }
