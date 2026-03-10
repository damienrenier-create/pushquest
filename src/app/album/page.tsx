import Link from "next/link";
import { Camera, AlertCircle, ArrowRight } from "lucide-react";

export const metadata = {
    title: "Album - Pompes entre potes",
    description: "Preuves et exploits",
};

export default function AlbumPage() {
    return (
        <div className="min-h-[80vh] bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center space-y-6">

                <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera size={40} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        ALBUM DES RECORDS
                    </h1>
                    <p className="text-gray-600 text-sm font-medium">
                        Tu as battu un record ou accompli un exploit incroyable ?
                    </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-left flex gap-3">
                    <AlertCircle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-orange-800 font-bold">
                        Les joueurs sont <span className="underline decoration-orange-400">vivement invités</span> à publier une photo ou une vidéo comme preuve dans l'album lors de l'établissement de nouveaux records !
                    </p>
                </div>

                <div className="pt-4 space-y-3">
                    <a
                        href="https://photos.app.goo.gl/FrtN2kjDRY8vGQVP6"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm"
                    >
                        Continuer vers Google Photos
                        <ArrowRight size={18} />
                    </a>

                    <Link
                        href="/"
                        className="block w-full text-center text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors py-2"
                    >
                        Annuler et revenir à l'accueil
                    </Link>
                </div>
            </div>
        </div>
    );
}
