import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const res = await prisma.user.deleteMany({ where: { nickname: 'modo' } });
        return NextResponse.json({ success: true, count: res.count });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
