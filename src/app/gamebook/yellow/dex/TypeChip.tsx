"use client"

// Nexus Jaune Éclair — badge de type CLIQUABLE. Redirige vers la table des types
// en mettant le type en avant (?type=XXX). Utilisé partout où un type s'affiche.

import { useRouter } from "next/navigation"
import type { PokeType } from "@/lib/gamebook/yellow/battle/types"
import { TYPE_COLORS } from "./dexShared"

export function typeChartHref(type: PokeType): string {
    return `/gamebook/yellow/dex/types?type=${type}`
}

export default function TypeChip({ type, big, style }: { type: PokeType; big?: boolean; style?: React.CSSProperties }) {
    const router = useRouter()
    const go = () => router.push(typeChartHref(type))
    return (
        <span
            role="button"
            tabIndex={0}
            title={`Voir ${type} dans la table des types`}
            onClick={(e) => { e.stopPropagation(); go() }}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); e.preventDefault(); go() }
            }}
            style={{ ...base, ...(big ? bigStyle : {}), background: TYPE_COLORS[type], ...style }}
        >{type}</span>
    )
}

const base: React.CSSProperties = {
    fontSize: 8, fontWeight: 700, color: "#fff", padding: "2px 6px", borderRadius: 4,
    letterSpacing: 0.5, textShadow: "0 1px 1px rgba(0,0,0,0.4)", display: "inline-block", cursor: "pointer",
}
const bigStyle: React.CSSProperties = { fontSize: 11, padding: "4px 10px", borderRadius: 5 }
