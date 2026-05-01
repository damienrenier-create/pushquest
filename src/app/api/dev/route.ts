import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({ message: "Dev route disabled for security" }, { status: 404 });
}
