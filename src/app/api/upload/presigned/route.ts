// Demo stub — Route Handlers are not included in static export output.
export const dynamic = "force-static";
import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json({ error: "not available in demo" }, { status: 404 });
}
