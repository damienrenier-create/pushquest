import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    const isDev = process.env.NODE_ENV !== "production";
    const resetToken = process.env.DEV_RESET_TOKEN;
    const headerToken = req.headers.get("x-dev-reset-token");

    // Only allow if in Dev or if a valid token is provided
    if (!isDev && (!resetToken || resetToken !== headerToken)) {
        return NextResponse.json({ message: "Forbidden: Reset only allowed in Dev or with valid token" }, { status: 403 });
    }

    try {
        // Only reset fines/cagnotte for V3.2, preserving history and trophies
        await prisma.fineRecord.deleteMany();

        return NextResponse.json({
            message: "Cagnotte has been reset. Fines cleared.",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Reset Error:", error);
        return NextResponse.json({ message: "Internal Server Error", error: String(error) }, { status: 500 });
    }
}
