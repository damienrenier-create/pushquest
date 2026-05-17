"use client";

import { useEffect, useState } from "react";
import { getTeamBadge, isTeamPeriodActive } from "@/lib/teamBadge";

export default function TeamBadge({ userId, showText = false }: { userId: string; showText?: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isTeamPeriodActive(new Date())) return null;
  const badge = getTeamBadge(userId);
  if (!badge) return null;

  if (showText) {
    const text = badge === "🟡" ? "TEAM JAUNE" : "TEAM ROUGE";
    const color = badge === "🟡" ? "text-amber-400" : "text-red-400";
    return (
      <span className={`ml-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black tracking-wider ${color} uppercase`}>
        {badge} {text}
      </span>
    );
  }

  return <span className="ml-1 text-sm">{badge}</span>;
}
