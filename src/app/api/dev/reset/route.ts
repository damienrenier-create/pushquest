import { NextResponse } from "next/server";

export async function POST() {
    return NextResponse.json({ message: "Reset route disabled" }, { status: 403 });
}
