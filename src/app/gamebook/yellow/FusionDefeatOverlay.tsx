"use client"

// LIGUE DE FUSION — GÉNÉRIQUE DE DÉFAITE. Overlay thématique + RÉCAP : par quelle attaque chaque fusion est tombée
// (koLog, posé par le moteur via __lastHitBy). PAS d'auto-dismiss : le joueur DOIT cliquer « Retourner à l'Autel »
// (le bouton apparaît après le récap → lecture posée, sans minuteur). Raillerie PERSONNALISÉE selon le DRESSEUR qui
// a porté l'ultime K.O. onDone = clearFusionDefeat (débloque le whiteout → renvoi à l'Autel). 100% autonome.

const TAUNTS_BY_TRAINER: Record<string, string> = {
    "WILL": "« Ton esprit s'est fissuré avant tes chimères. La perfection psychique t'échappe encore. »",
    "KOGA": "« Mes chimères ont distillé ton venin goutte à goutte… jusqu'à l'agonie. Reviens quand tu seras immunisé. »",
    "BRUNO": "« Force brute contre fusions ! Tes chimères n'étaient que du papier mâché. »",
    "KAREN": "« Les faibles n'ont pas leur place dans l'ombre. Endurcis-toi, puis reviens me défier. »",
    "LANCE": "« Mes dragons-chimères t'ont réduit en cendres. Il te manque encore l'étoffe d'un Maître. »",
    "DIEU SPAGHETTI": "« Trop de sauce pour toi, petit dresseur ! Al dente, tes fusions ? Plutôt TROP CUITES ! »",
    "TON REFLET": "« Tu t'es incliné devant TOI-MÊME. Dépasse ta propre ombre, ou reste à jamais un challenger. »",
}
const DEFAULT_TAUNT = "« La Ligue de Fusion ne pardonne pas. Retourne à l'Autel plus AFFÛTÉ. »"

export function FusionDefeatOverlay({ trainerName, koLog, onDone }: { trainerName: string; koLog: { victim: string; move: string; by: string }[]; onDone: () => void }) {
    const taunt = TAUNTS_BY_TRAINER[trainerName] ?? DEFAULT_TAUNT
    return (
        <div className="fdef">
            <style>{`
                @keyframes fdefIn{from{opacity:0}to{opacity:1}}
                @keyframes fdefUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
                @keyframes fdefTitle{0%{transform:translateY(-28px) scale(.82);opacity:0}60%{transform:translateY(4px) scale(1.06)}100%{transform:translateY(0) scale(1);opacity:1}}
                @keyframes fdefRow{from{transform:translateX(-22px);opacity:0}to{transform:translateX(0);opacity:1}}
                @keyframes fdefDrip{from{background-position:0 -60px}to{background-position:0 0}}
                @keyframes fdefWob{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
                @keyframes fdefPulse{0%,100%{box-shadow:0 0 0 0 rgba(224,178,61,.5)}50%{box-shadow:0 0 0 8px rgba(224,178,61,0)}}
                .fdef{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;overflow:hidden;overflow-y:auto;
                    background:radial-gradient(130% 120% at 50% 0%,#2c0e0e 0%,#140708 55%,#000 100%);color:#f4e9d6;font-family:system-ui,-apple-system,sans-serif;animation:fdefIn .35s ease}
                .fdef .pasta{position:absolute;inset:0;opacity:.05;pointer-events:none;background-image:radial-gradient(circle,transparent 58%,#e0b23d 60%);background-size:56px 56px;animation:fdefDrip 3.2s linear infinite}
                .fdef .god{font-size:60px;animation:fdefTitle .55s ease both,fdefWob 2.6s ease-in-out .6s infinite;filter:drop-shadow(0 4px 16px rgba(224,178,61,.5))}
                .fdef .title{font-size:clamp(34px,9vw,46px);font-weight:900;letter-spacing:5px;color:#ff5a5a;margin:4px 0 0;animation:fdefTitle .55s .08s ease both;text-shadow:0 2px 14px rgba(255,0,0,.45)}
                .fdef .by{font-size:13px;font-weight:800;letter-spacing:2px;color:#e0b23d;margin:2px 0 8px;animation:fdefIn .8s .35s ease both}
                .fdef .taunt{font-style:italic;color:#f0dcb0;font-size:15px;margin-bottom:18px;max-width:34ch;line-height:1.5;animation:fdefIn .8s .55s ease both}
                .fdef .list{display:flex;flex-direction:column;gap:8px;width:100%;max-width:460px}
                .fdef .row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;justify-content:center;background:rgba(0,0,0,.38);border:1px solid rgba(224,178,61,.22);border-radius:11px;padding:9px 13px;font-size:14px;animation:fdefRow .42s ease both}
                .fdef .v{font-weight:800;color:#ff9a9a}.fdef .m{color:#ffcf5a;font-weight:700}.fdef .b{color:#9aa4b0}
                .fdef .skipbtn{margin-top:26px;padding:13px 26px;border:2px solid #e0b23d;border-radius:12px;background:rgba(224,178,61,.12);color:#ffe9b8;font-weight:800;font-size:15px;letter-spacing:1px;cursor:pointer;
                    animation:fdefUp .5s ${0.9 + koLog.length * 0.32}s ease both,fdefPulse 2s ${1.4 + koLog.length * 0.32}s ease-in-out infinite}
                .fdef .skipbtn:hover{background:rgba(224,178,61,.22)}
                @media(prefers-reduced-motion:reduce){.fdef,.fdef *{animation-duration:.01ms!important}}
            `}</style>
            <div className="pasta" />
            <div className="god">🍝</div>
            <div className="title">DÉFAITE</div>
            <div className="by">VAINCU PAR {trainerName}</div>
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
            <button className="skipbtn" onClick={onDone}>▸ RETOURNER À L'AUTEL</button>
        </div>
    )
}
