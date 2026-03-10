"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Trophy, Users, Star, User, MessageSquare } from "lucide-react"

export default function MobileNav() {
    const pathname = usePathname()

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-2 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] safe-area-pb">
            <div className="flex justify-around items-center">
                <Link
                    href="/?tab=saisie"
                    className={`flex flex-col items-center gap-1 group ${pathname === '/' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Home size={22} className={`group-hover:scale-110 transition-transform ${pathname === '/' ? 'stroke-[2.5px]' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Accueil</span>
                </Link>

                <Link
                    href="/pantheon"
                    className={`flex flex-col items-center gap-1 group relative ${pathname?.startsWith('/pantheon') ? 'text-indigo-600' : 'text-gray-400'}`}
                >
                    <div className={`p-2 rounded-2xl -mt-6 backdrop-blur-md shadow-sm border transition-all group-hover:-translate-y-1 ${pathname?.startsWith('/pantheon') ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white border-gray-100'}`}>
                        <Star size={24} fill={pathname?.startsWith('/pantheon') ? "currentColor" : "none"} />
                    </div>
                </Link>

                <Link
                    href="/leaderboard"
                    className={`flex flex-col items-center gap-1 group ${pathname?.startsWith('/leaderboard') ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <Users size={22} className={`group-hover:scale-110 transition-transform ${pathname?.startsWith('/leaderboard') ? 'stroke-[2.5px]' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Classement</span>
                </Link>

                <Link
                    href="/wall"
                    className={`flex flex-col items-center gap-1 group ${pathname === '/wall' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <MessageSquare size={22} className={`group-hover:scale-110 transition-transform ${pathname === '/wall' ? 'stroke-[2.5px]' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-center">Place<br />publique</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center gap-1 group ${pathname === '/profile' ? 'text-blue-600' : 'text-gray-400'}`}
                >
                    <User size={22} className={`group-hover:scale-110 transition-transform ${pathname === '/profile' ? 'stroke-[2.5px]' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Profil</span>
                </Link>
            </div>
        </nav>
    )
}
