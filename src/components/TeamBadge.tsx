/**
 * TeamBadge — Server Component
 * Affiche la pastille d'équipe (🟡 ou 🔴) à côté d'un nickname.
 * Évalue isTeamPeriodActive() côté serveur avec new Date() — pas de flash hydratation.
 */

import { getTeamBadge, isTeamPeriodActive } from "@/lib/teamBadge";

interface TeamBadgeProps {
  userId: string;
  className?: string;
}

export default function TeamBadge({ userId, className = "ml-1" }: TeamBadgeProps) {
  if (!isTeamPeriodActive()) return null;

  const badge = getTeamBadge(userId);
  if (!badge) return null;

  return (
    <span
      className={className}
      title={badge === "🟡" ? "Équipe Jaune" : "Équipe Rouge"}
      aria-label={badge === "🟡" ? "Équipe Jaune" : "Équipe Rouge"}
    >
      {badge}
    </span>
  );
}
