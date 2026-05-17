import { isTeamPeriodActive } from "@/lib/teamBadge";

export default function TeamLore() {
  if (!isTeamPeriodActive(new Date())) return null;

  return (
    <div className="bg-amber-950/40 border border-amber-700/50 rounded-lg p-4 mb-6">
      <p className="text-amber-400 font-serif font-semibold mb-2">
        ⚔️ L&apos;Épreuve du Monstre en Spaghettis Volant
      </p>
      <p className="text-amber-200/80 italic font-serif text-sm leading-relaxed">
        &ldquo;Le Monstre en Spaghettis Volant a parlé dans la nuit du 17 mai.
        Sa volonté est claire&nbsp;: les aventuriers doivent prouver leur valeur
        avant d&apos;être touchés par Sa Nouille Sacrée.
        <br /><br />
        Deux clans ont été désignés. Ils disposent d&apos;une semaine pour affûter
        leurs armes, préparer leur stratégie, et intimider l&apos;adversaire.
        <br /><br />
        Le 25 mai, les paris ouvriront. Le 1er juin, les dés seront jetés.
        Une seule équipe recevra les faveurs de la divinité — et les XP
        qui vont avec.
        <br /><br />
        Que les aventuriers se préparent. RAmen. 🍝&rdquo;
      </p>
    </div>
  );
}
