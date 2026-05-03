
"use client"

import { useState, useEffect, useRef } from "react"
import { X, Trophy, Swords, Reply, Flame } from "lucide-react"

interface NotificationToastProps {
    notification: {
        id: string
        message: string
        type: 'success' | 'error' | 'competitive'
        event?: any
        subType?: 'loss' | 'thief' | 'reaction'
    }
    onClose: () => void
    onReact?: (category: 'well_played' | 'revenge') => void
}

export default function NotificationToast({ notification, onClose, onReact }: NotificationToastProps) {
    const [isClosing, setIsClosing] = useState(false)
    const [showOptions, setShowOptions] = useState(false)
    const [offsetY, setOffsetY] = useState(0)
    const startY = useRef(0)
    const isDragging = useRef(false)

    // Auto-close if not competitive
    useEffect(() => {
        if (notification.type !== 'competitive' && !showOptions) {
            const timer = setTimeout(() => handleClose(), 5000)
            return () => clearTimeout(timer)
        }
    }, [notification.type, showOptions])

    const handleClose = () => {
        setIsClosing(true)
        setTimeout(onClose, 300)
    }

    const onTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        isDragging.current = true
        startY.current = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    }

    const onTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging.current) return
        const currentY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
        const diff = currentY - startY.current
        // Only allow upward swipe or subtle downward
        if (diff < 0) {
            setOffsetY(diff)
        }
    }

    const onTouchEnd = () => {
        isDragging.current = false
        if (offsetY < -50) {
            handleClose()
        } else {
            setOffsetY(0)
        }
    }

    const isCompetitive = notification.type === 'competitive'
    const isLoss = notification.subType === 'loss'
    const isThief = notification.subType === 'thief'
    const isReaction = notification.subType === 'reaction'

    return (
        <div 
            className={`fixed left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-sm transition-all duration-300 ${isClosing ? 'opacity-0 -translate-y-full scale-95' : 'opacity-100 scale-100'}`}
            style={{ 
                transform: `translate(-50%, ${offsetY}px)`,
                top: `calc(5rem + env(safe-area-inset-top))` 
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onTouchStart}
            onMouseMove={onTouchMove}
            onMouseUp={onTouchEnd}
            onMouseLeave={onTouchEnd}
        >
            <div className={`relative overflow-hidden rounded-3xl shadow-2xl border-2 transition-all ${
                isLoss ? 'bg-slate-900 border-red-500/50' : 
                isThief ? 'bg-slate-900 border-yellow-500/50' :
                isReaction ? 'bg-slate-900 border-blue-500/50' :
                notification.type === 'success' ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400'
            }`}>
                {/* Visual accents for competitive */}
                {isCompetitive && (
                    <div className="absolute inset-0 pointer-events-none opacity-20">
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-2xl ${isLoss ? 'bg-red-500' : isThief ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                    </div>
                )}

                <div className="p-4 flex items-start gap-4">
                    {/* Icon */}
                    <div className={`mt-1 p-2 rounded-2xl ${
                        isLoss ? 'bg-red-500/20 text-red-500' : 
                        isThief ? 'bg-yellow-500/20 text-yellow-500' :
                        isReaction ? 'bg-blue-500/20 text-blue-500' :
                        'bg-white/20 text-white'
                    }`}>
                        {isLoss ? <Swords size={20} /> : 
                         isThief ? <Trophy size={20} /> :
                         isReaction ? <Reply size={20} /> :
                         <Flame size={20} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 cursor-pointer" onClick={() => isLoss && setShowOptions(!showOptions)}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                            isLoss ? 'text-red-400' : 
                            isThief ? 'text-yellow-400' :
                            isReaction ? 'text-blue-400' :
                            'text-white/70'
                        }`}>
                            {isLoss ? 'Alerte Vol' : 
                             isThief ? 'Joli Coup' :
                             isReaction ? 'Réponse' :
                             'Notification'}
                        </h4>
                        <p className="text-white text-sm font-bold leading-tight">
                            {notification.message}
                        </p>
                        
                        {isLoss && !showOptions && (
                            <p className="text-[10px] text-slate-500 mt-2 font-bold animate-pulse">
                                Cliquez pour répondre...
                            </p>
                        )}
                    </div>

                    {/* Dismiss */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleClose(); }}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Reaction Options */}
                {isLoss && showOptions && (
                    <div className="p-4 pt-0 grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-2 duration-300">
                        <button 
                            onClick={() => onReact?.('well_played')}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                        >
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">😌</span>
                            <span className="text-[10px] font-black uppercase text-slate-400">Bien joué</span>
                        </button>
                        <button 
                            onClick={() => onReact?.('revenge')}
                            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                        >
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">😈</span>
                            <span className="text-[10px] font-black uppercase text-slate-400">Je reviens</span>
                        </button>
                    </div>
                )}
            </div>
            
            {/* Swipe hint */}
            <div className="mt-2 text-center">
                <div className="w-12 h-1 bg-white/10 rounded-full mx-auto"></div>
            </div>
        </div>
    )
}
