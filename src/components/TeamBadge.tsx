"use client";

import { useEffect, useState } from "react";
import { getTeamBadge, isTeamPeriodActive } from "@/lib/teamBadge";

export default function TeamBadge({ userId }: { userId: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isTeamPeriodActive(new Date())) return null;
  const badge = getTeamBadge(userId);
  if (!badge) return null;
  return <span className="ml-1 text-sm">{badge}</span>;
}
