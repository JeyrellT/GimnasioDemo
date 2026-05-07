// Demo stub — Route Handlers are not included in static export output.
export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ nextauth: ["signin"] }, { nextauth: ["signout"] }, { nextauth: ["session"] }];
}

import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ error: "not available in demo" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ error: "not available in demo" }, { status: 404 });
}
