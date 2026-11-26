import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/api";
import { getNavCounts } from "@/lib/navCounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sesi admin tidak ditemukan." } },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const data = await getNavCounts();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
