// src/app/api/admin/tester/check-env/route.ts
//
// Diagnostic : expose la valeur lue par le runtime serveur pour les variables
// d'env critiques au testeur. PUBLIC volontairement (juste les noms + métadonnées,
// pas les valeurs sensibles).

import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
    const raw = process.env.GUIGUI_LOGIN_ENABLED
    const trimmed = (raw ?? "").trim().toLowerCase()
    return NextResponse.json({
        ok: true,
        GUIGUI_LOGIN_ENABLED: {
            isSet: typeof raw === "string" && raw.length > 0,
            length: raw?.length ?? 0,
            isExactlyTrue: raw === "true",
            isTrueIgnoreCase: trimmed === "true",
            preview: raw === undefined ? "(undefined)" : `"${raw}"`,
        },
        NODE_ENV: process.env.NODE_ENV ?? "(unset)",
        VERCEL_ENV: process.env.VERCEL_ENV ?? "(unset)",
        VERCEL_GIT_COMMIT_SHA: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "(unset)",
    })
}
