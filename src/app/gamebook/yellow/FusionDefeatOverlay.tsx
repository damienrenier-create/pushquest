"use client"
import { useEffect } from "react"

// LIGUE DE FUSION — GÉNÉRIQUE DE DÉFAITE (~5s). Overlay thématique « salle du Dieu Spaghetti » + RÉCAP : par quelle
// attaque chaque fusion est tombée (koLog, posé par le moteur via __lastHitBy). Auto-dismiss après 5s OU au toucher →
// onDone (= clearFusionDefeat, qui débloque le whiteout → renvoi à l'Autel). 100% autonome (styles inline).

const TAUNTS = [
    "« Trop de sauce pour toi, petit dresseur ! »",
    "« Tes chimères ont fini en bouillie… reviens plus AFFÛTÉ. »",
    "« La Ligue de Fusion ne pardonne pas. Retourne à l'Autel. »",
    "« Al dente, tes fusions ? Plutôt trop cuites ! »",
]

export function FusionDefeatOverlay({ koLog, onDone }: { koLog: { victim: string; move: string; by: string }[]; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 5000)
        return () => clearTimeout(t)
    }, [onDone])
    const taunt = TAUNTS[koLog.length % TAUNTS.length] // déterministe (pas de random au rendu)
    return (
        <div className="fdef" onClick={onDone} role="button" aria-label="Passer">
            <style>{`
                @keyframes fdefIn{from{opacity:0}to{opacity:1}}
                @keyframes fdefTitle{0%{transform:translateY(-28px) scale(.82);opacity:0}60%{transform:translateY(4px) scale(1.06)}100%{transform:translateY(0) scale(1);opacity:1}}
                @keyframes fdefRow{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
                @keyframes fdefDrip{from{background-position:0 -60px}to{background-position:0 0}}
                @keyframes fdefWob{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
                .fdef{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;cursor:pointer;overflow:hidden;
                    background:radial-gradient(130% 120% at 50% 0%,#2c0e0e 0%,#140708 55%,#000 100%);color:#f4e9d6;font-family:system-ui,-apple-system,sans-serif;animation:fdefIn .35s ease}
                .fdef .pasta{position:absolute;inset:0;opacity:.05;pointer-events:none;background-image:radial-gradient(circle,transparent 58%,#e0b23d 60%);background-size:56px 56px;animation:fdefDrip 3.2s linear infinite}
                .fdef .god{font-size:60px;animation:fdefTitle .55s ease both,fdefWob 2.6s ease-in-out .6s infinite;filter:drop-shadow(0 4px 16px rgba(224,178,61,.5))}
                .fdef .title{font-size:clamp(34px,9vw,46px);font-weight:900;letter-spacing:5px;color:#ff5a5a;margin:4px 0 2px;animation:fdefTitle .55s .08s ease both;text-shadow:0 2px 14px rgba(255,0,0,.45)}
                .fdef .taunt{font-style:italic;color:#e0b23d;font-size:15px;margin-bottom:20px;max-width:32ch;animation:fdefIn .8s .45s ease both}
                .fdef .list{display:flex;flex-direction:column;gap:8px;width:100%;max-width:460px}
                .fdef .row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:center;background:rgba(0,0,0,.38);border:1px solid rgba(224,178,61,.22);border-radius:11px;padding:9px 13px;font-size:14px;animation:fdefRow .42s ease both}
                .fdef .v{font-weight:800;color:#ff9a9a}.fdef .m{color:#ffcf5a;font-weight:700}.fdef .b{color:#9aa4b0}
                .fdef .skip{margin-top:24px;font-size:12px;color:#8a7e6a;letter-spacing:1px;animation:fdefIn 1s 1.2s ease both}
                @media(prefers-reduced-motion:reduce){.fdef,.fdef *{animation-duration:.01ms!important}}
            `}</style>
            <div className="pasta" />
            <div className="god">🍝</div>
            <div className="title">DÉFAITE</div>
            <div className="taunt">{taunt}</div>
            {koLog.length > 0 && (
                <div className="list">
                    {koLog.map((k, i) => (
                        <div className="row" key={i} style={{ animationDelay: `${0.55 + i * 0.32}s` }}>
                            <span className="v">{k.victim}</span>
                            <span className="b">K.O. par</span>
                            <span className="m">{k.move}</span>
                            {k.by && k.by !== "—" && <span className="b">de {k.by}</span>}
                        </div>
                    ))}
                </div>
            )}
            <div className="skip">▸ toucher l'écran pour passer</div>
        </div>
    )
}
