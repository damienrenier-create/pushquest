"use client"

import { Activity, Users, TrendingUp, ChevronDown, Calendar, Target } from "lucide-react"
import { useState, useEffect, useMemo, useRef } from "react"

interface GraphsSectionProps {
    data: any
    graphPeriod: '30' | '365' | 'all'
    setGraphPeriod: (period: '30' | '365' | 'all') => void
}

const COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', 
    '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6', '#3b82f6'
];

type Metric = 'xp' | 'level' | 'pushups' | 'pullups' | 'squats' | 'planks';

export default function GraphsSection({ data, graphPeriod, setGraphPeriod }: GraphsSectionProps) {
    const [viewMode, setViewMode] = useState<'activity' | 'progression'>('activity');
    const [progressionData, setProgressionData] = useState<any[]>([]);
    const [loadingProgression, setLoadingProgression] = useState(false);
    const [selectedMetric, setSelectedMetric] = useState<Metric>('xp');
    const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set());
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const chartRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (viewMode === 'progression' && progressionData.length === 0) {
            fetchProgression();
        }
    }, [viewMode]);

    async function fetchProgression() {
        setLoadingProgression(true);
        try {
            const res = await fetch('/api/dashboard/progression');
            if (res.ok) {
                const d = await res.json();
                setProgressionData(d);
            }
        } catch (err) {
            console.error("Progression fetch error:", err);
        } finally {
            setLoadingProgression(false);
        }
    }

    const toggleUser = (userId: string) => {
        const newHidden = new Set(hiddenUsers);
        if (newHidden.has(userId)) newHidden.delete(userId);
        else newHidden.add(userId);
        setHiddenUsers(newHidden);
    };

    const metricLabels: Record<Metric, string> = {
        xp: 'XP Total',
        level: 'Niveau',
        pushups: 'Pompes',
        pullups: 'Tractions',
        squats: 'Squats',
        planks: 'Gainage'
    };

    const filteredProgression = useMemo(() => {
        if (!progressionData.length) return [];
        return progressionData.map((user, idx) => ({
            ...user,
            color: COLORS[idx % COLORS.length]
        }));
    }, [progressionData]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!chartRef.current || filteredProgression.length === 0) return;
        const rect = chartRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const dateCount = filteredProgression[0]?.timeline?.length || 0;
        if (dateCount < 2) return;
        
        const index = Math.round((x / width) * (dateCount - 1));
        setHoveredIndex(Math.max(0, Math.min(dateCount - 1, index)));
    };

    // Helper to generate smooth SVG path (Cubic Bezier)
    const getSmoothPath = (data: number[], maxVal: number) => {
        if (data.length < 2) return "";
        const points = data.map((val, i) => ({
            x: (i / (data.length - 1)) * 1000,
            y: 100 - (val / maxVal) * 100
        }));

        let d = `M ${points[0].x},${points[0].y}`;
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i];
            const p1 = points[i + 1];
            const cp1x = p0.x + (p1.x - p0.x) / 2;
            d += ` C ${cp1x},${p0.y} ${cp1x},${p1.y} ${p1.x},${p1.y}`;
        }
        return d;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* View Mode Toggle - Premium Segmented Control */}
            <div className="flex bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl w-fit border border-gray-200/50 shadow-inner">
                <button 
                    onClick={() => setViewMode('activity')}
                    className={`flex items-center gap-2 px-6 py-2.5 text-[11px] font-black rounded-xl transition-all duration-300 ${viewMode === 'activity' ? 'bg-white text-blue-600 shadow-md scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Activity size={15} className={viewMode === 'activity' ? 'animate-pulse' : ''} />
                    <span className="tracking-widest">ACTIVITÉ</span>
                </button>
                <button 
                    onClick={() => setViewMode('progression')}
                    className={`flex items-center gap-2 px-6 py-2.5 text-[11px] font-black rounded-xl transition-all duration-300 ${viewMode === 'progression' ? 'bg-white text-indigo-600 shadow-md scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <TrendingUp size={15} className={viewMode === 'progression' ? 'animate-bounce' : ''} />
                    <span className="tracking-widest">ÉVOLUTION</span>
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-slate-100 transition-all duration-700 relative overflow-hidden">
                {viewMode === 'activity' ? (
                    <>
                        <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
                            <div>
                                <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-1.5 flex items-center gap-2.5">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Activity size={18} /></div>
                                    Volume d'Entraînement
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    {graphPeriod === 'all' ? 'Statistiques globales' : `Rétrospective des ${graphPeriod} derniers jours`}
                                </p>
                            </div>
                            <div className="flex gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                                {(['30', '365', 'all'] as const).map(p => (
                                    <button 
                                        key={p}
                                        onClick={() => setGraphPeriod(p)} 
                                        className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all duration-300 ${graphPeriod === p ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                    >
                                        {p === 'all' ? 'MAX' : `${p}J`}
                                    </button>
                                ))}
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

                            if (graphPeriod !== '30' && daily.length > 0) {
                                const firstActiveIndex = daily.findIndex((d: any) => (d.reps || d.total || 0) > 0);
                                if (firstActiveIndex > 0) daily = daily.slice(firstActiveIndex);
                            }
                            const t = daily.reduce((acc: any, d: any) => ({
                                reps: acc.reps + (d?.reps || d?.total || 0),
                                badges: acc.badges + (d?.badges || 0)
                            }), { reps: 0, badges: 0 })

                            if (daily.length === 0) return (
                                <div className="py-24 flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                                    <div className="p-6 bg-slate-50 rounded-full animate-pulse"><Activity size={48} className="text-slate-300" /></div>
                                    <p className="font-black uppercase text-xs tracking-[0.3em] text-slate-400">En attente de données</p>
                                </div>
                            );

                            const maxVal = Math.max(...daily.map((d: any) => d.reps || d.total || 0), 1);
                            const avg = Math.round(t.reps / (daily.length || 1));

                            return (
                                <div className="space-y-12">
                                    <div className="relative h-80 w-full bg-slate-50/30 rounded-[2rem] p-8 border border-slate-100 shadow-inner group">
                                        <div className="absolute inset-x-8 top-8 bottom-16 flex border-l border-b border-slate-200">
                                            <div className="absolute -left-10 top-0 bottom-0 flex flex-col justify-between text-[9px] font-black text-slate-300 text-right pr-3">
                                                <span>{maxVal}</span>
                                                <span>{Math.round(maxVal / 2)}</span>
                                                <span>0</span>
                                            </div>
                                            <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pointer-events-none opacity-50">
                                                {[0, 0.5, 1].map((p) => (
                                                    <div key={p} className="w-full h-px bg-slate-200" />
                                                ))}
                                            </div>
                                            <svg viewBox="0 0 1000 100" className="flex-1 h-full w-full overflow-visible" preserveAspectRatio="none">
                                                <defs>
                                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.9" />
                                                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.3" />
                                                    </linearGradient>
                                                </defs>
                                                {daily.map((d: any, i: number) => {
                                                    const barWidth = 1000 / (daily.length || 1) * 0.7;
                                                    const x = (i / daily.length) * 1000 + (1000 / daily.length * 0.15);
                                                    const valHeight = ((d.reps || d.total || 0) / maxVal) * 100;
                                                    const y = 100 - valHeight;
                                                    return (
                                                        <rect
                                                            key={i} x={x} y={y} width={barWidth} height={Math.max(1.5, valHeight)}
                                                            fill="url(#barGrad)" rx={barWidth / 3}
                                                            className="transition-all duration-500 hover:fill-blue-500 hover:brightness-110 cursor-pointer"
                                                        />
                                                    );
                                                })}
                                            </svg>
                                        </div>
                                        <div className="absolute inset-x-8 bottom-6 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest pt-4">
                                            {(() => {
                                                const labelCount = graphPeriod === '30' ? 4 : 5;
                                                return Array.from({ length: labelCount }).map((_, i) => {
                                                    const idx = Math.floor((i / (labelCount - 1)) * (daily.length - 1));
                                                    const d = daily[idx];
                                                    if (!d?.date) return null;
                                                    const isLast = i === labelCount - 1;
                                                    return <span key={i} className={isLast ? "text-blue-500 font-black scale-110" : ""}>{isLast ? "AUJOURD'HUI" : new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>;
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                                        <div className="lg:col-span-7 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] flex items-center gap-2">
                                                    <Calendar size={14} className="text-indigo-400" /> Intensité Horaire
                                                </h4>
                                                <span className="text-[9px] font-bold text-slate-300">MOYENNE 24H</span>
                                            </div>
                                            <div className="h-32 w-full flex items-end gap-1.5 px-4 py-5 bg-slate-50/50 rounded-3xl border border-slate-100/50 shadow-inner">
                                                {(data?.hourlyData || []).map((h: any, i: number) => {
                                                    const maxH = Math.max(...(data?.hourlyData || []).map((hd: any) => hd.reps), 1);
                                                    const height = (h.reps / maxH) * 100;
                                                    return (
                                                        <div key={i} className="flex-1 bg-gradient-to-t from-indigo-500/10 to-indigo-500/40 rounded-full hover:to-indigo-500 transition-all duration-300 relative group" style={{ height: `${Math.max(6, height)}%` }}>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-xl border border-slate-700">
                                                                {h.hour}H • {h.reps} REPS
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex justify-between text-[8px] font-black text-slate-300 px-2 uppercase tracking-tighter">
                                                <span>00h</span><span>04h</span><span>08h</span><span>12h</span><span>16h</span><span>20h</span><span>23h</span>
                                            </div>
                                        </div>
                                        <div className="lg:col-span-5 grid grid-cols-2 gap-5">
                                            <div className="bg-slate-950 rounded-[2rem] p-6 flex flex-col justify-between border border-slate-800 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Moyenne</p>
                                                <div>
                                                    <p className="text-4xl font-black text-white tracking-tighter italic leading-none">{avg}</p>
                                                    <p className="text-[10px] font-black text-blue-400 uppercase mt-2 tracking-[0.2em]">REPS / JOUR</p>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-[2rem] p-6 flex flex-col justify-between border border-slate-100 shadow-xl relative overflow-hidden group">
                                                <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Période</p>
                                                <div>
                                                    <p className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none">{t.reps.toLocaleString()}</p>
                                                    <p className="text-[10px] font-black text-indigo-500 uppercase mt-2 tracking-[0.2em]">EFFORTS</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </>
                ) : (
                    <div className="space-y-10 animate-in fade-in duration-1000">
                        {/* Progression Header */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50 pb-8">
                            <div>
                                <h3 className="font-black text-sm text-slate-900 uppercase tracking-widest mb-1.5 flex items-center gap-2.5">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Users size={18} /></div>
                                    Course à la Progression
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Analyse comparative des trajectoires de performance
                                </p>
                            </div>

                            {/* Metric Selector - Modern Tabs */}
                            <div className="flex flex-wrap gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 shadow-inner">
                                {(Object.keys(metricLabels) as Metric[]).map(m => (
                                    <button 
                                        key={m}
                                        onClick={() => { setSelectedMetric(m); setHoveredIndex(null); }}
                                        className={`px-4 py-2 text-[10px] font-black rounded-xl transition-all duration-300 ${selectedMetric === m ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'}`}
                                    >
                                        {metricLabels[m]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {loadingProgression ? (
                            <div className="py-40 flex flex-col items-center justify-center space-y-6">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                                </div>
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-500 animate-pulse">Synchronisation des données...</p>
                            </div>
                        ) : filteredProgression.length === 0 ? (
                            <div className="py-40 flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                                <div className="p-6 bg-slate-50 rounded-full animate-pulse"><Users size={48} className="text-slate-300" /></div>
                                <p className="font-black uppercase text-xs tracking-[0.3em] text-slate-400">Aucun historique trouvé</p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {/* Multi-Line Area Chart */}
                                <div className="relative h-[28rem] w-full bg-gradient-to-b from-slate-50/30 to-white rounded-[3rem] p-10 border border-slate-100 shadow-inner overflow-visible">
                                    {(() => {
                                        const visibleUsers = filteredProgression.filter(u => !hiddenUsers.has(u.id));
                                        const allValues = visibleUsers.flatMap(u => u.timeline.map((t: any) => t[selectedMetric]));
                                        const maxVal = Math.max(...allValues, 1);
                                        const dateCount = filteredProgression[0]?.timeline?.length || 0;

                                        return (
                                            <div className="relative h-full w-full" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIndex(null)}>
                                                <div className="absolute inset-x-0 top-0 bottom-16 flex border-l border-b border-slate-200">
                                                    {/* Y Axis Labels */}
                                                    <div className="absolute -left-12 top-0 bottom-0 flex flex-col justify-between text-[9px] font-black text-slate-300 text-right pr-4">
                                                        <span>{maxVal.toLocaleString()}</span>
                                                        <span>{(maxVal * 0.75).toLocaleString()}</span>
                                                        <span>{(maxVal * 0.5).toLocaleString()}</span>
                                                        <span>{(maxVal * 0.25).toLocaleString()}</span>
                                                        <span>0</span>
                                                    </div>

                                                    {/* Vertical Grid lines */}
                                                    <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
                                                        {Array.from({ length: 6 }).map((_, i) => (
                                                            <div key={i} className="h-full w-px bg-slate-300" />
                                                        ))}
                                                    </div>

                                                    {/* Horizontal Grid lines */}
                                                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                                                        {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                                                            <div key={p} className="w-full h-px bg-slate-300" />
                                                        ))}
                                                    </div>

                                                    <svg ref={chartRef} viewBox={`0 0 1000 100`} className="flex-1 h-full w-full overflow-visible" preserveAspectRatio="none">
                                                        <defs>
                                                            {visibleUsers.map(user => (
                                                                <linearGradient key={`grad-${user.id}`} id={`grad-${user.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                    <stop offset="0%" stopColor={user.color} stopOpacity="0.15" />
                                                                    <stop offset="100%" stopColor={user.color} stopOpacity="0" />
                                                                </linearGradient>
                                                            ))}
                                                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                                                <feGaussianBlur stdDeviation="2" result="blur" />
                                                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                            </filter>
                                                        </defs>

                                                        {/* Horizontal Tracker Line */}
                                                        {hoveredIndex !== null && (
                                                            <line 
                                                                x1={(hoveredIndex / (dateCount - 1)) * 1000} 
                                                                x2={(hoveredIndex / (dateCount - 1)) * 1000} 
                                                                y1="0" y2="100" 
                                                                stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4"
                                                                className="transition-all duration-100"
                                                            />
                                                        )}

                                                        {visibleUsers.map((user) => {
                                                            const smoothPath = getSmoothPath(user.timeline.map((t: any) => t[selectedMetric]), maxVal);
                                                            const areaPath = `${smoothPath} L 1000,100 L 0,100 Z`;

                                                            return (
                                                                <g key={user.id} className="transition-opacity duration-500">
                                                                    <path 
                                                                        d={areaPath} fill={`url(#grad-${user.id})`}
                                                                        className="transition-all duration-700"
                                                                    />
                                                                    <path
                                                                        d={smoothPath} fill="none" stroke={user.color} strokeWidth="3.5"
                                                                        strokeLinecap="round" strokeLinejoin="round"
                                                                        filter="url(#glow)"
                                                                        className="drop-shadow-lg transition-all duration-700"
                                                                        style={{ strokeDasharray: '5000', strokeDashoffset: '0', animation: 'draw 2.5s ease-out' }}
                                                                    />
                                                                    {/* Interactive Dot */}
                                                                    {hoveredIndex !== null && (
                                                                        <circle 
                                                                            cx={(hoveredIndex / (dateCount - 1)) * 1000} 
                                                                            cy={100 - (user.timeline[hoveredIndex][selectedMetric] / maxVal) * 100} 
                                                                            r="5" fill="white" stroke={user.color} strokeWidth="2.5"
                                                                            className="shadow-xl transition-all duration-100"
                                                                        />
                                                                    )}
                                                                </g>
                                                            );
                                                        })}
                                                    </svg>
                                                </div>

                                                {/* X Axis Labels */}
                                                <div className="absolute inset-x-0 bottom-4 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest pt-6 border-t border-slate-50">
                                                    {(() => {
                                                        const labelCount = 5;
                                                        const timeline = filteredProgression[0]?.timeline || [];
                                                        return Array.from({ length: labelCount }).map((_, i) => {
                                                            const idx = Math.floor((i / (labelCount - 1)) * (timeline.length - 1));
                                                            const d = timeline[idx];
                                                            if (!d?.date) return null;
                                                            return <span key={i} className="hover:text-slate-900 transition-colors cursor-default">{new Date(d.date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })}</span>;
                                                        });
                                                    })()}
                                                </div>

                                                {/* Hover Tooltip - Floating Glassmorphism */}
                                                {hoveredIndex !== null && chartRef.current && (
                                                    <div 
                                                        className="absolute top-0 pointer-events-none z-30 transition-all duration-100"
                                                        style={{ 
                                                            left: `${(hoveredIndex / (dateCount - 1)) * 100}%`,
                                                            transform: `translateX(${hoveredIndex > dateCount / 2 ? '-110%' : '10%'})`
                                                        }}
                                                    >
                                                        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-4 rounded-2xl shadow-2xl space-y-3 min-w-[160px]">
                                                            <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 pb-2">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {new Date(filteredProgression[0].timeline[hoveredIndex].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                                                                </span>
                                                                <Target size={12} className="text-slate-500" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                {visibleUsers.map(user => (
                                                                    <div key={user.id} className="flex items-center justify-between gap-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: user.color }}></div>
                                                                            <span className="text-[10px] font-bold text-white truncate max-w-[80px]">{user.nickname}</span>
                                                                        </div>
                                                                        <span className="text-[11px] font-black text-white italic">
                                                                            {user.timeline[hoveredIndex][selectedMetric].toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Interactive Legend - Modern Pills with Avatars */}
                                <div className="flex flex-wrap gap-4 justify-center px-4">
                                    {filteredProgression.map((user: any) => {
                                        const isHidden = hiddenUsers.has(user.id);
                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => toggleUser(user.id)}
                                                className={`flex items-center gap-3 pl-1.5 pr-5 py-1.5 rounded-full border transition-all duration-300 scale-in-center ${
                                                    isHidden ? 'bg-slate-50 border-slate-100 opacity-40 grayscale' : 'bg-white border-slate-100 shadow-lg shadow-slate-200/50 hover:scale-105 active:scale-95'
                                                }`}
                                            >
                                                <div className="relative">
                                                    <img 
                                                        src={user.image || `https://ui-avatars.com/api/?name=${user.nickname}&background=random`} 
                                                        alt={user.nickname}
                                                        className="w-8 h-8 rounded-full object-cover border-2 transition-all"
                                                        style={{ borderColor: isHidden ? '#e2e8f0' : user.color }}
                                                    />
                                                    {!isHidden && <div className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: user.color }}></div>}
                                                </div>
                                                <div className="text-left">
                                                    <p className={`text-[11px] font-black uppercase tracking-tight leading-none ${isHidden ? 'text-slate-400' : 'text-slate-800'}`}>
                                                        {user.nickname}
                                                    </p>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                        {user.timeline[user.timeline.length-1][selectedMetric].toLocaleString()} {metricLabels[selectedMetric].split(' ')[0]}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes draw {
                    from { stroke-dashoffset: 5000; }
                    to { stroke-dashoffset: 0; }
                }
                .scale-in-center {
                    animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
                }
                @keyframes scale-in-center {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
