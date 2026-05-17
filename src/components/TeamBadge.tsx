import { getTeamBadge, isTeamPeriodActive } from "@/lib/teamBadge";

export default function TeamBadge({ userId }: { userId: string }) {
  if (!isTeamPeriodActive(new Date())) return null;
  const badge = getTeamBadge(userId);
  if (!badge) return null;
  return <span className="ml-1 text-sm">{badge}</span>;
}
