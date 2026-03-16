
"use client"

import { useRef } from "react"

interface WorkoutEntryProps {
    league: string
    localSets: { pushups: (number | "")[]; pullups: (number | "")[]; squats: (number | "")[]; planks: (number | "")[] }
    setLocalSets: (sets: any) => void
    saving: boolean
    saveLogs: (forceHonor?: boolean) => Promise<void>
}

export default function WorkoutEntry({ league, localSets, setLocalSets, saving, saveLogs }: WorkoutEntryProps) {
    const lastInputRef = useRef<HTMLInputElement | null>(null)

    const addSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks') => {
        const current = localSets[type] || []
        const prevValue = current.length > 0 ? current[current.length - 1] : ""
        setLocalSets({ ...localSets, [type]: [...current, prevValue] })
        setTimeout(() => lastInputRef.current?.focus(), 10)
    }

    const removeSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number) => {
        setLocalSets({ ...localSets, [type]: (localSets[type] || []).filter((_, i) => i !== index) })
    }

    const handleSetChange = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number, val: string) => {
        const newSets = [...(localSets[type] || [])]
        if (val === "") {
            newSets[index] = ""
        } else {
            newSets[index] = parseInt(val) || 0
        }
        setLocalSets({ ...localSets, [type]: newSets })
    }

    const adjustSet = (type: 'pushups' | 'pullups' | 'squats' | 'planks', index: number, delta: number) => {
        const newSets = [...(localSets[type] || [])]
        const current = Number(newSets[index]) || 0
        newSets[index] = Math.max(0, current + delta)
        setLocalSets({ ...localSets, [type]: newSets })
    }

    const getSetEmoji = (reps: number) => {
        if (reps >= 50) return "👑";
        if (reps >= 40) return "🚀";
        if (reps >= 30) return "🦾";
        if (reps >= 20) return "🔥";
        if (reps >= 10) return "💪";
        return "";
    }

    const sumSets = (sets: (number | "")[]) => sets.reduce<number>((a, b) => a + (Number(b) || 0), 0)

    return (
        <div className="space-y-4">
            {league === 'GAINAGE' ? (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🧘</span>
                            <span className="font-black text-gray-800 uppercase text-xs">Gainage (Secondes)</span>
                        </div>
                        <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs">
                            {sumSets(localSets.planks)}s
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {localSets.planks.map((val, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2">
                                <div className="relative group">
                                    <input
                                        type="number"
                                        inputMode="numeric"
                                        value={val}
                                        placeholder="0"
                                        onChange={(e) => handleSetChange('planks', idx, e.target.value)}
                                        className="w-20 h-16 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center font-black text-gray-900 transition-all text-xl outline-none"
                                    />
                                    <button onClick={() => removeSet('planks', idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg">✕</button>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => adjustSet('planks', idx, -10)} className="w-8 h-8 bg-gray-100 rounded-lg font-black text-gray-500">-10</button>
                                    <button onClick={() => adjustSet('planks', idx, 10)} className="w-8 h-8 bg-blue-50 rounded-lg font-black text-blue-600">+10</button>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => addSet('planks')} className="w-20 h-16 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:text-blue-500 hover:border-blue-300 transition-all font-black text-2xl flex items-center justify-center">+</button>
                    </div>
                </div>
            ) : (
                (['pushups', 'pullups', 'squats'] as const).map(type => (
                    <div key={type} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{type === 'pushups' ? '💪' : type === 'pullups' ? '🦍' : '🦵'}</span>
                                <span className="font-black text-gray-800 uppercase text-xs">{type === 'pushups' ? 'Pompes' : type === 'pullups' ? 'Tractions' : 'Squats'}</span>
                            </div>
                            <span className="font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs">
                                {sumSets(localSets[type])} reps
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {(localSets[type] || []).map((val, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2">
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={val}
                                            placeholder="0"
                                            ref={idx === (localSets[type]?.length ?? 0) - 1 ? lastInputRef : null}
                                            onChange={(e) => handleSetChange(type, idx, e.target.value)}
                                            className="w-20 h-16 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-center font-black text-gray-900 transition-all text-xl outline-none"
                                        />
                                        {getSetEmoji(Number(val) || 0) && <span className="absolute -bottom-1 -left-1 text-xs">{getSetEmoji(Number(val) || 0)}</span>}
                                        <button onClick={() => removeSet(type, idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 text-white rounded-full text-xs font-black opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-lg">✕</button>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => adjustSet(type, idx, -5)} className="w-8 h-8 bg-gray-100 rounded-lg font-black text-gray-500">-5</button>
                                        <button onClick={() => adjustSet(type, idx, 5)} className="w-8 h-8 bg-blue-50 rounded-lg font-black text-blue-600">+5</button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addSet(type)} className="w-20 h-16 rounded-2xl border-2 border-dashed border-gray-200 text-gray-300 hover:text-blue-500 hover:border-blue-300 transition-all font-black text-2xl flex items-center justify-center">+</button>
                        </div>
                    </div>
                ))
            )}

            <button
                onClick={() => saveLogs()}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-3xl shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm transform active:scale-[0.98]"
            >
                {saving ? "Sauvegarde..." : "Valider la séance"}
            </button>
        </div>
    )
}
