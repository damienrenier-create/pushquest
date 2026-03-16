
"use client"

import Link from "next/link"

interface CagnotteSectionProps {
    data: any
}

export default function CagnotteSection({ data }: CagnotteSectionProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-slate-900 rounded-[2rem] p-8 text-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 via-transparent to-transparent"></div>
                <p className="relative z-10 text-blue-400 font-black text-[10px] uppercase tracking-[0.4em] mb-4">Cagnotte des Amendes 💸</p>
                <p className="relative z-10 text-7xl font-black text-white italic tracking-tighter">{data?.cagnotte?.potEur ?? 0}€</p>

                <div className="relative z-10 mt-8 pt-8 border-t border-white/10">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">🎁 ON PEUT S'OFFRIR...</h4>
                    <div className="bg-white/10 px-6 py-4 rounded-3xl backdrop-blur-md border border-white/10">
                        <p className="text-2xl mb-1">✨</p>
                        <p className="text-white font-black text-lg uppercase tracking-tight">{data?.cagnotte?.currentReward?.label}</p>
                        {data?.cagnotte?.nextReward && (
                            <p className="text-blue-400 font-bold text-[10px] mt-2 italic uppercase">
                                Prochain palier : {data.cagnotte.nextReward.label} ({data.cagnotte.nextReward.min}€)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest">Leurs Pénitences, Nos Bières</h3>
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{data?.cagnotte?.finesList?.length || 0} contributeurs</span>
                </div>
                <div className="divide-y divide-gray-50">
                    {(data?.cagnotte?.finesList || []).map((f: any) => (
                        <div key={f.nickname} className="flex justify-between items-center p-5 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-black">
                                    {f.nickname.substring(0, 1).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-black text-gray-800 uppercase text-xs tracking-tighter">{f.nickname}</span>
                                    <span className="text-[10px] font-bold text-gray-400 mt-0.5">La grande famille te remercie ! 🍻</span>
                                </div>
                            </div>
                            <span className="font-black text-red-500 bg-red-50 px-4 py-1 rounded-full text-sm">{f.amount}€</span>
                        </div>
                    ))}
                    {(data?.cagnotte?.finesList || []).length === 0 && <p className="text-center py-10 font-black text-gray-300 uppercase italic text-xs leading-relaxed tracking-widest">Tout le monde est à jour. <br /> C'est suspect.</p>}
                </div>
            </div>
        </div>
    )
}
