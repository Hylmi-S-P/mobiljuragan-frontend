import { NextResponse } from "next/server";
import { getNavCounts } from "@/lib/navCounts";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getNavCounts();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
