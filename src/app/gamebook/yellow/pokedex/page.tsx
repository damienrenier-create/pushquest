// Nexus Jaune Éclair — /pokedex FUSIONNÉ dans /dex (Dex Nexus unique). Cette route redirige (liens directs / refresh).

import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function YellowPokedexPage() {
    redirect("/gamebook/yellow/dex")
}
