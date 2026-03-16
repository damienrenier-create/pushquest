"use client"

import { Activity } from "lucide-react"

interface GraphsSectionProps {
    data: any
    graphPeriod: '30' | '365'
    setGraphPeriod: (period: '30' | '365') => void
}

export default function GraphsSection({ data, graphPeriod, setGraphPeriod }: GraphsSectionProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8 border-b border-gray-50 pb-4">
                    <div>
                        <h3 className="font-black text-xs text-slate-900 uppercase tracking-widest mb-1 flex items-center gap-2">
                             📈 Évolution du Volume
                        </h3>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Performance sur les {graphPeriod} derniers jours</p>
                    </div>
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button onClick={() => setGraphPeriod('30')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${graphPeriod === '30' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>30J</button>
                        <button onClick={() => setGraphPeriod('365')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${graphPeriod === '365' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>365J</button>
                    </div>
                </div>

                {(() => {
                    const dataset = graphPeriod === '365' ? data?.graphs?.myDaily365 : data?.graphs?.myDaily;
                    const daily = dataset || [];
                    const t = daily.reduce((acc: any, d: any) => ({
                        pushups: acc.pushups + (d?.pushups || 0),
                        pullups: acc.pullups + (d?.pullups || 0),
                        squats: acc.squats + (d?.squats || 0),
                        all: acc.all + (d?.total || 0)
                    }), { pushups: 0, pullups: 0, squats: 0, all: 0 })

                    if (t.all === 0) return (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 grayscale space-y-4">
                            <Activity size={48} className="animate-pulse" />
                            <p className="font-black uppercase text-xs tracking-[0.2em]">Données insuffisantes</p>
                        </div>
                    );

                    const maxVal = Math.max(...daily.map((d: any) => d.total || 0), 1);
                    const avg = Math.round(t.all / (daily.length || 1));

                    return (
                        <div className="space-y-10">
                            {/* Pro Chart with SVG Axes */}
                            <div className="relative h-72 w-full bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
                                <div className="absolute inset-x-8 top-8 bottom-16 flex border-l border-b border-slate-200">
                                    {/* Y Axis Labels */}
                                    <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-between text-[8px] font-black text-slate-400 text-right pr-2">
                                        <span>{maxVal}</span>
                                        <span>{Math.round(maxVal * 0.75)}</span>
                                        <span>{Math.round(maxVal / 2)}</span>
                                        <span>{Math.round(maxVal * 0.25)}</span>
                                        <span>0</span>
                                    </div>

                                    {/* Horizontal Grid */}
                                    <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
                                        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                                            <div key={p} className="w-full h-px bg-slate-200/50" />
                                        ))}
                                    </div>
                                    
                                    {/* Vertical Grid (Time intervals) */}
                                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                                        {Array.from({ length: graphPeriod === '365' ? 12 : 4 }).map((_, i) => (
                                            <div key={i} className="h-full w-px bg-slate-300" />
                                        ))}
                                    </div>

                                    {/* Line SVG */}
                                    <svg viewBox="0 0 1000 100" className="flex-1 h-full w-full overflow-visible" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        {/* Area fill */}
                                        <path
                                            d={`M 0 100 ${daily.map((d: any, i: number) => {
                                                const x = (i / Math.max(1, daily.length - 1)) * 1000;
                                                const y = 100 - ((d.total || 0) / maxVal) * 100;
                                                return `L ${x} ${y}`;
                                            }).join(' ')} L 1000 100 Z`}
                                            fill="url(#lineGrad)"
                                        />
                                        {/* Main Line */}
                                        <path
                                            d={`M ${daily.map((d: any, i: number) => {
                                                const x = (i / Math.max(1, daily.length - 1)) * 1000;
                                                const y = 100 - ((d.total || 0) / maxVal) * 100;
                                                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                            }).join(' ')}`}
                                            fill="none"
                                            stroke="#3b82f6"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="drop-shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                                        />
                                        {/* Data Points (Dots) */}
                                        {daily.map((d: any, i: number) => {
                                            const x = (i / Math.max(1, daily.length - 1)) * 1000;
                                            const y = 100 - ((d.total || 0) / maxVal) * 100;
                                            // Only show dots if there are not too many points
                                            if (graphPeriod === '365' && i % 7 !== 0) return null;
                                            return (
                                                <circle 
                                                    key={i} 
                                                    cx={x} 
                                                    cy={y} 
                                                    r={graphPeriod === '30' ? "4" : "3"} 
                                                    fill="white" 
                                                    stroke="#3b82f6" 
                                                    strokeWidth="2"
                                                />
                                            );
                                        })}
                                    </svg>
                                </div>

                                {/* X Axis Labels */}
                                <div className="absolute inset-x-8 bottom-6 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest pt-4">
                                    <span>{daily[0]?.date ? new Date(daily[0].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</span>
                                    {graphPeriod === '30' && daily.length > 15 && (
                                        <span>{new Date(daily[Math.floor(daily.length/2)].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                                    )}
                                    <span className="text-blue-500">AUJOURD'HUI</span>
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mix d'Entraînement</h4>
                                    <div className="h-4 w-full flex rounded-full overflow-hidden shadow-inner font-black text-white text-[8px]">
                                        {t.pushups > 0 && <div className="bg-blue-500 h-full flex items-center justify-center border-r border-white/10" style={{ width: `${(t.pushups / t.all) * 100}%` }}>{Math.round((t.pushups / t.all) * 100)}%</div>}
                                        {t.pullups > 0 && <div className="bg-orange-500 h-full flex items-center justify-center border-r border-white/10" style={{ width: `${(t.pullups / t.all) * 100}%` }}>{Math.round((t.pullups / t.all) * 100)}%</div>}
                                        {t.squats > 0 && <div className="bg-emerald-500 h-full flex items-center justify-center" style={{ width: `${(t.squats / t.all) * 100}%` }}>{Math.round((t.squats / t.all) * 100)}%</div>}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-xs font-black text-slate-700">{t.pushups}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase">Pompes</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-xs font-black text-slate-700">{t.pullups}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase">Tractions</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded-xl text-center">
                                            <p className="text-xs font-black text-slate-700">{t.squats}</p>
                                            <p className="text-[7px] font-bold text-slate-400 uppercase">Squats</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-900 rounded-3xl p-5 text-center flex flex-col justify-center border border-slate-800 shadow-xl">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne / Jour</p>
                                        <p className="text-3xl font-black text-white tracking-tighter italic">{avg}</p>
                                        <p className="text-[8px] font-black text-indigo-400 uppercase mt-1">REPS</p>
                                    </div>
                                    <div className="bg-white rounded-3xl p-5 text-center flex flex-col justify-center border border-slate-100 shadow-sm">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Volume Total</p>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{t.all.toLocaleString()}</p>
                                        <p className="text-[8px] font-black text-blue-500 uppercase mt-1">REPS</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })()}
            </div>
        </div>
    )
}
