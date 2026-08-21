"use client"

// FIN DE COMBAT — FICHE d'une créature qui vient d'ÉVOLUER. Affichée après la cinématique d'évolution (une par
// Daemon évolué, dépilée). Montre le nouveau stade : sprite, nom, types, niveau, + la fiche « premium » (Biologie
// & Écologie / Dicton / Note), avec repli sur la description historique. 100% autonome (styles inline).

import { useState } from "react"
import { getSpecies } from "@/lib/gamebook/yellow/data/species"
import { dexLore } from "@/lib/gamebook/yellow/data/dexLore"
import { dexSize, computeMensuration, formatSize, formatWeight } from "@/lib/gamebook/yellow/data/dexMensurations"
import type { MonInstance } from "@/lib/gamebook/yellow/battle/types"

const TYPE_COLOR: Record<string, string> = {
    NORMAL: "#9aa2ac", FEU: "#ff6b3d", EAU: "#4d90d5", PLANTE: "#5cbd57", ELEC: "#f2c633", GLACE: "#74cec0",
    COMBAT: "#d5546f", POISON: "#ab6ac8", SOL: "#d98a52", VOL: "#8fa9de", PSY: "#f97176", INSECTE: "#96c22c",
    ROCHE: "#c7b78b", SPECTRE: "#6f7bc5", DRAGON: "#3b7fd0", FEE: "#ec8fe6", METAL: "#79a0b2", TENEBRES: "#6a6376",
}

export function EvolvedFicheModal({ mon, onDone }: { mon: MonInstance; onDone: () => void }) {
    const [err, setErr] = useState(false)
    const sp = getSpecies(mon.speciesId)
    if (!sp) { return null }
    const lore = dexLore(sp.id)
    const nickname = mon.nickname && mon.nickname !== sp.name ? mon.nickname : null
    return (
        <div className="evofiche" onClick={onDone} role="button" aria-label="Continuer">
            <style>{`
                @keyframes efIn{from{opacity:0}to{opacity:1}}
                @keyframes efPop{0%{transform:scale(.7);opacity:0}70%{transform:scale(1.06)}100%{transform:scale(1);opacity:1}}
                @keyframes efSpark{0%,100%{transform:translateY(0) rotate(0);opacity:.5}50%{transform:translateY(-6px) rotate(12deg);opacity:1}}
                .evofiche{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:20px;
                    background:radial-gradient(120% 120% at 50% 0%,rgba(30,40,60,.92),rgba(8,10,16,.96));animation:efIn .3s ease;cursor:pointer}
                .evofiche .card{width:100%;max-width:420px;max-height:88vh;overflow-y:auto;background:#161b22;color:#e9edf2;border:1px solid #2a313a;
                    border-radius:16px;padding:18px 18px 14px;box-shadow:0 14px 40px rgba(0,0,0,.5);animation:efPop .4s ease both;font-family:system-ui,-apple-system,sans-serif}
                .evofiche .eyebrow{text-align:center;font-size:12px;letter-spacing:2px;color:#f5d020;font-weight:800;text-transform:uppercase}
                .evofiche .eyebrow .s{display:inline-block;animation:efSpark 1.4s ease-in-out infinite}
                .evofiche .sprwrap{display:flex;justify-content:center;margin:6px 0 4px}
                .evofiche .spr{width:132px;height:132px;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 6px 14px rgba(245,208,32,.25))}
                .evofiche .nm{text-align:center;font-size:21px;font-weight:900;letter-spacing:.5px}
                .evofiche .sub{text-align:center;font-size:12px;opacity:.7;margin-top:2px}
                .evofiche .chips{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:8px 0 4px}
                .evofiche .chip{font-size:10.5px;font-weight:800;letter-spacing:.4px;color:#0b0f10;padding:2px 9px;border-radius:999px}
                .evofiche .sec{border-top:1px solid rgba(255,255,255,.08);margin-top:10px;padding-top:9px;font-size:13px;line-height:1.5}
                .evofiche .sec b{color:#bcd0ff}
                .evofiche .dicton{font-style:italic;opacity:.85;text-align:center}
                .evofiche .btn{margin-top:14px;width:100%;padding:11px;border:none;border-radius:11px;background:#f5d020;color:#20242a;font-weight:800;font-size:14px;cursor:pointer}
                @media(prefers-reduced-motion:reduce){.evofiche,.evofiche *{animation-duration:.01ms!important}}
            `}</style>
            <div className="card" onClick={(e) => e.stopPropagation()}>
                <div className="eyebrow"><span className="s">✨</span> Nouvelle forme <span className="s">✨</span></div>
                <div className="sprwrap">
                    {err ? <div className="spr" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>{sp.name[0]}</div>
                        : <img className="spr" src={sp.sprite} alt={sp.name} onError={() => setErr(true)} />}
                </div>
                <div className="nm">{sp.name}</div>
                <div className="sub">N°{String(sp.dexNo).padStart(3, "0")} · N.{mon.level}{nickname ? ` · « ${nickname} »` : ""}</div>
                <div className="chips">
                    {sp.types.map((t) => <span key={t} className="chip" style={{ background: TYPE_COLOR[t] ?? "#888" }}>{t}</span>)}
                </div>
                {(() => {
                    const r = dexSize(sp.id)
                    if (!r) return null
                    const m = computeMensuration(r, mon.ivs, sp.baseStats)
                    return <div className="sub" style={{ marginTop: 4 }}>📏 {formatSize(m.sizeM)} · ⚖️ {formatWeight(m.weightKg)}</div>
                })()}
                {lore ? (
                    <>
                        <div className="sec">🔬 <b>Biologie &amp; Écologie</b><div style={{ marginTop: 3, opacity: 0.92 }}>{lore.ecology}</div></div>
                        <div className="sec dicton">« {lore.dicton} »</div>
                        <div className="sec">🧭 <b>Note de l'explorateur</b><div style={{ marginTop: 3, opacity: 0.92 }}>{lore.note}</div></div>
                    </>
                ) : (sp.description && <div className="sec dicton">« {sp.description} »</div>)}
                <button className="btn" onClick={onDone}>Continuer ▶</button>
            </div>
        </div>
    )
}
