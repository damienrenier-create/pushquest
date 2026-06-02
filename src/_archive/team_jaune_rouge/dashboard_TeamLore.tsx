"use client"

// TeamLore — Bloc parchemin narratif de la Semaine des Équipes
// Affiché au-dessus du tableau de scores dans l'onglet Paris.

export default function TeamLore() {
  return (
    <div className="bg-amber-950/40 border border-amber-700/50 rounded-2xl p-5 mb-6">
      <p className="text-amber-400 font-black uppercase tracking-widest text-[10px] mb-3">
        ⚔️ L'Épreuve du Monstre en Spaghettis Volant
      </p>
      <div className="text-amber-200/80 italic font-serif text-sm leading-relaxed space-y-2">
        <p>
          "Le Monstre en Spaghettis Volant a parlé dans la nuit du 17 mai.
          Sa volonté est claire : les aventuriers doivent prouver leur valeur
          avant d'être touchés par Sa Nouille Sacrée.
        </p>
        <p>
          Deux clans ont été désignés. Ils disposent d'une semaine pour affûter
          leurs armes, préparer leur stratégie, et intimider l'adversaire.
        </p>
        <p>
          Le 25 mai, les paris ouvriront. Le 1er juin, les dés seront jetés.
          Une seule équipe recevra les faveurs de la divinité — et les XP
          qui vont avec.
        </p>
        <p className="text-amber-300/90 font-bold not-italic">
          Que les aventuriers se préparent. RAmen. 🍝"
        </p>
      </div>
    </div>
  )
}
