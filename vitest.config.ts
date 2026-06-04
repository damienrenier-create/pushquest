import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Tests unitaires du moteur de combat Nexus Jaune Éclair (modules purs, zéro React).
// On limite volontairement le scope à src/lib/gamebook/yellow pour ne pas balayer
// tout le projet (Next/Prisma) et garder un run rapide.
export default defineConfig({
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        environment: "node",
        include: ["src/lib/gamebook/yellow/**/*.test.ts"],
    },
})
