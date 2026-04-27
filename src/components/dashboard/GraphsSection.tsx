"use client"

import { Activity } from "lucide-react"

interface GraphsSectionProps {
    data: any
    graphPeriod: '30' | '365' | 'all'
    setGraphPeriod: (period: '30' | '365' | 'all') => void
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
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                            {graphPeriod === 'all' ? 'Performance depuis le lancement' : `Performance sur les ${graphPeriod} derniers jours`}
                        </p>
                    </div>
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                        <button onClick={() => setGraphPeriod('30')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${graphPeriod === '30' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>30J</button>
                        <button onClick={() => setGraphPeriod('365')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${graphPeriod === '365' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>365J</button>
                        <button onClick={() => setGraphPeriod('all')} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${graphPeriod === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>TOUT</button>
                    </div>
                </div>

                {(() => {
                    let daily = [];
                    if (data?.progressionData) {
                        daily = [...data.progressionData];
                        if (graphPeriod !== 'all') {
                            const days = graphPeriod === '30' ? 30 : 365;
                            daily = daily.slice(-days);
                        }
                    } else if (data?.graphs) {
                        daily = graphPeriod === '30' ? (data.graphs.myDaily || []) : (data.graphs.myDaily365 || data.graphs.myDaily || []);
                    }

                    // Remove leading zeroes for long-term views to zoom on actual activity
                    if (graphPeriod !== '30' && daily.length > 0) {
                        const firstActiveIndex = daily.findIndex((d: any) => (d.reps || d.total || 0) > 0);
                        if (firstActiveIndex > 0) {
                            daily = daily.slice(firstActiveIndex);
                        }
                    }
                    const t = daily.reduce((acc: any, d: any) => ({
                        reps: acc.reps + (d?.reps || d?.total || 0),
                        badges: acc.badges + (d?.badges || 0)
                    }), { reps: 0, badges: 0 })

                    if (daily.length === 0) return (
                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 grayscale space-y-4">
                            <Activity size={48} className="animate-pulse" />
                            <p className="font-black uppercase text-xs tracking-[0.2em]">Données insuffisantes</p>
                        </div>
                    );

                    const maxVal = Math.max(...daily.map((d: any) => d.reps || d.total || 0), 1);
                    const avg = Math.round(t.reps / (daily.length || 1));

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
                                        {Array.from({ length: graphPeriod === 'all' ? 10 : (graphPeriod === '365' ? 12 : 7) }).map((_, i) => (
                                            <div key={i} className="h-full w-px bg-slate-300" />
                                        ))}
                                    </div>

                                    {/* Bar Chart SVG */}
                                    <svg viewBox="0 0 1000 100" className="flex-1 h-full w-full overflow-visible" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                                            </linearGradient>
                                        </defs>
                                        {daily.map((d: any, i: number) => {
                                            const barWidth = 1000 / (daily.length || 1) * 0.8;
                                            const x = (i / daily.length) * 1000 + (1000 / daily.length * 0.1);
                                            const valHeight = ((d.reps || d.total || 0) / maxVal) * 100;
                                            const y = 100 - valHeight;
                                            return (
                                                <rect
                                                    key={i}
                                                    x={x}
                                                    y={y}
                                                    width={barWidth}
                                                    height={Math.max(2, valHeight)}
                                                    fill="url(#barGrad)"
                                                    rx={barWidth / 4}
                                                    className="transition-all duration-500 hover:fill-blue-500"
                                                />
                                            );
                                        })}
                                    </svg>
                                </div>

                                {/* X Axis Labels (More frequent) */}
                                <div className="absolute inset-x-8 bottom-6 flex justify-between text-[7px] font-black text-slate-400 uppercase tracking-widest pt-4">
                                    {(() => {
                                        const labelCount = graphPeriod === '30' ? 4 : (graphPeriod === 'all' ? 5 : 6);
                                        return Array.from({ length: labelCount }).map((_, i) => {
                                            const idx = Math.floor((i / (labelCount - 1)) * (daily.length - 1));
                                            const d = daily[idx];
                                            if (!d?.date) return null;
                                            const dateStr = new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                                            const isLast = i === labelCount - 1;
                                            return (
                                                <span key={i} className={isLast ? "text-blue-500" : ""}>
                                                    {isLast ? "AUJOURD'HUI" : dateStr}
                                                </span>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        🕒 Pic d'Activité (H)
                                    </h4>
                                    <div className="h-24 w-full flex items-end gap-1 px-2 pt-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        {(data?.hourlyData || []).map((h: any, i: number) => {
                                            const maxH = Math.max(...(data?.hourlyData || []).map((hd: any) => hd.reps), 1);
                                            const height = (h.reps / maxH) * 100;
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex-1 bg-indigo-500/20 rounded-t-sm hover:bg-indigo-500 transition-colors relative group"
                                                    style={{ height: `${Math.max(4, height)}%` }}
                                                >
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1.5 py-0.5 rounded-md whitespace-nowrap z-10">
                                                        {h.hour}h: {h.reps} reps
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <div className="flex justify-between text-[7px] font-black text-slate-400 px-1 uppercase">
                                        <span>00h</span>
                                        <span>06h</span>
                                        <span>12h</span>
                                        <span>18h</span>
                                        <span>23h</span>
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
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{t.reps.toLocaleString()}</p>
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
