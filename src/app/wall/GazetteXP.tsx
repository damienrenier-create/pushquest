import prisma from "@/lib/prisma";
import React from "react";
import { calculateAllUsersXP } from "@/lib/xp";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import GazetteLikeButton from "./GazetteLikeButton";

function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
    if (diffMins > 0) return `il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    return "à l'instant";
}

const PHRASES = {
    FLYING: [
        "Il s'envole littéralement vers la victoire ! En engrangeant {XP} XP ({REASON}), le voilà couronné [{ANIMAL}]. 🦅",
        "En arrachant {XP} XP ({REASON}), il déploie enfin ses ailes et devient un magnifique [{ANIMAL}]. Direction les sommets ! 🌪️",
        "Un bond dans les airs ! Propulsé par {XP} XP ({REASON}), sa mutation en [{ANIMAL}] laisse la concurrence au sol. 🚀"
    ],
    AGILE: [
        "Son agilité a fait la différence : {XP} XP remportés ({REASON}) ! La concurrence est bluffée, le voilà [{ANIMAL}]. 🦊",
        "L'instinct du prédateur a parlé. En sécurisant {XP} XP ({REASON}), le redoutable grade de [{ANIMAL}] est tombé. 🐾",
        "Rapide, précis, mortel. Une rafale de {XP} XP ({REASON}) le fait passer au statut de [{ANIMAL}]. ⚡"
    ],
    HEAVY: [
        "La force pure à l'état brut. Contre toute attente, il sécurise {XP} XP ({REASON}) et s'impose comme un [{ANIMAL}]. 🦍",
        "Il écrase la compétition sous son poids. Une prise magistrale de {XP} XP ({REASON}) le propulse [{ANIMAL}] ! 🏔️",
        "Un vrai rouleau compresseur ! Les {XP} XP accumulés ({REASON}) lui offrent le rang de [{ANIMAL}]. 💥"
    ],
    SMALL: [
        "À force de persévérance et de sueur ! En validant {XP} XP ({REASON}), il décroche le tant attendu palier du [{ANIMAL}]. 🐜",
        "Les petits efforts font les grandes légendes : avec {XP} XP engrangés ({REASON}), il évolue en [{ANIMAL}]. 🐛",
        "Il a tissé sa toile patiemment... Et hop, {XP} XP de pris ({REASON}) ! Bienvenue dans le monde du [{ANIMAL}]. 🕸️"
    ],
    MARINE: [
        "Il nage en plein succès ! Avec {XP} XP repêchés ({REASON}), le voilà transformé en [{ANIMAL}]. 🌊",
        "Depuis les abysses, il jaillit pour s'emparer du niveau [{ANIMAL}], poussé par une vague de {XP} XP ({REASON}). 🦈",
        "Un vrai monstre marin en approche ! Les {XP} XP récoltés ({REASON}) valident son grade de [{ANIMAL}]. 🐙"
    ],
    MYTHICAL: [
        "Nous entrons dans les mythes fondateurs... En terrassant le jeu de {XP} XP ({REASON}), il transcende l'humanité pour devenir [{ANIMAL}]. 🔥",
        "Une créature de légende est née. {XP} XP majestueux ({REASON}) le sacrent [{ANIMAL}]. Inclinons-nous tous. 🐉",
        "Au-delà du réel ! Son explosion de {XP} XP ({REASON}) forge la légende du [{ANIMAL}]. 🌟"
    ],
    GENERIC: [
        "Un cap décisif a été franchi ! En validant {XP} XP ({REASON}), il bluffe tout le monde et atteint le stade de [{ANIMAL}]. 🏆",
        "Il fallait faire pencher la balance, c'est fait avec {XP} XP glanés ({REASON}) ! Bienvenue dans l'ère du [{ANIMAL}]. 📈"
    ]
};

const LEVEL_DOWN_PHRASES = [
    "Triste jour pour la patrie... La chute est dure : retour au rang des [{ANIMAL}] ({REASON}). Perte sèche : {XP} XP. 📉{CULPRIT}",
    "Coup dur pour le moral (et les pecs) ! Rétrogradé en [{ANIMAL}] ({REASON}). Moins {XP} XP... 🚔{CULPRIT}",
    "Alerte régression ! Le voilà rabaissé au rang de [{ANIMAL}] ({REASON}). Tu nous dois {XP} XP. 🤡{CULPRIT}",
    "Ouch. La gravité l'a rattrapé. Rétrogradation confirmée en [{ANIMAL}] ({REASON}). Adieu {XP} XP. 📉{CULPRIT}",
    "C'est la dégringolade ! {REASON} l'envoie direct chez les [{ANIMAL}]. - {XP} XP. 🏹{CULPRIT}",
    "Victime d'un vol manifeste ? En tout cas, c'est un retour à la case [{ANIMAL}] ({REASON}). 💸{CULPRIT}"
];

function getAnimalCategory(name: string) {
    const n = name.toLowerCase();
    if (["licorne", "basilic", "hydre", "dragon", "kraken", "léviathan", "phénix", "pégase", "griffon", "sphinx"].some(x => n.includes(x))) return "MYTHICAL";
    if (["papillon", "oiseau", "martin", "chouette", "faucon", "corbeau", "hibou", "aigle", "condor", "autruche", "pélican", "albatros"].some(x => n.includes(x))) return "FLYING";
    if (["poisson", "hippocampe", "murène", "manchot", "anaconda", "python", "cobra", "tortue", "alligator", "crocodile", "requin", "raie", "otarie", "phoque", "dauphin", "béluga", "narval", "orque", "cachalot", "baleine", "calmar", "pieuvre", "grenouille", "axolotl", "salamandre"].some(x => n.includes(x))) return "MARINE";
    if (["sanglier", "cerf", "renne", "wapiti", "kangourou", "lion", "gorille", "panda", "rhinocéros", "hippopotame", "girafe", "bison", "yak", "éléphant"].some(x => n.includes(x))) return "HEAVY";
    if (["moustique", "fourmi", "abeille", "mante", "scorpion", "mygale", "escargot", "capybara"].some(x => n.includes(x))) return "SMALL";
    return "AGILE"; // Default for cats, dogs, monkeys, foxes, panthers etc.
}

function getPhrase(eventId: string, isLevelUp: boolean, animal: string, reason: string, xpDiff: string, culprit?: string) {
    let list = LEVEL_DOWN_PHRASES;

    if (isLevelUp) {
        const cat = getAnimalCategory(animal) as keyof typeof PHRASES;
        list = [...PHRASES[cat], ...PHRASES.GENERIC];
    }

    let hash = 0;
    for (let i = 0; i < eventId.length; i++) {
        hash = (hash << 5) - hash + eventId.charCodeAt(i);
        hash |= 0;
    }

    const template = list[Math.abs(hash) % list.length];
    const culpritText = culprit ? `\n\n**Voleur identifié :** @${culprit} 🦝` : "";

    return template
        .replace("{ANIMAL}", animal)
        .replace("{REASON}", reason)
        .replace("{XP}", xpDiff)
        .replace("{CULPRIT}", culpritText);
}

export default async function GazetteXP() {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    const league = (session?.user as any)?.league || "POMPES";

    const allUsers = await (prisma.user as any).findMany({
        where: {
            nickname: { not: 'modo' },
            league: league
        },
        select: { id: true, nickname: true, sets: true, createdAt: true, xpAdjustments: true }
    });
    const badgeOwnerships = await (prisma as any).badgeOwnership.findMany();
    const xpScores = calculateAllUsersXP(allUsers, badgeOwnerships);

    const rawEvents = await (prisma as any).badgeEvent.findMany({
        where: {
            eventType: { in: ["LEVEL_UP", "LEVEL_DOWN"] },
            toUser: { league: league }
        },
        orderBy: { createdAt: "desc" },
        include: {
            likes: true
        }
    });

    const displayEvents = xpScores.map(userXP => {
        // Find the latest real event for this user
        const realEvent = rawEvents.find((e: any) => e.toUserId === userXP.id);

        if (realEvent) {
            return {
                ...realEvent,
                toUser: { nickname: userXP.nickname }, // Ensure nickname is present
                // We keep the real event as is
            };
        }

        // Fallback: Generate a simulated event based on current status
        const reasonsArr = [];
        if (userXP.details?.repsXP > 0) reasonsArr.push(`un entraînement acharné (+${Math.round(userXP.details.repsXP)} XP)`);
        if (userXP.details?.badgesXP > 0) reasonsArr.push(`des badges et trophées (+${Math.round(userXP.details.badgesXP)} XP)`);
        if (userXP.details?.flexXP > 0) reasonsArr.push(`un bonus de régularité Flex (+${Math.round(userXP.details.flexXP)} XP)`);
        if (userXP.details?.recordsXP > 0) reasonsArr.push(`un record majestueux (+${Math.round(userXP.details.recordsXP)} XP)`);
        if (userXP.details?.manualXP !== 0) reasonsArr.push(`un ajustement manuel (${userXP.details.manualXP > 0 ? '+' : ''}${Math.round(userXP.details.manualXP)} XP)`);

        const reason = reasonsArr.length > 0 ? `grâce à : ` + reasonsArr.join(", ") : "pour l'ensemble de son parcours";

        return {
            id: `fallback-${userXP.id}`,
            toUserId: userXP.id,
            toUser: { nickname: userXP.nickname },
            newValue: userXP.level,
            eventType: "LEVEL_UP",
            createdAt: userXP.createdAt || new Date().toISOString(),
            likes: [],
            metadata: JSON.stringify({
                animal: userXP.animal,
                emoji: userXP.emoji,
                xpDiff: Math.round(userXP.totalXP),
                reason: reason
            })
        };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-indigo-500/20 relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">📰</div>

            <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 border-b border-indigo-500/20 pb-4">
                    <span className="text-3xl">📯</span>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-wider">La Gazette de l'XP</h2>
                        <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest">Dernières ascensions</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {displayEvents.map((event: any, idx: number) => {
                        let metaDataObj: any = null;
                        try {
                            if (event.metadata) metaDataObj = JSON.parse(event.metadata);
                        } catch (e) { }

                        const nickname = event.toUser?.nickname || "Inconnu";
                        const level = event.newValue;
                        const animal = metaDataObj?.animal || "Inconnu";
                        const emoji = metaDataObj?.emoji || "⭐";
                        const xpDiff = metaDataObj?.xpDiff || metaDataObj?.xpGained || 0; // fallback backward compat
                        const reason = metaDataObj?.reason || "grâce à son assiduité";
                        const culprit = metaDataObj?.culprit;
                        const timeAgo = getTimeAgo(event.createdAt);
                        const isLevelUp = event.eventType === "LEVEL_UP" || !event.eventType;

                        const generatedPhrase = getPhrase(event.id, isLevelUp, animal, reason, xpDiff >= 0 ? `+${xpDiff.toLocaleString('fr-FR')}` : xpDiff.toLocaleString('fr-FR'), culprit);

                        return (
                            <div key={event.id} className={`${isLevelUp ? 'bg-white/5 border-white/10' : 'bg-red-900/10 border-red-500/20'} border rounded-2xl p-4 transition-colors`}>
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl mt-1 drop-shadow-md">
                                        {isLevelUp ? emoji : '🚨'}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start gap-2">
                                            <h3 className="font-bold text-white text-base leading-tight">
                                                <span className={`${isLevelUp ? 'text-indigo-400' : 'text-red-400'} font-black`}>{nickname}</span> {isLevelUp ? 'a atteint le niveau' : 'a été rétrogradé au niveau'} <span className={`${isLevelUp ? 'text-yellow-400' : 'text-red-400'} font-black text-lg`}>{level}</span> !
                                            </h3>
                                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap bg-slate-800 px-2 py-1 rounded-full">
                                                {timeAgo}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-300">
                                            {generatedPhrase}
                                        </p>

                                        <div className="pt-2 flex justify-end">
                                            <GazetteLikeButton
                                                eventId={event.id}
                                                initialLikeCount={event.likes?.length || 0}
                                                initialHasLiked={event.likes?.some((l: any) => l.userId === currentUserId) || false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
